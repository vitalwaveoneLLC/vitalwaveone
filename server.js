/**
 * VitalWaveOne Backend Server
 * Runs API routes for payment processing, authentication, and data management
 */

import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
const cors = require('cors');
const dotenv = require('dotenv');
const { Pool } = require('pg');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');

dotenv.config({ path: '.env.local' });

const app = express();
const PORT = process.env.PORT || 5000;

// ============================================================
// MIDDLEWARE
// ============================================================

// CORS
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  credentials: true,
}));

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// ============================================================
// DATABASE CONNECTION
// ============================================================

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
});

// Test connection
pool.query('SELECT NOW()', (err, res) => {
  if (err) {
    console.error('Database connection error:', err);
  } else {
    console.log('✓ Database connected');
  }
});

// ============================================================
// UTILITIES
// ============================================================

// Generate JWT token
const generateToken = (userId, companyId) => {
  return jwt.sign(
    { userId, companyId },
    process.env.JWT_SECRET,
    { expiresIn: '24h' }
  );
};

// Generate OTP
const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// Auth middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: 'No token provided' });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ message: 'Invalid token' });
    }
    req.user = user;
    next();
  });
};

// ============================================================
// AUTH ROUTES
// ============================================================

// Register company & admin
app.post('/api/auth/register', async (req, res) => {
  try {
    const { email, password, firstName, lastName, companyName, subscriptionTier } = req.body;

    // Validate input
    if (!email || !password || !companyName) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create company
    const companyRes = await pool.query(
      'INSERT INTO companies (name, subscription_tier) VALUES ($1, $2) RETURNING id',
      [companyName, subscriptionTier || 'standard']
    );
    const companyId = companyRes.rows[0].id;

    // Create admin user
    const userRes = await pool.query(
      'INSERT INTO users (email, password_hash, first_name, last_name, role, company_id, status) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id, email, first_name, last_name, role',
      [email, hashedPassword, firstName, lastName, 'admin', companyId, 'active']
    );

    const user = userRes.rows[0];
    const token = generateToken(user.id, companyId);

    res.status(201).json({
      message: 'Company and admin created successfully',
      user,
      token,
      companyId,
    });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ message: 'Registration failed', error: error.message });
  }
});

// Login
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password required' });
    }

    // Find user
    const userRes = await pool.query(
      'SELECT id, email, password_hash, first_name, last_name, role, company_id, mfa_enabled FROM users WHERE email = $1',
      [email]
    );

    if (userRes.rows.length === 0) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const user = userRes.rows[0];

    // Check password
    const passwordValid = await bcrypt.compare(password, user.password_hash);
    if (!passwordValid) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // If MFA enabled, send OTP
    if (user.mfa_enabled) {
      const otp = generateOTP();
      // TODO: Send OTP via email
      return res.status(200).json({
        message: 'MFA required',
        requiresMFA: true,
        userId: user.id,
        mfaMethod: user.mfa_method || 'email',
      });
    }

    // Generate token
    const token = generateToken(user.id, user.company_id);

    res.json({
      message: 'Login successful',
      user: {
        id: user.id,
        email: user.email,
        first_name: user.first_name,
        last_name: user.last_name,
        role: user.role,
      },
      token,
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Login failed', error: error.message });
  }
});

// ============================================================
// INVENTORY ROUTES
// ============================================================

// Get all inventory
app.get('/api/inventory', authenticateToken, async (req, res) => {
  try {
    const { companyId } = req.user;
    const result = await pool.query(
      'SELECT * FROM inventory WHERE company_id = $1 ORDER BY product_name',
      [companyId]
    );
    res.json({ data: result.rows });
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch inventory', error: error.message });
  }
});

// Create inventory item
app.post('/api/inventory', authenticateToken, async (req, res) => {
  try {
    const { companyId } = req.user;
    const { sku, product_name, description, category, unit_price } = req.body;

    const result = await pool.query(
      'INSERT INTO inventory (sku, product_name, description, category, unit_price, company_id) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
      [sku, product_name, description, category, unit_price, companyId]
    );

    res.status(201).json({ data: result.rows[0] });
  } catch (error) {
    res.status(500).json({ message: 'Failed to create inventory', error: error.message });
  }
});

// Update inventory item
app.put('/api/inventory/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { companyId } = req.user;
    const { shelf_quantity, truck_quantity } = req.body;

    const result = await pool.query(
      'UPDATE inventory SET shelf_quantity = $1, truck_quantity = $2 WHERE id = $3 AND company_id = $4 RETURNING *',
      [shelf_quantity, truck_quantity, id, companyId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Item not found' });
    }

    res.json({ data: result.rows[0] });
  } catch (error) {
    res.status(500).json({ message: 'Failed to update inventory', error: error.message });
  }
});

// ============================================================
// INVOICES ROUTES
// ============================================================

// Get all invoices
app.get('/api/invoices', authenticateToken, async (req, res) => {
  try {
    const { companyId } = req.user;
    const { status } = req.query;

    let query = 'SELECT i.*, c.company_name FROM invoices i LEFT JOIN customers c ON i.customer_id = c.id WHERE i.company_id = $1';
    const params = [companyId];

    if (status) {
      query += ' AND i.status = $2';
      params.push(status);
    }

    query += ' ORDER BY i.created_at DESC';

    const result = await pool.query(query, params);
    res.json({ data: result.rows });
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch invoices', error: error.message });
  }
});

// Create invoice
app.post('/api/invoices', authenticateToken, async (req, res) => {
  try {
    const { userId, companyId } = req.user;
    const { invoice_number, customer_id, total_amount, items } = req.body;

    // Insert invoice
    const invRes = await pool.query(
      'INSERT INTO invoices (invoice_number, customer_id, created_by, company_id, total_amount, status) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
      [invoice_number, customer_id, userId, companyId, total_amount, 'draft']
    );

    const invoice = invRes.rows[0];

    // Insert items
    if (items && items.length > 0) {
      for (const item of items) {
        await pool.query(
          'INSERT INTO invoice_items (invoice_id, inventory_id, quantity, unit_price, line_total) VALUES ($1, $2, $3, $4, $5)',
          [invoice.id, item.inventory_id, item.quantity, item.unit_price, item.line_total]
        );
      }
    }

    res.status(201).json({ data: invoice });
  } catch (error) {
    res.status(500).json({ message: 'Failed to create invoice', error: error.message });
  }
});

// Record payment
app.post('/api/invoices/:id/payment', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { companyId, userId } = req.user;
    const { amount, payment_method } = req.body;

    // Insert payment
    const payRes = await pool.query(
      'INSERT INTO payments (invoice_id, amount, payment_method, recorded_by, company_id) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [id, amount, payment_method, userId, companyId]
    );

    // Update invoice
    await pool.query(
      'UPDATE invoices SET paid_amount = paid_amount + $1, status = CASE WHEN paid_amount + $1 >= total_amount THEN $3 ELSE $4 END WHERE id = $2',
      [amount, id, 'paid', 'balance_due']
    );

    res.json({ data: payRes.rows[0], message: 'Payment recorded' });
  } catch (error) {
    res.status(500).json({ message: 'Failed to record payment', error: error.message });
  }
});

// ============================================================
// CUSTOMERS ROUTES
// ============================================================

// Get all customers
app.get('/api/customers', authenticateToken, async (req, res) => {
  try {
    const { companyId } = req.user;
    const result = await pool.query(
      'SELECT * FROM customers WHERE company_id = $1 ORDER BY company_name',
      [companyId]
    );
    res.json({ data: result.rows });
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch customers', error: error.message });
  }
});

// Create customer
app.post('/api/customers', authenticateToken, async (req, res) => {
  try {
    const { companyId, userId } = req.user;
    const { company_name, email, phone, license_number, registration_number, address_street, address_building, address_zip, address_state } = req.body;

    // Create user
    const userRes = await pool.query(
      'INSERT INTO users (email, password_hash, phone, role, company_id, status) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id',
      [email, await bcrypt.hash(Math.random().toString(), 10), phone, 'customer', companyId, 'pending']
    );

    const userId2 = userRes.rows[0].id;

    // Create customer
    const custRes = await pool.query(
      'INSERT INTO customers (user_id, company_id, company_name, license_number, registration_number, address_street, address_building, address_zip, address_state, created_by) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *',
      [userId2, companyId, company_name, license_number, registration_number, address_street, address_building, address_zip, address_state, userId]
    );

    res.status(201).json({ data: custRes.rows[0] });
  } catch (error) {
    res.status(500).json({ message: 'Failed to create customer', error: error.message });
  }
});

// Approve customer
app.post('/api/customers/:id/approve', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { userId, companyId } = req.user;

    const result = await pool.query(
      'UPDATE customers SET status = $1, approved_by = $2, approved_at = NOW() WHERE id = $3 AND company_id = $4 RETURNING *',
      ['active', userId, id, companyId]
    );

    res.json({ data: result.rows[0] });
  } catch (error) {
    res.status(500).json({ message: 'Failed to approve customer', error: error.message });
  }
});

// ============================================================
// TRUCKS ROUTES
// ============================================================

// Get all trucks
app.get('/api/trucks', authenticateToken, async (req, res) => {
  try {
    const { companyId } = req.user;
    const result = await pool.query(
      'SELECT t.*, u.first_name, u.last_name FROM trucks t LEFT JOIN users u ON t.driver_id = u.id WHERE t.company_id = $1',
      [companyId]
    );
    res.json({ data: result.rows });
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch trucks', error: error.message });
  }
});

// Create truck
app.post('/api/trucks', authenticateToken, async (req, res) => {
  try {
    const { companyId } = req.user;
    const { truck_number, driver_id, capacity_units } = req.body;

    const result = await pool.query(
      'INSERT INTO trucks (truck_number, driver_id, capacity_units, company_id) VALUES ($1, $2, $3, $4) RETURNING *',
      [truck_number, driver_id, capacity_units, companyId]
    );

    res.status(201).json({ data: result.rows[0] });
  } catch (error) {
    res.status(500).json({ message: 'Failed to create truck', error: error.message });
  }
});

// Update truck location
app.put('/api/trucks/:id/location', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { latitude, longitude } = req.body;
    const { companyId } = req.user;

    const result = await pool.query(
      'UPDATE trucks SET latitude = $1, longitude = $2, last_location_update = NOW() WHERE id = $3 AND company_id = $4 RETURNING *',
      [latitude, longitude, id, companyId]
    );

    res.json({ data: result.rows[0] });
  } catch (error) {
    res.status(500).json({ message: 'Failed to update location', error: error.message });
  }
});

// ============================================================
// SUPPLIERS ROUTES
// ============================================================

// Get all suppliers
app.get('/api/suppliers', authenticateToken, async (req, res) => {
  try {
    const { companyId } = req.user;
    const result = await pool.query(
      'SELECT * FROM suppliers WHERE company_id = $1 ORDER BY company_name',
      [companyId]
    );
    res.json({ data: result.rows });
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch suppliers', error: error.message });
  }
});

// Create supplier
app.post('/api/suppliers', authenticateToken, async (req, res) => {
  try {
    const { companyId } = req.user;
    const { company_name, contact_person, email, phone, tax_id, payment_terms } = req.body;

    const result = await pool.query(
      'INSERT INTO suppliers (company_name, contact_person, email, phone, tax_id, payment_terms, company_id) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *',
      [company_name, contact_person, email, phone, tax_id, payment_terms, companyId]
    );

    res.status(201).json({ data: result.rows[0] });
  } catch (error) {
    res.status(500).json({ message: 'Failed to create supplier', error: error.message });
  }
});

// ============================================================
// EXPENSES ROUTES
// ============================================================

// Get all expenses
app.get('/api/expenses', authenticateToken, async (req, res) => {
  try {
    const { companyId } = req.user;
    const result = await pool.query(
      'SELECT * FROM expenses WHERE company_id = $1 ORDER BY expense_date DESC',
      [companyId]
    );
    res.json({ data: result.rows });
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch expenses', error: error.message });
  }
});

// Create expense
app.post('/api/expenses', authenticateToken, async (req, res) => {
  try {
    const { userId, companyId } = req.user;
    const { category, description, amount, expense_date } = req.body;

    const result = await pool.query(
      'INSERT INTO expenses (category, description, amount, expense_date, submitted_by, company_id) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
      [category, description, amount, expense_date, userId, companyId]
    );

    res.status(201).json({ data: result.rows[0] });
  } catch (error) {
    res.status(500).json({ message: 'Failed to create expense', error: error.message });
  }
});

// Approve expense
app.post('/api/expenses/:id/approve', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { userId, companyId } = req.user;

    const result = await pool.query(
      'UPDATE expenses SET status = $1, approved_by = $2, approved_at = NOW() WHERE id = $3 AND company_id = $4 RETURNING *',
      ['approved', userId, id, companyId]
    );

    res.json({ data: result.rows[0] });
  } catch (error) {
    res.status(500).json({ message: 'Failed to approve expense', error: error.message });
  }
});

// ============================================================
// FINANCIAL ROUTES
// ============================================================

// Get KPIs
app.get('/api/financial/kpis', authenticateToken, async (req, res) => {
  try {
    const { companyId } = req.user;

    const result = await pool.query(
      'SELECT * FROM financial_metrics WHERE company_id = $1 AND metric_date = CURRENT_DATE',
      [companyId]
    );

    if (result.rows.length === 0) {
      return res.json({ data: { total_revenue: 0, total_expenses: 0 } });
    }

    res.json({ data: result.rows[0] });
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch KPIs', error: error.message });
  }
});

// ============================================================
// HEALTH CHECK
// ============================================================

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date() });
});

// ============================================================
// ERROR HANDLING
// ============================================================

app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({
    message: err.message || 'Internal server error',
    error: process.env.NODE_ENV === 'development' ? err : {},
  });
});

// ============================================================
// START SERVER
// ============================================================

app.listen(PORT, () => {
  console.log(`✓ VitalWave API running on port ${PORT}`);
  console.log(`✓ Domain: vitalwaveone.com`);
  console.log(`✓ Database: ${process.env.DATABASE_URL ? 'Connected' : 'Not configured'}`);
});

module.exports = app;
