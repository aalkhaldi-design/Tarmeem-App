// netlify/functions/notify.mjs — sends notification emails via Resend.
// Requires RESEND_API_KEY in Netlify env; sender identity comes from the request
// (admin-configured in config/notifications). No-op-safe when unconfigured.

export const handler = async (event) => {
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: JSON.stringify({ error: 'Method Not Allowed' }) };
  try {
    if (!process.env.RESEND_API_KEY)
      return { statusCode: 200, body: JSON.stringify({ ok: false, skipped: 'no_api_key' }) };

    const raw = event.isBase64Encoded ? Buffer.from(event.body || '', 'base64').toString('utf8') : (event.body || '');
    const { to, subject, text, senderName, senderEmail, link } = JSON.parse(raw || '{}');
    const recipients = Array.isArray(to) ? to.filter(Boolean) : (to ? [to] : []);
    if (recipients.length === 0 || !senderEmail)
      return { statusCode: 200, body: JSON.stringify({ ok: false, skipped: 'no_recipients_or_sender' }) };

    const safe = (s) => String(s || '').replace(/[<>&]/g, c => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;' }[c]));
    const linkHtml = link ? `<p style="margin-top:16px"><a href="${safe(link)}" style="color:#4A1F66">فتح في المنصة</a></p>` : '';
    const html = `<div dir="rtl" style="font-family:Tajawal,Arial,sans-serif;color:#1f2937;line-height:1.7">
      <h2 style="color:#4A1F66;margin:0 0 8px">${safe(subject || 'إشعار')}</h2>
      <p style="margin:0">${safe(text)}</p>${linkHtml}
      <hr style="border:none;border-top:1px solid #eee;margin:20px 0" />
      <p style="font-size:12px;color:#9ca3af;margin:0">${safe(senderName || 'جمعية ترميم')} — رسالة آلية، يُرجى عدم الرد.</p>
    </div>`;

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: `${senderName || 'جمعية ترميم'} <${senderEmail}>`,
        to: recipients,
        subject: subject || 'إشعار من منصة ترميم',
        html,
      }),
    });
    if (!res.ok) return { statusCode: 502, body: JSON.stringify({ ok: false, error: await res.text() }) };
    const j = await res.json();
    return { statusCode: 200, body: JSON.stringify({ ok: true, id: j.id || null, count: recipients.length }) };
  } catch (e) {
    return { statusCode: 500, body: JSON.stringify({ ok: false, error: (e && e.message) || 'send error' }) };
  }
};
