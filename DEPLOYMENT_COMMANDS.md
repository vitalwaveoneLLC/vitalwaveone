# Deployment Commands - Copy & Paste Ready

## Run These in PowerShell (C:\Users\alsha\routeflow>)

### Step 1: Verify Tests Pass ✅
```powershell
npm test
```
**Expected:** 6/6 tests passing

---

### Step 2: Build for Production ✅
```powershell
npm run build
```
**Expected:** `dist/` folder created with optimized bundle

---

### Step 3: Database Migrations (Run on Staging/Prod Server) ⏳
```bash
# Replace <host> with your Neon database host
# Example: ep-polished-scene-apmn4sw5-pooler.c-7.us-east-1.aws.neon.tech

psql -h <host> -U postgres -d routeflow < migrations/0001_add_sessions_table.sql
psql -h <host> -U postgres -d routeflow < migrations/0002_add_performance_indexes.sql
```

---

### Step 4: Verify Migrations Applied ⏳
```bash
psql -h <host> -U postgres -d routeflow -c "SELECT * FROM sessions LIMIT 1;"
psql -h <host> -U postgres -d routeflow -c "SELECT * FROM csrf_tokens LIMIT 1;"
```

---

### Step 5: Configure Staging Environment Variables ⏳

Update your staging server's `.env.local` or environment variables:

```env
DATABASE_URL=<your-neon-url>
UPSTASH_REDIS_REST_URL=<your-redis-url>
UPSTASH_REDIS_REST_TOKEN=<your-redis-token>
ALLOWED_ORIGIN=https://staging.your-domain.com
VITE_API_URL=https://staging-api.your-domain.com
NODE_ENV=production
```

---

### Step 6: Test Rate Limiting (Staging) ⏳
```bash
# Run this 4 times in quick succession - 4th should fail with 429
curl -X POST https://staging/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"phone":"5551234567","company_name":"Test Inc"}'

# Expected on 4th attempt:
# {"error":"Too many signup attempts. Please try again later.","retryAfter":...}
```

---

### Step 7: Test CSRF Protection (Staging) ⏳
```bash
# Missing CSRF token - should return 403
curl -X POST https://staging/api/data/customers \
  -H "Cookie: routeflow_session=test-token" \
  -H "Content-Type: application/json" \
  -d '{"name":"John"}'

# Expected: 403 Forbidden
```

---

### Step 8: Test Session Validation (Staging) ⏳
```bash
# No session - should return 401
curl -X POST https://staging/api/data/customers \
  -H "Content-Type: application/json" \
  -d '{"name":"John"}'

# Expected: 401 Unauthorized
```

---

## Files Generated for Deployment

1. ✅ **DEPLOYMENT_READINESS_REPORT.md** - Complete readiness checklist
2. ✅ **DEPLOYMENT_COMMANDS.md** - This file
3. ✅ **API_SECURITY_IMPLEMENTATION_COMPLETE.md** - Full security guide
4. ✅ **ENDPOINT_UPDATES_COMPLETE.md** - Endpoint breakdown
5. ✅ **.env.local** - Environment configuration template
6. ✅ **dist/** - Production build (after npm run build)

---

## Timeline

| Step | Action | Time | Status |
|------|--------|------|--------|
| 1 | Run tests | 5 min | ✅ Ready |
| 2 | Build | 10 min | ✅ Ready |
| 3 | Deploy to staging | 20 min | ⏳ Contact DevOps |
| 4 | Apply migrations | 5 min | ⏳ Run on server |
| 5 | Run staging tests | 30 min | ⏳ Verify in staging |
| 6 | Monitor | 24 hours | ⏳ Watch logs |
| 7 | Deploy to production | 20 min | ⏳ Final deployment |

**Total Deployment Time:** 1.5-2 hours

---

## Troubleshooting

### Issue: Tests failing
```powershell
npm install --legacy-peer-deps
npm test
```

### Issue: Build failing
```powershell
npm run build -- --mode production
```

### Issue: Database migration failing
```bash
# Check connection
psql -h <host> -U postgres -d routeflow -c "SELECT version();"

# Check if tables already exist
psql -h <host> -U postgres -d routeflow -c "\dt"
```

### Issue: Rate limiting not working
- Verify UPSTASH_REDIS_REST_URL is set
- Verify UPSTASH_REDIS_REST_TOKEN is valid
- Check Redis connection: `curl $UPSTASH_REDIS_REST_URL/ping`

---

## Success Criteria

After deployment, verify:

- [ ] All tests passing (npm test)
- [ ] Build successful (dist/ exists)
- [ ] Migrations applied (tables exist)
- [ ] Rate limiting works (429 error on 4th attempt)
- [ ] CSRF protection works (403 error without token)
- [ ] Session validation works (401 error without session)
- [ ] No errors in server logs
- [ ] Response times normal (+5-10ms acceptable)

---

**Ready to Deploy:** YES ✅

Contact DevOps when ready for staging deployment.
