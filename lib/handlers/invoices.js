/**
 * Invoices Endpoints - Company Isolated
 * All queries filtered by company_id from JWT token
 */

import { query, queryOne } from '../db.js';

/**
 * GET /api/invoices - List all invoices for company
 */
export async function getInvoices(req, res) {
  try {
    const { page = 1, limit = 10, status } = req.query;
    const companyId = req.user.companyId;

    // Validate pagination
    const p = Math.max(1, parseInt(page));
    const l = Math.min(100, Math.max(1, parseInt(limit)));
    const offset = (p - 1) * l;

    // Build status filter
    const statusFilter = status ? `AND status = $2` : '';

    // Get total count
    const countResult = await queryOne(
      `SELECT COUNT(*) as total FROM invoices
       WHERE company_id = $1 ${statusFilter}`,
      status ? [companyId, status] : [companyId]
    );

    // Get paginated results
    const paramIndex = status ? 3 : 2;
    const result = await query(
      `SELECT * FROM invoices
       WHERE company_id = $1 ${statusFilter}
       ORDER BY created_at DESC
       LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
      status
        ? [companyId, status, l, offset]
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
    console.error('Get invoices error:', error);
    return res.status(500).json({ error: error.message });
  }
}

/**
 * POST /api/invoices - Create new invoice
 */
export async function createInvoice(req, res) {
  try {
    const companyId = req.user.companyId;
    const {
      invoiceNumber,
      customerId,
      invoiceDate,
      dueDate,
      totalAmount,
      notes,
      items,
    } = req.body;

    // Validate required fields
    if (!invoiceNumber || !customerId || totalAmount === undefined) {
      return res.status(400).json({ error: 'Invoice number, customer, and amount required' });
    }

    // Check for duplicate invoice number in this company
    const existing = await queryOne(
      `SELECT id FROM invoices WHERE company_id = $1 AND invoice_number = $2`,
      [companyId, invoiceNumber]
    );

    if (existing) {
      return res.status(400).json({ error: 'Invoice number already exists' });
    }

    // Verify customer belongs to this company (if needed)
    // You may want to add this check if you have a customers table

    const result = await query(
      `INSERT INTO invoices
       (company_id, invoice_number, customer_id, invoice_date, due_date, total_amount, status, notes, items, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, 'pending', $7, $8, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
       RETURNING *`,
      [
        companyId,
        invoiceNumber,
        customerId,
        invoiceDate || new Date().toISOString(),
        dueDate || null,
        totalAmount,
        notes || null,
        items ? JSON.stringify(items) : null,
      ]
    );

    // Log action
    await logAuditAction(companyId, req.user.userId, 'INVOICE_CREATED', 'invoices', result.rows[0].id);

    return res.status(201).json({
      success: true,
      data: result.rows[0],
      message: 'Invoice created',
    });
  } catch (error) {
    console.error('Create invoice error:', error);
    return res.status(500).json({ error: error.message });
  }
}

/**
 * GET /api/invoices/:id - Get single invoice
 */
export async function getInvoice(req, res) {
  try {
    const companyId = req.user.companyId;
    const { id } = req.params;

    const result = await queryOne(
      `SELECT * FROM invoices WHERE id = $1 AND company_id = $2`,
      [id, companyId]
    );

    if (!result) {
      return res.status(404).json({ error: 'Invoice not found' });
    }

    return res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error('Get invoice error:', error);
    return res.status(500).json({ error: error.message });
  }
}

/**
 * PUT /api/invoices/:id - Update invoice
 */
export async function updateInvoice(req, res) {
  try {
    const companyId = req.user.companyId;
    const { id } = req.params;
    const { status, totalAmount, notes, items } = req.body;

    // Verify ownership
    const existing = await queryOne(
      `SELECT id FROM invoices WHERE id = $1 AND company_id = $2`,
      [id, companyId]
    );

    if (!existing) {
      return res.status(403).json({ error: 'Access denied: not your invoice' });
    }

    // Build update query
    const updates = [];
    const params = [];
    let paramIndex = 1;

    if (status !== undefined) {
      updates.push(`status = $${paramIndex++}`);
      params.push(status);
    }
    if (totalAmount !== undefined) {
      updates.push(`total_amount = $${paramIndex++}`);
      params.push(totalAmount);
    }
    if (notes !== undefined) {
      updates.push(`notes = $${paramIndex++}`);
      params.push(notes);
    }
    if (items !== undefined) {
      updates.push(`items = $${paramIndex++}`);
      params.push(JSON.stringify(items));
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    updates.push(`updated_at = CURRENT_TIMESTAMP`);
    params.push(id);
    params.push(companyId);

    const result = await query(
      `UPDATE invoices
       SET ${updates.join(', ')}
       WHERE id = $${paramIndex++} AND company_id = $${paramIndex++}
       RETURNING *`,
      params
    );

    // Log action
    await logAuditAction(companyId, req.user.userId, 'INVOICE_UPDATED', 'invoices', id);

    return res.json({
      success: true,
      data: result.rows[0],
      message: 'Invoice updated',
    });
  } catch (error) {
    console.error('Update invoice error:', error);
    return res.status(500).json({ error: error.message });
  }
}

/**
 * DELETE /api/invoices/:id - Delete invoice
 */
export async function deleteInvoice(req, res) {
  try {
    const companyId = req.user.companyId;
    const { id } = req.params;

    // Verify ownership
    const existing = await queryOne(
      `SELECT id FROM invoices WHERE id = $1 AND company_id = $2`,
      [id, companyId]
    );

    if (!existing) {
      return res.status(403).json({ error: 'Access denied: not your invoice' });
    }

    // Delete
    await query(
      `DELETE FROM invoices WHERE id = $1 AND company_id = $2`,
      [id, companyId]
    );

    // Log action
    await logAuditAction(companyId, req.user.userId, 'INVOICE_DELETED', 'invoices', id);

    return res.json({
      success: true,
      message: 'Invoice deleted',
    });
  } catch (error) {
    console.error('Delete invoice error:', error);
    return res.status(500).json({ error: error.message });
  }
}

/**
 * POST /api/invoices/:id/approve - Approve invoice (admin only)
 */
export async function approveInvoice(req, res) {
  try {
    const companyId = req.user.companyId;
    const { id } = req.params;

    // Verify ownership
    const existing = await queryOne(
      `SELECT id FROM invoices WHERE id = $1 AND company_id = $2`,
      [id, companyId]
    );

    if (!existing) {
      return res.status(403).json({ error: 'Access denied: not your invoice' });
    }

    // Update status
    const result = await query(
      `UPDATE invoices
       SET status = 'approved', updated_at = CURRENT_TIMESTAMP
       WHERE id = $1 AND company_id = $2
       RETURNING *`,
      [id, companyId]
    );

    // Log action
    await logAuditAction(companyId, req.user.userId, 'INVOICE_APPROVED', 'invoices', id);

    return res.json({
      success: true,
      data: result.rows[0],
      message: 'Invoice approved',
    });
  } catch (error) {
    console.error('Approve invoice error:', error);
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
  }
}

export default {
  getInvoices,
  createInvoice,
  getInvoice,
  updateInvoice,
  deleteInvoice,
  approveInvoice,
};
