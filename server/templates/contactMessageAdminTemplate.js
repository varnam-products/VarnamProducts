export const contactMessageAdminTemplate = (contactMessage) => {
  return {
    subject: `📩 New Contact Message – ${contactMessage.subject} | Varnam Organic`,
    html: `
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#ffffff;border:1px solid #ddd;border-radius:6px;overflow:hidden;">
      <div style="background:#1B4332;padding:20px 28px;">
        <h2 style="color:#fff;margin:0;font-size:18px;">📩 New Contact Form Message</h2>
        <p style="color:#B7D5C4;margin:4px 0 0;font-size:13px;">A visitor has submitted the Contact Us form.</p>
      </div>

      <div style="padding:28px;">
        <h3 style="color:#333;border-bottom:1px solid #eee;padding-bottom:8px;">Contact Details</h3>
        <p style="margin:4px 0;"><strong>Name:</strong> ${contactMessage.name}</p>
        <p style="margin:4px 0;"><strong>Email:</strong> ${contactMessage.email}</p>
        <p style="margin:4px 0;"><strong>Phone:</strong> ${contactMessage.phone || '—'}</p>
        <p style="margin:4px 0;"><strong>Subject:</strong> ${contactMessage.subject}</p>

        <h3 style="color:#333;border-bottom:1px solid #eee;padding-bottom:8px;margin-top:20px;">Message</h3>
        <p style="margin:0;color:#444;white-space:pre-wrap;">${contactMessage.message}</p>

        <p style="margin-top:24px;font-size:13px;color:#888;border-top:1px solid #eee;padding-top:14px;">
          Log in to the admin panel to view and respond to all contact messages.
        </p>
      </div>
    </div>
    `,
  };
};
