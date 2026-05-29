// api/auth/signup.js — New tenant signup (WhatsApp OTP auth — no Clerk)
// Creates: tenant + profile (with phone) + company + invoice_sequence + onboarding
// After signup, admin logs in via /login using their phone + WhatsApp OTP.

import { neon } from '@neondatabase/serverless';
import { checkRateLimit } from '../../lib/middleware/rate-limiter.js';

export const config = { api: { bodyParser: true } };

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  let body = req.body;
  if (!body || typeof body === 'string') {
    try { body = JSON.parse(body || '{}'); } catch { body = {}; }
  }

  const sql = neon(process.env.DATABASE_URL);
  const { plan, company_name, owner_name, email = '', phone } = body;

  // phone is required — it is the login identifier for WhatsApp OTP
  if (!phone || !company_name) {
    return res.status(400).json({
      error: `Missing required fields: company_name=${!!company_name}, phone=${!!phone}`,
    });
  }

  // Normalise phone to E.164-style (strip non-digits, prepend 1 if 10 digits)
  const cleanPhone = phone.replace(/\D/g, '');
  if (cleanPhone.length < 10) {
    return res.status(400).json({ error: 'Invalid phone number — must be at least 10 digits.' });
  }
  const normPhone = cleanPhone.length === 10 ? '1' + cleanPhone : cleanPhone;

  // Rate limit: 3 signup attempts per 60 minutes per phone
  const rateLimit = await checkRateLimit(`signup:${normPhone}`, 3, 3600);
  res.setHeader('X-RateLimit-Remaining', rateLimit.remaining);
  if (!rateLimit.allowed) {
    return res.status(429).json({
      error: 'Too many signup attempts. Please try again later.',
      retryAfter: rateLimit.retryAfter,
    });
  }

  try {
    // Prevent duplicate phone registrations
    const existingPhone = await sql`
      SELECT id FROM profiles WHERE RIGHT(REGEXP_REPLACE(COALESCE(phone,''), '[^0-9]', '', 'g'), 10) = ${cleanPhone.slice(-10)} LIMIT 1
    `;
    if (existingPhone.length) {
      return res.status(400).json({ error: 'A company is already registered with this phone number.' });
    }

    // Generate unique URL slug from company name
    const baseSlug = company_name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 30) || 'company';
    let slug = baseSlug, suffix = 1;
    while (true) {
      const taken = await sql`SELECT id FROM tenants WHERE slug = ${slug} LIMIT 1`;
      if (!taken.length) break;
      slug = `${baseSlug}-${++suffix}`;
    }

    // Plan feature limits
    const limits = {
      trial:    { max_trucks: 2,   max_customers: 20    },
      starter:  { max_trucks: 3,   max_customers: 100   },
      standard: { max_trucks: 10,  max_customers: 500   },
      premium:  { max_trucks: 999, max_customers: 99999 },
    }[plan] || { max_trucks: 2, max_customers: 20 };

    // ── Create all records in a logical sequence ───────────────────────
    // 1. Tenant (the company / subscription holder)
    const [tenant] = await sql`
      INSERT INTO tenants (
        name, slug, plan, status, brand_name,
        owner_email, owner_name, phone,
        max_trucks, max_customers, trial_ends_at
      ) VALUES (
        ${company_name}, ${slug}, 'trial', 'active', ${company_name},
        ${email}, ${owner_name || ''}, ${normPhone},
        ${limits.max_trucks}, ${limits.max_customers},
        now() + interval '14 days'
      )
      RETURNING *
    `;

    // 2. Admin profile — phone is the login identifier, no Clerk needed
    await sql`
      INSERT INTO profiles (tenant_id, email, full_name, phone, role)
      VALUES (${tenant.id}, ${email}, ${owner_name || ''}, ${normPhone}, 'admin')
    `;

    // 3. Company settings row (for Meta/WhatsApp config, email config, etc.)
    await sql`
      INSERT INTO company (tenant_id, name, phone)
      VALUES (${tenant.id}, ${company_name}, ${normPhone})
    `;

    // 4. Invoice number sequence — starts at 0, first sale will be INV-0001
    await sql`
      INSERT INTO invoice_sequences (tenant_id, current_number)
      VALUES (${tenant.id}, 0)
      ON CONFLICT (tenant_id) DO NOTHING
    `;

    // 5. Onboarding tracker
    await sql`
      INSERT INTO onboarding (tenant_id, step) VALUES (${tenant.id}, 1)
      ON CONFLICT DO NOTHING
    `;

    console.log('[signup] new tenant created:', tenant.id, slug, normPhone);

    return res.status(201).json({
      ok: true,
      tenant_id:     tenant.id,
      slug:          tenant.slug,
      plan:          tenant.plan,
      trial_ends_at: tenant.trial_ends_at,
      login_phone:   normPhone,
      message:       'Account created. Log in at /login using your WhatsApp phone number.',
    });

  } catch (e) {
    console.error('[signup] error:', e.message);
    // Surface duplicate key or constraint violations clearly
    if (e.message.includes('duplicate key') || e.message.includes('unique')) {
      return res.status(400).json({ error: 'An account with this information already exists.' });
    }
    return res.status(500).json({ error: e.message });
  }
}
