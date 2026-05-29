// plan.js — VitalWaveOne SaaS Plan Enforcement
// Determines what features each tenant can access based on their plan

// ── PLAN DEFINITIONS ─────────────────────────────────────────────────────────

export const PLANS = {
  trial: {
    name: 'Free Trial',
    price: 0,
    duration: '14 days',
    maxTrucks: 2,
    maxCustomers: 20,
    maxProducts: 20,
  },
  starter: {
    name: 'Starter',
    price: 199,
    stripePriceId: process.env.STRIPE_PRICE_STARTER,
    maxTrucks: 1,
    maxCustomers: 50,
    maxProducts: 50,
  },
  standard: {
    name: 'Standard',
    price: 499,
    stripePriceId: process.env.STRIPE_PRICE_STANDARD,
    maxTrucks: 5,
    maxCustomers: 500,
    maxProducts: 500,
  },
  premium: {
    name: 'Premium',
    price: 899,
    stripePriceId: process.env.STRIPE_PRICE_PREMIUM,
    maxTrucks: 999,
    maxCustomers: 99999,
    maxProducts: 99999,
  },
  enterprise: {
    name: 'Enterprise',
    price: null, // custom
    maxTrucks: 999,
    maxCustomers: 99999,
    maxProducts: 99999,
  },
};

// ── FEATURE FLAGS ─────────────────────────────────────────────────────────────

export const FEATURES = {
  // ✅ Available on ALL plans (including trial)
  basic_invoicing:        ['trial', 'starter', 'standard', 'premium', 'enterprise'],
  driver_management:      ['trial', 'starter', 'standard', 'premium', 'enterprise'],
  customer_management:    ['trial', 'starter', 'standard', 'premium', 'enterprise'],
  inventory:              ['trial', 'starter', 'standard', 'premium', 'enterprise'],
  loads:                  ['trial', 'starter', 'standard', 'premium', 'enterprise'],
  payments_basic:         ['trial', 'starter', 'standard', 'premium', 'enterprise'],
  customer_portal:        ['trial', 'starter', 'standard', 'premium', 'enterprise'],
  whatsapp_otp:           ['trial', 'starter', 'standard', 'premium', 'enterprise'],
  email_invoices:         ['trial', 'starter', 'standard', 'premium', 'enterprise'],
  walk_in_sales:          ['trial', 'starter', 'standard', 'premium', 'enterprise'],
  driver_expenses:        ['trial', 'starter', 'standard', 'premium', 'enterprise'],
  recurring_orders:       ['trial', 'starter', 'standard', 'premium', 'enterprise'],

  // 🔒 STANDARD + PREMIUM only
  whatsapp_invoices:      ['standard', 'premium', 'enterprise'],
  pdf_download:           ['standard', 'premium', 'enterprise'],
  bulk_payments:          ['standard', 'premium', 'enterprise'],
  custom_pricing:         ['standard', 'premium', 'enterprise'],
  promotions:             ['standard', 'premium', 'enterprise'],
  purchase_orders:        ['standard', 'premium', 'enterprise'],
  suppliers:              ['standard', 'premium', 'enterprise'],
  payment_log:            ['standard', 'premium', 'enterprise'],
  bank_reconcile:         ['standard', 'premium', 'enterprise'],

  // 🔒 PREMIUM only
  analytics_pl:           ['premium', 'enterprise'],
  tax_reports:            ['premium', 'enterprise'],
  irs_reports:            ['premium', 'enterprise'],
  settlement_reports:     ['premium', 'enterprise'],
  credit_memos:           ['premium', 'enterprise'],
  returned_checks:        ['premium', 'enterprise'],
  audit_log:              ['premium', 'enterprise'],
  driver_performance:     ['premium', 'enterprise'],
  state_taxes:            ['premium', 'enterprise'],
  white_label:            ['premium', 'enterprise'],
  ar_aging:               ['premium', 'enterprise'],
  overdue_reminders:      ['premium', 'enterprise'],
};

// ── HELPER FUNCTIONS ──────────────────────────────────────────────────────────

// Check if a plan has access to a feature
export const hasFeature = (plan, feature) => {
  if (!plan || !feature) return false;
  const allowed = FEATURES[feature];
  if (!allowed) return true; // unknown feature = allow (safe default)
  return allowed.includes(plan);
};

// Check if tenant is within plan limits
export const withinLimits = (plan, resource, currentCount) => {
  const planConfig = PLANS[plan] || PLANS.trial;
  const limits = {
    trucks: planConfig.maxTrucks,
    customers: planConfig.maxCustomers,
    products: planConfig.maxProducts,
  };
  return currentCount < (limits[resource] || 0);
};

// Get all features available for a plan
export const getPlanFeatures = (plan) => {
  return Object.entries(FEATURES)
    .filter(([, plans]) => plans.includes(plan))
    .map(([feature]) => feature);
};

// Check if tenant subscription is active (not expired/cancelled)
export const isSubscriptionActive = (tenant) => {
  if (!tenant) return false;
  if (tenant.status !== 'active') return false;
  // Check trial
  if (tenant.plan === 'trial') {
    return new Date(tenant.trial_ends_at) > new Date();
  }
  return true;
};

// Get upgrade message for locked features
export const getUpgradeMessage = (feature, currentPlan) => {
  const requiredPlans = FEATURES[feature] || [];
  if (requiredPlans.includes('standard') && !requiredPlans.includes('trial')) {
    return {
      title: 'Standard Plan Required',
      message: 'Upgrade to Standard ($499/mo) to unlock this feature.',
      requiredPlan: 'standard',
    };
  }
  if (requiredPlans.includes('premium') && !requiredPlans.includes('standard')) {
    return {
      title: 'Premium Plan Required',
      message: 'Upgrade to Premium ($899/mo) to unlock this feature.',
      requiredPlan: 'premium',
    };
  }
  return {
    title: 'Upgrade Required',
    message: 'Upgrade your plan to unlock this feature.',
    requiredPlan: 'standard',
  };
};

// ── REACT HOOK ────────────────────────────────────────────────────────────────
// Use this in your React components to check features
// import { usePlan } from './plan.js'
// const { can, isPremium, isStandard } = usePlan()

export const createPlanHook = (tenant) => {
  const plan = tenant?.plan || 'trial';
  const active = isSubscriptionActive(tenant);

  return {
    plan,
    active,
    isTrial:      plan === 'trial',
    isStarter:    plan === 'starter',
    isStandard:   plan === 'standard',
    isPremium:    plan === 'premium' || plan === 'enterprise',
    isEnterprise: plan === 'enterprise',

    // Check if feature is available
    can: (feature) => active && hasFeature(plan, feature),

    // Check limits
    withinLimit: (resource, count) => withinLimits(plan, resource, count),

    // Get upgrade info
    upgradeInfo: (feature) => getUpgradeMessage(feature, plan),

    // Trial info
    trialDaysLeft: plan === 'trial'
      ? Math.max(0, Math.ceil((new Date(tenant?.trial_ends_at) - new Date()) / (1000 * 60 * 60 * 24)))
      : null,
  };
};
