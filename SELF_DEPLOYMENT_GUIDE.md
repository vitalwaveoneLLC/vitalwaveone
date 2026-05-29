# Self-Service Deployment Guide
**For Solo Developers - No DevOps Team**

---

## Phase 1: Local Testing (Your Machine) ✅

### Step 1.1: Run Tests
```powershell
cd C:\Users\alsha\routeflow
npm test
```
**Expected:** 
```
PASS  src/__tests__/auth.test.jsx
✓ 6 tests passing
```

### Step 1.2: Build Production Bundle
```powershell
npm run build
```
**Expected:**
```
✓ Build successful
✓ dist/ folder created with optimized files
```

### Step 1.3: Verify Build Output
```powershell
# Check that dist folder exists and has files
ls dist/

# Should show:
# - index.html
# - assets/
# - js files
# - css files
```

---

## Phase 2: Staging Deployment (Testing Server)

### Where to Deploy?

**Option A: Free (Recommended for testing)**
- Vercel (free tier, git-based)
- Netlify (free tier, git-based)
- Railway (free tier with credit)
- Render (free tier)

**Option B: Paid Production-Ready**
- AWS EC2 (full control)
- DigitalOcean (simple & reliable)
- Heroku (simple)
- Azure (enterprise)
- Google Cloud (scalable)

### 2.1: Choose Your Hosting

#### If Using Vercel (Easiest):
```bash
# 1. Install Vercel CLI
npm install -g vercel

# 2. Deploy
vercel --prod

# 3. Follow prompts:
# - Link to your GitHub account
# - Select project name
# - Environment: Production
```

#### If Using DigitalOcean (Full Control):
```bash
# 1. Create droplet (Ubuntu 22.04, 2GB RAM)
# 2. SSH into server:
ssh root@your_server_ip

# 3. Install dependencies
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs npm postgresql-client

# 4. Install PostgreSQL (or use Neon)
# Already using Neon, so skip this

# 5. Install Redis CLI (for testing)
sudo apt install -y redis-tools

# 6. Clone your repo
cd /opt
git clone https://github.com/your-username/routeflow.git
cd routeflow

# 7. Install dependencies
npm install --legacy-peer-deps

# 8. Build
npm run build

# 9. Install PM2 (process manager)
sudo npm install -g pm2
```

#### If Using AWS EC2 (More Complex):
```bash
# 1. Launch EC2 instance (t3.small, Ubuntu 22.04)
# 2. SSH in:
ssh -i your-key.pem ec2-user@your-instance-ip

# 3. Follow DigitalOcean steps above (same OS)
```

---

## Phase 3: Database Migrations (Critical!)

### 3.1: Connect to Your Database

```bash
# Get your Neon connection string from neon.tech dashboard
# Should look like: postgresql://user:pass@host/dbname

# Test connection
psql "postgresql://user:pass@host/dbname" -c "SELECT version();"
```

### 3.2: Apply Migration 1 (Sessions Table)

```bash
# Download migration file (or copy content)
psql "postgresql://user:pass@host/dbname" << 'EOF'
-- Migration 1: Sessions & CSRF Tokens
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
  updated_at TIMESTAMP DEFAULT NOW(),
  INDEX idx_sessions_token (token),
  INDEX idx_sessions_user_id (user_id),
  INDEX idx_sessions_tenant_id (tenant_id),
  INDEX idx_sessions_expires_at (expires_at)
);

CREATE TABLE IF NOT EXISTS csrf_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token VARCHAR(255) UNIQUE NOT NULL,
  session_id UUID REFERENCES sessions(id) ON DELETE CASCADE,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  INDEX idx_csrf_token (token),
  INDEX idx_csrf_expires (expires_at)
);

CREATE OR REPLACE FUNCTION cleanup_expired_sessions()
RETURNS void AS $$
BEGIN
  DELETE FROM sessions WHERE expires_at < NOW();
  DELETE FROM csrf_tokens WHERE expires_at < NOW();
END;
$$ LANGUAGE plpgsql;

SELECT 'Migration 1 Complete';
EOF
```

### 3.3: Apply Migration 2 (Performance Indexes)

```bash
psql "postgresql://user:pass@host/dbname" << 'EOF'
-- Migration 2: Performance Indexes
CREATE INDEX IF NOT EXISTS idx_tenants_status ON tenants(status);
CREATE INDEX IF NOT EXISTS idx_tenants_plan ON tenants(plan);
CREATE INDEX IF NOT EXISTS idx_profiles_tenant ON profiles(tenant_id);
CREATE INDEX IF NOT EXISTS idx_profiles_phone ON profiles(phone);
CREATE INDEX IF NOT EXISTS idx_sales_tenant ON sales(tenant_id);
CREATE INDEX IF NOT EXISTS idx_sales_customer ON sales(customer_id);
CREATE INDEX IF NOT EXISTS idx_customers_tenant ON customers(tenant_id);
CREATE INDEX IF NOT EXISTS idx_drivers_tenant ON drivers(tenant_id);
CREATE INDEX IF NOT EXISTS idx_trucks_tenant ON trucks(tenant_id);
CREATE INDEX IF NOT EXISTS idx_loads_driver ON loads(driver_id);
CREATE INDEX IF NOT EXISTS idx_payments_tenant ON payments(tenant_id);
CREATE INDEX IF NOT EXISTS idx_otp_codes_phone ON otp_codes(phone);
CREATE INDEX IF NOT EXISTS idx_otp_codes_expires ON otp_codes(expires_at);

SELECT 'Migration 2 Complete';
EOF
```

### 3.4: Verify Migrations

```bash
# Check tables exist
psql "postgresql://user:pass@host/dbname" -c "\dt"

# Should list: sessions, csrf_tokens, and your app tables

# Check indexes
psql "postgresql://user:pass@host/dbname" -c "\di"
```

---

## Phase 4: Environment Configuration

### 4.1: Create .env on Your Server

```bash
# SSH into your server
ssh root@your_server_ip

# Create .env file
cat > /opt/routeflow/.env << 'EOF'
# Database
DATABASE_URL=postgresql://user:password@ep-host.neon.tech:5432/dbname?sslmode=require

# Redis (Upstash)
UPSTASH_REDIS_REST_URL=https://your-redis-url.upstash.io
UPSTASH_REDIS_REST_TOKEN=your-token-here

# API Configuration
ALLOWED_ORIGIN=https://your-domain.com
VITE_API_URL=https://your-domain.com/api
NODE_ENV=production

# Stripe
STRIPE_SECRET_KEY=sk_live_your_key
STRIPE_PUBLISHABLE_KEY=pk_live_your_key
STRIPE_WEBHOOK_SECRET=whsec_your_secret

# Cloudflare R2
R2_ACCOUNT_ID=your-account-id
R2_ACCESS_KEY=your-access-key
R2_SECRET_KEY=your-secret-key
R2_BUCKET=routeflow-receipts
R2_REGION=auto

# Meta/WhatsApp
META_PHONE_ID=your-phone-id
META_ACCESS_TOKEN=your-token

# Gmail
GMAIL_USER=your-email@gmail.com
GMAIL_APP_PASSWORD=your-16-char-password
EOF

# Verify
cat /opt/routeflow/.env
```

### 4.2: Secure the .env File

```bash
# Restrict permissions so only your user can read
chmod 600 /opt/routeflow/.env

# Verify
ls -la /opt/routeflow/.env
# Should show: -rw------- 1 root root
```

---

## Phase 5: Start the API Server

### 5.1: Start with Node (Simple)

```bash
cd /opt/routeflow

# Run development server (for testing)
npm run dev &

# Or run production build
NODE_ENV=production npm run build
NODE_ENV=production node server.js &
```

### 5.2: Start with PM2 (Recommended)

```bash
# Install PM2
sudo npm install -g pm2

# Start your app
pm2 start "npm run dev" --name "routeflow"

# Or start production build
pm2 start "node server.js" --name "routeflow"

# Auto-start on server reboot
pm2 startup
pm2 save

# Monitor
pm2 status
pm2 logs
```

### 5.3: Set Up Reverse Proxy (Nginx)

```bash
# Install Nginx
sudo apt update
sudo apt install -y nginx

# Create config
sudo tee /etc/nginx/sites-available/routeflow << 'EOF'
server {
    listen 80;
    server_name your-domain.com;

    # Redirect HTTP to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name your-domain.com;

    # SSL certificates (use Let's Encrypt)
    ssl_certificate /etc/letsencrypt/live/your-domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;

    # Proxy to Node app
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        
        # Required for CSRF & Sessions
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
EOF

# Enable site
sudo ln -s /etc/nginx/sites-available/routeflow /etc/nginx/sites-enabled/
sudo rm /etc/nginx/sites-enabled/default

# Test config
sudo nginx -t

# Start Nginx
sudo systemctl start nginx
sudo systemctl enable nginx
```

### 5.4: Set Up HTTPS with Let's Encrypt

```bash
# Install Certbot
sudo apt install -y certbot python3-certbot-nginx

# Get certificate
sudo certbot certonly --nginx -d your-domain.com

# Auto-renew
sudo systemctl enable certbot.timer
sudo systemctl start certbot.timer
```

---

## Phase 6: Verify Everything Works

### 6.1: Test API Endpoints

```bash
# Test rate limiting (run 4 times - 4th should fail)
for i in {1..4}; do
  curl -X POST https://your-domain.com/api/auth/signup \
    -H "Content-Type: application/json" \
    -d '{"phone":"5551234567","company_name":"Test Inc"}'
  echo "Attempt $i complete"
  sleep 1
done

# Expected on 4th: {"error":"Too many signup attempts...","retryAfter":...}
```

### 6.2: Test CSRF Protection

```bash
# Missing CSRF token - should fail with 403
curl -X POST https://your-domain.com/api/data/customers \
  -H "Cookie: routeflow_session=test-token" \
  -H "Content-Type: application/json" \
  -d '{"name":"John"}'

# Expected: {"error":"CSRF validation failed"}
```

### 6.3: Test Session Validation

```bash
# No session - should fail with 401
curl -X POST https://your-domain.com/api/data/customers \
  -H "Content-Type: application/json" \
  -d '{"name":"John"}'

# Expected: {"error":"Unauthorized"}
```

### 6.4: Check Server Logs

```bash
# If using PM2
pm2 logs routeflow

# If using Nginx
tail -f /var/log/nginx/error.log
tail -f /var/log/nginx/access.log

# If using system logs
journalctl -u routeflow -f
```

---

## Phase 7: Monitor & Maintain

### 7.1: Monitor Performance

```bash
# Check server resources
htop

# Check disk space
df -h

# Check memory
free -h

# Check running processes
ps aux | grep node
```

### 7.2: Check Application Health

```bash
# Monitor logs in real-time
pm2 logs --lines 100

# Check error rate
grep -c "ERROR" /var/log/application.log

# Check rate limit triggers
grep "429" /var/log/nginx/access.log | wc -l
```

### 7.3: Database Backups

```bash
# Backup your database (daily)
pg_dump "postgresql://user:pass@host/dbname" > backup-$(date +%Y%m%d).sql

# Or use Neon's built-in backups (neon.tech dashboard)
```

### 7.4: Update & Patch

```bash
# Update system packages
sudo apt update && sudo apt upgrade -y

# Update Node.js
sudo apt upgrade nodejs

# Update NPM packages
npm update

# Rebuild & restart
npm run build
pm2 restart routeflow
```

---

## Phase 8: Troubleshooting

### Issue: "Connection refused"

```bash
# Check if port 3000 is listening
netstat -tulpn | grep 3000

# Check if app is running
pm2 status

# Check logs
pm2 logs routeflow
```

### Issue: "Rate limiting not working"

```bash
# Verify Redis connection
curl https://your-redis-url.upstash.io/ping

# Check Redis token in .env
cat /opt/routeflow/.env | grep UPSTASH

# Test Redis manually
redis-cli -u "redis://user:pass@host:port" PING
```

### Issue: "CSRF tokens not validating"

```bash
# Check database table exists
psql "postgresql://..." -c "SELECT * FROM csrf_tokens LIMIT 1;"

# Check migrations were applied
psql "postgresql://..." -c "\dt"
```

### Issue: "500 errors"

```bash
# Check server logs
tail -100 /var/log/nginx/error.log

# Check application logs
pm2 logs routeflow --lines 100

# Verify .env variables
ssh root@server "cat /opt/routeflow/.env"
```

---

## Phase 9: Rollback Plan

If something breaks:

### Quick Rollback (Last Version)

```bash
# Stop current version
pm2 stop routeflow

# Go back to previous build
cd /opt/routeflow
git checkout HEAD~1
npm run build

# Start again
pm2 start routeflow
```

### Database Rollback

```bash
# Restore from backup
psql "postgresql://..." < backup-YYYYMMDD.sql

# Or drop tables and reapply migrations
psql "postgresql://..." -c "DROP TABLE sessions, csrf_tokens;"
# Then reapply migrations from Phase 3
```

### Full Revert

```bash
# Stop the app
pm2 stop routeflow
pm2 delete routeflow

# Remove everything
rm -rf /opt/routeflow

# Start fresh with previous version
git clone https://github.com/your-username/routeflow.git /opt/routeflow
cd /opt/routeflow
git checkout v1.0.0  # Your previous tag
npm install
npm run build
pm2 start "node server.js" --name "routeflow"
```

---

## Checklist for Production

Before going live:

- [ ] Tests passing locally (npm test)
- [ ] Build successful (npm run build)
- [ ] Database migrations applied
- [ ] .env configured on server
- [ ] Redis connection verified
- [ ] API running and accessible
- [ ] Rate limiting working (429 on 4th attempt)
- [ ] CSRF protection working (403 without token)
- [ ] Session validation working (401 without session)
- [ ] HTTPS configured (Let's Encrypt)
- [ ] Nginx reverse proxy working
- [ ] PM2 process manager running
- [ ] Logs being monitored
- [ ] Backups configured
- [ ] Monitoring alerts set up

---

## Quick Command Reference

```bash
# Local testing
npm test && npm run build

# Deploy to server
git push origin main
ssh root@server "cd /opt/routeflow && git pull && npm run build && pm2 restart routeflow"

# Monitor logs
pm2 logs routeflow

# Check status
pm2 status

# Database connection
psql "postgresql://user:pass@host/dbname"

# Restart app
pm2 restart routeflow

# View processes
pm2 list
```

---

**Status:** Ready for deployment! 🚀

Start with Phase 1, then follow through to Phase 9 for full production setup.
