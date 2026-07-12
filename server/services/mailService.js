import transporter from '../config/mail.js';
import logger from '../utils/logger.js';
import { orderPlacedCustomerTemplate } from '../templates/orderPlacedCustomerTemplate.js';
import { orderPlacedAdminTemplate } from '../templates/orderPlacedAdminTemplate.js';
import { orderShippedTemplate } from '../templates/orderShippedTemplate.js';
import { orderDeliveredTemplate } from '../templates/orderDeliveredTemplate.js';
import { orderCancelledTemplate } from '../templates/orderCancelledTemplate.js';
import { cancellationRequestAdminTemplate } from '../templates/cancellationRequestAdminTemplate.js';
import { cancellationResolvedCustomerTemplate } from '../templates/cancellationResolvedCustomerTemplate.js';
import { orderRefundConfirmedTemplate } from '../templates/orderRefundConfirmedTemplate.js';
import { b2bInquiryAdminTemplate } from '../templates/b2bInquiryAdminTemplate.js';
import { internationalOrderAdminTemplate } from '../templates/internationalOrderAdminTemplate.js';
import { contactMessageAdminTemplate } from '../templates/contactMessageAdminTemplate.js';

const sendMail = async ({ to, subject, html }) => {
  try {
    await transporter.sendMail({
      from: `"Varnam Organic" <${process.env.MAIL_FROM}>`,
      to,
      subject,
      html,
    });
  } catch (error) {
    logger.error(`[MailService] Failed to send email to ${to}`, {
      subject,
      error: error.message,
    });
  }
};

export const sendOrderPlacedEmails = async (order) => {
  const customerTemplate = orderPlacedCustomerTemplate(order);
  const adminTemplate = orderPlacedAdminTemplate(order);

  await Promise.all([
    sendMail({ to: order.customerEmail, ...customerTemplate }),
    sendMail({ to: process.env.ADMIN_EMAIL, ...adminTemplate }),
  ]);
};

export const sendOrderShippedEmail = async (order) => {
  const template = orderShippedTemplate(order);
  await sendMail({ to: order.customerEmail, ...template });
};

export const sendOrderDeliveredEmail = async (order) => {
  const template = orderDeliveredTemplate(order);
  await sendMail({ to: order.customerEmail, ...template });
};

export const sendOrderCancelledEmail = async (order, isRefund = false) => {
  const template = orderCancelledTemplate(order, isRefund);
  await sendMail({ to: order.customerEmail, ...template });
};

export const sendCancelRequestAdminEmail = async (order) => {
  const template = cancellationRequestAdminTemplate(order);
  await sendMail({ to: process.env.ADMIN_EMAIL, ...template });
};

export const sendCancelRequestResolvedEmail = async (order, decision, isRefund = false) => {
  const template = cancellationResolvedCustomerTemplate(order, decision, isRefund);
  await sendMail({ to: order.customerEmail, ...template });
};

export const sendRefundConfirmedEmail = async (order) => {
  const template = orderRefundConfirmedTemplate(order);
  await sendMail({ to: order.customerEmail, ...template });
};

export const sendManualReviewAlertEmail = async (order) => {
  await sendMail({
    to: process.env.ADMIN_EMAIL,
    subject: `🚨 Manual Review Required – ${order.orderNumber} | Stock Conflict`,
    html: `
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#fff;border:1px solid #ddd;border-radius:6px;overflow:hidden;">
      <div style="background:#b91c1c;padding:20px 28px;">
        <h2 style="color:#fff;margin:0;font-size:18px;">🚨 Urgent: Order Needs Manual Review</h2>
        <p style="color:#fca5a5;margin:4px 0 0;font-size:13px;">
          Payment was captured but stock could not be deducted. Customer has been notified.
        </p>
      </div>
      <div style="padding:28px;">
        <div style="background:#fef2f2;border-left:4px solid #b91c1c;padding:14px 18px;border-radius:4px;margin-bottom:20px;">
          <p style="margin:0 0 6px;"><strong>Order Number:</strong> ${order.orderNumber}</p>
          <p style="margin:0 0 6px;"><strong>Customer:</strong> ${order.customerName} (${order.customerEmail})</p>
          <p style="margin:0 0 6px;"><strong>Phone:</strong> ${order.customerPhone}</p>
          <p style="margin:0 0 6px;"><strong>Total Paid:</strong> ₹${order.totalPrice.toFixed(2)}</p>
          <p style="margin:0 0 6px;"><strong>Payment ID:</strong> ${order.cashfreePaymentId}</p>
          <p style="margin:0;"><strong>Status:</strong> <span style="color:#b91c1c;font-weight:bold;">Pending Manual Review</span></p>
        </div>
        <h3 style="margin-top:0;color:#333;">Items Ordered</h3>
        ${order.orderItems.map(item =>
          `<p style="margin:4px 0;">• ${item.name} × ${item.quantity} @ ₹${item.price.toFixed(2)}</p>`
        ).join('')}
        <div style="margin-top:20px;padding:14px;background:#fff8e1;border-radius:4px;border-left:4px solid #f59e0b;">
          <p style="margin:0;color:#92400e;font-size:14px;">
            <strong>Action required within 24 hours:</strong><br/>
            Either fulfil the order manually, or cancel it and initiate a full Cashfree refund of
            ₹${order.totalPrice.toFixed(2)} to the customer.
          </p>
        </div>
        <p style="margin-top:20px;font-size:13px;color:#888;">Log in to the admin panel to resolve this order.</p>
      </div>
    </div>`,
  });
};

export const sendB2BInquiryAdminEmail = async (inquiry) => {
  const template = b2bInquiryAdminTemplate(inquiry);
  await sendMail({ to: process.env.ADMIN_EMAIL, ...template });
};

export const sendInternationalOrderAdminEmail = async (inquiry) => {
  const template = internationalOrderAdminTemplate(inquiry);
  await sendMail({ to: process.env.ADMIN_EMAIL, ...template });
};

export const sendContactMessageAdminEmail = async (contactMessage) => {
  const template = contactMessageAdminTemplate(contactMessage);
  await sendMail({ to: process.env.ADMIN_EMAIL, ...template });
};