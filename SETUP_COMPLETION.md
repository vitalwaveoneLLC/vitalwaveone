# Complete Setup Guide - Step by Step

**Status:** Files created and configured ✅

---

## 📋 What I Just Did For You

✅ Created: `src/__tests__/setup.js` — Jest test setup
✅ Created: `.babelrc` — Babel configuration for JSX
✅ Updated: `package.json` — Added Babel + test dependencies
✅ Updated: `jest.config.js` — Fixed Jest configuration

---

## 🚀 Complete Setup Process (Run These Commands in Order)

**All commands run from:** `C:\Users\alsha\routeflow`

### Step 1: Clean Install Dependencies

```bash
# Remove old node_modules
rmdir /s /q node_modules
# or in PowerShell
Remove-Item -Recurse -Force node_modules

# Clear npm cache
npm cache clean --force

# Install with legacy peer deps
npm install --legacy-peer-deps
```

**Time:** ~3-5 minutes  
**Expected:** Installs all packages including Babel, Jest, Playwright

---

### Step 2: Verify Setup

```bash
# Check jest is installed
npm list jest

# Check babel is installed
npm list @babel/core

# Should show versions installed
```

---

### Step 3: Run Tests

```bash
npm test
```

**Expected output:**
```
PASS  src/__tests__/auth.test.jsx (if tests exist)
  or
No tests found
✓ Ran 0 tests
```

---

### Step 4: Build the Project

```bash
npm run build
```

**Expected output:**
```
vite v8.0.10 building for production...
✓ 125 modules transformed
dist/index-abc123.js        80.5 kB
dist/vendor-xyz456.js      120.3 kB
✓ built in 2.35s
```

---

### Step 5: Start Development Server

```bash
npm run dev
```

**Expected output:**
```
  VITE v8.0.10  ready in 245 ms

  ➜  Local:   http://localhost:5173/
  ➜  press h to show help
```

**Open browser:** http://localhost:5173

---

## 📊 All-in-One Quick Command

```bash
# Complete setup in one go (copy and paste)
npm install --legacy-peer-deps && npm test && npm run build && npm run dev
```

---

## ✅ Next: Integration Steps

After setup works, integrate the 7 fixes:

### 1. Database Migrations

```bash
# Only if you have psql installed:
psql -h neon.tech -U postgres -d routeflow < migrations/0001_add_sessions_table.sql
psql -h neon.tech -U postgres -d routeflow < migrations/0002_add_performance_indexes.sql
```

**Or** skip migrations for now if you don't have psql.

---

### 2. Update API Endpoints

Edit your API files to use new middleware:

**Example: Update `/api/auth/verify-otp.js`**
```javascript
import { checkRateLimit, resetRateLimit } from '../middleware/rate-limiter.js';

export default async function handler(req, res) {
  const { phone } = req.body;
  
  // Add rate limiting
  const rateLimit = await checkRateLimit(`otp:${phone}`, 5, 900);
  if (!rateLimit.allowed) {
    return res.status(429).json({ error: 'Too many attempts' });
  }
  
  // ... rest of your code
}
```

---

### 3. Update React Components

Use new hooks in your components:

**Example: Use session hook**
```javascript
import { useSession } from './hooks/useSession';
import { useFormValidation } from './hooks/useFormValidation';
import { customerSchema } from '../lib/validation';

export function Dashboard() {
  const { session, isAuthenticated, logout } = useSession();
  const form = useFormValidation(customerSchema);

  if (!isAuthenticated) return <LoginPage />;

  return (
    <div>
      <h1>Welcome, {session?.user?.name}!</h1>
      <form onSubmit={form.handleSubmit(handleSave)}>
        <input {...form.getFieldProps('name')} />
        {form.getFieldError('name') && (
          <div className="error">{form.getFieldError('name')}</div>
        )}
        <button type="submit">Save</button>
      </form>
    </div>
  );
}
```

---

### 4. Replace N+1 Queries

In your API endpoints, use optimized queries:

**Example: Get drivers with loads**
```javascript
import { getDriversWithLoads } from '../queries/optimized-queries';

export default async function handler(req, res) {
  // BEFORE: 101 queries (1 + 100 loads)
  // AFTER: 1 query
  const driversWithLoads = await getDriversWithLoads(req.session.tenantId);
  res.json(driversWithLoads);
}
```

---

## 📝 File Structure After Setup

```
C:\Users\alsha\routeflow\
├── node_modules/              ← Downloaded packages
├── src/
│   ├── __tests__/
│   │   ├── setup.js           ← ✅ Created
│   │   ├── auth.test.jsx      ← ✅ Created
│   │   └── e2e/
│   │       └── login.e2e.js   ← ✅ Created
│   ├── hooks/
│   │   ├── useSession.jsx     ← ✅ Created
│   │   └── useFormValidation.jsx ← ✅ Created
│   ├── utils/
│   │   └── lazyLoad.jsx       ← ✅ Created
│   └── (rest of your code)
├── api/
│   ├── middleware/
│   │   ├── rate-limiter.js    ← ✅ Created
│   │   ├── auth.js            ← ✅ Created
│   │   └── csrf.js            ← ✅ Created
│   ├── queries/
│   │   └── optimized-queries.js ← ✅ Created
│   └── (rest of your code)
├── lib/
│   └── validation.js          ← ✅ Created
├── migrations/
│   ├── 0001_add_sessions_table.sql ← ✅ Created
│   └── 0002_add_performance_indexes.sql ← ✅ Created
├── dist/                      ← Created after npm run build
├── .babelrc                   ← ✅ Created
├── jest.config.js             ← ✅ Updated
├── playwright.config.js       ← ✅ Created
├── vite.config.js             ← ✅ Updated
├── package.json               ← ✅ Updated
├── .env                       ← Already exists
├── IMPLEMENTATION_GUIDE.md    ← ✅ Created
├── 7FIXES_DELIVERY_SUMMARY.md ← ✅ Created
└── QUICK_START.bat / .sh      ← ✅ Created
```

---

## 🧪 Test Commands Reference

```bash
# Run all tests
npm test

# Watch mode (re-run on changes)
npm test -- --watch

# Coverage report
npm test -- --coverage

# Run E2E tests
npm run test:e2e

# Run specific test file
npm test -- auth.test.jsx

# Run with verbose output
npm test -- --verbose
```

---

## 🐛 Troubleshooting

### ❌ "Module not found" error
```
Solution: npm install --legacy-peer-deps
```

### ❌ Tests still failing
```
Solution: Delete node_modules and reinstall
rm -r node_modules package-lock.json
npm install --legacy-peer-deps
```

### ❌ "jest: command not found"
```
Solution: npm install --legacy-peer-deps
```

### ❌ Build fails
```
Solution: Check vite.config.js is properly updated
Verify: dist/ folder is created
```

### ❌ Dev server won't start
```
Solution: Kill previous vite process
npm run dev
(may need to wait 10 seconds)
```

---

## 📈 Progress Checklist

- [ ] npm install --legacy-peer-deps ✅
- [ ] npm test runs successfully ✅
- [ ] npm run build succeeds ✅
- [ ] npm run dev starts server ✅
- [ ] http://localhost:5173 opens ✅
- [ ] Database migrations applied (optional)
- [ ] API endpoints updated with middleware
- [ ] React components use new hooks
- [ ] Queries replaced with optimized versions
- [ ] E2E tests run successfully

---

## 🎯 You're Ready When...

✅ **npm test** returns no errors  
✅ **npm run build** creates dist/ folder  
✅ **npm run dev** starts on localhost:5173  
✅ Browser opens without 404 errors  
✅ Console has no critical errors  

---

## 📞 Need Help?

**Setup issue?** → Check troubleshooting section above

**Integration question?** → Read `IMPLEMENTATION_GUIDE.md`

**What was delivered?** → Check `7FIXES_DELIVERY_SUMMARY.md`

---

## 🚀 Next Steps After Setup Works

1. **Read:** `IMPLEMENTATION_GUIDE.md` (comprehensive integration guide)
2. **Apply:** Database migrations (if you have psql)
3. **Update:** API endpoints with new middleware
4. **Update:** React components with hooks
5. **Test:** E2E tests with `npm run test:e2e`
6. **Deploy:** Push to staging and test
7. **Monitor:** Check security and performance metrics

---

**You're now set up for Phase 1 & 2 integration! 🎉**

Generated: 2026-05-26  
All files created and configured by Claude
