// Database utilities and helpers
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

// ============================================================
// QUERY HELPERS
// ============================================================

// Execute query with error handling
const query = async (text, params = []) => {
  try {
    const result = await pool.query(text, params);
    return result;
  } catch (error) {
    console.error('Query error:', error);
    throw error;
  }
};

// Get single row
const getOne = async (text, params = []) => {
  const result = await query(text, params);
  return result.rows[0] || null;
};

// Get all rows
const getAll = async (text, params = []) => {
  const result = await query(text, params);
  return result.rows;
};

// Insert and return
const insert = async (table, data, returnFields = '*') => {
  const keys = Object.keys(data);
  const values = Object.values(data);
  const placeholders = keys.map((_, i) => `$${i + 1}`).join(', ');

  const text = `INSERT INTO ${table} (${keys.join(', ')}) VALUES (${placeholders}) RETURNING ${returnFields}`;
  return getOne(text, values);
};

// Update and return
const update = async (table, data, where, returnFields = '*') => {
  const keys = Object.keys(data);
  const values = Object.values(data);
  const whereKeys = Object.keys(where);

  let paramIndex = values.length + 1;
  const setClause = keys.map((key, i) => `${key} = $${i + 1}`).join(', ');
  const whereClause = whereKeys.map((key) => `${key} = $${paramIndex++}`).join(' AND ');

  const text = `UPDATE ${table} SET ${setClause} WHERE ${whereClause} RETURNING ${returnFields}`;
  return getOne(text, [...values, ...Object.values(where)]);
};

// Delete
const del = async (table, where) => {
  const keys = Object.keys(where);
  const values = Object.values(where);

  const whereClause = keys.map((key, i) => `${key} = $${i + 1}`).join(' AND ');
  const text = `DELETE FROM ${table} WHERE ${whereClause}`;
  return query(text, values);
};

// ============================================================
// TRANSACTION SUPPORT
// ============================================================

const transaction = async (callback) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

// ============================================================
// EXPORTS
// ============================================================

module.exports = {
  pool,
  query,
  getOne,
  getAll,
  insert,
  update,
  del,
  transaction,
};
