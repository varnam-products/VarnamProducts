import Cashfree from '../config/cashfree.js';
import { sendOrderPlacedEmails, sendRefundConfirmedEmail, sendManualReviewAlertEmail } from '../services/mailService.js';
import Product from '../models/Product.js';
import Order from '../models/Order.js';
import crypto from 'crypto';
import mongoose from 'mongoose';
import { getSettingsDocument } from '../controllers/settingsController.js';
import { generateOrderNumber } from '../utils/generateOrderNumber.js';
import logger from '../utils/logger.js';
import { ORDER_STATUS } from '../constants/orderStatus.js';
import { PAYMENT_STATUS } from '../constants/paymentStatus.js';
import Cart from '../models/Cart.js';

const validateCashfreePayload = (body) => {
  const { customerName, customerEmail, customerPhone, shippingAddress, orderItems } = body;
  if (!customerName || !customerEmail || !customerPhone || !shippingAddress) return 'Missing required fields';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customerEmail)) return 'Invalid email format';
  if (String(customerPhone).trim().length < 10) return 'Invalid phone number';
  if (!shippingAddress.street || !shippingAddress.city || !shippingAddress.state || !shippingAddress.postalCode) {
    return 'Incomplete shipping address details';
  }
  if (!orderItems || orderItems.length === 0) return 'Cart is empty';
  return null;
};

export const createCashfreeOrder = async (req, res) => {
  try {
    const { orderItems, customerName, customerEmail, customerPhone, shippingAddress } = req.body;
    const validationError = validateCashfreePayload(req.body);
    if (validationError) return res.status(400).json({ success: false, message: validationError });

    const userIdRef = req.user ? req.user._id : null;
    if (userIdRef) {
      const incomingSorted = [...orderItems].sort((a, b) => String(a.product).localeCompare(String(b.product)));
      const incomingProductIds = incomingSorted.map(i => String(i.product));
      const incomingQuantities = incomingSorted.map(i => i.quantity);

      const existingActiveDraft = await Order.findOne({
        user: userIdRef,
        paymentMethod: 'CASHFREE',
        orderStatus: ORDER_STATUS.PENDING_PAYMENT,
        paymentStatus: PAYMENT_STATUS.PENDING,
        createdAt: { $gte: new Date(Date.now() - 30 * 60 * 1000) }
      }).sort({ createdAt: -1 });

      if (existingActiveDraft) {
        const draftSorted = [...existingActiveDraft.orderItems].sort((a, b) => String(a.product).localeCompare(String(b.product)));
        const draftProductIds = draftSorted.map(i => String(i.product));
        const draftQuantities = draftSorted.map(i => i.quantity);

        if (JSON.stringify(incomingProductIds) === JSON.stringify(draftProductIds) && JSON.stringify(incomingQuantities) === JSON.stringify(draftQuantities)) {
          const cfOrderResponse = await Cashfree.PGFetchOrder(existingActiveDraft.cashfreeOrderId);
          if (cfOrderResponse?.data && cfOrderResponse.data.order_status === 'ACTIVE') {
            return res.status(200).json({
              success: true,
              data: {
                order_id: cfOrderResponse.data.order_id,
                payment_session_id: cfOrderResponse.data.payment_session_id,
                order_amount: cfOrderResponse.data.order_amount
              },
              isReusedDraft: true
            });
          }
        }
      }
    }

    let calculatedSubtotal = 0;
    const verifiedOrderItems = [];
    for (const item of orderItems) {
      if (item.quantity <= 0) return res.status(400).json({ success: false, message: 'Invalid quantity' });
      const dbProduct = await Product.findById(item.product);
      if (!dbProduct || !dbProduct.active) return res.status(404).json({ success: false, message: 'Product not found' });
      if (dbProduct.stock < item.quantity) return res.status(400).json({ success: false, message: 'Insufficient stock' });

      const actualPrice = dbProduct.discountPrice > 0 ? dbProduct.discountPrice : dbProduct.price;
      calculatedSubtotal += actualPrice * item.quantity;
      verifiedOrderItems.push({ product: dbProduct._id, name: dbProduct.name, price: actualPrice, quantity: item.quantity });
    }

    const settings = await getSettingsDocument();
    const trustedShippingFee = calculatedSubtotal >= settings.freeShippingThreshold ? 0 : settings.flatShippingFee;
    const trustedTotalAmount = calculatedSubtotal + trustedShippingFee;
    const systemGeneratedOrderId = `order_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    const cashfreeRequest = {
      order_amount: Number(trustedTotalAmount.toFixed(2)),
      order_currency: "INR",
      order_id: systemGeneratedOrderId,
      customer_details: {
        customer_id: userIdRef ? String(userIdRef) : `guest_${Date.now()}`,
        customer_phone: customerPhone.trim(),
        customer_email: customerEmail.trim(),
        customer_name: customerName.trim()
      },
      order_meta: {
        payment_methods: "cc,dc,upi,nb",
        return_url: `${process.env.CLIENT_URL}/checkout?cf_order_id={order_id}`
      }
    };

    const response = await Cashfree.PGCreateOrder(cashfreeRequest);
    const cfOrder = response.data;

    const pendingOrder = new Order({
      orderNumber: generateOrderNumber(),
      user: userIdRef,
      customerName,
      customerEmail,
      customerPhone,
      shippingAddress,
      orderItems: verifiedOrderItems,
      subtotal: calculatedSubtotal,
      shippingFee: trustedShippingFee,
      totalPrice: trustedTotalAmount,
      paymentMethod: 'CASHFREE',
      paymentStatus: PAYMENT_STATUS.PENDING,
      orderStatus: ORDER_STATUS.PENDING_PAYMENT,
      cashfreeOrderId: cfOrder.order_id,
      cashfreePaymentSessionId: cfOrder.payment_session_id,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    });

    await pendingOrder.save();
    return res.status(200).json({
      success: true,
      data: {
        order_id: cfOrder.order_id,
        payment_session_id: cfOrder.payment_session_id,
        order_amount: cfOrder.order_amount
      }
    });
  } catch (error) {
    logger.error('Cashfree order generation error execution track:', error);
    return res.status(500).json({
      success: false,
      message: process.env.NODE_ENV === 'development' ? error.response?.data?.message || error.message : 'Internal server error'
    });
  }
};

const handlePaymentSuccess = async (dataPayload) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const order = await Order.findOne({ cashfreeOrderId: dataPayload.order.order_id }).session(session);
    if (!order) {
      await session.commitTransaction();
      session.endSession();
      return { status: 'order_not_found' };
    }
    if (order.paymentStatus === PAYMENT_STATUS.PAID || order.cashfreePaymentId) {
      await session.commitTransaction();
      session.endSession();
      return { status: 'already_processed' };
    }

    let stockConflict = false;
    const deductionResults = [];
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
      order.paymentStatus = PAYMENT_STATUS.PAID;
      order.orderStatus = ORDER_STATUS.PENDING_MANUAL_REVIEW;
      order.cashfreePaymentId = String(dataPayload.payment.cf_payment_id);
      order.isPaid = true;
      order.paidAt = new Date();
      order.expiresAt = null;

      await order.save({ session });
      await session.commitTransaction();
      session.endSession();

      setImmediate(() => sendOrderPlacedEmails(order).catch(() => {}));
      setImmediate(() => sendManualReviewAlertEmail(order).catch(() => {}));
      return { status: 'routed_to_manual_review' };
    }

    order.paymentStatus = PAYMENT_STATUS.PAID;
    order.orderStatus = ORDER_STATUS.ORDERED;
    order.isPaid = true;
    order.paidAt = new Date();
    order.cashfreePaymentId = String(dataPayload.payment.cf_payment_id);
    order.expiresAt = null;

    await order.save({ session });
    await session.commitTransaction();
    session.endSession();

    setImmediate(() => sendOrderPlacedEmails(order).catch(() => {}));
    if (order.user) await Cart.clearCart(order.user);
    return { status: 'ok' };
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    throw error;
  }
};

const handlePaymentFailed = async (dataPayload) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const order = await Order.findOne({ cashfreeOrderId: dataPayload.order.order_id }).session(session);
    if (!order) {
      await session.commitTransaction();
      session.endSession();
      return { status: 'order_not_found' };
    }
    if (order.paymentStatus === PAYMENT_STATUS.FAILED) {
      await session.commitTransaction();
      session.endSession();
      return { status: 'already_marked_failed' };
    }

    order.paymentStatus = PAYMENT_STATUS.FAILED;
    order.orderStatus = ORDER_STATUS.CANCELLED;
    order.failureReason = dataPayload.payment.payment_message || 'Payment failed';

    await order.save({ session });
    await session.commitTransaction();
    session.endSession();
    return { status: 'ok' };
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    throw error;
  }
};

const handleRefundProcessed = async (dataPayload) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const order = await Order.findOne({ cashfreeOrderId: dataPayload.order.order_id }).session(session);
    if (!order) {
      await session.commitTransaction();
      session.endSession();
      return { status: 'refund_order_not_found' };
    }
    if (order.refundedAt) {
      await session.commitTransaction();
      session.endSession();
      return { status: 'refund_already_confirmed' };
    }

    order.refundedAt = new Date();
    await order.save({ session });
    await session.commitTransaction();
    session.endSession();

    setImmediate(() => sendRefundConfirmedEmail(order).catch(() => {}));
    return { status: 'refund_confirmed' };
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    throw error;
  }
};

export const handleCashfreeWebhook = async (req, res) => {
  try {
    const signature = req.headers['x-webhook-signature'];
    const timestamp = req.headers['x-webhook-timestamp'];
    if (!signature || !timestamp) {
      return res.status(400).json({ success: false, message: 'Missing core webhook headers structure verification bounds' });
    }

    const rawBodyString = req.body.toString('utf8');
    const signaturePayload = timestamp + rawBodyString;
    const expectedSignature = crypto
      .createHmac('sha256', process.env.CASHFREE_WEBHOOK_SECRET)
      .update(signaturePayload)
      .digest('base64');

    const receivedSignatureBuffer = Buffer.from(signature, 'utf8');
    const expectedSignatureBuffer = Buffer.from(expectedSignature, 'utf8');
    const isValidSignature =
      receivedSignatureBuffer.length === expectedSignatureBuffer.length &&
      crypto.timingSafeEqual(receivedSignatureBuffer, expectedSignatureBuffer);

    if (!isValidSignature) {
      return res.status(400).json({ success: false, message: 'Webhook validation verification processing failed' });
    }

    const eventPayload = JSON.parse(rawBodyString);
    const { type, data } = eventPayload;
    logger.info('Cashfree structured operational webhook received:', { type, orderId: data?.order?.order_id });

    if (type === 'PAYMENT_SUCCESS_WEBHOOK') {
      const result = await handlePaymentSuccess(data);
      return res.status(200).json(result);
    }
    if (type === 'PAYMENT_FAILED_WEBHOOK' || type === 'PAYMENT_USER_DROPPED_WEBHOOK') {
      const result = await handlePaymentFailed(data);
      return res.status(200).json(result);
    }
    if (type === 'REFUND_STATUS_WEBHOOK' && data?.refund?.refund_status === 'SUCCESS') {
      const result = await handleRefundProcessed(data);
      return res.status(200).json(result);
    }

    return res.status(200).json({ status: 'ignored' });
  } catch (error) {
    logger.error('Fatal tracking cashfree webhook runtime crash:', error);
    return res.status(500).json({
      success: false,
      message: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};