/**
 * Authorization Middleware
 * Enforces multi-tenant isolation by validating JWT and extracting company context
 * ALL requests must include valid token with company_id
 */

import { verifyJWT } from '../auth.js';
import { queryOne } from '../db.js';

/**
 * Extract and verify JWT token from Authorization header
 * Attaches company context to request object
 */
export async function authMiddleware(req, res, next) {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        error: 'Missing or invalid authorization header',
        code: 'NO_AUTH',
      });
    }

    const token = authHeader.substring(7);

    // Verify JWT signature and expiration
    const payload = verifyJWT(token);

    if (!payload) {
      return res.status(401).json({
        error: 'Invalid or expired token',
        code: 'INVALID_TOKEN',
      });
    }

    // Verify session still exists in database
    const session = await queryOne(
      `SELECT id, expires_at FROM sessions
       WHERE token = $1 AND expires_at > CURRENT_TIMESTAMP`,
      [token]
    );

    if (!session) {
      return res.status(401).json({
        error: 'Session expired or revoked',
        code: 'SESSION_EXPIRED',
      });
    }

    // Attach user context to request
    req.user = {
      userId: payload.userId,
      companyId: payload.companyId, // CRITICAL: Company context for multi-tenancy
      companyName: payload.companyName,
      userType: payload.userType,
      email: payload.email,
    };

    // Attach JWT token for later use
    req.token = token;

    next();
  } catch (error) {
    console.error('[auth-middleware] Error:', error);
    return res.status(500).json({
      error: 'Authentication error',
      code: 'AUTH_ERROR',
    });
  }
}

/**
 * Verify company ownership
 * Ensures user belongs to the company they're accessing
 * Use this to check if requested companyId matches user's company
 */
export function companyOwnershipCheck(req, res, next) {
  const requestedCompanyId = req.params.companyId || req.body.companyId;

  if (!requestedCompanyId) {
    return next(); // No specific company requested
  }

  if (requestedCompanyId !== req.user.companyId) {
    return res.status(403).json({
      error: 'Access denied: you do not have permission to access this company',
      code: 'UNAUTHORIZED_COMPANY',
      requested: requestedCompanyId,
      userCompany: req.user.companyId,
    });
  }

  next();
}

/**
 * Verify user is admin
 * Only admins can perform certain actions
 */
export function adminOnly(req, res, next) {
  if (req.user.userType !== 'admin') {
    return res.status(403).json({
      error: 'This action requires admin privileges',
      code: 'ADMIN_ONLY',
    });
  }

  next();
}

/**
 * Verify user is admin or manager
 */
export function managerOrAdmin(req, res, next) {
  if (!['admin', 'manager'].includes(req.user.userType)) {
    return res.status(403).json({
      error: 'This action requires manager or admin privileges',
      code: 'MANAGER_REQUIRED',
    });
  }

  next();
}

/**
 * Optional auth - allows unauthenticated requests but populates user if token present
 */
export async function optionalAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next(); // No token - continue without user context
    }

    const token = authHeader.substring(7);
    const payload = verifyJWT(token);

    if (payload) {
      const session = await queryOne(
        `SELECT id FROM sessions
         WHERE token = $1 AND expires_at > CURRENT_TIMESTAMP`,
        [token]
      );

      if (session) {
        req.user = {
          userId: payload.userId,
          companyId: payload.companyId,
          companyName: payload.companyName,
          userType: payload.userType,
          email: payload.email,
        };
        req.token = token;
      }
    }

    next();
  } catch (error) {
    console.error('[optional-auth] Error:', error);
    next(); // Continue without user context on error
  }
}

export default {
  authMiddleware,
  companyOwnershipCheck,
  adminOnly,
  managerOrAdmin,
  optionalAuth,
};
