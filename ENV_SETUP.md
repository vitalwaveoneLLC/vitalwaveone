# VitalWaveOne - Environment Setup Guide

## Overview
This guide walks you through setting up environment variables for VitalWaveOne deployment.

---

## Prerequisites
- Node.js 16+ installed
- npm or yarn package manager
- Access to your deployment platform (Vercel, Netlify, etc.)

---

## 1. Local Development Setup

### Create `.env.local` file
Copy `.env.example` and create `.env.local`:

```bash
cp .env.example .env.local
```

### Add Required Variables

#### API Configuration
```env
# API Base URL
VITE_API_URL=http://localhost:5173/api
```

#### Email Service (For OTP)
```env
# Email service provider (gmail, sendgrid, mailgun, etc.)
EMAIL_SERVICE=gmail
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-specific-password
EMAIL_FROM=noreply@vitalwaveone.com
```

**Gmail Setup**:
1. Go to [myaccount.google.com/apppasswords](https://myaccount.google.com/apppasswords)
2. Enable 2-Step Verification if not already done
3. Generate "App Password" for Mail
4. Use the 16-character password as `EMAIL_PASS`

**SendGrid Setup**:
```env
SENDGRID_API_KEY=SG.your-api-key-here
```

**Mailgun Setup**:
```env
MAILGUN_API_KEY=key-your-api-key-here
MAILGUN_DOMAIN=mail.your-domain.com
```

#### Authentication & Security
```env
# JWT Secret for session tokens
JWT_SECRET=your-very-secure-random-string-32-characters-minimum

# CSRF Token configuration
CSRF_SECRET=your-csrf-token-secret

# Password salt for hashing
PASSWORD_SALT=your-password-salt-string
```

**Generate Secure Secrets**:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

---

## 2. Production Deployment Setup

### Vercel Deployment

#### Step 1: Connect Repository
```bash
vercel link
```

#### Step 2: Add Environment Variables
```bash
vercel env add VITE_API_URL
# Enter: https://your-domain.com/api

vercel env add EMAIL_SERVICE
# Enter: sendgrid (recommended for production)

vercel env add SENDGRID_API_KEY
# Enter: SG.your-production-api-key

vercel env add JWT_SECRET
# Enter: production-grade-secret-key

vercel env add CSRF_SECRET
# Enter: production-csrf-secret

vercel env add PASSWORD_SALT
# Enter: production-password-salt
```

#### Step 3: Deploy
```bash
vercel deploy --prod
```

### Netlify Deployment

1. Go to Site Settings → Build & Deploy → Environment
2. Add environment variables:
   - `VITE_API_URL`
   - `EMAIL_SERVICE`
   - `SENDGRID_API_KEY` or `EMAIL_USER`/`EMAIL_PASS`
   - `JWT_SECRET`
   - `CSRF_SECRET`
   - `PASSWORD_SALT`

3. Redeploy your site

---

## 3. Email Service Setup

### Option A: Gmail (Free, Good for Development)
```env
EMAIL_SERVICE=gmail
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=xxxx-xxxx-xxxx-xxxx
EMAIL_FROM=noreply@vitalwaveone.com
```

**Warning**: Gmail limits to 500 emails/day. Not recommended for production.

### Option B: SendGrid (Recommended for Production)
1. Sign up at [sendgrid.com](https://sendgrid.com)
2. Create API key in Settings → API Keys
3. Set environment variables:

```env
SENDGRID_API_KEY=SG.your-key-here
EMAIL_FROM=noreply@vitalwaveone.com
```

### Option C: Mailgun (Good Alternative)
```env
MAILGUN_API_KEY=key-your-key
MAILGUN_DOMAIN=mail.yourdomain.com
EMAIL_FROM=noreply@yourdomain.com
```

---

## 4. Security Configuration

### JWT Secret
Used for signing session tokens:
```env
JWT_SECRET=your-256-bit-hex-string
```

Generate with:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### CSRF Protection
Prevents cross-site request forgery:
```env
CSRF_SECRET=your-csrf-secret-key
```

### Password Hashing
Salt for password hashing:
```env
PASSWORD_SALT=your-salt-string-with-32-chars
```

---

## 5. Complete Environment File Example

```env
# ═══════════════════════════════════════════════════════
# VitalWaveOne Environment Configuration
# ═══════════════════════════════════════════════════════

# API Configuration
VITE_API_URL=http://localhost:5173/api
NODE_ENV=development

# Email Service (SendGrid Recommended)
EMAIL_SERVICE=sendgrid
SENDGRID_API_KEY=SG.xxxxxxxxxxxxxxxxxxxx
EMAIL_FROM=noreply@vitalwaveone.com

# Alternative: Gmail
# EMAIL_SERVICE=gmail
# EMAIL_USER=your-email@gmail.com
# EMAIL_PASS=xxxx-xxxx-xxxx-xxxx

# Security
JWT_SECRET=your-very-secure-random-string-32-characters-minimum
CSRF_SECRET=your-csrf-token-secret-here
PASSWORD_SALT=your-password-salt-string

# Database (if using)
# DATABASE_URL=postgresql://user:password@localhost:5432/vitalwaveone

# Monitoring (optional)
# SENTRY_DSN=https://your-sentry-key@sentry.io/project-id

# Feature Flags (optional)
# ENABLE_ANALYTICS=true
# ENABLE_LOGGING=true
```

---

## 6. Verification Checklist

### Local Development
- [ ] `.env.local` file created
- [ ] All email service variables set
- [ ] JWT_SECRET configured
- [ ] CSRF_SECRET configured
- [ ] Password salt set
- [ ] Can run `npm run dev` without errors

### Testing Email OTP
```bash
# 1. Start dev server
npm run dev

# 2. Go to login page
# 3. Enter test email
# 4. Check console or email inbox for OTP
# 5. Verify OTP works
```

### Production
- [ ] All variables set in deployment platform
- [ ] No sensitive data in public repo
- [ ] Email service validated
- [ ] JWT secret is unique (not dev secret)
- [ ] CSRF protection enabled
- [ ] Rate limiting configured

---

## 7. Troubleshooting

### Email Not Sending
1. Check `EMAIL_SERVICE` is correct
2. Verify API keys/credentials
3. Check spam folder
4. Review server logs: `vercel logs`

### CSRF Token Errors
1. Ensure `CSRF_SECRET` is set
2. Check request headers include `X-CSRF-Token`
3. Clear browser cache and localStorage

### JWT Errors
1. Verify `JWT_SECRET` matches across sessions
2. Check token not expired (24-hour default)
3. Ensure token stored in localStorage correctly

### Rate Limiting Issues
1. OTP limited to 3 per hour per email
2. Wait before retrying
3. Check IP not blocked

---

## 8. Production Security Recommendations

### Must Do
1. **Use SendGrid** or similar service (not Gmail)
2. **Rotate secrets** every 90 days
3. **Enable HTTPS** (automatic with Vercel/Netlify)
4. **Set strong JWT_SECRET** (use crypto.randomBytes)
5. **Mask emails** in responses (show a***@example.com)

### Should Do
1. Enable CORS for specific domains only
2. Implement rate limiting on auth endpoints
3. Monitor failed login attempts
4. Use database for persistent OTP storage
5. Implement audit logging

### Nice to Have
1. Add Sentry for error tracking
2. Implement analytics
3. Add monitoring dashboard
4. Use Redis for rate limiting
5. Implement session management

---

## 9. Environment Variables Reference

| Variable | Required | Type | Example |
|----------|----------|------|---------|
| VITE_API_URL | Yes | string | http://localhost:5173/api |
| EMAIL_SERVICE | Yes | string | sendgrid |
| SENDGRID_API_KEY | Yes* | string | SG.xxx |
| JWT_SECRET | Yes | string | abc123xyz... |
| CSRF_SECRET | Yes | string | xyz789abc... |
| PASSWORD_SALT | Yes | string | salt123... |

*Required if using SendGrid

---

## 10. Next Steps

1. Complete environment setup
2. Test OTP flow locally
3. Verify email delivery
4. Deploy to production
5. Monitor first week of operations

For detailed deployment instructions, see [DEPLOYMENT_CHECKLIST.md](./DEPLOYMENT_CHECKLIST.md)
