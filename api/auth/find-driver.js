// api/auth/find-driver.js — Public endpoint: resolve tenant_id from driver phone
// No auth required — used to bootstrap tenant context before driver OTP login
import { neon } from '@neondatabase/serverless';
import { checkRateLimit } from '../../lib/middleware/rate-limiter.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { phone } = req.body || {};
  if (!phone) return res.status(400).json({ error: 'Phone required' });

  // Rate limit: 5 attempts per 15 minutes per phone
  const rateLimit = await checkRateLimit(`driver:${phone}`, 5, 900);
  res.setHeader('X-RateLimit-Remaining', rateLimit.remaining);
  if (!rateLimit.allowed) {
    return res.status(429).json({
      error: 'Too many attempts. Please try again later.',
      retryAfter: rateLimit.retryAfter,
    });
  }

  try {
    const sql = neon(process.env.DATABASE_URL);
    const clean = String(phone).replace(/\D/g, '');
    if (clean.length < 10) return res.status(400).json({ error: 'Invalid phone number' });
    const last10 = clean.slice(-10);

    // Match last 10 digits of stored phone — works regardless of country code formatting
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
  } catch (e) {
    console.error('[find-driver]', e.message);
    return res.status(500).json({ error: 'Server error' });
  }
}
