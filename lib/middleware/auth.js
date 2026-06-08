// api/middleware/auth.js
// Session validation and authentication middleware
import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL);

/**
 * Extract session token from cookies or headers
 */
function getSessionToken(req) {
  // Try cookies first
  if (req.headers.cookie) {
    const cookies = req.headers.cookie.split(';').reduce((acc, cookie) => {
      const [key, value] = cookie.trim().split('=');
      acc[key] = decodeURIComponent(value);
      return acc;
    }, {});
    if (cookies.vitalwaveone_session) return cookies.vitalwaveone_session;
  }

  // Try Authorization header
  if (req.headers.authorization?.startsWith('Bearer ')) {
    return req.headers.authorization.slice(7);
  }

  // Try X-Session-Token header
  return req.headers['x-session-token'];
}

/**
 * Validate session and attach user info to request
 */
export async function validateSession(req, res, next) {
  const token = getSessionToken(req);

  if (!token) {
    return res.status(401).json({ error: 'No session token provided' });
  }

  try {
    const sessions = await sql`
      SELECT
        id, user_id, user_type, tenant_id, is_active, expires_at
      FROM sessions
      WHERE token = ${token}
        AND is_active = true
        AND expires_at > now()
      LIMIT 1
    `;

    if (sessions.length === 0) {
      return res.status(401).json({ error: 'Invalid or expired session' });
    }

    const session = sessions[0];

    // Update last activity
    try {
      await sql`
        UPDATE sessions
        SET last_activity_at = now()
        WHERE id = ${session.id}
      `;
    } catch (e) {
      // Non-blocking: ignore if update fails
    }

    // Attach session info to request
    req.session = {
      id: session.id,
      userId: session.user_id,
      userType: session.user_type,
      tenantId: session.tenant_id,
      expiresAt: session.expires_at,
    };

    next();
  } catch (error) {
    console.error('[validateSession]', error.message);
    return res.status(500).json({ error: 'Session validation failed' });
  }
}

/**
 * Logout: invalidate session
 */
export async function logout(sessionToken) {
  try {
    await sql`
      UPDATE sessions
      SET is_active = false
      WHERE token = ${sessionToken}
    `;
    return true;
  } catch (error) {
    console.error('[logout]', error.message);
    return false;
  }
}

export default validateSession;