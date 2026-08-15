import Product from '../models/Product.js';

// Looks up an active coupon by code against the Settings document. Case/whitespace
// insensitive on input since customers will type codes inconsistently. Returns null
// (not an error) when no code was sent at all, so callers can tell "no coupon" apart
// from "bad coupon" (see calculateOrderPricing below).
export const findActiveCoupon = (settings, code) => {
  if (!code) return null;
  const normalized = String(code).trim().toUpperCase();
  if (!normalized) return null;
  return (settings.coupons || []).find((c) => c.code === normalized && c.active) || null;
};

// Single source of truth for turning a client-submitted cart (product + variant +
// quantity only) into trusted pricing. Used by both createOrder (COD) and
// createCashfreeOrder so the two payment paths can never calculate a different
// total for the same cart + coupon.
//
// Order of operations matters and is intentional:
//   1. Subtotal is rebuilt entirely from DB product/variant prices - client-sent
//      prices are never trusted.
//   2. Shipping fee is decided off that RAW subtotal, before any coupon is applied,
//      so a coupon can never push an order across the free-shipping threshold.
//   3. The coupon discount is applied to the subtotal only, never to shipping.
export const calculateOrderPricing = async ({ orderItems, settings, couponCode, session }) => {
  let calculatedSubtotal = 0;
  const finalOrderItems = [];

  for (const item of orderItems) {
    if (item.quantity <= 0) throw new Error('Invalid quantity');
    if (!item.variantId) throw new Error('Product variant not found');

    const query = Product.findById(item.product);
    if (session) query.session(session);
    const dbProduct = await query;
    if (!dbProduct || !dbProduct.active) throw new Error('Product not found');
    if (dbProduct.stock < item.quantity) throw new Error('Insufficient stock');

    const variant = dbProduct.variants.id(item.variantId);
    if (!variant) throw new Error('Product variant not found');

    const actualPrice = variant.discountPrice > 0 ? variant.discountPrice : variant.price;
    calculatedSubtotal += actualPrice * item.quantity;
    finalOrderItems.push({
      product: dbProduct._id,
      variantId: variant._id,
      variantLabel: variant.label,
      name: dbProduct.name,
      price: actualPrice,
      quantity: item.quantity,
    });
  }

  // Shipping is locked in against the pre-discount subtotal - see comment above.
  const trustedShippingFee = calculatedSubtotal >= settings.freeShippingThreshold ? 0 : settings.flatShippingFee;

  let appliedCoupon = null;
  let discountAmount = 0;

  if (couponCode) {
    const matchedCoupon = findActiveCoupon(settings, couponCode);
    // A code was submitted but doesn't match anything currently active - fail loudly
    // instead of silently charging full price, so the customer knows their code
    // didn't apply rather than being surprised at the final total.
    if (!matchedCoupon) throw new Error('Invalid or expired coupon code');

    discountAmount = Number(((calculatedSubtotal * matchedCoupon.discountPercentage) / 100).toFixed(2));
    appliedCoupon = {
      name: matchedCoupon.name,
      code: matchedCoupon.code,
      discountPercentage: matchedCoupon.discountPercentage,
      discountAmount,
    };
  }

  const discountedSubtotal = Number((calculatedSubtotal - discountAmount).toFixed(2));
  const finalTotal = Number((discountedSubtotal + trustedShippingFee).toFixed(2));

  return {
    finalOrderItems,
    subtotal: calculatedSubtotal,
    shippingFee: trustedShippingFee,
    appliedCoupon,
    totalPrice: finalTotal,
  };
};
