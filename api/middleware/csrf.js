// api/middleware/csrf.js
// CSRF token generation and validation
import crypto from 'crypto';
import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL);

/**
 * Generate CSRF token for a session
 */
export async function generateCSRFToken(sessionId) {
  const token = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

  try {
    await sql`
      INSERT INTO csrf_tokens (session_id, token, expires_at)
      VALUES (${sessionId}, ${token}, ${expiresAt})
    `;
    return token;
  } catch (error) {
    console.error('[generateCSRFToken]', error.message);
    return null;
  }
}

/**
 * Validate CSRF token
 */
export async function validateCSRFToken(sessionId, token) {
  try {
    const rows = await sql`
      SELECT id FROM csrf_tokens
      WHERE session_id = ${sessionId}
        AND token = ${token}
        AND expires_at > now()
      LIMIT 1
    `;

    if (rows.length === 0) return false;

    // Mark token as used (optional: delete it so it can't be reused)
    // await sql`DELETE FROM csrf_tokens WHERE id = ${rows[0].id}`;

    return true;
  } catch (error) {
    console.error('[validateCSRFToken]', error.message);
    return false;
  }
}

/**
 * Middleware to validate CSRF on state-changing requests
 */
export async function csrfMiddleware(req, res, next) {
  // Skip CSRF for GET, HEAD, OPTIONS
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    return next();
  }

  const token = req.headers['x-csrf-token'] || req.body?.csrfToken;
  const sessionId = req.sessionId;

  if (!token || !sessionId) {
    return res.status(403).json({ error: 'CSRF token missing' });
  }

  const isValid = await validateCSRFToken(sessionId, token);

  if (!isValid) {
    return res.status(403).json({ error: 'CSRF token invalid or expired' });
  }

  next();
}

export default csrfMiddleware;
