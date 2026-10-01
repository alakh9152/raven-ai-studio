const crypto = require('crypto');
const bcrypt = require('bcryptjs');

const SALT_ROUNDS = 12;

// Generate secure random token
const generateToken = (length = 32) => {
  return crypto.randomBytes(length).toString('hex');
};

// Hash token for storage
const hashToken = (token) => {
  return crypto.createHash('sha256').update(token).digest('hex');
};

// Verify token against hash
const verifyToken = (token, hash) => {
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
  return crypto.timingSafeEqual(
    Buffer.from(tokenHash, 'hex'),
    Buffer.from(hash, 'hex')
  );
};

// Hash password
const hashPassword = async (password) => {
  return bcrypt.hash(password, SALT_ROUNDS);
};

// Verify password
const comparePassword = async (password, hash) => {
  return bcrypt.compare(password, hash);
};

// Generate session token
const generateSessionToken = () => {
  return crypto.randomBytes(48).toString('hex');
};

// Generate CSRF token
const generateCSRFToken = () => {
  return crypto.randomBytes(32).toString('hex');
};

// Validate email format
const isValidEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

// Validate password strength
const validatePassword = (password) => {
  if (password.length < 8) return false;
  if (password.length > 128) return false;
  // Require at least one letter and one number
  return /[a-zA-Z]/.test(password) && /[0-9]/.test(password);
};

// Sanitize user input
const sanitizeInput = (input) => {
  if (typeof input !== 'string') return input;
  return input
    .replace(/[<>&"']/g, (char) => {
      const entities = {
        '<': '&lt;',
        '>': '&gt;',
        '&': '&amp;',
        '"': '&quot;',
        "'": '&#x27;',
      };
      return entities[char] || char;
    })
    .trim();
};

// Generate unique request ID
const generateRequestId = () => {
  return `${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
};

module.exports = {
  generateToken,
  hashToken,
  verifyToken,
  hashPassword,
  comparePassword,
  generateSessionToken,
  generateCSRFToken,
  isValidEmail,
  validatePassword,
  sanitizeInput,
  generateRequestId,
  SALT_ROUNDS,
};
