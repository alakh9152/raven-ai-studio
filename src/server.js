const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const cookieParser = require('cookie-parser');
const path = require('path');
const session = require('express-session');

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
  crossOriginEmbedderPolicy: true,
  crossOriginOpenerPolicy: true,
  crossOriginResourcePolicy: { policy: "same-origin" },
}));

// CORS with restrictions
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { error: 'Too many requests, please try again later' },
});
app.use('/api', limiter);

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
  { path: '/login', file: 'login.html' },
  { path: '/services', file: 'services.html' },
  { path: '/work', file: 'work.html' },
  { path: '/pricing', file: 'pricing.html' },
  { path: '/faq', file: 'faq.html' },
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

// ─── Error Handling ────────────────────────────────────────────────────
app.use(notFound);
app.use(validateError);
app.use(errorHandler);

// ─── Start Server ─────────────────────────────────────────────────────
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log('Raven AI Studio running on http://localhost:' + PORT);
  console.log('Environment: ' + (process.env.NODE_ENV || 'development'));
});

module.exports = app;