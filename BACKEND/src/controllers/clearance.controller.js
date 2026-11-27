const ClearanceService = require('../services/clearance.service');

class ClearanceController {
  static async submitRequest(req, res, next) {
    try {
      const result = await ClearanceService.submitClearanceRequest(req.user, req.body, {
        ip: req.ip,
        userAgent: req.headers['user-agent']
      });
      return res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  }

  static async getMyRequest(req, res, next) {
    try {
      const response = await ClearanceService.getMyClearanceRequest(req.user);
      return res.status(200).json(response);
    } catch (err) {
      next(err);
    }
  }

  static async getClearanceStatus(req, res, next) {
    try {
      const response = await ClearanceService.getClearanceStatus(req.params.studentId, req.user);
      return res.status(200).json(response);
    } catch (err) {
      next(err);
    }
  }

  static async getClearanceStatusByRegistration(req, res, next) {
    try {
      const response = await ClearanceService.getClearanceStatus(req.params.registrationNumber, req.user);
      return res.status(200).json(response);
    } catch (err) {
      next(err);
    }
  }

  static async getAnalyticsSummary(req, res, next) {
    try {
      const response = await ClearanceService.getAnalyticsSummary(req.user);
      return res.status(200).json(response);
    } catch (err) {
      next(err);
    }
  }

  static async getOfficeRequests(req, res, next) {
    try {
      const office = req.query.office;
      const status = req.query.status;
      const responses = await ClearanceService.getOfficeRequests(req.user, office, status);
      return res.status(200).json(responses);
    } catch (err) {
      next(err);
    }
  }

  static async approveOffice(req, res, next) {
    try {
      const response = await ClearanceService.approveOfficeClearance(req.user, req.body, {
        ip: req.ip,
        userAgent: req.headers['user-agent']
      });
      return res.status(200).json(response);
    } catch (err) {
      next(err);
    }
  }

  static async bulkApproveOffice(req, res, next) {
    try {
      const response = await ClearanceService.bulkApproveOfficeClearance(req.user, req.body, {
        ip: req.ip,
        userAgent: req.headers['user-agent']
      });
      return res.status(200).json(response);
    } catch (err) {
      next(err);
    }
  }

  static async rejectOffice(req, res, next) {
    try {
      const response = await ClearanceService.rejectOfficeClearance(req.user, req.body, {
        ip: req.ip,
        userAgent: req.headers['user-agent']
      });
      return res.status(200).json(response);
    } catch (err) {
      next(err);
    }
  }

  static async withdrawOffice(req, res, next) {
    try {
      const response = await ClearanceService.withdrawOfficeClearance(req.user, req.body, {
        ip: req.ip,
        userAgent: req.headers['user-agent']
      });
      return res.status(200).json(response);
    } catch (err) {
      next(err);
    }
  }

  static async submitFinanceReceipt(req, res, next) {
    try {
      const response = await ClearanceService.submitFinanceReceipt(req.user, req.body, {
        ip: req.ip,
        userAgent: req.headers['user-agent']
      });
      return res.status(200).json(response);
    } catch (err) {
      next(err);
    }
  }
}

module.exports = ClearanceController;
