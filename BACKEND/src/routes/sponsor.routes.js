const express = require('express');
const router = express.Router();
const controller = require('../controllers/sponsor.controller');
const { authenticate, authorize } = require('../middleware/auth.middleware');
const { ROLES } = require('../constants/roles');

// GET /api/v1/sponsors - List active sponsors (public/authenticated for clearance request dropdown)
router.get('/', controller.getActiveSponsors);

// GET /api/v1/sponsors/all - List all sponsors (authenticated admin / staff)
router.get('/all', authenticate, authorize(ROLES.ADMIN, ROLES.ADMINISTRATOR, ROLES.SUPERUSER), controller.getAllSponsors);

// POST /api/v1/sponsors - Create sponsor (admin)
router.post('/', authenticate, authorize(ROLES.ADMIN, ROLES.ADMINISTRATOR, ROLES.SUPERUSER), controller.createSponsor);

// PUT /api/v1/sponsors/:id - Update sponsor (admin)
router.put('/:id', authenticate, authorize(ROLES.ADMIN, ROLES.ADMINISTRATOR, ROLES.SUPERUSER), controller.updateSponsor);

// DELETE /api/v1/sponsors/:id - Delete sponsor (admin)
router.delete('/:id', authenticate, authorize(ROLES.ADMIN, ROLES.ADMINISTRATOR, ROLES.SUPERUSER), controller.deleteSponsor);

module.exports = router;
