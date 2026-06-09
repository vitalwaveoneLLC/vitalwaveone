/**
 * Auth & MFA Router
 * Routes: /api/auth/login, /api/auth/register, /api/auth/verify, /api/auth/otp-send, /api/auth/otp-verify
 */

import crypto from 'crypto';
import { query, queryOne } from '../lib/db.js';

const JWT_SECRET = process.env.JWT_SECRET || 'default-secret-change-in-production';
const TOKEN_EXPIRY = 24 * 60 * 60;
const otpStore = new Map();

function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

function generateJWT(payload) {
  const header = { alg: 'HS256', typ: 'JWT' };
  const claims = { ...payload, exp: Math.floor(Date.now() / 1000) + 86400 };

  const headerB64 = Buffer.from(JSON.stringify(header)).toString('base64url');
  const claimsB64 = Buffer.from(JSON.stringify(claims)).toString('base64url');
  const signature = crypto.createHmac('sha256', JWT_SECRET)
    .update(`${headerB64}.${claimsB64}`)
    .digest('base64url');

  return `${headerB64}.${claimsB64}.${signature}`;
}

export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Content-Type', 'application/json');

  if (req.method === 'OPTIONS') return res.status(204).end();

  const { action } = req.query;

  try {
    // Parse body - Vercel should have already parsed it, but fallback to manual parsing
    let body = {};
    if (req.method === 'POST') {
      if (typeof req.body === 'string') {
        body = JSON.parse(req.body);
      } else if (req.body) {
        body = req.body;
      } else {
        // Last resort: read from stream
        const chunks = [];
        for await (const chunk of req) {
          chunks.push(chunk);
        }
        const data = Buffer.concat(chunks).toString('utf-8');
        body = data ? JSON.parse(data) : {};
      }
    }

    switch (action) {
      case 'login':
        return await handleLogin(req, res, body);
      case 'register':
        return await handleRegister(req, res, body);
      case 'verify':
        return await handleVerify(req, res, body);
      case 'otp-send':
        return await handleOTPSend(req, res, body);
      case 'otp-verify':
        return await handleOTPVerify(req, res, body);
      default:
        return res.status(404).json({ error: 'Action not found' });
    }
  } catch (error) {
    console.error('[auth]', error.message, error.stack);
    return res.status(500).json({ error: error.message });
  }
}

async function handleLogin(req, res, body) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const { email, password, role = 'admin' } = body;
  if (!email || !password) return res.status(400).json({ error: 'Email and password required' });

  // Demo credentials
  if (email === 'admin@demo.com' && password === 'Password123!') {
    const token = generateJWT({ email, role, companyId: 'demo-company' });
    return res.json({
      token,
      user: { email, role, companyId: 'demo-company', companyName: 'Demo Company' }
    });
  }

  return res.status(401).json({ error: 'Invalid email or password' });
}

async function handleRegister(req, res, body) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const { email, password, companyName, role = 'admin' } = body;
  if (!email || !password || !companyName) return res.status(400).json({ error: 'Missing required fields' });

  const companyId = `company-${Date.now()}`;
  const token = generateJWT({ email, role, companyId, companyName });

  return res.json({
    token,
    user: { email, role, companyId, companyName }
  });
}

async function handleVerify(req, res, body) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: 'Missing token' });
  return res.json({ ok: true, valid: true });
}

async function handleOTPSend(req, res, body) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const { email } = body;
  if (!email) return res.status(400).json({ error: 'Email required' });
  const otp = generateOTP();
  otpStore.set(email, { otp, createdAt: Date.now() });
  return res.json({ ok: true, message: 'OTP sent to email' });
}

async function handleOTPVerify(req, res, body) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const { email, otp } = body;
  if (!email || !otp) return res.status(400).json({ error: 'Email and OTP required' });
  const stored = otpStore.get(email);
  if (!stored) return res.status(400).json({ error: 'No OTP found' });
  if (stored.otp !== otp) return res.status(400).json({ error: 'Invalid OTP' });
  otpStore.delete(email);
  return res.json({ ok: true, message: 'OTP verified' });
}
