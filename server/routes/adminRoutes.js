import express from 'express';
import { loginAdmin, logout, getMe } from '../controllers/authController.js';
import { protect } from '../middleware/authMiddleware.js';
import { admin } from '../middleware/adminMiddleware.js';
import { loginValidator } from '../validators/authValidator.js';

import {
  getDashboard,
  getSalesAnalytics,
  getLowStockProducts,
  getCustomers,
  getCustomerById,
  toggleBlockCustomer,
  getCancelRequests,
} from '../controllers/adminController.js';

import { generateOrderReport } from '../controllers/reportController.js';

const router = express.Router();

router.post('/login', loginValidator, loginAdmin);
router.post('/logout', protect, admin, logout);
router.get('/me', protect, admin, getMe);

router.get('/dashboard', protect, admin, getDashboard);
router.get('/sales', protect, admin, getSalesAnalytics);
router.get('/low-stock', protect, admin, getLowStockProducts);

router.get('/reports/orders', protect, admin, generateOrderReport);

router.get('/customers', protect, admin, getCustomers);
router.patch('/customers/block/:id', protect, admin, toggleBlockCustomer);
router.get('/customers/:id', protect, admin, getCustomerById);

router.get('/cancel-requests', protect, admin, getCancelRequests);

export default router;