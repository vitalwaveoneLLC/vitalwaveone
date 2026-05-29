// api/auth/verify-otp.js
// Verify OTP code with rate limiting and proper session management
import { neon } from '@neondatabase/serverless';
import { checkRateLimit, resetRateLimit } from '../middleware/rate-limiter.js';
import crypto from 'crypto';

const sql = neon(process.env.DATABASE_URL);

// Generate secure session token
function generateSessionToken() {
  return crypto.randomBytes(32).toString('hex');
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', process.env.ALLOWED_ORIGIN || 'https://vitalwaveone.com');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Allow-Credentials', 'true');

  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { phone, code, userType = 'admin' } = req.body || {};

  if (!phone || !code) {
    return res.status(400).json({ error: 'Phone and code required' });
  }

  // Rate limit: 5 attempts per 15 minutes per phone
  const rateLimit = await checkRateLimit(`otp:${phone}`, 5, 900);
  res.setHeader('X-RateLimit-Remaining', rateLimit.remaining);
  res.setHeader('Retry-After', rateLimit.retryAfter);

  if (!rateLimit.allowed) {
    return res.status(429).json({
      error: 'Too many verification attempts. Please try again in 15 minutes.',
      retryAfter: rateLimit.retryAfter,
    });
  }

  try {
    const bare = phone.replace(/^\+?1/, '');

    // Check OTP code
    const otpRows = await sql`
      SELECT id, expires_at, used
      FROM otp_codes
      WHERE code = ${code}
        AND (phone = ${phone} OR phone = ${bare})
        AND used = false
        AND expires_at > now()
      LIMIT 1
    `;

    if (otpRows.length === 0) {
      return res.status(403).json({ error: 'Invalid or expired OTP code' });
    }

    const otp = otpRows[0];

    // Mark OTP as used
    await sql`
      UPDATE otp_codes
      SET used = true, used_at = now()
      WHERE id = ${otp.id}
    `;

    // Find user based on type
    let userRow, tenantId;

    if (userType === 'admin') {
      // Admin: find in profiles (must be admin role)
      const adminRows = await sql`
        SELECT p.id, p.tenant_id, p.full_name, p.role,
               t.id AS tenant_id, t.plan, t.status
        FROM profiles p
        JOIN tenants t ON t.id = p.tenant_id
        WHERE p.role = 'admin'
          AND t.status = 'active'
          AND (p.phone = ${phone} OR p.phone = ${bare})
        LIMIT 1
      `;

      if (adminRows.length === 0) {
        return res.status(403).json({ error: 'Phone not registered as admin' });
      }

      userRow = adminRows[0];
      tenantId = userRow.tenant_id;
    } else if (userType === 'driver') {
      // Driver: find in drivers table
      const driverRows = await sql`
        SELECT id, tenant_id, name, phone
        FROM drivers
        WHERE tenant_id IS NOT NULL
          AND (phone = ${phone} OR phone = ${bare})
        LIMIT 1
      `;

      if (driverRows.length === 0) {
        return res.status(403).json({ error: 'Phone not registered as driver' });
      }

      userRow = driverRows[0];
      tenantId = userRow.tenant_id;
    }

    // Generate secure session token
    const sessionToken = generateSessionToken();

    // Store session in database (server-side)
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    await sql`
      INSERT INTO sessions (token, user_id, user_type, tenant_id, expires_at)
      VALUES (${sessionToken}, ${userRow.id}, ${userType}, ${tenantId}, ${expiresAt})
      ON CONFLICT (token) DO UPDATE SET expires_at = EXCLUDED.expires_at
    `;

    // Reset rate limit on successful auth
    await resetRateLimit(`otp:${phone}`);

    // Return session cookie (httpOnly, Secure, SameSite)
    res.setHeader('Set-Cookie', [
      `vitalwaveone_session=${sessionToken}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${7 * 24 * 60 * 60}`,
      `vitalwaveone_tenant=${tenantId}; Path=/; Secure; SameSite=Strict; Max-Age=${7 * 24 * 60 * 60}`,
    ]);

    return res.json({
      ok: true,
      sessionToken, // For development/testing; remove in production
      user: {
        id: userRow.id,
        name: userRow.full_name || userRow.name,
        type: userType,
        tenantId,
      },
    });
  } catch (error) {
    console.error('[verify-otp]', error.message);
    return res.status(500).json({ error: 'Verification failed' }