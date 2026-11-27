const express = require('express');
const AnalyticsController = require('../controllers/analytics.controller');
const { authenticate, authorize } = require('../middleware/auth.middleware');

const router = express.Router();

const ANALYTICS_ROLES = [
  'SUPERUSER',
  'ADMINISTRATOR',
  'ADMIN',
  'DIRECTOR_OF_UNDERGRADUATE_STUDIES',
  'DIRECTOR_OF_POSTGRADUATE_STUDIES',
  'PRINCIPAL',
  'DEAN_OF_STUDENTS',
  'DEPARTMENT_OFFICER',
  'SUPERVISOR'
];

router.get(
  '/summary',
  authenticate,
  authorize(...ANALYTICS_ROLES),
  AnalyticsController.getSummary
);

router.get(
  '/overview',
  authenticate,
  authorize(...ANALYTICS_ROLES),
  AnalyticsController.getOverview
);

router.get(
  '/offices',
  authenticate,
  authorize(...ANALYTICS_ROLES),
  AnalyticsController.getOffices
);

router.get(
  '/departments',
  authenticate,
  authorize(...ANALYTICS_ROLES),
  AnalyticsController.getDepartments
);

module.exports = router;
