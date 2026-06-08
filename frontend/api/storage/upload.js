/**
 * File Upload to Cloudflare R2
 */

import { getTenant } from '../../../lib/db.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Tenant-ID');

  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const tenant = await getTenant(req);
    if (!tenant) return res.status(401).json({ error: 'Unauthorized' });

    const { filename, filesize } = req.body || {};
    if (!filename) return res.status(400).json({ error: 'Filename required' });

    // R2 upload logic would go here
    return res.json({
      ok: true,
      message: 'File upload endpoint',
      filename,
      tenant_id: tenant.tenant_id,
    });
  } catch (error) {
    console.error('[storage]', error.message);
    return res.status(500).json({ error: error.message });
  }
}
