const AnalyticsService = require('../services/analytics.service');

class AnalyticsController {
  static async getSummary(req, res, next) {
    try {
      const summary = await AnalyticsService.getFullSummary(req.user);
      return res.status(200).json(summary);
    } catch (err) {
      next(err);
    }
  }

  static async getOverview(req, res, next) {
    try {
      const scope = {};
      if (req.user.role === 'PRINCIPAL' && req.user.college) {
        scope.college = req.user.college;
      } else if (req.user.role === 'DEPARTMENT_OFFICER' && req.user.department) {
        scope.department = req.user.department;
      }

      const overview = await AnalyticsService.getOverviewMetrics(scope);
      return res.status(200).json({
        success: true,
        data: overview
      });
    } catch (err) {
      next(err);
    }
  }

  static async getOffices(req, res, next) {
    try {
      const offices = await AnalyticsService.getOfficeMetrics();
      return res.status(200).json({
        success: true,
        data: offices
      });
    } catch (err) {
      next(err);
    }
  }

  static async getDepartments(req, res, next) {
    try {
      const scope = {};
      if (req.user.role === 'PRINCIPAL' && req.user.college) {
        scope.college = req.user.college;
      } else if (req.user.role === 'DEPARTMENT_OFFICER' && req.user.department) {
        scope.department = req.user.department;
      }

      const departments = await AnalyticsService.getCollegeDepartmentMetrics(scope);
      return res.status(200).json({
        success: true,
        data: departments
      });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = AnalyticsController;
