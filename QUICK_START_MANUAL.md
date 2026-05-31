# Quick Start: Manual Step-by-Step

**⚠️ IMPORTANT:** All commands must be run **inside the routeflow folder**

---

## Step 0: Navigate to routeflow folder

```bash
# Open Command Prompt / PowerShell / Terminal

# Windows Command Prompt
cd C:\Users\alsha\routeflow

# OR Windows PowerShell
cd "C:\Users\alsha\routeflow"

# OR Git Bash
cd /c/Users/alsha/routeflow

# Verify you're in the right place
# You should see: package.json, src/, api/, migrations/ folders
dir
# or
ls
```

**Expected output:** You should see folders like `src/`, `api/`, `migrations/`, etc.

---

## Step 1: Install Dependencies

**Location:** Inside `C:\Users\alsha\routeflow` folder

```bash
npm install
```

**What this does:**
- Downloads all packages from `package.json`
- Installs: @upstash/redis, zod, jest, playwright, etc.
- Takes 2-5 minutes

**Expected output:**
```
added 500+ packages in 2m
```

---

## Step 2: Set Up Environment Variables

**Location:** Inside `C:\Users\alsha\routeflow` folder

```bash
# Create .env.local from template
copy .env.example .env.local
# OR in PowerShell
Copy-Item .env.example -Destination .env.local
```

**Next:** Open `.env.local` and add Redis credentials:

```env
# Get these from https://console.upstash.com
UPSTASH_REDIS_REST_URL=https://your-redis-url...
UPSTASH_REDIS_REST_TOKEN=eyJ...your-token...
```

**Save the file and close it.**

---

## Step 3: Apply Database Migrations

**⚠️ Prerequisites:**
- Have `psql` installed on your computer
- Have access credentials to your Neon database

**Location:** Inside `C:\Users\alsha\routeflow` folder

```bash
# Migration 1: Add sessions and CSRF tables
psql -h neon.tech -U postgres -d routeflow < migrations/0001_add_sessions_table.sql

# Migration 2: Add performance indexes
psql -h neon.tech -U postgres -d routeflow < migrations/0002_add_performance_indexes.sql
```

**Expected output:**
```
CREATE TABLE
CREATE INDEX
...
ALTER FUNCTION
```

**⚠️ If psql not found:**
```bash
# Download from: https://www.postgresql.org/download/
# Install PostgreSQL (includes psql)
```

---

## Step 4: Run Unit Tests

**Location:** Inside `C:\Users\alsha\routeflow` folder

```bash
npm test
```

**Expected output:**
```
PASS  src/__tests__/auth.test.jsx
  Authentication Validation
    ✓ should validate valid phone numbers
    ✓ should reject invalid phone numbers
    ...
    ✓ 11 tests pass

Test Suites: 1 passed, 1 total
Tests:       11 passed, 11 total
```

**If tests fail:**
- Check that dependencies installed correctly: `npm install`
- Check Node version: `node --version` (should be 18+)

---

## Step 5: Build and Check Bundle Size

**Location:** Inside `C:\Users\alsha\routeflow` folder

```bash
npm run build
```

**Expected output:**
```
dist/index-abc123.js       80.5 kB
dist/vendor-xyz456.js     120.3 kB
dist/orders-def789.js      45.2 kB
...
✓ built in 15s
```

**Check bundle sizes:**
```bash
# List all files in dist folder
dir dist
# or in PowerShell
ls dist
```

**Expected target:** Initial bundle should be **<100KB**

---

## Step 6: (Optional) Run E2E Tests

**Location:** Inside `C:\Users\alsha\routeflow` folder

```bash
npm run test:e2e
```

**Expected output:**
```
✓ Admin Login Flow (5 tests)
✓ Driver Login Flow (2 tests)
✓ Session Management (3 tests)

Tests: 10 passed
Duration: 2m 15s
```

**⚠️ First run may take longer (installs browsers)**

---

## Step 7: Start Development Server

**Location:** Inside `C:\Users\alsha\routeflow` folder

```bash
npm run dev
```

**Expected output:**
```
  VITE v8.0.10  ready in 245 ms

  ➜  Local:   http://localhost:5173/
  ➜  press h to show help
```

**Open in browser:** http://localhost:5173

---

## Quick Command Reference

Run all **inside** `C:\Users\alsha\routeflow`:

```bash
# Install packages
npm install

# Set up environment
copy .env.example .env.local

# Run migrations (requires psql)
psql -h neon.tech -U postgres -d routeflow < migrations/0001_add_sessions_table.sql
psql -h neon.tech -U postgres -d routeflow < migrations/0002_add_performance_indexes.sql

# Test
npm test                    # Unit tests
npm run test:e2e           # E2E tests (interactive)

# Build
npm run build              # Production build

# Development
npm run dev                # Dev server

# Clean build
rm -rf dist node_modules   # Delete build artifacts
npm install                # Reinstall
npm run build              # Rebuild
```

---

## Troubleshooting

### ❌ "npm: command not found"
```
Solution: Install Node.js from https://nodejs.org
Then restart your terminal
```

### ❌ "package.json not found"
```
Solution: Make sure you're in the routeflow folder
cd C:\Users\alsha\routeflow
```

### ❌ "psql: command not found"
```
Solution: Install PostgreSQL from https://www.postgresql.org/download
Includes psql command-line tool
```

### ❌ "EACCES: permission denied"
```
Windows: Run Command Prompt as Administrator
Linux/Mac: Use sudo (npm install -g might need it)
```

### ❌ "npm install takes forever"
```
Solution: Clear npm cache
npm cache clean --force
npm install
```

### ❌ Tests fail with "Cannot find module"
```
Solution: Make sure node_modules exists
rm -rf node_modules
npm install
npm test
```

---

## What Gets Created

**After running npm install + migrations:**

```
routeflow/
├── node_modules/              ← All dependencies installed
├── migrations/                ← Database changes applied
├── .env.local                 ← Environment variables (new)
├── dist/                      ← Build output (after npm run build)
├── src/__tests__/             ← Test files (new)
└── api/middleware/            ← New security middleware (new)
    ├── rate-limiter.js
    ├── auth.js
    └── csrf.js
```

---

## Verify Everything Works

After completing all steps, verify:

```bash
# 1. Dependencies installed
ls node_modules | head -5
# Should list many packages

# 2. Tests pass
npm test
# Should show: Tests: X passed

# 3. Build succeeds
npm run build
# Should create dist/ folder

# 4. Dev server starts
npm run dev
# Should show: ➜  Local: http://localhost:5173/
```

---

## Next Steps

1. **Read:** `IMPLEMENTATION_GUIDE.md` (detailed integration guide)
2. **Update API:** Add new middleware to endpoints
3. **Update Frontend:** Use useSession hook, form validation
4. **Deploy:** Test in staging before production
5. **Monitor:** Check security and performance metrics

---

## Need Help?

- **Questions about commands?** → Check this file
- **Implementation details?** → Read `IMPLEMENTATION_GUIDE.md`
- **What was delivered?** → Check `7FIXES_DELIVERY_SUMMARY.md`
- **File location?** → Check folder structure above

---

**All commands run from:** `C:\Users\alsha\routeflow`  
**Time to complete:** ~10 minutes  
**Result:** Production-ready 7 fixes implemented ✅
