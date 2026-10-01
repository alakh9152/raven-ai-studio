const { Router } = require('express');
const { body, validationResult } = require('express-validator');
const authService = require('../services/authService');
const { isValidEmail, validatePassword } = require('../services/crypto');
const { requestLogger } = require('../middleware/logging');

const router = Router();

// POST /api/auth/register
router.post(
  '/register',
  requestLogger,
  [
    body('email').isEmail().normalizeEmail().trim(),
    body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
    body('password').custom((value) => {
      if (!validatePassword(value)) {
        throw new Error('Password must contain letters and numbers');
      }
      return true;
    }),
    body('firstName').optional().trim().isLength({ min: 1 }),
    body('lastName').optional().trim().isLength({ min: 1 }),
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { email, password, firstName, lastName } = req.body;

      const result = await authService.register({ email, password, firstName, lastName });

      // Set session
      req.session.id = result.session?.id;
      req.session.userId = result.user.id;

      res.status(201).json({
        message: 'Registration successful',
        user: result.user,
      });
    } catch (error) {
      next(error);
    }
  }
);

// POST /api/auth/login
router.post(
  '/login',
  requestLogger,
  [
    body('email').isEmail().normalizeEmail().trim(),
    body('password').notEmpty().withMessage('Password is required'),
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { email, password } = req.body;
      const ipAddress = req.ip || req.connection.remoteAddress;
      const userAgent = req.get('User-Agent');

      const result = await authService.login({ email, password, ipAddress, userAgent });

      req.session.id = result.session.id;
      req.session.userId = result.user.id;

      res.json({
        message: 'Login successful',
        user: result.user,
      });
    } catch (error) {
      next(error);
    }
  }
);

// POST /api/auth/logout
router.post(
  '/logout',
  requestLogger,
  async (req, res, next) => {
    try {
      const sessionId = req.session?.id;
      
      if (sessionId) {
        await authService.logout(sessionId);
      }
      
      req.session.destroy((err) => {
        if (err) return next(err);
        res.clearCookie('raven_session');
        res.json({ message: 'Logged out successfully' });
      });
    } catch (error) {
      next(error);
    }
  }
);

// GET /api/auth/me
router.get(
  '/me',
  requestLogger,
  async (req, res, next) => {
    try {
      if (!req.isAuthenticated) {
        return res.status(401).json({ error: 'Authentication required' });
      }
      
      res.json({ user: req.user });
    } catch (error) {
      next(error);
    }
  }
);

module.exports = router;
