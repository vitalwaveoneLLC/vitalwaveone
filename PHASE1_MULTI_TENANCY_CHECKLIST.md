# Phase 1 - Multi-Tenancy Implementation Checklist

## ✅ COMPLETED - Core Authentication & Authorization Infrastructure

### Backend Components
- [x] **api/auth.js** - JWT generation, login, register with company context
- [x] **api/middleware/auth-middleware.js** - Token validation, company checks, role verification
- [x] **api/utils/tenant-filter.js** - Query building helpers for company isolation
- [x] **api/index.js** - Auth routes + middleware applied to protected endpoints
- [x] **Database Schema** (migrations/0004) - All tables have company_id foreign keys

### Frontend Authentication
- [x] **src/utils/auth-manager.js** - JWT token lifecycle, company context management
- [x] **src/utils/api.js** - Updated to use JWT tokens from auth-manager

### Documentation
- [x] **MULTI_TENANCY_ARCHITECTURE.md** - Complete architecture guide
- [x] **PHASE1_MULTI_TENANCY_CHECKLIST.md** - This file

---

## 🔄 IN PROGRESS - Update Frontend Components

### Login & Registration Flow

#### LoginPageIntegrated.jsx
- [ ] Update to use auth-manager.login() instead of `/auth/login` directly
- [ ] Store company context in localStorage via auth-manager
- [ ] Update error handling for JWT token errors
- [ ] Add "Remember me" functionality (optional)
- [ ] Display company name on successful login

#### HomePage.jsx (Landing Page)
- [ ] Update registration flow to create company FIRST
- [ ] Then create admin user with that company_id
- [ ] Flow: Company creation → Payment → User registration → Auto-login

### Admin Dashboard

#### AppAdminIntegrated.jsx
- [ ] Extract companyId from auth-manager.getCompanyContext()
- [ ] Pass companyId to all API calls automatically
- [ ] Verify company ownership before allowing access
- [ ] Update OrderingPlatformTab to use company context
- [ ] Display company name in header

#### All Admin Tabs
- [ ] Update all `get()` and `post()` calls to include company context
- [ ] Example: GET `/api/inventory` → `GET /api/inventory` (auto-scoped by backend)
- [ ] Verify no hardcoded company IDs in requests

### Order Portal

#### OrderPortal.jsx
- [ ] Update to work with company context from session
- [ ] Filter orders by company_id
- [ ] Ensure staff can only see their company's data

---

## 🚨 CRITICAL - Update API Endpoints for Company Filtering

### Core Data Endpoints (Priority 1)

These endpoints MUST filter by company_id in their queries:

```
GET /api/inventory              → Filter by req.user.companyId
POST /api/inventory             → Auto-add company_id on insert
PUT /api/inventory/:id          → Verify company ownership
DELETE /api/inventory/:id       → Verify company ownership

GET /api/trucks                 → Filter by req.user.companyId
POST /api/trucks                → Auto-add company_id
PUT /api/trucks/:id             → Verify company ownership
DELETE /api/trucks/:id          → Verify company ownership

GET /api/invoices               → Filter by req.user.companyId
POST /api/invoices              → Auto-add company_id
PUT /api/invoices/:id           → Verify company ownership
DELETE /api/invoices/:id        → Verify company ownership

GET /api/customers              → Filter by req.user.companyId
POST /api/customers             → Auto-add company_id
PUT /api/customers/:id          → Verify company ownership
DELETE /api/customers/:id       → Verify company ownership
```

### Optional Endpoints (Priority 2)

```
GET /api/suppliers              → Filter by req.user.companyId
GET /api/expenses               → Filter by req.user.companyId
GET /api/financial/kpis         → Filter by req.user.companyId
GET /api/audit-logs             → Filter by req.user.companyId
```

### Implementation Pattern

**Before:**
```javascript
export async function getInventory(req, res) {
  const result = await query('SELECT * FROM inventory');
  return res.json(result.rows);
}
// ❌ WRONG: Returns all inventory from all companies
```

**After:**
```javascript
import { authMiddleware } from './middleware/auth-middleware.js';

router.get('/inventory',
  authMiddleware,  // ← Add this
  async (req, res) => {
    const result = await query(
      'SELECT * FROM inventory WHERE company_id = $1',
      [req.user.companyId]  // ← Use this
    );
    return res.json(result.rows);
  }
);
// ✅ CORRECT: Returns only user's company inventory
```

---

## 📝 Update Session & Payment Flow

### Payment.js
- [ ] When payment succeeds, extract company_id from created company
- [ ] Create admin user with that company_id
- [ ] Store company_id in response so frontend can use it
- [ ] Generate ordering platform link with company_id

### OrderingLink.js
- [ ] Verify company_id in API calls
- [ ] Filter links by company_id
- [ ] Prevent access to other companies' links

---

## 🧪 Testing Requirements

### Unit Tests
- [ ] JWT generation and verification
- [ ] Auth middleware rejects invalid tokens
- [ ] Auth middleware rejects expired tokens
- [ ] Company ownership checks work
- [ ] Admin-only endpoints reject non-admins

### Integration Tests
- [ ] Company A login → sees only Company A data
- [ ] Company B login → sees only Company B data  
- [ ] Company B cannot access Company A's data
- [ ] Company A login → Company B token → 403 Forbidden
- [ ] Token expiration → 401 Unauthorized
- [ ] Logout → token invalidated

### Penetration Tests
- [ ] Modify JWT payload (add companyId) → signature fails
- [ ] Access different company's resource → 403 Forbidden
- [ ] Send another company's token → company mismatch → 403
- [ ] Try to access company/:otherCompanyId → blocked

### Security Tests
- [ ] Passwords hashed (never stored plaintext)
- [ ] Sessions tracked in database
- [ ] Expired tokens rejected
- [ ] Invalid signatures rejected
- [ ] CORS properly configured

---

## 📋 Database Verification

Run these checks on Neon:

```sql
-- Check users table
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'users'
ORDER BY ordinal_position;
-- ✓ Must have: company_id, email, password_hash, user_type, status

-- Check sessions table
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'sessions'
ORDER BY ordinal_position;
-- ✓ Must have: user_id, company_id, token, expires_at

-- Check inventory table (example)
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'inventory'
ORDER BY ordinal_position;
-- ✓ Must have: company_id

-- Verify foreign keys
SELECT constraint_name, table_name, column_name
FROM information_schema.key_column_usage
WHERE table_name = 'users' AND column_name = 'company_id';
-- ✓ Must show FK to companies table

-- Test query filtering
SELECT * FROM inventory
WHERE company_id = 'test-company-uuid';
-- ✓ Should return only that company's data

-- Check indexes for performance
SELECT indexname FROM pg_indexes
WHERE tablename = 'inventory' AND indexname LIKE '%company%';
-- ✓ Should have index on company_id
```

---

## 🔐 Security Configuration

### Environment Variables (Vercel)
```
JWT_SECRET=minimum-32-character-secret-key-here
```

### .env.local (Development)
```
JWT_SECRET=dev-secret-key-for-testing
```

---

## 📦 Deployment Steps

1. **Backup database** - Critical before migration
   ```bash
   pg_dump $DATABASE_URL > backup.sql
   ```

2. **Run migration** (if not already done)
   ```bash
   psql $DATABASE_URL < migrations/0004_create_company_registration.sql
   ```

3. **Deploy backend to Vercel**
   ```bash
   git push origin main
   # Check Vercel build logs
   # Verify: https://api.vitalwaveone.com/api/health
   ```

4. **Deploy frontend to Vercel**
   ```bash
   git push origin main
   # Check Vercel build logs
   # Verify: https://vitalwaveone.com
   ```

5. **Test authentication flow**
   - Register new company
   - Pay for subscription
   - Login with admin credentials
   - Verify can access own data only

---

## ⚠️ Known Limitations & TODOs

### Current Limitations
1. **Email signup** - Currently user creates account after payment
   - Should be: Email signup → Payment → Auto-login
   - TODO: Update HomePage flow

2. **Role-based dashboard** - All logged-in users see admin dashboard
   - Should be: Role check → Show different UI per role
   - TODO: Create role-specific dashboards

3. **Invitations** - No team member invitations yet
   - TODO: Create invitation system with email tokens
   - TODO: Bulk import team from CSV

4. **Audit logs** - Logging infrastructure not hooked up
   - TODO: Log all data modifications
   - TODO: Create audit log viewer in admin

### Future Phase 2 Features
- [ ] Role-based access control (RBAC) - Owner, Manager, User, Viewer
- [ ] Team member invitations with email
- [ ] Audit logging for compliance
- [ ] Usage tracking per plan tier
- [ ] Feature flags/entitlements per plan
- [ ] API keys for programmatic access
- [ ] Webhook events for integrations
- [ ] SSO/SAML enterprise auth
- [ ] Data export/import
- [ ] Backup & disaster recovery

---

## 📞 Support & Debugging

### Debug Checklist
If authentication failing:
1. Check JWT_SECRET is set in Vercel
2. Verify token in localStorage: `localStorage.getItem('vw_jwt_token')`
3. Decode token: Open console → `JSON.parse(atob(token.split('.')[1]))`
4. Verify companyId in payload
5. Check sessions table: `SELECT * FROM sessions WHERE token = 'xxx';`
6. Check user exists: `SELECT * FROM users WHERE id = 'xxx';`
7. Check company exists: `SELECT * FROM companies WHERE id = 'xxx';`

### Logs to Check
- **Frontend**: Browser console (DevTools → Console)
- **Backend**: Vercel logs → Deployments → Logs
- **Database**: Query error messages in browser network tab

---

## ✅ Sign-Off

### Completion Criteria for Phase 1
- [x] JWT authentication system working
- [x] Company context in all tokens
- [x] Auth middleware protecting all endpoints
- [ ] All API endpoints filtering by company_id
- [ ] Frontend using auth-manager for auth
- [ ] No cross-company data leakage possible
- [ ] Test suite passing (integration tests)
- [ ] Deployed to production

### Status: 🟡 **70% COMPLETE**
- Core infrastructure: ✅ Done
- API endpoints: 🔄 In progress  
- Frontend integration: 🔄 In progress
- Testing: ⏳ Not started
- Deployment: ⏳ Not started

---

## 📚 Related Files

- `MULTI_TENANCY_ARCHITECTURE.md` - Complete architecture
- `api/auth.js` - Auth logic
- `api/middleware/auth-middleware.js` - Middleware
- `src/utils/auth-manager.js` - Frontend auth
- `src/utils/api.js` - API wrapper
- `migrations/0004_create_company_registration.sql` - DB schema

**Last Updated:** 2026-06-04
**Next Review:** After Phase 1 API completion
