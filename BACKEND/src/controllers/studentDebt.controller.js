const StudentDebtService = require('../services/studentDebt.service');

class StudentDebtController {
  static async listForLecturer(req, res, next) {
    try {
      const result = await StudentDebtService.listForLecturer(req.user.id);
      return res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  }

  static async lookupClearance(req, res, next) {
    try {
      const regNo = req.query.registrationNumber;
      const result = await StudentDebtService.lookupClearance(req.user, regNo);
      return res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  }

  static async create(req, res, next) {
    try {
      const result = await StudentDebtService.create(req.user, req.body, {
        ip: req.ip,
        userAgent: req.headers['user-agent']
      });
      return res.status(201).json(result);
    } catch (err) {
      next(err);
    }
  }

  static async bulkUpload(req, res, next) {
    try {
      const count = await StudentDebtService.bulkUpload(req.user, req.file, {
        ip: req.ip,
        userAgent: req.headers['user-agent']
      });
      return res.status(200).json({
        success: true,
        count,
        message: `Successfully flagged ${count} students in bulk.`
      });
    } catch (err) {
      next(err);
    }
  }

  static async downloadCsvTemplate(req, res, next) {
    try {
      const buffer = StudentDebtService.generateCsvTemplate();
      res.setHeader('Content-Disposition', 'attachment; filename=student_debt_flag_template.csv');
      res.setHeader('Content-Type', 'text/csv; charset=UTF-8');
      return res.status(200).send(buffer);
    } catch (err) {
      next(err);
    }
  }

  static async resolve(req, res, next) {
    try {
      const result = await StudentDebtService.resolve(req.user, req.params.flagId, req.body, {
        ip: req.ip,
        userAgent: req.headers['user-agent']
      });
      return res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  }

  static async listOpenForDepartment(req, res, next) {
    try {
      const result = await StudentDebtService.listOpenForDepartment(req.user);
      return res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  }

  static async listForStudent(req, res, next) {
    try {
      const result = await StudentDebtService.listForStudent(req.user);
      return res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  }
}

module.exports = StudentDebtController;
