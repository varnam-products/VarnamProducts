import mongoose from 'mongoose';
import { ORDER_STATUS } from '../constants/orderStatus.js';
import { PAYMENT_STATUS } from '../constants/paymentStatus.js';

const orderItemSchema = new mongoose.Schema({
  product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  name: { type: String, required: true },
  price: { type: Number, required: true },
  quantity: { type: Number, required: true, min: [1, 'Quantity must be at least 1'] },
});

const orderSchema = new mongoose.Schema(
  {
    orderNumber: { type: String, required: true, unique: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    customerName: { type: String, required: true },
    customerEmail: { type: String, required: true },
    customerPhone: { type: String, required: true },
    shippingAddress: {
      street: { type: String, required: true },
      city: { type: String, required: true },
      state: { type: String, required: true },
      postalCode: { type: String, required: true },
      country: { type: String, default: 'India' },
    },
    orderItems: [orderItemSchema],
    subtotal: { type: Number, required: true },
    shippingFee: { type: Number, required: true, default: 0 },
    totalPrice: { type: Number, required: true },
    paymentMethod: { type: String, required: true, enum: ['COD', 'CASHFREE'] },
    paymentStatus: {
      type: String,
      required: true,
      enum: Object.values(PAYMENT_STATUS),
      default: PAYMENT_STATUS.PENDING,
    },
    orderStatus: {
      type: String,
      required: true,
      enum: Object.values(ORDER_STATUS),
      default: ORDER_STATUS.PENDING_PAYMENT,
    },
    // Client-generated key (one per checkout attempt, stable across retries of that same
    // attempt) used to make order creation idempotent. Optional field so it's simply omitted
    // (not set to null) when a client doesn't send one - required for the sparse unique index
    // below to only constrain requests that actually opted in, instead of colliding every
    // order that omits it against every other.
    idempotencyKey: { type: String },
    cashfreeOrderId: { type: String, default: null },
    cashfreePaymentSessionId: { type: String, default: null },
    cashfreePaymentId: { type: String, default: null },
    failureReason: { type: String, default: null },
    isPaid: { type: Boolean, default: false },
    paidAt: { type: Date, default: null },
    // True only once stock has actually been decremented for this order's items.
    // Orders routed to PENDING_MANUAL_REVIEW are paid but NOT stock-deducted (see
    // paymentController.handlePaymentSuccess) until an admin approves them via
    // updateOrderStatus. Cancellation logic must key off this flag, not
    // paymentStatus === PAID, to decide whether to add stock back.
    stockDeducted: { type: Boolean, default: false },
    refundedAt: { type: Date, default: null },
    deliveredAt: { type: Date, default: null },
    expiresAt: { type: Date, default: null, index: { expireAfterSeconds: 0 } },
    cancellationRequest: {
      requestedAt: { type: Date, default: null },
      reason: { type: String, default: null },
      status: { type: String, enum: ['Pending', 'Approved', 'Rejected'], default: null },
      adminNote: { type: String, default: null },
      resolvedAt: { type: Date, default: null },
    },
  },
  { timestamps: true }
);

orderSchema.index({ user: 1, createdAt: -1 });
orderSchema.index({ orderStatus: 1 });
orderSchema.index({ createdAt: -1 });
orderSchema.index({ 'cancellationRequest.status': 1 });
// Sparse: only documents that actually have an idempotencyKey are indexed/constrained,
// so legacy orders (and any future writes that omit it) never collide with each other.
orderSchema.index({ idempotencyKey: 1 }, { unique: true, sparse: true });

const Order = mongoose.model('Order', orderSchema);
export default Order;