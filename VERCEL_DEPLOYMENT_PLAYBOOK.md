# 🚀 Vercel Deployment Playbook - Zero Cost Hosting

**Everything you need to go live for FREE**

---

## Pre-Deployment Checklist

- [ ] Code committed and pushed to GitHub
- [ ] Tests passing locally (npm test)
- [ ] Build successful locally (npm run build)
- [ ] Vercel account created at vercel.com
- [ ] GitHub connected to Vercel
- [ ] Domain configured (routeflow.io or your domain)
- [ ] Environment variables prepared

---

## Step 1: Create Vercel Account (5 min)

**Go to:** https://vercel.com/signup

**Choose:** Sign up with GitHub

**Authorize:** Connect your GitHub account

---

## Step 2: Import Your Project (2 min)

1. Click: **"New Project"**
2. Select: Your **routeflow** repository
3. Click: **"Import"**

Vercel will auto-detect your project is using Vite.

---

## Step 3: Configure Environment Variables (5 min)

In Vercel dashboard, go to **Settings → Environment Variables**

Add these (get values from your existing .env):

```
DATABASE_URL = postgresql://neondb_owner:npg_ka6rERMAHi7X@ep-polished-scene-apmn4sw5-pooler.c-7.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require

UPSTASH_REDIS_REST_URL = https://your-upstash-url.upstash.io

UPSTASH_REDIS_REST_TOKEN = your-upstash-token

ALLOWED_ORIGIN = https://routeflow.io

NODE_ENV = production

VITE_SUPABASE_URL = https://twdhmzosgdfctccgmxcw.supabase.co

VITE_SUPABASE_ANON_KEY = eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR3ZGhtem9zZ2RmY3RjY2dteGN3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc1MDQzNzQsImV4cCI6MjA5MzA4MDM3NH0.vsr8oEsqXtUvCaOdWi5NA-VdH3mGlwvfGhwmgmPci2c

VITE_STRIPE_PUBLISHABLE_KEY = pk_test_51TVGQBKQzcjZkVfsWIESdejZVkKgxyzFLCHEl5CJLWfCGIzm6h5BgPTYzPlyrDa4Ft138YMm1NH43Dx5ceLW8W5z00AU2Xl3Yo
```

**Important:**
- Set each variable individually
- **Vercel will handle secrets securely**
- Don't paste .env file directly

---

## Step 4: Deploy (1 min)

In Vercel, go to **Deployments** tab

Click: **"Deploy"** button

**Wait:** 2-3 minutes for build & deployment

You'll see:
```
✅ Build successful
✅ Ready for production
```

Your app is now live at:
- `https://routeflow.vercel.app` (default)
- `https://routeflow.io` (after domain setup)

---

## Step 5: Database Migrations (Critical! 10 min)

Your database still needs the sessions & csrf_tokens tables.

### 5.1: Get Your Database Connection

```bash
# Your Neon connection string
postgresql://neondb_owner:npg_ka6rERMAHi7X@ep-polished-scene-apmn4sw5-pooler.c-7.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require
```

### 5.2: Apply Migration 1 - Sessions Table

**Copy & paste this into your Neon SQL Editor** (neon.tech → your project → SQL Editor):

```sql
-- Create sessions table for secure session management
CREATE TABLE IF NOT EXISTS sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token VARCHAR(255) UNIQUE NOT NULL,
  user_id UUID NOT NULL,
  user_type VARCHAR(50) NOT NULL,
  tenant_id UUID NOT NULL,
  csrf_token VARCHAR(255),
  ip_address INET,
  user_agent TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  last_activity_at TIMESTAMP DEFAULT NOW(),
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create csrf_tokens table for CSRF protection
CREATE TABLE IF NOT EXISTS csrf_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token VARCHAR(255) UNIQUE NOT NULL,
  session_id UUID REFERENCES sessions(id) ON DELETE CASCADE,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(token);
CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_tenant_id ON sessions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON sessions(expires_at);
CREATE INDEX IF NOT EXISTS idx_csrf_token ON csrf_tokens(token);
CREATE INDEX IF NOT EXISTS idx_csrf_expires ON csrf_tokens(expires_at);

-- Create cleanup function
CREATE OR REPLACE FUNCTION cleanup_expired_sessions()
RETURNS void AS $$
BEGIN
  DELETE FROM sessions WHERE expires_at < NOW();
  DELETE FROM csrf_tokens WHERE expires_at < NOW();
END;
$$ LANGUAGE plpgsql;
```

**Run it** - Click the play button in Neon SQL Editor

**Expected:** ✅ Tables created successfully

---

## Step 6: Set Up Your Custom Domain (10 min)

### 6.1: In Vercel Dashboard

1. Go to: **Settings → Domains**
2. Click: **"Add Domain"**
3. Enter: `routeflow.io`
4. Vercel shows DNS records needed

### 6.2: Update Your Domain Registrar

Go to your domain registrar (GoDaddy, Namecheap, etc.):

1. Find: **DNS Settings**
2. Add: Vercel's nameservers
   - Vercel will give you 4 nameservers
   - Replace existing ones

3. Wait: 24-48 hours for DNS propagation

**Meanwhile:** Your app is live at `routeflow.vercel.app`

---

## Step 7: Verify Everything Works (15 min)

### 7.1: Check Deployment Status

In Vercel Dashboard:
- ✅ Status: "Ready"
- ✅ Deployment: "Production"
- ✅ Domain: Shows your URL

### 7.2: Test API Endpoints

```bash
# Replace with your actual URL
BASE_URL=https://routeflow.vercel.app  # or your domain once DNS updates

# Test 1: Rate limiting (run 4x - 4th should fail with 429)
curl -X POST $BASE_URL/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"phone":"5551234567","company_name":"Test Inc"}'

# Test 2: CSRF protection (should fail with 403)
curl -X POST $BASE_URL/api/data/customers \
  -H "Cookie: routeflow_session=test"

# Test 3: Session validation (should fail with 401)
curl -X POST $BASE_URL/api/data/customers
```

**Expected Results:**
- Test 1 (4th attempt): `{"error":"Too many signup attempts..."}`
- Test 2: `{"error":"Unauthorized"}`  (CSRF missing)
- Test 3: `{"error":"Unauthorized"}` (no session)

### 7.3: View Live Logs

In Vercel Dashboard → **Logs** tab:
- Shows all requests
- Shows errors in real-time
- Useful for debugging

---

## Step 8: Monitor Your Deployment (Ongoing)

### Daily Checks

```bash
# Check deployment status
# Visit: https://vercel.com/dashboard → your project

# View logs
# Click: "Logs" in Vercel dashboard

# Check error rate
# Look for 5xx errors (should be near 0)
```

### Weekly Checks

1. **Performance:** Check response times
2. **Errors:** Review error logs
3. **Rate limiting:** Check 429 responses (should be low for legitimate traffic)
4. **CSRF:** Check 403 responses (should be near 0 for your app)

### Monthly Checks

1. Run full test suite
2. Review database backups (Neon does automatic backups)
3. Check for updates to dependencies
4. Monitor costs (should be $0 on free tier)

---

## Multi-Tenant Setup (For Customer Subdomains)

Since you want `company1.routeflow.io`, `company2.routeflow.io`, etc:

### Option A: Wildcard Domain (Easy)

1. In Vercel: Add domain `*.routeflow.io`
2. In your DNS: Add wildcard record `*.routeflow.io`
3. In your app: Extract subdomain from request
   ```javascript
   const subdomain = req.headers.host.split('.')[0];
   // subdomain = "company1" for company1.routeflow.io
   ```
4. Query database with subdomain/company_id

### Option B: Dynamic Routing (Better)

Your app already detects tenant from:
- URL subdomain (`company.routeflow.io`)
- Path (`/app/company/...`)
- Header (`X-Tenant-ID`)
- Query parameter (`?tenant=company`)

No additional setup needed - it just works!

---

## Scaling Your App (Later, When You Need It)

### Free Tier Limits (Current)
- 100 serverless function invocations/day (more than enough for MVP)
- 50GB/month bandwidth
- Automatic HTTPS
- Unlimited deployments

### When You Need to Upgrade

Vercel charges only when you exceed free tier:
- **Pro Plan:** $20/month
  - 1000 function invocations/day
  - More analytics
  - Priority support

- **Enterprise Plan:** Custom pricing
  - For 100,000+ requests/day

---

## Troubleshooting

### Issue: Build failing in Vercel

**Solution:**
1. Check logs in Vercel → **Logs** tab
2. Run locally: `npm run build`
3. Make sure all dependencies installed: `npm install --legacy-peer-deps`

### Issue: Database migration failed

**Solution:**
1. Go to neon.tech → SQL Editor
2. Check if tables exist: `SELECT * FROM sessions;`
3. If error, rerun migration SQL from Step 5.2

### Issue: Environment variables not working

**Solution:**
1. In Vercel: Go to **Settings → Environment Variables**
2. Verify all variables are there
3. Redeploy: **Deployments → Redeploy** (select latest)

### Issue: Domain not working (DNS not updated)

**Solution:**
1. Wait 24-48 hours for DNS propagation
2. Check status: https://dnschecker.org
3. Meanwhile: Use `routeflow.vercel.app` (already working)

---

## Cost Breakdown

| Service | Free Tier | Cost |
|---------|-----------|------|
| Vercel hosting | ✅ 100 serverless invocations/day | $0 |
| Neon database | ✅ 3GB storage | $0 |
| Upstash Redis | ✅ 10,000 commands/day | $0 |
| Domain (routeflow.io) | ❌ Not included | $10-15/year |
| SSL/HTTPS | ✅ Included | $0 |
| **Total** | | **$0/month** |

---

## Next: Upgrading (When Traffic Increases)

When you reach:
- 100+ daily active users
- 1000+ API requests/day
- Many subscribers

Then upgrade to:
- **Vercel Pro:** $20/month
- **Neon Paid:** $15-50/month
- **Upstash Paid:** $10-50/month

**Total:** $45-120/month for 10,000+ users

---

## Success Indicators

You're live in production when:

✅ Vercel shows "Ready" status
✅ Domain is accessible
✅ Migrations applied (no errors)
✅ Rate limiting working (429 on 4th signup attempt)
✅ CSRF protection working (403 without token)
✅ Sessions working (401 without session)
✅ Logs show normal traffic patterns
✅ No 5xx errors

---

**Status:** Ready to deploy! 🚀

**Time to Live:** 20-30 minutes (excluding DNS propagation)

**Cost:** $0 (forever, until you scale)

---

**Next Step:** 

1. Commit & push code: `git push origin main`
2. Create Vercel account: vercel.com
3. Import your GitHub project
4. Add environment variables
5. Deploy!

Once deployed, tell me and I'll:
- Apply database migrations
- Run verification tests
- Get you live with customers

You've got this! 🎉
