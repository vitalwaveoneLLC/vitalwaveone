// api/sample-secure-endpoint.js
// Example: Secure endpoint with session + CSRF validation
// Copy this pattern to all your mutation endpoints (POST, PUT, PATCH, DELETE)

import { neon } from '@neondatabase/serverless';
import { validateSession } from './middleware/auth.js';
import { csrfMiddleware } from './middleware/csrf.js';

const sql = neon(process.env.DATABASE_URL);

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', process.env.CORS_ORIGIN || '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,X-CSRF-Token,X-Session-Token');
  res.setHeader('Access-Control-Allow-Credentials', 'true');

  if (req.method === 'OPTIONS') return res.status(204).end();

  try {
    // STEP 1: Validate session (for all methods except GET)
    if (req.method !== 'GET') {
      await validateSession(req, res, () => {});
      if (!req.session) return res.status(401).json({ error: 'Unauthorized' });

      // STEP 2: Validate CSRF token (for state-changing requests)
      await csrfMiddleware(req, res, () => {});
      if (res.headersSent) return; // CSRF validation failed
    }

    // STEP 3: Handle request based on method
    if (req.method === 'POST') {
      return handleCreate(req, res);
    } else if (req.method === 'GET') {
      return handleRead(req, res);
    } else if (req.method === 'PUT') {
      return handleUpdate(req, res);
    } else if (req.method === 'DELETE') {
      return handleDelete(req, res);
    }

    res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('[endpoint-error]', error.message);
    res.status(500).json({ error: error.message });
  }
}

// POST: Create new record
async function handleCreate(req, res) {
  const { name, phone, email } = req.body;
  const tenantId = req.session.tenantId;

  if (!name || !tenantId) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    const result = await sql`
      INSERT INTO customers (tenant_id, name, phone, email, created_at)
      VALUES (${tenantId}, ${name}, ${phone}, ${email}, now())
      RETURNING id, name, phone, email, created_at
    `;

    res.status(201).json({
      ok: true,
      data: result[0],
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

// GET: Read records
async function handleRead(req, res) {
  const { customerId } = req.query;
  const tenantId = req.headers['x-tenant-id']; // From cookie or header

  if (!tenantId) {
    return res.status(401).json({ error: 'Missing tenant ID' });
  }

  try {
    let query;
    if (customerId) {
      query = await sql`
        SELECT * FROM customers
        WHERE id = ${customerId} AND tenant_id = ${tenantId}
        LIMIT 1
      `;
    } else {
      query = await sql`
        SELECT * FROM customers
        WHERE tenant_id = ${tenantId}
        ORDER BY created_at DESC
        LIMIT 50
      `;
    }

    res.json({
      ok: true,
      data: query,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

// PUT: Update record
async function handleUpdate(req, res) {
  const { customerId } = req.query;
  const { name, phone, email } = req.body;
  const tenantId = req.session.tenantId;

  if (!customerId || !tenantId) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    const result = await sql`
      UPDATE customers
      SET name = ${name}, phone = ${phone}, email = ${email}, updated_at = now()
      WHERE id = ${customerId} AND tenant_id = ${tenantId}
      RETURNING id, name, phone, email, updated_at
    `;

    if (result.length === 0) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    res.json({
      ok: true,
      data: result[0],
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

// DELETE: Delete record
async function handleDelete(req, res) {
  const { customerId } = req.query;
  const tenantId = req.session.tenantId;

  if (!customerId || !tenantId) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    await sql`
      DELETE FROM customers
      WHERE id = ${customerId} AND tenant_id = ${tenantId}
    `;

    res.json({
      ok: true,
      message: 'Customer deleted',
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}
