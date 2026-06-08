# OrderPortal Supabase → Neon Migration Guide

## Overview
Migrating from Supabase SDK to Neon PostgreSQL with Vercel Functions API layer.

---

## Required Vercel API Routes

### 1. PRODUCTS
**GET /api/db?action=get-products**
- Returns: All products with `id, name, sku, cat, price, shelf, unit`

**PUT /api/db?action=update-product-shelf**
- Body: `{pid: string, newShelf: number}`
- Updates shelf inventory

### 2. CUSTOMERS
**GET /api/db?action=get-customers**
- Returns: All customers with `id, name, state, phone, email, notes, previous_balance`

**GET /api/db?action=get-customer&id=C001**
- Returns: Single customer

**POST /api/db?action=create-customer**
- Body: `{name, address, city, zip, state, phone, email, owner_name}`
- Returns: Customer ID

### 3. SALES
**GET /api/db?action=get-sales&cust_id=C001**
- Returns: Sales for customer

**POST /api/db?action=create-sale**
- Body: `{cust_id, items: [{pid, qty}], subtotal, tax, total, payment_method, date, notes}`
- Returns: Sale ID

**PUT /api/db?action=update-sale-payment**
- Body: `{sale_id, status, payment_method, amount}`

### 4. PAYMENTS
**GET /api/db?action=get-payments&sale_id=S001**
- Returns: Payments for sale

**POST /api/db?action=create-payment**
- Body: `{sale_id, status, method, amount, check_number, zelle_ref, receipt_url}`

**PUT /api/db?action=update-payment**
- Body: `{sale_id, status, method, amount}`

### 5. STATE TAXES
**GET /api/db?action=get-state-taxes**
- Returns: `[{id: "IN", rate: 7, exempt: false}]`

### 6. COMPANY
**GET /api/db?action=get-company**
- Returns: `{name, address, phone, email, tax_rate, stripe_key}`

### 7. TRUCKS
**GET /api/db?action=get-trucks**
- Returns: All trucks with `id, name, driver_id`

**GET /api/db?action=get-truck&id=T001**
- Returns: Single truck

### 8. LOADS
**GET /api/db?action=get-loads&truck_id=T001&status=out**
- Returns: Truck loads

**POST /api/db?action=create-load**
- Body: `{truck_id, items: [{pid, qty}], status}`

**PUT /api/db?action=update-load**
- Body: `{load_id, status, items}`

### 9. EXPENSES
**GET /api/db?action=get-expenses&truck_id=T001**
- Returns: Expenses for truck

**POST /api/db?action=create-expense**
- Body: `{truck_id, category, amount, description, receipt_url}`

### 10. WALK-IN REGISTRATIONS
**GET /api/db?action=get-walkin-registrations**
- Returns: Walk-in registrations

**POST /api/db?action=create-walkin-registration**
- Body: `{name, email, phone, state, role}`

**PUT /api/db?action=update-walkin-registration**
- Body: `{id, status}`

### 11. PROMOTIONS
**GET /api/db?action=get-promotion&code=SUMMER20**
- Returns: Promotion data

**PUT /api/db?action=increment-promo-uses**
- Body: `{code}`

---

## Edge Functions to Keep

### 1. POST /api/send-otp
- Body: `{phone, type: "driver"|"walkin"}`
- Sends WhatsApp OTP
- Returns: `{sent: true, test_code?: "123456"}`

### 2. POST /api/send-whatsapp
- Body: `{phone, message, type: "order"|"payment"|"delivery"}`
- Sends WhatsApp notification

### 3. POST /api/send-invoice-email
- Body: `{email, invoice_html, order_id}`
- Sends email via Gmail SMTP

### 4. POST /api/create-payment-intent
- Body: `{amount, order_id, customer_email}`
- Returns: `{client_secret, amount}`
- Creates Stripe payment intent

---

## Supabase → Fetch Replacements

### Before (Supabase)
```javascript
const {data: products} = await supabase.from("products").select("*");
```

### After (Fetch)
```javascript
const res = await fetch('/api/db?action=get-products');
const {data: products} = await res.json();
```

### Before (Supabase Insert)
```javascript
await supabase.from("sales").insert({cust_id, items, total});
```

### After (Fetch)
```javascript
await fetch('/api/db?action=create-sale', {
  method: 'POST',
  headers: {'Content-Type': 'application/json'},
  body: JSON.stringify({cust_id, items, total})
});
```

### Before (Supabase Update)
```javascript
await supabase.from("products").update({shelf: 50}).eq("id", pid);
```

### After (Fetch)
```javascript
await fetch('/api/db?action=update-product-shelf', {
  method: 'PUT',
  headers: {'Content-Type': 'application/json'},
  body: JSON.stringify({pid, newShelf: 50})
});
```

### Before (Edge Function)
```javascript
await supabase.functions.invoke("send-whatsapp", {
  body: {phone, message}
});
```

### After (Fetch)
```javascript
await fetch('/api/send-whatsapp', {
  method: 'POST',
  headers: {'Content-Type': 'application/json'},
  body: JSON.stringify({phone, message})
});
```

---

## Authentication Changes

### Before (Supabase Auth)
```javascript
const {data} = await supabase.auth.signInWithPassword({email, password});
const {data: profile} = await supabase.from("profiles").select("*").eq("id", data.user.id);
```

### After (Neon Direct + localStorage)
```javascript
const res = await fetch('/api/auth/driver-login', {
  method: 'POST',
  body: JSON.stringify({phone, password})
});
const {driver_id, truck_id, name} = await res.json();
localStorage.setItem('driver', JSON.stringify({driver_id, truck_id, name}));
```

---

## Database Schema (Neon PostgreSQL)

### Tables Needed
- `customers` (id, name, address, phone, email, state, owner_name, previous_balance, notes)
- `products` (id, name, sku, cat, price, shelf, unit)
- `sales` (id, cust_id, items, subtotal, tax, total, status, date, payment_method, notes, previous_balance, check_penalty_applied)
- `payments` (id, sale_id, status, method, amount, check_number, zelle_ref, receipt_url, collected_at)
- `trucks` (id, name, driver_id)
- `drivers` (id, name, phone, email, truck_id, password_hash)
- `loads` (id, truck_id, items, status, created_at)
- `expenses` (id, truck_id, category, amount, description, receipt_url, created_at)
- `walkin_registrations` (id, name, email, phone, state, status, created_at)
- `state_taxes` (id, rate, exempt, notes)
- `company` (id, name, address, phone, email, tax_rate)
- `promotions` (id, code, discount, active, uses, created_at)

---

## Migration Steps

1. ✅ Extract all Supabase calls
2. ⏳ Build Vercel API routes (/api/db, /api/auth, /api/send-*)
3. ⏳ Create Neon database schema
4. ⏳ Adapt OrderPortal.jsx (replace supabase calls with fetch)
5. ⏳ Test each flow (customer, driver, walk-in)
6. ⏳ Deploy to Vercel
7. ⏳ QA all features

---

## Progress Tracking

- [x] API Design
- [ ] Vercel API Routes (Starts Next)
- [ ] Database Schema
- [ ] OrderPortal Migration
- [ ] Testing & Deployment
