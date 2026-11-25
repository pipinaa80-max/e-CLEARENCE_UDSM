const express = require('express');
const router = express.Router();
const controller = require('../controllers/controlPlane.controller');
const { authenticate } = require('../middleware/auth.middleware');

// Public branding endpoint
router.get('/public/branding', controller.getPublicBranding);

// Current institutional branding endpoint
router.get('/branding/current', controller.getMyBranding);

// Overview endpoint (authenticated)
router.get('/overview', authenticate, controller.getOverview);

module.exports = router;
