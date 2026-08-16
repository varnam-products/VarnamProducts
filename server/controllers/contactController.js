import ContactMessage from '../models/ContactMessage.js';
import { sendContactMessageAdminEmail } from '../services/mailService.js';
import logger from '../utils/logger.js';

// @desc    Submit a contact form message (Public)
// @route   POST /api/contact
export const submitMessage = async (req, res) => {
  try {
    const { name, email, phone, subject, message } = req.body;

    if (!name?.trim() || !email?.trim() || !message?.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Name, email, and message are required',
      });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      return res.status(400).json({
        success: false,
        message: 'Please enter a valid email address',
      });
    }

    const contactMessage = await ContactMessage.create({
      name: name.trim(),
      email: email.trim(),
      phone: phone?.trim() || '',
      subject: subject?.trim() || 'General Inquiry',
      message: message.trim(),
    });

    // Email is best-effort — the message is already saved, so a mail failure
    // shouldn't turn into a customer-facing error.
    sendContactMessageAdminEmail(contactMessage).catch((error) =>
      logger.error('[ContactController] Failed to send contact admin email', { error: error.message })
    );

    return res.status(201).json({ success: true, data: contactMessage });
  } catch (error) {
    logger.error('[ContactController] submitMessage failed', { error: error.message });
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// @desc    Get all contact messages, newest first (Admin)
// @route   GET /api/contact
export const getMessages = async (req, res) => {
  try {
    const { status } = req.query;
    const filter = status ? { status } : {};

    const messages = await ContactMessage.find(filter).sort({ createdAt: -1 }).lean();
    return res.status(200).json({ success: true, data: messages });
  } catch (error) {
    logger.error('[ContactController] getMessages failed', { error: error.message });
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// @desc    Update a message's status (Admin)
// @route   PATCH /api/contact/:id/status
export const updateMessageStatus = async (req, res) => {
  try {
    const { status } = req.body;
    if (!['New', 'Read', 'Responded', 'Closed'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status value' });
    }

    const message = await ContactMessage.findByIdAndUpdate(req.params.id, { status }, { new: true });
    if (!message) {
      return res.status(404).json({ success: false, message: 'Message not found' });
    }

    return res.status(200).json({ success: true, data: message });
  } catch (error) {
    logger.error('[ContactController] updateMessageStatus failed', { error: error.message });
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// @desc    Delete a contact message (Admin)
// @route   DELETE /api/contact/:id
export const deleteMessage = async (req, res) => {
  try {
    const message = await ContactMessage.findByIdAndDelete(req.params.id);
    if (!message) {
      return res.status(404).json({ success: false, message: 'Message not found' });
    }
    return res.status(200).json({ success: true, data: {} });
  } catch (error) {
    logger.error('[ContactController] deleteMessage failed', { error: error.message });
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};
