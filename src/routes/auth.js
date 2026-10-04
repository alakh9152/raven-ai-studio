const { Router } = require('express');
const { requireAuth, generateCSRFToken } = require('../middleware/auth');
const authService = require('../services/authService');

const router = Router();

// POST /api/auth/register
router.post('/register', async (req, res, next) => {
  try {
    const { email, password, firstName, lastName } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ success: false, error: 'Email and password are required' });
    }

    const result = await authService.register({ email, password, firstName, lastName });
    
    // Set session
    req.session.userId = result.user.id;
    req.session.save((err) => {
      if (err) return next(err);
      
      res.status(201).json({
        success: true,
        message: 'Registration successful',
        user: result.user,
      });
    });
  } catch (error) {
    const status = error.statusCode || 500;
    res.status(status).json({ success: false, error: error.message });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res, next) => {
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ success: false, error: 'Email and password are required' });
    }

    const ipAddress = req.ip || req.connection.remoteAddress;
    const userAgent = req.get('User-Agent');

    const result = await authService.login({ email, password, ipAddress, userAgent });

    // Set session
    req.session.userId = result.user.id;
    req.session.save((err) => {
      if (err) return next(err);
      
      res.json({
        success: true,
        message: 'Login successful',
        user: result.user,
      });
    });
  } catch (error) {
    const status = error.statusCode || 401;
    res.status(status).json({ success: false, error: error.message });
  }
});

// POST /api/auth/logout
router.post('/logout', async (req, res, next) => {
  try {
    const sessionId = req.session?.id;
    
    if (sessionId) {
      await authService.logout(sessionId);
    }
    
    req.session.destroy((err) => {
      if (err) return next(err);
      res.clearCookie('raven_session');
      res.clearCookie('connect.sid');
      res.json({ success: true, message: 'Logged out successfully' });
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/auth/me
router.get('/me', requireAuth, async (req, res, next) => {
  try {
    res.json({ user: req.user });
  } catch (error) {
    next(error);
  }
});

// POST /api/auth/verify-email
router.post('/verify-email', async (req, res, next) => {
  try {
    const { token } = req.body;
    const userId = req.user?.id;
    
    if (!token || !userId) {
      return res.status(400).json({ success: false, error: 'Token and user ID are required' });
    }

    await authService.verifyEmail(userId, token);
    res.json({ success: true, message: 'Email verified successfully' });
  } catch (error) {
    const status = error.statusCode || 500;
    res.status(status).json({ success: false, error: error.message });
  }
});

// POST /api/auth/forgot-password
router.post('/forgot-password', async (req, res, next) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ success: false, error: 'Email is required' });
    }

    const result = await authService.forgotPassword(email);
    res.json({ success: true, message: result.message || 'If the email exists, a reset link has been sent' });
  } catch (error) {
    next(error);
  }
});

// POST /api/auth/reset-password
router.post('/reset-password', async (req, res, next) => {
  try {
    const { token, newPassword } = req.body;
    if (!token || !newPassword) {
      return res.status(400).json({ success: false, error: 'Token and new password are required' });
    }

    await authService.resetPassword(token, newPassword);
    res.json({ success: true, message: 'Password reset successfully' });
  } catch (error) {
    const status = error.statusCode || 500;
    res.status(status).json({ success: false, error: error.message });
  }
});

// POST /api/auth/change-password
router.post('/change-password', requireAuth, async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ success: false, error: 'Current and new password are required' });
    }

    await authService.changePassword(req.user.id, currentPassword, newPassword);
    res.json({ success: true, message: 'Password changed successfully' });
  } catch (error) {
    const status = error.statusCode || 500;
    res.status(status).json({ success: false, error: error.message });
  }
});

// GET /api/auth/csrf-token
router.get('/csrf-token', async (req, res) => {
  res.json({ token: generateCSRFToken() });
});

module.exports = router;