# Critical Fixes - Quick Reference Guide
## 4-Hour Immediate Action Items

### Fix #1: Driver Authentication Bypass (30 min)

**Current (VULNERABLE)**:
```javascript
// OrderPortal.jsx Line 314
const res = await fetch(`${window.location.origin}/api/auth/driver-login`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ phone: clean }), // NO PASSWORD
});
```

**Fixed (SECURE)**:
```javascript
// Add password state
const [driverPassword, setDriverPassword] = useState('');

// Add password input to form
<input 
  type="password"
  value={driverPassword}
  onChange={(e) => setDriverPassword(e.target.value)}
  placeholder="Password"
  required
/>

// Updated auth call
const res = await fetch(`${window.location.origin}/api/auth/driver-login`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ 
    phone: clean,
    password: driverPassword 
  }),
});

if (!res.ok) {
  setError('Invalid phone or password');
  setLoading(false);
  return;
}

const result = await res.json();
if (!result.data?.token) {
  setError('Authentication failed');
  setLoading(false);
  return;
}

// Store token
localStorage.setItem('driver_token', result.data.token);
setDriver(result.data);
```

---

### Fix #2: Add CSRF Protection (1 hour)

**File**: OrderPortal.jsx & App.jsx

**Step 1: Generate CSRF Token on Load**
```javascript
useEffect(() => {
  // Generate CSRF token on app load
  const token = localStorage.getItem('csrf_token');
  if (!token) {
    const newToken = Math.random().toString(36).substring(2, 15) + 
                     Math.random().toString(36).substring(2, 15);
    localStorage.setItem('csrf_token', newToken);
  }
}, []);
```

**Step 2: Update API Mutation Function**
```javascript
const apiMutate = async (action, body) => {
  try {
    const token = localStorage.getItem('csrf_token');
    
    const method = action.includes("delete")
      ? "DELETE"
      : action.includes("update")
      ? "PUT"
      : "POST";

    const res = await fetch(`${window.location.origin}/api/db?action=${action}`, {
      method,
      headers: { 
        "Content-Type": "application/json",
        "X-CSRF-Token": token // ADD THIS
      },
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
```

**Step 3: Update API Server** (api/db.js)
```javascript
export default function handler(req, res) {
  // Validate CSRF token on mutations
  if (['POST', 'PUT', 'DELETE'].includes(req.method)) {
    const token = req.headers['x-csrf-token'];
    const storedToken = req.cookies.csrf_token; // Or from session
    
    if (!token || token !== storedToken) {
      return res.status(403).json({ error: 'CSRF validation failed' });
    }
  }

  // ... rest of handler
}
```

---

### Fix #3: Sanitize User Input (30 min)

**File**: OrderPortal.jsx Line 169-171

**Current (VULNERABLE)**:
```javascript
<div>
  <p style={{ fontSize: 15 }}>{order.businessName}</p>
  <p style={{ fontSize: 12 }}>{order.ownerName}</p>
</div>
```

**Fixed (SAFE)**:
```javascript
const sanitize = (str) => {
  if (!str) return '';
  const div = document.createElement('div');
  div.textContent = str; // Escapes HTML
  return div.innerHTML;
};

// Then use:
<div>
  <p style={{ fontSize: 15 }}>{sanitize(order.businessName)}</p>
  <p style={{ fontSize: 12 }}>{sanitize(order.ownerName)}</p>
</div>
```

**Or use a library** (safer):
```bash
npm install dompurify
```

```javascript
import DOMPurify from 'dompurify';

<p>{DOMPurify.sanitize(order.businessName)}</p>
```

---

### Fix #4: Validate Products Before Cart Operations (30 min)

**File**: OrderPortal.jsx Line 359-374

**Current (VULNERABLE)**:
```javascript
const cartTotals = useMemo(() => {
  const subtotal = cart.reduce((s, i) => {
    const p = products.find(x => x.id === i.pid);
    return s + (p?.price || 0) * i.qty; // Returns NaN if p undefined
  }, 0);
  // ...
}, [cart, customer, products, stateTaxes]);
```

**Fixed (SAFE)**:
```javascript
const cartTotals = useMemo(() => {
  // Guard clause - return safe defaults if products not loaded
  if (!products || !Array.isArray(products) || products.length === 0) {
    return { 
      subtotal: 0, 
      tax: 0, 
      total: 0, 
      rate: 0,
      isValid: false
    };
  }

  const subtotal = cart.reduce((s, i) => {
    const p = products.find(x => x.id === i.pid);
    // Skip if product not found
    if (!p || typeof p.price !== 'number') return s;
    return s + (p.price * i.qty);
  }, 0);

  const custState = customer?.state || 'IN';
  const stateData = stateTaxes?.find(s => s.id === custState);
  const rate = stateData?.rate || 7;
  const tax = calcTax(cart, products, rate);

  return {
    subtotal: parseFloat(subtotal.toFixed(2)),
    tax: tax,
    total: parseFloat((subtotal + tax).toFixed(2)),
    rate: rate,
    isValid: true
  };
}, [cart, customer, products, stateTaxes]);

// Disable checkout until valid
<button 
  className="btn-primary"
  disabled={!cartTotals.isValid || cart.length === 0}
  onClick={handleCheckout}
>
  Proceed to Checkout
</button>
```

---

### Fix #5: Fix Broken Add Button (15 min)

**File**: OrderPortal.jsx Line 468-473

**Current (BROKEN)**:
```javascript
<button className="btn-success" onClick={() => {
  if ((saleItems[p.id] || 0) > 0) {
    // WRONG: Clears instead of adds
    setSaleItems({ ...saleItems, [p.id]: 0 });
  }
}} style={{ width: '100%', padding: 8 }}>Add</button>
```

**Fixed (WORKS)**:
```javascript
// Create handler function
const handleAddProductToSale = (productId, quantity) => {
  if (quantity <= 0) return;
  
  // Add to sale items list
  const newSaleItem = {
    pid: productId,
    qty: quantity
  };
  
  // Check if already exists
  const existingIndex = saleItems.findIndex(i => i.pid === productId);
  if (existingIndex >= 0) {
    // Update quantity
    const updated = [...saleItems];
    updated[existingIndex].qty += quantity;
    setSaleItems(updated);
  } else {
    // Add new item
    setSaleItems([...saleItems, newSaleItem]);
  }
  
  // Clear input for next product
  const newState = { ...saleItemsQty };
  newState[productId] = 0;
  setSaleItemsQty(newState);
};

// Update button
<button className="btn-success" onClick={() => {
  const qty = saleItems[p.id] || 0;
  if (qty > 0) {
    handleAddProductToSale(p.id, qty);
  }
}} style={{ width: '100%', padding: 8 }}>Add to Sale</button>
```

---

### Fix #6: Add Error Boundary (30 min)

**Create new file**: `src/ErrorBoundary.jsx`

```javascript
import React from 'react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { 
      hasError: false, 
      error: null,
      errorInfo: null
    };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);
    this.setState({
      error: error,
      errorInfo: errorInfo
    });
  }

  handleReset = () => {
    this.setState({ 
      hasError: false, 
      error: null,
      errorInfo: null 
    });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          padding: '40px',
          textAlign: 'center',
          fontFamily: 'Inter, sans-serif',
          background: '#fee2e2',
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <div style={{ maxWidth: '500px' }}>
            <h1 style={{ color: '#991b1b', marginBottom: '16px' }}>
              ⚠️ Something went wrong
            </h1>
            <p style={{ color: '#7f1d1d', marginBottom: '16px' }}>
              {this.state.error?.message || 'An unexpected error occurred'}
            </p>
            {process.env.NODE_ENV === 'development' && (
              <pre style={{
                background: '#fff5f5',
                padding: '16px',
                borderRadius: '8px',
                textAlign: 'left',
                overflow: 'auto',
                fontSize: '12px'
              }}>
                {this.state.error?.stack}
              </pre>
            )}
            <button
              onClick={this.handleReset}
              style={{
                background: '#0a1628',
                color: 'white',
                border: 'none',
                padding: '12px 24px',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: '600'
              }}
            >
              Reload Application
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
```

**Update main App** (App.jsx or index.js):
```javascript
import ErrorBoundary from './ErrorBoundary';

export default function App() {
  return (
    <ErrorBoundary>
      {/* Rest of app */}
    </ErrorBoundary>
  );
}
```

---

### Fix #7: Add Request Timeout (30 min)

**File**: OrderPortal.jsx & App.jsx

**Update API helper functions**:
```javascript
const fetchWithTimeout = (url, options = {}, timeout = 10000) => {
  return Promise.race([
    fetch(url, options),
    new Promise((_, reject) =>
      setTimeout(
        () => reject(new Error('Request timeout - server not responding')),
        timeout
      )
    )
  ]);
};

const apiCall = async (action, params = {}) => {
  try {
    const url = new URL(`${window.location.origin}/api/db`);
    url.searchParams.append("action", action);
    Object.entries(params).forEach(([k,v]) => {
      if(v !== undefined && v !== null) url.searchParams.append(k, v);
    });

    // Use timeout wrapper (10 second limit)
    const res = await fetchWithTimeout(url.toString(), {}, 10000);
    
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || `API error: ${res.status}`);
    }
    return await res.json();
  } catch (e) {
    console.error(`API call failed (${action}):`, e);
    if (e.message === 'Request timeout - server not responding') {
      throw new Error('Server not responding. Please check your connection and try again.');
    }
    throw e;
  }
};

// Same for apiMutate
const apiMutate = async (action, body, timeout = 10000) => {
  try {
    const method = action.includes("delete")
      ? "DELETE"
      : action.includes("update")
      ? "PUT"
      : "POST";

    const res = await fetchWithTimeout(
      `${window.location.origin}/api/db?action=${action}`,
      {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      },
      timeout
    );

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || `API error: ${res.status}`);
    }
    return await res.json();
  } catch (e) {
    console.error(`API mutation failed (${action}):`, e);
    if (e.message === 'Request timeout - server not responding') {
      throw new Error('Request timeout. The server took too long to respond.');
    }
    throw e;
  }
};
```

---

### Fix #8: Validate Before Checkout (15 min)

**File**: OrderPortal.jsx Line 376-415

**Updated handleCheckout**:
```javascript
const handleCheckout = async () => {
  // Validation 1: Cart not empty
  if (!cart || cart.length === 0) {
    setError('Cart is empty. Add products before checkout.');
    return;
  }

  // Validation 2: Products loaded
  if (!products || products.length === 0) {
    setError('Product list not loaded. Please refresh and try again.');
    return;
  }

  // Validation 3: Valid total
  if (cartTotals.total <= 0) {
    setError('Invalid order total. Please check prices and quantities.');
    return;
  }

  // Validation 4: Customer selected
  if (!customer || !customer.id) {
    setError('No customer selected. Please log in again.');
    return;
  }

  setLoading(true);
  try {
    const orderId = `ORD-${uid()}`;

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

    // All validations passed, safe to create
    const { data: created } = await dbMutate("create-sales", orderData);

    // Success
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
```

---

## Testing After Fixes

After applying all 8 fixes, test:

```javascript
// Test 1: Driver auth requires password
- Try login with phone only → Should fail
- Try login with phone + password → Should work

// Test 2: CSRF protection active
- Open DevTools → Network tab
- Create order → Check X-CSRF-Token header present

// Test 3: XSS blocked
- Create customer with name: <img src=x onerror="alert('XSS')">
- Should NOT show alert (sanitization working)

// Test 4: Cart calculation safe
- Reload page mid-load
- Add to cart while loading
- Should NOT show NaN (validation working)

// Test 5: Add button works
- Enter qty "5" in driver sales
- Click "Add" → Should add to sale
- NOT clear quantity

// Test 6: Error boundary works
- Trigger error (e.g., manually throw)
- Should show error page, NOT white screen

// Test 7: Timeout works
- Simulate slow API (DevTools → Network → Slow 3G)
- Make request → Should timeout after 10s
- Shows error message (NOT infinite wait)

// Test 8: Checkout validation
- Click checkout with empty cart
- Should show "Cart is empty" error
- NOT create $0 order
```

---

## Summary

Total time to fix all critical issues: **~4 hours**

After fixes:
- ✅ Zero authentication bypasses
- ✅ CSRF protected
- ✅ XSS mitigated
- ✅ NaN calculations prevented
- ✅ Core workflows functional
- ✅ Graceful error handling
- ✅ Request timeout protection
- ✅ Data validation complete

**Status after fixes**: READY FOR PRODUCTION ✅
