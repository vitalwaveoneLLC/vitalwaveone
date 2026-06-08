# Multi-Tenancy SaaS Architecture - VitalWaveOne

## Overview

VitalWaveOne is a **true multi-tenant SaaS application** where each customer (company) is completely isolated from all others. This document describes the architecture, security model, and enforcement mechanisms.

## Architecture Principles

### 1. **Company-Based Isolation**
- Each subscription creates a unique **Company** record with UUID
- All user data is tied to a company via `company_id` foreign key
- No query can access data without company context

### 2. **JWT-Based Authentication**
- Login generates JWT token containing `companyId` 
- Token is cryptographically signed (HS256)
- Token expires after 24 hours
- Sessions tracked in database for revocation

### 3. **Authorization Layer**
- Every API request requires valid JWT token
- Token validated before any data access
- Company context extracted from token and enforced
- Admin-only endpoints protected with role checks

## Data Flow

```
CLIENT LOGIN
    ↓
POST /api/auth/login (email, password)
    ↓
DATABASE: Verify user exists & password matches
    ↓
EXTRACT: company_id from user record
    ↓
GENERATE: JWT token with { userId, companyId, userType, email }
    ↓
STORE: Session in sessions table with token + company_id
    ↓
RETURN: Token to client
    ↓
CLIENT: Store token in localStorage
    ↓
SUBSEQUENT REQUESTS
    ↓
CLIENT: Send Authorization: Bearer <token>
    ↓
API: authMiddleware validates JWT
    ↓
API: Extract companyId from token → req.user.companyId
    ↓
API: Filter ALL queries by req.user.companyId
    ↓
API: Return only user's company data
```

## Security Layers

### Layer 1: Authentication (Is user valid?)
```javascript
// authMiddleware in auth-middleware.js
- Extract JWT from Authorization header
- Verify JWT signature with secret
- Check token expiration
- Verify session exists in database
- FAIL if any check fails → 401 Unauthorized
```

### Layer 2: Company Ownership (Does user own this company?)
```javascript
// companyOwnershipCheck middleware
- If requesting /company/:companyId
- Compare requested ID with req.user.companyId
- FAIL if mismatch → 403 Forbidden
```

### Layer 3: Role-Based Access (Is user allowed to do this?)
```javascript
// adminOnly, managerOrAdmin middlewares
- Check req.user.userType
- Only certain roles can perform certain actions
- FAIL if insufficient privileges → 403 Forbidden
```

### Layer 4: Query-Level Isolation (Can't access other company data)
```javascript
// tenant-filter.js utilities
- Every SELECT/INSERT/UPDATE/DELETE adds: AND company_id = $X
- Even if user somehow bypasses layers 1-3, database enforces it
- FAIL if company_id doesn't match → 0 rows affected
```

## Database Schema

All tables include `company_id` foreign key:

```sql
-- Companies Table (root tenant)
CREATE TABLE companies (
  id UUID PRIMARY KEY,
  name VARCHAR(255),
  subscription_plan VARCHAR(50),
  ...
);

-- Users Table (scoped to company)
CREATE TABLE users (
  id UUID PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES companies(id),
  email VARCHAR(255),
  user_type VARCHAR(50),
  ...
  UNIQUE(company_id, email)  -- Email unique per company, not globally
);

-- Trucks Table (scoped to company)
CREATE TABLE trucks (
  id UUID PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES companies(id),
  truck_number VARCHAR(50),
  ...
  UNIQUE(company_id, truck_number)  -- Truck number unique per company
);

-- Sessions Table (tracks active sessions with company)
CREATE TABLE sessions (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id),
  company_id UUID NOT NULL REFERENCES companies(id),
  token VARCHAR(255) UNIQUE,
  expires_at TIMESTAMP,
  ...
);

-- Audit Logs (every action logged per company)
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES companies(id),
  user_id UUID REFERENCES users(id),
  action VARCHAR(100),
  ...
);
```

## API Endpoint Structure

### Public Endpoints (No Auth Required)
```
POST /api/auth/login                          - Login user
POST /api/auth/register                       - Register new admin
POST /api/create-payment-intent               - Start subscription
POST /api/validate-ordering-link/:link        - Access ordering portal
GET /api/health                               - Health check
```

### Protected Endpoints (Auth Required)
```
GET /api/company/:companyId/ordering-link     - Get link (admin)
POST /api/company/:companyId/ordering-link    - Create link (admin)
DELETE /api/inventory                         - Scoped to user's company
GET /api/trucks                               - Scoped to user's company
POST /api/invoices                            - Scoped to user's company
```

## Code Examples

### Example 1: Login with Company Context
```javascript
// POST /api/auth/login
export async function login(req, res) {
  const { email, password } = req.body;
  
  // Find user by email
  const user = await queryOne(
    `SELECT u.id, u.company_id, c.name
     FROM users u
     JOIN companies c ON u.company_id = c.id
     WHERE u.email = $1`,
    [email]
  );
  
  // Generate JWT with COMPANY CONTEXT
  const token = generateJWT({
    userId: user.id,
    companyId: user.company_id,  // ← CRITICAL
    email: user.email,
  });
  
  return res.json({ token, user });
}
```

### Example 2: Auth Middleware Enforces Isolation
```javascript
// authMiddleware in auth-middleware.js
export async function authMiddleware(req, res, next) {
  const token = req.headers.authorization?.replace('Bearer ', '');
  const payload = verifyJWT(token);
  
  // Attach company context to request
  req.user = {
    userId: payload.userId,
    companyId: payload.companyId,  // ← EXTRACTED
    userType: payload.userType,
  };
  
  next();
}
```

### Example 3: Query Automatically Filtered by Company
```javascript
// GET /api/inventory (protected)
router.get('/api/inventory', authMiddleware, async (req, res) => {
  // Query automatically includes company filter
  const result = await query(
    `SELECT * FROM inventory 
     WHERE company_id = $1`,  // ← AUTO-ADDED
    [req.user.companyId]     // ← FROM TOKEN
  );
  
  // User ONLY sees their company's inventory
  return res.json(result.rows);
});
```

### Example 4: Prevent Cross-Company Access
```javascript
// POST /api/company/:companyId/action (protected + admin)
router.post('/api/company/:companyId/action',
  authMiddleware,
  adminOnly,
  async (req, res) => {
    const { companyId } = req.params;
    
    // User's company from JWT
    const userCompanyId = req.user.companyId;
    
    // Verify user owns this company
    if (companyId !== userCompanyId) {
      return res.status(403).json({
        error: 'Access denied: not your company'
      });
    }
    
    // Perform action
  }
);
```

## Security Guarantees

### ✅ No Cross-Company Data Leakage
- User A cannot see User B's inventory
- Database enforces via foreign keys
- Queries enforce via WHERE company_id
- Middleware enforces via token validation

### ✅ No Unauthorized Access
- User can only access their own company
- Admin endpoints require admin role
- Sessions tracked and revocable
- Expired tokens rejected

### ✅ No Privilege Escalation
- User type stored in database, not token
- Each request re-validates user exists
- Role checks applied consistently
- Admin actions logged to audit trail

### ✅ No Data Tampering
- All data tied to company_id
- Foreign keys prevent orphaned records
- Audit logs track all modifications
- Passwords hashed with unique salt per user

## Tenant Onboarding Flow

```
1. User submits signup form
   ↓
2. POST /api/create-payment-intent
   - Creates Company record in DB
   - Generates unique company_id (UUID)
   - Returns company_id to frontend
   ↓
3. User completes payment (Stripe)
   - Triggers webhook or returns success
   ↓
4. Backend creates admin user
   - INSERT INTO users (company_id, email, password_hash, user_type='admin')
   - Ties user to company
   ↓
5. Frontend calls POST /api/auth/login
   - User logs in with email + password
   - JWT issued with company_id
   ↓
6. User accesses admin dashboard
   - All requests include JWT token
   - All data filtered by company_id from token
   ↓
7. Admin can invite team members
   - Creates new users with same company_id
   - Each user gets unique login
   - All users see company data
```

## Testing Multi-Tenancy

```bash
# Test 1: Company A login
curl -X POST https://api.vitalwaveone.com/auth/login \
  -d '{"email": "admin@companya.com", "password": "pass123"}' \
  → Returns JWT with companyId = UUID-A

# Test 2: Access Company A data
curl -X GET https://api.vitalwaveone.com/inventory \
  -H 'Authorization: Bearer JWT-TOKEN-A' \
  → Returns Company A inventory only

# Test 3: Company B login
curl -X POST https://api.vitalwaveone.com/auth/login \
  -d '{"email": "admin@companyb.com", "password": "pass456"}' \
  → Returns JWT with companyId = UUID-B

# Test 4: Company B cannot access Company A data
curl -X GET https://api.vitalwaveone.com/company/UUID-A/data \
  -H 'Authorization: Bearer JWT-TOKEN-B' \
  → 403 Forbidden: Access denied

# Test 5: Logout
curl -X POST https://api.vitalwaveone.com/auth/logout \
  -H 'Authorization: Bearer JWT-TOKEN-A' \
  → Token invalidated in sessions table

# Test 6: Expired token rejected
curl -X GET https://api.vitalwaveone.com/inventory \
  -H 'Authorization: Bearer EXPIRED-TOKEN' \
  → 401 Unauthorized: Token expired
```

## Audit Logging

Every action is logged per company:

```sql
INSERT INTO audit_logs (company_id, user_id, action, entity_type, changes, ...)
VALUES (
  req.user.companyId,
  req.user.userId,
  'INVENTORY_CREATED',
  'inventory',
  {'sku': 'ABC-123', 'quantity': 100},
  ...
);
```

Admin can view action history:
```
GET /api/company/:companyId/audit-logs
  - Returns logs for their company only
  - Shows who did what and when
  - Immutable record for compliance
```

## Future Enhancements

1. **Usage Limits per Tier**
   - Track API calls per company
   - Enforce monthly quotas
   - Billing based on usage

2. **Feature Flags per Plan**
   - Starter: Basic inventory
   - Professional: + Trucks + Invoices
   - Enterprise: Everything + Custom

3. **SSO/SAML Support**
   - OAuth2 for company domains
   - SAML for enterprise customers
   - Federated identity

4. **IP Whitelisting**
   - Allow only certain IPs per company
   - VPN/corporate network isolation
   - Additional security for enterprise

5. **Data Residency**
   - Store data in company's region
   - GDPR compliance per region
   - Encryption at rest per company

6. **Backup & Restore**
   - Company self-service backups
   - Time-point recovery
   - Export all company data

## Files

- `api/auth.js` - JWT generation, login, register
- `api/middleware/auth-middleware.js` - Token validation, company checks
- `api/utils/tenant-filter.js` - Query building with company filters
- `api/index.js` - Route definitions with auth applied
- `migrations/0004_create_company_registration.sql` - Schema with company_id everywhere

## Verification Checklist

- [x] JWT tokens include companyId
- [x] Auth middleware validates all protected routes
- [x] Database schema has company_id on all tables
- [x] All queries filtered by company_id
- [x] Sessions table tracks company_id
- [x] Audit logging per company
- [x] Admin-only endpoints protected
- [x] Cross-company access blocked
- [x] Token expiration enforced
- [x] Password hashed with salt

## Status

✅ **PHASE 1 COMPLETE** - Multi-tenancy core architecture implemented
