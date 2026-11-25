const express = require('express');
const TranscriptPaymentController = require('../controllers/transcriptPayment.controller');
const { authenticate, authorize } = require('../middleware/auth.middleware');

const router = express.Router();

router.post(
  '/',
  authenticate,
  authorize('STUDENT'),
  TranscriptPaymentController.submit
);

router.get(
  '/mine',
  authenticate,
  authorize('STUDENT'),
  TranscriptPaymentController.mine
);

router.get(
  '/finance',
  authenticate,
  authorize('FINANCE_OFFICER', 'ADMINISTRATOR', 'ADMIN', 'SUPERUSER'),
  TranscriptPaymentController.finance
);

router.post(
  '/:id/approve',
  authenticate,
  authorize('FINANCE_OFFICER', 'ADMINISTRATOR', 'ADMIN', 'SUPERUSER'),
  TranscriptPaymentController.approve
);

router.post(
  '/:id/reject',
  authenticate,
  authorize('FINANCE_OFFICER', 'ADMINISTRATOR', 'ADMIN', 'SUPERUSER'),
  TranscriptPaymentController.reject
);

router.put(
  '/:id/collection',
  authenticate,
  authorize('STUDENT'),
  TranscriptPaymentController.updateCollection
);

module.exports = router;
