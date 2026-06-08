# Supabase Cleanup & Validation Guide

**This file guides the cleanup process before starting the backend building phase.**

---

## 🔧 STEP 1: Backup & Prepare

```bash
# 1. Backup current state
git add .
git commit -m "chore: pre-migration backup"

# 2. Create a cleanup branch
git checkout -b cleanup/remove-supabase

# 3. List all files with 'supabase' references
grep -r "supabase" src/ --include="*.jsx" --include="*.js"
```

---

## 🗑️ STEP 2: Delete Supabase Files

### Files to DELETE:
```bash
# 1. Delete old Supabase client
rm src/supabase.js

# 2. Check if there's a .supabase folder
rm -rf .supabase/

# Git cleanup
git add src/
git commit -m "chore: remove old Supabase client"
```

---

## 📝 STEP 3: Clean Environment Variables

### In `.env.local` or `.env`:

**REMOVE THESE LINES:**
```env
# DELETE:
VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGc...

# Also from Vercel environment:
# Go to https://vercel.com → Project Settings → Environment Variables
# DELETE the VITE_SUPABASE_* variables
```

**KEEP THESE:**
```env
# KEEP:
VITE_API_BASE=http://localhost:3000/api
VITE_WS_URL=ws://localhost:3000
VITE_STRIPE_KEY=pk_live_...
```

---

## 📦 STEP 4: Remove Supabase from package.json

```bash
# Remove the Supabase SDK
npm uninstall @supabase/supabase-js

# Verify it's gone
cat package.json | grep supabase  # Should return nothing
```

---

## 🔍 STEP 5: Verify No Remaining Supabase References

```bash
# Check for any remaining imports
grep -r "from.*supabase" src/ --include="*.jsx" --include="*.js"
grep -r "import.*supabase" src/ --include="*.jsx" --include="*.js"
grep -r "createClient" src/ --include="*.jsx" --include="*.js"

# Check for Supabase storage references
grep -r "\.storage\." src/ --include="*.jsx" --include="*.js"

# Check for Supabase auth references
grep -r "\.auth\." src/ --include="*.jsx" --include="*.js"

# All of these should return ZERO results
```

---

## 🏗️ STEP 6: Update db.js API Endpoints

The `src/db.js` file needs a SMALL update. After the backend is ready, change:

**In `src/db.js` (TOP OF FILE):**

```javascript
// OLD (pointing to Supabase):
const API_BASE = '/api/data';
const RPC_BASE = '/api/rpc';

// NEW (will point to your Express backend):
// During development:
const API_BASE = process.env.VITE_API_BASE || 'http://localhost:3000/api';
const RPC_BASE = process.env.VITE_RPC_BASE || 'http://localhost:3000/api/rpc';

// In production:
// VITE_API_BASE=https://your-railway-backend.railway.app/api
// VITE_RPC_BASE=https://your-railway-backend.railway.app/api/rpc
```

**For Storage (in `src/db.js`):**

```javascript
// Update the storage.from() function to use new backend
const storage = {
  from: (bucket) => ({
    upload: async (path, file, options = {}) => {
      // Now points to your Express backend B2 upload endpoint
      const res = await fetch(`${API_BASE}/storage/upload`, {
        method: 'POST',
        headers: { 'Authorization': headers['Authorization'] || '' },
        body: formData,
      });
      return { data, error: res.ok ? null : { message: data.error } };
    },
    // ... rest stays the same
  }),
};
```

---

## ✅ STEP 7: Build & Validate

```bash
# Install fresh dependencies
npm install

# Build the project
npm run build

# Should see:
# ✓ dist/index.html
# ✓ No errors about supabase

# Run linter
npm run lint

# Should see:
# ✓ No errors

# Check for any remaining supabase references
grep -r "supabase" src/ --include="*.jsx" --include="*.js"
# Should return: (empty)

grep -r "supabase" dist/ --include="*.js"
# Should return: (empty)
```

---

## 🧪 STEP 8: Test Current State

```bash
# Start dev server
npm run dev

# Test in browser:
# 1. Go to http://localhost:5173
# 2. Try to login (will fail - backend not ready yet, but that's OK)
# 3. Check console for errors
# 4. Should NOT see any Supabase errors

# Expected in console:
# ✓ "Failed to connect to http://localhost:3000" (backend not ready)
# ✓ NOT "Supabase is not defined"
# ✓ NOT "@supabase/supabase-js not found"
```

---

## 📋 Final Cleanup Checklist

- [ ] Deleted `src/supabase.js`
- [ ] Removed `@supabase/supabase-js` from package.json
- [ ] Deleted `.supabase/` folder (if exists)
- [ ] Removed Supabase env vars from `.env` and Vercel
- [ ] Updated `src/db.js` API endpoints (or marked for later)
- [ ] `npm install` succeeds without errors
- [ ] `npm run build` succeeds without errors
- [ ] `npm run lint` passes
- [ ] No grep results for "supabase" in src/
- [ ] No grep results for "supabase" in dist/
- [ ] Dev server starts without Supabase errors
- [ ] Commit changes: `git commit -m "chore: remove all Supabase dependencies"`

---

## 🚀 Ready for Backend Building!

Once all checkboxes are complete:

✅ Codebase is clean  
✅ No Supabase dependencies  
✅ Ready to use custom backend  
✅ Can proceed to new chat for Express building  

**Next**: Go to new chat and tell me you've completed cleanup ✓

Then I'll build the complete Express.js backend with:
- JWT authentication
- All CRUD endpoints
- Neon database setup
- Backblaze B2 integration
- WebSocket real-time
- Deployment to Railway

