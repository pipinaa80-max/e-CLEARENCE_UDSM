const rateLimit = require('express-rate-limit');
const env = require('../config/env');

const loginLimiter = rateLimit({
  windowMs: env.RATE_LIMIT_WINDOW_MS, // 15 minutes
  max: env.NODE_ENV === 'test' ? 1000 : env.RATE_LIMIT_MAX_ATTEMPTS, // 10 in prod/dev, relaxed for automated tests
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    return res.status(429).json({
      success: false,
      status: 429,
      error: 'TooManyRequests',
      message: 'Too many login attempts from this IP address. Please try again after 15 minutes.'
    });
  }
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: env.NODE_ENV === 'test' ? 1000 : 30, // 30 requests per 15 mins for registration/password reset
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    return res.status(429).json({
      success: false,
      status: 429,
      error: 'TooManyRequests',
      message: 'Too many requests. Please try again later.'
    });
  }
});

module.exports = {
  loginLimiter,
  authLimiter
};
