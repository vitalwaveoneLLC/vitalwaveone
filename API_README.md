# VitalWaveOne Backend API

Complete REST API for the VitalWaveOne wholesale platform.

## 🚀 Quick Start

### Installation

```bash
npm install
```

### Environment Setup

Copy `.env.local.example` to `.env.local` and update with your credentials:

```bash
cp .env.local.example .env.local
```

### Required Environment Variables

```
VITE_STRIPE_PUBLIC_KEY=pk_test_xxxxx
STRIPE_SECRET_KEY=sk_test_xxxxx
DATABASE_URL=postgresql://user:pass@host/db
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_password
VITE_GOOGLE_MAPS_API_KEY=xxxxx
JWT_SECRET=your_secret_key_minimum_32_chars
```

### Start Development Server

```bash
npm run dev
```

Server runs on `http://localhost:5000`

## 📚 API Endpoints

### Health Check
- `GET /health` - Server health status

### Payment Processing
- `POST /api/create-payment-intent` - Create Stripe payment intent
- `POST /api/verify-payment` - Verify payment status
- `GET /api/payment-status/:paymentIntentId` - Get payment status

### Authentication (MFA/OTP)
- `POST /api/send-mfa-otp` - Send OTP to email
- `POST /api/verify-mfa-otp` - Verify OTP code
- `GET /api/mfa-status/:email` - Check MFA status
- `POST /api/clear-mfa-otp` - Clear OTP (logout)

## 🗄️ Database

Using Neon PostgreSQL. Run migrations:

```bash
npm run migrate
```

### Database Schema

- `companies` - Company registration data
- `users` - Users (customers, drivers, walk-in, admin)
- `trucks` - Fleet vehicles
- `sessions` - User sessions
- `audit_logs` - Activity logs

## 🔐 Security Features

- ✅ Stripe payment integration
- ✅ Email OTP (MFA)
- ✅ CSRF token protection
- ✅ Input sanitization
- ✅ Rate limiting
- ✅ Session management

## 📦 Dependencies

```json
{
  "express": "^4.18.2",
  "stripe": "^14.0.0",
  "pg": "^8.11.0",
  "nodemailer": "^6.9.7",
  "cors": "^2.8.5",
  "dotenv": "^16.3.1"
}
```

## 🧪 Testing

```bash
npm test
```

## 📝 Logging

All requests are logged with timestamps and response times.

## 🚀 Deployment

### Vercel

```bash
npm run build
vercel deploy
```

### Environment Variables in Vercel

Add all `.env.local` variables to Vercel project settings.

## 📞 Support

For API issues, check `/health` endpoint first.

## 📄 License

VitalWaveOne © 2026
