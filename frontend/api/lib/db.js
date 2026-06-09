/**
 * PostgreSQL Database Connection (Neon)
 * Manages database queries and connections
 */

import pg from 'pg';
const { Pool } = pg;

let pool;

/**
 * Initialize connection pool
 */
export function initializePool() {
  pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
      rejectUnauthorized: false, // Required for Neon
    },
  });

  pool.on('error', (err) => {
    console.error('Database pool error:', err);
  });

  pool.on('connect', () => {
    console.log('Connected to Neon PostgreSQL');
  });

  return pool;
}

/**
 * Get or initialize pool
 */
function getPool() {
  if (!pool) {
    initializePool();
  }
  return pool;
}

/**
 * Execute query
 */
export async function query(text, params = []) {
  try {
    const res = await getPool().query(text, params);
    return res;
  } catch (error) {
    console.error('[query]', error.message);
    throw error;
  }
}

/**
 * Get single row
 */
export async function queryOne(text, params = []) {
  const res = await query(text, params);
  return res.rows[0] || null;
}

/**
 * Get multiple rows
 */
export async function queryMany(text, params = []) {
  const res = await query(text, params);
  return res.rows;
}

/**
 * Execute transaction
 */
export async function transaction(callback) {
  const client = await getPool().connect();
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Close pool
 */
export async function closePool() {
  if (pool) {
    await pool.end();
    console.log('Database pool closed');
    pool = null;
  }
}

/**
 * Get tenant from X-Tenant-ID header
 */
export async function getTenant(req) {
  try {
    const tenantId = req.headers['x-tenant-id'] || req.headers['X-Tenant-ID'];
    if (!tenantId) return null;

    const tenant = await queryOne(
      `SELECT id AS tenant_id, plan, status, trial_ends_at,
              brand_name, brand_primary_color, brand_logo_url,
              max_trucks, max_customers
       FROM tenants WHERE id = $1 LIMIT 1`,
      [tenantId]
    );

    return tenant || null;
  } catch (error) {
    console.error('[getTenant]', error.message);
    return null;
  }
}

export { getPool };
