// api/db/client.js — Neon Postgres client (Node.js runtime)
import { neon } from '@neondatabase/serverless';

export const sql = neon(process.env.DATABASE_URL);

// Get tenant from X-Tenant-ID header (WhatsApp OTP auth — no Clerk)
// Supports both Node.js (headers object) and Edge (Headers class with .get())
export async function getTenant(req) {
  const tenantId = (typeof req.headers?.get === 'function')
    ? (req.headers.get('x-tenant-id') || req.headers.get('X-Tenant-ID'))
    : (req.headers?.['x-tenant-id'] || req.headers?.['X-Tenant-ID']);
  if (!tenantId) return null;
  try {
    const rows = await sql`
      SELECT t.id AS tenant_id, t.plan, t.status, t.trial_ends_at,
             t.brand_name, t.brand_primary_color, t.brand_logo_url,
             t.max_trucks, t.max_customers
      FROM tenants t
      WHERE t.id = ${tenantId}::uuid
      LIMIT 1
    `;
    return rows[0] || null;
  } catch (e) {
    console.error('[getTenant]', e.message);
    return null;
  }
}

// Response helpers — used by billing and storage routes
export const ok  = (data = {}, status = 200) => Response.json({ ok: true, ...data }, { status });
export const err = (message, status = 400)   => Response.json({ ok: false, error: message }, { status });
export const cors = () => new Response(null, {
  status: 204,
  headers: {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Tenant-ID',
  },
});

export function requirePlan(tenant, requiredPlans) {
  if (!tenant) return { ok: false, error: 'Unauthorized', status: 401 };
  const isActive = tenant.status === 'active' &&
    (tenant.plan !== 'trial' || new Date(tenant.trial_ends_at) > new Date());
  if (!isActive) return { ok: false, error: 'Subscription expired.', status: 402 };
  if (requiredPlans && !requiredPlans.includes(tenant.plan) && tenant.plan !== 'enterprise') {
    return { ok: false, error: `This feature requires ${requiredPlans[0]} plan or higher.`, status: 403, upgrade: true };
  }
  return { ok: true };
}

export const jsonRes = (data, status = 200, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.status(status).json(data);
};
