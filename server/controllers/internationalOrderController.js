import InternationalOrder from '../models/InternationalOrder.js';
import { sendInternationalOrderAdminEmail } from '../services/mailService.js';
import logger from '../utils/logger.js';

// @desc    Submit an international (outside India) order inquiry (Public)
// @route   POST /api/international-orders/submit
export const submitInquiry = async (req, res) => {
  try {
    const {
      customerName, email, phone, country,
      addressLine, city, stateRegion, postalCode, message, items,
    } = req.body;

    if (!customerName?.trim() || !email?.trim() || !phone?.trim() || !country?.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Full name, email, phone, and country are required',
      });
    }

    const cleanItems = Array.isArray(items)
      ? items
          .filter((i) => i && (i.name || i.productId))
          .map((i) => ({
            productId: i.productId ? String(i.productId) : undefined,
            name: i.name ? String(i.name) : '',
            quantity: Number(i.quantity) || 1,
            price: Number(i.price) || 0,
          }))
      : [];

    const estimatedTotal = cleanItems.reduce((sum, i) => sum + i.price * i.quantity, 0);

    const inquiry = await InternationalOrder.create({
      customerName: customerName.trim(),
      email: email.trim(),
      phone: phone.trim(),
      country: country.trim(),
      addressLine: addressLine?.trim() || '',
      city: city?.trim() || '',
      stateRegion: stateRegion?.trim() || '',
      postalCode: postalCode?.trim() || '',
      message: message?.trim() || '',
      items: cleanItems,
      estimatedTotal,
    });

    // Best-effort — the inquiry is already saved, so a mail failure shouldn't
    // block the customer-facing success response.
    sendInternationalOrderAdminEmail(inquiry).catch((error) =>
      logger.error('[InternationalOrderController] Failed to send admin email', { error: error.message })
    );

    return res.status(201).json({ success: true, data: inquiry });
  } catch (error) {
    logger.error('[InternationalOrderController] submitInquiry failed', { error: error.message });
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// @desc    Get all international order inquiries, newest first (Admin)
// @route   GET /api/international-orders
export const getInquiries = async (req, res) => {
  try {
    const { status } = req.query;
    const filter = status ? { status } : {};

    const inquiries = await InternationalOrder.find(filter).sort({ createdAt: -1 }).lean();
    return res.status(200).json({ success: true, data: inquiries });
  } catch (error) {
    logger.error('[InternationalOrderController] getInquiries failed', { error: error.message });
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// @desc    Update an inquiry's status (Admin)
// @route   PATCH /api/international-orders/:id/status
export const updateInquiryStatus = async (req, res) => {
  try {
    const { status } = req.body;
    if (!['New', 'Contacted', 'Closed', 'Cancelled'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status value' });
    }

    const inquiry = await InternationalOrder.findByIdAndUpdate(req.params.id, { status }, { new: true });
    if (!inquiry) {
      return res.status(404).json({ success: false, message: 'Inquiry not found' });
    }

    return res.status(200).json({ success: true, data: inquiry });
  } catch (error) {
    logger.error('[InternationalOrderController] updateInquiryStatus failed', { error: error.message });
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};