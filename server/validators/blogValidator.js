import { body, validationResult } from 'express-validator';

// The global sanitizeMiddleware HTML-escapes body strings before this
// validator chain runs (' -> &#x27;, & -> &amp;, etc.), which inflates
// length. For maxlength checks we compare against req._rawBody — the
// snapshot taken before escaping — so users aren't rejected for a length
// their actual input never had.
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
 * Rules for POST /api/blog (Admin — create blog post)
 */
export const createBlogPostValidator = [
  body('title')
    .trim()
    .notEmpty().withMessage('Title is required')
    .isLength({ min: 3 }).withMessage('Title must be at least 3 characters')
    .custom(maxRawLength('title', 140)).withMessage('Title must be between 3 and 140 characters'),

  body('excerpt')
    .trim()
    .notEmpty().withMessage('Excerpt is required')
    .custom(maxRawLength('excerpt', 200)).withMessage('Excerpt cannot exceed 200 characters'),

  body('content')
    .trim()
    .notEmpty().withMessage('Content is required'),

  body('coverImage')
    .trim()
    .notEmpty().withMessage('Cover image URL is required')
    .isURL().withMessage('Cover image must be a valid URL'),

  body('author')
    .optional()
    .trim()
    .isLength({ min: 2 }).withMessage('Author name must be at least 2 characters'),

  body('coverImagePublicId')
    .optional({ nullable: true })
    .trim(),

  body('tags')
    .optional()
    .isArray().withMessage('Tags must be an array of strings'),

  body('metaTitle')
    .optional()
    .trim()
    .custom(maxRawLength('metaTitle', 70)).withMessage('Meta title cannot exceed 70 characters'),

  body('metaDescription')
    .optional()
    .trim()
    .custom(maxRawLength('metaDescription', 160)).withMessage('Meta description cannot exceed 160 characters'),

  body('published')
    .optional()
    .isBoolean().withMessage('Published must be a boolean value'),

  validate,
];

/**
 * Rules for PUT /api/blog/:id (Admin — update blog post)
 * All fields optional — only validate what's present
 */
export const updateBlogPostValidator = [
  body('title')
    .optional()
    .trim()
    .isLength({ min: 3 }).withMessage('Title must be between 3 and 140 characters')
    .custom(maxRawLength('title', 140)).withMessage('Title must be between 3 and 140 characters'),

  body('excerpt')
    .optional()
    .trim()
    .custom(maxRawLength('excerpt', 200)).withMessage('Excerpt cannot exceed 200 characters'),

  body('content')
    .optional()
    .trim()
    .notEmpty().withMessage('Content cannot be empty'),

  body('coverImage')
    .optional()
    .trim()
    .isURL().withMessage('Cover image must be a valid URL'),

  body('author')
    .optional()
    .trim()
    .isLength({ min: 2 }).withMessage('Author name must be at least 2 characters'),

  body('coverImagePublicId')
    .optional({ nullable: true })
    .trim(),

  body('tags')
    .optional()
    .isArray().withMessage('Tags must be an array of strings'),

  body('metaTitle')
    .optional()
    .trim()
    .custom(maxRawLength('metaTitle', 70)).withMessage('Meta title cannot exceed 70 characters'),

  body('metaDescription')
    .optional()
    .trim()
    .custom(maxRawLength('metaDescription', 160)).withMessage('Meta description cannot exceed 160 characters'),

  body('published')
    .optional()
    .isBoolean().withMessage('Published must be a boolean value'),

  validate,
];