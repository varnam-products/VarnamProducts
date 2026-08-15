import express from 'express';
import { getPublicSettings, getSettings, updateSettings, validateCoupon } from '../controllers/settingsController.js';
import { protect } from '../middleware/authMiddleware.js';
import { admin } from '../middleware/adminMiddleware.js';

const router = express.Router();

// Public — storefront reads freeShippingThreshold, flatShippingFee,
// codLimit, codEnabled to render checkout UI correctly.
// No sensitive fields are exposed here.
router.get('/', getPublicSettings);

// Public — checkout page checks a single coupon code. Guests can use this too, so no
// auth. Does not expose the list of all coupons, only whether the submitted code is valid.
router.post('/coupons/validate', validateCoupon);

// Admin only — full document including store info, timestamps
router.get('/admin', protect, admin, getSettings);

// Admin only — update any settings field
router.put('/', protect, admin, updateSettings);

export default router;
