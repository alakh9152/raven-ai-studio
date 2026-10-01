const { Pool } = require('pg');
require('dotenv').config();

// Database connection pool with security settings
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'raven_studio',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
  // Security settings for production
  ssl: process.env.NODE_ENV === 'production' ? {
    rejectUnauthorized: false
  } : false,
});

// Query wrapper with parameterized queries (prevents SQL injection)
const query = async (text, params) => {
  const start = Date.now();
  try {
    const res = await pool.query(text, params);
    const duration = Date.now() - start;
    console.log('Query executed', { text, duration, rows: res.rows.length });
    return res;
  } catch (error) {
    console.error('Database query error', { 
      text: text.substring(0, 100), 
      error: error.message,
      code: error.code 
    });
    throw error;
  }
};

// Transaction helper
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

// Health check
const healthCheck = async () => {
  try {
    const start = Date.now();
    const res = await pool.query('SELECT NOW() as now');
    const duration = Date.now() - start;
    return {
      status: 'ok',
      uptime: process.uptime(),
      queryDuration: duration,
      timestamp: res.rows[0].now
    };
  } catch (error) {
    return {
      status: 'error',
      error: error.message
    };
  }
};

module.exports = { pool, query, transaction, healthCheck };
