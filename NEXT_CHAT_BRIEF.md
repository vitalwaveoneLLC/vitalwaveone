# VitalWaveOne Backend Migration - Brief for Next Chat

**This is a summary for the NEW CHAT where we build the backend.**

---

## 🎯 What We're Building

A complete Express.js backend to replace Supabase.

**Tech Stack:**
- Database: Neon PostgreSQL (FREE)
- Backend: Express.js (Node.js)
- Hosting: Railway (FREE)
- File Storage: Backblaze B2 ($0.50/mo)
- Real-time: WebSocket
- Auth: JWT + WhatsApp OTP
- **Total Cost: $0.50/month**

---

## ✅ Current Status

### Completed (in previous chat):
✅ Security fixes integrated into React code  
✅ Database schema designed  
✅ API endpoint structure planned  
✅ Supabase cleanup guide created  
✅ All dependencies documented  

### Ready for Next Chat:
✅ Frontend (React) is abstracted via `db.js`  
✅ Minimal changes needed when backend ready  
✅ Can proceed with building backend immediately  

---

## 🏗️ What to Build (in order)

### 1. Express.js Project Setup
```
backend/
├── src/
│   ├── server.js           (Entry point)
│   ├── config/
│   │   ├── database.js     (Neon connection)
│   │   ├── b2.js           (Backblaze config)
│   │   └── jwt.js          (Auth config)
│   ├── middleware/
│   │   ├── auth.js         (JWT verification)
│   │   ├── cors.js         (CORS setup)
│   │   └── error.js        (Error handling)
│   ├── routes/
│   │   ├── auth.js         (login, register)
│   │   ├── customers.js    (CRUD)
│   │   ├── invoices.js     (CRUD)
│   │   ├── drivers.js      (CRUD)
│   │   ├── products.js     (CRUD)
│   │   ├── storage.js      (file upload/download)
│   │   └── websocket.js    (real-time)
│   └── controllers/
│       ├── authController.js
│       ├── customerController.js
│       └── ...
├── migrations/
│   ├── 001_create_users.sql
│   ├── 002_create_customers.sql
│   ├── 003_create_companies.sql
│   ├── 004_create_invoices.sql
│   └── ...
├── package.json
├── .env.example
└── railway.json
```

### 2. Core API Endpoints Needed

**Auth Endpoints:**
- `POST /api/auth/register` - Register user
- `POST /api/auth/login` - Login with credentials
- `POST /api/auth/logout` - Logout
- `POST /api/auth/refresh` - Refresh JWT token

**Customer Endpoints:**
- `GET /api/customers` - List all
- `POST /api/customers` - Create
- `GET /api/customers/:id` - Get single
- `PUT /api/customers/:id` - Update
- `DELETE /api/customers/:id` - Delete

**Invoice Endpoints:**
- `GET /api/invoices` - List all
- `POST /api/invoices` - Create
- `GET /api/invoices/:id` - Get single
- `PUT /api/invoices/:id` - Update
- `DELETE /api/invoices/:id` - Delete

**Same pattern for:**
- `/api/drivers`
- `/api/products`
- `/api/companies`
- `/api/sales`
- `/api/payments`

**File Storage:**
- `POST /api/storage/upload` - Upload to B2
- `GET /api/storage/file` - Download from B2
- `DELETE /api/storage/file` - Delete from B2

**Real-time (WebSocket):**
- `/ws` - WebSocket endpoint

### 3. Database Tables to Create

```sql
-- Core tables
users (id, email, password_hash, company_id)
companies (id, name, tax_id, tax_rate)
customers (id, name, email, company_id)
drivers (id, name, email, company_id)
products (id, name, price, cost, company_id)
sales (id, total, profit, company_id)
payments (id, amount, method, sale_id)
receipts (id, file_path, upload_date)
```

---

## 📊 Database Queries Needed

The Express backend will need to:
1. Query by company_id (tenant isolation)
2. Join tables (customer with sales, etc)
3. Aggregate data (totals, counts)
4. Order by date
5. Paginate results

All queries will use:
```sql
WHERE company_id = $1  -- Tenant isolation
```

---

## 🔐 Security Decisions

### Authentication
- JWT tokens stored in localStorage
- Refresh tokens for session management
- WhatsApp OTP for initial login (existing)

### Authorization
- Every API call validates company_id
- Users can ONLY access their company's data
- No cross-tenant access possible

### Data Protection
- Passwords hashed with bcrypt
- JWT tokens expire in 24 hours
- Audit logs for all actions

---

## 💾 Data Migration Plan

### Before deploying backend:
1. Export all data from Supabase
2. Transform data to new schema
3. Import into Neon
4. Run validation queries
5. Test with real data

### Tools:
- `pg_dump` to export Supabase
- `psql` to import to Neon
- Custom validation scripts

---

## 🚀 Deployment Steps

### Backend (Express):
1. Create Railway account (free)
2. Connect GitHub repo to Railway
3. Set environment variables
4. Deploy automatically

### Database (Neon):
1. Create Neon account (free tier)
2. Create new project
3. Run migrations
4. Add connection string to Railway env

### File Storage (B2):
1. Create Backblaze account
2. Create bucket
3. Generate API key
4. Add credentials to Railway env

### Frontend:
1. Update API endpoints in `.env`
2. Deploy to Vercel (free)
3. Test with new backend

---

## 📋 Implementation Phases

### Phase 1: Backend Foundation (1 day)
- Express server setup
- Neon connection
- Basic CRUD routes
- Auth system

### Phase 2: All API Endpoints (1 day)
- Customer API
- Invoice API
- Driver API
- Product API
- Company API

### Phase 3: File Storage & Real-time (0.5 day)
- B2 integration
- WebSocket server
- File upload/download

### Phase 4: Data Migration (0.5 day)
- Export Supabase data
- Import to Neon
- Validate everything

### Phase 5: Deployment (0.5 day)
- Deploy to Railway
- Deploy to Vercel
- Test end-to-end
- Go live

---

## 🧪 Testing Plan

### Unit Tests
- Each controller function
- Utility functions
- Middleware

### Integration Tests
- API endpoints
- Database queries
- File uploads
- Real-time updates

### End-to-End Tests
- Full user flow: login → create invoice → download PDF
- Multi-tenant isolation tests
- Error handling

---

## 📝 Frontend Changes (minimal)

Most of the React code is **already abstracted**. Only need to:

1. Update `src/db.js` API endpoints:
   ```javascript
   const API_BASE = 'https://your-backend.railway.app/api'
   ```

2. Remove Supabase files:
   - Delete `src/supabase.js`
   - Remove from package.json

3. That's it! Everything else continues to work.

---

## 🎁 What You'll Have After Building

✅ Complete Express.js backend  
✅ PostgreSQL database setup (Neon)  
✅ JWT authentication system  
✅ All CRUD API endpoints  
✅ File storage integration (B2)  
✅ WebSocket real-time server  
✅ Complete data migration  
✅ Deployed to Railway (FREE)  
✅ Zero Supabase dependencies  
✅ Full ownership & control  
✅ 99% cost savings  

---

## 🆚 Comparison: Before vs After

| Aspect | Before (Supabase) | After (Custom) |
|--------|-------------------|----------------|
| **Backend** | Managed by Supabase | Your own Express.js |
| **Database** | Supabase PostgreSQL | Neon PostgreSQL |
| **Auth** | Supabase Auth | Custom JWT |
| **Storage** | Supabase Storage | Backblaze B2 |
| **Real-time** | Supabase RealtimeAPI | WebSocket |
| **Cost** | $50-150/mo | $0.50/mo |
| **Vendor Lock-in** | HIGH ❌ | NONE ✅ |
| **Control** | LIMITED | FULL ✅ |
| **Reliability** | At Supabase's mercy | Your responsibility |

---

## ⚠️ Important Notes

1. **No breaking changes to React**: Frontend uses `db.js` abstraction
2. **Drop-in backend replacement**: Just update API endpoints
3. **Same data structure**: Database schema mirrors Supabase
4. **Full control**: You own everything, no vendor surprises
5. **Scalable**: Can grow without vendor limitations

---

## 🎯 Next Steps

### Before starting this chat:
- [ ] Cleanup Supabase files (follow SUPABASE_CLEANUP_GUIDE.md)
- [ ] Verify no Supabase references remain
- [ ] Commit changes to git
- [ ] Have accounts ready (Railway, Neon, B2)

### In NEW CHAT:
- [ ] Build Express.js backend (complete code)
- [ ] Set up database migrations
- [ ] Create all API endpoints
- [ ] Integrate Backblaze B2
- [ ] Build WebSocket server
- [ ] Deploy to Railway
- [ ] Migrate data from Supabase
- [ ] Test everything
- [ ] Go live!

---

## 📚 Reference Documents

| Document | Purpose |
|----------|---------|
| `MIGRATION_RECORD.md` | Complete history of decisions |
| `SUPABASE_CLEANUP_GUIDE.md` | Step-by-step cleanup instructions |
| `CRITICAL_FIXES_CODE_SNIPPETS.md` | Security code integration |
| `SECURITY_INTEGRATION_SUMMARY.md` | Security implementation details |

---

**Status**: ✅ READY FOR BACKEND BUILDING

**Next Chat**: Say "I've completed cleanup ✓" and let's build!

