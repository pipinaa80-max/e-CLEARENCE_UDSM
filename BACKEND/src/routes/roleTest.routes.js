const express = require('express');
const router = express.Router();
const { authenticate, authorize, requireSuperuser } = require('../middleware/auth.middleware');
const { ROLES, ALL_ROLES } = require('../constants/roles');

// Mount dedicated test endpoint for every single role in ALL_ROLES
for (const role of ALL_ROLES) {
  const pathSegment = role.toLowerCase().replace(/_/g, '-');
  router.get(
    `/${pathSegment}`,
    authenticate,
    role === ROLES.SUPERUSER ? requireSuperuser : authorize(role),
    (req, res) => {
      res.status(200).json({
        success: true,
        role: req.user.role,
        message: `Authorized access granted for role ${role}`
      });
    }
  );
}

module.exports = router;
