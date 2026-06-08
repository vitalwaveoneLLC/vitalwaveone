// Input sanitization utility for XSS prevention
// Removes dangerous HTML/script content from user inputs

const HTML_ESCAPE_MAP = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#x27;',
  '/': '&#x2F;',
};

/**
 * Escape HTML special characters to prevent XSS
 * @param {string} str - The string to escape
 * @returns {string} - Escaped string safe for HTML
 */
export const escapeHtml = (str) => {
  if (!str || typeof str !== 'string') return '';
  return str.replace(/[&<>"'\/]/g, (char) => HTML_ESCAPE_MAP[char]);
};

/**
 * Sanitize phone number - allow only digits, spaces, dashes, parentheses, plus
 * @param {string} phone - Phone number to sanitize
 * @returns {string} - Sanitized phone number
 */
export const sanitizePhone = (phone) => {
  if (!phone || typeof phone !== 'string') return '';
  // Remove everything except digits, spaces, dashes, parentheses, plus
  return phone.replace(/[^\d\s\-\(\)\+]/g, '').trim();
};

/**
 * Sanitize email address
 * @param {string} email - Email to sanitize
 * @returns {string} - Sanitized email
 */
export const sanitizeEmail = (email) => {
  if (!email || typeof email !== 'string') return '';
  // Basic email validation and sanitization
  return email.toLowerCase().trim().replace(/[^\w\.\-@]/g, '');
};

/**
 * Sanitize text input - remove HTML tags and scripts
 * @param {string} text - Text to sanitize
 * @param {number} maxLength - Maximum length (default 500)
 * @returns {string} - Sanitized text
 */
export const sanitizeText = (text, maxLength = 500) => {
  if (!text || typeof text !== 'string') return '';

  // Remove HTML tags
  let sanitized = text.replace(/<[^>]*>/g, '');

  // Remove script-like patterns
  sanitized = sanitized.replace(/javascript:/gi, '');
  sanitized = sanitized.replace(/onerror=/gi, '');
  sanitized = sanitized.replace(/onclick=/gi, '');
  sanitized = sanitized.replace(/onload=/gi, '');

  // Trim whitespace and limit length
  return sanitized.trim().substring(0, maxLength);
};

/**
 * Sanitize numeric input
 * @param {*} value - Value to sanitize
 * @param {number} min - Minimum value (optional)
 * @param {number} max - Maximum value (optional)
 * @returns {number} - Sanitized number or 0
 */
export const sanitizeNumber = (value, min = null, max = null) => {
  const num = parseFloat(value);

  if (isNaN(num)) return 0;

  let result = num;
  if (min !== null && result < min) result = min;
  if (max !== null && result > max) result = max;

  return result;
};

/**
 * Sanitize check or reference numbers - allow alphanumeric only
 * @param {string} ref - Reference number to sanitize
 * @returns {string} - Sanitized reference
 */
export const sanitizeReference = (ref) => {
  if (!ref || typeof ref !== 'string') return '';
  // Allow only alphanumeric characters, dashes, and underscores
  return ref.replace(/[^\w\-]/g, '').substring(0, 50);
};

/**
 * Validate and sanitize cart items
 * @param {array} items - Cart items to validate
 * @returns {array} - Validated and sanitized items
 */
export const sanitizeCartItems = (items) => {
  if (!Array.isArray(items)) return [];

  return items
    .filter(item => item && item.pid && item.qty)
    .map(item => ({
      pid: String(item.pid).substring(0, 50), // Limit ID length
      qty: Math.max(1, Math.min(9999, parseInt(item.qty) || 0)), // Limit quantity
    }))
    .slice(0, 100); // Limit number of items
};

/**
 * Sanitize customer form data
 * @param {object} data - Customer data to sanitize
 * @returns {object} - Sanitized customer data
 */
export const sanitizeCustomerData = (data) => {
  if (!data || typeof data !== 'object') return {};

  return {
    name: sanitizeText(data.name, 100),
    phone: sanitizePhone(data.phone),
    email: sanitizeEmail(data.email),
    address: sanitizeText(data.address, 200),
    city: sanitizeText(data.city, 50),
    state: sanitizeText(data.state, 2).toUpperCase(),
    owner_name: sanitizeText(data.owner_name, 100),
    notes: sanitizeText(data.notes, 500),
  };
};

/**
 * Validate form inputs before submission
 * @param {object} formData - Form data to validate
 * @param {array} requiredFields - Required field names
 * @returns {object} - { valid: boolean, errors: object }
 */
export const validateForm = (formData, requiredFields = []) => {
  const errors = {};

  requiredFields.forEach(field => {
    if (!formData[field] || String(formData[field]).trim() === '') {
      errors[field] = `${field} is required`;
    }
  });

  // Validate email if present
  if (formData.email && formData.email.trim()) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      errors.email = 'Invalid email format';
    }
  }

  // Validate phone if present
  if (formData.phone && formData.phone.trim()) {
    const phoneDigits = formData.phone.replace(/\D/g, '');
    if (phoneDigits.length < 10) {
      errors.phone = 'Invalid phone number (must be at least 10 digits)';
    }
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
  };
};

/**
 * Safe JSON parse with fallback
 * @param {string} json - JSON string to parse
 * @param {*} fallback - Value to return if parsing fails
 * @returns {*} - Parsed object or fallback value
 */
export const safeJsonParse = (json, fallback = null) => {
  try {
    return JSON.parse(json);
  } catch (e) {
    console.warn('JSON parse error:', e.message);
    return fallback;
  }
};

export default {
  escapeHtml,
  sanitizePhone,
  sanitizeEmail,
  sanitizeText,
  sanitizeNumber,
  sanitizeReference,
  sanitizeCartItems,
  sanitizeCustomerData,
  validateForm,
  safeJsonParse,
};
