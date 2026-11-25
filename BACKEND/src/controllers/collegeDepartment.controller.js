const CollegeDepartmentService = require('../services/collegeDepartment.service');

class CollegeDepartmentController {
  static async getAllColleges(req, res, next) {
    try {
      const colleges = await CollegeDepartmentService.getAllColleges();
      return res.status(200).json(colleges);
    } catch (err) {
      next(err);
    }
  }

  static async getCollegeById(req, res, next) {
    try {
      const college = await CollegeDepartmentService.getCollegeById(req.params.id);
      if (!college) {
        return res.status(404).json({
          success: false,
          status: 404,
          error: 'NotFound',
          message: 'College not found.'
        });
      }
      return res.status(200).json(college);
    } catch (err) {
      next(err);
    }
  }

  static async createCollege(req, res, next) {
    try {
      const created = await CollegeDepartmentService.createCollege(req.body);
      return res.status(200).json(created);
    } catch (err) {
      next(err);
    }
  }

  static async updateCollege(req, res, next) {
    try {
      const updated = await CollegeDepartmentService.updateCollege(req.params.id, req.body);
      if (!updated) {
        return res.status(404).json({
          success: false,
          status: 404,
          error: 'NotFound',
          message: 'College not found.'
        });
      }
      return res.status(200).json(updated);
    } catch (err) {
      next(err);
    }
  }

  static async deleteCollege(req, res, next) {
    try {
      const deleted = await CollegeDepartmentService.deleteCollege(req.params.id);
      if (!deleted) {
        return res.status(404).json({
          success: false,
          status: 404,
          error: 'NotFound',
          message: 'College not found.'
        });
      }
      return res.status(204).send();
    } catch (err) {
      next(err);
    }
  }

  static async getAllDepartments(req, res, next) {
    try {
      const departments = await CollegeDepartmentService.getAllDepartments();
      return res.status(200).json(departments);
    } catch (err) {
      next(err);
    }
  }

  static async getDepartmentsByCollege(req, res, next) {
    try {
      const departments = await CollegeDepartmentService.getDepartmentsByCollege(req.params.collegeId);
      return res.status(200).json(departments);
    } catch (err) {
      next(err);
    }
  }

  static async createDepartment(req, res, next) {
    try {
      const created = await CollegeDepartmentService.createDepartment(req.params.collegeId, req.body);
      if (!created) {
        return res.status(404).json({
          success: false,
          status: 404,
          error: 'NotFound',
          message: 'College not found.'
        });
      }
      return res.status(200).json(created);
    } catch (err) {
      next(err);
    }
  }

  static async updateDepartment(req, res, next) {
    try {
      const updated = await CollegeDepartmentService.updateDepartment(req.params.deptId, req.body);
      if (!updated) {
        return res.status(404).json({
          success: false,
          status: 404,
          error: 'NotFound',
          message: 'Department not found.'
        });
      }
      return res.status(200).json(updated);
    } catch (err) {
      next(err);
    }
  }
}

module.exports = CollegeDepartmentController;
