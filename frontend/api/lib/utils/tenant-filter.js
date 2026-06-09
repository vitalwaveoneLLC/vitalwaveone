/**
 * Tenant Filter Utilities
 * Enforces company_id filtering on all data queries
 * Prevents cross-tenant data leakage
 */

/**
 * Add company filter to WHERE clause
 * Ensures queries are automatically scoped to user's company
 */
export function addCompanyFilter(baseQuery, companyId, tableAlias = '') {
  const alias = tableAlias ? `${tableAlias}.` : '';
  return `${baseQuery} AND ${alias}company_id = '${companyId}'`;
}

/**
 * Build WHERE clause with company filter
 */
export function buildCompanyWhereClause(conditions = '', companyId) {
  const baseCondition = `company_id = $${getNextParamIndex(conditions)}`;

  if (conditions) {
    return `${conditions} AND ${baseCondition}`;
  }

  return `WHERE ${baseCondition}`;
}

/**
 * Get next parameter index for parameterized queries
 */
function getNextParamIndex(query) {
  const matches = query.match(/\$(\d+)/g);
  if (!matches) return 1;
  const max = Math.max(...matches.map(m => parseInt(m.slice(1))));
  return max + 1;
}

/**
 * Validate company access
 * Prevents access to resources from other companies
 */
export function validateCompanyAccess(resourceCompanyId, userCompanyId) {
  if (resourceCompanyId !== userCompanyId) {
    throw new Error('UNAUTHORIZED_COMPANY: Access denied to this resource');
  }
}

/**
 * Build parameterized query with company filter
 * Usage: buildParamQuery('SELECT * FROM inventory WHERE sku = $1', [sku, companyId])
 */
export function buildParamQuery(baseQuery, params, companyId) {
  const paramIndex = params.length + 1;
  const companyFilter = ` AND company_id = $${paramIndex}`;

  // Add company filter before any ORDER BY or LIMIT clauses
  let finalQuery = baseQuery;
  const orderByMatch = baseQuery.match(/ORDER BY/i);
  const limitMatch = baseQuery.match(/LIMIT/i);

  if (orderByMatch || limitMatch) {
    const insertPoint = Math.min(
      orderByMatch ? baseQuery.indexOf(orderByMatch[0]) : Infinity,
      limitMatch ? baseQuery.indexOf(limitMatch[0]) : Infinity
    );
    finalQuery = baseQuery.slice(0, insertPoint) + companyFilter + ' ' + baseQuery.slice(insertPoint);
  } else {
    finalQuery = baseQuery + companyFilter;
  }

  return {
    query: finalQuery,
    params: [...params, companyId],
  };
}

/**
 * Query wrapper that automatically adds company filter
 * Returns function that takes params and appends companyId
 */
export function createTenantQuery(baseQuery) {
  return (params, companyId) => {
    return buildParamQuery(baseQuery, params, companyId);
  };
}

/**
 * Validate pagination parameters
 */
export function validatePagination(page, limit) {
  const p = Math.max(1, parseInt(page) || 1);
  const l = Math.min(100, Math.max(1, parseInt(limit) || 10)); // Max 100 per page
  const offset = (p - 1) * l;

  return { page: p, limit: l, offset };
}

/**
 * Safe insert with company_id
 */
export function buildInsertQuery(table, fields, companyId) {
  const allFields = [...fields, 'company_id'];
  const placeholders = allFields
    .map((_, i) => `$${i + 1}`)
    .join(', ');

  return {
    query: `INSERT INTO ${table} (${allFields.join(', ')}) VALUES (${placeholders}) RETURNING *`,
    getParams: (values) => [...values, companyId],
  };
}

/**
 * Safe update with company_id verification
 */
export function buildUpdateQuery(table, updates, whereClause, companyId) {
  const setClause = Object.keys(updates)
    .map((field, i) => `${field} = $${i + 1}`)
    .join(', ');

  const params = Object.values(updates);
  const paramIndex = params.length + 1;

  return {
    query: `UPDATE ${table} SET ${setClause} WHERE ${whereClause} AND company_id = $${paramIndex} RETURNING *`,
    params: [...params, companyId],
  };
}

/**
 * Safe delete with company_id verification
 */
export function buildDeleteQuery(table, whereClause, companyId) {
  const params = [];
  const paramIndex = params.length + 1;

  return {
    query: `DELETE FROM ${table} WHERE ${whereClause} AND company_id = $${paramIndex}`,
    params: [...params, companyId],
  };
}

export default {
  addCompanyFilter,
  buildCompanyWhereClause,
  validateCompanyAccess,
  buildParamQuery,
  createTenantQuery,
  validatePagination,
  buildInsertQuery,
  buildUpdateQuery,
  buildDeleteQuery,
};
