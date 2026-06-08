# VitalWaveOne OTP Testing Guide

## Current Status
The OTP authentication system is fully functional. If Gmail credentials are not configured, the system operates in **Development Mode**.

## Development Mode (No Gmail Credentials)

When Gmail credentials are NOT set, the OTP system:
1. ✅ Generates the OTP successfully
2. ✅ Stores it in memory  
3. ✅ Logs it to the server console
4. ❌ Does NOT send via email (credentials missing)

### How to Get the OTP in Development Mode

**Option A: Check Server Console**
- Run: `npm run dev` (dev server) or check Vercel logs (production)
- When you request an OTP, look for: `[DEV MODE] OTP for email@example.com: 123456`
- Copy the 6-digit code from the console

**Option B: Use Test API Endpoint** (Development Only)
```bash
curl -X POST http://localhost:5173/api/auth?action=test-get-otp \
  -H "Content-Type: application/json" \
  -d '{"email":"driver@example.com"}'
```

Response:
```json
{"otp": "123456"}
```

## Production Mode (Gmail Credentials Required)

To enable email OTP in production:

### Step 1: Get Gmail App Password
1. Enable 2-Step Verification on your Google account
2. Go to https://myaccount.google.com/apppasswords
3. Select "Mail" and "Windows Computer"
4. Copy the 16-character app password

### Step 2: Set Environment Variables
```bash
export GMAIL_USER="your-email@gmail.com"
export GMAIL_APP_PASSWORD="your-16-char-password"
```

### Step 3: For Vercel Deployment
1. Go to Vercel Dashboard → Settings → Environment Variables
2. Add:
   - `GMAIL_USER` = your Gmail address
   - `GMAIL_APP_PASSWORD` = your app password
3. Redeploy

## Testing Checklist

✅ **For Driver (alzaaeml@yahoo.com)**
1. Navigate to https://vitalwaveone.com/login
2. Select "Driver" role
3. Enter: alzaaeml@yahoo.com
4. Click "Send OTP"
5. Check console for: `[DEV MODE] OTP for alzaaeml@yahoo.com: XXXXXX`
6. Enter the 6-digit code
7. Create a password (8+ chars, uppercase, lowercase, number)
8. ✅ Login should succeed

## Troubleshooting

**"OTP not found" error**
- Make sure you requested the OTP first (Step 3 above)
- OTP expires after 5 minutes

**"Too many requests"**  
- Rate limit: 20 send attempts/hour per email
- Rate limit: 10 verify attempts/hour per email
- Wait before retrying

**Gmail email not arriving** (Production)
- Verify GMAIL_USER and GMAIL_APP_PASSWORD are set
- Check that Gmail allows "Less secure apps" OR use App Passwords (recommended)
- Check spam folder

---

**Current Environment**: Development (Gmail not configured)  
**Status**: ✅ OTP system working - check console for OTP codes
