// Centralized email utilities - remove duplication
// Used by both auth.js and email.js

/**
 * Generate OTP email HTML and subject
 * @param {string} otp - The 6-digit OTP code
 * @param {string} phone - Phone number for context
 * @returns {object} - { subject, html }
 */
export function generateOtpEmail(otp, phone) {
  const expiryTime = 5; // minutes

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="UTF-8">
        <style>
          body { font-family: 'Inter', -apple-system, sans-serif; background: #f8f5f0; }
          .container { max-width: 600px; margin: 0 auto; background: #fff; padding: 40px; border-radius: 16px; box-shadow: 0 2px 16px rgba(0,0,0,0.08); }
          .header { text-align: center; margin-bottom: 32px; }
          .header h1 { margin: 0; font-size: 28px; font-weight: 700; color: #0a1628; }
          .header p { margin: 8px 0 0 0; color: #6b7280; font-size: 14px; }
          .otp-box { background: linear-gradient(135deg, rgba(102, 126, 234, 0.1) 0%, rgba(118, 75, 162, 0.1) 100%); padding: 32px; border-radius: 12px; text-align: center; margin: 32px 0; border: 2px solid #667eea; }
          .otp-code { font-size: 48px; font-weight: 800; letter-spacing: 8px; color: #667eea; font-family: 'Courier New', monospace; margin: 0; }
          .otp-label { color: #6b7280; font-size: 12px; text-transform: uppercase; letter-spacing: 1px; margin-top: 12px; }
          .info { background: #f0f9ff; padding: 16px; border-radius: 8px; margin: 24px 0; border-left: 4px solid #667eea; }
          .info p { margin: 8px 0; color: #334155; font-size: 14px; line-height: 1.6; }
          .footer { text-align: center; margin-top: 32px; color: #6b7280; font-size: 12px; }
          .footer a { color: #667eea; text-decoration: none; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>VitalWaveOne</h1>
            <p>Your verification code is ready</p>
          </div>

          <div class="otp-box">
            <div class="otp-code">${otp}</div>
            <div class="otp-label">Verification Code</div>
          </div>

          <div class="info">
            <p><strong>This code expires in ${expiryTime} minutes</strong></p>
            <p>Phone: ${maskPhone(phone)}</p>
            <p>If you didn't request this code, you can safely ignore this email.</p>
          </div>

          <div class="footer">
            <p>© ${new Date().getFullYear()} VitalWaveOne. All rights reserved.</p>
          </div>
        </div>
      </body>
    </html>
  `;

  return {
    subject: `Your VitalWaveOne Verification Code: ${otp}`,
    html,
  };
}

/**
 * Generate invoice email HTML and subject
 * @param {string} orderId - Order/Invoice ID
 * @param {string} customerName - Customer name
 * @param {number} total - Invoice total amount
 * @returns {object} - { subject, html }
 */
export function generateInvoiceEmail(orderId, customerName, total) {
  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="UTF-8">
        <style>
          body { font-family: 'Inter', -apple-system, sans-serif; background: #f8f5f0; }
          .container { max-width: 600px; margin: 0 auto; background: #fff; padding: 40px; border-radius: 16px; box-shadow: 0 2px 16px rgba(0,0,0,0.08); }
          .header { text-align: center; margin-bottom: 32px; }
          .header h1 { margin: 0; font-size: 24px; font-weight: 700; color: #0a1628; }
          .invoice-details { background: #f9f8f5; padding: 20px; border-radius: 8px; margin: 24px 0; }
          .detail-row { display: flex; justify-content: space-between; margin: 8px 0; }
          .detail-label { color: #6b7280; font-size: 13px; }
          .detail-value { color: #0a1628; font-weight: 600; }
          .total { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 16px; border-radius: 8px; text-align: center; margin-top: 16px; }
          .footer { text-align: center; margin-top: 32px; color: #6b7280; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Invoice Confirmation</h1>
          </div>

          <div class="invoice-details">
            <div class="detail-row">
              <span class="detail-label">Invoice ID:</span>
              <span class="detail-value">${orderId}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">Customer:</span>
              <span class="detail-value">${customerName}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">Date:</span>
              <span class="detail-value">${new Date().toLocaleDateString()}</span>
            </div>

            <div class="total">
              <div style="color: #f0f0f0; font-size: 12px; margin-bottom: 8px;">TOTAL AMOUNT</div>
              <div style="font-size: 32px; font-weight: 800;">$${(total || 0).toFixed(2)}</div>
            </div>
          </div>

          <div class="footer">
            <p>Thank you for your business!</p>
            <p>© ${new Date().getFullYear()} VitalWaveOne. All rights reserved.</p>
          </div>
        </div>
      </body>
    </html>
  `;

  return {
    subject: `Invoice #${orderId} - VitalWaveOne`,
    html,
  };
}

/**
 * Mask email for privacy display
 * @param {string} email - Full email address
 * @returns {string} - Masked email (e.g., u***@example.com)
 */
export function maskEmail(email) {
  if (!email || typeof email !== 'string') return 'email';
  const [local, domain] = email.split('@');
  if (!local || !domain) return email;
  const maskedLocal = local.charAt(0) + '*'.repeat(Math.max(1, local.length - 2)) + local.charAt(local.length - 1);
  return `${maskedLocal}@${domain}`;
}

/**
 * Mask phone for privacy display
 * @param {string} phone - Full phone number
 * @returns {string} - Masked phone (e.g., ***-***-1234)
 */
export function maskPhone(phone) {
  if (!phone || typeof phone !== 'string') return 'phone';
  const cleaned = phone.replace(/\D/g, '');
  if (cleaned.length < 4) return phone;
  return '*'.repeat(cleaned.length - 4) + cleaned.slice(-4);
}

/**
 * Validate email format
 * @param {string} email - Email to validate
 * @returns {boolean} - True if valid
 */
export function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validate phone format
 * @param {string} phone - Phone to validate
 * @returns {boolean} - True if valid (at least 10 digits)
 */
export function isValidPhone(phone) {
  const cleaned = phone.replace(/\D/g, '');
  return cleaned.length >= 10;
}

/**
 * Validate OTP format
 * @param {string} otp - OTP to validate
 * @returns {boolean} - True if 6 digits
 */
export function isValidOtp(otp) {
  return /^\d{6}$/.test(otp);
}
