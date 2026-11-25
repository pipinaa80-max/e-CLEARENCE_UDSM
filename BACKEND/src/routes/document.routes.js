const express = require('express');
const DocumentController = require('../controllers/document.controller');
const { authenticate, authorize } = require('../middleware/auth.middleware');
const { handleUpload } = require('../middleware/upload.middleware');
const { ALL_ROLES } = require('../constants/roles');

const router = express.Router();

const STAFF_ROLES = ALL_ROLES.filter(r => r !== 'STUDENT');

// Upload document (Students and Admins)
router.post(
  '/upload',
  authenticate,
  authorize('STUDENT', 'SUPERUSER', 'ADMINISTRATOR', 'ADMIN'),
  handleUpload,
  DocumentController.uploadDocument
);

// Get student documents (paginated)
router.get(
  '/student/:studentId',
  authenticate,
  authorize(...ALL_ROLES),
  DocumentController.getStudentDocuments
);

// Categories
router.get(
  '/student/:studentId/categories',
  authenticate,
  authorize(...ALL_ROLES),
  DocumentController.getCategories
);

// Missing required clearance documents (mounted before /:id)
router.get(
  '/student/:studentId/missing',
  authenticate,
  authorize(...ALL_ROLES),
  DocumentController.getMissingDocuments
);

// Has required documents
router.get(
  '/student/:studentId/has-required',
  authenticate,
  authorize(...ALL_ROLES),
  DocumentController.hasRequiredDocuments
);

// Document verification status summary (mounted before /:id)
router.get(
  '/student/:studentId/verification-status',
  authenticate,
  authorize(...ALL_ROLES),
  DocumentController.getVerificationStatus
);

// Transcript payment document status endpoints (mounted before /:id)
router.get(
  '/transcript/:paymentId/has-required',
  authenticate,
  authorize('STUDENT'),
  DocumentController.hasRequiredTranscriptDocuments
);

router.get(
  '/transcript/:paymentId/categories',
  authenticate,
  authorize('STUDENT'),
  DocumentController.getTranscriptDocumentCategories
);

// Download document
router.get(
  '/:id/download',
  authenticate,
  authorize(...ALL_ROLES),
  DocumentController.downloadDocument
);

// Get document metadata
router.get(
  '/:id',
  authenticate,
  authorize(...ALL_ROLES),
  DocumentController.getDocumentById
);

// Verify or reject document (Staff only)
router.put(
  '/verify/:id',
  authenticate,
  authorize(...STAFF_ROLES),
  DocumentController.verifyDocument
);

// Delete document (Student owner or Admin)
router.delete(
  '/:id',
  authenticate,
  authorize('STUDENT', 'SUPERUSER', 'ADMINISTRATOR', 'ADMIN'),
  DocumentController.deleteDocument
);

module.exports = router;
