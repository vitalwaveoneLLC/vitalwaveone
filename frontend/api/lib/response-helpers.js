/**
 * Response Helpers - Standard response format for all API endpoints
 * Compatible with Node.js serverless functions
 */

/**
 * Success response
 */
export function ok(data = {}, statusCode = 200) {
  return new Response(
    JSON.stringify({ ok: true, ...data }),
    {
      status: statusCode,
      headers: { 'Content-Type': 'application/json' },
    }
  );
}

/**
 * Error response
 */
export function err(message, statusCode = 400) {
  return new Response(
    JSON.stringify({ ok: false, error: message }),
    {
      status: statusCode,
      headers: { 'Content-Type': 'application/json' },
    }
  );
}

/**
 * CORS headers middleware
 */
export function cors() {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Tenant-ID',
    },
  });
}

/**
 * JSON response (generic)
 */
export function json(data, statusCode = 200) {
  return new Response(
    JSON.stringify(data),
    {
      status: statusCode,
      headers: { 'Content-Type': 'application/json' },
    }
  );
}
