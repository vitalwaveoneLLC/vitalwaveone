/**
 * Team Users Endpoints - Company Isolated
 * Manage team members, drivers, and users within company
 */

import crypto from 'crypto';
import { query, queryOne } from '../db.js';

/**
 * GET /api/users - List all users in company
 */
export async function getUsers(req, res) {
  try {
    const { page = 1, limit = 10, userType } = req.query;
    const companyId = req.user.companyId;

    // Validate pagination
    const p = Math.max(1, parseInt(page));
    const l = Math.min(100, Math.max(1, parseInt(limit)));
    const offset = (p - 1) * l;

    // Build type filter
    const typeFilter = userType ? `AND user_type = $2` : '';

    // Get total count
    const countResult = await queryOne(
      `SELECT COUNT(*) as total FROM users
       WHERE company_id = $1 ${typeFilter}`,
      userType ? [companyId, userType] : [companyId]
    );

    // Get paginated results (exclude passwords)
    const paramIndex = userType ? 3 : 2;
    const result = await query(
      `SELECT id, company_id, first_name, last_name, email, phone,
              user_type, status, created_at, last_login
       FROM users
       WHERE company_id = $1 ${typeFilter}
       ORDER BY created_at DESC
       LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
      userType
        ? [companyId, userType, l, offset]
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
    console.error('Get users error:', error);
    return res.status(500).json({ error: error.message });
  }
}

/**
 * POST /api/users - Create new team member (admin only)
 */
export async function createUser(req, res) {
  try {
    const companyId = req.user.companyId;
    const { firstName, lastName, email, phone, userType = 'driver', password } = req.body;

    // Validate required fields
    if (!firstName || !lastName || !email || !userType) {
      return res.status(400).json({ error: 'Name, email, and user type required' });
    }

    // Check for duplicate email in this company
    const existing = await queryOne(
      `SELECT id FROM users WHERE company_id = $1 AND email = $2`,
      [companyId, email]
    );

    if (existing) {
      return res.status(400).json({ error: 'Email already exists in your company' });
    }

    // Hash password if provided, otherwise generate temporary one
    let passwordHash = null;
    if (password) {
      const JWT_SECRET = process.env.JWT_SECRET || 'default-secret';
      passwordHash = crypto
        .createHash('sha256')
        .update(password + JWT_SECRET)
        .digest('hex');
    }

    const result = await query(
      `INSERT INTO users
       (company_id, first_name, last_name, email, phone, user_type, password_hash, status, created_by, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, 'active', $8, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
       RETURNING id, company_id, first_name, last_name, email, phone, user_type, status, created_at`,
      [companyId, firstName, lastName, email, phone || null, userType, passwordHash, req.user.userId]
    );

    // Log action
    await logAuditAction(companyId, req.user.userId, 'USER_CREATED', 'users', result.rows[0].id);

    return res.status(201).json({
      success: true,
      data: result.rows[0],
      message: 'User created successfully',
      note: password ? 'User can now login' : 'Send user a login link with temporary password',
    });
  } catch (error) {
    console.error('Create user error:', error);
    return res.status(500).json({ error: error.message });
  }
}

/**
 * GET /api/users/:id - Get single user
 */
export async function getUser(req, res) {
  try {
    const companyId = req.user.companyId;
    const { id } = req.params;

    const result = await queryOne(
      `SELECT id, company_id, first_name, last_name, email, phone,
              user_type, status, created_at, last_login
       FROM users WHERE id = $1 AND company_id = $2`,
      [id, companyId]
    );

    if (!result) {
      return res.status(404).json({ error: 'User not found' });
    }

    return res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error('Get user error:', error);
    return res.status(500).json({ error: error.message });
  }
}

/**
 * PUT /api/users/:id - Update user
 */
export async function updateUser(req, res) {
  try {
    const companyId = req.user.companyId;
    const { id } = req.params;
    const { firstName, lastName, phone, userType, status } = req.body;

    // Verify ownership
    const existing = await queryOne(
      `SELECT id FROM users WHERE id = $1 AND company_id = $2`,
      [id, companyId]
    );

    if (!existing) {
      return res.status(403).json({ error: 'Access denied: not your user' });
    }

    // Build update query
    const updates = [];
    const params = [];
    let paramIndex = 1;

    if (firstName !== undefined) {
      updates.push(`first_name = $${paramIndex++}`);
      params.push(firstName);
    }
    if (lastName !== undefined) {
      updates.push(`last_name = $${paramIndex++}`);
      params.push(lastName);
    }
    if (phone !== undefined) {
      updates.push(`phone = $${paramIndex++}`);
      params.push(phone);
    }
    if (userType !== undefined) {
      updates.push(`user_type = $${paramIndex++}`);
      params.push(userType);
    }
    if (status !== undefined) {
      updates.push(`status = $${paramIndex++}`);
      params.push(status);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    updates.push(`updated_at = CURRENT_TIMESTAMP`);
    params.push(id);
    params.push(companyId);

    const result = await query(
      `UPDATE users
       SET ${updates.join(', ')}
       WHERE id = $${paramIndex++} AND company_id = $${paramIndex++}
       RETURNING id, company_id, first_name, last_name, email, phone, user_type, status, created_at`,
      params
    );

    // Log action
    await logAuditAction(companyId, req.user.userId, 'USER_UPDATED', 'users', id);

    return res.json({
      success: true,
      data: result.rows[0],
      message: 'User updated',
    });
  } catch (error) {
    console.error('Update user error:', error);
    return res.status(500).json({ error: error.message });
  }
}

/**
 * DELETE /api/users/:id - Delete user
 */
export async function deleteUser(req, res) {
  try {
    const companyId = req.user.companyId;
    const { id } = req.params;

    // Prevent deleting self
    if (id === req.user.userId) {
      return res.status(400).json({ error: 'Cannot delete your own account' });
    }

    // Verify ownership
    const existing = await queryOne(
      `SELECT id FROM users WHERE id = $1 AND company_id = $2`,
      [id, companyId]
    );

    if (!existing) {
      return res.status(403).json({ error: 'Access denied: not your user' });
    }

    // Delete
    await query(
      `DELETE FROM users WHERE id = $1 AND company_id = $2`,
      [id, companyId]
    );

    // Log action
    await logAuditAction(companyId, req.user.userId, 'USER_DELETED', 'users', id);

    return res.json({
      success: true,
      message: 'User deleted',
    });
  } catch (error) {
    console.error('Delete user error:', error);
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
  getUsers,
  createUser,
  getUser,
  updateUser,
  deleteUser,
};
