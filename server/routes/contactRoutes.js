import express from 'express';
const router = express.Router();

import {
  submitMessage,
  getMessages,
  updateMessageStatus,
  deleteMessage,
} from '../controllers/contactController.js';
import { protect } from '../middleware/authMiddleware.js';
import { admin } from '../middleware/adminMiddleware.js';

// Public — Contact Us page form
router.post('/submit', submitMessage);

// Admin — view & manage messages
router.get('/', protect, admin, getMessages);
router.patch('/:id/status', protect, admin, updateMessageStatus);
router.delete('/:id', protect, admin, deleteMessage);

export default router;
