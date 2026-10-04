const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const cookieParser = require('cookie-parser');
const path = require('path');

// Import middleware and routes
const { requestLogger, errorHandler, validateError, notFound } = require('./middleware/logging');
const sessionMiddleware = require('./middleware/session');
const { requireAuth } = require('./middleware/auth');

const authRoutes = require('./routes/auth');
const dashboardRoutes = require('./routes/dashboard');
const apiRoutes = require('./routes/api');
const healthRoutes = require('./routes/health');

const app = express();

// ─── Security Middleware ───────────────────────────────────────────────
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
}));

// CORS with restrictions
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://127.0.0.1:5500',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// Rate limiting - stricter for auth endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: { success: false, error: 'Too many attempts, please try again later' },
});

const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { success: false, error: 'Too many requests, please try again later' },
});

app.use('/api/auth/register', authLimiter);
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/forgot-password', authLimiter);
app.use('/api/auth/reset-password', authLimiter);
app.use('/api/contact', rateLimit({ windowMs: 60 * 60 * 1000, max: 10 }));
app.use('/api', generalLimiter);

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Session management
app.use(sessionMiddleware);

// Request logging
app.use(requestLogger);

// ─── Static Files ─────────────────────────────────────────────────────
app.use(express.static(path.join(__dirname, '../public')));

// ─── API Routes ────────────────────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api', apiRoutes);
app.use('/health', healthRoutes);

// ─── Page Routes ───────────────────────────────────────────────────────
const pageRoutes = [
  { path: '/', file: 'index.html' },
  { path: '/about', file: 'about.html' },
  { path: '/contact', file: 'contact.html' },
  { path: '/saas', file: 'saas.html' },
  { path: '/services', file: 'services.html' },
  { path: '/work', file: 'work.html' },
  { path: '/pricing', file: 'pricing.html' },
  { path: '/faq', file: 'faq.html' },
  { path: '/login', file: 'login.html' },
  { path: '/forgot-password', file: 'forgot-password.html' },
  { path: '/reset-password', file: 'reset-password.html' },
  { path: '/verify-email', file: 'verify-email.html' },
  { path: '/profile', file: 'profile.html' },
  { path: '/projects', file: 'projects.html' },
  { path: '/privacy', file: 'privacy.html' },
  { path: '/terms', file: 'terms.html' },
];

pageRoutes.forEach(({ path: route, file }) => {
  app.get(route, (req, res) => {
    res.sendFile(path.join(__dirname, '../public', file));
  });
});

// Protected dashboard route
app.get('/dashboard', requireAuth, (req, res) => {
  res.sendFile(path.join(__dirname, '../public', 'dashboard.html'));
});

// ─── 404 Handler ──────────────────────────────────────────────────────
app.use((req, res, next) => {
  if (req.path.startsWith('/api')) {
    return res.status(404).json({ success: false, error: 'API endpoint not found' });
  }
  res.sendFile(path.join(__dirname, '../public', '404.html'));
});

// ─── Error Handling ────────────────────────────────────────────────────
app.use(validateError);
app.use(errorHandler);

// ─── Start Server ─────────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log('Raven AI Studio running on http://localhost:' + PORT);
  console.log('Environment: ' + (process.env.NODE_ENV || 'development'));
  console.log('CORS Origin: ' + (process.env.CORS_ORIGIN || 'http://127.0.0.1:5500'));
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received. Shutting down gracefully...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT received. Shutting down gracefully...');
  process.exit(0);
});

module.exports = app;
