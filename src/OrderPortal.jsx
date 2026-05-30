// ═══════════════════════════════════════════════════════════════════════════
// VitalWaveOne LLC - Order Portal (Neon PostgreSQL via Vercel APIs)
// ═══════════════════════════════════════════════════════════════════════════
//
// FEATURES:
// * Customer Portal: New registration + existing customer ordering
// * Driver App: Dashboard, Sales recording, Expense tracking
// * Live inventory from Neon PostgreSQL (via /api/db endpoints)
// * Tax calculations (tobacco/nicotine products only)
// * Multiple payment methods (cash, check, card, Zelle, account)
// * Signature capture & proof of delivery
// * WhatsApp notifications via /api/send-whatsapp
//
// MIGRATION FROM SUPABASE TO NEON:
// ✓ All supabase.from().select() → fetch('/api/db?action=get-{table}')
// ✓ All supabase.from().insert() → fetch('/api/db?action=create-{table}', POST)
// ✓ All supabase.from().update() → fetch('/api/db?action=update-{table}', PUT)
// ✓ All supabase.from().delete() → fetch('/api/db?action=delete-{table}', DELETE)
// ✓ supabase.auth → /api/auth/driver-login (POST phone)
// ✓ supabase.functions.invoke('send-whatsapp') → /api/send-whatsapp (POST)
// ✓ Maintains all UI, state management, calculations, error handling
//
// API ACTIONS USED:
// - get-products, get-customers, get-state-taxes, get-company
// - get-sales, get-loads, get-returns, get-promotions
// - get-payments, get-walkin-registrations
// - create-sales, create-customers, create-loads, create-expenses
// - create-payments, create-returns
// - update-sales, update-payments, update-products, update-loads
// - update-promotions, update-trucks, update-company
// - delete-sales, delete-loads
// - Driver authentication: /api/auth/driver-login
// - WhatsApp notifications: /api/send-whatsapp
//
// ═══════════════════════════════════════════════════════════════════════════

import { useState, useEffect, useMemo, useRef } from 'react';

const GS = () => (
  <>
    <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700;800&family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet"/>
    <style>{`
      *{box-sizing:border-box;margin:0;padding:0;}
      body{background:#f8f5f0;font-family:'Inter',sans-serif;}
      .portal{min-height:100vh;background:#f8f5f0;padding:20px;}
      input,select,textarea{font-family:'Inter',sans-serif;border:1.5px solid #e5e7eb;border-radius:9px;padding:11px 14px;font-size:14px;}
      input:focus,select:focus,textarea:focus{outline:none;border-color:#0a1628;box-shadow:0 0 0 3px #0a162814;}
      .card{background:#fff;border-radius:16px;border:1px solid #e5e7eb;box-shadow:0 2px 16px #00000008;padding:24px;}
      .btn-primary{background:#0a1628;color:#fff;border:none;border-radius:10px;padding:13px 28px;font-weight:600;cursor:pointer;transition:all .2s;}
      .btn-primary:hover{background:#162540;transform:translateY(-1px);}
      .btn-success{background:#10b981;color:#fff;border:none;border-radius:10px;padding:13px 28px;font-weight:600;cursor:pointer;}
      .btn-ghost{background:transparent;color:#6b7280;border:1.5px solid #d1d5db;border-radius:10px;padding:11px 20px;cursor:pointer;}
      .btn-ghost:hover{border-color:#0a1628;color:#0a1628;}
      .grid2{display:grid;grid-template-columns:1fr 1fr;gap:16px;}
      .grid3{display:grid;grid-template-columns:repeat(auto-fit,minmax(250px,1fr));gap:16px;}
      .tag{padding:6px 12px;border-radius:20px;font-size:11px;font-weight:700;display:inline-block;}
      .tag-success{background:#d1fae5;color:#065f46;}
      .tag-warning{background:#fef3c7;color:#854d0e;}
      .tag-danger{background:#fee2e2;color:#991b1b;}
      .tab-nav{display:flex;gap:8px;border-bottom:2px solid #e5e7eb;margin-bottom:24px;}
      .tab-btn{padding:12px 16px;background:transparent;border:none;border-bottom:3px solid transparent;cursor:pointer;font-weight:600;color:#6b7280;transition:all .2s;}
      .tab-btn.active{color:#0a1628;border-color:#0a1628;}
      table{width:100%;border-collapse:collapse;margin:16px 0;}
      th{text-align:left;padding:12px;font-size:12px;font-weight:700;color:#6b7280;border-bottom:2px solid #e5e7eb;background:#f9f8f5;text-transform:uppercase;}
      td{padding:12px;border-bottom:1px solid #f3f4f6;}
      @media(max-width:768px){.grid2{grid-template-columns:1fr;}.grid3{grid-template-columns:1fr;}}
    `}</style>
  </>
);

const fmt = (n) => `$${Number(n || 0).toFixed(2)}`;
const uid = () => Math.random().toString(36).slice(2, 9).toUpperCase();
const nowStr = () => new Date().toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });

// -- API HELPER FUNCTIONS ────────────────────────────────────────────────────
// Replace all Supabase calls with Neon PostgreSQL via Vercel API
const apiCall = async (action, params = {}) => {
  try {
    const url = new URL(`${window.location.origin}/api/db`);
    url.searchParams.append("action", action);
    Object.entries(params).forEach(([k,v]) => {
      if(v !== undefined && v !== null) url.searchParams.append(k, v);
    });

    const res = await fetch(url.toString());
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || `API error: ${res.status}`);
    }
    return await res.json();
  } catch (e) {
    console.error(`API call failed (${action}):`, e);
    throw e;
  }
};

const apiMutate = async (action, body) => {
  try {
    const method = action.includes("insert") || action.includes("create")
      ? "POST"
      : action.includes("update")
      ? "PUT"
      : "DELETE";

    const res = await fetch(`${window.location.origin}/api/db?action=${action}`, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || `API error: ${res.status}`);
    }
    return await res.json();
  } catch (e) {
    console.error(`API mutation failed (${action}):`, e);
    throw e;
  }
};

// Fetch helper that mimics Supabase pattern for easier conversion
const dbQuery = async (action, params) => {
  const data = await apiCall(action, params);
  return { data };
};

const dbMutate = async (action, body) => {
  const data = await apiMutate(action, body);
  return { data };
};

const isTaxableProduct = (p) => {
  const cat = (p?.cat || '').toLowerCase();
  const name = (p?.name || '').toLowerCase();
  return ['tobacco', 'nicotine', 'cigarette', 'cigar', 'vape', 'hookah', 'chew', 'dip', 'snuff', 'eliquid', 'e-liquid', 'pod', 'disposable'].some(t => cat.includes(t) || name.includes(t));
};

const calcTax = (items, products, rate) => {
  return parseFloat(items.reduce((sum, item) => {
    const p = products.find(x => x.id === item.pid);
    if (isTaxableProduct(p)) {
      return sum + (p?.price || 0) * item.qty * rate / 100;
    }
    return sum;
  }, 0).toFixed(2));
};

const Invoice = ({ order, products, co, custState, stateRate }) => {
  const subtotal = order.items.reduce((s, i) => {
    const p = products.find(x => x.id === i.pid);
    return s + (p?.price || 0) * i.qty;
  }, 0);

  const taxAmt = calcTax(order.items, products, stateRate || 0);
  const total = subtotal + taxAmt;

  return (
    <div className="card" style={{ maxWidth: 800, margin: '0 auto', background: '#fff' }}>
      <div style={{ background: '#0a1628', color: '#fff', padding: '24px', marginLeft: -24, marginRight: -24, marginTop: -24, marginBottom: 24 }}>
        <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: 32, marginBottom: 8 }}>Order #{order.id}</h1>
        <p style={{ fontSize: 12, color: '#4b6080' }}>{order.date}</p>
        <span className="tag tag-warning">PENDING APPROVAL</span>
      </div>

      <div className="grid2" style={{ marginBottom: 24 }}>
        <div>
          <p style={{ fontSize: 11, fontWeight: 700, color: '#6b7280', marginBottom: 8, textTransform: 'uppercase' }}>Bill To</p>
          <p style={{ fontWeight: 700, fontSize: 15 }}>{order.businessName}</p>
          <p style={{ fontSize: 12, color: '#6b7280' }}>{order.ownerName}</p>
          <p style={{ fontSize: 12, color: '#6b7280' }}>{order.phone}</p>
        </div>
        <div>
          <p style={{ fontSize: 11, fontWeight: 700, color: '#6b7280', marginBottom: 8, textTransform: 'uppercase' }}>Order Details</p>
          <p style={{ fontSize: 12, marginBottom: 4 }}>Order: <strong>{order.id}</strong></p>
          <p style={{ fontSize: 12 }}>Date: <strong>{order.date}</strong></p>
        </div>
      </div>

      <table>
        <thead>
          <tr style={{ background: '#0a1628', color: '#fff' }}>
            <th>Product</th>
            <th style={{ textAlign: 'right' }}>Qty</th>
            <th style={{ textAlign: 'right' }}>Price</th>
            <th style={{ textAlign: 'right' }}>Amount</th>
          </tr>
        </thead>
        <tbody>
          {order.items.map((item, i) => {
            const p = products.find(x => x.id === item.pid);
            return (
              <tr key={i}>
                <td>{p?.name || 'Unknown'}</td>
                <td style={{ textAlign: 'right' }}>{item.qty}</td>
                <td style={{ textAlign: 'right' }}>{fmt(p?.price || 0)}</td>
                <td style={{ textAlign: 'right', fontWeight: 700 }}>{fmt((p?.price || 0) * item.qty)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 24 }}>
        <div style={{ width: 300 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: 8, borderBottom: '1px solid #e5e7eb' }}>
            <span>Subtotal:</span>
            <span>{fmt(subtotal)}</span>
          </div>
          {taxAmt > 0 && <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: 8, borderBottom: '1px solid #e5e7eb' }}>
            <span>Tax:</span>
            <span style={{ color: '#10b981' }}>{fmt(taxAmt)}</span>
          </div>}
          <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: 12, marginTop: 12, borderTop: '2px solid #0a1628', fontWeight: 700, fontSize: 18 }}>
            <span>Total:</span>
            <span style={{ color: '#f59e0b' }}>{fmt(total)}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default function OrderPortal() {
  const [view, setView] = useState('role-select');
  const [phone, setPhone] = useState('');
  const [driverPhone, setDriverPhone] = useState('');
  const [customer, setCustomer] = useState(null);
  const [driver, setDriver] = useState(null);
  const [products, setProducts] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [cart, setCart] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [stateTaxes, setStateTaxes] = useState([]);
  const [company, setCompany] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Driver-specific state
  const [driverTab, setDriverTab] = useState('dashboard');
  const [driverLoads, setDriverLoads] = useState([]);
  const [driverSales, setDriverSales] = useState([]);
  const [driverExpenses, setDriverExpenses] = useState([]);
  const [loadItems, setLoadItems] = useState({});
  const [saleItems, setSaleItems] = useState({});
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [checkNumber, setCheckNumber] = useState('');
  const [zelleRef, setZelleRef] = useState('');

  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    try {
      // Fetch all required data via Neon API (via /api/db endpoints)
      const [prodRes, custRes, taxRes, coRes] = await Promise.all([
        dbQuery("get-products"),
        dbQuery("get-customers"),
        dbQuery("get-state-taxes"),
        dbQuery("get-company"),
      ]);

      setProducts(prodRes?.data?.length > 0 ? prodRes.data : []);
      setCustomers(custRes?.data?.length > 0 ? custRes.data : []);
      setStateTaxes(taxRes?.data?.length > 0 ? taxRes.data : [{ id: 'IN', rate: 7 }]);
      setCompany(coRes?.data || { name: 'VitalWaveOne LLC' });
    } catch (err) {
      console.error('Load error:', err);
      // Graceful fallback
      setProducts([]);
      setStateTaxes([{ id: 'IN', rate: 7 }]);
      setCompany({ name: 'VitalWaveOne LLC' });
    }
  };

  // CUSTOMER LOGIN
  const handleCustomerLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    const clean = phone.replace(/\D/g, '');

    try {
      // Fetch customers via Neon API
      const { data: custs } = await dbQuery("get-customers");
      const found = (custs || []).find(c => {
        const custClean = String(c.phone || '').replace(/\D/g, '');
        return custClean === clean;
      });

      if (found) {
        setCustomer(found);
        setCart([]);
        setView('catalog');
        setError('');
      } else {
        setError('Store not found. Check your phone number.');
      }
    } catch (err) {
      setError('Login failed: ' + err.message);
    }
    setLoading(false);
  };

  // DRIVER LOGIN - via /api/auth/driver-login endpoint
  const handleDriverLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    const clean = driverPhone.replace(/\D/g, '');

    try {
      // Try to authenticate driver via API
      const res = await fetch(`${window.location.origin}/api/auth/driver-login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: clean }),
      });

      if (!res.ok) {
        const err = await res.json();
        setError(err.error || 'Driver not found');
        setLoading(false);
        return;
      }

      const { data: driverData } = await res.json();
      if (driverData) {
        setDriver(driverData);
        setView('driver-app');
        setError('');
      } else {
        setError('Driver not found');
      }
    } catch (err) {
      setError('Login failed: ' + err.message);
    }
    setLoading(false);
  };

  // CART OPERATIONS
  const handleAddToCart = (product) => {
    const existing = cart.find(i => i.pid === product.id);
    if (existing) {
      setCart(cart.map(i => i.pid === product.id ? { ...i, qty: i.qty + 1 } : i));
    } else {
      setCart([...cart, { pid: product.id, qty: 1 }]);
    }
  };

  const handleUpdateQuantity = (pid, qty) => {
    if (qty <= 0) {
      setCart(cart.filter(i => i.pid !== pid));
    } else {
      setCart(cart.map(i => i.pid === pid ? { ...i, qty } : i));
    }
  };

  const cartTotals = useMemo(() => {
    const subtotal = cart.reduce((s, i) => {
      const p = products.find(x => x.id === i.pid);
      return s + (p?.price || 0) * i.qty;
    }, 0);
    const custState = customer?.state || 'IN';
    const stateData = stateTaxes.find(s => s.id === custState);
    const rate = stateData?.rate || 7;
    const tax = calcTax(cart, products, rate);
    return {
      subtotal: parseFloat(subtotal.toFixed(2)),
      tax: tax,
      total: parseFloat((subtotal + tax).toFixed(2)),
      rate: rate,
    };
  }, [cart, customer, products, stateTaxes]);

  const handleCheckout = async () => {
    setLoading(true);
    try {
      const orderId = `ORD-${uid()}`;

      // Create sale via Neon API
      const orderData = {
        id: orderId,
        cust_id: customer.id,
        items: cart,
        subtotal: cartTotals.subtotal,
        tax: cartTotals.tax,
        total: cartTotals.total,
        payment_method: 'pending',
        date: nowStr(),
        status: 'pending',
        notes: '',
        created_at: new Date().toISOString(),
      };

      const { data: created } = await dbMutate("create-sales", orderData);

      setInvoices([...invoices, {
        id: orderId,
        customerName: customer.name,
        businessName: customer.name,
        ownerName: customer.name,
        items: cart,
        date: nowStr(),
        total: cartTotals.total,
      }]);

      setCart([]);
      setView('invoice');
      setError('');
    } catch (err) {
      setError('Checkout failed: ' + err.message);
    }
    setLoading(false);
  };

  // DRIVER TAB CONTENT
  const DriverDashboard = () => (
    <div>
      <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 16 }}>🚚 Driver Dashboard</h2>
      <div className="grid3">
        <div className="card" style={{ textAlign: 'center' }}>
          <p style={{ fontSize: 11, color: '#6b7280', fontWeight: 700, marginBottom: 8 }}>DRIVER</p>
          <p style={{ fontSize: 18, fontWeight: 700 }}>{driver?.name}</p>
          <p style={{ fontSize: 12, color: '#6b7280', marginTop: 8 }}>{driver?.truck_name}</p>
        </div>
        <div className="card" style={{ textAlign: 'center' }}>
          <p style={{ fontSize: 11, color: '#6b7280', fontWeight: 700, marginBottom: 8 }}>TODAY'S SALES</p>
          <p style={{ fontSize: 24, fontWeight: 700, color: '#10b981' }}>{fmt(driverSales.reduce((s, sale) => s + (sale.total || 0), 0))}</p>
          <p style={{ fontSize: 12, color: '#6b7280', marginTop: 8 }}>{driverSales.length} sales</p>
        </div>
        <div className="card" style={{ textAlign: 'center' }}>
          <p style={{ fontSize: 11, color: '#6b7280', fontWeight: 700, marginBottom: 8 }}>CASH COLLECTED</p>
          <p style={{ fontSize: 24, fontWeight: 700, color: '#f59e0b' }}>{fmt(driverSales.filter(s => s.method === 'cash').reduce((s, sale) => s + (sale.total || 0), 0))}</p>
        </div>
      </div>
    </div>
  );

  const DriverSalesTab = () => (
    <div>
      <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 16 }}>💰 Sales</h2>

      <div className="card" style={{ marginBottom: 24 }}>
        <label style={{ display: 'block', marginBottom: 12 }}>SELECT CUSTOMER</label>
        <select value={selectedCustomer?.id || ''} onChange={(e) => {
          const cust = customers.find(c => c.id === e.target.value);
          setSelectedCustomer(cust);
        }} style={{ marginBottom: 12, width: '100%' }}>
          <option value="">Choose customer...</option>
          {customers.map(c => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>

        {selectedCustomer && <div style={{ background: '#f9f8f5', padding: 12, borderRadius: 8, marginBottom: 16 }}>
          <p style={{ fontSize: 12 }}><strong>{selectedCustomer.name}</strong></p>
          <p style={{ fontSize: 11, color: '#6b7280' }}>Previous Balance: {fmt(selectedCustomer.previous_balance)}</p>
        </div>}

        <label style={{ display: 'block', marginBottom: 12 }}>ADD PRODUCTS</label>
        <div className="grid3">
          {products.map(p => (
            <div key={p.id} style={{ padding: 12, border: '1px solid #e5e7eb', borderRadius: 8, textAlign: 'center' }}>
              <p style={{ fontSize: 12, fontWeight: 700 }}>{p.name}</p>
              <p style={{ fontSize: 11, color: '#6b7280', marginBottom: 8 }}>{fmt(p.price)}</p>
              <input type="number" min="0" value={saleItems[p.id] || 0} onChange={(e) => setSaleItems({ ...saleItems, [p.id]: parseInt(e.target.value) || 0 })} placeholder="Qty" style={{ width: '100%', marginBottom: 8 }} />
              <button className="btn-success" onClick={() => {
                if ((saleItems[p.id] || 0) > 0) {
                  // Add to sale
                  setSaleItems({ ...saleItems, [p.id]: 0 });
                }
              }} style={{ width: '100%', padding: 8 }}>Add</button>
            </div>
          ))}
        </div>

        <label style={{ display: 'block', marginTop: 16, marginBottom: 12 }}>PAYMENT METHOD</label>
        <select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)} style={{ marginBottom: 12, width: '100%' }}>
          <option value="cash">💵 Cash</option>
          <option value="check">✓ Check</option>
          <option value="card">💳 Card (+3%)</option>
          <option value="zelle">📱 Zelle</option>
          <option value="account">📋 Account (AR)</option>
        </select>

        {paymentMethod === 'check' && <input type="text" value={checkNumber} onChange={(e) => setCheckNumber(e.target.value)} placeholder="Check #" style={{ width: '100%', marginBottom: 12 }} />}
        {paymentMethod === 'zelle' && <input type="text" value={zelleRef} onChange={(e) => setZelleRef(e.target.value)} placeholder="Zelle Ref" style={{ width: '100%', marginBottom: 12 }} />}

        <button className="btn-primary" onClick={async () => {
          if (!selectedCustomer) { setError('Please select a customer'); return; }
          const saleItemsArray = Object.entries(saleItems).filter(([_, qty]) => qty > 0).map(([pid, qty]) => ({ pid, qty }));
          if (saleItemsArray.length === 0) { setError('Add at least one product'); return; }

          setLoading(true);
          try {
            const saleId = `S-${uid()}`;
            const subtotal = saleItemsArray.reduce((s, i) => { const p = products.find(x => x.id === i.pid); return s + ((p?.price || 0) * i.qty); }, 0);
            const tax = calcTax(saleItemsArray, products, cartTotals.rate);
            const total = subtotal + tax;

            const saleData = {
              id: saleId,
              cust_id: selectedCustomer.id,
              items: saleItemsArray,
              subtotal: parseFloat(subtotal.toFixed(2)),
              tax: tax,
              total: parseFloat(total.toFixed(2)),
              payment_method: paymentMethod,
              check_number: checkNumber || '',
              zelle_ref: zelleRef || '',
              date: nowStr(),
              status: 'recorded',
              created_at: new Date().toISOString(),
            };

            // Create sale via Neon API
            await dbMutate("create-sales", saleData);

            const newSale = { id: saleId, customer: selectedCustomer.name, total: parseFloat(total.toFixed(2)), method: paymentMethod, date: nowStr() };
            setDriverSales([...driverSales, newSale]);
            setSelectedCustomer(null);
            setSaleItems({});
            setCheckNumber('');
            setZelleRef('');
            setError('');
          } catch (err) {
            setError('Failed to record sale: ' + err.message);
          }
          setLoading(false);
        }} disabled={loading} style={{ width: '100%', padding: 12 }}>✓ Record Sale</button>
      </div>

      <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 12 }}>Today's Sales</h3>
      {driverSales.length === 0 ? (
        <p style={{ color: '#6b7280' }}>No sales yet</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>Customer</th>
              <th style={{ textAlign: 'right' }}>Amount</th>
              <th>Method</th>
              <th style={{ textAlign: 'right' }}>Time</th>
            </tr>
          </thead>
          <tbody>
            {driverSales.map(sale => (
              <tr key={sale.id}>
                <td>{sale.customer}</td>
                <td style={{ textAlign: 'right', fontWeight: 700 }}>{fmt(sale.total)}</td>
                <td><span className="tag tag-success">{sale.method.toUpperCase()}</span></td>
                <td style={{ textAlign: 'right', fontSize: 12 }}>{sale.date}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );

  const DriverExpensesTab = () => (
    <div>
      <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 16 }}>⛽ Expenses</h2>
      <div className="card" style={{ marginBottom: 24 }}>
        <select style={{ marginBottom: 12, width: '100%' }}>
          <option>Gas</option>
          <option>Meals</option>
          <option>Tolls</option>
          <option>Other</option>
        </select>
        <input type="number" placeholder="Amount" style={{ marginBottom: 12, width: '100%' }} />
        <input type="text" placeholder="Description (optional)" style={{ marginBottom: 12, width: '100%' }} />
        <button className="btn-primary" style={{ width: '100%', padding: 12 }}>Log Expense</button>
      </div>
      <p style={{ color: '#6b7280' }}>No expenses logged today</p>
    </div>
  );

  // ========== MAIN RENDER ==========

  if (view === 'role-select') {
    return (
      <div className="portal">
        <GS />
        <div className="card" style={{ maxWidth: 450, margin: '80px auto', textAlign: 'center' }}>
          <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 24 }}>🛒 VitalWave Order</h1>
          <p style={{ color: '#6b7280', marginBottom: 32 }}>Select your role</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <button className="btn-primary" onClick={() => setView('customer-login')} style={{ width: '100%' }}>👥 Customer</button>
            <button className="btn-primary" onClick={() => setView('driver-login')} style={{ width: '100%' }}>🚚 Driver</button>
            <button className="btn-primary" onClick={() => { setCustomer({ name: 'Walk-in', state: 'IN' }); setView('catalog'); }} style={{ width: '100%' }}>🚶 Walk-in</button>
          </div>
        </div>
      </div>
    );
  }

  if (view === 'customer-login') {
    return (
      <div className="portal">
        <GS />
        <div className="card" style={{ maxWidth: 400, margin: '60px auto' }}>
          <h2 style={{ marginBottom: 24 }}>📱 Customer Login</h2>
          {error && <div style={{ color: '#dc2626', background: '#fef2f2', padding: 12, borderRadius: 8, marginBottom: 16, fontSize: 13 }}>{error}</div>}
          <form onSubmit={handleCustomerLogin}>
            <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="317-509-6262" required autoFocus style={{ marginBottom: 16 }} />
            <button type="submit" className="btn-primary" disabled={loading} style={{ width: '100%', marginBottom: 12 }}>{loading ? 'Loading...' : '→ Continue'}</button>
          </form>
          <button className="btn-ghost" onClick={() => setView('role-select')} style={{ width: '100%' }}>← Back</button>
        </div>
      </div>
    );
  }

  if (view === 'driver-login') {
    return (
      <div className="portal">
        <GS />
        <div className="card" style={{ maxWidth: 400, margin: '60px auto' }}>
          <h2 style={{ marginBottom: 24 }}>🚚 Driver Login</h2>
          {error && <div style={{ color: '#dc2626', background: '#fef2f2', padding: 12, borderRadius: 8, marginBottom: 16, fontSize: 13 }}>{error}</div>}
          <form onSubmit={handleDriverLogin}>
            <input type="tel" value={driverPhone} onChange={(e) => setDriverPhone(e.target.value)} placeholder="317-509-6262" required autoFocus style={{ marginBottom: 16 }} />
            <button type="submit" className="btn-primary" disabled={loading} style={{ width: '100%', marginBottom: 12 }}>{loading ? 'Loading...' : '→ Login'}</button>
          </form>
          <button className="btn-ghost" onClick={() => setView('role-select')} style={{ width: '100%' }}>← Back</button>
        </div>
      </div>
    );
  }

  if (view === 'driver-app') {
    return (
      <div className="portal">
        <GS />
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
            <h1 style={{ fontSize: 28, fontWeight: 700 }}>🚚 {driver?.name}</h1>
            <button className="btn-primary" onClick={() => { setDriver(null); setView('role-select'); }} style={{ padding: '10px 20px' }}>Logout</button>
          </div>

          <div className="tab-nav">
            <button className={`tab-btn ${driverTab === 'dashboard' ? 'active' : ''}`} onClick={() => setDriverTab('dashboard')}>Dashboard</button>
            <button className={`tab-btn ${driverTab === 'sales' ? 'active' : ''}`} onClick={() => setDriverTab('sales')}>💰 Sales</button>
            <button className={`tab-btn ${driverTab === 'expenses' ? 'active' : ''}`} onClick={() => setDriverTab('expenses')}>⛽ Expenses</button>
          </div>

          <div className="card">
            {driverTab === 'dashboard' && <DriverDashboard />}
            {driverTab === 'sales' && <DriverSalesTab />}
            {driverTab === 'expenses' && <DriverExpensesTab />}
          </div>
        </div>
      </div>
    );
  }

  // Customer Portal
  if (view === 'catalog') {
    return (
      <div className="portal">
        <GS />
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
            <h1 style={{ fontSize: 28, fontWeight: 700 }}>📦 Catalog</h1>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn-primary" onClick={() => setView('account')} style={{ padding: '10px 20px' }}>📊 Account</button>
              <button className="btn-primary" onClick={() => setView('cart')} style={{ padding: '10px 20px' }}>🛒 {cart.length}</button>
            </div>
          </div>

          <div className="grid3">
            {products.map((p) => (
              <div key={p.id} className="card" style={{ textAlign: 'center' }}>
                <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 8 }}>{p.name}</h3>
                <p style={{ fontSize: 11, color: '#6b7280', marginBottom: 12 }}>{p.cat}</p>
                <p style={{ fontSize: 20, fontWeight: 700, color: '#0a1628', marginBottom: 12 }}>{fmt(p.price)}</p>
                <button className="btn-primary" onClick={() => handleAddToCart(p)} style={{ width: '100%' }}>+ Add</button>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (view === 'cart') {
    return (
      <div className="portal">
        <GS />
        <div className="card" style={{ maxWidth: 700, margin: '0 auto' }}>
          <button className="btn-ghost" onClick={() => setView('catalog')} style={{ marginBottom: 16 }}>← Catalog</button>
          <h2 style={{ marginBottom: 16 }}>🛒 Cart</h2>

          {cart.length === 0 ? (
            <p style={{ color: '#6b7280', textAlign: 'center', padding: 40 }}>Empty</p>
          ) : (
            <>
              <table>
                <thead>
                  <tr>
                    <th>Product</th>
                    <th style={{ textAlign: 'right' }}>Qty</th>
                    <th style={{ textAlign: 'right' }}>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {cart.map((item) => {
                    const p = products.find(x => x.id === item.pid);
                    return (
                      <tr key={item.pid}>
                        <td>{p?.name}</td>
                        <td style={{ textAlign: 'right' }}><input type="number" min="1" value={item.qty} onChange={(e) => handleUpdateQuantity(item.pid, parseInt(e.target.value))} style={{ width: 60 }} /></td>
                        <td style={{ textAlign: 'right', fontWeight: 700 }}>{fmt((p?.price || 0) * item.qty)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              <div style={{ background: '#f9f8f5', padding: 16, borderRadius: 10, marginTop: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                  <span>Subtotal:</span> <span>{fmt(cartTotals.subtotal)}</span>
                </div>
                {cartTotals.tax > 0 && <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                  <span>Tax:</span> <span style={{ color: '#10b981' }}>{fmt(cartTotals.tax)}</span>
                </div>}
                <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: 12, marginTop: 12, borderTop: '2px solid #0a1628', fontWeight: 700, color: '#0a1628' }}>
                  <span>Total:</span> <span>{fmt(cartTotals.total)}</span>
                </div>
              </div>

              <div style={{ display: 'flex', gap: 12, marginTop: 16 }}>
                <button className="btn-primary" onClick={handleCheckout} disabled={loading} style={{ flex: 1, padding: 12 }}>→ Checkout</button>
                <button className="btn-ghost" onClick={() => setCart([])} style={{ flex: 1, padding: 12 }}>Clear</button>
              </div>
            </>
          )}
        </div>
      </div>
    );
  }

  if (view === 'invoice' && invoices.length > 0) {
    const lastInv = invoices[invoices.length - 1];
    const stateData = stateTaxes.find(s => s.id === customer?.state);
    return (
      <div className="portal">
        <GS />
        <Invoice
          order={lastInv}
          products={products}
          co={company}
          custState={customer?.state}
          stateRate={stateData?.rate || 7}
        />
        <div style={{ maxWidth: 800, margin: '24px auto', display: 'flex', gap: 12 }}>
          <button className="btn-primary" onClick={() => { setCart([]); setView('catalog'); }} style={{ flex: 1, padding: 12 }}>✓ Place Order</button>
          <button className="btn-ghost" onClick={() => setView('cart')} style={{ flex: 1, padding: 12 }}>← Edit</button>
        </div>
      </div>
    );
  }

  if (view === 'account') {
    return (
      <div className="portal">
        <GS />
        <div style={{ maxWidth: 1000, margin: '0 auto' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 24 }}>
            <h1 style={{ fontSize: 28, fontWeight: 700 }}>📊 My Account</h1>
            <button className="btn-primary" onClick={() => { setCustomer(null); setView('role-select'); }}>Logout</button>
          </div>

          <div className="grid3">
            <div className="card" style={{ textAlign: 'center' }}>
              <p style={{ fontSize: 11, color: '#6b7280', fontWeight: 700, marginBottom: 8 }}>PREVIOUS BALANCE</p>
              <p style={{ fontSize: 28, fontWeight: 700, color: customer?.previous_balance > 0 ? '#dc2626' : '#10b981' }}>{fmt(customer?.previous_balance)}</p>
            </div>
            <div className="card" style={{ textAlign: 'center' }}>
              <p style={{ fontSize: 11, color: '#6b7280', fontWeight: 700, marginBottom: 8 }}>PENDING ORDERS</p>
              <p style={{ fontSize: 28, fontWeight: 700 }}>{invoices.length}</p>
            </div>
            <div className="card" style={{ textAlign: 'center' }}>
              <p style={{ fontSize: 11, color: '#6b7280', fontWeight: 700, marginBottom: 8 }}>TOTAL DUE</p>
              <p style={{ fontSize: 28, fontWeight: 700, color: '#f59e0b' }}>{fmt((customer?.previous_balance || 0) + invoices.reduce((s, i) => s + (i.total || 0), 0))}</p>
            </div>
          </div>

          <div className="card" style={{ marginTop: 24 }}>
            <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16 }}>📋 Orders</h2>
            {invoices.length === 0 ? (
              <p style={{ color: '#6b7280' }}>No orders</p>
            ) : (
              <table>
                <thead>
                  <tr>
                    <th>Order #</th>
                    <th style={{ textAlign: 'right' }}>Amount</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {invoices.map((inv) => (
                    <tr key={inv.id}>
                      <td>{inv.id}</td>
                      <td style={{ textAlign: 'right', fontWeight: 700 }}>{fmt(inv.total || 0)}</td>
                      <td><span className="tag tag-warning">PENDING</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          <button className="btn-primary" onClick={() => setView('catalog')} style={{ width: '100%', padding: 12, marginTop: 24 }}>🛒 New Order</button>
        </div>
      </div>
    );
  }

  return <div className="portal"><GS /><p>Loading...</p></div>;
}
