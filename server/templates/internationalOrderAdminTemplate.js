export const internationalOrderAdminTemplate = (inquiry) => {
  const itemRows = (inquiry.items || [])
    .map(
      (i) => `
      <tr>
        <td style="padding:10px 8px;border-bottom:1px solid #eee;">${i.name || '—'}</td>
        <td style="padding:10px 8px;border-bottom:1px solid #eee;text-align:center;">${i.quantity || '—'}</td>
        <td style="padding:10px 8px;border-bottom:1px solid #eee;text-align:right;">${i.price ? `₹${i.price}` : '—'}</td>
      </tr>`
    )
    .join('');

  return {
    subject: `🌍 New International Order Request – ${inquiry.customerName} (${inquiry.country}) | Varnam Organic`,
    html: `
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#ffffff;border:1px solid #ddd;border-radius:6px;overflow:hidden;">
      <div style="background:#1B4332;padding:20px 28px;">
        <h2 style="color:#fff;margin:0;font-size:18px;">🌍 International Order Request</h2>
        <p style="color:#B7D5C4;margin:4px 0 0;font-size:13px;">A customer outside India wants to place an order — requires manual handling.</p>
      </div>

      <div style="padding:28px;">
        <h3 style="color:#333;border-bottom:1px solid #eee;padding-bottom:8px;">Customer Details</h3>
        <p style="margin:4px 0;"><strong>Name:</strong> ${inquiry.customerName}</p>
        <p style="margin:4px 0;"><strong>Email:</strong> ${inquiry.email}</p>
        <p style="margin:4px 0;"><strong>Phone:</strong> ${inquiry.phone}</p>
        <p style="margin:4px 0;"><strong>Country:</strong> ${inquiry.country}</p>
        <p style="margin:4px 0;"><strong>Address:</strong> ${inquiry.addressLine || '—'}, ${inquiry.city || '—'}, ${inquiry.stateRegion || '—'} ${inquiry.postalCode || ''}</p>

        ${
          itemRows
            ? `<h3 style="color:#333;border-bottom:1px solid #eee;padding-bottom:8px;margin-top:20px;">Requested Items</h3>
        <table style="width:100%;border-collapse:collapse;font-size:14px;">
          <thead>
            <tr style="background:#f0f0f0;">
              <th style="padding:10px 8px;text-align:left;">Product</th>
              <th style="padding:10px 8px;text-align:center;">Qty</th>
              <th style="padding:10px 8px;text-align:right;">Unit Price</th>
            </tr>
          </thead>
          <tbody>${itemRows}</tbody>
        </table>
        <p style="margin:10px 0 0;font-size:13px;color:#555;"><strong>Estimated Total (INR reference):</strong> ₹${inquiry.estimatedTotal || 0}</p>`
            : ''
        }

        <h3 style="color:#333;border-bottom:1px solid #eee;padding-bottom:8px;margin-top:20px;">Message</h3>
        <p style="margin:0;color:#444;white-space:pre-wrap;">${inquiry.message || 'No additional message.'}</p>

        <div style="margin-top:20px;padding:14px 16px;background:#fff7ed;border:1px solid #fed7aa;border-radius:8px;">
          <p style="margin:0;color:#92400e;font-size:13px;">
            <strong>Action needed:</strong> Cashfree/COD aren't available for this order — reach out directly to
            arrange international payment (e.g. wire transfer / PayPal) and shipping.
          </p>
        </div>

        <p style="margin-top:24px;font-size:13px;color:#888;border-top:1px solid #eee;padding-top:14px;">
          Log in to the admin panel to view and manage all international order requests.
        </p>
      </div>
    </div>
    `,
  };
};
