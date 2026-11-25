const express = require('express');
const StudentDebtController = require('../controllers/studentDebt.controller');
const { authenticate, authorize } = require('../middleware/auth.middleware');
const { handleSpreadsheetUpload } = require('../middleware/spreadsheetUpload.middleware');
const { ALL_ROLES } = require('../constants/roles');

const router = express.Router();

// Lecturer-specific routes
router.get(
  '/',
  authenticate,
  authorize('LECTURER', 'SUPERUSER', 'ADMINISTRATOR', 'ADMIN'),
  StudentDebtController.listForLecturer
);

router.get(
  '/student-clearance',
  authenticate,
  authorize('LECTURER', 'SUPERUSER', 'ADMINISTRATOR', 'ADMIN'),
  StudentDebtController.lookupClearance
);

router.get(
  '/template/csv',
  authenticate,
  authorize('LECTURER', 'SUPERUSER', 'ADMINISTRATOR', 'ADMIN'),
  StudentDebtController.downloadCsvTemplate
);

router.post(
  '/bulk-upload',
  authenticate,
  authorize('LECTURER', 'SUPERUSER', 'ADMINISTRATOR', 'ADMIN'),
  handleSpreadsheetUpload,
  StudentDebtController.bulkUpload
);

router.post(
  '/',
  authenticate,
  authorize('LECTURER', 'SUPERUSER', 'ADMINISTRATOR', 'ADMIN'),
  StudentDebtController.create
);

router.patch(
  '/:flagId/resolve',
  authenticate,
  authorize('LECTURER', 'SUPERUSER', 'ADMINISTRATOR', 'ADMIN'),
  StudentDebtController.resolve
);

// Department staff overview of open debt flags
router.get(
  '/department/open',
  authenticate,
  authorize(...ALL_ROLES.filter(r => r !== 'STUDENT')),
  StudentDebtController.listOpenForDepartment
);

// Student view of their own open debts
router.get(
  '/my-flags',
  authenticate,
  authorize('STUDENT', 'SUPERUSER', 'ADMINISTRATOR', 'ADMIN'),
  StudentDebtController.listForStudent
);

module.exports = router;
