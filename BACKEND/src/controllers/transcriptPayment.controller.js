const TranscriptPaymentService = require('../services/transcriptPayment.service');

class TranscriptPaymentController {
  static async submit(req, res, next) {
    try {
      const result = await TranscriptPaymentService.submit(req.user, req.body, {
        ip: req.ip,
        userAgent: req.headers['user-agent']
      });
      return res.status(200).json(result);
    } catch (err) {
      return next(err);
    }
  }

  static async mine(req, res, next) {
    try {
      const list = await TranscriptPaymentService.getMine(req.user);
      return res.status(200).json(list);
    } catch (err) {
      return next(err);
    }
  }

  static async finance(req, res, next) {
    try {
      const list = await TranscriptPaymentService.getFinanceRequests(req.user, req.query.status);
      return res.status(200).json(list);
    } catch (err) {
      return next(err);
    }
  }

  static async approve(req, res, next) {
    try {
      const result = await TranscriptPaymentService.approve(req.user, req.params.id, {
        ip: req.ip,
        userAgent: req.headers['user-agent']
      });
      return res.status(200).json(result);
    } catch (err) {
      return next(err);
    }
  }

  static async reject(req, res, next) {
    try {
      const reason = req.body?.reason || req.query?.reason;
      const result = await TranscriptPaymentService.reject(req.user, req.params.id, reason, {
        ip: req.ip,
        userAgent: req.headers['user-agent']
      });
      return res.status(200).json(result);
    } catch (err) {
      return next(err);
    }
  }

  static async updateCollection(req, res, next) {
    try {
      const result = await TranscriptPaymentService.updateCollection(req.user, req.params.id, req.body, {
        ip: req.ip,
        userAgent: req.headers['user-agent']
      });
      return res.status(200).json(result);
    } catch (err) {
      return next(err);
    }
  }
}

module.exports = TranscriptPaymentController;
