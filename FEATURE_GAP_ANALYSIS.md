# OrderPortal - Feature Gap Deep Dive

**Original:** 4941 lines (Supabase + full features)  
**Current:** ~1000 lines (Neon API + stubs only)  
**Gap:** 3941 lines = 80% missing

---

## DETAILED MISSING FEATURES

### 1. DRIVER INVOICE VIEW (195-237 lines)
**What it does:**
- Shows driver sale receipt with customer details
- Displays itemized table (product, qty, effective price, tax)
- Shows payment status (paid/unpaid)
- Handles tax by customer state
- Shows "returned check" penalties if applicable

**Current Status:** ❌ NOT IMPLEMENTED
**Why it matters:** Driver needs to print/email receipt to customer after sale

**Code example from original:**
```javascript
function DriverInvoiceView({sale, customers, products, co, driver, stateTaxes}){
  const cust = customers.find(c=>c.id===sale.cust_id);
  const stData = stateTaxes?.find(s=>s.id===stateId);
  const stateRate = stData?.exempt ? 0 : parseFloat(stData?.rate||co?.tax_rate||0);
  const tax = parseFloat((sale.items.reduce((a,i)=>{
    const p=products.find(x=>x.id===i.pid);
    return isTaxableProd(p)?a+(getEffectivePrice(cust,p)||0)*i.qty:a;
  },0)*stateRate/100).toFixed(2));
  // ... render invoice with tax by state
}
```

---

### 2. CUSTOMER ACCOUNT VIEW (238-485 lines)
**What it does:**
- Shows customer AR aging (0-30, 30-60, 60+ days)
- Lists all invoices with payment status
- Shows total paid vs total due
- Shows returned checks separately
- Allow mark payment as paid
- Allows add credit memo
- Shows custom pricing for this customer

**Current Status:** ⚠️ PARTIAL (shows basic info, missing AR aging)
**Why it matters:** Admin needs to track which customers owe what and for how long

**Code example from original:**
```javascript
function CustomerAccountView({selCust,supabase,co,setStep,products=[]}){
  const invoices = ...; // all sales for customer
  const payments = ...; // all payments
  const totalDue = invoices
    .filter(s=>!payments.find(p=>p.sale_id===s.id&&p.status==="paid"))
    .reduce((a,s)=>a+parseFloat(s.total||0),0);
  // ... show aging buckets, returned checks, custom pricing
}
```

---

### 3. DRIVER ROUTE TAB (487-590 lines)
**What it does:**
- Shows today's scheduled stops from customer notes
- Check-off system for visited stops
- Navigate to customer address (Google Maps integration)
- Shows orders placed at each stop
- Route completion percentage

**Current Status:** ❌ NOT IMPLEMENTED
**Why it matters:** Driver needs roadmap for the day with stops ordered by geography

**Missing logic:**
- Parse delivery schedule from customer notes: `SCHEDULE:{day:1,order:1}`
- Filter customers assigned to driver's truck_id
- Order by route sequence
- Track which stops completed

---

### 4. DRIVER TRUCK LOADING TAB (694-773 lines)
**What it does:**
- Verify truck inventory from shelf
- Validate load doesn't exceed truck capacity
- Deduct from shelf on load confirmation
- Show remaining shelf inventory after each load
- Physical unit vs case tracking

**Current Status:** ❌ NOT IMPLEMENTED
**Why it matters:** Driver can't sell what they don't have; shelf must be updated

**Missing logic:**
```javascript
const confirmLoad = async () => {
  const loadItems = products.filter(p=>items[p.id]>0)
    .map(p=>({pid:p.id,qty:parseInt(items[p.id])}));
  const overLimit = loadItems.find(i=>{
    const p=products.find(x=>x.id===i.pid);
    return i.qty > (p?.shelf || 0); // Can't load more than available
  });
  if (overLimit) throw new Error("Not enough stock");
  // Update shelf: shelf -= qty for each product
};
```

---

### 5. DRIVER SALES TAB - CORE MISSING (775-1420 lines)
**What it does:**

#### 5a. Customer Selection (812-850)
- Show customers assigned to driver
- Show each customer's outstanding AR balance
- Show number of unpaid invoices
- Show "due today" orders

```javascript
const handleCustSelect = async (custId) => {
  const unpaidIds = new Set(unpaidPmts.map(p=>p.sale_id));
  const unpaidSales = custSales.filter(s=>unpaidIds.has(s.id));
  const totalUnpaid = unpaidSales.reduce((a,s)=>a+s.total,0);
  // Show: "ABC Store - Balance: $500.00 (3 invoices)"
};
```

**Current Status:** ❌ NOT IMPLEMENTED

#### 5b. Product Selection & Barcode (903-921)
- Barcode scanner integration (reads SKU from product)
- Quick lookup by product name or ID
- Shows available qty (loaded - sold)

```javascript
const handleScan = (code) => {
  const match = inStockProducts.find(p=>
    p.sku?.toLowerCase()===code.toLowerCase() ||
    p.id?.toLowerCase()===code.toLowerCase()
  );
  if (match) {
    setSaleItems({...saleItems, [match.id]: (saleItems[match.id]||0)+1});
  }
};
```

**Current Status:** ❌ NOT IMPLEMENTED

#### 5c. Tax Calculation (999-1010)
- Per-item tax (only taxable products)
- State-specific tax rates from database
- Handle tax-exempt states
- Calculate profit margin per item

```javascript
const saleTax = (() => {
  const st = driverData.stateTaxes?.find(s=>s.id===(createdSale.state||""));
  const stateRate = st?.exempt ? 0 : parseFloat(st?.rate||7);
  const taxable = (createdSale.items||[]).reduce((a,i)=>{
    const p = products.find(x=>x.id===i.pid);
    return isTaxableProd(p)?a+(p?.price||0)*i.qty:a;
  },0);
  return (taxable * stateRate / 100).toFixed(2);
})();
```

**Current Status:** ⚠️ PARTIAL (calculates tax but missing profit/margin)

#### 5d. Payment Collection (1037-1090)
**Multiple payment methods:**
- **Cash:** Full payment, record amount
- **Check:** Store check number, bank name, date (postdated support)
- **Card:** Add 3% surcharge to total, create Stripe payment intent
- **Zelle:** Store reference ID
- **Account (AR):** Mark for later collection, apply to previous balance

```javascript
case 'check':
  // Store check #, can mark as returned later
  const payData = {
    sale_id: saleRecord.id,
    status: "unpaid",
    method: "check",
    check_number: checkNum,
    amount: total,
  };
  break;
case 'card':
  // Add 3% surcharge
  const cardTotal = total * 1.03;
  const paymentIntent = await createStripeIntent(cardTotal);
  break;
case 'account':
  // Apply to customer AR, collect later
  const newAR = customerPreviousBalance + total;
  break;
```

**Current Status:** ❌ MISSING (only shows placeholder)

#### 5e. Returned Check Penalties (1010-1089)
- Mark check as returned
- Apply 30-35% penalty fee
- Store bank name and return date
- Track returned check history per customer

**Current Status:** ❌ NOT IMPLEMENTED
**Why it matters:** Banks charge fees; need to recover costs

#### 5f. Previous Balance Collection (834-850)
- Show customer's outstanding AR from previous sales
- Allow applying payment to old balance first
- Track what's paid vs unpaid across all invoices

```javascript
const unpaidSales = custSales.filter(s=>!payments.find(p=>p.sale_id===s.id&&p.status==="paid"));
const totalUnpaid = unpaidSales.reduce((a,s)=>a+s.total,0);
// Show: "$500 previous balance from 3 unpaid invoices"
```

**Current Status:** ❌ NOT IMPLEMENTED

---

### 6. DRIVER WALK-IN TAB (1421-1680 lines)
**What it does:**
- New one-time customer entry
- Phone, email, state, custom pricing
- Lookup if customer registered before (avoid duplicates)
- Show previous purchases from same customer
- Full sales flow (same as customer sales)
- Receipt PDF generation

**Current Status:** ❌ NOT IMPLEMENTED
**Why it matters:** Driver makes sales to walk-in stores (one-time customers)

---

### 7. DRIVER STATS TAB (591-693 lines)
**What it does:**
- Today's sales: amount, items, cash collected
- Last 7 days: revenue trend chart
- This month: total revenue, total items
- Top 5 products sold (by quantity)
- Top 5 customers (by revenue)
- Performance metrics: avg order value, units per stop

**Code snippet:**
```javascript
function DriverStatsTab({driverData, products}){
  const todaySales = sales.filter(s=>new Date(s.created_at).toDateString()===now.toDateString());
  const last7 = Array.from({length:7},(_,i)=>{
    const d = new Date(now);
    d.setDate(d.getDate()-i);
    return {
      date: d.toLocaleDateString(),
      rev: sales.filter(s=>new Date(s.created_at).toDateString()===d.toDateString())
        .reduce((a,s)=>a+(s.total||0),0)
    };
  });
  const topProds = Object.entries(prodQtys)
    .sort((a,b)=>b[1]-a[1])
    .slice(0,5); // Top 5
  // ... render charts
}
```

**Current Status:** ❌ NOT IMPLEMENTED

---

### 8. DRIVER EXPENSES TAB (1984-2025 lines)
**What it does:**
- Gas, meals, tolls, repairs
- Receipt photo capture
- Category breakdown
- Daily summary
- Reimbursement tracking

**Current Status:** ⚠️ STUB (shows form but doesn't save)

---

### 9. CUSTOM PRICING (85-86, 1492-1498, 1243-1250)
**What it does:**
- Store custom price per customer in notes field
- Parse: `CUSTOM_PRICES:{id:price}`
- Use custom price if available, else default
- Per-product per-customer pricing

```javascript
const parseCustomPrices = cust => {
  try {
    const m = (cust?.notes||"").match(/CUSTOM_PRICES:({.*?})/);
    return m ? JSON.parse(m[1]) : {};
  } catch {
    return {};
  }
};

const getEffectivePrice = (cust,p) => {
  if (!cust || !p) return p?.price || 0;
  const cp = parseCustomPrices(cust);
  const custom = cp[p.id];
  return (custom && parseFloat(custom) > 0) ? parseFloat(custom) : (p?.price || 0);
};
```

**Current Status:** ❌ NOT IMPLEMENTED

---

### 10. PDF GENERATION & EXPORT (445, 1138, 3138, 4111)
**What it does:**
- jsPDF invoice generation (proforma + driver sale receipt + walk-in receipt)
- Include: company header, bill-to, items table, tax, total
- Email PDF to customer
- Print to thermal receipt printer

**Current Status:** ❌ NOT IMPLEMENTED

---

### 11. WHATSAPP NOTIFICATIONS (985, 1578, 2937)
**What it does:**
- Notify customer when sale created
- Send order confirmation
- Send payment received notification

```javascript
await supabase.functions.invoke("send-whatsapp",{
  body:{
    phone: cust.phone,
    message: `Order #${saleRecord.id} created for ${total}. Awaiting payment.`
  }
});
```

**Current Status:** ❌ NOT IMPLEMENTED

---

### 12. EDGE FUNCTIONS (2230-2244, 2715-2750, 2884-2905, 2935-2986)

| Function | Purpose | Status |
|----------|---------|--------|
| `send-otp` | WhatsApp OTP for login | ❌ |
| `send-whatsapp` | Order/payment notifications | ❌ |
| `send-invoice-email` | Email PDF invoices | ❌ |
| `create-payment-intent` | Stripe card payment | ❌ |
| `verify-admin` | Check if phone is admin | ❌ |

---

## SUMMARY TABLE

| Feature | Lines | Original | Current | Gap |
|---------|-------|----------|---------|-----|
| Customer Portal | 800 | ✅ Partial | ✅ Basic | ~200 |
| Driver Route Tab | 100 | ✅ Full | ❌ None | 100 |
| Driver Load Tab | 80 | ✅ Full | ❌ None | 80 |
| Driver Sales Core | 400 | ✅ Full | ❌ Stub | 400 |
| Driver Walk-in | 250 | ✅ Full | ❌ None | 250 |
| Driver Stats | 100 | ✅ Full | ❌ None | 100 |
| Driver Expenses | 40 | ✅ Full | ⚠️ Stub | 35 |
| Custom Pricing | 50 | ✅ Full | ❌ None | 50 |
| Payment Mgmt | 150 | ✅ Full | ❌ None | 150 |
| PDF Generation | 200 | ✅ Full | ❌ None | 200 |
| Edge Functions | 300 | ✅ Full | ❌ None | 300 |
| Returned Checks | 80 | ✅ Full | ❌ None | 80 |
| AR Tracking | 100 | ✅ Full | ⚠️ Basic | 75 |
| **TOTAL** | **2750** | | | **2020** |

---

## RECOMMENDATION

**DO NOT continue piecemeal.** The 2000+ line gap means:
- 60+ interconnected features missing
- Payment system completely absent
- Driver workflow incomplete
- Database schema untested

**Better approach:**
1. Extract complete DriverSellTab from original (400 lines)
2. Adapt for Neon/Vercel APIs
3. Add all payment methods (cash/check/card/Zelle/AR)
4. Add returned check handling
5. Plug in 5 other driver tabs
6. Test end-to-end driver flow
7. Then customer portal refinements

**Estimated work:**
- Original: 4941 lines
- What we can salvage: 3000+ lines (logic + structure)
- New code for Neon API: ~1000 lines
- **Total effort: 2-3 days** of focused rewriting

**Current approach (bottom-up stubs):** Would take 4-5 weeks to rebuild from scratch with same quality
