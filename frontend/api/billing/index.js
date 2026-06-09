/**
 * Stripe Billing Integration
 * Routes: /api/billing/checkout, /api/billing/portal, /api/billing/webhook
 */

import { query, queryOne, getTenant } from './lib/db.js';

const STRIPE_PRICES = {
  starter: process.env.STRIPE_PRICE_STARTER,
  standard: process.env.STRIPE_PRICE_STANDARD,
  premium: process.env.STRIPE_PRICE_PREMIUM,
};

async function stripe(path, method, body) {
  const res = await fetch(`https://api.stripe.com/v1${path}`, {
    method,
    headers: {
      'Authorization': `Bearer ${process.env.STRIPE_SECRET_KEY}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: body ? new URLSearchParams(body).toString() : undefined,
  });
  return res.json();
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Tenant-ID');

  if (req.method === 'OPTIONS') return res.status(204).end();

  const { action } = req.query;

  try {
    const tenant = await getTenant(req);
    if (!tenant) return res.status(401).json({ error: 'Unauthorized' });

    switch (action) {
      case 'checkout':
        return handleCheckout(req, res, tenant);
      case 'portal':
        return handlePortal(req, res, tenant);
      case 'webhook':
        return handleWebhook(req, res);
      case 'subscription':
        return handleSubscription(req, res, tenant);
      default:
        return res.status(404).json({ error: 'Action not found' });
    }
  } catch (error) {
    console.error('[billing]', error.message);
    return res.status(500).json({ error: error.message });
  }
}

async function handleCheckout(req, res, tenant) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const { plan } = req.body || {};
  if (!plan) return res.status(400).json({ error: 'Plan required' });
  
  const priceId = STRIPE_PRICES[plan];
  if (!priceId) return res.status(400).json({ error: 'Invalid plan' });

  const session = await stripe('/checkout/sessions', 'POST', {
    mode: 'subscription',
    'payment_method_types[]': 'card',
    'line_items[0][price]': priceId,
    'line_items[0][quantity]': '1',
    'metadata[tenant_id]': tenant.tenant_id,
  });

  if (session.error) return res.status(400).json({ error: session.error.message });
  return res.json({ ok: true, url: session.url });
}

async function handlePortal(req, res, tenant) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  if (!tenant.stripe_customer_id) {
    return res.status(400).json({ error: 'No billing account found' });
  }

  const session = await stripe('/billing_portal/sessions', 'POST', {
    customer: tenant.stripe_customer_id,
    return_url: `${process.env.VITE_APP_URL}/app/settings`,
  });

  if (session.error) return res.status(400).json({ error: session.error.message });
  return res.json({ ok: true, url: session.url });
}

async function handleWebhook(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  // Webhook signature verification would go here
  return res.json({ ok: true, received: true });
}

async function handleSubscription(req, res, tenant) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  return res.json({
    ok: true,
    plan: tenant.plan,
    status: tenant.status,
    trial_ends_at: tenant.trial_ends_at,
  });
}
