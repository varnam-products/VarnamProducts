import express from 'express';
const router = express.Router();

import {
  submitInquiry,
  getInquiries,
  updateInquiryStatus,
} from '../controllers/internationalOrderController.js';
import { protect } from '../middleware/authMiddleware.js';
import { admin } from '../middleware/adminMiddleware.js';

// Public — shown at checkout when the customer isn't shipping within India
router.post('/submit', submitInquiry);

// Admin — view & manage inquiries
router.get('/', protect, admin, getInquiries);
router.patch('/:id/status', protect, admin, updateInquiryStatus);

export default router;
