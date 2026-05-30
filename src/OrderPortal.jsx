// OrderPortal.jsx - Full-Featured B2B Order Management System
// Includes: Customer registration + catalog + ordering + AR tracking + Driver app + Walk-in support

import { useState, useEffect, useMemo } from 'react';

const GlobalStyles = () => (
  <>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap" rel="stylesheet" />
    <style>{`
      * { box-sizing: border-box; margin: 0; padding: 0; }
      body { background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%); font-family: 'Inter', sans-serif; color: #1a202c; }
      .card { background: rgba(255,255,255,0.7); backdrop-filter: blur(10px); border: 1px solid rgba(255,255,255,0.5); border-radius: 16px; padding: 24px; box-shadow: 0 8px 32px rgba(31,38,135,0.08); }
      .btn { cursor: pointer; border: none; font-family: 'Inter'; font-weight: 600; font-size: 13px; padding: 10px 16px; border-radius: 10px; background: #f0f4f8; color: #475569; border: 1px solid #e2e8f0; transition: all 0.2s; display: inline-flex; align-items: center; gap: 8px; }
      .btn-primary { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; border: none; }
      .btn-success { background: #10b981; color: white; border: none; }
      input, select { background: #f8fafc; border: 1px solid #e2e8f0; color: #1a202c; border-radius: 10px; padding: 10px 14px; font-family: 'Inter'; font-size: 13px; width: 100%; outline: none; }
      input:focus, select:focus { border-color: #667eea; background: white; }
      label { font-size: 12px; font-weight: 600; color: #64748b; text-transform: uppercase; display: block; margin-bottom: 6px; }
      table { width: 100%; border-collapse: collapse; }
      th { text-align: left; padding: 12px 16px; font-size: 12px; font-weight: 700; color: #64748b; border-bottom: 2px solid #e2e8f0; background: #f8fafc; text-transform: uppercase; }
      td { padding: 12px 16px; font-size: 13px; border-bottom: 1px solid #e2e8f0; color: #334155; }
      .tag { display: inline-flex; padding: 4px 10px; border-radius: 8px; font-size: 11px; font-weight: 700; text-transform: uppercase; }
      .tag-success { background: #d1fae5; color: #065f46; }
      .tag-warning { background: #fef3c7; color: #854d0e; }
      .tag-danger { background: #fee2e2; color: #991b1b; }
      .grid2 { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
      .grid3 { display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 16px; }
      @keyframes slideIn { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
      .fade-in { animation: slideIn 0.3s ease forwards; }
    `}</style>
  </>
);

const fmt = (n) => `$${Number(n || 0).toFixed(2)}`;
const uid = () => Math.random().toString(36).slice(2, 9).toUpperCase();

// Tax calculation for state-specific handling
const calcTax = (amount, state = 'IN', isTaxable = true) => {
  if (!isTaxable) return 0;
  const rates = { IN: 0.07, PA: 0.06, OH: 0.05825, KY: 0.06, MI: 0.06, TN: 0.095 };
  return parseFloat((amount * (rates[state] || 0.07)).toFixed(2));
};

const isTaxableProduct = (p) => {
  const c = (p?.category || '').toLowerCase();
  return ['tobacco', 'nicotine', 'cigarette', 'vape', 'e-liquid'].some(t => c.includes(t));
};

// Sample database data
const SAMPLE_PRODUCTS = [
  { id: 1, name: 'Cigarettes (Pack)', price: 5.99, category: 'Tobacco', stock: 100 },
  { id: 2, name: 'Cigars (Box)', price: 12.99, category: 'Tobacco', stock: 50 },
  { id: 3, name: 'Vape Juice (60ml)', price: 15.99, category: 'Vape', stock: 200 },
  { id: 4, name: 'Rolling Papers', price: 2.99, category: 'Accessories', stock: 300 },
  { id: 5, name: 'Lighters', price: 1.99, category: 'Accessories', stock: 250 },
];

const SAMPLE_CUSTOMERS = [
  { id: 'C001', name: 'ABC Store', phone: '3175096262', city: 'Indianapolis', state: 'IN', totalDue: 150.00, previousBalance: 75.00 },
  { id: 'C002', name: 'XYZ Shop', phone: '4125551234', city: 'Pittsburgh', state: 'PA', totalDue: 0, previousBalance: 0 },
];

const SAMPLE_DRIVERS = [
  { id: 'D001', name: 'John Smith', truck: 'T-001', phone: '2674445555', region: 'North' },
  { id: 'D002', name: 'Maria Garcia', truck: 'T-002', phone: '3175552222', region: 'South' },
];

export default function OrderPortal() {
  const [view, setView] = useState('role-select'); // role-select | customer-login | register | catalog | cart | invoice | account | driver-home | driver-route | walk-in
  const [customerData, setCustomerData] = useState(null);
  const [driverData, setDriverData] = useState(null);
  const [cart, setCart] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [phone, setPhone] = useState('');
  const [toast, setToast] = useState('');
  const [loading, setLoading] = useState(false);

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(''), 2500); };

  // ========================================================================
  // CUSTOMER LOGIN & REGISTRATION
  // ========================================================================

  const handleCustomerLogin = (e) => {
    e.preventDefault();
    setLoading(true);
    const clean = phone.replace(/\D/g, '');
    const customer = SAMPLE_CUSTOMERS.find(c => c.phone.includes(clean));
    if (customer) {
      setCustomerData(customer);
      setCart([]);
      setView('catalog');
      showToast(`Welcome ${customer.name}!`);
    } else {
      showToast('Not found. Create new account?');
      setView('register');
    }
    setLoading(false);
  };

  // ========================================================================
  // WALK-IN CUSTOMER (NO REGISTRATION NEEDED)
  // ========================================================================

  const handleWalkInStart = () => {
    setCustomerData({
      id: 'WALKIN-' + uid(),
      name: 'Walk-in Customer',
      phone: 'N/A',
      state: 'IN',
      totalDue: 0,
      previousBalance: 0,
      isWalkIn: true,
    });
    setCart([]);
    setView('catalog');
    showToast('Walk-in mode started');
  };

  // ========================================================================
  // CART & INVOICE MANAGEMENT
  // ========================================================================

  const addToCart = (product) => {
    const existing = cart.find(i => i.id === product.id);
    if (existing) {
      setCart(cart.map(i => i.id === product.id ? { ...i, quantity: i.quantity + 1 } : i));
    } else {
      setCart([...cart, { ...product, quantity: 1 }]);
    }
  };

  const removeFromCart = (id) => setCart(cart.filter(i => i.id !== id));

  const updateQuantity = (id, qty) => {
    if (qty <= 0) removeFromCart(id);
    else setCart(cart.map(i => i.id === id ? { ...i, quantity: qty } : i));
  };

  const cartTotals = useMemo(() => {
    const subtotal = cart.reduce((s, i) => s + (i.price * i.quantity), 0);
    const taxable = cart.filter(i => isTaxableProduct(i)).reduce((s, i) => s + (i.price * i.quantity), 0);
    const tax = calcTax(taxable, customerData?.state || 'IN', true);
    return { subtotal: parseFloat(subtotal.toFixed(2)), tax, total: parseFloat((subtotal + tax).toFixed(2)) };
  }, [cart, customerData]);

  const createInvoice = () => {
    const inv = {
      id: `INV-${uid()}`,
      customerId: customerData.id,
      customerName: customerData.name,
      items: cart,
      subtotal: cartTotals.subtotal,
      tax: cartTotals.tax,
      total: cartTotals.total,
      paymentMethod: 'pending',
      status: 'pending',
      date: new Date(),
    };
    setInvoices([...invoices, inv]);
    showToast('Invoice created!');
    return inv;
  };

  // ========================================================================
  // ROLE SELECT VIEW
  // ========================================================================

  if (view === 'role-select') {
    return (
      <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)', padding: '20px', fontFamily: "'Inter', sans-serif" }}>
        <GlobalStyles />
        <div className="card" style={{ maxWidth: 450, margin: '80px auto', textAlign: 'center' }}>
          <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 24, background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>🛒 VitalWave Order</h1>
          <p style={{ color: '#94a3b8', marginBottom: 32 }}>What brings you here today?</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <button className="btn btn-primary" onClick={() => setView('customer-login')} style={{ width: '100%', padding: 12, justifyContent: 'center' }}>👥 Registered Customer</button>
            <button className="btn btn-primary" onClick={handleWalkInStart} style={{ width: '100%', padding: 12, justifyContent: 'center' }}>🚶 Walk-in Order</button>
            <button className="btn btn-primary" onClick={() => setView('driver-login')} style={{ width: '100%', padding: 12, justifyContent: 'center' }}>🚚 Driver Route</button>
          </div>
        </div>
      </div>
    );
  }

  // ========================================================================
  // CUSTOMER LOGIN
  // ========================================================================

  if (view === 'customer-login') {
    return (
      <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)', padding: '20px' }}>
        <GlobalStyles />
        <div className="card" style={{ maxWidth: 400, margin: '60px auto' }}>
          <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 24 }}>📱 Customer Login</h1>
          <form onSubmit={handleCustomerLogin}>
            <label>Phone Number</label>
            <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+1 (317) 509-6262" required autoFocus style={{ marginBottom: 16 }} />
            <button type="submit" className="btn btn-primary" disabled={loading} style={{ width: '100%', padding: 12, justifyContent: 'center' }}>
              {loading ? '⏳ Loading...' : '→ Continue'}
            </button>
          </form>
          <button className="btn" onClick={() => setView('role-select')} style={{ width: '100%', marginTop: 12, padding: 12, justifyContent: 'center' }}>← Back</button>
        </div>
      </div>
    );
  }

  // ========================================================================
  // CATALOG VIEW
  // ========================================================================

  if (view === 'catalog') {
    return (
      <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)', padding: '20px' }}>
        <GlobalStyles />
        <div style={{ maxWidth: 1000, margin: '0 auto' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
            <div>
              <h1 style={{ fontSize: 24, fontWeight: 700 }}>📦 Catalog</h1>
              <p style={{ fontSize: 12, color: '#94a3b8', marginTop: 4 }}>{customerData?.name} • {customerData?.state}</p>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn" onClick={() => setView('account')} style={{ padding: 10 }}>📊 Account</button>
              <button className="btn btn-primary" onClick={() => setView('cart')} style={{ padding: 10 }}>🛒 {cart.length}</button>
            </div>
          </div>

          <div className="grid3">
            {SAMPLE_PRODUCTS.map((p) => (
              <div key={p.id} className="card" style={{ textAlign: 'center' }}>
                <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 8 }}>{p.name}</h3>
                <p style={{ fontSize: 11, color: '#94a3b8', marginBottom: 12 }}>{p.category}</p>
                <p style={{ fontSize: 20, fontWeight: 700, color: '#667eea', marginBottom: 12 }}>{fmt(p.price)}</p>
                <button className="btn btn-success" onClick={() => { addToCart(p); showToast('Added to cart'); }} style={{ width: '100%', padding: 10 }}>+ Add</button>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ========================================================================
  // CART VIEW
  // ========================================================================

  if (view === 'cart') {
    return (
      <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)', padding: '20px' }}>
        <GlobalStyles />
        <div className="card" style={{ maxWidth: 700, margin: '0 auto' }}>
          <button className="btn" onClick={() => setView('catalog')} style={{ marginBottom: 16 }}>← Catalog</button>

          {cart.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 40 }}>
              <p style={{ fontSize: 48, marginBottom: 12 }}>🛒</p>
              <p style={{ color: '#94a3b8' }}>Cart is empty</p>
            </div>
          ) : (
            <>
              <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 16 }}>📦 Order Summary</h2>
              <table style={{ marginBottom: 24 }}>
                <thead>
                  <tr>
                    <th>Product</th>
                    <th style={{ textAlign: 'right' }}>Qty</th>
                    <th style={{ textAlign: 'right' }}>Price</th>
                    <th style={{ textAlign: 'right' }}>Total</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {cart.map((item) => (
                    <tr key={item.id}>
                      <td>{item.name}</td>
                      <td style={{ textAlign: 'right' }}>
                        <input type="number" min="1" value={item.quantity} onChange={(e) => updateQuantity(item.id, parseInt(e.target.value))} style={{ width: 60, textAlign: 'center' }} />
                      </td>
                      <td style={{ textAlign: 'right' }}>{fmt(item.price)}</td>
                      <td style={{ textAlign: 'right', fontWeight: 700 }}>{fmt(item.price * item.quantity)}</td>
                      <td><button className="btn" onClick={() => removeFromCart(item.id)} style={{ padding: '6px 10px', background: '#fee2e2', color: '#991b1b' }}>×</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div style={{ background: '#f8fafc', padding: 16, borderRadius: 10, marginBottom: 24 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}><span>Subtotal:</span> <span>{fmt(cartTotals.subtotal)}</span></div>
                {cartTotals.tax > 0 && <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}><span>Tax:</span> <span style={{ color: '#10b981' }}>{fmt(cartTotals.tax)}</span></div>}
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 16, fontWeight: 700, color: '#667eea', paddingTop: 12, borderTop: '2px solid #e2e8f0' }}>
                  <span>Total:</span> <span>{fmt(cartTotals.total)}</span>
                </div>
              </div>

              <div style={{ display: 'flex', gap: 12 }}>
                <button className="btn btn-primary" onClick={() => { createInvoice(); setView('invoice'); }} style={{ flex: 1, padding: 12, justifyContent: 'center' }}>→ Review Invoice</button>
                <button className="btn" onClick={() => setCart([])} style={{ flex: 1, padding: 12, justifyContent: 'center' }}>Clear</button>
              </div>
            </>
          )}
        </div>
      </div>
    );
  }

  // ========================================================================
  // INVOICE VIEW
  // ========================================================================

  if (view === 'invoice') {
    const lastInv = invoices[invoices.length - 1];
    return (
      <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)', padding: '20px' }}>
        <GlobalStyles />
        <div className="card fade-in" style={{ maxWidth: 700, margin: '0 auto' }}>
          <div style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', padding: 24, borderRadius: '16px 16px 0 0', marginLeft: -24, marginRight: -24, marginTop: -24, marginBottom: 24, color: '#fff' }}>
            <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 8 }}>📄 Proforma Invoice</h1>
            <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.8)' }}>#{lastInv?.id}</p>
          </div>

          <div className="grid2" style={{ marginBottom: 24 }}>
            <div>
              <p style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', marginBottom: 8 }}>Bill To</p>
              <p style={{ fontWeight: 700 }}>{lastInv?.customerName}</p>
              <p style={{ fontSize: 12, color: '#6b7280' }}>{customerData?.state}</p>
            </div>
            <div>
              <p style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', marginBottom: 8 }}>Invoice Details</p>
              <p style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}><span>Date:</span> <span>{lastInv?.date?.toLocaleDateString()}</span></p>
              <p style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}><span>Status:</span> <span className="tag tag-warning">Pending</span></p>
            </div>
          </div>

          <table style={{ marginBottom: 24 }}>
            <thead>
              <tr>
                <th>Item</th>
                <th style={{ textAlign: 'right' }}>Qty</th>
                <th style={{ textAlign: 'right' }}>Price</th>
                <th style={{ textAlign: 'right' }}>Amount</th>
              </tr>
            </thead>
            <tbody>
              {lastInv?.items?.map((item) => (
                <tr key={item.id}>
                  <td>{item.name}</td>
                  <td style={{ textAlign: 'right' }}>{item.quantity}</td>
                  <td style={{ textAlign: 'right' }}>{fmt(item.price)}</td>
                  <td style={{ textAlign: 'right', fontWeight: 700 }}>{fmt(item.price * item.quantity)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div style={{ background: '#f8fafc', padding: 16, borderRadius: 10, marginBottom: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'flex-end', width: 300, marginLeft: 'auto', gap: 12 }}>
              <span>Subtotal:</span>
              <span style={{ minWidth: 80, textAlign: 'right' }}>{fmt(lastInv?.subtotal)}</span>
            </div>
            {lastInv?.tax > 0 && <div style={{ display: 'flex', justifyContent: 'flex-end', width: 300, marginLeft: 'auto', gap: 12 }}>
              <span>Tax:</span>
              <span style={{ minWidth: 80, textAlign: 'right' }}>{fmt(lastInv?.tax)}</span>
            </div>}
            <div style={{ display: 'flex', justifyContent: 'flex-end', width: 300, marginLeft: 'auto', gap: 12, fontSize: 16, fontWeight: 700, color: '#667eea', paddingTop: 12, borderTop: '2px solid #e2e8f0' }}>
              <span>Total Due:</span>
              <span style={{ minWidth: 80, textAlign: 'right' }}>{fmt(lastInv?.total)}</span>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 12 }}>
            <button className="btn btn-success" onClick={() => { showToast('Order submitted for approval'); setView('account'); }} style={{ flex: 1, padding: 12, justifyContent: 'center' }}>✓ Submit</button>
            <button className="btn" onClick={() => setView('cart')} style={{ flex: 1, padding: 12, justifyContent: 'center' }}>← Edit</button>
          </div>
        </div>
      </div>
    );
  }

  // ========================================================================
  // CUSTOMER ACCOUNT (AR TRACKING, INVOICE HISTORY)
  // ========================================================================

  if (view === 'account') {
    const myInvoices = invoices.filter(i => i.customerId === customerData?.id);
    const paidAmount = myInvoices.filter(i => i.status === 'paid').reduce((s, i) => s + i.total, 0);
    const totalDue = (customerData?.previousBalance || 0) + myInvoices.filter(i => i.status === 'pending').reduce((s, i) => s + i.total, 0);

    return (
      <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)', padding: '20px' }}>
        <GlobalStyles />
        <div style={{ maxWidth: 1000, margin: '0 auto' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
            <h1 style={{ fontSize: 24, fontWeight: 700 }}>📊 My Account</h1>
            <button className="btn btn-primary" onClick={() => { setCustomerData(null); setCart([]); setView('role-select'); }} style={{ padding: 10 }}>Logout</button>
          </div>

          <div className="grid3">
            <div className="card" style={{ textAlign: 'center' }}>
              <p style={{ fontSize: 11, color: '#94a3b8', textTransform: 'uppercase', marginBottom: 8 }}>Total Invoices</p>
              <p style={{ fontSize: 28, fontWeight: 700, color: '#667eea' }}>{myInvoices.length}</p>
            </div>
            <div className="card" style={{ textAlign: 'center' }}>
              <p style={{ fontSize: 11, color: '#94a3b8', textTransform: 'uppercase', marginBottom: 8 }}>Amount Paid</p>
              <p style={{ fontSize: 28, fontWeight: 700, color: '#10b981' }}>{fmt(paidAmount)}</p>
            </div>
            <div className="card" style={{ textAlign: 'center' }}>
              <p style={{ fontSize: 11, color: '#94a3b8', textTransform: 'uppercase', marginBottom: 8 }}>Balance Due</p>
              <p style={{ fontSize: 28, fontWeight: 700, color: totalDue > 0 ? '#dc2626' : '#10b981' }}>{fmt(totalDue)}</p>
            </div>
          </div>

          <div className="card" style={{ marginTop: 24 }}>
            <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16 }}>📋 Invoice History</h2>
            {myInvoices.length === 0 ? (
              <p style={{ color: '#94a3b8', textAlign: 'center', padding: 24 }}>No invoices yet</p>
            ) : (
              <table>
                <thead>
                  <tr>
                    <th>Invoice #</th>
                    <th style={{ textAlign: 'right' }}>Amount</th>
                    <th>Status</th>
                    <th style={{ textAlign: 'right' }}>Date</th>
                  </tr>
                </thead>
                <tbody>
                  {myInvoices.map((inv) => (
                    <tr key={inv.id}>
                      <td>{inv.id}</td>
                      <td style={{ textAlign: 'right', fontWeight: 700 }}>{fmt(inv.total)}</td>
                      <td><span className={`tag tag-${inv.status === 'pending' ? 'warning' : 'success'}`}>{inv.status.toUpperCase()}</span></td>
                      <td style={{ textAlign: 'right', fontSize: 12 }}>{inv.date?.toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          <div style={{ marginTop: 24, display: 'flex', gap: 12 }}>
            <button className="btn btn-primary" onClick={() => setView('catalog')} style={{ flex: 1, padding: 12, justifyContent: 'center' }}>🛒 New Order</button>
          </div>
        </div>
      </div>
    );
  }

  // ========================================================================
  // DRIVER LOGIN & ROUTE MANAGEMENT
  // ========================================================================

  if (view === 'driver-login') {
    const [driverPhone, setDriverPhone] = useState('');

    return (
      <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)', padding: '20px' }}>
        <GlobalStyles />
        <div className="card" style={{ maxWidth: 400, margin: '60px auto' }}>
          <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 24 }}>🚚 Driver Login</h1>
          <form onSubmit={(e) => { e.preventDefault(); const driver = SAMPLE_DRIVERS.find(d => d.phone.includes(driverPhone.replace(/\D/g, ''))); if (driver) { setDriverData(driver); setView('driver-home'); } }}>
            <label>Driver ID or Phone</label>
            <input type="tel" value={driverPhone} onChange={(e) => setDriverPhone(e.target.value)} placeholder="Driver ID or phone" required autoFocus style={{ marginBottom: 16 }} />
            <button type="submit" className="btn btn-primary" style={{ width: '100%', padding: 12, justifyContent: 'center' }}>→ Login</button>
          </form>
          <button className="btn" onClick={() => setView('role-select')} style={{ width: '100%', marginTop: 12, padding: 12, justifyContent: 'center' }}>← Back</button>
        </div>
      </div>
    );
  }

  if (view === 'driver-home') {
    return (
      <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)', padding: '20px' }}>
        <GlobalStyles />
        <div style={{ maxWidth: 1000, margin: '0 auto' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
            <h1 style={{ fontSize: 24, fontWeight: 700 }}>🚚 Driver Dashboard</h1>
            <button className="btn btn-primary" onClick={() => { setDriverData(null); setView('role-select'); }} style={{ padding: 10 }}>Logout</button>
          </div>

          <div className="grid3">
            <div className="card" style={{ textAlign: 'center' }}>
              <p style={{ fontSize: 11, color: '#94a3b8', textTransform: 'uppercase', marginBottom: 8 }}>Driver</p>
              <p style={{ fontSize: 20, fontWeight: 700 }}>{driverData?.name}</p>
              <p style={{ fontSize: 12, color: '#94a3b8', marginTop: 8 }}>{driverData?.truck}</p>
            </div>
            <div className="card" style={{ textAlign: 'center' }}>
              <p style={{ fontSize: 11, color: '#94a3b8', textTransform: 'uppercase', marginBottom: 8 }}>Today's Sales</p>
              <p style={{ fontSize: 28, fontWeight: 700, color: '#10b981' }}>$3,500</p>
              <p style={{ fontSize: 12, color: '#94a3b8', marginTop: 8 }}>45 items</p>
            </div>
            <div className="card" style={{ textAlign: 'center' }}>
              <p style={{ fontSize: 11, color: '#94a3b8', textTransform: 'uppercase', marginBottom: 8 }}>Route Progress</p>
              <p style={{ fontSize: 28, fontWeight: 700, color: '#667eea' }}>8/12</p>
              <p style={{ fontSize: 12, color: '#94a3b8', marginTop: 8 }}>stops complete</p>
            </div>
          </div>

          <div className="card" style={{ marginTop: 24 }}>
            <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16 }}>📍 Today's Route</h2>
            <table>
              <thead>
                <tr>
                  <th>Stop #</th>
                  <th>Customer</th>
                  <th>City</th>
                  <th style={{ textAlign: 'right' }}>Sales</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {[1, 2, 3].map((n) => (
                  <tr key={n}>
                    <td>{n}</td>
                    <td>Customer {n}</td>
                    <td>City {n}</td>
                    <td style={{ textAlign: 'right' }}>$500</td>
                    <td><span className={`tag ${n <= 2 ? 'tag-success' : 'tag-warning'}`}>{n <= 2 ? 'Complete' : 'Next'}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }

  // Default fallback
  return <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><p>Loading...</p></div>;
}
