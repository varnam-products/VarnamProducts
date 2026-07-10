import 'dotenv/config';

import { validateEnv } from './utils/validateEnv.js';
validateEnv();

import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import morgan from 'morgan';
import mongoose from 'mongoose';

import logger from './utils/logger.js';
import { sanitizeMiddleware } from './middleware/sanitizeMiddleware.js';

import authRoutes from './routes/authRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import categoryRoutes from './routes/categoryRoutes.js';
import productRoutes from './routes/productRoutes.js';
import uploadRoutes from './routes/uploadRoutes.js';
import orderRoutes from './routes/orderRoutes.js';
import paymentRoutes from './routes/paymentRoutes.js';
import bannerRoutes from './routes/bannerRoutes.js';
import settingsRoutes from './routes/settingsRoutes.js';
import cartRoutes from './routes/cartRoutes.js';
import b2bRoutes from './routes/b2bRoutes.js';
import { startAbandonedCartCron } from './jobs/abandonedCartCron.js';

const app = express();

app.set('trust proxy', 1);

app.use(helmet());

const allowedOrigins = [process.env.CLIENT_URL, 'http://localhost:3000', 'https://varnam-products-umber.vercel.app'].filter(Boolean);
app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin) return callback(null, true);
      if (allowedOrigins.indexOf(origin) !== -1) {
        callback(null, true);
      } else {
        callback(new Error('Blocked by CORS policy'));
      }
    },
    credentials: true,
  })
);

const globalLimiter = rateLimit({
  windowMs: 2 * 60 * 1000,
  max: 100,
  message: { success: false, message: 'Too many requests, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { success: false, message: 'Too many authentication attempts. Please wait 15 minutes and try again.' },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
});

const otpLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: { success: false, message: 'Too many OTP requests. Please wait 15 minutes and try again.' },
  standardHeaders: true,
  legacyHeaders: false,
});

const paymentLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { success: false, message: 'Too many payment requests. Please wait 15 minutes and try again.' },
  standardHeaders: true,
  legacyHeaders: false,
});

const trackingLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  message: { success: false, message: 'Too many tracking requests. Please try again in a minute.' },
  standardHeaders: true,
  legacyHeaders: false,
});

const b2bInquiryLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: { success: false, message: 'Too many inquiries submitted. Please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use('/api/', globalLimiter);

app.use('/api/payment/webhook', express.raw({ type: 'application/json' }));

app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));
app.use(cookieParser());

app.use(sanitizeMiddleware);

const morganFormat = process.env.NODE_ENV === 'production' ? 'combined' : 'dev';

app.use(
  morgan(morganFormat, {
    skip: (req) => req.path === '/api/payment/webhook',
    stream: {
      write: (message) => logger.http(message.trim()),
    },
  })
);

app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);
app.use('/api/admin/login', authLimiter);

app.use('/api/auth/forgot-password', otpLimiter);

app.use('/api/payment/create-order', paymentLimiter);

app.use('/api/orders/track', trackingLimiter);

app.use('/api/b2b/inquiry', b2bInquiryLimiter);

app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/products', productRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/payment', paymentRoutes);
app.use('/api/banners', bannerRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/b2b', b2bRoutes);

app.get('/', (req, res) => {
  res.status(200).json({ success: true, message: 'Varnam Organic API Operational' });
});

app.use((req, res, next) => {
  res.status(404).json({ success: false, message: 'Resource path not found' });
});

app.use((err, req, res, next) => {
  const statusCode = res.statusCode === 200 ? 500 : res.statusCode;

  logger.error(`${req.method} ${req.originalUrl} → ${statusCode} ${err.message}`, {
    stack: err.stack,
    ip: req.ip,
  });

  res.status(statusCode).json({
    success: false,
    message: err.message || 'Internal Server Error',
    stack: process.env.NODE_ENV === 'production' ? null : err.stack,
  });
});

const PORT = process.env.PORT || 5000;
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    logger.info('MongoDB Atlas connected successfully');
    startAbandonedCartCron();

    if (process.env.NODE_ENV !== "production") {
      app.listen(PORT, () => {
        console.log(`Server running on port ${PORT}`);
      });
    }
  })
  .catch((error) => {
    logger.error('Database connection failure', { error: error.message });
    process.exit(1);
  });

export default app;
