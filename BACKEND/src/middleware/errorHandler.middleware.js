const env = require('../config/env');

/**
 * Centralized Express Error Handling Middleware
 */
function errorHandler(err, req, res, next) {
  const status = err.status || err.statusCode || 500;
  const message = err.message || 'An unexpected internal server error occurred.';
  const errorName = err.name || 'InternalServerError';

  // Sanitize and log error server-side (never log password or tokens)
  if (status >= 500) {
    console.error(`[ERROR] ${req.method} ${req.originalUrl} - ${err.message}`);
    if (env.NODE_ENV !== 'production' && err.stack) {
      console.error(err.stack);
    }
  }

  const response = {
    success: false,
    status,
    error: errorName,
    message
  };

  // Stack traces only visible in development
  if (env.NODE_ENV === 'development' && err.stack) {
    response.stack = err.stack;
  }

  res.status(status).json(response);
}

/**
 * 404 Route Not Found Middleware
 */
function notFoundHandler(req, res) {
  res.status(404).json({
    success: false,
    status: 404,
    error: 'NotFound',
    message: `Resource not found at ${req.method} ${req.originalUrl}`
  });
}

module.exports = {
  errorHandler,
  notFoundHandler
};
