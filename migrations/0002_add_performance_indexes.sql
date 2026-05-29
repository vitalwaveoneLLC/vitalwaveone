-- migrations/0002_add_performance_indexes.sql
-- Add indexes to optimize query performance
-- Run: psql -h neon.tech -U postgres -d routeflow < migrations/0002_add_performance_indexes.sql

-- ── TENANT ISOLATION (PRIMARY INDEXES) ─────────────────────────
CREATE INDEX IF NOT EXISTS idx_customers_tenant_id ON customers(tenant_id);
CREATE INDEX IF NOT EXISTS idx_products_tenant_id ON products(tenant_id);
CREATE INDEX IF NOT EXISTS idx_sales_tenant_id ON sales(tenant_id);
CREATE INDEX IF NOT EXISTS idx_payments_tenant_id ON payments(tenant_id);
CREATE INDEX IF NOT EXISTS idx_drivers_tenant_id ON drivers(tenant_id);
CREATE INDEX IF NOT EXISTS idx_trucks_tenant_id ON trucks(tenant_id);
CREATE INDEX IF NOT EXISTS idx_loads_tenant_id ON loads(tenant_id);
CREATE INDEX IF NOT EXISTS idx_orders_tenant_id ON orders(tenant_id);
CREATE INDEX IF NOT EXISTS idx_recurring_orders_tenant_id ON recurring_orders(tenant_id);
CREATE INDEX IF NOT EXISTS idx_suppliers_tenant_id ON suppliers(tenant_id);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_tenant_id ON purchase_orders(tenant_id);

-- ── FOREIGN KEY LOOKUPS ───────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_sales_customer_id ON sales(customer_id);
CREATE INDEX IF NOT EXISTS idx_sales_truck_id ON sales(truck_id);
CREATE INDEX IF NOT EXISTS idx_sales_driver_id ON sales(driver_id);
CREATE INDEX IF NOT EXISTS idx_payments_customer_id ON payments(customer_id);
CREATE INDEX IF NOT EXISTS idx_payments_sale_id ON payments(sale_id);
CREATE INDEX IF NOT EXISTS idx_loads_driver_id ON loads(driver_id);
CREATE INDEX IF NOT EXISTS idx_loads_truck_id ON loads(truck_id);
CREATE INDEX IF NOT EXISTS idx_orders_customer_id ON orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_orders_driver_id ON orders(driver_id);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_supplier_id ON purchase_orders(supplier_id);

-- ── TIME-BASED QUERIES (date filtering) ───────────────────────
CREATE INDEX IF NOT EXISTS idx_sales_created_at ON sales(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_payments_created_at ON payments(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_recurring_orders_next_date ON recurring_orders(next_date);

-- ── STATUS QUERIES ────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_sales_payment_status ON sales(payment_status);
CREATE INDEX IF NOT EXISTS idx_sales_status ON sales(status);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_loads_status ON loads(status);
CREATE INDEX IF NOT EXISTS idx_drivers_status ON drivers(status);

-- ── COMPOSITE INDEXES (tenant_id + other column) ──────────────
-- These speed up common WHERE clauses like WHERE tenant_id = X AND status = Y
CREATE INDEX IF NOT EXISTS idx_customers_tenant_status ON customers(tenant_id, status) WHERE status IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_products_tenant_active ON products(tenant_id, is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_sales_tenant_created ON sales(tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_payments_tenant_created ON payments(tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_drivers_tenant_status ON drivers(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_loads_tenant_status ON loads(tenant_id, status);

-- ── TEXT SEARCH (LIKE queries on phone/email/name) ────────────
-- For faster LIKE and ILIKE queries
CREATE INDEX IF NOT EXISTS idx_customers_phone ON customers USING btree (phone);
CREATE INDEX IF NOT EXISTS idx_customers_email ON customers USING btree (email);
CREATE INDEX IF NOT EXISTS idx_customers_name ON customers USING btree (name);
CREATE INDEX IF NOT EXISTS idx_drivers_phone ON drivers USING btree (phone);
CREATE INDEX IF NOT EXISTS idx_suppliers_name ON suppliers USING btree (name);

-- ── UNIQUE CONSTRAINTS (add as needed) ───────────────────────
CREATE UNIQUE INDEX IF NOT EXISTS idx_otp_codes_phone_code ON otp_codes(phone, code) WHERE used = false;
CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_tenant_email ON profiles(tenant_id, email);

-- ── ANALYZE (update table statistics for query planner) ───────
ANALYZE customers;
ANALYZE products;
ANALYZE sales;
ANALYZE payments;
ANALYZE drivers;
ANALYZE trucks;
ANALYZE loads;
ANALYZE orders;
ANALYZE recurring_orders;
ANALYZE suppliers;
ANALYZE purchase_orders;

-- ── MAINTENANCE ──────────────────────────────────────────────
-- Optional: Check index bloat (run periodically)
-- SELECT schemaname, tablename, indexname, idx_scan
-- FROM pg_stat_user_indexes
-- WHERE idx_scan = 0 ORDER BY schemaname, tablename;
