// ═══════════════════════════════════════════════════════════════════════════
// VitalWaveOne Email OTP Authentication API (api/auth.js)
// Replaces WhatsApp with secure Email OTP system
// ═══════════════════════════════════════════════════════════════════════════

const crypto = require('crypto');
const nodemailer = require('nodemailer');

// In-memory storage (replace with database in production)
const otpStore = new Map(); // Format: { email: { code, expiry, attempts } }
const users = new Map();    // Format: { email: { password, name, role } }

// Email service configuration
const mailTransporter = nodemailer.createTransport({
  service: process.env.EMAIL_SERVICE || 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

/**
 * Generate 6-digit OTP code
 */
function generateOtp() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

/**
 * Send OTP via email
 */
async function sendOtpEmail(email, otp) {
  const mailOptions = {
    from: process.env.EMAIL_FROM || 'noreply@vitalwaveone.com',
    to: email,
    subject: '🎯 Your VitalWaveOne Login Code',
    html: `
      <div style="font-family: Inter, sans-serif; max-width: 500px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 40px; text-align: center; border-radius: 12px 12px 0 0;">
          <h1 style="margin: 0; font-size: 24px;">VitalWaveOne</h1>
          <p style="margin: 8px 0 0 0; opacity: 0.9;">Secure Login Code</p>
        </div>

        <div style="background: white; padding: 40px; border-radius: 0 0 12px 12px; border: 1px solid #e2e8f0; border-top: none;">
          <p style="color: #1a202c; font-size: 16px; margin: 0 0 24px 0;">
            Your secure login code is:
          </p>

          <div style="background: linear-gradient(135deg, rgba(102, 126, 234, 0.05) 0%, rgba(118, 75, 162, 0.05) 100%); padding: 24px; border-radius: 8px; text-align: center; margin: 0 0 24px 0; border: 2px solid #667eea;">
            <p style="margin: 0; font-size: 32px; font-weight: 700; color: #667eea; letter-spacing: 6px;">
              ${otp}
            </p>
          </div>

          <p style="color: #6b7280; font-size: 14px; margin: 0 0 16px 0;">
            ⏱️ <strong>This code expires in 5 minutes</strong>
          </p>

          <div style="background: #fee2e2; border-left: 4px solid #ef4444; padding: 16px; border-radius: 4px; margin: 0 0 24px 0;">
            <p style="color: #991b1b; margin: 0; font-size: 13px;">
              <strong>⚠️ Security Notice:</strong> Never share this code with anyone. VitalWaveOne staff will never ask for it.
            </p>
          </div>

          <p style="color: #6b7280; font-size: 12px; text-align: center; margin: 0;">
            Questions? Contact <a href="mailto:support@vitalwaveone.com" style="color: #667eea; text-decoration: none;">support@vitalwaveone.com</a>
          </p>
        </div>
      </div>
    `
  };

  try {
    await mailTransporter.sendMail(mailOptions);
    return true;
  } catch (error) {
    console.error('Email send failed:', error.message);
    return false;
  }
}

/**
 * POST /api/auth/send-otp
 * Send OTP code to email
 */
export async function sendOtp(req, res) {
  const { email } = req.body;

  try {
    // Validate email
    if (!email || !email.includes('@')) {
      return res.status(400).json({ error: 'Valid email required' });
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Rate limiting: 3 OTP requests per hour
    const existing = otpStore.get(normalizedEmail);
    if (existing && existing.requestCount >= 3) {
      const timeSinceReset = Date.now() - existing.lastRequestTime;
      if (timeSinceReset < 3600000) { // 1 hour
        return res.status(429).json({
          error: 'Too many OTP requests. Please try again later.'
        });
      }
    }

    // Generate OTP
    const code = generateOtp();
    const expiry = Date.now() + 5 * 60 * 1000; // 5 minutes

    // Store OTP
    otpStore.set(normalizedEmail, {
      code,
      expiry,
      attempts: 0,
      requestCount: (existing?.requestCount || 0) + 1,
      lastRequestTime: Date.now()
    });

    // Send email
    const sent = await sendOtpEmail(normalizedEmail, code);

    if (!sent) {
      return res.status(500).json({ error: 'Failed to send OTP. Please try again.' });
    }

    // Mask email for response
    const maskedEmail = normalizedEmail.split('@')[0].substring(0, 1) + '***@' + normalizedEmail.split('@')[1];

    return res.json({
      success: true,
      message: `OTP sent to ${maskedEmail}`,
      expiresIn: 300, // seconds
      email: normalizedEmail
    });

  } catch (error) {
    console.error('[AUTH] Send OTP error:', error.message);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * POST /api/auth/verify-otp
 * Verify OTP code and create/login user
 */
export async function verifyOtp(req, res) {
  const { email, otp, name, role } = req.body;

  try {
    // Validate inputs
    if (!email || !otp) {
      return res.status(400).json({ error: 'Email and OTP required' });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const otpData = otpStore.get(normalizedEmail);

    // Check if OTP exists
    if (!otpData) {
      return res.status(400).json({ error: 'No OTP found for this email. Request a new one.' });
    }

    // Check expiry
    if (Date.now() > otpData.expiry) {
      otpStore.delete(normalizedEmail);
      return res.status(400).json({ error: 'OTP expired. Request a new one.' });
    }

    // Check attempts
    if (otpData.attempts >= 3) {
      otpStore.delete(normalizedEmail);
      return res.status(400).json({ error: 'Too many failed attempts. Request a new OTP.' });
    }

    // Verify OTP
    if (otp !== otpData.code) {
      otpData.attempts += 1;
      const remaining = 3 - otpData.attempts;

      if (remaining === 0) {
        otpStore.delete(normalizedEmail);
        return res.status(400).json({ error: 'Too many failed attempts. Request a new OTP.' });
      }

      return res.status(400).json({
        error: `Invalid OTP. ${remaining} attempt${remaining !== 1 ? 's' : ''} remaining.`
      });
    }

    // OTP verified - check if user exists
    let user = users.get(normalizedEmail);

    if (!user) {
      // New user - need to set password
      return res.json({
        success: true,
        message: 'OTP verified. Please set your password.',
        isNewUser: true,
        tempToken: generateTempToken(normalizedEmail),
        email: normalizedEmail
      });
    }

    // Existing user - create session
    const sessionToken = generateSessionToken(normalizedEmail, user.role);

    // Clear OTP
    otpStore.delete(normalizedEmail);

    return res.json({
      success: true,
      message: 'Logged in successfully',
      token: sessionToken,
      user: {
        email: normalizedEmail,
        name: user.name,
        role: user.role
      },
      email: normalizedEmail
    });

  } catch (error) {
    console.error('[AUTH] Verify OTP error:', error.message);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * POST /api/auth/register
 * Register new user with password
 */
export async function register(req, res) {
  const { email, password, confirmPassword, name, role, tempToken } = req.body;

  try {
    // Validate token
    if (!validateTempToken(tempToken)) {
      return res.status(400).json({ error: 'Invalid or expired session. Please login again.' });
    }

    // Validate password
    if (!password || password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters' });
    }

    if (password !== confirmPassword) {
      return res.status(400).json({ error: 'Passwords do not match' });
    }

    if (!/[A-Z]/.test(password) || !/[a-z]/.test(password) || !/[0-9]/.test(password)) {
      return res.status(400).json({
        error: 'Password must contain uppercase, lowercase, and number'
      });
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Check if user exists
    if (users.has(normalizedEmail)) {
      return res.status(400).json({ error: 'User already exists' });
    }

    // Hash password (in production, use bcryptjs)
    const hashedPassword = await hashPassword(password);

    // Create user
    users.set(normalizedEmail, {
      password: hashedPassword,
      name: name || normalizedEmail.split('@')[0],
      role: role || 'customer',
      createdAt: new Date().toISOString()
    });

    // Create session
    const sessionToken = generateSessionToken(normalizedEmail, role || 'customer');

    // Clear OTP
    otpStore.delete(normalizedEmail);

    return res.json({
      success: true,
      message: 'Account created successfully',
      token: sessionToken,
      user: {
        email: normalizedEmail,
        name: name || normalizedEmail.split('@')[0],
        role: role || 'customer'
      }
    });

  } catch (error) {
    console.error('[AUTH] Register error:', error.message);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * Helper: Generate temporary token for new user
 */
function generateTempToken(email) {
  return Buffer.from(`temp:${email}:${Date.now()}`).toString('base64');
}

/**
 * Helper: Validate temporary token
 */
function validateTempToken(token) {
  try {
    const decoded = Buffer.from(token, 'base64').toString('utf-8');
    const [type, email, time] = decoded.split(':');

    if (type !== 'temp') return false;

    // Token valid for 15 minutes
    const age = Date.now() - parseInt(time);
    return age < 15 * 60 * 1000;
  } catch {
    return false;
  }
}

/**
 * Helper: Generate session token (JWT-like)
 */
function generateSessionToken(email, role) {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64');
  const payload = Buffer.from(JSON.stringify({
    email,
    role,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 24 * 60 * 60 // 24 hours
  })).toString('base64');

  const signature = crypto
    .createHmac('sha256', process.env.JWT_SECRET || 'dev-secret')
    .update(`${header}.${payload}`)
    .digest('base64');

  return `${header}.${payload}.${signature}`;
}

/**
 * Helper: Hash password (use bcryptjs in production)
 */
async function hashPassword(password) {
  // For development: simple hash
  // In production, use: bcryptjs.hash(password, 10)
  return crypto.createHash('sha256').update(password + process.env.PASSWORD_SALT).digest('hex');
}

/**
 * Main handler
 */
export default async function handler(req, res) {
  const { action } = req.query;

  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  switch (action) {
    case 'send-otp':
      return sendOtp(req, res);
    case 'verify-otp':
      return verifyOtp(req, res);
    case 'register':
      return register(req, res);
    default:
      return res.status(400).json({ error: 'Unknown action' });
  }
}
