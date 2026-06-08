/**
 * MFA/2FA Manager - Handle multi-factor authentication for admin
 * Supports:
 * 1. Email OTP (One-Time Password)
 * 2. Authenticator App (TOTP)
 */

export class MFAManager {
  constructor() {
    this.otpAttempts = 0;
    this.maxAttempts = 3;
    this.lockoutTime = 5 * 60 * 1000; // 5 minutes
  }

  /**
   * Generate a 6-digit OTP
   */
  generateOTP() {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  /**
   * Send OTP to email (backend will handle actual sending)
   */
  async sendOTPToEmail(email) {
    try {
      const otp = this.generateOTP();

      const response = await fetch('/api/send-mfa-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          otp,
          type: 'email'
        })
      });

      if (!response.ok) {
        throw new Error('Failed to send OTP');
      }

      // Store OTP hash (don't store plain OTP)
      const otpHash = await this.hashOTP(otp);
      localStorage.setItem('mfa_otp_hash', otpHash);
      localStorage.setItem('mfa_otp_timestamp', Date.now().toString());
      localStorage.setItem('mfa_email', email);

      return {
        success: true,
        message: 'OTP sent to your email',
        expiresIn: 300 // 5 minutes
      };
    } catch (error) {
      console.error('Error sending OTP:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Verify OTP
   */
  async verifyOTP(otp) {
    try {
      const storedHash = localStorage.getItem('mfa_otp_hash');
      const timestamp = parseInt(localStorage.getItem('mfa_otp_timestamp'));

      // Check if OTP is expired (5 minutes)
      if (Date.now() - timestamp > 5 * 60 * 1000) {
        return { success: false, error: 'OTP expired' };
      }

      // Check attempt limits
      if (this.otpAttempts >= this.maxAttempts) {
        const lastAttempt = parseInt(localStorage.getItem('mfa_lockout_time') || '0');
        if (Date.now() - lastAttempt < this.lockoutTime) {
          return { success: false, error: 'Too many attempts. Please try again later.' };
        }
      }

      // Verify OTP hash
      const inputHash = await this.hashOTP(otp);
      if (inputHash === storedHash) {
        // Clear stored data
        localStorage.removeItem('mfa_otp_hash');
        localStorage.removeItem('mfa_otp_timestamp');
        localStorage.removeItem('mfa_email');
        this.otpAttempts = 0;

        return { success: true, message: 'OTP verified successfully' };
      } else {
        this.otpAttempts++;
        return { success: false, error: `Invalid OTP. ${this.maxAttempts - this.otpAttempts} attempts remaining` };
      }
    } catch (error) {
      console.error('Error verifying OTP:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Hash OTP for secure storage
   */
  async hashOTP(otp) {
    const encoder = new TextEncoder();
    const data = encoder.encode(otp);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    return hashHex;
  }

  /**
   * Generate QR code for authenticator app
   */
  generateAuthenticatorQR(email, companyName) {
    // This would normally be generated on the backend
    // For now, returning a placeholder that can be used with a service
    const secret = this.generateSecret();
    return {
      secret,
      qrCodeUrl: `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=otpauth://totp/${companyName}:${email}?secret=${secret}`
    };
  }

  /**
   * Generate a random secret for TOTP
   */
  generateSecret() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
    let secret = '';
    for (let i = 0; i < 32; i++) {
      secret += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return secret;
  }

  /**
   * Check if MFA is enabled for user
   */
  isMFAEnabled() {
    return !!localStorage.getItem('mfa_enabled');
  }

  /**
   * Enable MFA
   */
  enableMFA() {
    localStorage.setItem('mfa_enabled', 'true');
  }

  /**
   * Disable MFA
   */
  disableMFA() {
    localStorage.removeItem('mfa_enabled');
    localStorage.removeItem('mfa_secret');
  }
}

export default new MFAManager();
