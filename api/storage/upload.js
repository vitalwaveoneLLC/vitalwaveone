// api/storage/upload.js — File upload to Cloudflare R2 (AWS Sig V4 compatible)
import { getTenant, ok, err, cors } from '../../lib/db/client.js';
import { validateSession } from '../../lib/middleware/auth.js';
import { csrfMiddleware } from '../../lib/middleware/csrf.js';
import { createHmac, createHash } from 'crypto';

// ── AWS Sig V4 signing helpers ─────────────────────────────────────────────

function hmacSHA256(key, data) {
  return createHmac('sha256', key).update(data, 'utf8').digest();
}

function sha256Hex(data) {
  return createHash('sha256').update(data).digest('hex');
}

function getSigningKey(secretKey, dateStamp, region, service) {
  const kDate    = hmacSHA256('AWS4' + secretKey, dateStamp);
  const kRegion  = hmacSHA256(kDate, region);
  const kService = hmacSHA256(kRegion, service);
  const kSigning = hmacSHA256(kService, 'aws4_request');
  return kSigning;
}

/**
 * Sign an S3/R2 PUT request with AWS Signature Version 4.
 * Returns a headers object ready to be passed to fetch().
 */
function signR2Put({ accessKey, secretKey, region, bucket, accountId, fileKey, contentType, bodyBuffer }) {
  const host     = `${accountId}.r2.cloudflarestorage.com`;
  const endpoint = `https://${host}/${bucket}/${fileKey}`;
  const service  = 's3';

  const now      = new Date();
  const amzDate  = now.toISOString().replace(/[:\-]|\.\d{3}/g, '').slice(0, 15) + 'Z'; // 20240101T120000Z
  const dateStamp = amzDate.slice(0, 8); // 20240101

  const payloadHash = sha256Hex(bodyBuffer);
  const canonicalUri = `/${bucket}/${fileKey}`;

  const canonicalHeaders =
    `content-type:${contentType}\n` +
    `host:${host}\n` +
    `x-amz-content-sha256:${payloadHash}\n` +
    `x-amz-date:${amzDate}\n`;

  const signedHeaders = 'content-type;host;x-amz-content-sha256;x-amz-date';

  const canonicalRequest = [
    'PUT',
    canonicalUri,
    '',                  // query string (empty for PUT)
    canonicalHeaders,
    signedHeaders,
    payloadHash,
  ].join('\n');

  const credentialScope = `${dateStamp}/${region}/${service}/aws4_request`;
  const stringToSign = [
    'AWS4-HMAC-SHA256',
    amzDate,
    credentialScope,
    sha256Hex(canonicalRequest),
  ].join('\n');

  const signingKey = getSigningKey(secretKey, dateStamp, region, service);
  const signature  = createHmac('sha256', signingKey).update(stringToSign, 'utf8').digest('hex');

  const authHeader =
    `AWS4-HMAC-SHA256 Credential=${accessKey}/${credentialScope}, ` +
    `SignedHeaders=${signedHeaders}, Signature=${signature}`;

  return {
    endpoint,
    headers: {
      'Authorization':         authHeader,
      'Content-Type':          contentType,
      'x-amz-date':            amzDate,
      'x-amz-content-sha256':  payloadHash,
    },
  };
}

// ── Handler ────────────────────────────────────────────────────────────────

export default async function handler(req) {
  if (req.method === 'OPTIONS') return cors();
  if (req.method !== 'POST') return err('Method not allowed', 405);

  // Validate session and CSRF
  await validateSession(req, () => {});
  if (!req.session) return err('Unauthorized', 401);

  await csrfMiddleware(req, () => {});
  if (req.csrfError) return err('CSRF validation failed', 403);

  const tenant = await getTenant(req);
  if (!tenant) return err('Unauthorized', 401);

  try {
    const formData = await req.formData();
    const file     = formData.get('file');
    const bucket   = formData.get('bucket') || 'receipts';
    const path     = formData.get('path')   || `${tenant.tenant_id}/${Date.now()}`;

    if (!file) return err('No file provided');

    const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID;
    const R2_ACCESS_KEY = process.env.R2_ACCESS_KEY;
    const R2_SECRET_KEY = process.env.R2_SECRET_KEY;
    const R2_BUCKET     = process.env.R2_BUCKET || 'vitalwaveone-receipts';
    const R2_REGION     = process.env.R2_REGION  || 'auto'; // Cloudflare R2 uses "auto"

    if (!R2_ACCOUNT_ID || !R2_ACCESS_KEY || !R2_SECRET_KEY) {
      // R2 not configured — return placeholder so the app doesn't crash
      return ok({
        path:      `${tenant.tenant_id}/${path}`,
        publicUrl: `/api/storage/file?path=${encodeURIComponent(path)}`,
        note:      'R2 not configured — add R2_ACCOUNT_ID, R2_ACCESS_KEY, R2_SECRET_KEY to env vars',
      });
    }

    const fileKey     = `${tenant.tenant_id}/${path}`;
    const contentType = file.type || 'application/octet-stream';
    const bodyBuffer  = Buffer.from(await file.arrayBuffer());

    const { endpoint, headers } = signR2Put({
      accessKey:   R2_ACCESS_KEY,
      secretKey:   R2_SECRET_KEY,
      region:      R2_REGION,
      bucket:      R2_BUCKET,
      accountId:   R2_ACCOUNT_ID,
      fileKey,
      contentType,
      bodyBuffer,
    });

    const uploadRes = await fetch(endpoint, {
      method:  'PUT',
      headers: { ...headers, 'Content-Length': String(bodyBuffer.length) },
      body:    bodyBuffer,
    });

    if (!uploadRes.ok) {
      const errText = await uploadRes.text().catch(() => '');
      console.error('[storage/upload] R2 error:', uploadRes.status, errText);
      return err(`Upload failed (${uploadRes.status})`);
    }

    // R2 public URL — requires a public bucket or custom domain configured in Cloudflare
    const publicUrl = `https://pub-${R2_ACCOUNT_ID}.r2.dev/${R2_BUCKET}/${fileKey}`;

    return ok({ path: fileKey, publicUrl });

  } catch (e) {
    console.error('[storage/upload]', e.message);
    return err(e.message);
  }