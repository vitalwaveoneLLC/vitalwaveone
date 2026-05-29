// api/email/send.js — DEPRECATED: use /api/functions/send-invoice-email instead
// Gmail credentials are now fetched server-side via X-Tenant-ID — never accepted from body.
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method === 'OPTIONS') return res.status(204).end();
  return res.status(410).json({
    error: 'This endpoint is deprecated. Use /api/functions/send-invoice-email with an X-Tenant-ID header.',
  });
}
