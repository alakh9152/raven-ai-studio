const session = require('express-session');

// Use in-memory store (simple for development)
const sessionMiddleware = session({
  store: undefined, // Uses MemoryStore by default
  secret: process.env.SESSION_SECRET || 'raven-dev-secret-change-in-production',
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
    sameSite: 'lax',
  },
  name: 'raven_session',
  proxy: process.env.NODE_ENV === 'production',
  unset: 'keep',
});

module.exports = sessionMiddleware;