// api/auth.js — Consolidated auth handler with Email OTP
// Routes: POST /api/auth?action=send-otp|verify-otp|find-driver|verify-admin
// FIX #1: Email OTP authentication replaces WhatsApp
import { checkRateLimit } from '../lib/middleware/rate-limiter.js';
import nodemailer from 'nodemailer';

// Create Gmail transporter for email OTP delivery
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD,
  },
});

// In-memory OTP store (replace with database in production)
const otpStore = new Map();
const OTP_EXPIRY = 5 * 60 * 1000; // 5 minutes
const MAX_OTP_ATTEMPTS = 3;
const OTP_ATTEMPT_WINDOW = 15 * 60 * 1000; // 15 minutes

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Content-Type', 'application/json');

  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { action } = req.query;

  try {
    switch (action) {
      case 'send-otp':
        return await handleSendOtp(req, res);
      case 'verify-otp':
        return await handleVerifyOtp(req, res);
      case 'find-driver':
        return await handleFindDriver(req, res);
      case 'verify-admin':
        return await handleVerifyAdmin(req, res);
      default:
        return res.status(400).json({ error: 'Invalid action' });
    }
  } catch (e) {
    console.error('[auth-handler]', {
      action: action,
      message: e.message,
    });
    return res.status(500).json({ error: 'Server error' });
  }
}

/**
 * FIX #1: Send OTP via email (replaces WhatsApp)
 * Generates 6-digit OTP and sends via email
 * Implements rate limiting and attempt tracking
 */
async function handleSendOtp(req, res) {
  const { phone, email } = req.body || {};

  // Validate inputs - email required for email OTP
  if (!email) {
    return res.status(400).json({ error: 'Email required' });
  }

  // Sanitize phone (optional for email OTP)
  let clean = phone ? String(phone).replace(/\D/g, '') : 'unknown';
  if (phone && clean.length < 10) {
    return res.status(400).json({ error: 'Invalid phone number' });
  }

  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({ error: 'Invalid email format' });
  }

  // Rate limiting (use email as key since it's required)
  const rateKey = `otp:${email}`;
  const rateLimit = await checkRateLimit(rateKey, 6, 3600); // 6 attempts per hour
  if (!rateLimit.allowed) {
    return res.status(429).json({
      error: 'Too many OTP requests. Please try again later.',
      retryAfter: rateLimit.retryAfter,
    });
  }

  try {
    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = Date.now() + OTP_EXPIRY;

    // Store OTP with metadata (use email as key for email OTP)
    otpStore.set(email, {
      otp,
      email,
      phone: clean,
      expiresAt,
      attempts: 0,
      lastAttempt: Date.now(),
    });

    // Clean up expired OTPs periodically
    cleanupExpiredOtps();

    // Send OTP via Gmail SMTP
    try {
      const emailContent = generateOtpEmail(otp, clean);
      await transporter.sendMail({
        from: process.env.GMAIL_USER,
        to: email,
        subject: emailContent.subject,
        html: emailContent.html,
      });
      console.log(`[OTP-EMAIL] Sent to ${email} for phone: ${clean}`);
    } catch (emailError) {
      console.error('[OTP-EMAIL-SEND-FAILED]', emailError.message);
      // Still return success since OTP is stored server-side
      // Email may be retried or user can request again
    }

    return res.json({
      ok: true,
      message: 'OTP sent to email',
      maskedEmail: maskEmail(email),
      expiresIn: Math.floor(OTP_EXPIRY / 1000),
    });
  } catch (e) {
    console.error('[send-otp]', e.message);
    return res.status(500).json({ error: 'Failed to send OTP' });
  }
}

/**
 * FIX #1: Verify OTP sent via email
 * Validates OTP and manages attempt tracking
 */
async function handleVerifyOtp(req, res) {
  const { phone, email, otp } = req.body || {};

  // OTP and email required (phone is optional for email OTP)
  if (!otp || !email) {
    return res.status(400).json({ error: 'Email and OTP required' });
  }

  // Sanitize phone (optional for email OTP)
  let clean = phone ? String(phone).replace(/\D/g, '') : 'unknown';
  if (phone && clean.length < 10) {
    return res.status(400).json({ error: 'Invalid phone number' });
  }

  // Validate OTP format
  if (!/^\d{6}$/.test(otp)) {
    return res.status(400).json({ error: 'Invalid OTP format' });
  }

  try {
    const session = otpStore.get(email);

    if (!session) {
      return res.status(401).json({ error: 'OTP not found. Request a new one.' });
    }

    // Check expiry
    if (Date.now() > session.expiresAt) {
      otpStore.delete(email);
      return res.status(401).json({ error: 'OTP expired. Request a new one.' });
    }

    // Check attempt limit
    if (session.attempts >= MAX_OTP_ATTEMPTS) {
      otpStore.delete(email);
      return res.status(429).json({ error: 'Too many attempts. Request a new OTP.' });
    }

    // Verify OTP
    if (session.otp !== otp) {
      session.attempts += 1;
      session.lastAttempt = Date.now();
      return res.status(401).json({
        error: 'Invalid OTP',
        attemptsRemaining: MAX_OTP_ATTEMPTS - session.attempts,
      });
    }

    // OTP verified - cleanup
    otpStore.delete(email);

    // Generate session token
    const token = Buffer.from(JSON.stringify({
      phone: session.phone || clean,
      email: session.email,
      verified: true,
      iat: Date.now(),
    })).toString('base64');

    return res.json({
      ok: true,
      token,
      phone: clean,
      email: session.email,
    });
  } catch (e) {
    console.error('[verify-otp]', e.message);
    return res.status(500).json({ error: 'OTP verification failed' });
  }
}

/**
 * Find driver by phone (for driver app login)
 */
async function handleFindDriver(req, res) {
  const { phone } = req.body || {};

  if (!phone) {
    return res.status(400).json({ error: 'Phone required' });
  }

  const clean = String(phone).replace(/\D/g, '');
  if (clean.length < 10) {
    return res.status(400).json({ error: 'Invalid phone number' });
  }

  // Rate limiting
  const rateLimit = await checkRateLimit(`driver:${clean}`, 5, 900); // 5 attempts per 15 min
  if (!rateLimit.allowed) {
    return res.status(429).json({
      error: 'Too many login attempts. Please try again later.',
      retryAfter: rateLimit.retryAfter,
    });
  }

  try {
    // For now, return mock driver data
    // In production, query your database
    const mockDrivers = [
      { id: 'D001', name: 'John Smith', phone: '3175096262', truck_name: 'Truck 1' },
      { id: 'D002', name: 'Jane Doe', phone: '4125551234', truck_name: 'Truck 2' },
    ];

    const driver = mockDrivers.find(d => d.phone === clean || d.phone.endsWith(clean.slice(-7)));

    if (!driver) {
      return res.status(404).json({
        error: 'Driver not found. Contact your admin.',
      });
    }

    return res.json({
      ok: true,
      driver: {
        id: driver.id,
        name: driver.name,
        phone: driver.phone,
        truck_name: driver.truck_name,
      },
    });
  } catch (e) {
    console.error('[find-driver]', e.message);
    return res.status(500).json({ error: 'Driver lookup failed' });
  }
}

/**
 * Verify admin credentials
 */
async function handleVerifyAdmin(req, res) {
  const { phone } = req.body || {};

  if (!phone) {
    return res.status(400).json({ error: 'Phone required' });
  }

  try {
    // For now, return mock admin data
    // In production, query your profiles table
    const mockAdmins = [
      { id: 'A001', name: 'Admin User', phone: '+1-317-509-6262', role: 'admin' },
    ];

    const clean = String(phone).replace(/\D/g, '');
    const admin = mockAdmins.find(a => a.phone.replace(/\D/g, '') === clean);

    if (!admin) {
      return res.status(401).json({
        ok: false,
        error: 'This phone number is not registered as an admin.',
      });
    }

    return res.json({
      ok: true,
      admin: {
        id: admin.id,
        name: admin.name,
        role: admin.role,
      },
    });
  } catch (e) {
    console.error('[verify-admin]', e.message);
    return res.status(500).json({ error: 'Admin verification failed' });
  }
}

/**
 * Generate OTP email HTML and subject
 */
function generateOtpEmail(otp, phone) {
  const expiryTime = 5; // minutes

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="UTF-8">
        <style>
          body { font-family: 'Inter', sans-serif; background: #f8f5f0; }
          .container { max-width: 600px; margin: 0 auto; background: #fff; padding: 40px; border-radius: 16px; }
          .header { text-align: center; margin-bottom: 32px; }
          .header h1 { margin: 0; font-size: 28px; color: #0a1628; }
          .header p { margin: 8px 0 0 0; color: #6b7280; font-size: 14px; }
          .otp-box { background: #f9f8f5; padding: 24px; border-radius: 12px; text-align: center; margin: 24px 0; }
          .otp-code { font-size: 36px; font-weight: 700; letter-spacing: 4px; color: #0a1628; font-family: 'Courier New', monospace; }
          .info { background: #f0f9ff; padding: 16px; border-radius: 8px; margin: 24px 0; border-left: 4px solid #667eea; }
          .info p { margin: 0; color: #334155; font-size: 14px; }
          .footer { text-align: center; margin-top: 32px; color: #6b7280; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🛒 VitalWaveOne</h1>
            <p>Your Login Verification Code</p>
          </div>

          <p style="color: #334155; font-size: 14px; margin-bottom: 16px;">
            Hi there,
          </p>

          <p style="color: #334155; font-size: 14px; margin-bottom: 24px;">
            We received a login request for your VitalWaveOne account associated with <strong>${phone}</strong>.
          </p>

          <p style="color: #334155; font-size: 14px; margin-bottom: 8px;">
            Here's your verification code:
          </p>

          <div class="otp-box">
            <div class="otp-code">${otp}</div>
          </div>

          <div class="info">
            <p><strong>⏱️ This code expires in ${expiryTime} minutes</strong></p>
            <p style="margin-top: 8px;">Do not share this code with anyone. VitalWaveOne staff will never ask for your code.</p>
          </div>

          <p style="color: #334155; font-size: 14px; margin-bottom: 8px;">
            Didn't request this code? Your account may be compromised. <a href="https://vitalwaveone.com/help" style="color: #667eea; text-decoration: none;">Contact support immediately.</a>
          </p>

          <div class="footer">
            <p>VitalWaveOne LLC | 317-509-6262 | support@vitalwaveone.com</p>
            <p style="margin-top: 8px;">© ${new Date().getFullYear()} VitalWaveOne LLC. All rights reserved.</p>
          </div>
        </div>
      </body>
    </html>
  `;

  return {
    subject: `Your VitalWaveOne Login Code: ${otp}`,
    html: html.trim(),
  };
}

/**
 * Clean up expired OTPs from memory
 */
function cleanupExpiredOtps() {
  const now = Date.now();
  for (const [key, session] of otpStore.entries()) {
    if (now > session.expiresAt) {
      otpStore.delete(key);
    }
  }
}

/**
 * Mask email for display (j***@example.com)
 */
function maskEmail(email) {
  if (!email) return email;
  const [local, domain] = email.split('@');
  if (!local || !domain) return email;
  const masked = local.charAt(0) + '***' + local.charAt(local.length - 1);
  return `${masked}@${domain}`;
}
