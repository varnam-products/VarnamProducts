// src/utils/variants.js
//
// A product is always sold through one or more variants (see server
// models/Product.js). Only `price` / `discountPrice` differ per variant —
// stock stays a single shared pool on the product itself. These helpers
// centralize the "which price do we show / charge" logic so every page
// (ProductCard, ProductDetail, Cart, Checkout, Admin) computes it the same
// way the server does.

/**
 * The price actually charged for a single variant —
 * discountPrice when set (> 0), otherwise the base price.
 */
export function variantEffectivePrice(variant) {
  if (!variant) return 0
  return variant.discountPrice > 0 ? variant.discountPrice : variant.price
}

/**
 * Looks up a variant on a product by its _id. Works whether variantId is
 * a string or an ObjectId-like object (via String() coercion).
 */
export function getVariantById(product, variantId) {
  if (!product?.variants?.length || !variantId) return null
  return product.variants.find((v) => String(v._id) === String(variantId)) || null
}

/**
 * The default variant to preselect / quick-add — the cheapest one by
 * effective price. Falls back to the first variant if none found.
 */
export function getCheapestVariant(product) {
  if (!product?.variants?.length) return null
  return product.variants.reduce((cheapest, v) =>
    variantEffectivePrice(v) < variantEffectivePrice(cheapest) ? v : cheapest,
    product.variants[0]
  )
}

/**
 * Effective price range across all of a product's variants.
 * hasRange is true when variants differ in price (drives "From ₹X" display).
 */
export function getPriceRange(product) {
  if (!product?.variants?.length) return { min: 0, max: 0, hasRange: false }
  const prices = product.variants.map(variantEffectivePrice)
  const min = Math.min(...prices)
  const max = Math.max(...prices)
  return { min, max, hasRange: min !== max }
}

/**
 * Discount percentage for a single variant (0 if no discount).
 */
export function variantDiscountPct(variant) {
  if (!variant || !(variant.discountPrice > 0) || !(variant.price > 0)) return 0
  return Math.round(((variant.price - variant.discountPrice) / variant.price) * 100)
}