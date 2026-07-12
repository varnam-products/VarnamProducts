import B2BInquiry from '../models/B2BInquiry.js';
import { sendB2BInquiryAdminEmail } from '../services/mailService.js';
import logger from '../utils/logger.js';

// @desc    Submit a B2B / wholesale inquiry (Public)
// @route   POST /api/b2b/inquiry
export const submitInquiry = async (req, res) => {
  try {
    const {
      businessName, contactName, email, phone,
      businessType, city, monthlyQuantity, message, products,
    } = req.body;

    if (!businessName?.trim() || !contactName?.trim() || !phone?.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Business name, contact person, and phone number are required',
      });
    }

    const cleanProducts = Array.isArray(products)
      ? products
          .filter((p) => p && (p.name || p.productId))
          .map((p) => ({
            productId: p.productId ? String(p.productId) : undefined,
            name: p.name ? String(p.name) : '',
            quantity: p.quantity !== undefined && p.quantity !== null ? String(p.quantity) : '',
          }))
      : [];

    const inquiry = await B2BInquiry.create({
      businessName: businessName.trim(),
      contactName: contactName.trim(),
      email: email?.trim() || '',
      phone: phone.trim(),
      businessType: businessType?.trim() || 'Other',
      city: city?.trim() || '',
      monthlyQuantity: monthlyQuantity?.trim() || '',
      message: message?.trim() || '',
      products: cleanProducts,
    });

    // Email is best-effort — the inquiry is already saved, so a mail failure
    // shouldn't turn into a customer-facing error (frontend falls back to
    // mailto only when this endpoint itself fails).
    sendB2BInquiryAdminEmail(inquiry).catch((error) =>
      logger.error('[B2BController] Failed to send inquiry admin email', { error: error.message })
    );

    return res.status(201).json({ success: true, data: inquiry });
  } catch (error) {
    logger.error('[B2BController] submitInquiry failed', { error: error.message });
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// @desc    Get all B2B inquiries, newest first (Admin)
// @route   GET /api/b2b/inquiries
export const getInquiries = async (req, res) => {
  try {
    const { status } = req.query;
    const filter = status ? { status } : {};

    const inquiries = await B2BInquiry.find(filter).sort({ createdAt: -1 }).lean();
    return res.status(200).json({ success: true, data: inquiries });
  } catch (error) {
    logger.error('[B2BController] getInquiries failed', { error: error.message });
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// @desc    Update an inquiry's status (Admin)
// @route   PATCH /api/b2b/inquiries/:id/status
export const updateInquiryStatus = async (req, res) => {
  try {
    const { status } = req.body;
    if (!['New', 'Contacted', 'Closed', 'Cancelled'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status value' });
    }

    const inquiry = await B2BInquiry.findByIdAndUpdate(req.params.id, { status }, { new: true });
    if (!inquiry) {
      return res.status(404).json({ success: false, message: 'Inquiry not found' });
    }

    return res.status(200).json({ success: true, data: inquiry });
  } catch (error) {
    logger.error('[B2BController] updateInquiryStatus failed', { error: error.message });
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};