/**
 * Inventory Endpoints - Company Isolated
 * All queries filtered by company_id from JWT token
 */

import { query, queryOne } from '../db.js';

/**
 * GET /api/inventory - List all inventory for company
 */
export async function getInventory(req, res) {
  try {
    const { page = 1, limit = 10, search = '' } = req.query;
    const companyId = req.user.companyId;

    // Validate pagination
    const p = Math.max(1, parseInt(page));
    const l = Math.min(100, Math.max(1, parseInt(limit)));
    const offset = (p - 1) * l;

    // Build search filter
    const searchFilter = search
      ? `AND (sku ILIKE $3 OR product_name ILIKE $3)`
      : '';

    // Get total count
    const countResult = await queryOne(
      `SELECT COUNT(*) as total FROM inventory
       WHERE company_id = $1 ${searchFilter}`,
      search ? [companyId, search] : [companyId]
    );

    // Get paginated results
    const result = await query(
      `SELECT * FROM inventory
       WHERE company_id = $1 ${searchFilter}
       ORDER BY created_at DESC
       LIMIT $${search ? '4' : '2'} OFFSET $${search ? '5' : '3'}`,
      search
        ? [companyId, search, l, offset]
        : [companyId, l, offset]
    );

    return res.json({
      success: true,
      data: result.rows,
      pagination: {
        page: p,
        limit: l,
        total: parseInt(countResult.total),
        pages: Math.ceil(parseInt(countResult.total) / l),
      },
    });
  } catch (error) {
    console.error('Get inventory error:', error);
    return res.status(500).json({ error: error.message });
  }
}

/**
 * POST /api/inventory - Create new inventory item
 */
export async function createInventory(req, res) {
  try {
    const companyId = req.user.companyId;
    const { sku, productName, category, unitPrice, shelfQuantity = 0, truckQuantity = 0 } = req.body;

    // Validate required fields
    if (!sku || !productName || unitPrice === undefined) {
      return res.status(400).json({ error: 'SKU, product name, and price required' });
    }

    // Check for duplicate SKU in this company
    const existing = await queryOne(
      `SELECT id FROM inventory WHERE company_id = $1 AND sku = $2`,
      [companyId, sku]
    );

    if (existing) {
      return res.status(400).json({ error: 'SKU already exists in your company' });
    }

    const result = await query(
      `INSERT INTO inventory
       (company_id, sku, product_name, category, unit_price, shelf_quantity, truck_quantity, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
       RETURNING *`,
      [companyId, sku, productName, category || null, unitPrice, shelfQuantity, truckQuantity]
    );

    // Log action
    await logAuditAction(companyId, req.user.userId, 'INVENTORY_CREATED', 'inventory', result.rows[0].id);

    return res.status(201).json({
      success: true,
      data: result.rows[0],
      message: 'Inventory item created',
    });
  } catch (error) {
    console.error('Create inventory error:', error);
    return res.status(500).json({ error: error.message });
  }
}

/**
 * GET /api/inventory/:id - Get single inventory item
 */
export async function getInventoryItem(req, res) {
  try {
    const companyId = req.user.companyId;
    const { id } = req.params;

    const result = await queryOne(
      `SELECT * FROM inventory WHERE id = $1 AND company_id = $2`,
      [id, companyId]
    );

    if (!result) {
      return res.status(404).json({ error: 'Inventory item not found' });
    }

    return res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error('Get inventory item error:', error);
    return res.status(500).json({ error: error.message });
  }
}

/**
 * PUT /api/inventory/:id - Update inventory item
 */
export async function updateInventory(req, res) {
  try {
    const companyId = req.user.companyId;
    const { id } = req.params;
    const { productName, category, unitPrice, shelfQuantity, truckQuantity } = req.body;

    // Verify ownership
    const existing = await queryOne(
      `SELECT id FROM inventory WHERE id = $1 AND company_id = $2`,
      [id, companyId]
    );

    if (!existing) {
      return res.status(403).json({ error: 'Access denied: not your item' });
    }

    // Build update query dynamically
    const updates = [];
    const params = [];
    let paramIndex = 1;

    if (productName !== undefined) {
      updates.push(`product_name = $${paramIndex++}`);
      params.push(productName);
    }
    if (category !== undefined) {
      updates.push(`category = $${paramIndex++}`);
      params.push(category);
    }
    if (unitPrice !== undefined) {
      updates.push(`unit_price = $${paramIndex++}`);
      params.push(unitPrice);
    }
    if (shelfQuantity !== undefined) {
      updates.push(`shelf_quantity = $${paramIndex++}`);
      params.push(shelfQuantity);
    }
    if (truckQuantity !== undefined) {
      updates.push(`truck_quantity = $${paramIndex++}`);
      params.push(truckQuantity);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    updates.push(`updated_at = CURRENT_TIMESTAMP`);

    params.push(id);
    params.push(companyId);

    const result = await query(
      `UPDATE inventory
       SET ${updates.join(', ')}
       WHERE id = $${paramIndex++} AND company_id = $${paramIndex++}
       RETURNING *`,
      params
    );

    // Log action
    await logAuditAction(companyId, req.user.userId, 'INVENTORY_UPDATED', 'inventory', id);

    return res.json({
      success: true,
      data: result.rows[0],
      message: 'Inventory item updated',
    });
  } catch (error) {
    console.error('Update inventory error:', error);
    return res.status(500).json({ error: error.message });
  }
}

/**
 * DELETE /api/inventory/:id - Delete inventory item
 */
export async function deleteInventory(req, res) {
  try {
    const companyId = req.user.companyId;
    const { id } = req.params;

    // Verify ownership
    const existing = await queryOne(
      `SELECT id FROM inventory WHERE id = $1 AND company_id = $2`,
      [id, companyId]
    );

    if (!existing) {
      return res.status(403).json({ error: 'Access denied: not your item' });
    }

    // Delete
    await query(
      `DELETE FROM inventory WHERE id = $1 AND company_id = $2`,
      [id, companyId]
    );

    // Log action
    await logAuditAction(companyId, req.user.userId, 'INVENTORY_DELETED', 'inventory', id);

    return res.json({
      success: true,
      message: 'Inventory item deleted',
    });
  } catch (error) {
    console.error('Delete inventory error:', error);
    return res.status(500).json({ error: error.message });
  }
}

/**
 * Log audit action
 */
async function logAuditAction(companyId, userId, action, entityType, entityId) {
  try {
    await query(
      `INSERT INTO audit_logs (company_id, user_id, action, entity_type, entity_id, created_at)
       VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP)`,
      [companyId, userId, action, entityType, entityId]
    );
  } catch (error) {
    console.error('Audit log error:', error);
    // Don't fail the main operation if audit logging fails
  }
}

export default {
  getInventory,
  createInventory,
  getInventoryItem,
  updateInventory,
  deleteInventory,
};
