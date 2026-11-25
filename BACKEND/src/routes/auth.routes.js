const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.controller');
const { authenticate, authorize } = require('../middleware/auth.middleware');
const { loginLimiter, authLimiter } = require('../middleware/rateLimiter.middleware');

// Public endpoints
router.post('/login', loginLimiter, authController.login);
router.post('/register', authLimiter, authController.register);
router.post('/refresh', authController.refresh);
router.post('/reset-password', authLimiter, authController.resetPassword);
router.post('/reset-password/confirm', authLimiter, authController.resetPasswordConfirm);
router.post('/verify-email', authLimiter, authController.verifyEmail);
router.post('/resend-verification', authLimiter, authController.resendVerificationEmail);
router.get('/health', (req, res) => {
  res.status(200).json({
    status: 'UP',
    timestamp: new Date().toISOString(),
    service: 'udsm-eclearance-api'
  });
});

// Authenticated endpoints
router.post('/logout', authenticate, authController.logout);
router.get('/profile', authenticate, authController.getProfile);
router.get('/profile/:userId', authenticate, authController.getUserProfile);
router.put('/profile', authenticate, authController.updateProfile);
router.post('/change-password', authenticate, authController.changePassword);

// Admin account activation / deactivation endpoints
router.put(
  '/activate/:userId',
  authenticate,
  authorize('ADMIN', 'ADMINISTRATOR', 'SUPERUSER'),
  authController.activateAccount
);
router.put(
  '/deactivate/:userId',
  authenticate,
  authorize('ADMIN', 'ADMINISTRATOR', 'SUPERUSER'),
  authController.deactivateAccount
);

module.exports = router;
