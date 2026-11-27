const express = require('express');
const ClearanceController = require('../controllers/clearance.controller');
const CertificateController = require('../controllers/certificate.controller');
const { authenticate, authorize } = require('../middleware/auth.middleware');
const { ALL_ROLES } = require('../constants/roles');

const router = express.Router();

// Office roles permitted to review and act on clearance requests
const OFFICE_ROLES = [
  'CONVOCATION_OFFICER',
  'LIBRARY_OFFICER',
  'FINANCE_OFFICER',
  'GAMES_COACH',
  'HALL_WARDEN',
  'USAB_OFFICER',
  'DARUSO_OFFICER',
  'DEAN_OF_STUDENTS',
  'SMART_CARD_OFFICER',
  'WORKSHOP_OFFICER',
  'PRINCIPAL',
  'LABORATORY_OFFICER',
  'DEPARTMENT_OFFICER',
  'ADMINISTRATOR',
  'ADMIN',
  'SUPERUSER',
  'DIRECTOR_OF_UNDERGRADUATE_STUDIES',
  'DIRECTOR_OF_POSTGRADUATE_STUDIES',
  'SUPERVISOR'
];

// Student clearance request creation and tracking
router.post(
  '/request',
  authenticate,
  authorize('STUDENT', 'SUPERUSER', 'ADMINISTRATOR', 'ADMIN'),
  ClearanceController.submitRequest
);

router.get(
  '/my-request',
  authenticate,
  authorize('STUDENT', 'SUPERUSER', 'ADMINISTRATOR', 'ADMIN'),
  ClearanceController.getMyRequest
);

router.post(
  '/submit-finance-receipt',
  authenticate,
  authorize('STUDENT', 'SUPERUSER', 'ADMINISTRATOR', 'ADMIN'),
  ClearanceController.submitFinanceReceipt
);

// Status queries
router.get(
  '/status/:studentId',
  authenticate,
  authorize(...ALL_ROLES),
  ClearanceController.getClearanceStatus
);

router.get(
  '/status/registration/:registrationNumber',
  authenticate,
  authorize(...ALL_ROLES),
  ClearanceController.getClearanceStatusByRegistration
);

// High-level analytics
router.get(
  '/analytics-summary',
  authenticate,
  authorize('DIRECTOR_OF_UNDERGRADUATE_STUDIES', 'DIRECTOR_OF_POSTGRADUATE_STUDIES', 'SUPERUSER', 'ADMINISTRATOR', 'ADMIN', 'PRINCIPAL', 'DEAN_OF_STUDENTS', 'DEPARTMENT_OFFICER', 'SUPERVISOR'),
  ClearanceController.getAnalyticsSummary
);

// Public certificate verification (no authentication required)
router.get(
  '/certificate/verify/:code',
  CertificateController.verifyCertificate
);

// Student/Staff certificate download (stream PDF)
router.get(
  '/certificate/:requestId',
  authenticate,
  authorize(...ALL_ROLES),
  CertificateController.downloadCertificate
);

// Student convenience endpoint
router.get(
  '/my-certificate',
  authenticate,
  authorize('STUDENT', 'SUPERUSER', 'ADMINISTRATOR', 'ADMIN'),
  CertificateController.downloadMyCertificate
);

// Office operations
router.get(
  '/office/requests',
  authenticate,
  authorize(...OFFICE_ROLES),
  ClearanceController.getOfficeRequests
);

router.post(
  '/office/approve',
  authenticate,
  authorize(...OFFICE_ROLES),
  ClearanceController.approveOffice
);

router.post(
  '/office/bulk-approve',
  authenticate,
  authorize(...OFFICE_ROLES),
  ClearanceController.bulkApproveOffice
);

router.post(
  '/office/reject',
  authenticate,
  authorize(...OFFICE_ROLES),
  ClearanceController.rejectOffice
);

router.post(
  '/office/withdraw',
  authenticate,
  authorize(...OFFICE_ROLES),
  ClearanceController.withdrawOffice
);

module.exports = router;
