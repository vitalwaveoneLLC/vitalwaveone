// api/data/[table].js — Universal CRUD API (Node.js runtime)
import { neon } from '@neondatabase/serverless';
import { getTenant, requirePlan } from '../../lib/db/client.js';
import { validateSession } from '../../lib/middleware/auth.js';
import { csrfMiddleware } from '../../lib/middleware/csrf.js';

const ALLOWED_TABLES = [
  'sales','customers','products','trucks','loads','payments',
  'payments_log','returns','expenses','state_taxes','promotions',
  'purchase_orders','suppliers','recurring_orders','orders',
  'credit_memos','truck_resets','walkin_registrations','audit_log',
  'company','profiles','otp_codes','invoice_sequences',
];

// Whitelist of every column name allowed in filter keys, ORDER BY, and SELECT.
// This prevents SQL injection via query-string parameters.
const ALLOWED_COLUMNS = new Set([
  // common
  'id','tenant_id','created_at','updated_at','is_active','notes','status','date',
  // sales
  'truck_id','customer_id','driver_id','load_id','total','invoice_number',
  'subtotal','tax_amount','discount_amount','payment_status','payment_method',
  'items','sale_id',
  // customers
  'name','phone','email','address','balance','route','credit_limit','lat','lng',
  // products
  'sku','price','unit','category','description','stock','min_stock',
  // trucks
  'plate','capacity',
  // loads
  'total_value',
  // payments / payments_log
  'amount','method','reference','type',
  // returns
  'reason',
  // expenses
  'driver_id',
  // state_taxes
  'state','rate','effective_date',
  // promotions
  'value','start_date','end_date','applies_to',
  // purchase_orders
  'supplier_id',
  // suppliers  (name, phone, email, address already listed)
  // recurring_orders
  'frequency','next_date',
  // orders  (customer_id, items, date, status, notes already listed)
  // credit_memos
  'memo_id',
  // truck_resets  (truck_id, date, reason, driver_id already listed)
  // walkin_registrations  (name, phone, email, address, date, notes already listed)
  // audit_log
  'user_id','action','table_name','record_id','old_data','new_data',
  // company
  'logo_url','brand_color','from_email','gmail_user','tax_rate','currency',
  'invoice_prefix','terms',
  // profiles
  'full_name','role',
  // invoice_sequences
  'prefix','next_number',
  // otp_codes
  'code','expires_at','used',
]);

/**
 * Validate a bare identifier (column name) against the whitelist.
 * Returns the identifier unchanged if valid, throws otherwise.
 */
function assertCol(col) {
  const c = String(col).trim().toLowerCase();
  if (!ALLOWED_COLUMNS.has(c)) throw new Error(`Column "${col}" is not allowed`);
  return c;
}

/**
 * Parse and validate an ORDER BY clause like "created_at DESC" or "name".
 * Returns a safe SQL fragment or throws on invalid input.
 */
function safeOrder(raw) {
  const parts = String(raw).trim().split(/\s+/);
  const col = assertCol(parts[0]);
  const dir = parts[1] ? parts[1].toUpperCase() : '';
  if (dir && dir !== 'ASC' && dir !== 'DESC') throw new Error(`Invalid ORDER direction "${dir}"`);
  return dir ? `${col} ${dir}` : col;
}

/**
 * Parse and validate a SELECT column list ("*" or "col1,col2,...").
 * Returns a safe SQL fragment or throws on invalid input.
 */
function safeSelect(raw) {
  if (!raw || raw.trim() === '*') return '*';
  return raw.split(',').map(c => assertCol(c.trim())).join(', ');
}

const PREMIUM_TABLES  = ['credit_memos','audit_log','truck_resets'];
const STANDARD_TABLES = ['promotions','purchase_orders','suppliers','payments_log'];

/**
 * Columns that must never be supplied by the client in write payloads.
 * tenant_id is automatically enforced server-side; the others guard
 * against privilege escalation within a tenant.
 */
const BLOCKED_WRITE_COLS = new Set(['tenant_id']);

/**
 * Quote a Postgres identifier to prevent SQL injection via column names.
 * Double-quotes are escaped per SQL standard.
 */
function quoteIdent(name) {
  return `"${String(name).replace(/"/g, '""')}"`;
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization,X-Tenant-ID,X-CSRF-Token,X-Session-Token');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  if (req.method === 'OPTIONS') return res.status(204).end();

  const table = req.query.table;
  if (!ALLOWED_TABLES.includes(table)) return res.status(403).json({ error: `Table "${table}" not allowed` });

  const sql = neon(process.env.DATABASE_URL);

  // OTP codes — no auth needed
  if (table === 'otp_codes') return handleOtp(req, res, sql);

  // Validate session and CSRF for mutation requests
  if (req.method !== 'GET') {
    await validateSession(req, res, () => {});
    if (!req.session) return res.status(401).json({ error: 'Unauthorized' });

    await csrfMiddleware(req, res, () => {});
    if (res.headersSent) return;
  }

  // Resolve tenant from X-Tenant-ID header — fetches real plan/status from DB
  // For GET requests on public tables, allow unauthenticated access with tenant filter (customer portal reads)
  const PUBLIC_READ_TABLES = ['products', 'company', 'state_taxes', 'customers', 'loads', 'sales', 'returns'];
  const isPublicRead = req.method === 'GET' && PUBLIC_READ_TABLES.includes(table);

  const tenant = await getTenant(req);
  if (!tenant && !isPublicRead) return res.status(401).json({ error: 'Unauthorized - please sign in' });

  // For public reads without auth, tenant_id comes from header but won't be validated against DB
  // Still requires explicit tenant_id filtering in queries
  let tenantId = tenant?.tenant_id;
  if (!tenantId && isPublicRead) {
    // Try to get tenant_id from header for public portal reads
    tenantId = (typeof req.headers?.get === 'function')
      ? (req.headers.get('x-tenant-id') || req.headers.get('X-Tenant-ID'))
      : (req.headers?.['x-tenant-id'] || req.headers?.['X-Tenant-ID']);
    if (!tenantId) return res.status(400).json({ error: 'Tenant ID required' });
  }

  // Plan checks
  if (PREMIUM_TABLES.includes(table)) {
    const chk = requirePlan(tenant, ['premium','enterprise']);
    if (!chk.ok) return res.status(chk.status).json({ error: chk.error });
  }
  if (STANDARD_TABLES.includes(table)) {
    const chk = requirePlan(tenant, ['standard','premium','enterprise']);
    if (!chk.ok) return res.status(chk.status).json({ error: chk.error });
  }

  try {
    // ── GET ────────────────────────────────────────────────────────────────
    if (req.method === 'GET') {
      const { select='*', order, limit, single, ...filters } = req.query;
      delete filters.table;

      // Validate SELECT and ORDER to prevent SQL injection
      let safeSelectClause;
      try { safeSelectClause = safeSelect(select); }
      catch(e) { return res.status(400).json({ error: e.message }); }

      let query = `SELECT ${safeSelectClause} FROM ${table} WHERE tenant_id = $1`;
      const values = [tenantId];
      let i = 2;

      for (const [key, val] of Object.entries(filters)) {
        if (!val || key.startsWith('_')) continue;
        // Validate column name against whitelist before using in SQL
        let safeKey;
        try { safeKey = assertCol(key); }
        catch(e) { return res.status(400).json({ error: e.message }); }

        if (val === 'null') { query += ` AND ${safeKey} IS NULL`; }
        else if (String(val).startsWith('neq.')) { query += ` AND ${safeKey} != $${i++}`; values.push(val.slice(4)); }
        else if (String(val).startsWith('gt.'))  { query += ` AND ${safeKey} > $${i++}`;  values.push(val.slice(3)); }
        else if (String(val).startsWith('lt.'))  { query += ` AND ${safeKey} < $${i++}`;  values.push(val.slice(3)); }
        else if (String(val).startsWith('in.'))  { query += ` AND ${safeKey} = ANY($${i++})`; values.push(val.slice(3).replace(/[()]/g,'').split(',')); }
        else if (String(val).startsWith('like.')){ query += ` AND ${safeKey} ILIKE $${i++}`; values.push(val.slice(5)); }
        else { query += ` AND ${safeKey} = $${i++}`; values.push(val); }
      }

      if (order) {
        try { query += ` ORDER BY ${safeOrder(order)}`; }
        catch(e) { return res.status(400).json({ error: e.message }); }
      }
      if (limit) {
        const safeLimit = parseInt(limit, 10);
        if (!isNaN(safeLimit) && safeLimit > 0) query += ` LIMIT ${safeLimit}`;
        else return res.status(400).json({ error: 'limit must be a positive integer' });
      }

      const rows = await sql(query, values);
      return res.json(single ? (rows[0] || null) : rows);
    }

    // ── POST (INSERT) ──────────────────────────────────────────────────────
    if (req.method === 'POST') {
      const body = req.body;
      const records = Array.isArray(body) ? body : [body];
      // Strip any client-supplied tenant_id; enforce server value
      const enriched = records.map(r => {
        const clean = Object.fromEntries(Object.entries(r).filter(([k]) => !BLOCKED_WRITE_COLS.has(k)));
        return { ...clean, tenant_id: tenantId };
      });

      if (enriched.length === 1) {
        // Single insert — simple path
        const record = enriched[0];
        const cols = Object.keys(record);
        const vals = Object.values(record);
        const ph = vals.map((_,i) => `$${i+1}`).join(',');
        const [row] = await sql(
          `INSERT INTO ${table} (${cols.map(quoteIdent).join(',')}) VALUES (${ph}) RETURNING *`, vals
        );
        return res.status(201).json(row);
      }

      // Batch insert — single multi-row statement for efficiency
      const cols = Object.keys(enriched[0]);
      const allVals = [];
      const rowPlaceholders = enriched.map((record, ri) => {
        const vals = cols.map(c => record[c]);
        allVals.push(...vals);
        const offset = ri * cols.length;
        return `(${cols.map((_, ci) => `$${offset + ci + 1}`).join(',')})`;
      });
      const rows = await sql(
        `INSERT INTO ${table} (${cols.map(quoteIdent).join(',')}) VALUES ${rowPlaceholders.join(',')} RETURNING *`,
        allVals
      );
      return res.status(201).json(rows);
    }

    // ── PUT (UPDATE) ───────────────────────────────────────────────────────
    if (req.method === 'PUT') {
      const { data, match } = req.body;
      if (!data || !match) return res.status(400).json({ error: 'data and match required' });
      const setClauses = [], values = [];
      let i = 1;
      for (const [k,v] of Object.entries(data)) {
        if (BLOCKED_WRITE_COLS.has(k)) continue; // skip tenant_id — enforced below
        setClauses.push(`${quoteIdent(k)}=$${i++}`); values.push(v);
      }
      if (!setClauses.length) return res.status(400).json({ error: 'No updatable fields provided' });
      const whereClauses = [`tenant_id=$${i++}`]; values.push(tenantId);
      for (const [k,v] of Object.entries(match)) {
        try { assertCol(k); } catch(e) { return res.status(400).json({ error: e.message }); }
        whereClauses.push(`${quoteIdent(k)}=$${i++}`); values.push(v);
      }
      const rows = await sql(
        `UPDATE ${table} SET ${setClauses.join(',')} WHERE ${whereClauses.join(' AND ')} RETURNING *`, values
      );
      return res.json(rows);
    }

    // ── PATCH (UPSERT) ─────────────────────────────────────────────────────
    if (req.method === 'PATCH') {
      const { data, onConflict='id' } = req.body;
      // onConflict must be a whitelisted column to prevent injection
      try { assertCol(onConflict); } catch(e) { return res.status(400).json({ error: e.message }); }
      const records = Array.isArray(data) ? data : [data];
      // Strip any client-supplied tenant_id; enforce server value
      const enriched = records.map(r => {
        const clean = Object.fromEntries(Object.entries(r).filter(([k]) => !BLOCKED_WRITE_COLS.has(k)));
        return { ...clean, tenant_id: tenantId };
      });
      const results = [];
      for (const record of enriched) {
        const cols = Object.keys(record);
        const vals = Object.values(record);
        const ph = vals.map((_,i) => `$${i+1}`).join(',');
        const upd = cols
          .filter(c => c !== onConflict && c !== 'tenant_id')
          .map(c => `${quoteIdent(c)}=EXCLUDED.${quoteIdent(c)}`)
          .join(',');
        const [row] = await sql(
          `INSERT INTO ${table} (${cols.map(quoteIdent).join(',')}) VALUES (${ph}) ON CONFLICT (${quoteIdent(onConflict)}) DO UPDATE SET ${upd} RETURNING *`,
          vals
        );
        results.push(row);
      }
      return res.json(results.length === 1 ? results[0] : results);
    }

    // ── DELETE ─────────────────────────────────────────────────────────────
    if (req.method === 'DELETE') {
      const { match } = req.body;
      if (!match) return res.status(400).json({ error: 'match required' });
      const conds = [`tenant_id=$1`], vals = [tenantId]; let i = 2;
      for (const [k,v] of Object.entries(match)) {
        // Validate column name against whitelist
        let safeKey;
        try { safeKey = assertCol(k); } catch(e) { return res.status(400).json({ error: e.message }); }
        const sv = String(v);
        if      (sv.startsWith('neq.')) { conds.push(`${safeKey} != $${i++}`); vals.push(sv.slice(4)); }
        else if (sv.startsWith('gt.'))  { conds.push(`${safeKey} > $${i++}`);  vals.push(sv.slice(3)); }
        else if (sv.startsWith('lt.'))  { conds.push(`${safeKey} < $${i++}`);  vals.push(sv.slice(3)); }
        else                            { conds.push(`${safeKey} = $${i++}`);  vals.push(v); }
      }
      const rows = await sql(`DELETE FROM ${table} WHERE ${conds.join(' AND ')} RETURNING id`, vals);
      return res.json({ deleted: rows.length });
    }

    return res.status(405).json({ error: 'Method not allowed' });

  } catch(e) {
    console.error(`[api/data/${table}]`, e.message);
    return res.status(500).json({ error: e.message });
  }
}

async function handleOtp(req, res, sql) {
  if (req.method === 'POST') {
    const { action, to, code, expires_at } = req.body;
    if (action === 'verify') {
      const rows = await sql`SELECT * FROM otp_codes WHERE phone=${to} AND code=${code} AND used=false AND expires_at>now() ORDER BY created_at DESC LIMIT 1`;
      if (!rows[0]) return res.json({ ok:false, err:'Invalid or expired code.' });
      await sql`UPDATE otp_codes SET used=true WHERE id=${rows[0].id}`;
      return res.json({ ok:true });
    }
    await sql`INSERT INTO otp_codes (phone,code,expires_at,used) VALUES (${to},${code},${expires_at},false)`;
    return res.status(201).json({ ok:true });
  }
  return res.status(405).json({ error:'Method not allowed' });
}
