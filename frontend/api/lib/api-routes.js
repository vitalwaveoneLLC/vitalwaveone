/**
 * VitalWaveOne API Routes
 * Multi-tenant SaaS platform with company isolation
 */

import express from 'express';
import cors from 'cors';
import * as authRoutes from './auth.js';
import { authMiddleware, adminOnly, managerOrAdmin } from './middleware/auth-middleware.js';
import paymentRoutes from './payment.js';
import mfaRoutes from './mfa.js';
import orderingLinkRoutes from './ordering-link.js';
import * as inventoryRoutes from './endpoints/inventory.js';
import * as trucksRoutes from './endpoints/trucks.js';
import * as invoicesRoutes from './endpoints/invoices.js';
import * as usersRoutes from './endpoints/users.js';

const router = express.Router();

// CORS Middleware
router.use(cors({
  origin: process.env.VITE_APP_URL || 'http://localhost:5173',
  credentials: true,
}));

// Body Parser
router.use(express.json({ limit: '10mb' }));
router.use(express.urlencoded({ limit: '10mb', extended: true }));

// Request Logging
router.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path} ${req.headers.authorization ? '[AUTH]' : '[PUBLIC]'}`);
  next();
});

// ========== PUBLIC AUTH ROUTES (NO AUTHENTICATION REQUIRED) ==========
router.post('/auth/login', authRoutes.login);
router.post('/auth/register', authRoutes.register);
router.get('/auth/verify', authRoutes.verifyToken);
router.post('/auth/logout', authRoutes.logout);

// ========== PUBLIC PAYMENT ROUTES (SIGNING UP) ==========
router.post('/create-payment-intent', paymentRoutes.createPaymentIntent);
router.post('/verify-payment', paymentRoutes.verifyPayment);
router.get('/payment-status/:paymentIntentId', paymentRoutes.getPaymentStatus);

// ========== MFA ROUTES (PUBLIC - DURING SIGNUP) ==========
router.post('/send-mfa-otp', mfaRoutes.sendMFAOTP);
router.post('/verify-mfa-otp', mfaRoutes.verifyMFAOTP);
router.get('/mfa-status/:email', mfaRoutes.getMFAStatus);
router.post('/clear-mfa-otp', mfaRoutes.clearMFAOTP);

// ========== PUBLIC LINK VALIDATION (FOR STAFF ACCESS) ==========
router.get('/validate-ordering-link/:link', orderingLinkRoutes.validateOrderingLink);

// ========== PROTECTED INVENTORY ENDPOINTS ==========
router.get('/inventory', authMiddleware, inventoryRoutes.getInventory);
router.post('/inventory', authMiddleware, adminOnly, inventoryRoutes.createInventory);
router.get('/inventory/:id', authMiddleware, inventoryRoutes.getInventoryItem);
router.put('/inventory/:id', authMiddleware, adminOnly, inventoryRoutes.updateInventory);
router.delete('/inventory/:id', authMiddleware, adminOnly, inventoryRoutes.deleteInventory);

// ========== PROTECTED TRUCKS ENDPOINTS ==========
router.get('/trucks', authMiddleware, trucksRoutes.getTrucks);
router.post('/trucks', authMiddleware, adminOnly, trucksRoutes.createTruck);
router.get('/trucks/:id', authMiddleware, trucksRoutes.getTruck);
router.put('/trucks/:id', authMiddleware, adminOnly, trucksRoutes.updateTruck);
router.delete('/trucks/:id', authMiddleware, adminOnly, trucksRoutes.deleteTruck);

// ========== PROTECTED INVOICES ENDPOINTS ==========
router.get('/invoices', authMiddleware, invoicesRoutes.getInvoices);
router.post('/invoices', authMiddleware, adminOnly, invoicesRoutes.createInvoice);
router.get('/invoices/:id', authMiddleware, invoicesRoutes.getInvoice);
router.put('/invoices/:id', authMiddleware, adminOnly, invoicesRoutes.updateInvoice);
router.delete('/invoices/:id', authMiddleware, adminOnly, invoicesRoutes.deleteInvoice);
router.post('/invoices/:id/approve', authMiddleware, adminOnly, invoicesRoutes.approveInvoice);

// ========== PROTECTED TEAM/USERS ENDPOINTS ==========
router.get('/users', authMiddleware, usersRoutes.getUsers);
router.post('/users', authMiddleware, adminOnly, usersRoutes.createUser);
router.get('/users/:id', authMiddleware, usersRoutes.getUser);
router.put('/users/:id', authMiddleware, adminOnly, usersRoutes.updateUser);
router.delete('/users/:id', authMiddleware, adminOnly, usersRoutes.deleteUser);

// ========== PROTECTED ORDERING PLATFORM LINK ENDPOINTS ==========
router.post('/company/:companyId/ordering-link',
  authMiddleware,
  adminOnly,
  orderingLinkRoutes.createOrderingLink
);
router.get('/company/:companyId/ordering-link',
  authMiddleware,
  adminOnly,
  orderingLinkRoutes.getOrderingLink
);
router.post('/company/:companyId/ordering-link/disable',
  authMiddleware,
  adminOnly,
  orderingLinkRoutes.disableOrderingLink
);
router.post('/company/:companyId/ordering-link/enable',
  authMiddleware,
  adminOnly,
  orderingLinkRoutes.enableOrderingLink
);

// ========== HEALTH CHECK ==========
router.get('/health', (req, res) => {
  return res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: '2.0.0',
  });
});

// ========== 404 HANDLER ==========
router.use((req, res) => {
  return res.status(404).json({
    error: 'API endpoint not found',
    path: req.path,
    method: req.method,
  });
});

// ========== ERROR HANDLER ==========
router.use((err, req, res, next) => {
  console.error('API Error:', err);
  return res.status(err.status || 500).json({
    error: err.message || 'Internal server error',
    details: process.env.NODE_ENV === 'development' ? err.stack : undefined,
  });
});

export default router;
