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
    const { orderItems, customerName, customerEmail, customerPhone, shippingAddress, idempotencyKey } = req.body;
    const validationError = validateCashfreePayload(req.body);
    if (validationError) return res.status(400).json({ success: false, message: validationError });

    const userIdRef = req.user ? req.user._id : null;

    const incomingSorted = [...orderItems].sort((a, b) => String(a.product).localeCompare(String(b.product)));
    const incomingProductIds = incomingSorted.map(i => String(i.product));
    const incomingQuantities = incomingSorted.map(i => i.quantity);

    // Reuse an existing pending draft instead of minting a fresh Cashfree order + DB row every
    // time this endpoint is hit for the same checkout attempt (double-click, retry, or the
    // customer navigating back within the reuse window). This used to only run for req.user,
    // so guests had zero protection - keying off idempotencyKey (sent by every client, logged
    // in or not) covers guests too. We still fall back to the old user+items+30min match for
    // any older client that hasn't started sending the key yet.
    const draftMatchQuery = idempotencyKey
      ? { idempotencyKey, paymentMethod: 'CASHFREE', orderStatus: ORDER_STATUS.PENDING_PAYMENT, paymentStatus: PAYMENT_STATUS.PENDING }
      : (userIdRef
        ? {
          user: userIdRef,
          paymentMethod: 'CASHFREE',
          orderStatus: ORDER_STATUS.PENDING_PAYMENT,
          paymentStatus: PAYMENT_STATUS.PENDING,
          createdAt: { $gte: new Date(Date.now() - 30 * 60 * 1000) }
        }
        : null);

    if (draftMatchQuery) {
      const existingActiveDraft = await Order.findOne(draftMatchQuery).sort({ createdAt: -1 });

      if (existingActiveDraft) {
        const draftSorted = [...existingActiveDraft.orderItems].sort((a, b) => String(a.product).localeCompare(String(b.product)));
        const draftProductIds = draftSorted.map(i => String(i.product));
        const draftQuantities = draftSorted.map(i => i.quantity);
        const itemsMatch = JSON.stringify(incomingProductIds) === JSON.stringify(draftProductIds) &&
          JSON.stringify(incomingQuantities) === JSON.stringify(draftQuantities);

        // A matching idempotencyKey IS the guarantee this is the same submit attempt, so trust
        // it on its own. The legacy user+time match (no key sent) still requires items to match,
        // since time+user alone isn't a strong enough signal that it's the same attempt.
        if (idempotencyKey || itemsMatch) {
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
      idempotencyKey: idempotencyKey || undefined,
    });

    try {
      await pendingOrder.save();
    } catch (dupErr) {
      // Lost a race to a concurrent identical request that slipped past the draft-reuse
      // check above before either had saved (e.g. a very fast double-click). The unique
      // index caught it - hand back whichever request actually won instead of erroring or
      // leaving the customer with a second, orphaned Cashfree order to pay against.
      if (dupErr?.code === 11000 && dupErr?.keyPattern?.idempotencyKey) {
        const winner = await Order.findOne({ idempotencyKey }).lean();
        if (winner) {
          return res.status(200).json({
            success: true,
            data: {
              order_id: winner.cashfreeOrderId,
              payment_session_id: winner.cashfreePaymentSessionId,
              order_amount: winner.totalPrice
            },
            isReusedDraft: true
          });
        }
      }
      throw dupErr;
    }

    return res.status(200).json({
      success: true,
      data: {
        order_id: cfOrder.order_id,
        payment_session_id: cfOrder.payment_session_id,
        order_amount: cfOrder.order_amount
      }
    });
  } catch (error) {
    // NODE_ENV is 'production' on every Vercel deployment (not just real prod), so
    // the dev-only branch below never actually reveals detail to the client here —
    // that's intentional for security, but it means the *only* place to see what
    // actually went wrong is this log line. If Cashfree rejected the request (wrong
    // environment/credentials, invalid payload field, etc.), error.response.data
    // is where their actual reason lives.
    logger.error('Cashfree order generation error execution track:', {
      message: error.message,
      cashfreeResponse: error.response?.data,
      status: error.response?.status,
      stack: error.stack,
    });
    return res.status(500).json({
      success: false,
      message: process.env.NODE_ENV === 'development' ? error.response?.data?.message || error.message : 'Internal server error'
    });
  }
};

// --- Active reconciliation fallback -----------------------------------------
// The frontend polls our own DB (via orderController.createOrder) waiting for the
// Cashfree webhook to flip paymentStatus to Paid/Failed. Webhook delivery is not
// instant and can occasionally take longer than the frontend's poll window, which
// used to surface a "payment confirmation timed out" message to a customer whose
// payment actually succeeded (or failed) already at Cashfree's end.
//
// This endpoint breaks that dependency on webhook timing: instead of waiting
// longer, it asks Cashfree directly what happened to the order's payment
// attempts via PGOrderFetchPayments, and applies the same state transition the
// webhook would have applied. It's safe to call repeatedly — handlePaymentSuccess
// and handlePaymentFailed are both idempotent (they check current paymentStatus
// before doing anything), so if the webhook lands a moment before or after this
// call, nothing is double-applied and nothing is double-charged or double-shipped.
export const verifyCashfreeOrder = async (req, res) => {
  try {
    const { cashfreeOrderId } = req.params;
    if (!cashfreeOrderId) {
      return res.status(400).json({ success: false, message: 'cashfreeOrderId is required' });
    }

    const order = await Order.findOne({ cashfreeOrderId }).lean();
    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });

    // Webhook may have already landed between the last poll and this call.
    if (order.paymentStatus === PAYMENT_STATUS.PAID) {
      return res.status(200).json({ success: true, data: order });
    }
    if (order.paymentStatus === PAYMENT_STATUS.FAILED) {
      return res.status(400).json({ success: false, orderStatus: ORDER_STATUS.CANCELLED, message: 'Payment failed' });
    }

    // Still Pending in our DB — ask Cashfree directly rather than waiting on the webhook.
    let payments = [];
    try {
      const paymentsResponse = await Cashfree.PGOrderFetchPayments(cashfreeOrderId);
      payments = Array.isArray(paymentsResponse?.data) ? paymentsResponse.data : [];
    } catch (fetchErr) {
      logger.error('PGOrderFetchPayments call failed during reconciliation:', fetchErr);
      // Cashfree's API itself is unreachable/erroring — we genuinely don't know yet.
      return res.status(202).json({ success: false, orderStatus: ORDER_STATUS.PENDING_PAYMENT, message: 'Payment still processing' });
    }

    const successfulPayment = payments.find((p) => p.payment_status === 'SUCCESS');
    if (successfulPayment) {
      const result = await handlePaymentSuccess({
        order: { order_id: cashfreeOrderId },
        payment: { cf_payment_id: successfulPayment.cf_payment_id },
      });
      if (result.status === 'order_not_found') {
        return res.status(404).json({ success: false, message: 'Order not found' });
      }
      const freshOrder = await Order.findOne({ cashfreeOrderId }).lean();
      return res.status(200).json({ success: true, data: freshOrder });
    }

    const hasOnlyTerminalFailures = payments.length > 0 &&
      payments.every((p) => ['FAILED', 'USER_DROPPED', 'CANCELLED', 'NOT_ATTEMPTED'].includes(p.payment_status));

    if (hasOnlyTerminalFailures) {
      await handlePaymentFailed({
        order: { order_id: cashfreeOrderId },
        payment: { payment_message: payments[payments.length - 1]?.payment_message || 'Payment failed' },
      });
      return res.status(400).json({ success: false, orderStatus: ORDER_STATUS.CANCELLED, message: 'Payment failed' });
    }

    // Cashfree itself has no terminal status yet (rare, but possible) — genuinely still pending.
    return res.status(202).json({ success: false, orderStatus: ORDER_STATUS.PENDING_PAYMENT, message: 'Payment still processing' });
  } catch (error) {
    logger.error('Cashfree order reconciliation error:', error);
    return res.status(500).json({
      success: false,
      message: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error',
    });
  }
};

export const handlePaymentSuccess = async (dataPayload) => {
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
      order.stockDeducted = false;

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
    order.stockDeducted = true;

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

export const handlePaymentFailed = async (dataPayload) => {
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
      logger.warn('Cashfree webhook rejected: missing signature/timestamp headers', {
        headers: Object.keys(req.headers),
      });
      return res.status(400).json({ success: false, message: 'Missing core webhook headers structure verification bounds' });
    }

    // req.body MUST be the raw, untouched Buffer here (see express.raw() on this
    // route in server.js/paymentRoutes.js). If body parsing upstream ever ends up
    // converting it to a parsed object instead, this guard catches it early with a
    // clear log line instead of silently failing signature verification.
    if (!Buffer.isBuffer(req.body)) {
      logger.error('Cashfree webhook body was not a raw Buffer — check middleware order/content-type', {
        bodyType: typeof req.body,
        contentType: req.headers['content-type'],
      });
      return res.status(400).json({ success: false, message: 'Webhook body was not received in raw form' });
    }

    const rawBodyString = req.body.toString('utf8');
    if (!rawBodyString) {
      logger.error('Cashfree webhook body was empty after raw parse');
      return res.status(400).json({ success: false, message: 'Empty webhook body' });
    }

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
      logger.warn('Cashfree webhook signature mismatch', {
        receivedLength: receivedSignatureBuffer.length,
        expectedLength: expectedSignatureBuffer.length,
      });
      return res.status(400).json({ success: false, message: 'Webhook validation verification processing failed' });
    }

    let eventPayload;
    try {
      eventPayload = JSON.parse(rawBodyString);
    } catch (parseError) {
      logger.error('Cashfree webhook signature was valid but JSON parsing failed', { error: parseError.message });
      return res.status(400).json({ success: false, message: 'Malformed webhook payload' });
    }

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