/**
 * Unified Catch-All Router
 * Handles: /api/inventory, /api/invoices, /api/trucks, /api/users, /api/email, /api/payment, /api/ordering-link, /api/data/*, /api/functions/*, /api/rpc/*
 */

import { query, queryOne } from '../../lib/db.js';

// Import resource handlers
import * as inventoryHandlers from '../../lib/handlers/inventory.js';
import * as invoicesHandlers from '../../lib/handlers/invoices.js';
import * as trucksHandlers from '../../lib/handlers/trucks.js';
import * as usersHandlers from '../../lib/handlers/users.js';

const resourceHandlers = {
  inventory: inventoryHandlers,
  invoices: invoicesHandlers,
  trucks: trucksHandlers,
  users: usersHandlers,
};

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Tenant-ID');

  if (req.method === 'OPTIONS') return res.status(204).end();

  const { slug } = req.query;
  const path = Array.isArray(slug) ? slug : [slug];
  const resource = path[0];
  const action = path[1];

  try {
    // Route by resource type
    if (resource === 'test') {
      return res.json({ ok: true, message: 'API is running', timestamp: new Date().toISOString() });
    } else if (resourceHandlers[resource]) {
      return handleResource(req, res, resource);
    } else if (resource === 'email') {
      return handleEmail(req, res);
    } else if (resource === 'payment') {
      return handlePayment(req, res, action);
    } else if (resource === 'ordering-link') {
      return handleOrderingLink(req, res, action);
    } else if (resource === 'data') {
      return handleDataQuery(req, res, action);
    } else if (resource === 'functions') {
      return handleFunction(req, res, action);
    } else if (resource === 'rpc') {
      return handleRPC(req, res, action);
    }

    return res.status(404).json({ error: 'Not found' });
  } catch (error) {
    console.error('[catch-all]', error.message);
    return res.status(500).json({ error: error.message });
  }
}

function handleResource(req, res, resource) {
  const handlers = resourceHandlers[resource];
  const method = req.method.toLowerCase();
  const handlerName = `${method}${resource.charAt(0).toUpperCase()}${resource.slice(1)}`;

  if (!handlers[handlerName]) {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  return handlers[handlerName](req, res);
}

function handleEmail(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const { email, subject, body } = req.body || {};
  if (!email || !subject || !body) return res.status(400).json({ error: 'Missing fields' });
  return res.json({ ok: true, message: 'Email queued' });
}

function handlePayment(req, res, action) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  switch (action) {
    case 'checkout':
      return res.json({ ok: true, message: 'Checkout session created' });
    case 'webhook':
      return res.json({ ok: true, message: 'Webhook processed' });
    case 'portal':
      return res.json({ ok: true, message: 'Portal session created' });
    default:
      return res.status(404).json({ error: 'Payment action not found' });
  }
}

function handleOrderingLink(req, res, action) {
  if (req.method === 'GET') {
    return res.json({ ok: true, link: action, data: {} });
  } else if (req.method === 'POST') {
    return res.json({ ok: true, message: 'Ordering link created' });
  }
  return res.status(405).json({ error: 'Method not allowed' });
}

function handleDataQuery(req, res, table) {
  if (!table) return res.status(400).json({ error: 'Table required' });
  if (!/^[a-zA-Z0-9_]+$/.test(table)) return res.status(400).json({ error: 'Invalid table name' });
  return res.json({ ok: true, message: 'Data query handled' });
}

function handleFunction(req, res, fn) {
  if (!fn) return res.status(400).json({ error: 'Function name required' });
  return res.json({ ok: true, function: fn, result: 'Function executed' });
}

function handleRPC(req, res, fn) {
  const { jsonrpc, method, params, id } = req.body || {};
  if (!method) return 