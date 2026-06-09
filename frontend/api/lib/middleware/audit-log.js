// api/middleware/audit-log.js - Log all mutations for audit trail

import { neon } from '@neondatabase/serverless';

/**
 * Log audit event for compliance and security monitoring
 * @param {Object} req - Express request object
 * @param {string} action - Action performed (e.g., 'customer_created', 'payment_updated')
 * @param {Object} changes - Changes made (before/after data)
 * @param {Object} metadata - Additional metadata
 */
export async function logAudit(req, action, changes = {}, metadata = {}) {
  const sql = neon(process.env.DATABASE_URL);

  try {
    const userId = req.session?.userId || null;
    const tenantId = req.session?.tenantId || req.headers['x-tenant-id'] || null;
    const ipAddress = req.ip || req.connection.remoteAddress || null;
    const userAgent = req.headers['user-agent'] || null;

    await sql`
      INSERT INTO audit_logs (
        user_id,
        tenant_id,
        action,
        changes,
        metadata,
        ip_address,
        user_agent,
        created_at
      ) VALUES (
        ${userId},
        ${tenantId},
        ${action},
        ${JSON.stringify(changes)},
        ${JSON.stringify(metadata)},
        ${ipAddress},
        ${userAgent},
        NOW()
      )
    `;

    console.log(`[audit] ${action} by ${userId} at ${new Date().toISOString()}`);
  } catch (error) {
    console.error('[audit] Failed to log audit event:', error.message);
    // Don't throw - audit failure shouldn't break the request
  }
}

/**
 * Query audit logs with filters
 * @param {Object} filters - Filter criteria
 * @returns {Promise<Array>} Audit log entries
 */
export async function queryAuditLogs(filters = {}) {
  const sql = neon(process.env.DATABASE_URL);

  try {
    const { tenantId, userId, action, startDate, endDate, limit = 100 } = filters;

    let query = 'SELECT * FROM audit_logs WHERE 1=1';
    const params = [];

    if (tenantId) {
      query += ` AND tenant_id = $${params.length + 1}`;
      params.push(tenantId);
    }

    if (userId) {
      query += ` AND user_id = $${params.length + 1}`;
      params.push(userId);
    }

    if (action) {
      query += ` AND action = $${params.length + 1}`;
      params.push(action);
    }

    if (startDate) {
      query += ` AND created_at >= $${params.length + 1}`;
      params.push(startDate);
    }

    if (endDate) {
      query += ` AND created_at <= $${params.length + 1}`;
      params.push(endDate);
    }

    query += ` ORDER BY created_at DESC LIMIT ${limit}`;

    const results = await sql(query, params);
    return results;
  } catch (error) {
    console.error('[audit] Failed to query audit logs:', error.message);
    return [];
  }
}

/**
 * Middleware to automatically log mutations
 */
export async function auditMiddleware(req, res, next) {
  // Only log mutations
  if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
    return next();
  }

  // Capture original send
  const originalSend = res.send;

  res.send = function (data) {
    // Log on success (2xx status)
    if (res.statusCode >= 200 && res.statusCode < 300) {
      const action = `${req.method}_${req.path.split('/').pop()}`;
      logAudit(req, action, {
        method: req.method,
        path: req.path,
        body: req.body,
        response: typeof data === 'string' ? JSON.parse(data) : data,
      });
    }

    // Call original send
    return originalSend.call(this, data);
  };

  next();
}
