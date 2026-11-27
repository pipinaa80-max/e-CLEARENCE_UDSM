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

const apiSpikeLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute rolling window
  max: env.NODE_ENV === 'test' ? 10000 : 180, // 180 req/min per IP protects against runaway floods while allowing shared campus NAT
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    return res.status(429).json({
      success: false,
      status: 429,
      error: 'TooManyRequests',
      message: 'Request rate limit exceeded. Please wait a moment before retrying.'
    });
  }
});

module.exports = {
  loginLimiter,
  authLimiter,
  apiSpikeLimiter
};
