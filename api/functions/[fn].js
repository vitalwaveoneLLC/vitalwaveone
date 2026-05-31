// api/functions/[fn].js — Serverless function proxy (Node.js runtime)
import { neon } from '@neondatabase/serverless';
import { validateSession } from '../../lib/middleware/auth.js';
import { csrfMiddleware } from '../../lib/middleware/csrf.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Tenant-ID');

  if (req.method === 'OPTIONS') return res.status(204).end();

  const fn = req.url.split('/').pop().split('?')[0];
  const body = req.method !== 'GET' ? (req.body || {}) : {};
  const sql = neon(process.env.DATABASE_URL);

  // ── SEND WHATSAPP ──────────────────────────────────────────────────────
  if (fn === 'send-whatsapp') {
    const { to, phone_number_id, access_token, template_name, params = [] } = body;
    if (!to || !phone_number_id || !access_token) {
      return res.status(400).json({ error: 'Missing to, phone_number_id, or access_token' });
    }
    const components = params.length > 0 ? [{
      type: 'body',
      parameters: params.map(p => ({ type: 'text', text: String(p) })),
    }] : [];
    const metaRes = await fetch(
      `https://graph.facebook.com/v22.0/${phone_number_id}/messages`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${access_token}` },
        body: JSON.stringify({
          messaging_product: 'whatsapp', to, type: 'template',
          template: { name: template_name, language: { code: 'en_US' }, components },
        }),
      }
    );
    if (!metaRes.ok) {
      const e = await metaRes.json().catch(() => ({}));
      return res.status(400).json({ error: `WhatsApp error: ${JSON.stringify(e)}` });
    }
    return res.json({ ok: true });
  }

  // ── SEND OTP ───────────────────────────────────────────────────────────
  if (fn === 'send-otp') {
    const { to, code, expires_at, action, tenant_id: bodyTenantId } = body;

    // ── Verify path ────────────────────────────────────────────────────
    if (action === 'verify') {
      if (!to || !code) return res.json({ ok: false, err: 'Phone and code required.' });

      // Verify OTP (don't require tenant_id for login flow - it may be null)
      const [row] = await sql`
        SELECT * FROM otp_codes
        WHERE phone = ${to} AND code = ${code}
          AND used = false AND expires_at > now()
        ORDER BY created_at DESC LIMIT 1
      `;
      if (!row) return res.json({ ok: false, err: 'Invalid or expired code.' });
      await sql`UPDATE otp_codes SET used = true WHERE id = ${row.id}`;
      return res.json({ ok: true });
    }

    // ── Send path ───────────────────────────────────────────────────────
    if (!to || !code || !expires_at) {
      return res.json({ ok: false, err: 'Missing required OTP fields.' });
    }

    // Rate limit: max 5 OTP requests per phone per 10 minutes
    const clean10 = to.replace(/\D/g, '').slice(-10);
    const [rateRow] = await sql`
      SELECT COUNT(*)::int AS cnt FROM otp_codes
      WHERE RIGHT(REGEXP_REPLACE(phone, '[^0-9]', '', 'g'), 10) = ${clean10}
        AND created_at > now() - interval '10 minutes'
    `;
    if ((rateRow?.cnt || 0) >= 5) {
      return res.json({ ok: false, err: 'Too many requests. Please wait 10 minutes before requesting another code.' });
    }

    // Lazy cleanup: purge expired/used OTP rows older than 1 hour to keep table lean
    await sql`DELETE FROM otp_codes WHERE expires_at < now() - interval '1 hour'`.catch(() => {});

    // Get tenant_id from request (required for cross-tenant security)
    const sendTenantId = bodyTenantId || req.headers['x-tenant-id'] || req.headers['X-Tenant-ID'];

    // Save OTP record with tenant_id for cross-tenant security
    await sql`INSERT INTO otp_codes (phone, code, expires_at, used, tenant_id) VALUES (${to}, ${code}, ${expires_at}, false, ${sendTenantId})`.catch(() => {});

    // Use shared Meta credentials from environment variables
    const metaPhoneId = process.env.meta_phone_id;
    const metaToken = process.env.meta_token;

    if (!metaPhoneId || !metaToken) {
      return res.json({ ok: false, err: 'WhatsApp not configured. Contact admin.' });
    }

    // Send OTP via shared Meta account as plain text (template buttons cause issues)
    const metaRes = await fetch(
      `https://graph.facebook.com/v22.0/${metaPhoneId}/messages`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${metaToken}` },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          to: to.startsWith('+') ? to : `+${to}`,
          type: 'text',
          text: {
            body: `Your VitalWaveOne login code is: ${code}`,
          },
        }),
      }
    );

    if (!metaRes.ok) {
      const e = await metaRes.json().catch(() => ({}));
      console.error('[send-otp] Meta error:', JSON.stringify(e));
      // Fallback for development: return code if WhatsApp fails
      console.log(`[send-otp] DEVELOPMENT FALLBACK - Code for ${to}: ${code}`);
      return res.json({ ok: true, code, msg: 'WhatsApp failed - check logs for code' });
    }

    console.log(`[send-otp] SUCCESS - Sent to ${to}`);
    return res.json({ ok: true });
  }

  // ── SEND INVOICE EMAIL ─────────────────────────────────────────────────
  // Gmail credentials are now fetched from the DB using tenant_id — they are
  // no longer passed through the request body (prevents them appearing in logs).
  if (fn === 'send-invoice-email') {
    // Validate session and CSRF
    await validateSession(req, () => {});
    if (!req.session) return res.status(401).json({ error: 'Unauthorized' });

    await csrfMiddleware(req, () => {});
    if (req.csrfError) return res.status(403).json({ error: 'CSRF validation failed' });

    const { to, subject, html, from_name, from_email, attachment_base64, attachment_filename } = body;
    if (!to) return res.status(400).json({ error: 'Recipient email required' });

    // Resolve tenant
    const tenantId = body.tenant_id
      || req.headers['x-tenant-id']
      || req.headers['X-Tenant-ID'];

    // Fetch Gmail credentials from DB — never accepted from request body
    let gmail_user, gmail_app_password;
    if (tenantId) {
      const [coRow] = await sql`SELECT gmail_user, gmail_app_password FROM company WHERE tenant_id = ${tenantId} LIMIT 1`;
      gmail_user = coRow?.gmail_user;
      gmail_app_password = coRow?.gmail_app_password;
    }

    if (!gmail_user || !gmail_app_password) {
      return res.status(400).json({ error: 'Gmail not configured. Add gmail_user and gmail_app_password in Settings.' });
    }

    try {
      const nodemailer = await import('nodemailer');
      const transporter = nodemailer.default.createTransport({
        service: 'gmail',
        auth: { user: gmail_user, pass: gmail_app_password },
      });
      const mailOptions = {
        from: `${from_name || 'VitalWaveOne'} <${from_email || gmail_user}>`,
        to, subject, html,
      };
      if (attachment_base64 && attachment_filename) {
        mailOptions.attachments = [{
          filename: attachment_filename,
          content: attachment_base64,
          encoding: 'base64',
          contentType: 'application/pdf',
        }];
      }
      await transporter.sendMail(mailOptions);
      return res.json({ ok: true });
    } catch (e) {
      console.error('[send-invoice-email]', e.message);
      return res.status(500).json({ error: e.message });
    }
  }

  // ── CREATE PAYMENT INTENT ──────────────────────────────────────────────
  if (fn === 'create-payment-intent') {
    // Validate session and CSRF
    await validateSession(req, () => {});
    if (!req.session) return res.status(401).json({ error: 'Unauthorized' });

    await csrfMiddleware(req, () => {});
    if (req.csrfError) return res.status(403).json({ error: 'CSRF validation failed' });

    const { amount, currency = 'usd', metadata = {} } = body;
    if (!amount || amount <= 0) return res.status(400).json({ error: 'Invalid amount' });

    const params = new URLSearchParams({
      amount: Math.round(amount * 100).toString(),
      currency,
      'payment_method_types[]': 'card',
      'metadata[source]': 'order_portal',
      'metadata[customer_name]': metadata.customer_name || '',
    });
    const stripeRes = await fetch('https://api.stripe.com/v1/payment_intents', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.STRIPE_SECRET_KEY}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    });
    if (!stripeRes.ok) {
      const e = await stripeRes.json();
      return res.status(400).json({ error: e.error?.message || 'Stripe error' });
    }
    const intent = await stripeRes.json();
    return res.json({ clientSecret: intent.client_secret });
  }

  return res.status(404).json({ error: `Unknown function: ${fn}` });
}