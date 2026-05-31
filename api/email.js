// api/email.js - Email service for OTP delivery
// Sends OTP codes via Gmail SMTP

import nodemailer from 'nodemailer';

// Create Gmail transporter
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD,
  },
});

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
      case 'send-invoice':
        return await handleSendInvoice(req, res);
      default:
        return res.status(400).json({ error: 'Invalid action' });
    }
  } catch (e) {
    console.error('[email-handler]', e.message);
    return res.status(500).json({ error: 'Failed to send email' });
  }
}

/**
 * Send OTP code via email
 */
async function handleSendOtp(req, res) {
  const { email, otp, phone } = req.body || {};

  // Validate inputs
  if (!email || !otp || !phone) {
    return res.status(400).json({ error: 'Email, OTP, and phone required' });
  }

  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({ error: 'Invalid email format' });
  }

  // OTP should be 6 digits
  if (!/^\d{6}$/.test(otp)) {
    return res.status(400).json({ error: 'Invalid OTP format' });
  }

  try {
    const emailContent = generateOtpEmail(otp, phone);

    // Send email via Gmail SMTP
    await transporter.sendMail({
      from: process.env.GMAIL_USER,
      to: email,
      subject: emailContent.subject,
      html: emailContent.html,
    });

    console.log(`[EMAIL] OTP sent to ${email}:`, {
      phone,
      otp,
      timestamp: new Date().toISOString(),
    });

    return res.json({
      ok: true,
      message: 'OTP sent to email',
      email: maskEmail(email),
    });
  } catch (e) {
    console.error('[send-otp]', e.message);
    return res.status(500).json({ error: 'Failed to send email: ' + e.message });
  }
}

/**
 * Send invoice via email
 */
async function handleSendInvoice(req, res) {
  const { email, orderId, customerName, total } = req.body || {};

  if (!email || !orderId || !customerName) {
    return res.status(400).json({ error: 'Email, orderId, and customerName required' });
  }

  try {
    const emailContent = generateInvoiceEmail(orderId, customerName, total);

    // Send email via Gmail SMTP
    await transporter.sendMail({
      from: process.env.GMAIL_USER,
      to: email,
      subject: emailContent.subject,
      html: emailContent.html,
    });

    console.log(`[EMAIL] Invoice sent to ${email}:`, { orderId });

    return res.json({
      ok: true,
      message: 'Invoice sent to email',
      email: maskEmail(email),
    });
  } catch (e) {
    console.error('[send-invoice]', e.message);
    return res.status(500).json({ error: 'Failed to send invoice: ' + e.message });
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
 * Generate invoice email HTML and subject
 */
function generateInvoiceEmail(orderId, customerName, total) {
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
          .total { font-size: 24px; font-weight: 700; color: #f59e0b; margin: 16px 0; }
          .footer { text-align: center; margin-top: 32px; color: #6b7280; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>📦 Order Confirmation</h1>
          </div>

          <p style="color: #334155; font-size: 14px; margin-bottom: 16px;">
            Hi ${customerName},
          </p>

          <p style="color: #334155; font-size: 14px; margin-bottom: 24px;">
            Your order has been received and is pending approval.
          </p>

          <div style="background: #f9f8f5; padding: 16px; border-radius: 8px; margin: 24px 0;">
            <p style="margin: 0 0 8px 0; color: #6b7280; font-size: 12px; text-transform: uppercase;">Order #</p>
            <p style="margin: 0; color: #0a1628; font-size: 18px; font-weight: 700;">${orderId}</p>
          </div>

          <div style="background: #f9f8f5; padding: 16px; border-radius: 8px; margin: 24px 0;">
            <p style="margin: 0 0 8px 0; color: #6b7280; font-size: 12px; text-transform: uppercase;">Total Amount</p>
            <div class="total">$${Number(total || 0).toFixed(2)}</div>
          </div>

          <p style="color: #334155; font-size: 14px; margin-bottom: 16px;">
            We'll send you a confirmation once your order is approved by our team.
          </p>

          <p style="color: #334155; font-size: 14px; margin-bottom: 24px;">
            Questions? Contact us at support@vitalwaveone.com
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
    subject: `Order Confirmation: ${orderId}`,
    html: html.trim(),
  };
}

/**
 * Mask email address for display (e.g., j***@example.com)
 */
function maskEmail(email) {
  if (!email) return email;
  const [local, domain] = email.split('@');
  const masked = local.charAt(0) + '***' + local.charAt(local.length - 1);
  return `${masked}@${domain}`;
}
