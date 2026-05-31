// api/response-helpers.js — lightweight Edge-compatible response helpers
const CORS_HEADERS = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export const ok = (data, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: CORS_HEADERS });

export const err = (message, status = 400) =>
  new Response(JSON.stringify({ error: message }), { status, headers: CORS_HEADERS });

export const cors = () =>
  new Response(null, { status: 204, headers: CORS_HEADERS });
