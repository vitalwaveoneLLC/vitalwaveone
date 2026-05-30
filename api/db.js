// Vercel API Route: /api/db
// Unified database operations for OrderPortal
// Replaces Supabase SDK calls

// Mock data for development
const MOCK_PRODUCTS = [
  { id: '1', name: 'Cigarettes (Pack)', sku: 'CIG-001', cat: 'Tobacco', price: 5.99, shelf: 100, unit: 'pack' },
  { id: '2', name: 'Cigars (Box)', sku: 'CIG-002', cat: 'Tobacco', price: 12.99, shelf: 50, unit: 'box' },
  { id: '3', name: 'Vape Juice (60ml)', sku: 'VAPE-001', cat: 'Vape', price: 15.99, shelf: 200, unit: 'bottle' },
  { id: '4', name: 'Rolling Papers', sku: 'ACC-001', cat: 'Accessories', price: 2.99, shelf: 300, unit: 'pack' },
  { id: '5', name: 'Lighters', sku: 'ACC-002', cat: 'Accessories', price: 1.99, shelf: 250, unit: 'pcs' },
];

const MOCK_CUSTOMERS = [
  { id: 'C001', name: 'ABC Store', address: '123 Main St', city: 'Indianapolis', state: 'IN', phone: '3175096262', email: 'abc@store.com', owner_name: 'John Doe', previous_balance: 150.00, notes: '' },
  { id: 'C002', name: 'XYZ Shop', address: '456 Oak Ave', city: 'Pittsburgh', state: 'PA', phone: '4125551234', email: 'xyz@shop.com', owner_name: 'Jane Smith', previous_balance: 0, notes: '' },
];

const MOCK_STATE_TAXES = [
  { id: 'IN', rate: 7, exempt: false, notes: '' },
  { id: 'PA', rate: 6, exempt: false, notes: '' },
  { id: 'OH', rate: 5.825, exempt: false, notes: '' },
  { id: 'KY', rate: 6, exempt: false, notes: '' },
  { id: 'MI', rate: 6, exempt: false, notes: '' },
];

const MOCK_COMPANY = {
  id: 'CO001',
  name: 'VitalWaveOne LLC',
  address: '789 Business Blvd, Indianapolis, IN',
  phone: '(317) 509-6262',
  email: 'orders@vitalwaveone.com',
  tax_rate: 7,
};

let sales = [];
let payments = [];

async function query(text, params) {
  // If DATABASE_URL is set, use real database
  if (process.env.DATABASE_URL) {
    try {
      const { Pool } = await import('@neondatabase/serverless');
      const pool = new Pool({ connectionString: process.env.DATABASE_URL });
      const client = await pool.connect();
      try {
        return await client.query(text, params);
      } finally {
        client.release();
      }
    } catch (err) {
      console.error('DB Error:', err);
      return null;
    }
  }
  return null;
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
  try {
    const result = await query('SELECT * FROM products ORDER BY cat, name');
    res.json({ data: result?.rows || MOCK_PRODUCTS });
  } catch (err) {
    res.json({ data: MOCK_PRODUCTS });
  }
}

async function updateProductShelf(req, res) {
  const { pid, newShelf } = req.body;
  await query('UPDATE products SET shelf = $1 WHERE id = $2', [newShelf, pid]);
  res.json({ ok: true });
}

// ===== CUSTOMERS =====
async function getCustomers(req, res) {
  try {
    const result = await query('SELECT * FROM customers ORDER BY name');
    res.json({ data: result?.rows || MOCK_CUSTOMERS });
  } catch (err) {
    res.json({ data: MOCK_CUSTOMERS });
  }
}

async function getCustomer(req, res) {
  try {
    const { id } = req.query;
    const result = await query('SELECT * FROM customers WHERE id = $1', [id]);
    res.json({ data: result?.rows[0] || MOCK_CUSTOMERS.find(c => c.id === id) || null });
  } catch (err) {
    const { id } = req.query;
    res.json({ data: MOCK_CUSTOMERS.find(c => c.id === id) || null });
  }
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
  try {
    const { cust_id } = req.query;
    const result = await query(
      'SELECT * FROM sales WHERE cust_id = $1 ORDER BY created_at DESC',
      [cust_id]
    );
    res.json({ data: result?.rows || sales.filter(s => s.cust_id === cust_id) });
  } catch (err) {
    const { cust_id } = req.query;
    res.json({ data: sales.filter(s => s.cust_id === cust_id) });
  }
}

async function createSale(req, res) {
  const { cust_id, items, subtotal, tax, total, payment_method, date, notes } = req.body;
  const id = `S${Date.now()}`;
  const sale = { id, cust_id, items, subtotal, tax, total, status: 'pending', payment_method, date, notes, created_at: new Date() };
  sales.push(sale);
  res.json({ id });
}

async function updateSale(req, res) {
  const { sale_id, status, notes } = req.body;
  const idx = sales.findIndex(s => s.id === sale_id);
  if (idx >= 0) {
    sales[idx] = { ...sales[idx], status, notes };
  }
  res.json({ ok: true });
}

// ===== PAYMENTS =====
async function getPayments(req, res) {
  try {
    const { sale_id } = req.query;
    const result = await query('SELECT * FROM payments WHERE sale_id = $1', [sale_id]);
    res.json({ data: result?.rows || payments.filter(p => p.sale_id === sale_id) });
  } catch (err) {
    const { sale_id } = req.query;
    res.json({ data: payments.filter(p => p.sale_id === sale_id) });
  }
}

async function createPayment(req, res) {
  const { sale_id, status, method, amount, check_number, zelle_ref, receipt_url } = req.body;
  const id = `PMT${Date.now()}`;
  const pmt = { id, sale_id, status, method, amount, check_number: check_number || '', zelle_ref: zelle_ref || '', receipt_url: receipt_url || '', collected_at: new Date() };
  payments.push(pmt);
  res.json({ id });
}

async function updatePayment(req, res) {
  const { sale_id, status, method, amount } = req.body;
  const idx = payments.findIndex(p => p.sale_id === sale_id);
  if (idx >= 0) {
    payments[idx] = { ...payments[idx], status, method, amount };
  }
  res.json({ ok: true });
}

// ===== STATE TAXES =====
async function getStateTaxes(req, res) {
  try {
    const result = await query('SELECT * FROM state_taxes ORDER BY id');
    res.json({ data: result?.rows || MOCK_STATE_TAXES });
  } catch (err) {
    res.json({ data: MOCK_STATE_TAXES });
  }
}

// ===== COMPANY =====
async function getCompany(req, res) {
  try {
    const result = await query('SELECT * FROM company LIMIT 1');
    res.json({ data: result?.rows[0] || MOCK_COMPANY });
  } catch (err) {
    res.json({ data: MOCK_COMPANY });
  }
}

// ===== TRUCKS =====
async function getTrucks(req, res) {
  try {
    const result = await query('SELECT * FROM trucks ORDER BY id');
    res.json({ data: result?.rows || [] });
  } catch (err) {
    res.json({ data: [] });
  }
}

async function getTruck(req, res) {
  try {
    const { id } = req.query;
    const result = await query('SELECT * FROM trucks WHERE id = $1', [id]);
    res.json({ data: result?.rows[0] || null });
  } catch (err) {
    res.json({ data: null });
  }
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
