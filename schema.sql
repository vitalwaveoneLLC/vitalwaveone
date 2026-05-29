-- ============================================================
-- ROUTEFLOW SAAS — Complete Database Schema
-- Run this in Neon SQL Editor (neon.tech)
-- ============================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- SAAS CORE TABLES
-- ============================================================

-- Tenants (each paying customer = one tenant)
CREATE TABLE tenants (
  id                    uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  name                  text NOT NULL,                    -- "VitalWaveOne LLC"
  slug                  text UNIQUE NOT NULL,             -- "vitalwaveone" (URL slug)
  plan                  text NOT NULL DEFAULT 'trial',    -- 'trial' | 'starter' | 'standard' | 'premium' | 'enterprise'
  status                text NOT NULL DEFAULT 'active',   -- 'active' | 'suspended' | 'cancelled' | 'past_due'
  -- Branding (white-label)
  brand_name            text,                             -- shown to their users
  brand_logo_url        text,
  brand_primary_color   text DEFAULT '#7c3aed',
  brand_secondary_color text DEFAULT '#0a1628',
  -- Contact
  owner_email           text NOT NULL,
  owner_name            text,
  phone                 text,
  address               text,
  -- Billing
  stripe_customer_id    text UNIQUE,
  stripe_subscription_id text UNIQUE,
  -- Trial
  trial_ends_at         timestamptz DEFAULT (now() + interval '14 days'),
  -- Limits by plan
  max_trucks            int DEFAULT 1,
  max_customers         int DEFAULT 50,
  -- Timestamps
  created_at            timestamptz DEFAULT now(),
  updated_at            timestamptz DEFAULT now()
);

-- Subscriptions (Stripe subscription tracking)
CREATE TABLE subscriptions (
  id                    uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id             uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  stripe_subscription_id text UNIQUE NOT NULL,
  stripe_customer_id    text NOT NULL,
  plan                  text NOT NULL,                    -- 'starter' | 'standard' | 'premium'
  status                text NOT NULL,                    -- 'active' | 'past_due' | 'cancelled' | 'trialing'
  current_period_start  timestamptz,
  current_period_end    timestamptz,
  cancel_at_period_end  boolean DEFAULT false,
  amount                int,                              -- in cents
  currency              text DEFAULT 'usd',
  created_at            timestamptz DEFAULT now(),
  updated_at            timestamptz DEFAULT now()
);

-- Onboarding (track setup progress per tenant)
CREATE TABLE onboarding (
  id                    uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id             uuid UNIQUE NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  step                  int DEFAULT 1,                    -- 1-5
  company_done          boolean DEFAULT false,
  trucks_done           boolean DEFAULT false,
  products_done         boolean DEFAULT false,
  customers_done        boolean DEFAULT false,
  whatsapp_done         boolean DEFAULT false,
  completed_at          timestamptz,
  created_at            timestamptz DEFAULT now()
);

-- Audit log for SaaS admin (who did what across all tenants)
CREATE TABLE saas_audit_log (
  id                    uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id             uuid REFERENCES tenants(id),
  user_email            text,
  action                text NOT NULL,
  entity                text,
  detail                text,
  ip_address            text,
  created_at            timestamptz DEFAULT now()
);

-- ============================================================
-- EXISTING TABLES — All get tenant_id
-- ============================================================

-- Company settings (one per tenant)
CREATE TABLE company (
  id                    uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id             uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name                  text,
  address               text,
  phone                 text,
  email                 text,
  tax_rate              numeric DEFAULT 0,
  tax_enabled           boolean DEFAULT false,
  check_penalty         numeric DEFAULT 50,
  email_invoices        boolean DEFAULT false,
  gmail_user            text,
  gmail_app_password    text,
  from_email            text,
  whatsapp_invoices     boolean DEFAULT false,
  meta_phone_id         text,
  meta_token            text,
  meta_template         text DEFAULT 'invoice_notification',
  portal_url            text,
  stripe_payment_link   text,
  created_at            timestamptz DEFAULT now(),
  UNIQUE(tenant_id)
);

-- Profiles (users — drivers, admins, staff)
CREATE TABLE profiles (
  id                    uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id             uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  clerk_user_id         text UNIQUE,                      -- Clerk user ID
  email                 text NOT NULL,
  full_name             text,
  role                  text DEFAULT 'driver',            -- 'admin' | 'driver' | 'staff'
  phone                 text,                             -- used for WhatsApp OTP login
  truck_id              text,
  last_seen             timestamptz,
  created_at            timestamptz DEFAULT now()
);

-- Trucks (driver routes)
CREATE TABLE trucks (
  id                    text PRIMARY KEY,                 -- e.g. "T001"
  tenant_id             uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  driver                text NOT NULL,
  plate                 text,
  route                 text,
  phone                 text,
  address               text,
  locked                boolean DEFAULT false,
  state                 text,
  created_at            timestamptz DEFAULT now()
);

-- Products (inventory items)
CREATE TABLE products (
  id                    text PRIMARY KEY,
  tenant_id             uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name                  text NOT NULL,
  sku                   text,
  cat                   text DEFAULT 'general',
  unit                  text DEFAULT 'unit',
  case_qty              int DEFAULT 1,
  cost                  numeric DEFAULT 0,
  price                 numeric DEFAULT 0,
  shelf                 int DEFAULT 0,
  reorder_point         int DEFAULT 5,
  sell_by               text,
  taxable               boolean DEFAULT false,
  created_at            timestamptz DEFAULT now()
);

-- Customers
CREATE TABLE customers (
  id                    text PRIMARY KEY,
  tenant_id             uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name                  text NOT NULL,
  address               text,
  phone                 text,
  email                 text,
  state                 text,
  truck_id              text REFERENCES trucks(id),
  credit_limit          numeric DEFAULT 0,
  notes                 text,                             -- stores custom prices + flags
  created_at            timestamptz DEFAULT now()
);

-- Loads (truck loading records)
CREATE TABLE loads (
  id                    text PRIMARY KEY,
  tenant_id             uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  truck_id              text REFERENCES trucks(id),
  items                 jsonb DEFAULT '[]',
  status                text DEFAULT 'out',              -- 'out' | 'returned'
  date                  text,
  created_at            timestamptz DEFAULT now()
);

-- Invoice sequence per tenant
CREATE TABLE invoice_sequences (
  tenant_id             uuid PRIMARY KEY REFERENCES tenants(id) ON DELETE CASCADE,
  current_number        int DEFAULT 0
);

-- Sales (invoices)
CREATE TABLE sales (
  id                    text PRIMARY KEY,                 -- e.g. "INV-0001"
  tenant_id             uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  load_id               text,
  truck_id              text,
  cust_id               text,
  state                 text,
  date                  text,
  items                 jsonb DEFAULT '[]',
  total                 numeric DEFAULT 0,
  profit                numeric DEFAULT 0,
  previous_balance      numeric DEFAULT 0,
  previous_invoice_ids  text,
  check_penalty_applied numeric DEFAULT 0,
  check_penalty_invoice text,
  amended_at            timestamptz,
  email_sent            boolean DEFAULT false,
  notes                 text,
  created_at            timestamptz DEFAULT now()
);

-- Payments (per invoice)
CREATE TABLE payments (
  id                    uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id             uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  sale_id               text REFERENCES sales(id) ON DELETE CASCADE,
  status                text DEFAULT 'unpaid',           -- 'unpaid' | 'paid' | 'returned_check'
  method                text DEFAULT 'cash',             -- 'cash' | 'check' | 'card' | 'zelle'
  amount                numeric DEFAULT 0,
  check_number          text,
  bank_name             text,
  zelle_ref             text,
  returned_check_url    text,
  collected_at          timestamptz,
  created_at            timestamptz DEFAULT now(),
  UNIQUE(sale_id)
);

-- Payments log (bulk payments + history)
CREATE TABLE payments_log (
  id                    text PRIMARY KEY,
  tenant_id             uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  cust_id               text,
  truck_id              text,
  method                text,
  amount                numeric DEFAULT 0,
  check_number          text,
  bank_name             text,
  zelle_ref             text,
  invoice_ids           jsonb DEFAULT '[]',
  note                  text,
  date                  text,
  collected_at          timestamptz,
  collected_by          text,
  created_at            timestamptz DEFAULT now()
);

-- Returns
CREATE TABLE returns (
  id                    text PRIMARY KEY,
  tenant_id             uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  truck_id              text,
  load_id               text,
  items                 jsonb DEFAULT '[]',
  reason                text,
  date                  text,
  created_at            timestamptz DEFAULT now()
);

-- Expenses
CREATE TABLE expenses (
  id                    text PRIMARY KEY,
  tenant_id             uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  truck_id              text,
  driver_name           text,
  category              text,
  amount                numeric DEFAULT 0,
  description           text,
  receipt_url           text,
  date                  text,
  created_at            timestamptz DEFAULT now()
);

-- State taxes
CREATE TABLE state_taxes (
  id                    text,
  tenant_id             uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name                  text,
  rate                  numeric DEFAULT 0,
  exempt                boolean DEFAULT false,
  created_at            timestamptz DEFAULT now(),
  PRIMARY KEY(id, tenant_id)
);

-- Promotions
CREATE TABLE promotions (
  id                    text PRIMARY KEY,
  tenant_id             uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name                  text,
  type                  text,
  value                 numeric,
  product_ids           jsonb DEFAULT '[]',
  customer_ids          jsonb DEFAULT '[]',
  start_date            text,
  end_date              text,
  active                boolean DEFAULT true,
  created_at            timestamptz DEFAULT now()
);

-- Purchase orders
CREATE TABLE purchase_orders (
  id                    text PRIMARY KEY,
  tenant_id             uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  supplier_id           text,
  items                 jsonb DEFAULT '[]',
  status                text DEFAULT 'pending',
  total                 numeric DEFAULT 0,
  notes                 text,
  date                  text,
  created_at            timestamptz DEFAULT now()
);

-- Suppliers
CREATE TABLE suppliers (
  id                    text PRIMARY KEY,
  tenant_id             uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name                  text,
  contact               text,
  phone                 text,
  email                 text,
  address               text,
  notes                 text,
  created_at            timestamptz DEFAULT now()
);

-- Recurring orders
CREATE TABLE recurring_orders (
  id                    text PRIMARY KEY,
  tenant_id             uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  cust_id               text,
  cust_name             text,
  truck_id              text,
  items                 jsonb DEFAULT '[]',
  frequency             text,
  next_date             text,
  active                boolean DEFAULT true,
  notes                 text,
  created_at            timestamptz DEFAULT now()
);

-- Orders (customer portal orders)
CREATE TABLE orders (
  id                    text PRIMARY KEY,
  tenant_id             uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  cust_id               text,
  customer_name         text,
  customer_address      text,
  customer_phone        text,
  items                 jsonb DEFAULT '[]',
  subtotal              numeric DEFAULT 0,
  tax                   numeric DEFAULT 0,
  total                 numeric DEFAULT 0,
  payment_method        text DEFAULT 'delivery',
  status                text DEFAULT 'pending',
  notes                 text,
  date                  text,
  created_at            timestamptz DEFAULT now()
);

-- Credit memos
CREATE TABLE credit_memos (
  id                    text PRIMARY KEY,
  tenant_id             uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  cust_id               text,
  invoice_id            text,
  reason                text,
  amount                numeric DEFAULT 0,
  status                text DEFAULT 'open',             -- 'open' | 'applied' | 'voided'
  notes                 text,
  created_at            timestamptz DEFAULT now()
);

-- Truck resets
CREATE TABLE truck_resets (
  id                    uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id             uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  truck_id              text,
  reset_by              text,
  note                  text,
  created_at            timestamptz DEFAULT now()
);

-- Walk-in registrations
CREATE TABLE walkin_registrations (
  id                    uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id             uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name                  text,
  email                 text,
  phone                 text,
  address               text,
  role                  text DEFAULT 'staff',
  note                  text,
  status                text DEFAULT 'pending',          -- 'pending' | 'approved' | 'rejected'
  created_at            timestamptz DEFAULT now()
);

-- OTP codes (for WhatsApp login)
CREATE TABLE otp_codes (
  id                    uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  phone                 text NOT NULL,
  code                  text NOT NULL,
  expires_at            timestamptz NOT NULL,
  used                  boolean DEFAULT false,
  created_at            timestamptz DEFAULT now()
);

-- Audit log (per tenant activity)
CREATE TABLE audit_log (
  id                    text PRIMARY KEY,
  tenant_id             uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_email            text,
  action                text,
  entity                text,
  detail                text,
  created_at            timestamptz DEFAULT now()
);

-- ============================================================
-- INDEXES (performance)
-- ============================================================
CREATE INDEX idx_sales_tenant ON sales(tenant_id);
CREATE INDEX idx_sales_cust ON sales(cust_id);
CREATE INDEX idx_sales_truck ON sales(truck_id);
CREATE INDEX idx_sales_created ON sales(created_at DESC);
CREATE INDEX idx_customers_tenant ON customers(tenant_id);
CREATE INDEX idx_customers_truck ON customers(truck_id);
CREATE INDEX idx_payments_tenant ON payments(tenant_id);
CREATE INDEX idx_payments_sale ON payments(sale_id);
CREATE INDEX idx_payments_log_tenant ON payments_log(tenant_id);
CREATE INDEX idx_payments_log_cust ON payments_log(cust_id);
CREATE INDEX idx_loads_tenant ON loads(tenant_id);
CREATE INDEX idx_loads_truck ON loads(truck_id);
CREATE INDEX idx_products_tenant ON products(tenant_id);
CREATE INDEX idx_expenses_tenant ON expenses(tenant_id);
CREATE INDEX idx_trucks_tenant ON trucks(tenant_id);
CREATE INDEX idx_otp_phone ON otp_codes(phone);
CREATE INDEX idx_otp_expires ON otp_codes(expires_at);
CREATE INDEX idx_audit_tenant ON audit_log(tenant_id);
CREATE INDEX idx_audit_created ON audit_log(created_at DESC);
CREATE INDEX idx_tenants_slug ON tenants(slug);
CREATE INDEX idx_tenants_stripe ON tenants(stripe_customer_id);
CREATE INDEX idx_profiles_clerk ON profiles(clerk_user_id);
CREATE INDEX idx_profiles_tenant ON profiles(tenant_id);
CREATE INDEX idx_profiles_phone ON profiles(phone);

-- ============================================================
-- INVOICE SEQUENCE FUNCTION (per tenant)
-- ============================================================
CREATE OR REPLACE FUNCTION next_invoice_number(p_tenant_id uuid)
RETURNS int AS $$
DECLARE
  v_next int;
BEGIN
  INSERT INTO invoice_sequences(tenant_id, current_number)
  VALUES (p_tenant_id, 1)
  ON CONFLICT (tenant_id)
  DO UPDATE SET current_number = invoice_sequences.current_number + 1
  RETURNING current_number INTO v_next;
  RETURN v_next;
END;
$$ LANGUAGE plpgsql;

-- Reset invoice sequence per tenant
CREATE OR REPLACE FUNCTION reset_invoice_sequence(p_tenant_id uuid)
RETURNS void AS $$
BEGIN
  UPDATE invoice_sequences SET current_number = 0 WHERE tenant_id = p_tenant_id;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- AUTO-UPDATE updated_at
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tenants_updated_at BEFORE UPDATE ON tenants
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER subscriptions_updated_at BEFORE UPDATE ON subscriptions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- PLAN LIMITS
-- ============================================================
-- Starter:  1 truck,  50 customers
-- Standard: 5 trucks, 500 customers
-- Premium:  unlimited

CREATE OR REPLACE FUNCTION get_plan_limits(p_plan text)
RETURNS jsonb AS $$
BEGIN
  RETURN CASE p_plan
    WHEN 'starter'  THEN '{"max_trucks": 1,  "max_customers": 50,   "max_products": 50}'::jsonb
    WHEN 'standard' THEN '{"max_trucks": 5,  "max_customers": 500,  "max_products": 500}'::jsonb
    WHEN 'premium'  THEN '{"max_trucks": 999,"max_customers": 99999,"max_products": 99999}'::jsonb
    WHEN 'trial'    THEN '{"max_trucks": 2,  "max_customers": 20,   "max_products": 20}'::jsonb
    ELSE                 '{"max_trucks": 1,  "max_customers": 10,   "max_products": 10}'::jsonb
  END;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
-- Enable RLS on all tenant tables
ALTER TABLE company ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE trucks ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE loads ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE returns ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE state_taxes ENABLE ROW LEVEL SECURITY;
ALTER TABLE promotions ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE recurring_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE credit_memos ENABLE ROW LEVEL SECURITY;
ALTER TABLE truck_resets ENABLE ROW LEVEL SECURITY;
ALTER TABLE walkin_registrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

-- RLS policies — tenant isolation via API (service role bypasses RLS)
-- All access goes through Vercel API routes using service role
-- So we use simple service role bypass policies

CREATE POLICY "service_role_all" ON company FOR ALL USING (true);
CREATE POLICY "service_role_all" ON profiles FOR ALL USING (true);
CREATE POLICY "service_role_all" ON trucks FOR ALL USING (true);
CREATE POLICY "service_role_all" ON products FOR ALL USING (true);
CREATE POLICY "service_role_all" ON customers FOR ALL USING (true);
CREATE POLICY "service_role_all" ON loads FOR ALL USING (true);
CREATE POLICY "service_role_all" ON sales FOR ALL USING (true);
CREATE POLICY "service_role_all" ON payments FOR ALL USING (true);
CREATE POLICY "service_role_all" ON payments_log FOR ALL USING (true);
CREATE POLICY "service_role_all" ON returns FOR ALL USING (true);
CREATE POLICY "service_role_all" ON expenses FOR ALL USING (true);
CREATE POLICY "service_role_all" ON state_taxes FOR ALL USING (true);
CREATE POLICY "service_role_all" ON promotions FOR ALL USING (true);
CREATE POLICY "service_role_all" ON purchase_orders FOR ALL USING (true);
CREATE POLICY "service_role_all" ON suppliers FOR ALL USING (true);
CREATE POLICY "service_role_all" ON recurring_orders FOR ALL USING (true);
CREATE POLICY "service_role_all" ON orders FOR ALL USING (true);
CREATE POLICY "service_role_all" ON credit_memos FOR ALL USING (true);
CREATE POLICY "service_role_all" ON truck_resets FOR ALL USING (true);
CREATE POLICY "service_role_all" ON walkin_registrations FOR ALL USING (true);
CREATE POLICY "service_role_all" ON audit_log FOR ALL USING (true);
CREATE POLICY "service_role_all" ON otp_codes FOR ALL USING (true);

-- ============================================================
-- SEED: Insert RouteFlow's own tenant (VitalWaveOne)
-- ============================================================
INSERT INTO tenants (
  id, name, slug, plan, status,
  brand_name, brand_primary_color,
  owner_email, max_trucks, max_customers,
  trial_ends_at
) VALUES (
  uuid_generate_v4(),
  'VitalWaveOne LLC',
  'vitalwaveone',
  'premium',
  'active',
  'VitalWaveOne',
  '#7c3aed',
  'admin@vitalwaveone.com',
  999,
  99999,
  now() + interval '100 years'
) ON CONFLICT DO NOTHING;

-- ============================================================
-- MIGRATIONS (run these if schema already exists in Neon)
-- ============================================================
-- Add phone to profiles (needed for WhatsApp OTP admin login)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS phone text;
CREATE INDEX IF NOT EXISTS idx_profiles_phone ON profiles(phone);
-- Add address to trucks and walkin_registrations
ALTER TABLE trucks ADD COLUMN IF NOT EXISTS address text;
ALTER TABLE walkin_registrations ADD COLUMN IF NOT EXISTS address text;
