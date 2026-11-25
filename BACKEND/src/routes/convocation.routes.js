const express = require('express');
const ConvocationController = require('../controllers/convocation.controller');
const { authenticate, authorize } = require('../middleware/auth.middleware');
const { handleConvocationUpload } = require('../middleware/upload.middleware');

const router = express.Router();

router.post(
  '/submit-receipt',
  authenticate,
  authorize('STUDENT', 'SUPERUSER', 'ADMINISTRATOR', 'ADMIN'),
  handleConvocationUpload,
  ConvocationController.submitReceipt
);

router.get(
  '/pending',
  authenticate,
  authorize('FINANCE_OFFICER', 'CONVOCATION_OFFICER', 'ADMINISTRATOR', 'SUPERUSER', 'ADMIN'),
  ConvocationController.getPendingReceipts
);

router.post(
  '/approve/:receiptId',
  authenticate,
  authorize('FINANCE_OFFICER', 'CONVOCATION_OFFICER', 'ADMINISTRATOR', 'SUPERUSER', 'ADMIN'),
  ConvocationController.approveReceipt
);

router.post(
  '/reject/:receiptId',
  authenticate,
  authorize('FINANCE_OFFICER', 'CONVOCATION_OFFICER', 'ADMINISTRATOR', 'SUPERUSER', 'ADMIN'),
  ConvocationController.rejectReceipt
);

router.get(
  '/status/:studentId',
  authenticate,
  authorize('STUDENT', 'FINANCE_OFFICER', 'CONVOCATION_OFFICER', 'ADMINISTRATOR', 'SUPERUSER', 'ADMIN'),
  ConvocationController.getReceiptStatus
);

module.exports = router;
