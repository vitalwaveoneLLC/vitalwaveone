# Tenant Isolation Security Audit - VitalWaveOne

**Date**: May 27, 2026  
**Status**: ⚠️ PARTIALLY VULNERABLE - Critical fixes needed

---

## Executive Summary

The codebase uses **two different database client architectures**:

### ✅ **Admin Dashboard (App.jsx)** - PROPERLY SECURED
- Uses custom `db.js` client wrapper
- Automatically enforces `X-Tenant-ID` header on all requests
- Backend validates tenant_id at `/api/data/[table].js`
- **Result**: Proper tenant isolation

### ❌ **Customer & Driver Portals (OrderPortal.jsx)** - VULNERABLE
- Uses Supabase client directly (`supabase.from(...)`)
- Missing tenant_id filters on queries
- No X-Tenant-ID header enforcement
- **Result**: Cross-tenant data leakage risk

---

## Architecture Overview

### How Admin Dashboard Works (SECURE)

```
App.jsx 
  ↓ uses db.from()
db.js (Custom Wrapper)
  ↓ reads tenant_id from localStorage
  ↓ adds X-Tenant-ID header
API Request to /api/data/[table].js
  ↓ getTenant() validates X-Tenant-ID
  ↓ enforces WHERE tenant_id = $1
  ↓ BLOCKED_WRITE_COLS prevents tenant_id override
Neon PostgreSQL
  ↓ returns only this tenant's data
Response to App.jsx
```

**Key Files**:
- `src/db.js` (lines 10-31): `getHeaders()` reads tenant_id and adds header
- `api/data/[table].js` (line 139-141): `getTenant()` validates header
- `api/data/[table].js` (line 164): All SELECT queries include `WHERE tenant_id = $1`

---

### How Customer/Driver Portal Works (VULNERABLE)

```
OrderPortal.jsx
  ↓ uses supabase.from() directly
Supabase Client
  ↓ NO tenant_id filters on reads
  ↓ NO X-Tenant-ID header
PostgreSQL (relies on RLS policies)
  ↓ ❌ RLS policies NOT CONFIGURED
  ↓ Returns data from ALL tenants
Response to OrderPortal.jsx
```

**Issue**: The system relies on RLS (Row Level Security) policies that don't exist or aren't enforced.

---

## Detailed Findings

### Finding #1: Missing Tenant Filtering in Driver Login
**Severity**: 🔴 CRITICAL  
**Location**: `src/OrderPortal.jsx` lines 2288-2296  
**Status**: ✅ FIXED (as of this session)

**What Was Wrong**:
```javascript
// BEFORE - No tenant_id filter
const [truckR, custsR, loadsR, taxesR, pmtsR, coR, prodsR] = await Promise.all([
  supabase.from("trucks").select("*").eq("id",truckId).single(),
  supabase.from("products").select("*").order("name"), // ❌ ALL products from ALL tenants!
]);
```

**Impact**: Driver sees blank screen, products from other tenants could be leaked

**Fix Applied**:
```javascript
// AFTER - With tenant_id filter
const [truckR, custsR, loadsR, taxesR, pmtsR, coR, prodsR, salesR] = await Promise.all([
  supabase.from("trucks").select("*").eq("id",truckId).eq("tenant_id",tenantId).single(),
  supabase.from("products").select("*").eq("tenant_id",tenantId).order("name"), // ✅ This tenant only
]);
```

---

### Finding #2: Customer Portal Initial Load Has No Tenant Context
**Severity**: 🟠 HIGH  
**Location**: `src/OrderPortal.jsx` lines 2469-2475

**What's Wrong**:
```javascript
// No tenant_id specified - loads data for ALL tenants
const [pr, cu, co, ld, sa, rt, stx] = await Promise.all([
  supabase.from("products").select("*").order("cat").order("name"), // ❌ No tenant filter
  supabase.from("customers").select("*").order("name"),             // ❌ No tenant filter
  supabase.from("company").select("*").single(),                   // ❌ No tenant filter
  supabase.from("loads").select("*").eq("status","out"),           // ❌ No tenant filter
  supabase.from("sales").select("*"),                              // ❌ No tenant filter
  supabase.from("returns").select("*"),                            // ❌ No tenant filter
  supabase.from("state_taxes").select("*"),                        // ❌ No tenant filter
]);
```

**Impact**: 
- Customer portal displays products from all tenants
- Walk-in registrations can see customers from other tenants
- Inventory calculations include other tenants' data

**Root Cause**: This load happens BEFORE any authentication. The system needs to determine which tenant this portal belongs to.

**Recommended Fix**: 
Either:
1. Get tenant_id from URL parameter (`?tenant=xxx`), or
2. Get tenant_id from custom domain mapping, or
3. Move this load AFTER the user selects their tenant/company

---

### Finding #3: Inconsistent Database Client Usage
**Severity**: 🟠 HIGH  
**Location**: Entire `src/OrderPortal.jsx`

**What's Wrong**:
- Admin Dashboard uses `db.from()` (custom wrapper with tenant enforcement)
- OrderPortal uses `supabase.from()` (raw client with no tenant enforcement)
- Two different security models in same codebase

**Recommendation**: Migrate OrderPortal.jsx to use the custom `db.js` client for consistency.

**Change Required**:
```javascript
// BEFORE
import { db as supabase } from "./db";
const {data} = await supabase.from("sales").select("*");

// AFTER  
import { db } from "./db";
const {data} = await db.from("sales").select("*");
// Now includes automatic X-Tenant-ID header + server-side validation
```

---

### Finding #4: Invoice Link Handler Missing Tenant Verification
**Severity**: 🟠 HIGH  
**Location**: `src/OrderPortal.jsx` lines 2186-2192

**What's Wrong**:
```javascript
// Fetches invoice by ID without verifying it belongs to this tenant
const {data:sale}=await supabase.from("sales").select("*").eq("id",invoiceLink).maybeSingle();
```

**Impact**: Invoice link handler could leak invoices across tenants if invoice IDs are predictable

**Recommended Fix**:
```javascript
// Add tenant_id to the query after determining the tenant context
const {data:sale}=await db.from("sales").select("*")
  .eq("id",invoiceLink)
  .eq("tenant_id",tenantId)
  .maybeSingle();
```

---

### Finding #5: Walk-in Registration Queries Missing Tenant Filter
**Severity**: 🟡 MEDIUM  
**Location**: `src/OrderPortal.jsx` lines 2375, 2391

**What's Wrong**:
```javascript
// Loads registrations from ALL tenants
const {data:regs} = await supabase.from("walkin_registrations").select("*").eq("status","approved");
```

**Impact**: Walk-in registration handlers could process registrations from other tenants

---

## Supabase RLS Policies - NOT FOUND

**Critical Finding**: The codebase has NO Supabase RLS (Row Level Security) policies defined.

**Impact**:
- System relies entirely on application-level tenant filtering
- One bug = full cross-tenant data leak
- No database-level safety net

**Files Checked**:
- `migrations/0001_add_sessions_table.sql` - No RLS policies
- `migrations/0002_add_performance_indexes.sql` - No RLS policies
- `migrations/0003_add_audit_logs_table.sql` - No RLS policies
- No `0004_add_rls_policies.sql` file exists

**Recommendation**: Create database-level RLS policies as a second line of defense:

```sql
-- Example for sales table
ALTER TABLE sales ENABLE ROW LEVEL SECURITY;

CREATE POLICY sales_tenant_isolation ON sales
  FOR ALL USING (tenant_id = auth.jwt() -> 'tenant_id'::text)
  WITH CHECK (tenant_id = auth.jwt() -> 'tenant_id'::text);
```

---

## Security Matrix

| Component | Tenant Filter | X-Tenant-ID | Server Validation | RLS Policy | Status |
|-----------|:-------------:|:-----------:|:-----------------:|:----------:|--------|
| Admin Dashboard | ✅ Yes | ✅ Yes | ✅ Yes | ❌ No | 🟢 SECURE |
| Driver Portal | ✅ Yes (FIXED) | ❌ No* | ❌ No* | ❌ No | 🟡 PARTIAL |
| Customer Portal | ❌ No | ❌ No | ❌ No | ❌ No | 🔴 VULNERABLE |
| Walk-in Staff | ❌ No | ❌ No | ❌ No | ❌ No | 🔴 VULNERABLE |
| API Endpoint | ✅ Yes | ✅ Yes | ✅ Yes | ❌ No | 🟢 SECURE |

*Driver portal doesn't use API endpoint - uses Supabase directly

---

## Remediation Roadmap

### Phase 1: IMMEDIATE (Critical)
- [x] Fix driver login missing tenant_id filters (DONE)
- [ ] Migrate OrderPortal to use custom `db.js` client
- [ ] Add tenant_id filters to all remaining OrderPortal queries
- [ ] Fix invoice link handler tenant verification
- [ ] Fix walk-in registration queries

### Phase 2: SHORT TERM (High Priority)
- [ ] Create database-level RLS policies (defense in depth)
- [ ] Document tenant isolation architecture
- [ ] Add automated tenant isolation tests
- [ ] Audit all edge function queries for tenant filtering

### Phase 3: LONG TERM (Best Practices)
- [ ] Unified tenant context system (avoid multiple patterns)
- [ ] Enforce linting rules to catch missing tenant filters
- [ ] Regular security audits for cross-tenant leakage
- [ ] Customer isolation testing in CI/CD

---

## Implementation Priority

**TODAY**:
1. Use the bugfix report for driver portal (already done)
2. Migrate remaining OrderPortal queries to use custom `db.js` client

**THIS WEEK**:
1. Create and apply RLS policies
2. Test tenant isolation with multiple tenants
3. Verify no data leakage in cross-tenant scenarios

**BEFORE PRODUCTION**:
1. Complete security audit
2. Load test multi-tenant performance
3. Document tenant isolation guarantees for customers

---

## Testing Recommendations

### Test Case 1: Driver Cross-Tenant Isolation
```
1. Create Tenant A with 10 products
2. Create Tenant B with 5 products
3. Login as Tenant A driver
4. Verify "Load Truck" shows only 10 products (not 15)
5. Verify cannot load Tenant B's products
```

### Test Case 2: Customer Portal Isolation
```
1. Create Tenant A with customers [C1, C2]
2. Create Tenant B with customers [C3, C4]
3. Visit customer portal without auth
4. Should either:
   a) Prompt for tenant selection, OR
   b) Show only one tenant's customers (based on URL/domain)
5. Verify cannot access other tenant's customers
```

### Test Case 3: Invoice Link Cross-Tenant
```
1. Get invoice ID from Tenant A
2. Login to Tenant B
3. Try to access Tenant A's invoice via WhatsApp link
4. Should be rejected or redirected (not displayed)
```

---

## References

- `src/db.js` - Custom database client with tenant enforcement
- `src/OrderPortal.jsx` - Vulnerable queries (needs migration)
- `api/data/[table].js` - Secure API endpoint with tenant validation
- `api/db/client.js` - getTenant() function for header validation
- `BUGFIX_REPORT_Driver_Truck_Loading.md` - Driver portal fix details

---

## Sign-Off

**Auditor**: Claude  
**Date**: May 27, 2026  
**Status**: Findings documented, recommendations provided  
**Next Step**: Implement remediation roadmap

