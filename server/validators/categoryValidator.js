import { body, validationResult } from 'express-validator';

// The global sanitizeMiddleware HTML-escapes body strings before this
// validator chain runs (' -> &#x27;, & -> &amp;, etc.), which inflates
// length. For maxlength checks we compare against req._rawBody — the
// snapshot taken before escaping — so users aren't rejected for a length
// their actual input never had. Same pattern as blogValidator.js.
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

/**
 * Rules for POST /api/categories (Admin — create category)
 */
export const createCategoryValidator = [
  body('name')
    .trim()
    .notEmpty().withMessage('Category name is required')
    .isLength({ min: 2 }).withMessage('Category name must be at least 2 characters'),

  body('image')
    .trim()
    .notEmpty().withMessage('Category image URL is required')
    .isURL().withMessage('Image must be a valid URL'),

  body('description')
    .optional({ nullable: true })
    .trim()
    .custom(maxRawLength('description', 1000)).withMessage('Description cannot exceed 1000 characters'),

  validate,
];

/**
 * Rules for PUT /api/categories/:id (Admin — update category)
 * All fields optional — only validate what's present
 */
export const updateCategoryValidator = [
  body('name')
    .optional()
    .trim()
    .isLength({ min: 2 }).withMessage('Category name must be at least 2 characters'),

  body('image')
    .optional()
    .trim()
    .isURL().withMessage('Image must be a valid URL'),

  body('description')
    .optional({ nullable: true })
    .trim()
    .custom(maxRawLength('description', 1000)).withMessage('Description cannot exceed 1000 characters'),

  body('active')
    .optional()
    .isBoolean().withMessage('Active must be a boolean value'),

  validate,
];