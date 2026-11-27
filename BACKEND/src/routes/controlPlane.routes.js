const express = require('express');
const router = express.Router();
const controller = require('../controllers/controlPlane.controller');
const { authenticate, authorize } = require('../middleware/auth.middleware');

// Public branding endpoint
router.get('/public/branding', controller.getPublicBranding);

// Current institutional branding endpoint
router.get('/branding/current', controller.getMyBranding);

// Overview endpoint (authenticated)
router.get('/overview', authenticate, controller.getOverview);

// Institutional theme & dashboard configuration mutations (Admin / Superuser only)
router.put(
  '/branding',
  authenticate,
  authorize('ADMIN', 'ADMINISTRATOR', 'SUPERUSER'),
  controller.updateBranding
);
router.post(
  '/dashboards',
  authenticate,
  authorize('ADMIN', 'ADMINISTRATOR', 'SUPERUSER'),
  controller.createDashboard
);
router.put(
  '/dashboards/:id',
  authenticate,
  authorize('ADMIN', 'ADMINISTRATOR', 'SUPERUSER'),
  controller.updateDashboard
);
router.delete(
  '/dashboards/:id',
  authenticate,
  authorize('ADMIN', 'ADMINISTRATOR', 'SUPERUSER'),
  controller.deleteDashboard
);

module.exports = router;
