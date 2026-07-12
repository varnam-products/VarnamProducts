export const b2bInquiryAdminTemplate = (inquiry) => {
  const productRows = (inquiry.products || [])
    .map(
      (p) => `
      <tr>
        <td style="padding:10px 8px;border-bottom:1px solid #eee;">${p.name || '—'}</td>
        <td style="padding:10px 8px;border-bottom:1px solid #eee;text-align:center;">${p.quantity || '—'}</td>
      </tr>`
    )
    .join('');

  return {
    subject: `🤝 New B2B Wholesale Inquiry – ${inquiry.businessName} | Varnam Organic`,
    html: `
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#ffffff;border:1px solid #ddd;border-radius:6px;overflow:hidden;">
      <div style="background:#1B4332;padding:20px 28px;">
        <h2 style="color:#fff;margin:0;font-size:18px;">🤝 New Wholesale Inquiry</h2>
        <p style="color:#B7D5C4;margin:4px 0 0;font-size:13px;">A business has submitted an inquiry via the B2B page.</p>
      </div>

      <div style="padding:28px;">
        <h3 style="color:#333;border-bottom:1px solid #eee;padding-bottom:8px;">Business Details</h3>
        <p style="margin:4px 0;"><strong>Business Name:</strong> ${inquiry.businessName}</p>
        <p style="margin:4px 0;"><strong>Business Type:</strong> ${inquiry.businessType || '—'}</p>
        <p style="margin:4px 0;"><strong>Contact Person:</strong> ${inquiry.contactName}</p>
        <p style="margin:4px 0;"><strong>Email:</strong> ${inquiry.email || '—'}</p>
        <p style="margin:4px 0;"><strong>Phone:</strong> ${inquiry.phone}</p>
        <p style="margin:4px 0;"><strong>City:</strong> ${inquiry.city || '—'}</p>
        <p style="margin:4px 0;"><strong>Estimated Monthly Quantity:</strong> ${inquiry.monthlyQuantity || '—'}</p>

        ${
          productRows
            ? `<h3 style="color:#333;border-bottom:1px solid #eee;padding-bottom:8px;margin-top:20px;">Products Interested In</h3>
        <table style="width:100%;border-collapse:collapse;font-size:14px;">
          <thead>
            <tr style="background:#f0f0f0;">
              <th style="padding:10px 8px;text-align:left;">Product</th>
              <th style="padding:10px 8px;text-align:center;">Quantity</th>
            </tr>
          </thead>
          <tbody>${productRows}</tbody>
        </table>`
            : ''
        }

        <h3 style="color:#333;border-bottom:1px solid #eee;padding-bottom:8px;margin-top:20px;">Message</h3>
        <p style="margin:0;color:#444;white-space:pre-wrap;">${inquiry.message || 'No additional message.'}</p>

        <p style="margin-top:24px;font-size:13px;color:#888;border-top:1px solid #eee;padding-top:14px;">
          Log in to the admin panel to view and manage all wholesale inquiries.
        </p>
      </div>
    </div>
    `,
  };
};
