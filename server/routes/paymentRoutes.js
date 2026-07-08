import express from 'express';
import { createCashfreeOrder, handleCashfreeWebhook } from '../controllers/paymentController.js';
import { protect } from '../middleware/authMiddleware.js';
import { optionalProtect } from '../middleware/optionalAuthMiddleware.js';

const router = express.Router();

router.post('/create-order', optionalProtect, createCashfreeOrder);
router.post('/webhook', express.raw({ type: 'application/json' }), handleCashfreeWebhook);

export default router;