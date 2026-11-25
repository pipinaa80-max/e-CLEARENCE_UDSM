const ConvocationService = require('../services/convocation.service');

class ConvocationController {
  static async submitReceipt(req, res, next) {
    try {
      const result = await ConvocationService.submitReceipt(req.user, req.body, req.file, {
        ip: req.ip,
        userAgent: req.headers['user-agent']
      });
      return res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  }

  static async getPendingReceipts(req, res, next) {
    try {
      const response = await ConvocationService.getPendingReceipts();
      return res.status(200).json(response);
    } catch (err) {
      next(err);
    }
  }

  static async approveReceipt(req, res, next) {
    try {
      const response = await ConvocationService.approveReceipt(req.params.receiptId, req.user, {
        ip: req.ip,
        userAgent: req.headers['user-agent']
      });
      return res.status(200).json(response);
    } catch (err) {
      next(err);
    }
  }

  static async rejectReceipt(req, res, next) {
    try {
      const reason = req.query.reason || req.body.reason || req.body.comments;
      const response = await ConvocationService.rejectReceipt(req.params.receiptId, reason, req.user, {
        ip: req.ip,
        userAgent: req.headers['user-agent']
      });
      return res.status(200).json(response);
    } catch (err) {
      next(err);
    }
  }

  static async getReceiptStatus(req, res, next) {
    try {
      const response = await ConvocationService.getReceiptStatus(req.params.studentId);
      return res.status(200).json(response);
    } catch (err) {
      next(err);
    }
  }
}

module.exports = ConvocationController;
