// Vercel API Route: /api/db
// Unified database operations for OrderPortal
// Replaces Supabase SDK calls

const { Pool } = require('@neondatabase/serverless');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function query(text, params) {
  const client = await pool.connect();
  try {
    return await client.query(text, params);
  } finally {
    client.release();
  }
}

export default async function handler(req, res) {
  const { action } = req.query;

  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    switch (action) {
      // ===== PRODUCTS =====
      case 'get-products':
        return await getProducts(req, res);
      case 'update-product-shelf':
        return await updateProductShelf(req, res);

      // ===== CUSTOMERS =====
      case 'get-customers':
        return await getCustomers(req, res);
      case 'get-customer':
        return await getCustomer(req, res);
      case 'create-customer':
        return await createCustomer(req, res);

      // ===== SALES =====
      case 'get-sales':
        return await getSales(req, res);
      case 'create-sale':
        return await createSale(req, res);
      case 'update-sale':
        return await updateSale(req, res);

      // ===== PAYMENTS =====
      case 'get-payments':
        return await getPayments(req, res);
      case 'create-payment':
        return await createPayment(req, res);
      case 'update-payment':
        return await updatePayment(req, res);

      // ===== STATE TAXES =====
      case 'get-state-taxes':
        return await getStateTaxes(req, res);

      // ===== COMPANY =====
      case 'get-company':
        return await getCompany(req, res);

      // ===== TRUCKS =====
      case 'get-trucks':
        return await getTrucks(req, res);
      case 'get-truck':
        return await getTruck(req, res);

      // ===== LOADS =====
      case 'get-loads':
        return await getLoads(req, res);
      case 'create-load':
        return await createLoad(req, res);
      case 'update-load':
        return await updateLoad(req, res);

      // ===== EXPENSES =====
      case 'get-expenses':
        return await getExpenses(req, res);
      case 'create-expense':
        return await createExpense(req, res);

      // ===== WALK-IN =====
      case 'get-walkin-registrations':
        return await getWalkInRegistrations(req, res);
      case 'create-walkin-registration':
        return await createWalkInRegistration(req, res);
      case 'update-walkin-registration':
        return await updateWalkInRegistration(req, res);

      // ===== PROMOTIONS =====
      case 'get-promotion':
        return await getPromotion(req, res);
      case 'increment-promo-uses':
        return await incrementPromoUses(req, res);

      default:
        return res.status(400).json({ error: 'Unknown action' });
    }
  } catch (err) {
    console.error('DB Error:', err);
    return res.status(500).json({ error: err.message });
  }
}

// ===== PRODUCTS =====
async function getProducts(req, res) {
  const result = await query('SELECT * FROM products ORDER BY cat, name');
  res.json({ data: result.rows });
}

async function updateProductShelf(req, res) {
  const { pid, newShelf } = req.body;
  await query('UPDATE products SET shelf = $1 WHERE id = $2', [newShelf, pid]);
  res.json({ ok: true });
}

// ===== CUSTOMERS =====
async function getCustomers(req, res) {
  const result = await query('SELECT * FROM customers ORDER BY name');
  res.json({ data: result.rows });
}

async function getCustomer(req, res) {
  const { id } = req.query;
  const result = await query('SELECT * FROM customers WHERE id = $1', [id]);
  res.json({ data: result.rows[0] || null });
}

async function createCustomer(req, res) {
  const { name, address, city, zip, state, phone, email, owner_name } = req.body;
  const id = `C${Date.now()}`;
  await query(
    'INSERT INTO customers (id, name, address, city, zip, state, phone, email, owner_name, previous_balance) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)',
    [id, name, address, city, zip, state, phone, email, owner_name, 0]
  );
  res.json({ id });
}

// ===== SALES =====
async function getSales(req, res) {
  const { cust_id } = req.query;
  const result = await query(
    'SELECT * FROM sales WHERE cust_id = $1 ORDER BY created_at DESC',
    [cust_id]
  );
  res.json({ data: result.rows });
}

async function createSale(req, res) {
  const { cust_id, items, subtotal, tax, total, payment_method, date, notes } = req.body;
  const id = `S${Date.now()}`;
  await query(
    'INSERT INTO sales (id, cust_id, items, subtotal, tax, total, status, payment_method, date, notes) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)',
    [id, cust_id, JSON.stringify(items), subtotal, tax, total, 'pending', payment_method, date, notes]
  );
  res.json({ id });
}

async function updateSale(req, res) {
  const { sale_id, status, notes } = req.body;
  await query('UPDATE sales SET status = $1, notes = $2 WHERE id = $3', [status, notes, sale_id]);
  res.json({ ok: true });
}

// ===== PAYMENTS =====
async function getPayments(req, res) {
  const { sale_id } = req.query;
  const result = await query('SELECT * FROM payments WHERE sale_id = $1', [sale_id]);
  res.json({ data: result.rows });
}

async function createPayment(req, res) {
  const { sale_id, status, method, amount, check_number, zelle_ref, receipt_url } = req.body;
  const id = `PMT${Date.now()}`;
  await query(
    'INSERT INTO payments (id, sale_id, status, method, amount, check_number, zelle_ref, receipt_url, collected_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())',
    [id, sale_id, status, method, amount, check_number || '', zelle_ref || '', receipt_url || '']
  );
  res.json({ id });
}

async function updatePayment(req, res) {
  const { sale_id, status, method, amount } = req.body;
  await query(
    'UPDATE payments SET status = $1, method = $2, amount = $3 WHERE sale_id = $4',
    [status, method, amount, sale_id]
  );
  res.json({ ok: true });
}

// ===== STATE TAXES =====
async function getStateTaxes(req, res) {
  const result = await query('SELECT * FROM state_taxes ORDER BY id');
  res.json({ data: result.rows });
}

// ===== COMPANY =====
async function getCompany(req, res) {
  const result = await query('SELECT * FROM company LIMIT 1');
  res.json({ data: result.rows[0] || null });
}

// ===== TRUCKS =====
async function getTrucks(req, res) {
  const result = await query('SELECT * FROM trucks ORDER BY id');
  res.json({ data: result.rows });
}

async function getTruck(req, res) {
  const { id } = req.query;
  const result = await query('SELECT * FROM trucks WHERE id = $1', [id]);
  res.json({ data: result.rows[0] || null });
}

// ===== LOADS =====
async function getLoads(req, res) {
  const { truck_id, status } = req.query;
  let sql = 'SELECT * FROM loads WHERE truck_id = $1';
  const params = [truck_id];

  if (status) {
    sql += ' AND status = $2';
    params.push(status);
  }

  sql += ' ORDER BY created_at DESC';
  const result = await query(sql, params);
  res.json({ data: result.rows });
}

async function createLoad(req, res) {
  const { truck_id, items, status } = req.body;
  const id = `L${Date.now()}`;
  await query(
    'INSERT INTO loads (id, truck_id, items, status, created_at) VALUES ($1, $2, $3, $4, NOW())',
    [id, truck_id, JSON.stringify(items), status || 'pending']
  );
  res.json({ id });
}

async function updateLoad(req, res) {
  const { load_id, status, items } = req.body;
  await query(
    'UPDATE loads SET status = $1, items = $2 WHERE id = $3',
    [status, JSON.stringify(items), load_id]
  );
  res.json({ ok: true });
}

// ===== EXPENSES =====
async function getExpenses(req, res) {
  const { truck_id } = req.query;
  const result = await query(
    'SELECT * FROM expenses WHERE truck_id = $1 ORDER BY created_at DESC',
    [truck_id]
  );
  res.json({ data: result.rows });
}

async function createExpense(req, res) {
  const { truck_id, category, amount, description, receipt_url } = req.body;
  const id = `E${Date.now()}`;
  await query(
    'INSERT INTO expenses (id, truck_id, category, amount, description, receipt_url, created_at) VALUES ($1, $2, $3, $4, $5, $6, NOW())',
    [id, truck_id, category, amount, description || '', receipt_url || '']
  );
  res.json({ id });
}

// ===== WALK-IN =====
async function getWalkInRegistrations(req, res) {
  const result = await query(
    "SELECT * FROM walkin_registrations WHERE status = 'approved' ORDER BY created_at DESC"
  );
  res.json({ data: result.rows });
}

async function createWalkInRegistration(req, res) {
  const { name, email, phone, state, role, note } = req.body;
  const id = `WI${Date.now()}`;
  await query(
    'INSERT INTO walkin_registrations (id, name, email, phone, state, role, note, status, created_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())',
    [id, name, email, phone, state, role || 'customer', note || '', 'pending']
  );
  res.json({ id });
}

async function updateWalkInRegistration(req, res) {
  const { id, status } = req.body;
  await query('UPDATE walkin_registrations SET status = $1 WHERE id = $2', [status, id]);
  res.json({ ok: true });
}

// ===== PROMOTIONS =====
async function getPromotion(req, res) {
  const { code } = req.query;
  const result = await query(
    "SELECT * FROM promotions WHERE code = $1 AND active = true",
    [code.toUpperCase()]
  );
  res.json({ data: result.rows[0] || null });
}

async function incrementPromoUses(req, res) {
  const { code } = req.body;
  await query(
    'UPDATE promotions SET uses = COALESCE(uses, 0) + 1 WHERE code = $1',
    [code.toUpperCase()]
  );
  res.json({ ok: true });
}
