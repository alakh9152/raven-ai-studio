const crypto = require('crypto');

// Generate unique request ID
const generateRequestId = () => {
  return `${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
};

// Logging middleware
const requestLogger = (req, res, next) => {
  const requestId = generateRequestId();
  const startTime = Date.now();
  
  // Attach to request
  req.requestId = requestId;
  req.startTime = startTime;
  
  // Log request
  console.log('[REQUEST]', {
    timestamp: new Date().toISOString(),
    requestId,
    method: req.method,
    path: req.originalUrl,
    ip: req.ip || req.connection.remoteAddress,
    userAgent: req.get('User-Agent'),
  });
  
  // Capture response
  const originalEnd = res.end;
  res.end = function(...args) {
    const duration = Date.now() - startTime;
    
    console.log('[RESPONSE]', {
      timestamp: new Date().toISOString(),
      requestId,
      method: req.method,
      path: req.originalUrl,
      status: res.statusCode,
      duration: `${duration}ms`,
      contentType: res.getHeader('Content-Type'),
    });
    
    originalEnd.apply(res, args);
  };
  
  next();
};

// Error handling middleware
const errorHandler = (err, req, res, next) => {
  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal Server Error';
  
  console.error('[ERROR]', {
    timestamp: new Date().toISOString(),
    requestId: req.requestId,
    method: req.method,
    path: req.originalUrl,
    status: statusCode,
    error: message,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
  });
  
  // Don't leak internal errors in production
  const response = {
    error: message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  };
  
  res.status(statusCode).json(response);
};

// Validation error handler
const validateError = (err, req, res, next) => {
  if (err.status === 400) {
    return res.status(400).json({
      error: 'Validation Error',
      messages: err.errors.map(e => ({
        field: e.path,
        message: e.msg,
      })),
    });
  }
  next(err);
};

// 404 handler
const notFound = (req, res, next) => {
  if (req.path.startsWith('/api')) {
    return res.status(404).json({ error: 'API endpoint not found' });
  }
  next();
};

module.exports = {
  requestLogger,
  errorHandler,
  validateError,
  notFound,
};
