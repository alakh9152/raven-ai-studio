const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { query, transaction } = require('../config/db');

const SALT_ROUNDS = 12;

// Password hashing
const hashPassword = async (password) => {
  const salt = await bcrypt.genSalt(SALT_ROUNDS);
  return bcrypt.hash(password, salt);
};

// Password comparison
const comparePassword = async (password, hash) => {
  return bcrypt.compare(password, hash);
};

// Session token generation
const generateSessionToken = () => {
  return crypto.randomBytes(48).toString('hex');
};

// CSRF token generation
const generateCSRFToken = () => {
  return crypto.randomBytes(32).toString('hex');
};

// Auth middleware - checks if user is logged in via session
const requireAuth = async (req, res, next) => {
  // express-session sets req.session with userId if logged in
  if (!req.session?.userId) {
    return res.status(401).json({ success: false, error: 'Authentication required' });
  }

  try {
    const result = await query(
      `SELECT u.id, u.email, u.first_name, u.last_name, u.role, u.is_active, u.email_verified,
              s.expires_at, s.revoked_at
       FROM users u
       JOIN sessions s ON u.id = s.user_id
       WHERE s.user_id = $1 AND s.revoked_at IS NULL AND s.expires_at > NOW()`,
      [req.session.userId]
    );
    
    if (result.rows.length === 0) {
      req.session.destroy(() => {});
      return res.status(401).json({ success: false, error: 'Session expired or invalid' });
    }
    
    req.user = {
      id: result.rows[0].id,
      email: result.rows[0].email,
      firstName: result.rows[0].first_name,
      lastName: result.rows[0].last_name,
      role: result.rows[0].role,
      emailVerified: result.rows[0].email_verified,
      isActive: result.rows[0].is_active,
    };
    req.isAuthenticated = true;
    next();
  } catch (err) {
    console.error('Auth middleware error:', err.message);
    next(err);
  }
};

// Admin only middleware
const requireAdmin = (req, res, next) => {
  if (!req.isAuthenticated || req.user.role !== 'admin') {
    return res.status(403).json({ success: false, error: 'Admin access required' });
  }
  next();
};

module.exports = {
  hashPassword,
  comparePassword,
  generateSessionToken,
  generateCSRFToken,
  requireAuth,
  requireAdmin,
  SALT_ROUNDS,
};
