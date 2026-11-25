const CertificateService = require('../services/certificate.service');
const { db } = require('../config/database');

class CertificateController {
  /**
   * Stream PDF certificate by clearance request ID
   */
  static async downloadCertificate(req, res, next) {
    try {
      const { requestId } = req.params;

      const request = await db('clearance_requests').where({ id: requestId }).first();
      if (!request) {
        return res.status(404).json({
          success: false,
          status: 404,
          error: 'NotFound',
          message: `Clearance request '${requestId}' not found.`
        });
      }

      const student = await db('students').where({ id: request.student_id }).first();

      // Authorization: Students can only download their own certificate
      if (req.user.role === 'STUDENT') {
        if (!student || (req.user.id !== student.user_id && req.user.registrationNumber !== student.registration_number)) {
          return res.status(403).json({
            success: false,
            status: 403,
            error: 'Forbidden',
            message: 'You are only authorized to download your own certificate.'
          });
        }
      }

      await CertificateService.streamCertificatePdf(requestId, req.user, res);
    } catch (err) {
      next(err);
    }
  }

  /**
   * Student convenience endpoint: downloads certificate for the calling student's completed request
   */
  static async downloadMyCertificate(req, res, next) {
    try {
      const student = await db('students')
        .where({ user_id: req.user.id })
        .orWhere({ registration_number: req.user.registrationNumber })
        .first();

      if (!student) {
        return res.status(404).json({
          success: false,
          status: 404,
          error: 'NotFound',
          message: 'Student record not found for your account.'
        });
      }

      const request = await db('clearance_requests')
        .where({ student_id: student.id, status: 'COMPLETED' })
        .orderBy('updated_at', 'desc')
        .first();

      if (!request) {
        return res.status(400).json({
          success: false,
          status: 400,
          error: 'NotEligible',
          message: 'You do not have a completed clearance request. Full clearance is required before certificate generation.'
        });
      }

      await CertificateService.streamCertificatePdf(request.id, req.user, res);
    } catch (err) {
      next(err);
    }
  }

  /**
   * Public certificate verification endpoint (no auth required)
   */
  static async verifyCertificate(req, res, next) {
    try {
      const { code } = req.params;
      const result = await CertificateService.verifyCertificatePublic(code);

      const statusCode = result.status === 'VALID' ? 200 : (result.status === 'NOT_FOUND' ? 404 : 400);
      return res.status(statusCode).json(result);
    } catch (err) {
      next(err);
    }
  }
}

module.exports = CertificateController;
