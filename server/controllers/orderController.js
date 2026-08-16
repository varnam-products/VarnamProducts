import mongoose from 'mongoose';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import Order from '../models/Order.js';
import Product from '../models/Product.js';
import GuestOtp from '../models/GuestOtp.js';
import Cashfree from '../config/cashfree.js';
import { generateOrderNumber } from '../utils/generateOrderNumber.js';
import { sendOrderPlacedEmails, sendOrderShippedEmail, sendOrderDeliveredEmail, sendOrderCancelledEmail, sendCancelRequestAdminEmail, sendCancelRequestResolvedEmail } from '../services/mailService.js';
import { getSettingsDocument } from '../controllers/settingsController.js';
import { ORDER_STATUS } from '../constants/orderStatus.js';
import { PAYMENT_STATUS } from '../constants/paymentStatus.js';
import { ROLES } from '../constants/roles.js';
import logger from '../utils/logger.js';
import Cart from '../models/Cart.js';
import { calculateOrderPricing } from '../utils/pricing.js';

// Purpose string embedded in the short-lived guest-cancellation proof token, so a
// token minted for this purpose could never be confused with any other JWT this
// app issues (e.g. the login cookie) even though both are signed with JWT_SECRET.
const GUEST_CANCEL_PROOF_PURPOSE = 'guest-cancel-request';
const GUEST_CANCEL_PROOF_TTL = '10m';

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
  if (orderItems.some((item) => !item.product || !item.variantId)) return 'Each order item must specify a product and variant';
  return null;
};

export const createOrder = async (req, res) => {
  const { paymentMethod, orderItems, cashfreeOrderId, idempotencyKey, couponCode } = req.body;

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

  // Idempotency guard: a double-click or a network retry fired before React's `submitting`
  // state re-rendered can send this same request twice. If the client sent a key we've
  // already turned into an order, hand back that order instead of creating a second one
  // (and deducting stock twice). Guests get this too, unlike the Cashfree-only,
  // logged-in-only draft-reuse check elsewhere - this check needs no req.user at all.
  if (idempotencyKey) {
    const existingByKey = await Order.findOne({ idempotencyKey }).lean();
    if (existingByKey) {
      return res.status(200).json({ success: true, data: existingByKey, idempotentReplay: true });
    }
  }

  const settings = await getSettingsDocument();
  if (!settings.codEnabled) return res.status(400).json({ success: false, message: 'Cash on Delivery is not available at this time' });

  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const {
      finalOrderItems,
      subtotal: calculatedSubtotal,
      shippingFee: trustedShippingFee,
      appliedCoupon,
      totalPrice: finalTotal,
    } = await calculateOrderPricing({ orderItems, settings, couponCode, session });

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
      appliedCoupon,
      totalPrice: finalTotal,
      paymentMethod: 'COD',
      paymentStatus: PAYMENT_STATUS.PENDING,
      orderStatus: ORDER_STATUS.ORDERED,
      // COD stock is deducted synchronously right below, inside this same transaction.
      // If that deduction fails the whole transaction aborts, so it's safe to set this now.
      stockDeducted: true,
      idempotencyKey: idempotencyKey || undefined,
    });

    let savedOrder;
    try {
      savedOrder = await order.save({ session });
    } catch (dupErr) {
      // Lost a race to a concurrent identical request that slipped past the findOne check
      // above before either had saved (e.g. two near-simultaneous double-click requests).
      // The unique index caught it - abort our half-finished transaction and hand back
      // whichever request actually won, instead of erroring or double-deducting stock.
      if (dupErr?.code === 11000 && dupErr?.keyPattern?.idempotencyKey) {
        if (session.inTransaction()) await session.abortTransaction();
        session.endSession();
        const winner = await Order.findOne({ idempotencyKey }).lean();
        return res.status(200).json({ success: true, data: winner, idempotentReplay: true });
      }
      throw dupErr;
    }
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
    const clientSafe = ['Invalid quantity', 'Product not found', 'Product variant not found', 'Insufficient stock', 'Invalid or expired coupon code'].includes(error.message) || error.message.includes('COD limit exceeded');
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

    // Only restock if stock was actually taken out for this order. A PENDING_MANUAL_REVIEW
    // order is PAID but never had stock deducted (see paymentController.handlePaymentSuccess),
    // so keying off paymentStatus === PAID here used to manufacture phantom stock.
    if (order.stockDeducted) {
      for (const item of order.orderItems) {
        await Product.findByIdAndUpdate(item.product, { $inc: { stock: item.quantity, totalSales: -item.quantity } }, { session });
      }
      order.stockDeducted = false;
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

    // If the customer has a cancellation request sitting Pending on this order,
    // this direct cancel just resolved it too — without this, cancellationRequest.status
    // stays stuck at "Pending" forever even though the order badge now says "Cancelled".
    // The customer's OrderDetail page would keep polling and never learn the outcome.
    const hadPendingRequest = order.cancellationRequest?.status === 'Pending';
    if (hadPendingRequest) {
      order.cancellationRequest.status = 'Approved';
      order.cancellationRequest.adminNote = order.cancellationRequest.adminNote || 'Order cancelled directly by admin.';
      order.cancellationRequest.resolvedAt = new Date();
    }

    await order.save({ session });
    await session.commitTransaction();
    session.endSession();

    setImmediate(() => sendOrderCancelledEmail(order, isRefund).catch(() => { }));
    if (hadPendingRequest) {
      setImmediate(() => sendCancelRequestResolvedEmail(order, 'Approved', isRefund).catch(() => { }));
    }
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
  const { orderStatus } = req.body;
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const order = await Order.findById(req.params.id).session(session);
    if (!order) {
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({ success: false, message: 'Order not found' });
    }
    if (!isValidStatusTransition(order.orderStatus, orderStatus)) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({ success: false, message: `Cannot transition status from [${order.orderStatus}] to [${orderStatus}]` });
    }

    // A PENDING_MANUAL_REVIEW order was charged but never had stock deducted (the deduction
    // was reverted when the original stock conflict happened - see paymentController
    // handlePaymentSuccess). Approving it into ORDERED is the moment it actually commits to
    // shipping, so deduct stock now, atomically, re-checking availability. This closes the
    // silent-oversell gap where approved manual-review orders shipped without ever touching stock.
    if (order.orderStatus === ORDER_STATUS.PENDING_MANUAL_REVIEW && orderStatus === ORDER_STATUS.ORDERED && !order.stockDeducted) {
      const deductionResults = [];
      let stockConflict = false;
      for (const item of order.orderItems) {
        const updateResult = await Product.updateOne(
          { _id: item.product, stock: { $gte: item.quantity }, active: true },
          { $inc: { stock: -item.quantity, totalSales: item.quantity } },
          { session }
        );
        if (updateResult.modifiedCount === 0) {
          stockConflict = true;
          break;
        }
        deductionResults.push(item);
      }
      if (stockConflict) {
        for (const item of deductionResults) {
          await Product.updateOne({ _id: item.product }, { $inc: { stock: item.quantity, totalSales: -item.quantity } }, { session });
        }
        await session.abortTransaction();
        session.endSession();
        return res.status(400).json({ success: false, message: 'Insufficient stock to approve this order. Restock the product(s), or cancel/refund the order instead.' });
      }
      order.stockDeducted = true;
    }

    order.orderStatus = orderStatus;
    if (orderStatus === ORDER_STATUS.DELIVERED) {
      order.isPaid = true;
      order.paymentStatus = PAYMENT_STATUS.PAID;
      order.deliveredAt = new Date();
    }
    await order.save({ session });
    await session.commitTransaction();
    session.endSession();

    if (orderStatus === ORDER_STATUS.SHIPPED) sendOrderShippedEmail(order).catch(() => { });
    if (orderStatus === ORDER_STATUS.DELIVERED) sendOrderDeliveredEmail(order).catch(() => { });
    return res.status(200).json({ success: true, message: 'Status updated', data: order });
  } catch (error) {
    if (session.inTransaction()) await session.abortTransaction();
    session.endSession();
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

    // Only restock if stock was actually taken out for this order (see cancelOrder for why
    // paymentStatus === PAID alone is not a safe signal - manual-review orders are paid
    // without ever having stock deducted).
    if (order.stockDeducted) {
      for (const item of order.orderItems) {
        await Product.findByIdAndUpdate(item.product, { $inc: { stock: item.quantity, totalSales: -item.quantity } }, { session });
      }
      order.stockDeducted = false;
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

// ─────────────────────────────────────────────────────────────────────────
// GUEST SELF-SERVICE CANCELLATION
//
// trackOrderPublicly deliberately stays thin (orderNumber/orderStatus/
// paymentMethod/createdAt only) — an order number isn't secret the way a
// login is, so nothing more sensitive than that should ever come back from
// it. Everything cancellation-related below is only unlocked after an email
// OTP proves the requester actually owns the order.
//
// The OTP alone isn't enough to gate "submit cancellation" though — a bare
// orderNumber/email pair in that request body would let anyone skip straight
// past verification. So verifyGuestCancelOtp hands back a short-lived signed
// proof (10 min, tied to this exact orderNumber + email) that submission
// then requires and re-validates.
// ─────────────────────────────────────────────────────────────────────────

const normaliseEmail = (email) => String(email || '').trim().toLowerCase();
const normaliseOrderNumber = (orderNumber) => String(orderNumber || '').trim().toUpperCase();

export const sendGuestCancelOtp = async (req, res) => {
  try {
    const { orderNumber, email } = req.body;
    if (!orderNumber || !email) return res.status(400).json({ success: false, message: 'Order number and email are required' });

    const normalisedEmail = normaliseEmail(email);
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(normalisedEmail)) return res.status(400).json({ success: false, message: 'Invalid email address' });

    const normalisedOrderNumber = normaliseOrderNumber(orderNumber);
    const order = await Order.findOne({ orderNumber: normalisedOrderNumber })
      .select('orderNumber orderStatus customerEmail user cancellationRequest')
      .lean();

    // Deliberately one generic message for "no such order", "wrong email", and
    // "not currently cancellable" — an attacker guessing order numbers shouldn't
    // be able to tell those apart from the response.
    const genericFail = () => res.status(400).json({ success: false, message: 'This order is not eligible for self-service cancellation right now.' });

    if (!order) return genericFail();
    if (order.user) return genericFail(); // linked to an account — should log in instead
    if (order.customerEmail?.trim().toLowerCase() !== normalisedEmail) return genericFail();
    if (![ORDER_STATUS.ORDERED, ORDER_STATUS.PACKED].includes(order.orderStatus)) return genericFail();
    if (order.cancellationRequest?.status === 'Pending') return res.status(400).json({ success: false, message: 'A cancellation request is already pending for this order.' });
    if (order.cancellationRequest?.status === 'Approved') return res.status(400).json({ success: false, message: 'This order has already been approved for cancellation.' });

    const otp    = String(crypto.randomInt(100000, 999999));
    const salt   = await bcrypt.genSalt(10);
    const hashed = await bcrypt.hash(otp, salt);

    // Upsert so a re-sent OTP replaces the previous one instead of stacking up.
    await GuestOtp.findOneAndUpdate(
      { email: normalisedEmail, purpose: 'guest-cancel', orderNumber: normalisedOrderNumber },
      { otpHash: hashed, expiresAt: new Date(Date.now() + 10 * 60 * 1000) },
      { upsert: true, setDefaultsOnInsert: true }
    );

    const { otpTemplate } = await import('../templates/otpTemplate.js');
    const template = otpTemplate({
      name: 'there',
      otp,
      subject: `${otp} — Verify your email to cancel order ${normalisedOrderNumber}`,
    });
    const { default: transporter } = await import('../config/mail.js');
    await transporter.sendMail({
      from: `"Varnam Organic" <${process.env.MAIL_FROM}>`,
      to:   normalisedEmail,
      subject: template.subject,
      html:    template.html,
    });

    return res.status(200).json({ success: true, message: 'OTP sent to your email.' });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

export const verifyGuestCancelOtp = async (req, res) => {
  try {
    const { orderNumber, email, otp } = req.body;
    if (!orderNumber || !email || !otp) return res.status(400).json({ success: false, message: 'Order number, email and OTP are required' });

    const normalisedEmail = normaliseEmail(email);
    const normalisedOrderNumber = normaliseOrderNumber(orderNumber);

    const pending = await GuestOtp.findOne({ email: normalisedEmail, purpose: 'guest-cancel', orderNumber: normalisedOrderNumber });
    if (!pending) return res.status(400).json({ success: false, message: 'No OTP requested for this order/email. Please request a new one.' });
    if (pending.expiresAt < new Date()) {
      await GuestOtp.deleteOne({ _id: pending._id });
      return res.status(400).json({ success: false, message: 'OTP has expired. Please request a new one.' });
    }

    const isMatch = await bcrypt.compare(String(otp).trim(), pending.otpHash);
    if (!isMatch) return res.status(400).json({ success: false, message: 'Incorrect OTP. Please try again.' });

    // Verified — remove so it can't be reused
    await GuestOtp.deleteOne({ _id: pending._id });

    // Hand back the scoped proof rather than a bare { success: true }. Submission
    // requires and re-checks this token, so the OTP step can't be bypassed by
    // just posting an orderNumber/email straight to the submit endpoint.
    const proofToken = jwt.sign(
      { orderNumber: normalisedOrderNumber, email: normalisedEmail, purpose: GUEST_CANCEL_PROOF_PURPOSE },
      process.env.JWT_SECRET,
      { expiresIn: GUEST_CANCEL_PROOF_TTL }
    );

    return res.status(200).json({ success: true, message: 'Email verified.', data: { proofToken } });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

export const submitGuestCancelRequest = async (req, res) => {
  try {
    const { orderNumber, email, reason, proofToken } = req.body;
    if (!proofToken) return res.status(401).json({ success: false, message: 'Email verification is required before submitting a cancellation request.' });
    if (!orderNumber || !email) return res.status(400).json({ success: false, message: 'Order number and email are required' });
    if (!reason || reason.trim().length === 0) return res.status(400).json({ success: false, message: 'Cancellation reason is required' });
    if (reason.trim().length > 500) return res.status(400).json({ success: false, message: 'Reason must be under 500 characters' });

    const normalisedEmail = normaliseEmail(email);
    const normalisedOrderNumber = normaliseOrderNumber(orderNumber);

    let decoded;
    try {
      decoded = jwt.verify(proofToken, process.env.JWT_SECRET);
    } catch {
      return res.status(401).json({ success: false, message: 'Email verification has expired. Please verify your email again.' });
    }
    if (
      decoded.purpose !== GUEST_CANCEL_PROOF_PURPOSE ||
      decoded.orderNumber !== normalisedOrderNumber ||
      decoded.email !== normalisedEmail
    ) {
      return res.status(401).json({ success: false, message: 'Email verification does not match this order. Please verify again.' });
    }

    const order = await Order.findOne({ orderNumber: normalisedOrderNumber });
    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });
    if (order.user) return res.status(400).json({ success: false, message: 'This order is linked to an account. Please log in to request cancellation.' });
    if (order.customerEmail?.trim().toLowerCase() !== normalisedEmail) return res.status(403).json({ success: false, message: 'Access denied' });

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

export const getGuestCancelRequestStatus = async (req, res) => {
  try {
    const { orderNumber, email } = req.query;
    if (!orderNumber || !email) return res.status(400).json({ success: false, message: 'Order number and email are required' });

    const normalisedEmail = normaliseEmail(email);
    const order = await Order.findOne({ orderNumber: normaliseOrderNumber(orderNumber) })
      .select('orderNumber orderStatus customerEmail cancellationRequest')
      .lean();

    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });
    if (order.customerEmail?.trim().toLowerCase() !== normalisedEmail) return res.status(403).json({ success: false, message: 'Access denied' });
    if (!order.cancellationRequest?.status) return res.status(404).json({ success: false, message: 'No request found' });

    return res.status(200).json({ success: true, data: { orderNumber: order.orderNumber, orderStatus: order.orderStatus, cancellationRequest: order.cancellationRequest } });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};