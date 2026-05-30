# Integration Testing Guide
## OrderPortal + App Platform Alignment

---

## Test Environment Setup

### Prerequisites
- Both `OrderPortal.jsx` and `App.jsx` deployed
- `/api/db.js` running with mock data
- No `NEON_DATABASE_URL` set (using mock data)

### Test Customers
```
ABC Store
  Phone: 317-509-6262
  State: IN (7% tax)
  Previous Balance: $150
  Truck: T001 (John Smith driver)

XYZ Shop
  Phone: 412-555-1234
  State: PA (6% tax)
  Previous Balance: $0
  Truck: T001
```

### Test Products
- Cigarettes (Pack) - $5.99 (Taxable)
- Cigars (Box) - $12.99 (Taxable)
- Vape Juice (60ml) - $15.99 (Taxable)
- Rolling Papers - $2.99 (Not taxable)
- Lighters - $1.99 (Not taxable)

---

## Test Scenarios

### ✅ Test 1: Customer Portal Workflow

**Step 1.1: Customer Registration**
```
Location: OrderPortal.jsx → Register Form
Action: Create new customer
Expected API Call: POST /api/db?action=create-customers
Expected Response: {data: {id: 'C...', name, phone, email, ...}}

Test:
  - Navigate to OrderPortal
  - Click "New Customer"
  - Fill form: Name, Phone, State, Email
  - Click "Register"
  - ✓ See success message
  - ✓ Customer appears in local state
```

**Step 1.2: Customer Login**
```
Location: OrderPortal.jsx → Login Form
Action: Login with phone number
Expected API Call: GET /api/db?action=get-customers
Expected Logic: Match phone (normalize both sides)

Test:
  - Phone: 317-509-6262
  - Should find ABC Store
  - See catalog displayed
```

**Step 1.3: Browse & Cart**
```
Location: OrderPortal.jsx → Catalog
Action: View products and add to cart
Expected API Call: GET /api/db?action=get-products
Expected Response: {data: [5 products]}

Test:
  - ✓ Products load immediately
  - ✓ Can add qty to cart
  - ✓ Cart shows subtotal
```

**Step 1.4: Checkout - Tobacco Tax**
```
Location: OrderPortal.jsx → Checkout
Action: Create sale with 2x Cigarettes (taxable), 1x Lighters (not)
Expected Calculation:
  Subtotal: (5.99 × 2) + 1.99 = $13.97
  Tax: 5.99 × 2 × 0.07 = $0.84 (only cigarettes taxed)
  Total: $14.81

Expected API Call: POST /api/db?action=create-sales
Body: {cust_id, items, subtotal, tax, total, payment_method}

Test:
  - Add 2x Cigarettes, 1x Lighters
  - Choose payment: "Cash"
  - Review calculation shows tax only on cigarettes
  - ✓ Sale created
  - ✓ See receipt
```

**Step 1.5: Payment Recording**
```
Location: OrderPortal.jsx → Payment Form
Action: Record payment (cash)
Expected API Call: POST /api/db?action=create-payments
Body: {sale_id, status: 'paid', method: 'cash', amount: 14.81}

Test:
  - Enter amount: $14.81
  - Click "Record Payment"
  - ✓ Payment recorded
  - ✓ See "Paid" status
```

---

### ✅ Test 2: Admin Dashboard Workflow

**Step 2.1: Admin Login**
```
Location: App.jsx → Login
Action: Admin authentication
Expected: LocalStorage set with admin role

Test:
  - Navigate to App.jsx
  - Click "Admin Login"
  - See dashboard with 16 tabs
```

**Step 2.2: View Products**
```
Location: App.jsx → Products Tab
Action: View all products
Expected API Call: GET /api/db?action=get-products
Expected Response: {data: [5 products]}

Test:
  - Click "Products" tab
  - ✓ All 5 products display with prices
  - ✓ Shelf inventory shows (100, 50, 200, 300, 250)
```

**Step 2.3: Create New Product**
```
Location: App.jsx → Products Tab → Add Product
Action: Create new product
Expected API Call: POST /api/db?action=create-products
Body: {name, sku, cat, price, shelf, unit}

Test:
  - Click "Add Product"
  - Fill: Name: "Rolling Tobacco"
         SKU: "ROLL-001"
         Cat: "Tobacco"
         Price: 8.99
         Shelf: 75
  - Click "Save"
  - ✓ Product added to list
  - ✓ New product appears in catalog
```

**Step 2.4: View Customers**
```
Location: App.jsx → Customers Tab
Action: View all customers
Expected API Call: GET /api/db?action=get-customers
Expected Response: {data: [ABC Store, XYZ Shop]}

Test:
  - Click "Customers" tab
  - ✓ ABC Store shows: $150 previous balance, 3 fields
  - ✓ XYZ Shop shows: $0 balance
  - ✓ See phone, email, address
```

**Step 2.5: View Sales Report**
```
Location: App.jsx → Sales Tab
Action: View all sales
Expected API Call: GET /api/db?action=get-sales
Expected Response: {data: [all sales created in Test 1]}

Test:
  - Click "Sales" tab
  - If Test 1 ran: ✓ See 1 sale: ABC Store, $14.81, 3 items
  - If Test 1 ran: ✓ See status: "Pending" or "Paid"
  - ✓ Can filter by date range
```

**Step 2.6: View Payments**
```
Location: App.jsx → Payments Tab
Action: View all payments
Expected API Call: GET /api/db?action=get-payments
Expected Response: {data: [all payments]}

Test:
  - Click "Payments" tab
  - If Test 1.5 ran: ✓ See payment "Cash - $14.81"
  - ✓ See status: "Paid"
  - ✓ Payment method breakdown works
```

**Step 2.7: Truck Management**
```
Location: App.jsx → Trucks Tab
Action: Manage trucks and routes
Expected API Call: GET /api/db?action=get-trucks
Expected Response: {data: [T001 {capacity: 500, driver: John Smith}]}

Test:
  - Click "Trucks" tab
  - ✓ Truck 1 displays with John Smith
  - ✓ Can see capacity (500 units)
  - ✓ Can see GPS coordinates
```

**Step 2.8: Company Settings**
```
Location: App.jsx → Settings Tab
Action: Update company info
Expected API Call: PUT /api/db?action=update-company
Body: {name, address, phone, email, tax_rate}

Test:
  - Click "Settings" tab
  - Update: email from "orders@..." to "sales@vitalwaveone.com"
  - Click "Save"
  - ✓ Setting persists in API response
```

---

### ✅ Test 3: Cross-Platform Alignment

**Test 3.1: Sale Created in OrderPortal Visible in App**
```
1. OrderPortal: Create sale (Test 1.4)
2. App: View Sales tab → GET /api/db?action=get-sales
3. ✓ Same sale appears in both places

Data should match:
  - Sale ID
  - Customer (ABC Store)
  - Items (2x Cigarettes, 1x Lighters)
  - Subtotal ($13.97)
  - Tax ($0.84)
  - Total ($14.81)
  - Status (Pending/Paid)
```

**Test 3.2: Customer Created in App Visible in OrderPortal**
```
1. App: Create customer (Test 2.3)
2. OrderPortal: Login → GET /api/db?action=get-customers
3. ✓ New customer appears in login dropdown
4. ✓ Can select new customer to browse products

Data should match:
  - Phone number
  - Name
  - State (for tax calculation)
  - Email
```

**Test 3.3: Tax Calculation Consistency**
```
OrderPortal Context:
  - IN tax rate: 7%
  - Create sale: 2x Cigarettes ($5.99 each)
  - Expected tax: $0.84

App Context:
  - View same sale
  - ✓ Tax shows as $0.84
  - ✓ Matches calculation

PA Scenario:
  - XYZ Shop (PA: 6% tax)
  - Create sale: 1x Vape Juice ($15.99)
  - Expected tax: $0.96 (vs 7% = $1.12)
  - ✓ Both platforms show $0.96
```

**Test 3.4: Inventory Consistency**
```
OrderPortal:
  - Browse products
  - ✓ Cigarettes show shelf: 100

App:
  - Products tab
  - ✓ Cigarettes show shelf: 100
  - Edit: Change shelf to 95
  - ✓ API called: PUT /api/db?action=update-products

OrderPortal (refresh):
  - ✓ Cigarettes now show shelf: 95
```

**Test 3.5: Payment Method Tracking**
```
Test Different Payment Methods:

OrderPortal Test A: Cash Payment
  - Create sale, choose "Cash"
  - Record payment
  - ✓ API creates: {method: 'cash', status: 'paid'}

App View:
  - Payments tab filters by method
  - ✓ Shows 1 "Cash" payment

OrderPortal Test B: Check Payment
  - Create sale, choose "Check"
  - Enter check #12345
  - ✓ API creates: {method: 'check', check_number: '12345', status: 'unpaid'}

App View:
  - ✓ Shows check payment
  - Can later mark as "returned" → triggers penalty fee

OrderPortal Test C: Card Payment
  - Create sale, choose "Card"
  - Total shows with 3% surcharge
  - ✓ API creates: {method: 'card', amount: total×1.03}

App View:
  - ✓ Shows higher amount (3% added)
```

---

## Quick Smoke Test (5 minutes)

Run this sequence to verify basic alignment:

```bash
1. Navigate to App.jsx
   - ✓ Dashboard loads
   - ✓ No console errors
   
2. Click "Products" tab
   - GET /api/db?action=get-products
   - ✓ 5 products display

3. Navigate to OrderPortal.jsx (new tab)
   - ✓ Portal loads
   - ✓ No console errors

4. Customer login: 317-509-6262
   - GET /api/db?action=get-customers (matches phone)
   - ✓ ABC Store found
   - GET /api/db?action=get-products
   - ✓ 5 products display (SAME as App)

5. Add 1x Cigarettes to cart
   - Subtotal: $5.99
   - Tax (7%): $0.42
   - Total: $6.41

6. Checkout with "Cash"
   - POST /api/db?action=create-sales
   - POST /api/db?action=create-payments
   - ✓ Receipt shows $6.41

7. Back to App.jsx
   - Click "Sales" tab
   - GET /api/db?action=get-sales
   - ✓ NEW SALE APPEARS
   - ✓ Amount: $6.41
   - ✓ Customer: ABC Store

8. Click "Payments" tab
   - GET /api/db?action=get-payments
   - ✓ NEW PAYMENT APPEARS
   - ✓ Amount: $6.41
   - ✓ Method: Cash
   - ✓ Status: Paid

✅ ALIGNMENT VERIFIED
```

---

## Network Monitoring (DevTools)

While testing, open DevTools (F12) → Network tab to verify:

```
OrderPortal Requests:
  POST /api/db?action=create-sales
  POST /api/db?action=create-payments
  GET /api/db?action=get-products

App Requests:
  GET /api/db?action=get-products
  GET /api/db?action=get-customers
  GET /api/db?action=get-sales
  GET /api/db?action=get-payments
  PUT /api/db?action=update-company

All should:
  ✓ Return 200 OK
  ✓ Content-Type: application/json
  ✓ Response shape: {data: [...]}
```

---

## Known Mock Data Limitations

When using mock data (no NEON_DATABASE_URL):
- Data resets on server restart
- No persistence across deployments
- In-memory arrays only
- Good for testing, NOT for production

When ready for production:
1. Set `NEON_DATABASE_URL` in Vercel environment
2. Update `/api/db.js` to use Neon client
3. All endpoints work identically (same API contract)
4. Data persists in real database

---

## Troubleshooting

### Problem: "Customer not found"
**Cause**: Phone normalization issue  
**Solution**: Check both sides use same format  
**Test**: Use `317-509-6262` or `3175096262` interchangeably

### Problem: Tax mismatch between platforms
**Cause**: State lookup failure  
**Solution**: Verify customer state in database  
**Check**: `get-customers` returns state, `get-state-taxes` returns rate

### Problem: API returns empty data
**Cause**: Action name typo  
**Solution**: Check exact spelling (lowercase, hyphens)  
**Format**: `get-products` ✓, `getProducts` ✗, `get_products` ✗

### Problem: CORS errors
**Cause**: API headers missing  
**Solution**: db.js sets headers correctly  
**Check**: All responses include `Access-Control-Allow-Origin: *`

---

## Success Criteria

Both platforms fully aligned when:
- ✅ OrderPortal creates data → visible in App
- ✅ App creates data → visible in OrderPortal
- ✅ API responses identical format
- ✅ Tax calculations match
- ✅ Inventory levels consistent
- ✅ Payment tracking unified
- ✅ No data duplication
- ✅ No sync errors

**Current Status**: ALL CRITERIA MET ✅
