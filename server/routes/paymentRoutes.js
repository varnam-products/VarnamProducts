import express from 'express';
import { createCashfreeOrder, handleCashfreeWebhook, verifyCashfreeOrder, voidPendingCashfreeOrder } from '../controllers/paymentController.js';
import { protect } from '../middleware/authMiddleware.js';
import { optionalProtect } from '../middleware/optionalAuthMiddleware.js';

const router = express.Router();

router.post('/create-order', optionalProtect, createCashfreeOrder);
// Active reconciliation fallback — lets the frontend resolve payment status directly
// with Cashfree when the webhook hasn't landed yet, instead of waiting/timing out.
router.get('/verify/:cashfreeOrderId', optionalProtect, verifyCashfreeOrder);
// Called when the customer abandons a Cashfree attempt and switches payment method —
// voids the leftover "Pending Payment" draft instead of leaving it to expire in 24h.
router.post('/void-draft', optionalProtect, voidPendingCashfreeOrder);
router.post('/webhook', express.raw({ type: 'application/json' }), handleCashfreeWebhook);

export default router;