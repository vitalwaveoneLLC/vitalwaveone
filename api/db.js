// Vercel API - Mock Data Service
// Returns sample data for OrderPortal

const mockData = {
  products: [
    { id: '1', name: 'Cigarettes (Pack)', sku: 'CIG-001', cat: 'Tobacco', price: 5.99, shelf: 100, unit: 'pack' },
    { id: '2', name: 'Cigars (Box)', sku: 'CIG-002', cat: 'Tobacco', price: 12.99, shelf: 50, unit: 'box' },
    { id: '3', name: 'Vape Juice (60ml)', sku: 'VAPE-001', cat: 'Vape', price: 15.99, shelf: 200, unit: 'bottle' },
    { id: '4', name: 'Rolling Papers', sku: 'ACC-001', cat: 'Accessories', price: 2.99, shelf: 300, unit: 'pack' },
    { id: '5', name: 'Lighters', sku: 'ACC-002', cat: 'Accessories', price: 1.99, shelf: 250, unit: 'pcs' },
  ],
  customers: [
    { id: 'C001', name: 'ABC Store', phone: '3175096262', address: '123 Main St', city: 'Indianapolis', state: 'IN', email: 'abc@store.com', owner_name: 'John Doe', previous_balance: 150, notes: '' },
    { id: 'C002', name: 'XYZ Shop', phone: '4125551234', address: '456 Oak Ave', city: 'Pittsburgh', state: 'PA', email: 'xyz@shop.com', owner_name: 'Jane Smith', previous_balance: 0, notes: '' },
  ],
  stateTaxes: [
    { id: 'IN', rate: 7, exempt: false },
    { id: 'PA', rate: 6, exempt: false },
    { id: 'OH', rate: 5.825, exempt: false },
    { id: 'KY', rate: 6, exempt: false },
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
      // PRODUCTS
      case 'get-products':
        return res.json({ data: mockData.products });

      // CUSTOMERS
      case 'get-customers':
        return res.json({ data: mockData.customers });

      case 'get-customer': {
        const { id } = req.query;
        return res.json({ data: mockData.customers.find(c => c.id === id) || null });
      }

      case 'create-customer': {
        const cust = { id: `C${Date.now()}`, ...req.body, previous_balance: 0 };
        mockData.customers.push(cust);
        return res.json({ id: cust.id });
      }

      // SALES
      case 'get-sales': {
        const { cust_id } = req.query;
        return res.json({ data: sales.filter(s => s.cust_id === cust_id) });
      }

      case 'create-sale': {
        const { cust_id, items, subtotal, tax, total, payment_method, date, notes } = req.body;
        const sale = { id: `S${Date.now()}`, cust_id, items, subtotal, tax, total, status: 'pending', payment_method, date, notes, created_at: new Date() };
        sales.push(sale);
        return res.json({ id: sale.id });
      }

      case 'update-sale': {
        const { sale_id, status, notes } = req.body;
        const idx = sales.findIndex(s => s.id === sale_id);
        if (idx >= 0) sales[idx] = { ...sales[idx], status, notes };
        return res.json({ ok: true });
      }

      // PAYMENTS
      case 'get-payments': {
        const { sale_id } = req.query;
        return res.json({ data: payments.filter(p => p.sale_id === sale_id) });
      }

      case 'create-payment': {
        const { sale_id, status, method, amount, check_number, zelle_ref, receipt_url } = req.body;
        const pmt = { id: `PMT${Date.now()}`, sale_id, status, method, amount, check_number: check_number || '', zelle_ref: zelle_ref || '', receipt_url: receipt_url || '', collected_at: new Date() };
        payments.push(pmt);
        return res.json({ id: pmt.id });
      }

      case 'update-payment': {
        const { sale_id, status, method, amount } = req.body;
        const idx = payments.findIndex(p => p.sale_id === sale_id);
        if (idx >= 0) {
          payments[idx] = { ...payments[idx], status, method, amount };
        }
        return res.json({ ok: true });
      }

      // STATE TAXES
      case 'get-state-taxes':
        return res.json({ data: mockData.stateTaxes });

      // COMPANY
      case 'get-company':
        return res.json({ data: mockData.company });

      default:
        return res.status(400).json({ error: 'Unknown action: ' + action });
    }
  } catch (err) {
    console.error('Error:', err);
    return res.status(500).json({ error: err.message });
  }
}
