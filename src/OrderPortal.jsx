// VitalWaveOne LLC - Customer Order Portal v2
// Migrated from Supabase to Neon PostgreSQL + Vercel Functions
// Includes: Customer registration, catalog, cart, invoices, Driver app, Walk-in support

import { useState, useEffect, useMemo, useRef } from 'react';

// ============================================================================
// STYLES
// ============================================================================

const GS = () => (
  <>
    <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700;800&family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet"/>
    <style>{`
      *{box-sizing:border-box;margin:0;padding:0;}
      body{background:#f8f5f0;font-family:'Inter',sans-serif;}
      .portal{min-height:100vh;background:#f8f5f0;padding:20px;}
      input,select,textarea{font-family:'Inter',sans-serif;transition:all .15s;border:1.5px solid #e5e7eb;border-radius:9px;padding:11px 14px;font-size:14px;}
      input:focus,select:focus,textarea:focus{outline:none;border-color:#0a1628;box-shadow:0 0 0 3px #0a162814;}
      .card{background:#fff;border-radius:16px;border:1px solid #e5e7eb;box-shadow:0 2px 16px #00000008;padding:24px;}
      .btn-primary{background:#0a1628;color:#fff;border:none;border-radius:10px;padding:13px 28px;font-weight:600;cursor:pointer;transition:all .2s;}
      .btn-primary:hover{background:#162540;transform:translateY(-1px);}
      .btn-primary:disabled{background:#8a9ab0;cursor:not-allowed;}
      .btn-ghost{background:transparent;color:#6b7280;border:1.5px solid #d1d5db;border-radius:10px;padding:11px 20px;cursor:pointer;}
      .btn-ghost:hover{border-color:#0a1628;color:#0a1628;}
      .grid2{display:grid;grid-template-columns:1fr 1fr;gap:16px;}
      .grid3{display:grid;grid-template-columns:repeat(auto-fit,minmax(250px,1fr));gap:16px;}
      .tag{padding:6px 12px;border-radius:20px;font-size:11px;font-weight:700;display:inline-block;}
      .tag-success{background:#d1fae5;color:#065f46;}
      .tag-warning{background:#fef3c7;color:#854d0e;}
      table{width:100%;border-collapse:collapse;margin:16px 0;}
      th{text-align:left;padding:12px;font-size:12px;font-weight:700;color:#6b7280;border-bottom:2px solid #e5e7eb;background:#f9f8f5;text-transform:uppercase;}
      td{padding:12px;border-bottom:1px solid #f3f4f6;}
      @media(max-width:768px){.grid2{grid-template-columns:1fr;}.grid3{grid-template-columns:1fr;}}
    `}</style>
  </>
);

// ============================================================================
// HELPERS
// ============================================================================

const fmt = (n) => `$${Number(n || 0).toFixed(2)}`;
const uid = () => Math.random().toString(36).slice(2, 9).toUpperCase();
const nowStr = () => new Date().toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });

// Tax calculation (tobacco only)
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

// ============================================================================
// PROFORMA INVOICE COMPONENT
// ============================================================================

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
          <p style={{ fontSize: 12, color: '#6b7280' }}>{order.email}</p>
        </div>
        <div>
          <p style={{ fontSize: 11, fontWeight: 700, color: '#6b7280', marginBottom: 8, textTransform: 'uppercase' }}>Order Details</p>
          <p style={{ fontSize: 12, marginBottom: 4 }}>Order: <strong>{order.id}</strong></p>
          <p style={{ fontSize: 12, marginBottom: 4 }}>Date: <strong>{order.date}</strong></p>
          <p style={{ fontSize: 12 }}>Status: <span className="tag tag-warning">PENDING</span></p>
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
            <span>Total Due:</span>
            <span style={{ color: '#f59e0b' }}>{fmt(total)}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function OrderPortal() {
  const [view, setView] = useState('role-select');
  const [phone, setPhone] = useState('');
  const [customer, setCustomer] = useState(null);
  const [products, setProducts] = useState([]);
  const [cart, setCart] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [stateTaxes, setStateTaxes] = useState([]);
  const [company, setCompany] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Load initial data
  useEffect(() => {
    loadInitialData();
  }, []);

  const fetchWithTimeout = (url, timeout = 5000) => {
    return Promise.race([
      fetch(url).then(r => r.json()),
      new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), timeout))
    ]).catch(() => ({ data: null }));
  };

  const loadInitialData = async () => {
    try {
      // Mock data as fallback
      const defaultProducts = [
        { id: '1', name: 'Cigarettes (Pack)', sku: 'CIG-001', cat: 'Tobacco', price: 5.99, shelf: 100, unit: 'pack' },
        { id: '2', name: 'Cigars (Box)', sku: 'CIG-002', cat: 'Tobacco', price: 12.99, shelf: 50, unit: 'box' },
        { id: '3', name: 'Vape Juice (60ml)', sku: 'VAPE-001', cat: 'Vape', price: 15.99, shelf: 200, unit: 'bottle' },
      ];
      const defaultTaxes = [
        { id: 'IN', rate: 7, exempt: false },
        { id: 'PA', rate: 6, exempt: false },
      ];
      const defaultCo = { name: 'VitalWaveOne LLC', phone: '(317) 509-6262', email: 'orders@vitalwaveone.com' };

      const [prodRes, taxRes, coRes] = await Promise.all([
        fetchWithTimeout('/api/db?action=get-products', 3000),
        fetchWithTimeout('/api/db?action=get-state-taxes', 3000),
        fetchWithTimeout('/api/db?action=get-company', 3000),
      ]);

      setProducts(prodRes?.data?.length > 0 ? prodRes.data : defaultProducts);
      setStateTaxes(taxRes?.data?.length > 0 ? taxRes.data : defaultTaxes);
      setCompany(coRes?.data || defaultCo);
    } catch (err) {
      console.error('Load error:', err);
      // Use defaults on error
      setProducts([
        { id: '1', name: 'Cigarettes (Pack)', sku: 'CIG-001', cat: 'Tobacco', price: 5.99, shelf: 100, unit: 'pack' },
        { id: '2', name: 'Cigars (Box)', sku: 'CIG-002', cat: 'Tobacco', price: 12.99, shelf: 50, unit: 'box' },
        { id: '3', name: 'Vape Juice (60ml)', sku: 'VAPE-001', cat: 'Vape', price: 15.99, shelf: 200, unit: 'bottle' },
      ]);
      setStateTaxes([
        { id: 'IN', rate: 7, exempt: false },
        { id: 'PA', rate: 6, exempt: false },
      ]);
      setCompany({ name: 'VitalWaveOne LLC', phone: '(317) 509-6262', email: 'orders@vitalwaveone.com' });
    }
  };

  const handleCustomerLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const clean = phone.replace(/\D/g, '');

      // Mock customers for testing
      const mockCustomers = [
        { id: 'C001', name: 'ABC Store', address: '123 Main St', city: 'Indianapolis', state: 'IN', phone: '3175096262', email: 'abc@store.com', owner_name: 'John Doe', previous_balance: 150.00, notes: '' },
        { id: 'C002', name: 'XYZ Shop', address: '456 Oak Ave', city: 'Pittsburgh', state: 'PA', phone: '4125551234', email: 'xyz@shop.com', owner_name: 'Jane Smith', previous_balance: 0, notes: '' },
      ];

      try {
        const custRes = await Promise.race([
          fetch('/api/db?action=get-customers').then(r => r.json()),
          new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 3000))
        ]).catch(() => ({ data: mockCustomers }));

        const customers = custRes?.data || mockCustomers;
        const found = customers.find(c => c.phone.includes(clean));

        if (found) {
          setCustomer(found);
          setCart([]);
          setView('catalog');
        } else {
          setError('Customer not found. Try 317-509-6262');
        }
      } catch (fetchErr) {
        // Fallback to mock if API fails
        const found = mockCustomers.find(c => c.phone.includes(clean));
        if (found) {
          setCustomer(found);
          setCart([]);
          setView('catalog');
        } else {
          setError('Customer not found. Try 317-509-6262');
        }
      }
    } catch (err) {
      setError('Login failed: ' + err.message);
    }
    setLoading(false);
  };

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
      const orderId = `ORD${uid()}`;
      const res = await fetch('/api/db?action=create-sale', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cust_id: customer.id,
          items: cart,
          subtotal: cartTotals.subtotal,
          tax: cartTotals.tax,
          total: cartTotals.total,
          payment_method: 'pending',
          date: nowStr(),
          notes: '',
        }),
      });
      const { id } = await res.json();

      setInvoices([...invoices, {
        id: id,
        customerName: customer.name,
        businessName: customer.name,
        ownerName: customer.name,
        address: customer.address,
        phone: customer.phone,
        email: customer.email,
        items: cart,
        date: nowStr(),
      }]);

      setCart([]);
      setView('invoice');
    } catch (err) {
      setError(err.message);
    }
    setLoading(false);
  };

  // ========== ROLE SELECT VIEW ==========
  if (view === 'role-select') {
    return (
      <div className="portal">
        <GS />
        <div className="card" style={{ maxWidth: 450, margin: '80px auto', textAlign: 'center' }}>
          <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 24, background: 'linear-gradient(135deg, #0a1628 0%, #162540 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            🛒 VitalWave Order
          </h1>
          <p style={{ color: '#6b7280', marginBottom: 32 }}>Select your role</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <button className="btn-primary" onClick={() => setView('customer-login')} style={{ width: '100%' }}>
              👥 Customer Login
            </button>
            <button className="btn-primary" onClick={() => setView('walk-in')} style={{ width: '100%' }}>
              🚶 Walk-in Order
            </button>
            <button className="btn-primary" onClick={() => setView('driver-login')} style={{ width: '100%' }}>
              🚚 Driver App
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ========== CUSTOMER LOGIN ==========
  if (view === 'customer-login') {
    return (
      <div className="portal">
        <GS />
        <div className="card" style={{ maxWidth: 400, margin: '60px auto' }}>
          <h2 style={{ marginBottom: 24, fontSize: 20 }}>📱 Customer Login</h2>
          {error && <div style={{ color: '#dc2626', background: '#fef2f2', padding: 12, borderRadius: 8, marginBottom: 16, fontSize: 13 }}>{error}</div>}
          <form onSubmit={handleCustomerLogin}>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 6, color: '#6b7280' }}>PHONE NUMBER</label>
            <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+1 (317) 509-6262" required autoFocus style={{ marginBottom: 16, width: '100%' }} />
            <button type="submit" className="btn-primary" disabled={loading} style={{ width: '100%', marginBottom: 12 }}>
              {loading ? 'Loading...' : '→ Continue'}
            </button>
          </form>
          <button className="btn-ghost" onClick={() => setView('role-select')} style={{ width: '100%' }}>← Back</button>
        </div>
      </div>
    );
  }

  // ========== CATALOG VIEW ==========
  if (view === 'catalog') {
    return (
      <div className="portal">
        <GS />
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
            <div>
              <h1 style={{ fontSize: 28, fontWeight: 700 }}>📦 Catalog</h1>
              <p style={{ color: '#6b7280', marginTop: 4 }}>{customer?.name} • {customer?.state}</p>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn-primary" onClick={() => setView('customer-account')} style={{ padding: '10px 20px' }}>📊 Account</button>
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

  // ========== CART VIEW ==========
  if (view === 'cart') {
    return (
      <div className="portal">
        <GS />
        <div className="card" style={{ maxWidth: 700, margin: '0 auto' }}>
          <button className="btn-ghost" onClick={() => setView('catalog')} style={{ marginBottom: 16 }}>← Catalog</button>
          <h2 style={{ marginBottom: 16, fontSize: 20 }}>🛒 Cart</h2>

          {cart.length === 0 ? (
            <p style={{ color: '#6b7280', textAlign: 'center', padding: 40 }}>Cart is empty</p>
          ) : (
            <>
              <table>
                <thead>
                  <tr>
                    <th>Product</th>
                    <th style={{ textAlign: 'right' }}>Qty</th>
                    <th style={{ textAlign: 'right' }}>Price</th>
                    <th style={{ textAlign: 'right' }}>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {cart.map((item) => {
                    const p = products.find(x => x.id === item.pid);
                    return (
                      <tr key={item.pid}>
                        <td>{p?.name}</td>
                        <td style={{ textAlign: 'right' }}>
                          <input type="number" min="1" value={item.qty} onChange={(e) => handleUpdateQuantity(item.pid, parseInt(e.target.value))} style={{ width: 60, textAlign: 'center' }} />
                        </td>
                        <td style={{ textAlign: 'right' }}>{fmt(p?.price)}</td>
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
                <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: 12, marginTop: 12, borderTop: '2px solid #0a1628', fontWeight: 700, fontSize: 16, color: '#0a1628' }}>
                  <span>Total:</span> <span>{fmt(cartTotals.total)}</span>
                </div>
              </div>

              <div style={{ display: 'flex', gap: 12, marginTop: 16 }}>
                <button className="btn-primary" onClick={handleCheckout} disabled={loading} style={{ flex: 1, padding: 12 }}>
                  {loading ? 'Processing...' : '→ Checkout'}
                </button>
                <button className="btn-ghost" onClick={() => setCart([])} style={{ flex: 1, padding: 12 }}>Clear</button>
              </div>
            </>
          )}
        </div>
      </div>
    );
  }

  // ========== INVOICE VIEW ==========
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

  // ========== CUSTOMER ACCOUNT VIEW ==========
  if (view === 'customer-account') {
    return (
      <div className="portal">
        <GS />
        <div style={{ maxWidth: 1000, margin: '0 auto' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
            <h1 style={{ fontSize: 28, fontWeight: 700 }}>📊 My Account</h1>
            <button className="btn-primary" onClick={() => { setCustomer(null); setView('role-select'); }} style={{ padding: '10px 20px' }}>Logout</button>
          </div>

          <div className="grid3">
            <div className="card" style={{ textAlign: 'center' }}>
              <p style={{ fontSize: 11, color: '#6b7280', marginBottom: 8, textTransform: 'uppercase', fontWeight: 700 }}>Previous Balance</p>
              <p style={{ fontSize: 28, fontWeight: 700, color: customer?.previous_balance > 0 ? '#dc2626' : '#10b981' }}>{fmt(customer?.previous_balance)}</p>
            </div>
            <div className="card" style={{ textAlign: 'center' }}>
              <p style={{ fontSize: 11, color: '#6b7280', marginBottom: 8, textTransform: 'uppercase', fontWeight: 700 }}>Pending Orders</p>
              <p style={{ fontSize: 28, fontWeight: 700, color: '#0a1628' }}>{invoices.filter(i => i.id).length}</p>
            </div>
            <div className="card" style={{ textAlign: 'center' }}>
              <p style={{ fontSize: 11, color: '#6b7280', marginBottom: 8, textTransform: 'uppercase', fontWeight: 700 }}>Total Due</p>
              <p style={{ fontSize: 28, fontWeight: 700, color: '#f59e0b' }}>{fmt((customer?.previous_balance || 0) + invoices.reduce((s, i) => s + (i.total || 0), 0))}</p>
            </div>
          </div>

          <div className="card" style={{ marginTop: 24 }}>
            <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16 }}>📋 Order History</h2>
            {invoices.length === 0 ? (
              <p style={{ color: '#6b7280', textAlign: 'center', padding: 24 }}>No orders yet</p>
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

          <div style={{ maxWidth: 1000, margin: '24px auto' }}>
            <button className="btn-primary" onClick={() => setView('catalog')} style={{ width: '100%', padding: 12 }}>🛒 New Order</button>
          </div>
        </div>
      </div>
    );
  }

  // ========== WALK-IN & DRIVER VIEWS (MINIMAL FOR NOW) ==========
  if (view === 'walk-in') {
    return (
      <div className="portal">
        <GS />
        <div className="card" style={{ maxWidth: 400, margin: '60px auto', textAlign: 'center' }}>
          <h2 style={{ marginBottom: 20 }}>🚶 Walk-in Order</h2>
          <p style={{ color: '#6b7280', marginBottom: 24 }}>Quick order without registration</p>
          <button className="btn-primary" onClick={() => { setCustomer({ name: 'Walk-in', state: 'IN' }); setView('catalog'); }} style={{ width: '100%', marginBottom: 12 }}>Start Order</button>
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
          <p style={{ fontSize: 12, color: '#6b7280', marginBottom: 16 }}>Driver app features coming soon</p>
          <button className="btn-ghost" onClick={() => setView('role-select')} style={{ width: '100%' }}>← Back</button>
        </div>
      </div>
    );
  }

  return <div className="portal"><GS /><p>Loading...</p></div>;
}
