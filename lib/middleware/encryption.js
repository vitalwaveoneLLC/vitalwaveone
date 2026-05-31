// api/middleware/encryption.js - Encrypt/decrypt sensitive data

import CryptoJS from 'crypto-js';

const SECRET_KEY = process.env.ENCRYPTION_KEY || 'default-dev-key-change-in-production';

/**
 * Encrypt sensitive field
 * @param {Object} data - Data object
 * @param {string} field - Field name to encrypt
 * @returns {Object} Data with encrypted field
 */
export function encryptSensitive(data, field) {
  if (!data[field]) return data;

  try {
    const encrypted = CryptoJS.AES.encrypt(
      JSON.stringify(data[field]),
      SECRET_KEY
    ).toString();
    return { ...data, [field]: encrypted };
  } catch (error) {
    console.error(`[encryption] Failed to encrypt ${field}:`, error.message);
    return data;
  }
}

/**
 * Decrypt sensitive field
 * @param {Object} data - Data object with encrypted field
 * @param {string} field - Field name to decrypt
 * @returns {Object} Data with decrypted field
 */
export function decryptSensitive(data, field) {
  if (!data[field]) return data;

  try {
    const decrypted = CryptoJS.AES.decrypt(data[field], SECRET_KEY).toString(
      CryptoJS.enc.Utf8
    );
    return { ...data, [field]: JSON.parse(decrypted) };
  } catch (error) {
    console.error(`[encryption] Failed to decrypt ${field}:`, error.message);
    return data;
  }
}

/**
 * Encrypt multiple sensitive fields
 * @param {Object} data - Data object
 * @param {Array} fields - Array of field names to encrypt
 * @returns {Object} Data with encrypted fields
 */
export function encryptFields(data, fields = []) {
  let result = { ...data };
  fields.forEach((field) => {
    result = encryptSensitive(result, field);
  });
  return result;
}

/**
 * Decrypt multiple sensitive fields
 * @param {Object} data - Data object
 * @param {Array} fields - Array of field names to decrypt
 * @returns {Object} Data with decrypted fields
 */
export function decryptFields(data, fields = []) {
  let result = { ...data };
  fields.forEach((field) => {
    result = decryptSensitive(result, field);
  });
  return result;
}
