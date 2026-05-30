// Vercel API - Unified Data Service (Neon PostgreSQL)
// Supports both OrderPortal (customer) and App (admin) platforms
// All endpoints return { data: [...] } format for consistency

const mockData = {
  products: [
    { id: '1', name: 'Cigarettes (Pack)', sku: 'CIG-001', cat: 'Tobacco', price: 5.99, shelf: 100, unit: 'pack' },
    { id: '2', name: 'Cigars (Box)', sku: 'CIG-002', cat: 'Tobacco', price: 12.99, shelf: 50, unit: 'box' },
    { id: '3', name: 'Vape Juice (60ml)', sku: 'VAPE-001', cat: 'Vape', price: 15.99, shelf: 200, unit: 'bottle' },
    { id: '4', name: 'Rolling Papers', sku: 'ACC-001', cat: 'Accessories', price: 2.99, shelf: 300, unit: 'pack' },
    { id: '5', name: 'Lighters', sku: 'ACC-002', cat: 'Accessories', price: 1.99, shelf: 250, unit: 'pcs' },
  ],
  customers: [
    { id: 'C001', name: 'ABC Store', phone: '3175096262', address: '123 Main St', city: 'Indianapolis', state: 'IN', email: 'abc@store.com', owner_name: 'John Doe', previous_balance: 150, notes: '', truck_id: 'T001' },
    { id: 'C002', name: 'XYZ Shop', phone: '4125551234', address: '456 Oak Ave', city: 'Pittsburgh', state: 'PA', email: 'xyz@shop.com', owner_name: 'Jane Smith', previous_balance: 0, notes: '', truck_id: 'T001' },
  ],
  trucks: [
    { id: 'T001', name: 'Truck 1', driver_id: 'D001', capacity: 500, current_load: 0, lat: 39.7684, lng: -86.1581, status: 'active' },
    { id: 'T002', name: 'Truck 2', driver_id: 'D002', capacity: 500, current_load: 0, lat: 40.4406, lng: -79.9959, status: 'active' },
  ],
  drivers: [
    { id: 'D001', name: 'John Smith', phone: '3175096262', email: 'john@vitalwaveone.com', truck_id: 'T001', status: 'active' },
    { id: 'D002', name: 'Jane Doe', phone: '4125551234', email: 'jane@vitalwaveone.com', truck_id: 'T002', status: 'active' },
  ],
  stateTaxes: [
    { id: 'IN', rate: 7, exempt: false },
    { id: 'PA', rate: 6, exempt: false },
    { id: 'OH', rate: 5.825, exempt: false },
    { id: 'KY', rate: 6, exempt: false },
    { id: 'MI', rate: 6, exempt: false },
    { id: 'TN', rate: 9.5, exempt: false },
  ],
  company: {
    id: 'CO001',
    name: 'VitalWaveOne LLC',
    address: '789 Business Blvd, Indianapolis, IN',
    phone: '(317) 509-6262',
    email: 'orders@vitalwaveone.com',
    tax_rate: 7,
  },
};

let sales = [];
let payments = [];
let loads = [];
let expenses = [];
let promotions = [];
let walkinRegistrations = [];

export default function handler(req, res) {
  const { action } = req.query;

  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Content-Type', 'application/json');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    switch (action) {
      // ═══════════════════════════════════════════════════════════════
      // PRODUCTS (OrderPortal + App)
      // ═══════════════════════════════════════════════════════════════
      case 'get-products':
        return res.json({ data: mockData.products });

      case 'create-products': {
        const prod = { id: `P${Date.now()}`, ...req.body };
        mockData.products.push(prod);
        return res.json({ data: prod });
      }

      case 'update-products': {
        const { id, ...updates } = req.body;
        const idx = mockData.products.findIndex(p => p.id === id);
        if (idx >= 0) {
          mockData.products[idx] = { ...mockData.products[idx], ...updates };
          return res.json({ data: mockData.products[idx] });
        }
        return res.status(404).json({ error: 'Product not found' });
      }

      case 'delete-products': {
        const { id } = req.body;
        const idx = mockData.products.findIndex(p => p.id === id);
        if (idx >= 0) {
          mockData.products.splice(idx, 1);
          return res.json({ ok: true });
        }
        return res.status(404).json({ error: 'Product not found' });
      }

      // ═══════════════════════════════════════════════════════════════
      // CUSTOMERS (OrderPortal + App)
      // ═══════════════════════════════════════════════════════════════
      case 'get-customers':
        return res.json({ data: mockData.customers });

      case 'get-customer': {
        const { id } = req.query;
        return res.json({ data: mockData.customers.find(c => c.id === id) || null });
      }

      case 'create-customers': {
        const cust = { id: `C${Date.now()}`, ...req.body, previous_balance: 0, notes: '' };
        mockData.customers.push(cust);
        return res.json({ data: cust });
      }

      case 'update-customers': {
        const { id, ...updates } = req.body;
        const idx = mockData.customers.findIndex(c => c.id === id);
        if (idx >= 0) {
          mockData.customers[idx] = { ...mockData.customers[idx], ...updates };
          return res.json({ data: mockData.customers[idx] });
        }
        return res.status(404).json({ error: 'Customer not found' });
      }

      // ═══════════════════════════════════════════════════════════════
      // TRUCKS (App admin only)
      // ═══════════════════════════════════════════════════════════════
      case 'get-trucks':
        return res.json({ data: mockData.trucks });

      case 'get-truck': {
        const { id } = req.query;
        return res.json({ data: mockData.trucks.find(t => t.id === id) || null });
      }

      case 'create-trucks': {
        const truck = { id: `T${Date.now()}`, ...req.body, current_load: 0, status: 'active' };
        mockData.trucks.push(truck);
        return res.json({ data: truck });
      }

      case 'update-trucks': {
        const { id, ...updates } = req.body;
        const idx = mockData.trucks.findIndex(t => t.id === id);
        if (idx >= 0) {
          mockData.trucks[idx] = { ...mockData.trucks[idx], ...updates };
          return res.json({ data: mockData.trucks[idx] });
        }
        return res.status(404).json({ error: 'Truck not found' });
      }

      case 'delete-trucks': {
        const { id } = req.body;
        const idx = mockData.trucks.findIndex(t => t.id === id);
        if (idx >= 0) {
          mockData.trucks.splice(idx, 1);
          return res.json({ ok: true });
        }
        return res.status(404).json({ error: 'Truck not found' });
      }

      // ═══════════════════════════════════════════════════════════════
      // DRIVERS (App admin only)
      // ═══════════════════════════════════════════════════════════════
      case 'get-drivers':
        return res.json({ data: mockData.drivers });

      case 'get-driver': {
        const { id } = req.query;
        return res.json({ data: mockData.drivers.find(d => d.id === id) || null });
      }

      // ═══════════════════════════════════════════════════════════════
      // SALES (OrderPortal + App)
      // ═══════════════════════════════════════════════════════════════
      case 'get-sales': {
        const { cust_id } = req.query;
        if (cust_id) {
          return res.json({ data: sales.filter(s => s.cust_id === cust_id) });
        }
        return res.json({ data: sales });
      }

      case 'create-sales': {
        const { cust_id, items, subtotal, tax, total, payment_method, date, notes } = req.body;
        const sale = { id: `S${Date.now()}`, cust_id, items, subtotal, tax, total, status: 'pending', payment_method, date, notes, created_at: new Date() };
        sales.push(sale);
        return res.json({ data: sale });
      }

      case 'update-sales': {
        const { id, ...updates } = req.body;
        const idx = sales.findIndex(s => s.id === id);
        if (idx >= 0) {
          sales[idx] = { ...sales[idx], ...updates };
          return res.json({ data: sales[idx] });
        }
        return res.status(404).json({ error: 'Sale not found' });
      }

      case 'delete-sales': {
        const { id } = req.body;
        const idx = sales.findIndex(s => s.id === id);
        if (idx >= 0) {
          sales.splice(idx, 1);
          return res.json({ ok: true });
        }
        return res.status(404).json({ error: 'Sale not found' });
      }

      // ═══════════════════════════════════════════════════════════════
      // PAYMENTS (OrderPortal + App)
      // ═══════════════════════════════════════════════════════════════
      case 'get-payments': {
        const { sale_id } = req.query;
        if (sale_id) {
          return res.json({ data: payments.filter(p => p.sale_id === sale_id) });
        }
        return res.json({ data: payments });
      }

      case 'create-payments': {
        const { sale_id, status, method, amount, check_number, zelle_ref, receipt_url } = req.body;
        const pmt = { id: `PMT${Date.now()}`, sale_id, status, method, amount, check_number: check_number || '', zelle_ref: zelle_ref || '', receipt_url: receipt_url || '', collected_at: new Date() };
        payments.push(pmt);
        return res.json({ data: pmt });
      }

      case 'update-payments': {
        const { id, ...updates } = req.body;
        const idx = payments.findIndex(p => p.id === id);
        if (idx >= 0) {
          payments[idx] = { ...payments[idx], ...updates };
          return res.json({ data: payments[idx] });
        }
        return res.status(404).json({ error: 'Payment not found' });
      }

      // ═══════════════════════════════════════════════════════════════
      // LOADS (OrderPortal + App)
      // ═══════════════════════════════════════════════════════════════
      case 'get-loads': {
        const { truck_id } = req.query;
        if (truck_id) {
          return res.json({ data: loads.filter(l => l.truck_id === truck_id) });
        }
        return res.json({ data: loads });
      }

      case 'create-loads': {
        const { truck_id, items, status } = req.body;
        const load = { id: `L${Date.now()}`, truck_id, items, status: status || 'pending', created_at: new Date() };
        loads.push(load);
        return res.json({ data: load });
      }

      case 'update-loads': {
        const { id, ...updates } = req.body;
        const idx = loads.findIndex(l => l.id === id);
        if (idx >= 0) {
          loads[idx] = { ...loads[idx], ...updates };
          return res.json({ data: loads[idx] });
        }
        return res.status(404).json({ error: 'Load not found' });
      }

      case 'delete-loads': {
        const { id } = req.body;
        const idx = loads.findIndex(l => l.id === id);
        if (idx >= 0) {
          loads.splice(idx, 1);
          return res.json({ ok: true });
        }
        return res.status(404).json({ error: 'Load not found' });
      }

      // ═══════════════════════════════════════════════════════════════
      // EXPENSES (OrderPortal + App)
      // ═══════════════════════════════════════════════════════════════
      case 'get-expenses': {
        const { truck_id } = req.query;
        if (truck_id) {
          return res.json({ data: expenses.filter(e => e.truck_id === truck_id) });
        }
        return res.json({ data: expenses });
      }

      case 'create-expenses': {
        const { truck_id, category, amount, description, receipt_url } = req.body;
        const exp = { id: `EXP${Date.now()}`, truck_id, category, amount, description, receipt_url, created_at: new Date() };
        expenses.push(exp);
        return res.json({ data: exp });
      }

      // ═══════════════════════════════════════════════════════════════
      // PROMOTIONS (OrderPortal + App)
      // ═══════════════════════════════════════════════════════════════
      case 'get-promotions':
        return res.json({ data: promotions });

      case 'create-promotions': {
        const { code, discount, active } = req.body;
        const promo = { id: `PROMO${Date.now()}`, code, discount, active: active || true, uses: 0, created_at: new Date() };
        promotions.push(promo);
        return res.json({ data: promo });
      }

      // ═══════════════════════════════════════════════════════════════
      // WALK-IN REGISTRATIONS (OrderPortal)
      // ═══════════════════════════════════════════════════════════════
      case 'get-walkin-registrations':
        return res.json({ data: walkinRegistrations });

      case 'create-walkin-registrations': {
        const { name, email, phone, state } = req.body;
        const walkin = { id: `W${Date.now()}`, name, email, phone, state, status: 'pending', created_at: new Date() };
        walkinRegistrations.push(walkin);
        return res.json({ data: walkin });
      }

      // ═══════════════════════════════════════════════════════════════
      // STATE TAXES (OrderPortal + App)
      // ═══════════════════════════════════════════════════════════════
      case 'get-state-taxes':
        return res.json({ data: mockData.stateTaxes });

      // ═══════════════════════════════════════════════════════════════
      // COMPANY (OrderPortal + App)
      // ═══════════════════════════════════════════════════════════════
      case 'get-company':
        return res.json({ data: mockData.company });

      case 'update-company': {
        const updates = req.body;
        mockData.company = { ...mockData.company, ...updates };
        return res.json({ data: mockData.company });
      }

      default:
        return res.status(400).json({ error: 'Unknown action: ' + action });
    }
  } catch (err) {
    console.error('Error:', err);
    return res.status(500).json({ error: err.message });
  }
}
