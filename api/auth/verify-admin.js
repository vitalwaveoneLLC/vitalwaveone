// api/auth/verify-admin.js
// Verifies phone belongs to an admin in the company table
import { neon } from '@neondatabase/serverless';
import { checkRateLimit } from '../../lib/middleware/rate-limiter.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const sql = neon(process.env.DATABASE_URL);
  const { phone } = req.body || {};

  if (!phone) return res.status(400).json({ error: 'Phone required' });

  // Rate limit: 5 attempts per 15 minutes per phone
  const rateLimit = await checkRateLimit(`admin:${phone}`, 5, 900);
  res.setHeader('X-RateLimit-Remaining', rateLimit.remaining);
  if (!rateLimit.allowed) {
    return res.status(429).json({
      error: 'Too many attempts. Please try again later.',
      retryAfter: rateLimit.retryAfter,
    });
  }

  try {
    // Single UNION query covers both lookup paths:
    //   1. Profile phone or tenant phone matches (profiles JOIN tenants)
    //   2. Company table phone matches (company JOIN tenants JOIN profiles)
    const bare = phone.replace(/^\+?1/, '');
    const rows = await sql`
      SELECT p.id, p.role, p.full_name, p.tenant_id,
             t.name AS company_name, t.plan, t.status, t.trial_ends_at
      FROM profiles p
      JOIN tenants t ON t.id = p.tenant_id
      WHERE p.role = 'admin'
        AND t.status = 'active'
        AND (
          p.phone IN (${phone}, ${bare})
          OR t.phone IN (${phone}, ${bare})
        )

      UNION

      SELECT p.id, p.role, p.full_name, p.tenant_id,
             t.name AS company_name, t.plan, t.status, t.trial_ends_at
      FROM company co
      JOIN tenants t ON t.id = co.tenant_id
      JOIN profiles p ON p.tenant_id = t.id AND p.role = 'admin'
      WHERE co.phone IN (${phone}, ${bare})
        AND t.status = 'active'

      LIMIT 1
    `;

    if (rows.length === 0) {
      return res.status(403).json({ error: 'Phone number not registered as admin.' });
    }

    const admin = rows[0];
    return res.json({ ok:true, tenant_id:admin.tenant_id, role:admin.role, name:admin.full_name, plan:admin.plan });

  } catch(e) {
    console.error('[verify-admin]', e.message);
    return res.status(500).json({ error: e.message });
  }
}
