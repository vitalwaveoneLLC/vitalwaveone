// api/rpc/[fn].js — Database RPC functions
// Auth: X-Tenant-ID header (same pattern as api/data/[table].js — no Clerk dependency)

import { neon } from '@neondatabase/serverless';
import { validateSession } from '../../lib/middleware/auth.js';
import { csrfMiddleware } from '../../lib/middleware/csrf.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Tenant-ID, X-CSRF-Token, X-Session-Token');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  if (req.method === 'OPTIONS') return res.status(204).end();

  // Validate session and CSRF
  await validateSession(req, () => {});
  if (!req.session) return res.status(401).json({ error: 'Unauthorized' });

  await csrfMiddleware(req, () => {});
  if (req.csrfError) return res.status(403).json({ error: 'CSRF validation failed' });

  // Resolve tenant from header — same pattern as api/data/[table].js
  const tenantId = req.headers['x-tenant-id'] || req.headers['X-Tenant-ID'];
  if (!tenantId) return res.status(401).json({ error: 'Unauthorized — please sign in' });

  // Extract function name from URL path  e.g. /api/rpc/next_invoice_number
  const fn = (req.url || '').split('/').pop().split('?')[0];
  if (!fn) return res.status(400).json({ error: 'Function name required' });

  const sql = neon(process.env.DATABASE_URL);

  try {
    // ── next_invoice_number ────────────────────────────────────────────────
    // Atomically increments the per-tenant sequence and returns the new number.
    // DB-level upsert ensures concurrent sales never duplicate an invoice ID.
    if (fn === 'next_invoice_number') {
      const [result] = await sql`
        SELECT next_invoice_number(${tenantId}::uuid) AS num
      `;
      return res.json({ data: result.num, error: null });
    }

    // ── reset_invoice_sequence ─────────────────────────────────────────────
    if (fn === 'reset_invoice_sequence') {
      await sql`SELECT reset_invoice_sequence(${tenantId}::uuid)`;
      return res.json({ data: { ok: true }, error: null });
    }

    return res.status(404).json({ error: `Unknown RPC function: ${fn}` });

  } catch (e) {
    console.error(`[api/rpc/${fn}]`, e.message);
    return res.status(500).json({ error: e.message });
  }
}
