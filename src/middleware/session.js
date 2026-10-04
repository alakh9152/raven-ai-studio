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
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    sameSite: 'lax',
  },
  name: 'connect.sid',
  proxy: process.env.NODE_ENV === 'production',
  unset: 'keep',
});

module.exports = sessionMiddleware;