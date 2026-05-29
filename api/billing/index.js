// api/billing/index.js — Stripe billing integration
// Routes: POST /api/billing/checkout, POST /api/billing/portal, POST /api/billing/webhook
//
// Runs as a Vercel Edge Function so req.text() / req.json() (Web API) work correctly.
export const config = { runtime: 'edge' };

import { sql, getTenant, ok, err, cors } from '../../lib/db/client.js';
import { validateSession } from '../../lib/middleware/auth.js';
import { csrfMiddleware } from '../../lib/middleware/csrf.js';



const STRIPE_PRICES = {
  starter:  process.env.STRIPE_PRICE_STARTER,
  standard: process.env.STRIPE_PRICE_STANDARD,
  premium:  process.env.STRIPE_PRICE_PREMIUM,
};

const stripe = async (path, method, body) => {
  const res = await fetch(`https://api.stripe.com/v1${path}`, {
    method,
    headers: {
      'Authorization': `Bearer ${process.env.STRIPE_SECRET_KEY}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: body ? new URLSearchParams(body).toString() : undefined,
  });
  return res.json();
};

export default async function handler(req) {
  if (req.method === 'OPTIONS') return cors();

  const url = new URL(req.url);
  const action = url.searchParams.get('action');

  // ── WEBHOOK (no auth needed) ──────────────────────────────────────────
  if (action === 'webhook') {
    const body = await req.text();
    const sig = req.headers.get('stripe-signature');

    // Verify Stripe webhook signature
    let event;
    try {
      const { Stripe } = await import('stripe');
      const stripeClient = new Stripe(process.env.STRIPE_SECRET_KEY);
      event = await stripeClient.webhooks.constructEventAsync(
        body, sig, process.env.STRIPE_WEBHOOK_SECRET
      );
    } catch (e) {
      return err(`Webhook signature invalid: ${e.message}`, 400);
    }

    // Handle events
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;
        const tenantId = session.metadata?.tenant_id;
        if (!tenantId) break;

        await sql`
          UPDATE tenants SET
            stripe_customer_id = ${session.customer},
            stripe_subscription_id = ${session.subscription},
            plan = ${session.metadata.plan},
            status = 'active'
          WHERE id = ${tenantId}
        `;
        break;
      }

      case 'customer.subscription.updated':
      case 'customer.subscription.deleted': {
        const sub = event.data.object;
        const status = sub.status === 'active' ? 'active'
          : sub.status === 'past_due' ? 'past_due'
          : sub.status === 'canceled' ? 'cancelled'
          : sub.status;

        await sql`
          UPDATE tenants SET status = ${status}
          WHERE stripe_subscription_id = ${sub.id}
        `;

        await sql`
          UPDATE subscriptions SET
            status = ${status},
            current_period_end = ${new Date(sub.current_period_end * 1000).toISOString()}
          WHERE stripe_subscription_id = ${sub.id}
        `;
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object;
        await sql`
          UPDATE tenants SET status = 'past_due'
          WHERE stripe_customer_id = ${invoice.customer}
        `;
        break;
      }
    }

    return ok({ received: true });
  }

  // ── All other routes require auth ─────────────────────────────────────
  // Validate session for mutations (POST)
  if (req.method === 'POST') {
    await validateSession(req, () => {});
    if (!req.session) return err('Unauthorized', 401);

    await csrfMiddleware(req, () => {});
    if (req.csrfError) return err('CSRF validation failed', 403);
  }

  const tenant = await getTenant(req);
  if (!tenant) return err('Unauthorized', 401);

  // ── CREATE CHECKOUT SESSION ───────────────────────────────────────────
  if (action === 'checkout' && req.method === 'POST') {
    const { plan, annual } = await req.json();
    const priceId = STRIPE_PRICES[plan];
    if (!priceId) return err('Invalid plan');

    const session = await stripe('/checkout/sessions', 'POST', {
      mode: 'subscription',
      'payment_method_types[]': 'card',
      'line_items[0][price]': priceId,
      'line_items[0][quantity]': '1',
      success_url: `${process.env.APP_URL}/app?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.APP_URL}/pricing`,
      customer_email: tenant.owner_email || undefined,
      'metadata[tenant_id]': tenant.tenant_id,
      'metadata[plan]': plan,
      'subscription_data[trial_period_days]': '14',
      'subscription_data[metadata][tenant_id]': tenant.tenant_id,
    });

    if (session.error) return err(session.error.message);
    return ok({ url: session.url });
  }

  // ── BILLING PORTAL ────────────────────────────────────────────────────
  if (action === 'portal' && req.method === 'POST') {
    if (!tenant.stripe_customer_id) {
      return err('No billing account found. Please subscribe first.');
    }
    const session = await stripe('/billing_portal/sessions', 'POST', {
      customer: tenant.stripe_customer_id,
      return_url: `${process.env.APP_URL}/app/settings`,
    });
    if (session.error) return err(session.error.message);
    return ok({ url: session.url });
  }

  // ── GET SUBSCRIPTION INFO ─────────────────────────────────────────────
  if (action === 'subscription' && req.method === 'GET') {
    const [sub] = await sql`
      SELECT * FROM subscriptions WHERE tenant_id = ${tenant.tenant_id} LIMIT 1
    `;
    const [ten] = await sql`
      SELECT plan, status, trial_ends_at, stripe_customer_id FROM tenants WHERE id = ${tenant.tenant_id} LIMIT 1
    `;
    return ok({ subscription: sub, tenant: ten });
  }

  return err('Not found', 404);
}
