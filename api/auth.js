// api/auth.js — Consolidated auth handler
// Routes: POST /api/auth?action=signup|verify-otp|verify-admin|find-driver
import { neon } from '@neondatabase/serverless';
import { checkRateLimit, resetRateLimit } from '../lib/middleware/rate-limiter.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { action } = req.query;
  const sql = neon(process.env.DATABASE_URL);

  try {
    switch (action) {
      case 'find-driver':
        return await handleFindDriver(req, res, sql);
      case 'signup':
        return await handleSignup(req, res, sql);
      case 'verify-otp':
        return await handleVerifyOtp(req, res, sql);
      case 'verify-admin':
        return await handleVerifyAdmin(req, res, sql);
      default:
        return res.status(400).json({ error: 'Invalid action' });
    }
  } catch (e) {
    console.error('[auth-handler]', e.message);
    return res.status(500).json({ error: 'Server error' });
  }
}

async function handleFindDriver(req, res, sql) {
  const { phone } = req.body || {};
  if (!phone) return res.status(400).json({ error: 'Phone required' });

  const rateLimit = await checkRateLimit(`driver:${phone}`, 5, 900);
  res.setHeader('X-RateLimit-Remaining', rateLimit.remaining);
  if (!rateLimit.allowed) {
    return res.status(429).json({
      error: 'Too many attempts. Please try again later.',
      retryAfter: rateLimit.retryAfter,
    });
  }

  const clean = String(phone).replace(/\D/g, '');
  if (clean.length < 10) return res.status(400).json({ error: 'Invalid phone number' });
  const last10 = clean.slice(-10);

  const rows = await sql`
    SELECT id AS truck_id, tenant_id, driver
    FROM trucks
    WHERE RIGHT(REGEXP_REPLACE(COALESCE(phone,''), '[^0-9]', '', 'g'), 10) = ${last10}
    LIMIT 1
  `;

  if (!rows[0]) {
    return res.status(404).json({ error: 'No driver found with this phone number. Contact your admin.' });
  }

  return res.json({ ok: true, tenant_id: rows[0].tenant_id, truck_id: rows[0].truck_id, driver: rows[0].driver });
}

async function handleSignup(req, res, sql) {
  const { phone, role } = req.body || {};
  if (!phone || !role) return res.status(400).json({ error: 'Phone and role required' });

  const rateLimit = await checkRateLimit(`signup:${phone}`, 3, 3600);
  res.setHeader('X-RateLimit-Remaining', rateLimit.remaining);
  if (!rateLimit.allowed) {
    return res.status(429).json({ error: 'Too many signup attempts. Try again later.' });
  }

  const clean = String(phone).replace(/\D/g, '').slice(-10);
  const otp = Math.floor(100000 + Math.random() * 900000).toString(); // 6-digit code
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 min expiry

  try {
    const rows = await sql`
      INSERT INTO otp_sessions (phone, role, otp, expires_at)
      VALUES (${clean}, ${role}, ${otp}, ${expiresAt})
      ON CONFLICT(phone) DO UPDATE SET otp = ${otp}, expires_at = ${expiresAt}
      RETURNING id
    `;

    // TODO: Send OTP via WhatsApp
    console.log(`[OTP] ${clean}: ${otp}`);

    return res.json({ ok: true, message: 'OTP sent' });
  } catch (e) {
    console.error('[signup]', e.message);
    return res.status(500).json({ error: 'Signup failed' });
  }
}

async function handleVerifyOtp(req, res, sql) {
  const { phone, otp } = req.body || {};
  if (!phone || !otp) return res.status(400).json({ error: 'Phone and OTP required' });

  const clean = String(phone).replace(/\D/g, '').slice(-10);

  const rows = await sql`
    SELECT id, role, expires_at FROM otp_sessions
    WHERE phone = ${clean} AND otp = ${otp}
    LIMIT 1
  `;

  if (!rows[0]) {
    return res.status(401).json({ error: 'Invalid OTP' });
  }

  if (new Date(rows[0].expires_at) < new Date()) {
    return res.status(401).json({ error: 'OTP expired' });
  }

  // Mark as verified
  await sql`DELETE FROM otp_sessions WHERE id = ${rows[0].id}`;

  // For drivers, return tenant_id from trucks table
  let tenantId = null;
  if (rows[0].role === 'driver') {
    const truck = await sql`
      SELECT tenant_id FROM trucks
      WHERE RIGHT(REGEXP_REPLACE(COALESCE(phone,''), '[^0-9]', '', 'g'), 10) = ${clean}
      LIMIT 1
    `;
    tenantId = truck[0]?.tenant_id;
  }

  const token = Buffer.from(JSON.stringify({ phone: clean, role: rows[0].role, tenantId, iat: Date.now() })).toString('base64');

  return res.json({ ok: true, token, role: rows[0].role, tenantId });
}

async function handleVerifyAdmin(req, res, sql) {
  const { phone } = req.body || {};
  if (!phone) return res.status(400).json({ error: 'Phone required' });

  // Normalize phone to format stored in DB (with +)
  const normalized = phone.startsWith('+') ? phone : `+${phone}`;

  const rateLimit = await checkRateLimit(`admin-check:${normalized}`, 10, 300);
  res.setHeader('X-RateLimit-Remaining', rateLimit.remaining);
  if (!rateLimit.allowed) {
    return res.status(429).json({ error: 'Too many attempts. Try again later.' });
  }

  // Check if phone exists in profiles table as admin
  const rows = await sql`
    SELECT id, tenant_id, name, role FROM profiles
    WHERE phone = ${normalized} AND role = 'admin'
    LIMIT 1
  `;

  if (!rows[0]) {
    return res.status(401).json({ error: 'This phone number is not registered as an admin.' });
  }

  return res.json({
    ok: true,
    tenant_id: rows[0].tenant_id,
    name: rows[0].name,
    role: rows[0].role
  });
}
