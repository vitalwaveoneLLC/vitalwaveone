-- ============================================================================
-- VitalWaveOne RLS (Row Level Security) Policies - CRITICAL SECURITY FIX
-- ============================================================================
-- This migration implements database-level tenant isolation using PostgreSQL RLS
-- Previously, only application-level filtering was used, creating a data leak risk
--
-- RLS enforces:
-- - Each user can only see data for their tenant
-- - Direct SQL queries respect tenant boundaries
-- - No bypass possible if application filtering is skipped
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE drivers ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- 1. COMPANIES TABLE - Allow users to see only their own company
-- ============================================================================
CREATE POLICY "companies_tenant_isolation" ON companies
  FOR ALL USING (
    id IN (
      SELECT company_id FROM users
      WHERE auth_uid = auth.uid()
    )
  );

-- ============================================================================
-- 2. USERS TABLE - Users can see company users only
-- ============================================================================
CREATE POLICY "users_same_company" ON users
  FOR SELECT USING (
    company_id IN (
      SELECT company_id FROM users
      WHERE auth_uid = auth.uid()
    )
  );

CREATE POLICY "users_update_own" ON users
  FOR UPDATE USING (
    auth_uid = auth.uid() OR
    company_id IN (
      SELECT company_id FROM users
      WHERE auth_uid = auth.uid() AND role = 'admin'
    )
  );

-- ============================================================================
-- 3. DRIVERS TABLE - Filter by company_id (tenant isolation)
-- ============================================================================
CREATE POLICY "drivers_tenant_isolation" ON drivers
  FOR ALL USING (
    company_id IN (
      SELECT company_id FROM users
      WHERE auth_uid = auth.uid()
    )
  );

-- ============================================================================
-- 4. CUSTOMERS TABLE - Filter by company_id
-- ============================================================================
CREATE POLICY "customers_tenant_isolation" ON customers
  FOR ALL USING (
    company_id IN (
      SELECT company_id FROM users
      WHERE auth_uid = auth.uid()
    )
  );

-- ============================================================================
-- 5. PRODUCTS TABLE - Filter by company_id
-- ============================================================================
CREATE POLICY "products_tenant_isolation" ON products
  FOR ALL USING (
    company_id IN (
      SELECT company_id FROM users
      WHERE auth_uid = auth.uid()
    )
  );

-- ============================================================================
-- 6. SALES TABLE - Filter by company_id (critical for financial data)
-- ============================================================================
CREATE POLICY "sales_tenant_isolation" ON sales
  FOR ALL USING (
    company_id IN (
      SELECT company_id FROM users
      WHERE auth_uid = auth.uid()
    )
  );

-- ============================================================================
-- 7. SALES_ITEMS TABLE - Filter through sales table
-- ============================================================================
CREATE POLICY "sales_items_tenant_isolation" ON sales_items
  FOR ALL USING (
    sale_id IN (
      SELECT id FROM sales
      WHERE company_id IN (
        SELECT company_id FROM users
        WHERE auth_uid = auth.uid()
      )
    )
  );

-- ============================================================================
-- 8. PAYMENTS_LOG TABLE - Filter by company_id (critical for payments)
-- ============================================================================
CREATE POLICY "payments_log_tenant_isolation" ON payments_log
  FOR ALL USING (
    company_id IN (
      SELECT company_id FROM users
      WHERE auth_uid = auth.uid()
    )
  );

-- ============================================================================
-- 9. AUDIT_LOGS TABLE - Filter by company_id (critical for compliance)
-- ============================================================================
CREATE POLICY "audit_logs_tenant_isolation" ON audit_logs
  FOR SELECT USING (
    company_id IN (
      SELECT company_id FROM users
      WHERE auth_uid = auth.uid()
    )
  );

CREATE POLICY "audit_logs_insert" ON audit_logs
  FOR INSERT WITH CHECK (
    company_id IN (
      SELECT company_id FROM users
      WHERE auth_uid = auth.uid()
    )
  );

-- ============================================================================
-- 10. ORDERS TABLE - Filter by company_id
-- ============================================================================
CREATE POLICY "orders_tenant_isolation" ON orders
  FOR ALL USING (
    cust_id IN (
      SELECT id FROM customers
      WHERE company_id IN (
        SELECT company_id FROM users
        WHERE auth_uid = auth.uid()
      )
    )
  );

-- ============================================================================
-- 11. SESSIONS TABLE - Users can only see their own sessions
-- ============================================================================
CREATE POLICY "sessions_own_only" ON sessions
  FOR ALL USING (
    user_id IN (
      SELECT id FROM users
      WHERE auth_uid = auth.uid()
    )
  );

-- ============================================================================
-- VERIFICATION QUERIES - Run these to verify RLS is working
-- ============================================================================
-- After deployment, run these as a superuser to verify policies are active:

-- SELECT tablename FROM pg_tables
-- WHERE schemaname='public'
-- AND tablename NOT LIKE 'pg_%';

-- SELECT schemaname, tablename, rowsecurity
-- FROM pg_tables
-- WHERE schemaname='public' AND rowsecurity=true;

-- ============================================================================
-- DEPLOYMENT NOTES
-- ============================================================================
-- 1. Deploy this migration to Supabase
-- 2. Test with multi-tenant scenario:
--    - User A logs in, can see only Company A data
--    - User B logs in, can see only Company B data
--    - Direct SQL queries respect RLS (test via Supabase Studio)
-- 3. Monitor audit logs for access attempts
-- 4. Update application to remove application-level filtering (optional but recommended)
-- ============================================================================
