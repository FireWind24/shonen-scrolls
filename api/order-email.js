/* ============================================================
   SHONEN SCROLLS — order email (Vercel serverless function)
   Sends the seller a complete email for each order: every
   ordered poster is fetched from the live site and attached
   (and shown inline) so nothing is lost when printing.

   Env vars (set in Vercel → Project → Settings → Environment):
     RESEND_API_KEY  required — https://resend.com/api-keys
     SELLER_EMAIL    required — the seller's inbox
     RESEND_FROM     optional — verified sender, default "onboarding@resend.dev"
     SITE_URL        optional — fallback origin for poster URLs
   ============================================================ */

'use strict';

const MAX_ATTACH = 20;

module.exports = async function orderEmail(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');

  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'POST only' });
  }

  const apiKey = process.env.RESEND_API_KEY;
  const sellerEmail = process.env.SELLER_EMAIL;
  if (!apiKey || !sellerEmail) {
    return res.status(500).json({ ok: false, error: 'RESEND_API_KEY / SELLER_EMAIL not configured' });
  }

  let order;
  try {
    order = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
  } catch (e) {
    return res.status(400).json({ ok: false, error: 'Invalid JSON body' });
  }

  const {
    orderId,
    name, phone, address, city, pincode, notes,
    total, shipping, items = [],
  } = order || {};

  if (!orderId || !items.length) {
    return res.status(400).json({ ok: false, error: 'Missing order data' });
  }

  const proto = req.headers['x-forwarded-proto'] || 'https';
  const host = req.headers['x-forwarded-host'] || req.headers.host || '';
  const origin = process.env.SITE_URL || `${proto}://${host}`;

  const attachments = [];
  let attached = 0;
  const failed = [];

  for (let i = 0; i < items.length; i++) {
    const it = items[i] || {};
    const src = (it.src || '').split('#')[0].trim();
    if (!/^designs\//i.test(src)) continue;

    const url = src.startsWith('http') ? src : `${origin}/${src.replace(/^\//, '')}`;
    try {
      const r = await fetch(url);
      if (!r.ok) throw new Error('HTTP ' + r.status);
      const buf = Buffer.from(await r.arrayBuffer());
      const ext = (src.split('.').pop() || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '');
      const safe = (it.sku || it.title || 'poster-' + (i + 1))
        .toString().replace(/[^\w\u0600-\u06FF\u4E00-\u9FFF\u0400-\u04FF]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40);
      attached += 1;
      attachments.push({
        filename: `${String(attached).padStart(2, '0')}-${safe}.${ext}`,
        content: buf.toString('base64'),
        content_id: `poster-${i + 1}`,
      });
    } catch (err) {
      failed.push(it.title || src);
    }
  }

  const itemsRows = items.map((it, i) => {
    const s = it.sizeLabel || it.size;
    const ref = it.sku ? ` [${it.sku}]` : '';
    const detail = it.detail ? `<br/><span style="color:#9a97a6;">▸ ${it.detail}</span>` : '';
    const line = `${i + 1}) ${it.title}${ref} — ${it.anime}<br/>${s} × ${it.qty} = ${it.price}${detail}`;
    return `<tr><td style="padding:6px 8px;border-bottom:1px solid #2a2a3a;font-size:13px;">${line}</td></tr>`;
  }).join('');

  const inline = attachments.map((a, i) =>
    `<img src="cid:${a.content_id}" alt="Poster ${i + 1}" style="max-width:180px;max-height:240px;border-radius:8px;margin:4px;border:1px solid #2a2a3a;" />`
  ).join('');

  const failedNote = failed.length
    ? `<p style="color:#c0392b;font-size:12px;">Could not attach: ${failed.join(', ')} — find them in the shop (search the SKU/title above).</p>`
    : '';

  const html = `
  <div style="background:#0c0c14;padding:24px;font-family:Arial,Helvetica,sans-serif;color:#f5f2ea;">
    <h2 style="margin:0 0 4px;color:#ff2e4d;font-size:20px;">SHONEN SCROLLS — New Order</h2>
    <p style="margin:0 0 16px;color:#9a97a6;font-size:12px;">Order #<strong style="color:#f5f2ea;">${orderId}</strong></p>

    <table style="width:100%;border-collapse:collapse;background:#12121c;border-radius:10px;overflow:hidden;">
      ${itemsRows}
      ${shipping ? `<tr><td style="padding:8px;font-size:13px;color:#9a97a6;">SHIPPING: ${shipping}</td></tr>` : ''}
      <tr><td style="padding:8px;font-size:14px;font-weight:bold;color:#ffb03a;">TOTAL: ${total}</td></tr>
    </table>

    <table style="width:100%;margin-top:16px;border-collapse:collapse;background:#12121c;border-radius:10px;">
      <tr><td style="padding:8px;font-size:13px;"><strong>Delivery</strong><br/>${name} · ${phone}<br/>${address}<br/>${city}${pincode ? ', ' + pincode : ''}</td></tr>
      ${notes ? `<tr><td style="padding:8px;font-size:13px;"><strong>Notes</strong><br/>${notes}</td></tr>` : ''}
    </table>

    <p style="margin:16px 0 8px;color:#9a97a6;font-size:12px;">Attached posters (print-ready):</p>
    <div>${inline || '<span style="color:#9a97a6;">No poster attachments.</span>'}</div>
    ${failedNote}
  </div>`;

  try {
    const resp = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        from: process.env.RESEND_FROM || 'onboarding@resend.dev',
        to: sellerEmail,
        subject: `🎌 New Order ${orderId} — ${items.length} poster${items.length > 1 ? 's' : ''}, ${total}`,
        html,
        attachments,
      }),
    });
    const data = await resp.json().catch(() => ({}));
    if (!resp.ok) {
      return res.status(502).json({ ok: false, error: (data && data.message) || `Resend ${resp.status}` });
    }
    return res.status(200).json({ ok: true, id: data.id, attached });
  } catch (err) {
    return res.status(500).json({ ok: false, error: err.message });
  }
};
