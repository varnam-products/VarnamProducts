import express from 'express';
const router = express.Router();

import {
  submitInquiry,
  getInquiries,
  updateInquiryStatus,
} from '../controllers/b2bController.js';
import { protect } from '../middleware/authMiddleware.js';
import { admin } from '../middleware/adminMiddleware.js';

// Public — B2B wholesale form on the storefront
router.post('/inquiry', submitInquiry);

// Admin — view & manage inquiries
router.get('/inquiries', protect, admin, getInquiries);
router.patch('/inquiries/:id/status', protect, admin, updateInquiryStatus);

export default router;
