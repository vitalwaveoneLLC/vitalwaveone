/**
 * Trucks/Fleet Endpoints - Company Isolated
 * All queries filtered by company_id from JWT token
 */

import { query, queryOne } from '../db.js';

/**
 * GET /api/trucks - List all trucks for company
 */
export async function getTrucks(req, res) {
  try {
    const { page = 1, limit = 10 } = req.query;
    const companyId = req.user.companyId;

    // Validate pagination
    const p = Math.max(1, parseInt(page));
    const l = Math.min(100, Math.max(1, parseInt(limit)));
    const offset = (p - 1) * l;

    // Get total count
    const countResult = await queryOne(
      `SELECT COUNT(*) as total FROM trucks WHERE company_id = $1`,
      [companyId]
    );

    // Get paginated results
    const result = await query(
      `SELECT t.*, u.first_name, u.last_name, u.email
       FROM trucks t
       LEFT JOIN users u ON t.driver_id = u.id
       WHERE t.company_id = $1
       ORDER BY t.created_at DESC
       LIMIT $2 OFFSET $3`,
      [companyId, l, offset]
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
    console.error('Get trucks error:', error);
    return res.status(500).json({ error: error.message });
  }
}

/**
 * POST /api/trucks - Create new truck
 */
export async function createTruck(req, res) {
  try {
    const companyId = req.user.companyId;
    const { truckNumber, licensePlate, vehicleType, capacityUnits, driverId } = req.body;

    // Validate required fields
    if (!truckNumber) {
      return res.status(400).json({ error: 'Truck number required' });
    }

    // Check for duplicate truck number in this company
    const existing = await queryOne(
      `SELECT id FROM trucks WHERE company_id = $1 AND truck_number = $2`,
      [companyId, truckNumber]
    );

    if (existing) {
      return res.status(400).json({ error: 'Truck number already exists in your company' });
    }

    // Verify driver belongs to this company (if provided)
    if (driverId) {
      const driver = await queryOne(
        `SELECT id FROM users WHERE id = $1 AND company_id = $2`,
        [driverId, companyId]
      );

      if (!driver) {
        return res.status(400).json({ error: 'Driver not found in your company' });
      }
    }

    const result = await query(
      `INSERT INTO trucks
       (company_id, truck_number, license_plate, vehicle_type, capacity_units, driver_id, status, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, 'active', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
       RETURNING *`,
      [companyId, truckNumber, licensePlate || null, vehicleType || null, capacityUnits || null, driverId || null]
    );

    // Log action
    await logAuditAction(companyId, req.user.userId, 'TRUCK_CREATED', 'trucks', result.rows[0].id);

    return res.status(201).json({
      success: true,
      data: result.rows[0],
      message: 'Truck created',
    });
  } catch (error) {
    console.error('Create truck error:', error);
    return res.status(500).json({ error: error.message });
  }
}

/**
 * GET /api/trucks/:id - Get single truck
 */
export async function getTruck(req, res) {
  try {
    const companyId = req.user.companyId;
    const { id } = req.params;

    const result = await queryOne(
      `SELECT t.*, u.first_name, u.last_name, u.email
       FROM trucks t
       LEFT JOIN users u ON t.driver_id = u.id
       WHERE t.id = $1 AND t.company_id = $2`,
      [id, companyId]
    );

    if (!result) {
      return res.status(404).json({ error: 'Truck not found' });
    }

    return res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error('Get truck error:', error);
    return res.status(500).json({ error: error.message });
  }
}

/**
 * PUT /api/trucks/:id - Update truck
 */
export async function updateTruck(req, res) {
  try {
    const companyId = req.user.companyId;
    const { id } = req.params;
    const { truckNumber, licensePlate, vehicleType, capacityUnits, driverId, status } = req.body;

    // Verify ownership
    const existing = await queryOne(
      `SELECT id FROM trucks WHERE id = $1 AND company_id = $2`,
      [id, companyId]
    );

    if (!existing) {
      return res.status(403).json({ error: 'Access denied: not your truck' });
    }

    // Build update query
    const updates = [];
    const params = [];
    let paramIndex = 1;

    if (truckNumber !== undefined) {
      updates.push(`truck_number = $${paramIndex++}`);
      params.push(truckNumber);
    }
    if (licensePlate !== undefined) {
      updates.push(`license_plate = $${paramIndex++}`);
      params.push(licensePlate);
    }
    if (vehicleType !== undefined) {
      updates.push(`vehicle_type = $${paramIndex++}`);
      params.push(vehicleType);
    }
    if (capacityUnits !== undefined) {
      updates.push(`capacity_units = $${paramIndex++}`);
      params.push(capacityUnits);
    }
    if (driverId !== undefined) {
      // Verify driver belongs to this company
      if (driverId) {
        const driver = await queryOne(
          `SELECT id FROM users WHERE id = $1 AND company_id = $2`,
          [driverId, companyId]
        );
        if (!driver) {
          return res.status(400).json({ error: 'Driver not found in your company' });
        }
      }
      updates.push(`driver_id = $${paramIndex++}`);
      params.push(driverId);
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
      `UPDATE trucks
       SET ${updates.join(', ')}
       WHERE id = $${paramIndex++} AND company_id = $${paramIndex++}
       RETURNING *`,
      params
    );

    // Log action
    await logAuditAction(companyId, req.user.userId, 'TRUCK_UPDATED', 'trucks', id);

    return res.json({
      success: true,
      data: result.rows[0],
      message: 'Truck updated',
    });
  } catch (error) {
    console.error('Update truck error:', error);
    return res.status(500).json({ error: error.message });
  }
}

/**
 * DELETE /api/trucks/:id - Delete truck
 */
export async function deleteTruck(req, res) {
  try {
    const companyId = req.user.companyId;
    const { id } = req.params;

    // Verify ownership
    const existing = await queryOne(
      `SELECT id FROM trucks WHERE id = $1 AND company_id = $2`,
      [id, companyId]
    );

    if (!existing) {
      return res.status(403).json({ error: 'Access denied: not your truck' });
    }

    // Delete
    await query(
      `DELETE FROM trucks WHERE id = $1 AND company_id = $2`,
      [id, companyId]
    );

    // Log action
    await logAuditAction(companyId, req.user.userId, 'TRUCK_DELETED', 'trucks', id);

    return res.json({
      success: true,
      message: 'Truck deleted',
    });
  } catch (error) {
    console.error('Delete truck error:', error);
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
  getTrucks,
  createTruck,
  getTruck,
  updateTruck,
  deleteTruck,
};
