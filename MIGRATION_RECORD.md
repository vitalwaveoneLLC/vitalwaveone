# VitalWaveOne - Supabase to Custom Backend Migration Record

**Date Started**: May 28, 2026  
**Migration Status**: ✅ PLANNING COMPLETE - Ready for Implementation  
**Decision Made**: Migrate from Supabase to Custom Express.js + Neon + Backblaze B2

---

## 📋 Why This Migration?

### User's Concerns:
- ❌ Supabase deleted edge function without warning
- ❌ Poor free tier support
- ❌ Vendor lock-in risk
- ❌ Unreliable platform for production SaaS

### Decision:
✅ **Build custom backend = Full control + Lower cost + Better reliability**

---

## 💰 Cost Comparison

| Component | Supabase | New Stack | Savings |
|-----------|----------|-----------|---------|
| Database | $15-100/mo | Neon FREE | 100% |
| Backend | Included | Railway FREE | 100% |
| Storage | $10-50/mo | B2 $0.50/mo | 98% |
| Auth | Included | Custom FREE | 100% |
| Real-time | Included | WebSocket FREE | 100% |
| **TOTAL** | **$50-150/mo** | **$0.50/mo** | **99% savings** |

---

## 🏗️ New Architecture

```
┌─────────────────────────────────────────────────────┐
│                React Frontend (Vercel FREE)         │
└────────────────────┬────────────────────────────────┘
                     │
                API Calls (HTTPS)
                WebSocket (Real-time)
                     │
┌────────────────────▼────────────────────────────────┐
│         Express.js Backend (Railway FREE)           │
│  ┌──────────────────────────────────────────────┐   │
│  │ Authentication (JWT, WhatsApp OTP)           │   │
│  │ API Endpoints (CRUD for all entities)        │   │
│  │ Authorization (Company-level tenant check)   │   │
│  │ File Management (B2 integration)             │   │
│  │ WebSocket Server (Real-time updates)        │   │
│  └──────────────────────────────────────────────┘   │
└────────────────────┬────────────────────────────────┘
                     │
        ┌────────────┼────────────┐
        │            │            │
   PostgreSQL   Backblaze B2  Stripe
   (Neon FREE)  ($0.50/mo)   (existing)
```

---

## 📁 Codebase Analysis

### Current Supabase Usage

**Files using Supabase:**
1. ✅ `src/db.js` - **Custom abstraction layer** (GOOD - minimal changes needed)
2. ⚠️ `src/supabase.js` - **Old Supabase client** (DELETE - not used)
3. ✅ `src/App.jsx` - **Uses db.js abstraction** (GOOD - no changes needed)
4. ✅ `src/OrderPortal.jsx` - **Uses db.js abstraction** (GOOD - no changes needed)
5. ✅ `src/StripePaymentModal.jsx` - **Uses db.js abstraction** (GOOD - no changes needed)

**Good News**: The frontend is already abstracted via `db.js`!
- ❌ NOT importing `supabase.js` directly
- ✅ Using custom `db` object that mimics Supabase API
- ✅ Easy to switch backend by updating API endpoints

---

## 🔄 Migration Strategy

### Phase 1: Build Backend (NEW)
- [ ] Express.js server project
- [ ] Neon database connection
- [ ] Database schema migrations
- [ ] JWT authentication
- [ ] All API endpoints
- [ ] Backblaze B2 integration
- [ ] WebSocket server
- [ ] Deploy to Railway

### Phase 2: Switch Frontend API Endpoints
- [ ] Update `API_BASE` and `RPC_BASE` in `src/db.js`
- [ ] Update storage API endpoints
- [ ] Test all CRUD operations
- [ ] Fix any breaking changes

### Phase 3: Remove Supabase
- [ ] Delete `src/supabase.js`
- [ ] Remove `@supabase/supabase-js` from package.json
- [ ] Remove Supabase environment variables
- [ ] Remove Supabase auth integrations
- [ ] Verify no imports remain

### Phase 4: Migrate Data
- [ ] Export data from Supabase
- [ ] Import into Neon
- [ ] Verify data integrity
- [ ] Test with real data

---

## 📊 Files to Clean

### DELETE (Supabase-specific):
```
src/supabase.js              ← Old Supabase client (NOT USED)
.env.local (VITE_SUPABASE*)  ← Supabase credentials
```

### MODIFY (Update API endpoints):
```
src/db.js                    ← Change API_BASE, RPC_BASE, storage URLs
src/App.jsx                  ← Remove any Supabase Auth references
src/OrderPortal.jsx          ← Remove any Supabase Auth references
src/StripePaymentModal.jsx   ← Check for any Supabase usage
```

### KEEP (No Supabase):
```
src/
  ├── App.jsx                ✅ Uses db.js (no changes needed)
  ├── OrderPortal.jsx        ✅ Uses db.js (no changes needed)
  ├── LoginPage.jsx          ✅ Uses custom auth (no changes needed)
  ├── StripePaymentModal.jsx ✅ Uses db.js (no changes needed)
  └── ...
```

---

## 🔍 Detailed Cleanup Checklist

### 1. Package Dependencies
- [ ] Remove `@supabase/supabase-js` from package.json
- [ ] Keep: axios, react, react-router, etc.
- [ ] Add new: (none needed, backend handles it)

### 2. Environment Variables - REMOVE
```env
# DELETE THESE:
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...

# KEEP THESE:
VITE_API_BASE=http://localhost:3000/api
VITE_WS_URL=ws://localhost:3000
```

### 3. Files to Delete
- [ ] `src/supabase.js`
- [ ] Any `.supabase/` folder
- [ ] `.env` file (Supabase secrets)

### 4. Code References to Remove
From `src/db.js`:
- [ ] Remove Supabase client reference comments
- [ ] Keep the custom QueryBuilder class (it works!)
- [ ] Update API endpoints to point to new backend

From all React files:
- [ ] Search for `supabase` imports → change to `db`
- [ ] Search for `.auth.` → use custom auth system
- [ ] Search for `.storage.` → already abstracted in db.js

---

## ✅ Validation Checklist

### Before Cleanup
- [ ] Backup current `.env` file
- [ ] Commit current state to git
- [ ] Document all Supabase API calls

### During Cleanup
- [ ] Delete supabase.js
- [ ] Remove Supabase SDK from package.json
- [ ] Update db.js API endpoints (placeholder for now)
- [ ] Remove Supabase env vars from .env

### After Cleanup
- [ ] `npm install` runs without errors
- [ ] `npm run build` compiles without errors
- [ ] No import errors for Supabase
- [ ] All TypeScript errors resolved (if any)
- [ ] Code linter passes
- [ ] Git diff shows only expected changes

### Build Validation
```bash
npm run build    # Should succeed
npm run lint     # Should pass
grep -r "supabase" src/  # Should return 0 results
```

---

## 🚀 Ready for Next Chat

### What's Been Done (in this chat):
✅ Identified all Supabase dependencies  
✅ Created comprehensive migration plan  
✅ Analyzed codebase abstraction level  
✅ Created cleanup checklist  
✅ Documented everything  

### What's Next (in NEW chat):
1. Build Express.js backend
2. Set up Neon database
3. Create API endpoints
4. Integrate Backblaze B2
5. Build WebSocket server
6. Update frontend to use new backend
7. Migrate data
8. Deploy everything

### New Chat Will Include:
- Complete backend source code
- Database migrations
- API documentation
- Deployment instructions
- Testing procedures

---

## 📝 Summary

**Current State**: Frontend is abstracted via `db.js`  
**Cleanup Effort**: ~30 minutes (delete 2 files, update 1 file)  
**Risk Level**: LOW (good abstraction)  
**Breaking Changes**: NONE (backend API compatible)  

**Next Step**: Start new chat for backend building phase

---

**Status**: ✅ READY FOR CLEANUP & BUILDING  
**Estimated Total Time**: 5 days (backend) + 1 day (data migration) + 1 day (testing)  
**Go-Live Date**: June 2-4, 2026
