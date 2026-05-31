// lib/validation.js
// Zod schemas for comprehensive input validation
import { z } from 'zod';

// Phone number validation (US format)
const phoneSchema = z.string()
  .regex(/^(\+?1)?(\d{3})(\d{3})(\d{4})$/, 'Invalid phone number')
  .transform(val => val.replace(/\D/g, '').slice(-10)); // Extract last 10 digits

// Email validation
const emailSchema = z.string()
  .email('Invalid email address')
  .toLowerCase()
  .trim();

// Name validation
const nameSchema = z.string()
  .min(2, 'Name must be at least 2 characters')
  .max(100, 'Name must not exceed 100 characters')
  .trim();

// OTP validation (6 digits)
const otpSchema = z.string()
  .regex(/^\d{6}$/, 'OTP must be 6 digits');

// ── AUTH SCHEMAS ──────────────────────────────────────────────────
export const sendOTPSchema = z.object({
  phone: phoneSchema,
  userType: z.enum(['admin', 'driver']).default('admin'),
});

export const verifyOTPSchema = z.object({
  phone: phoneSchema,
  code: otpSchema,
  userType: z.enum(['admin', 'driver']).default('admin'),
});

export const signupSchema = z.object({
  companyName: nameSchema,
  ownerName: nameSchema,
  ownerEmail: emailSchema,
  phone: phoneSchema,
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[0-9]/, 'Password must contain at least one digit')
    .regex(/[^a-zA-Z0-9]/, 'Password must contain at least one special character'),
});

// ── CUSTOMER SCHEMAS ──────────────────────────────────────────────
export const customerSchema = z.object({
  name: nameSchema,
  phone: phoneSchema.optional(),
  email: emailSchema.optional(),
  address: z.string().max(500, 'Address too long').optional(),
  creditLimit: z.number().min(0, 'Credit limit must be positive').optional(),
  route: z.string().max(100, 'Route too long').optional(),
});

// ── PRODUCT SCHEMAS ───────────────────────────────────────────────
export const productSchema = z.object({
  sku: z.string()
    .min(2, 'SKU must be at least 2 characters')
    .max(50, 'SKU too long')
    .regex(/^[A-Z0-9\-_]+$/, 'SKU must contain only uppercase letters, numbers, hyphens, and underscores'),
  name: nameSchema,
  price: z.number().positive('Price must be positive'),
  unit: z.string().max(20, 'Unit too long'),
  category: z.string().max(50, 'Category too long').optional(),
  stock: z.number().min(0, 'Stock cannot be negative').optional(),
  minStock: z.number().min(0, 'Min stock cannot be negative').optional(),
});

// ── DRIVER SCHEMAS ────────────────────────────────────────────────
export const driverSchema = z.object({
  name: nameSchema,
  phone: phoneSchema,
  email: emailSchema.optional(),
  licenseNumber: z.string()
    .min(5, 'License number too short')
    .max(20, 'License number too long')
    .optional(),
  licenseExpiry: z.string().datetime().optional(),
});

// ── TRUCK SCHEMAS ─────────────────────────────────────────────────
export const truckSchema = z.object({
  plate: z.string()
    .min(3, 'Plate too short')
    .max(20, 'Plate too long')
    .regex(/^[A-Z0-9\-]+$/, 'Invalid plate format'),
  capacity: z.number().positive('Capacity must be positive'),
  year: z.number().min(2000, 'Year too old').max(new Date().getFullYear() + 1).optional(),
});

// ── SALE SCHEMAS ──────────────────────────────────────────────────
export const saleItemSchema = z.object({
  productId: z.string().uuid('Invalid product ID'),
  quantity: z.number().positive('Quantity must be positive'),
  price: z.number().positive('Price must be positive'),
  discount: z.number().min(0).max(100).optional(),
});

export const saleSchema = z.object({
  customerId: z.string().uuid('Invalid customer ID'),
  items: z.array(saleItemSchema).min(1, 'At least one item required'),
  discountAmount: z.number().min(0).optional(),
  notes: z.string().max(500).optional(),
});

// ── PAYMENT SCHEMAS ───────────────────────────────────────────────
export const paymentSchema = z.object({
  saleId: z.string().uuid().optional(),
  customerId: z.string().uuid().optional(),
  amount: z.number().positive('Amount must be positive'),
  method: z.enum(['cash', 'check', 'credit_card', 'bank_transfer', 'other']),
  reference: z.string().max(100).optional(),
  notes: z.string().max(500).optional(),
});

// ── VALIDATION HELPER ─────────────────────────────────────────────
export async function validateData(schema, data) {
  try {
    const validated = await schema.parseAsync(data);
    return { valid: true, data: validated, errors: null };
  } catch (error) {
    if (error.errors) {
      const errors = error.errors.reduce((acc, err) => {
        const path = err.path.join('.');
        acc[path] = err.message;
        return acc;
      }, {});
      return { valid: false, data: null, errors };
    }
    return { valid: false, data: null, errors: { form: error.message } };
  }
}

// ── BATCH VALIDATION ──────────────────────────────────────────────
export function validateBatch(schema, dataArray) {
  return Promise.all(
    dataArray.map(data => validateData(schema, data))
  );
}

export default {
  phoneSchema,
  emailSchema,
  nameSchema,
  otpSchema,
  sendOTPSchema,
  verifyOTPSchema,
  signupSchema,
  customerSchema,
  productSchema,
  driverSchema,
  truckSchema,
  saleItemSchema,
  saleSchema,
  paymentSchema,
  validateData,
  validateBatch,
};
