// api/queries/optimized-queries.js
// Optimized SQL queries to eliminate N+1 patterns
import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL);

/**
 * Get drivers WITH their loads in a single query (eliminates N+1)
 * Before: 1 query for drivers + N queries for loads
 * After: 1 JOIN query
 */
export async function getDriversWithLoads(tenantId) {
  return sql`
    SELECT
      d.id, d.tenant_id, d.name, d.phone, d.status,
      jsonb_agg(
        jsonb_build_object(
          'id', l.id,
          'truck_id', l.truck_id,
          'total_value', l.total_value,
          'status', l.status,
          'created_at', l.created_at
        ) ORDER BY l.created_at DESC
      ) FILTER (WHERE l.id IS NOT NULL) AS loads
    FROM drivers d
    LEFT JOIN loads l ON l.driver_id = d.id
    WHERE d.tenant_id = ${tenantId}::uuid
    GROUP BY d.id, d.tenant_id, d.name, d.phone, d.status
    ORDER BY d.created_at DESC
  `;
}

/**
 * Get sales WITH customers and items in a single query
 * Before: 1 query for sales + N queries for customers + N queries for items
 * After: 1 JOIN query with aggregation
 */
export async function getSalesWithDetails(tenantId, limit = 50, offset = 0) {
  return sql`
    SELECT
      s.id, s.tenant_id, s.customer_id, s.truck_id, s.driver_id,
      s.total, s.subtotal, s.tax_amount, s.discount_amount,
      s.payment_status, s.created_at,
      c.name AS customer_name, c.phone AS customer_phone,
      jsonb_agg(
        jsonb_build_object(
          'product_id', si.product_id,
          'quantity', si.quantity,
          'price', si.price,
          'discount', si.discount_percent
        ) ORDER BY si.created_at
      ) FILTER (WHERE si.id IS NOT NULL) AS items
    FROM sales s
    LEFT JOIN customers c ON c.id = s.customer_id
    LEFT JOIN sale_items si ON si.sale_id = s.id
    WHERE s.tenant_id = ${tenantId}::uuid
    GROUP BY s.id, s.tenant_id, s.customer_id, s.truck_id, s.driver_id,
             s.total, s.subtotal, s.tax_amount, s.discount_amount,
             s.payment_status, s.created_at, c.name, c.phone
    ORDER BY s.created_at DESC
    LIMIT ${limit}
    OFFSET ${offset}
  `;
}

/**
 * Get customer WITH their sales and payments (entire account view)
 * Single query replaces 3+ queries
 */
export async function getCustomerWithHistory(customerId, tenantId) {
  return sql`
    SELECT
      c.id, c.tenant_id, c.name, c.phone, c.email, c.address,
      c.balance, c.credit_limit, c.created_at,
      jsonb_agg(
        DISTINCT jsonb_build_object(
          'id', s.id,
          'total', s.total,
          'payment_status', s.payment_status,
          'created_at', s.created_at
        ) ORDER BY (s.id, s.created_at) DESC
      ) FILTER (WHERE s.id IS NOT NULL) AS sales,
      jsonb_agg(
        DISTINCT jsonb_build_object(
          'id', p.id,
          'amount', p.amount,
          'method', p.method,
          'created_at', p.created_at
        ) ORDER BY (p.id, p.created_at) DESC
      ) FILTER (WHERE p.id IS NOT NULL) AS payments
    FROM customers c
    LEFT JOIN sales s ON s.customer_id = c.id
    LEFT JOIN payments p ON p.customer_id = c.id
    WHERE c.id = ${customerId}::uuid
      AND c.tenant_id = ${tenantId}::uuid
    GROUP BY c.id, c.tenant_id, c.name, c.phone, c.email, c.address,
             c.balance, c.credit_limit, c.created_at
  `;
}

/**
 * Get all products WITH stock and recent sales
 */
export async function getProductsWithStats(tenantId) {
  return sql`
    SELECT
      p.id, p.tenant_id, p.sku, p.name, p.price, p.unit,
      p.category, p.stock, p.min_stock, p.created_at,
      COUNT(DISTINCT si.sale_id) AS sales_count,
      SUM(si.quantity) AS total_sold,
      CASE
        WHEN p.stock < p.min_stock THEN 'low'
        WHEN p.stock = 0 THEN 'out'
        ELSE 'ok'
      END AS stock_status
    FROM products p
    LEFT JOIN sale_items si ON si.product_id = p.id
      AND si.created_at > now() - interval '30 days'
    WHERE p.tenant_id = ${tenantId}::uuid
    GROUP BY p.id, p.tenant_id, p.sku, p.name, p.price, p.unit,
             p.category, p.stock, p.min_stock, p.created_at
    ORDER BY p.created_at DESC
  `;
}

/**
 * Get revenue statistics (dashboard KPI)
 * Single aggregation query instead of multiple separate queries
 */
export async function getRevenueStats(tenantId, daysBack = 30) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - daysBack);

  return sql`
    SELECT
      DATE_TRUNC('day', s.created_at)::date AS date,
      COUNT(DISTINCT s.id) AS sales_count,
      SUM(s.subtotal) AS revenue,
      SUM(s.tax_amount) AS tax_collected,
      SUM(s.discount_amount) AS discounts,
      SUM(s.total) AS total_amount,
      COUNT(DISTINCT s.customer_id) AS unique_customers,
      COUNT(DISTINCT s.driver_id) AS drivers_active
    FROM sales s
    WHERE s.tenant_id = ${tenantId}::uuid
      AND s.created_at >= ${startDate}
    GROUP BY DATE_TRUNC('day', s.created_at)
    ORDER BY date DESC
  `;
}

/**
 * Bulk get multiple resources by IDs (replaces N queries with 1)
 */
export async function getBulkCustomers(customerIds, tenantId) {
  return sql`
    SELECT id, tenant_id, name, phone, email, address, balance, credit_limit
    FROM customers
    WHERE id = ANY(${customerIds}::uuid[])
      AND tenant_id = ${tenantId}::uuid
  `;
}

export async function getBulkProducts(productIds, tenantId) {
  return sql`
    SELECT id, tenant_id, sku, name, price, unit, category, stock
    FROM products
    WHERE id = ANY(${productIds}::uuid[])
      AND tenant_id = ${tenantId}::uuid
  `;
}

export async function getBulkSales(saleIds, tenantId) {
  return sql`
    SELECT id, tenant_id, customer_id, total, payment_status, created_at
    FROM sales
    WHERE id = ANY(${saleIds}::uuid[])
      AND tenant_id = ${tenantId}::uuid
  `;
}

export default {
  getDriversWithLoads,
  getSalesWithDetails,
  getCustomerWithHistory,
  getProductsWithStats,
  getRevenueStats,
  getBulkCustomers,
  getBulkProducts,
  getBulkSales,
};
