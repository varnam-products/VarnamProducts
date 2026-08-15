import { body, validationResult } from 'express-validator';

// The global sanitizeMiddleware HTML-escapes body strings before this
// validator chain runs (' -> &#x27;, & -> &amp;, etc.), which inflates
// length. For maxlength checks we compare against req._rawBody — the
// snapshot taken before escaping — so users aren't rejected for a length
// their actual input never had, and so what actually gets saved (see
// productController.js, which now saves from req._rawBody too) matches
// what was validated. Same pattern as blogValidator.js.
const maxRawLength = (field, max) => (value, { req }) => {
  const raw = req._rawBody?.[field];
  const str = typeof raw === 'string' ? raw.trim() : String(value ?? '').trim();
  return str.length <= max;
};

export const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: errors.array()[0].msg,
    });
  }
  next();
};

// Shared variant-array validation logic used by both create and update.
// Runs as a single `.custom()` check because express-validator's dotted-path
// syntax (variants.*.price) doesn't cleanly express "compare two sibling
// fields within the same array item" — easier and clearer to just walk the
// array by hand here.
//
// Takes `req` so the label length check can be run against req._rawBody
// (pre-HTML-escape) instead of the escaped `variants` array passed in as
// `value` — otherwise a label using &, ', ", <, or > gets inflated before
// this check runs, same bug as shortDescription below.
const validateVariantsArray = (variants, req) => {
  if (!Array.isArray(variants) || variants.length === 0) {
    throw new Error('At least one variant is required');
  }
  const rawVariants = Array.isArray(req?._rawBody?.variants) ? req._rawBody.variants : null;
  variants.forEach((variant, index) => {
    const position = index + 1;
    if (!variant || typeof variant.label !== 'string' || !variant.label.trim()) {
      throw new Error(`Variant ${position}: label is required`);
    }
    const rawLabel = typeof rawVariants?.[index]?.label === 'string' ? rawVariants[index].label : variant.label;
    if (rawLabel.trim().length > 60) {
      throw new Error(`Variant ${position}: label cannot exceed 60 characters`);
    }
    if (variant.price === undefined || variant.price === null || isNaN(Number(variant.price)) || Number(variant.price) < 0) {
      throw new Error(`Variant ${position}: a valid price is required`);
    }
    if (variant.discountPrice !== undefined && variant.discountPrice !== null && variant.discountPrice !== '') {
      const discountPrice = Number(variant.discountPrice);
      if (isNaN(discountPrice) || discountPrice < 0) {
        throw new Error(`Variant ${position}: discount price must be a positive number`);
      }
      if (discountPrice > 0 && discountPrice >= Number(variant.price)) {
        throw new Error(`Variant ${position}: discount price must be lower than that variant's price`);
      }
    }
  });
  return true;
};

/**
 * Rules for POST /api/products (Admin — create product)
 */
export const createProductValidator = [
  body('name')
    .trim()
    .notEmpty().withMessage('Product name is required')
    .isLength({ min: 2 }).withMessage('Product name must be at least 2 characters'),

  body('description')
    .trim()
    .notEmpty().withMessage('Product description is required')
    .isLength({ min: 10 }).withMessage('Description must be at least 10 characters'),

  body('shortDescription')
    .trim()
    .notEmpty().withMessage('Short description is required')
    .custom(maxRawLength('shortDescription', 160)).withMessage('Short description cannot exceed 160 characters'),

  body('variants')
    .custom((variants, { req }) => validateVariantsArray(variants, req)),

  body('category')
    .notEmpty().withMessage('Category is required')
    .isMongoId().withMessage('Invalid category ID'),

  body('stock')
    .notEmpty().withMessage('Stock quantity is required')
    .isInt({ min: 0 }).withMessage('Stock must be a non-negative integer'),

  body('images')
    .isArray({ min: 1 }).withMessage('At least one product image is required'),

  validate,
];

/**
 * Rules for PUT /api/products/:id (Admin — update product)
 * All fields optional — only validate what's present
 */
export const updateProductValidator = [
  body('name')
    .optional()
    .trim()
    .isLength({ min: 2 }).withMessage('Product name must be at least 2 characters'),

  body('description')
    .optional()
    .trim()
    .isLength({ min: 10 }).withMessage('Description must be at least 10 characters'),

  // Not present on the original update validator — meaning shortDescription
  // edits previously skipped this check entirely and fell through to the
  // Mongoose maxlength validator, which also runs against the escaped body.
  // Added here for the same reason it's added below: to catch it pre-escape.
  body('shortDescription')
    .optional()
    .trim()
    .notEmpty().withMessage('Short description cannot be empty')
    .custom(maxRawLength('shortDescription', 160)).withMessage('Short description cannot exceed 160 characters'),

  body('variants')
    .optional()
    .custom((variants, { req }) => validateVariantsArray(variants, req)),

  body('stock')
    .optional()
    .isInt({ min: 0 }).withMessage('Stock must be a non-negative integer'),

  body('category')
    .optional()
    .isMongoId().withMessage('Invalid category ID'),

  validate,
];