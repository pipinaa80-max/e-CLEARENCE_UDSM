const DocumentService = require('../services/document.service');
const TranscriptPaymentService = require('../services/transcriptPayment.service');

class DocumentController {
  static async uploadDocument(req, res, next) {
    try {
      const studentId = req.body.studentId || req.user.id;
      const description = req.body.description;
      const rawFileType = req.body.fileType && !String(req.body.fileType).includes('/')
        ? String(req.body.fileType).trim()
        : null;
      const category = req.body.category || req.body.documentCategory || rawFileType;

      const document = await DocumentService.uploadDocument({
        studentId,
        file: req.file,
        description,
        documentCategory: category,
        requestingUser: req.user
      });

      return res.status(201).json({
        success: true,
        message: 'Document uploaded successfully.',
        data: document
      });
    } catch (err) {
      next(err);
    }
  }

  static async getStudentDocuments(req, res, next) {
    try {
      const { studentId } = req.params;
      const { page, size } = req.query;

      const result = await DocumentService.getStudentDocuments({
        studentId,
        page,
        size,
        requestingUser: req.user
      });

      // Angular PageableResponse expects the raw pageable object
      return res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  }

  static async getDocumentById(req, res, next) {
    try {
      const { id } = req.params;
      const document = await DocumentService.getDocumentById(id, req.user);

      return res.status(200).json({
        success: true,
        data: document
      });
    } catch (err) {
      next(err);
    }
  }

  static async verifyDocument(req, res, next) {
    try {
      const { id } = req.params;
      const verified = req.query.verified !== undefined ? req.query.verified : req.body.verified;
      const comment = req.query.comment !== undefined ? req.query.comment : req.body.comment;
      const officerId = req.query.officerId || req.body.officerId || req.user.id;

      const updated = await DocumentService.verifyDocument({
        documentId: id,
        officerId,
        verified,
        comment,
        requestingUser: req.user
      });

      return res.status(200).json({
        success: true,
        message: 'Document verification updated successfully.',
        data: updated
      });
    } catch (err) {
      next(err);
    }
  }

  static async deleteDocument(req, res, next) {
    try {
      const { id } = req.params;
      const studentId = req.query.studentId || req.body.studentId || req.user.id;

      const result = await DocumentService.deleteDocument({
        documentId: id,
        studentId,
        requestingUser: req.user
      });

      return res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  }

  static async getCategories(req, res, next) {
    try {
      const { studentId } = req.params;
      const categories = await DocumentService.getCategories(studentId, req.user);
      return res.status(200).json(categories);
    } catch (err) {
      next(err);
    }
  }

  static async getMissingDocuments(req, res, next) {
    try {
      const { studentId } = req.params;
      const missing = await DocumentService.getMissingDocuments(studentId, req.user);
      return res.status(200).json(missing);
    } catch (err) {
      next(err);
    }
  }

  static async hasRequiredDocuments(req, res, next) {
    try {
      const { studentId } = req.params;
      const hasReq = await DocumentService.hasRequiredDocuments(studentId);
      return res.status(200).json(hasReq);
    } catch (err) {
      next(err);
    }
  }

  static async hasRequiredTranscriptDocuments(req, res, next) {
    try {
      const { paymentId } = req.params;
      const approved = await TranscriptPaymentService.hasApprovedPayment(req.user, paymentId);
      if (!approved) {
        return res.status(403).json({
          success: false,
          message: 'An approved transcript payment is required to check transcript document status.'
        });
      }

      const hasReq = await DocumentService.hasRequiredTranscriptDocuments(req.user.id, paymentId);
      return res.status(200).json(hasReq);
    } catch (err) {
      next(err);
    }
  }

  static async getTranscriptDocumentCategories(req, res, next) {
    try {
      const { paymentId } = req.params;
      const approved = await TranscriptPaymentService.hasApprovedPayment(req.user, paymentId);
      if (!approved) {
        return res.status(403).json({
          success: false,
          message: 'An approved transcript payment is required to inspect transcript documents.'
        });
      }

      const categories = await DocumentService.getTranscriptDocumentCategories(req.user.id, paymentId);
      return res.status(200).json(categories);
    } catch (err) {
      next(err);
    }
  }

  static async getVerificationStatus(req, res, next) {
    try {
      const { studentId } = req.params;
      const status = await DocumentService.getDocumentVerificationStatus(studentId, req.user);
      return res.status(200).json({
        success: true,
        message: 'Document verification status retrieved',
        data: status
      });
    } catch (err) {
      next(err);
    }
  }

  static async downloadDocument(req, res, next) {
    try {
      const { id } = req.params;
      const { stream, fileName, fileType, fileSize } = await DocumentService.getDownloadStream(id, req.user);

      res.setHeader('Content-Type', fileType);
      res.setHeader('Content-Length', fileSize);
      res.setHeader('X-Content-Type-Options', 'nosniff');
      res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(fileName)}"`);
      res.setHeader('Cache-Control', 'private, no-cache, no-store, must-revalidate');

      stream.pipe(res);
    } catch (err) {
      next(err);
    }
  }
}

module.exports = DocumentController;
