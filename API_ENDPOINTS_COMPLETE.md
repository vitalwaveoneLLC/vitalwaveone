# VitalWaveOne API Endpoints - Complete Reference

## Authentication (Public)

```
POST   /api/auth/login                    - Login with email/password
POST   /api/auth/register                 - Register new admin user
GET    /api/auth/verify                   - Verify JWT token
POST   /api/auth/logout                   - Logout (invalidate session)
```

## Payment (Public - Signup Flow)

```
POST   /api/create-payment-intent         - Start subscription payment
POST   /api/verify-payment                - Verify payment succeeded
GET    /api/payment-status/:paymentId     - Get payment status
```

## MFA/OTP (Public - Signup)

```
POST   /api/send-mfa-otp                  - Send OTP to email
POST   /api/verify-mfa-otp                - Verify OTP code
GET    /api/mfa-status/:email             - Get MFA status
POST   /api/clear-mfa-otp                 - Clear OTP for email
```

## Inventory (Protected - Company Isolated)

All endpoints require valid JWT token. Returns only user's company data.

```
GET    /api/inventory                     - List all inventory
  Query: page=1, limit=10, search=""
  Response: { data: [...], pagination: {...} }

POST   /api/inventory                     - Create inventory item (admin only)
  Body: { sku, productName, category, unitPrice, shelfQuantity, truckQuantity }
  Response: { success: true, data: {...} }

GET    /api/inventory/:id                 - Get single inventory item
  Response: { success: true, data: {...} }

PUT    /api/inventory/:id                 - Update inventory item (admin only)
  Body: { productName, category, unitPrice, shelfQuantity, truckQuantity }
  Response: { success: true, data: {...} }

DELETE /api/inventory/:id                 - Delete inventory item (admin only)
  Response: { success: true, message: "..." }
```

**Security:**
- GET returns only items for user's company
- POST/PUT/DELETE require admin role
- All queries filtered by `company_id` from JWT

---

## Trucks/Fleet (Protected - Company Isolated)

All endpoints require valid JWT token. Returns only user's company data.

```
GET    /api/trucks                        - List all trucks
  Query: page=1, limit=10
  Response: { data: [...], pagination: {...} }

POST   /api/trucks                        - Create truck (admin only)
  Body: { truckNumber, licensePlate, vehicleType, capacityUnits, driverId }
  Response: { success: true, data: {...} }

GET    /api/trucks/:id                    - Get single truck
  Response: { success: true, data: {...} }

PUT    /api/trucks/:id                    - Update truck (admin only)
  Body: { truckNumber, licensePlate, vehicleType, capacityUnits, driverId, status }
  Response: { success: true, data: {...} }

DELETE /api/trucks/:id                    - Delete truck (admin only)
  Response: { success: true, message: "..." }
```

**Security:**
- GET returns only trucks for user's company
- Driver assignment verified to belong to company
- POST/PUT/DELETE require admin role
- All queries filtered by `company_id` from JWT

---

## Invoices (Protected - Company Isolated)

All endpoints require valid JWT token. Returns only user's company data.

```
GET    /api/invoices                      - List all invoices
  Query: page=1, limit=10, status=""
  Response: { data: [...], pagination: {...} }

POST   /api/invoices                      - Create invoice (admin only)
  Body: { invoiceNumber, customerId, invoiceDate, dueDate, totalAmount, notes, items }
  Response: { success: true, data: {...} }

GET    /api/invoices/:id                  - Get single invoice
  Response: { success: true, data: {...} }

PUT    /api/invoices/:id                  - Update invoice (admin only)
  Body: { status, totalAmount, notes, items }
  Response: { success: true, data: {...} }

DELETE /api/invoices/:id                  - Delete invoice (admin only)
  Response: { success: true, message: "..." }

POST   /api/invoices/:id/approve          - Approve invoice (admin only)
  Response: { success: true, data: {...}, message: "Invoice approved" }
```

**Security:**
- GET returns only invoices for user's company
- POST/PUT/DELETE require admin role
- Status filtering supported
- All queries filtered by `company_id` from JWT

---

## Team Users (Protected - Company Isolated)

Manage team members and staff within company.

```
GET    /api/users                         - List all users in company
  Query: page=1, limit=10, userType=""
  Response: { data: [...], pagination: {...} }

POST   /api/users                         - Create team member (admin only)
  Body: { firstName, lastName, email, phone, userType, password }
  Response: { success: true, data: {...} }

GET    /api/users/:id                     - Get single user
  Response: { success: true, data: {...} }

PUT    /api/users/:id                     - Update user (admin only)
  Body: { firstName, lastName, phone, userType, status }
  Response: { success: true, data: {...} }

DELETE /api/users/:id                     - Delete user (admin only)
  Response: { success: true, message: "..." }
```

**Security:**
- GET returns only users in user's company
- Cannot delete self
- POST/PUT/DELETE require admin role
- Passwords never returned in responses
- All queries filtered by `company_id` from JWT

---

## Ordering Platform Links (Protected Admin)

Generate and manage unique staff ordering links.

```
GET    /api/company/:companyId/ordering-link    - Get company's ordering link (admin)
  Response: { success: true, link, fullUrl, active }

POST   /api/company/:companyId/ordering-link    - Create/get link (admin)
  Body: { generateNew: false }
  Response: { success: true, link, fullUrl }

POST   /api/company/:companyId/ordering-link/disable  - Disable link (admin)
  Response: { success: true, message: "..." }

POST   /api/company/:companyId/ordering-link/enable   - Enable link (admin)
  Response: { success: true, message: "..." }
```

**Security:**
- All endpoints require admin role
- Only admin can view/manage own company's links
- Company ownership verified

---

## Ordering Platform Staff Access (Public)

Staff access to ordering portal via unique link.

```
GET    /api/validate-ordering-link/:link    - Validate staff ordering link (public)
  Response: { success: true, companyId, companyName, valid: true }
  
  Errors:
  - 404: Invalid ordering link
  - 403: This ordering link has been disabled
```

**Security:**
- No authentication required (link is the credential)
- Validates link exists and is active
- Returns company context for portal access

---

## Health Check

```
GET    /api/health    - API health status
  Response: { status: 'ok', timestamp: '...', version: '2.0.0' }
```

---

## Authentication Flow

### Request Format

All protected endpoints require JWT token in header:

```
GET /api/inventory
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
X-Company-Id: 550e8400-e29b-41d4-a716-446655440000
```

### Response Format - Success

```json
{
  "success": true,
  "data": { /* ... */ },
  "message": "Optional message",
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 100,
    "pages": 10
  }
}
```

### Response Format - Error

```json
{
  "error": "Error description",
  "code": "ERROR_CODE"
}
```

### Error Codes

```
400 Bad Request           - Invalid input
401 Unauthorized          - Missing or invalid token
403 Forbidden             - Insufficient permissions
404 Not Found             - Resource doesn't exist
429 Too Many Requests     - Rate limited
500 Internal Server Error - Server error
```

---

## Company Isolation Guarantees

✅ **Every query filtered by company_id from JWT token**
```javascript
SELECT * FROM inventory WHERE company_id = $1  // $1 = user's company
```

✅ **Admin-only operations protected**
```javascript
POST /api/inventory → Requires admin role
DELETE /api/trucks/:id → Requires admin role
```

✅ **Foreign key relationships enforced**
```sql
UNIQUE(company_id, email)           -- Email unique per company
UNIQUE(company_id, truck_number)    -- Truck number unique per company
```

✅ **No cross-company data leakage possible**
- Database enforces via foreign keys
- API enforces via company_id filters
- Middleware enforces via JWT validation

---

## Testing Example

### Login and Get Inventory

```bash
# 1. Login
curl -X POST https://api.vitalwaveone.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "admin@company.com", "password": "secret123"}' \
  
# Response
{
  "success": true,
  "user": {
    "id": "user-uuid",
    "companyId": "company-uuid",
    "companyName": "My Company",
    "role": "admin"
  },
  "token": "eyJhbGc..."
}

# 2. Use token to get inventory
curl -X GET https://api.vitalwaveone.com/api/inventory \
  -H "Authorization: Bearer eyJhbGc..." \
  -H "X-Company-Id: company-uuid"

# Response - Only company's inventory
{
  "success": true,
  "data": [
    {"id": "inv-1", "sku": "ABC-123", "productName": "Widget"},
    {"id": "inv-2", "sku": "DEF-456", "productName": "Gadget"}
  ],
  "pagination": {"page": 1, "limit": 10, "total": 2, "pages": 1}
}

# 3. Try with different company's token
curl -X GET https://api.vitalwaveone.com/api/inventory \
  -H "Authorization: Bearer OTHER_COMPANY_TOKEN"

# Response - Only other company's inventory (never Company A's data)
{
  "success": true,
  "data": [
    {"id": "inv-3", "sku": "XYZ-789", "productName": "Tool"}
  ]
}
```

---

## Implementation Status

### ✅ Completed
- [x] JWT Authentication (login, register, verify, logout)
- [x] Auth Middleware (token validation, company checks)
- [x] Inventory CRUD + company isolation
- [x] Trucks CRUD + company isolation
- [x] Invoices CRUD + company isolation
- [x] Team Users management + company isolation
- [x] Ordering Platform links + validation
- [x] Audit logging (per company)

### 🔄 In Progress
- [ ] Frontend integration (LoginPage, AppAdmin, components)
- [ ] Database migration verification
- [ ] End-to-end testing
- [ ] Production deployment

### ⏳ Phase 2
- [ ] Role-based access control (RBAC) - Owner, Manager, User, Viewer
- [ ] Team member invitations
- [ ] Usage tracking & plan limits
- [ ] Feature flags per subscription tier
- [ ] API keys for programmatic access
- [ ] Webhooks for integrations

---

## Deployment Checklist

- [ ] All environment variables set in Vercel
  - `JWT_SECRET` - Minimum 32 characters
  - `DATABASE_URL` - Neon connection string
  - `STRIPE_SECRET_KEY` - Stripe secret
  - `SMTP_USER` - Gmail address
  - `SMTP_PASS` - Gmail app password

- [ ] Database migration completed
  - Tables have `company_id` foreign keys
  - Indexes created on `company_id`
  - Audit logs table ready

- [ ] Backend deployed to Vercel
  - All endpoints accessible
  - Health check responds
  - Auth working

- [ ] Frontend deployed to Vercel
  - Login flow works
  - API calls include JWT token
  - Admin dashboard accessible

- [ ] Testing completed
  - Company isolation verified
  - Cross-company access blocked
  - Admin permissions enforced
  - Audit logs created

---

**Last Updated:** 2026-06-04  
**Version:** 2.0.0 (Multi-tenant SaaS)
