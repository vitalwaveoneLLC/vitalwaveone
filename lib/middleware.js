/**
 * Request middleware for Vercel serverless functions
 * Handles JSON body parsing, CORS, and response helpers
 */

export async function parseJson(req) {
  if (req.body) return req.body;

  const chunks = [];
  for await (const chunk of req) {
    chunks.push(chunk);
  }

  const body = Buffer.concat(chunks).toString('utf-8');
  try {
    return body ? JSON.parse(body) : {};
  } catch (e) {
    throw new Error('Invalid JSON in request body');
  }
}

export function setCorsHeaders(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Tenant-ID');
  res.setHeader('Content-Type', 'application/json');
}

export function sendJSON(res, status, data) {
  res.status(status).json(data);
}

export function sendError(res, status, message) {
  sendJSON(res, status, { error: message });
}
