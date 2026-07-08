import mongoose from 'mongoose';
import crypto from 'crypto';
import Order from '../models/Order.js';
import Product from '../models/Product.js';
import Cashfree from '../config/cashfree.js';
import { generateOrderNumber } from '../utils/generateOrderNumber.js';
import { sendOrderPlacedEmails, sendOrderShippedEmail, sendOrderDeliveredEmail, sendOrderCancelledEmail, sendCancelRequestAdminEmail, sendCancelRequestResolvedEmail } from '../services/mailService.js';
import { getSettingsDocument } from '../controllers/settingsController.js';
import { ORDER_STATUS } from '../constants/orderStatus.js';
import { PAYMENT_STATUS } from '../constants/paymentStatus.js';
import { ROLES } from '../constants/roles.js';
import logger from '../utils/logger.js';
import Cart from '../models/Cart.js';

const isValidStatusTransition = (currentStatus, nextStatus) => {
  const validTransitions = {
    [ORDER_STATUS.PENDING_PAYMENT]: [ORDER_STATUS.ORDERED, ORDER_STATUS.CANCELLED],
    [ORDER_STATUS.PENDING_MANUAL_REVIEW]: [ORDER_STATUS.ORDERED, ORDER_STATUS.CANCELLED],
    [ORDER_STATUS.ORDERED]: [ORDER_STATUS.PACKED, ORDER_STATUS.CANCELLED],
    [ORDER_STATUS.PACKED]: [ORDER_STATUS.SHIPPED, ORDER_STATUS.CANCELLED],
    [ORDER_STATUS.SHIPPED]: [ORDER_STATUS.OUT_FOR_DELIVERY],
    [ORDER_STATUS.OUT_FOR_DELIVERY]: [ORDER_STATUS.DELIVERED],
    [ORDER_STATUS.DELIVERED]: [],
    [ORDER_STATUS.CANCELLED]: [],
  };
  return validTransitions[currentStatus]?.includes(nextStatus) || false;
};

const validateOrderPayload = (body) => {
  const { customerName, customerEmail, customerPhone, shippingAddress, paymentMethod, orderItems } = body;
  if (!customerName || !customerEmail || !customerPhone || !shippingAddress || !paymentMethod) return 'Missing required fields';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customerEmail)) return 'Invalid email format';
  if (customerPhone.trim().length < 10) return 'Invalid phone number';
  if (!shippingAddress.street || !shippingAddress.city || !shippingAddress.state || !shippingAddress.postalCode) return 'Incomplete shipping address details';
  if (!['COD', 'CASHFREE'].includes(paymentMethod)) return 'Unsupported payment method';
  if (!orderItems || orderItems.length === 0) return 'Cart is empty';
  return null;
};

export const createOrder = async (req, res) => {
  const { paymentMethod, orderItems, cashfreeOrderId } = req.body;

  if (paymentMethod === 'CASHFREE') {
    try {
      const liveOrder = await Order.findOne({ cashfreeOrderId }).lean();
      if (!liveOrder) return res.status(404).json({ success: false, message: 'Order not found' });
      if (liveOrder.paymentStatus === PAYMENT_STATUS.PENDING) {
        return res.status(202).json({ success: false, orderStatus: ORDER_STATUS.PENDING_PAYMENT, message: 'Payment processing' });
      }
      if (liveOrder.paymentStatus === PAYMENT_STATUS.FAILED) {
        return res.status(400).json({ success: false, orderStatus: ORDER_STATUS.CANCELLED, message: 'Payment failed' });
      }
      return res.status(200).json({ success: true, data: liveOrder });
    } catch (err) {
      return res.status(500).json({ success: false, message: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error' });
    }
  }

  const errorCheck = validateOrderPayload(req.body);
  if (errorCheck) return res.status(400).json({ success: false, message: errorCheck });

  const settings = await getSettingsDocument();
  if (!settings.codEnabled) return res.status(400).json({ success: false, message: 'Cash on Delivery is not available at this time' });

  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    let calculatedSubtotal = 0;
    const finalOrderItems = [];
    for (const item of orderItems) {
      if (item.quantity <= 0) throw new Error('Invalid quantity');
      const dbProduct = await Product.findById(item.product).session(session);
      if (!dbProduct || !dbProduct.active) throw new Error('Product not found');
      if (dbProduct.stock < item.quantity) throw new Error('Insufficient stock');

      const actualPrice = dbProduct.discountPrice > 0 ? dbProduct.discountPrice : dbProduct.price;
      calculatedSubtotal += actualPrice * item.quantity;
      finalOrderItems.push({ product: dbProduct._id, name: dbProduct.name, price: actualPrice, quantity: item.quantity });
    }

    const trustedShippingFee = calculatedSubtotal >= settings.freeShippingThreshold ? 0 : settings.flatShippingFee;
    const finalTotal = calculatedSubtotal + trustedShippingFee;
    if (finalTotal > settings.codLimit) throw new Error(`COD limit exceeded. Max order total via COD is ₹${settings.codLimit}`);

    const order = new Order({
      orderNumber: generateOrderNumber(),
      user: req.user ? req.user._id : null,
      customerName: req.body.customerName,
      customerEmail: req.body.customerEmail,
      customerPhone: req.body.customerPhone,
      shippingAddress: req.body.shippingAddress,
      orderItems: finalOrderItems,
      subtotal: calculatedSubtotal,
      shippingFee: trustedShippingFee,
      totalPrice: finalTotal,
      paymentMethod: 'COD',
      paymentStatus: PAYMENT_STATUS.PENDING,
      orderStatus: ORDER_STATUS.ORDERED,
    });

    const savedOrder = await order.save({ session });
    for (const item of finalOrderItems) {
      const updateResult = await Product.updateOne(
        { _id: item.product, stock: { $gte: item.quantity } },
        { $inc: { stock: -item.quantity, totalSales: item.quantity } },
        { session }
      );
      if (updateResult.modifiedCount === 0) throw new Error('Insufficient stock');
    }

    await session.commitTransaction();
    session.endSession();

    setImmediate(() => sendOrderPlacedEmails(savedOrder).catch(() => { }));
    if (req.user) await Cart.clearCart(req.user._id);
    return res.status(201).json({ success: true, data: savedOrder });
  } catch (error) {
    if (session.inTransaction()) await session.abortTransaction();
    session.endSession();
    const clientSafe = ['Invalid quantity', 'Product not found', 'Insufficient stock'].includes(error.message) || error.message.includes('COD limit exceeded');
    return res.status(clientSafe ? 400 : 500).json({ success: false, message: clientSafe ? error.message : 'Something went wrong' });
  }
};

export const cancelOrder = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const order = await Order.findById(req.params.id).session(session);
    if (!order) throw new Error('Order not found');
    if (req.user && req.user.role !== ROLES.ADMIN && (!order.user || order.user.toString() !== req.user._id.toString())) {
      throw new Error('Access denied');
    }
    if (!isValidStatusTransition(order.orderStatus, ORDER_STATUS.CANCELLED)) {
      throw new Error(`Cannot cancel order from current status [${order.orderStatus}]`);
    }

    if (order.paymentMethod === 'COD' || order.paymentStatus === PAYMENT_STATUS.PAID) {
      for (const item of order.orderItems) {
        await Product.findByIdAndUpdate(item.product, { $inc: { stock: item.quantity, totalSales: -item.quantity } }, { session });
      }
    }

    const skipRefund = req.body.skipRefund === true;
    if (order.paymentMethod === 'CASHFREE' && order.paymentStatus === PAYMENT_STATUS.PAID && order.cashfreeOrderId) {
      if (skipRefund) {
        logger.info('[cancelOrder] skipRefund=true — Cashfree API bypass applied');
      } else {
        try {
          const generatedRefundId = `ref_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`;
          await Cashfree.PGOrderCreateRefund(order.cashfreeOrderId, {
            refund_amount: Number(order.totalPrice.toFixed(2)),
            refund_id: generatedRefundId,
            refund_note: "Order cancelled dynamically by administrator panel actions"
          });
        } catch (refundError) {
          throw new Error(`Cashfree refund pipeline rejected query: ${refundError.response?.data?.message || refundError.message}`);
        }
      }
    }

    order.orderStatus = ORDER_STATUS.CANCELLED;
    const isRefund = order.paymentStatus === PAYMENT_STATUS.PAID;
    order.paymentStatus = isRefund ? PAYMENT_STATUS.REFUNDED : PAYMENT_STATUS.CANCELLED;

    await order.save({ session });
    await session.commitTransaction();
    session.endSession();

    setImmediate(() => sendOrderCancelledEmail(order, isRefund).catch(() => { }));
    return res.status(200).json({ success: true, message: 'Order cancelled system trace updated', data: order });
  } catch (error) {
    if (session.inTransaction()) await session.abortTransaction();
    session.endSession();
    if (error.message === 'Access denied') return res.status(403).json({ success: false, message: 'Access denied' });
    const clientSafe = ['Order not found'].includes(error.message) || error.message.includes('Cannot cancel order') || error.message.includes('Cashfree refund');
    return res.status(clientSafe ? 400 : 500).json({ success: false, message: clientSafe ? error.message : 'Something went wrong' });
  }
};

export const getMyOrders = async (req, res) => {
  try {
    const page = Math.max(Number(req.query.page) || 1, 1);
    const limit = Math.min(Number(req.query.limit) || 10, 50);
    const skip = (page - 1) * limit;
    const [orders, total] = await Promise.all([
      Order.find({ user: req.user._id }).sort({ createdAt: -1 }).skip(skip).limit(limit).populate('orderItems.product', 'images name slug').lean(),
      Order.countDocuments({ user: req.user._id }),
    ]);
    return res.status(200).json({ success: true, pagination: { total, page, pages: Math.ceil(total / limit) }, data: orders });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

export const getOrderById = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id).populate('orderItems.product', 'images slug').lean();
    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });
    if (order.user && order.user.toString() !== req.user?._id.toString() && req.user?.role !== ROLES.ADMIN) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }
    return res.status(200).json({ success: true, data: order });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

export const trackOrderPublicly = async (req, res) => {
  try {
    const order = await Order.findOne({ orderNumber: req.params.orderNumber }).select('orderNumber orderStatus paymentMethod createdAt').lean();
    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });
    return res.status(200).json({ success: true, data: order });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

export const getAllOrders = async (req, res) => {
  try {
    const page = Math.max(Number(req.query.page) || 1, 1);
    const limit = Math.min(Number(req.query.limit) || 20, 100);
    const skip = (page - 1) * limit;
    const [orders, total] = await Promise.all([
      Order.find({}).sort({ createdAt: -1 }).skip(skip).limit(limit).populate('user', 'name email').lean(),
      Order.countDocuments({}),
    ]);
    return res.status(200).json({ success: true, pagination: { total, page, pages: Math.ceil(total / limit) }, data: orders });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

export const updateOrderStatus = async (req, res) => {
  try {
    const { orderStatus } = req.body;
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });
    if (!isValidStatusTransition(order.orderStatus, orderStatus)) {
      return res.status(400).json({ success: false, message: `Cannot transition status from [${order.orderStatus}] to [${orderStatus}]` });
    }
    order.orderStatus = orderStatus;
    if (orderStatus === ORDER_STATUS.DELIVERED) {
      order.isPaid = true;
      order.paymentStatus = PAYMENT_STATUS.PAID;
      order.deliveredAt = new Date();
    }
    await order.save();
    if (orderStatus === ORDER_STATUS.SHIPPED) sendOrderShippedEmail(order).catch(() => { });
    if (orderStatus === ORDER_STATUS.DELIVERED) sendOrderDeliveredEmail(order).catch(() => { });
    return res.status(200).json({ success: true, message: 'Status updated', data: order });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

export const getOrdersByUser = async (req, res) => {
  try {
    const page = Math.max(Number(req.query.page) || 1, 1);
    const limit = Math.min(Number(req.query.limit) || 20, 100);
    const skip = (page - 1) * limit;
    const [orders, total] = await Promise.all([
      Order.find({ user: req.params.userId }).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      Order.countDocuments({ user: req.params.userId }),
    ]);
    return res.status(200).json({ success: true, pagination: { total, page, pages: Math.ceil(total / limit) }, data: orders });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

export const getOrdersByStatus = async (req, res) => {
  try {
    const page = Math.max(Number(req.query.page) || 1, 1);
    const limit = Math.min(Number(req.query.limit) || 20, 100);
    const skip = (page - 1) * limit;
    const [orders, total] = await Promise.all([
      Order.find({ orderStatus: req.params.status }).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      Order.countDocuments({ orderStatus: req.params.status }),
    ]);
    return res.status(200).json({ success: true, pagination: { total, page, pages: Math.ceil(total / limit) }, data: orders });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

export const submitCancelRequest = async (req, res) => {
  try {
    const { reason } = req.body;
    if (!reason || reason.trim().length === 0) return res.status(400).json({ success: false, message: 'Cancellation reason is required' });
    if (reason.trim().length > 500) return res.status(400).json({ success: false, message: 'Reason must be under 500 characters' });

    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });
    if (!order.user || order.user.toString() !== req.user._id.toString()) return res.status(403).json({ success: false, message: 'Access denied' });

    if (![ORDER_STATUS.ORDERED, ORDER_STATUS.PACKED].includes(order.orderStatus)) {
      return res.status(400).json({ success: false, message: `Cancellation requests can only be submitted for orders that are 'Ordered' or 'Packed'.` });
    }
    if (order.cancellationRequest?.status === 'Pending') return res.status(400).json({ success: false, message: 'A cancellation request is already pending' });
    if (order.cancellationRequest?.status === 'Approved') return res.status(400).json({ success: false, message: 'This order has already been approved for cancellation' });

    order.cancellationRequest = { requestedAt: new Date(), reason: reason.trim(), status: 'Pending', adminNote: null, resolvedAt: null };
    await order.save();
    setImmediate(() => sendCancelRequestAdminEmail(order).catch(() => { }));
    return res.status(200).json({ success: true, message: 'Cancellation request submitted.', data: { orderNumber: order.orderNumber, cancellationRequest: order.cancellationRequest } });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

export const getCancelRequestStatus = async (req, res) => {
  try {
    const order = await Order.findOne({ _id: req.params.id }).select('orderNumber orderStatus cancellationRequest user').lean();
    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });
    if (!order.user || order.user.toString() !== req.user._id.toString()) return res.status(403).json({ success: false, message: 'Access denied' });
    if (!order.cancellationRequest?.status) return res.status(404).json({ success: false, message: 'No request found' });
    return res.status(200).json({ success: true, data: { orderNumber: order.orderNumber, orderStatus: order.orderStatus, cancellationRequest: order.cancellationRequest } });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

export const resolveCancelRequest = async (req, res) => {
  const { resolution, adminNote, skipRefund } = req.body;
  if (!['Approved', 'Rejected'].includes(resolution)) return res.status(400).json({ success: false, message: "resolution must be 'Approved' or 'Rejected'" });

  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const order = await Order.findById(req.params.id).session(session);
    if (!order) throw new Error('Order not found');
    if (!order.cancellationRequest || order.cancellationRequest.status !== 'Pending') {
      return res.status(400).json({ success: false, message: 'No pending cancel request found' });
    }

    if (resolution === 'Rejected') {
      order.cancellationRequest.status = 'Rejected';
      order.cancellationRequest.adminNote = adminNote?.trim() || null;
      order.cancellationRequest.resolvedAt = new Date();
      await order.save({ session });
      await session.commitTransaction();
      session.endSession();
      setImmediate(() => sendCancelRequestResolvedEmail(order, 'Rejected').catch(() => { }));
      return res.status(200).json({ success: true, message: 'Request rejected.', data: order });
    }

    if (!isValidStatusTransition(order.orderStatus, ORDER_STATUS.CANCELLED)) throw new Error(`Cannot cancel order from current status [${order.orderStatus}]`);

    if (order.paymentMethod === 'COD' || order.paymentStatus === PAYMENT_STATUS.PAID) {
      for (const item of order.orderItems) {
        await Product.findByIdAndUpdate(item.product, { $inc: { stock: item.quantity, totalSales: -item.quantity } }, { session });
      }
    }

    const isRefund = order.paymentStatus === PAYMENT_STATUS.PAID;
    if (order.paymentMethod === 'CASHFREE' && isRefund && order.cashfreeOrderId) {
      if (skipRefund === true) {
        logger.info('[resolveCancelRequest] skipRefund=true — Cashfree API bypass applied');
      } else {
        try {
          const generatedRefundId = `ref_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`;
          await Cashfree.PGOrderCreateRefund(order.cashfreeOrderId, {
            refund_amount: Number(order.totalPrice.toFixed(2)),
            refund_id: generatedRefundId,
            refund_note: "Cancellation request approved manually by engineering administrator parameters"
          });
        } catch (refundError) {
          throw new Error(`Cashfree refund pipeline rejected query: ${refundError.response?.data?.message || refundError.message}`);
        }
      }
    }

    order.orderStatus = ORDER_STATUS.CANCELLED;
    order.paymentStatus = isRefund ? PAYMENT_STATUS.REFUNDED : PAYMENT_STATUS.CANCELLED;
    order.cancellationRequest.status = 'Approved';
    order.cancellationRequest.adminNote = adminNote?.trim() || null;
    order.cancellationRequest.resolvedAt = new Date();

    await order.save({ session });
    await session.commitTransaction();
    session.endSession();

    setImmediate(() => sendCancelRequestResolvedEmail(order, 'Approved', isRefund).catch(() => { }));
    return res.status(200).json({ success: true, message: 'Request approved and resolved.', data: order });
  } catch (error) {
    if (session.inTransaction()) await session.abortTransaction();
    session.endSession();
    const clientSafe = ['Order not found'].includes(error.message) || error.message.includes('Cannot cancel order') || error.message.includes('Cashfree refund');
    return res.status(clientSafe ? 400 : 500).json({ success: false, message: clientSafe ? error.message : 'Something went wrong' });
  }
};