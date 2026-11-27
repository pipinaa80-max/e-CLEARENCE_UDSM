const AdminService = require('../services/admin.service');

class AdminController {
  static async getAllUsers(req, res, next) {
    try {
      const result = await AdminService.getAllUsers({
        page: req.query.page,
        limit: req.query.limit,
        search: req.query.search,
        role: req.query.role
      });
      return res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  }

  static async getAllRoles(req, res, next) {
    try {
      const roles = AdminService.getAllRoles();
      return res.status(200).json(roles);
    } catch (err) {
      next(err);
    }
  }

  static async createUser(req, res, next) {
    try {
      const user = await AdminService.createUser(req.body, req.user, {
        ip: req.ip,
        userAgent: req.headers['user-agent']
      });
      return res.status(200).json({
        success: true,
        message: 'User registered and activated successfully',
        user
      });
    } catch (err) {
      next(err);
    }
  }

  static async deleteUser(req, res, next) {
    try {
      const result = await AdminService.deleteUser(req.params.userId, req.user, {
        ip: req.ip,
        userAgent: req.headers['user-agent']
      });
      return res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  }

  static async deleteUsers(req, res, next) {
    try {
      const userIds = Array.isArray(req.body) ? req.body : req.body?.userIds;
      const result = await AdminService.deleteUsers(userIds, req.user, {
        ip: req.ip,
        userAgent: req.headers['user-agent']
      });
      return res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  }

  static async updateUserRole(req, res, next) {
    try {
      const role = req.query.role || req.body?.role;
      const updated = await AdminService.updateUserRole(req.params.userId, role, req.user, {
        ip: req.ip,
        userAgent: req.headers['user-agent']
      });
      return res.status(200).json(updated);
    } catch (err) {
      next(err);
    }
  }

  static async getAllClearanceRequests(req, res, next) {
    try {
      const requests = await AdminService.getAllClearanceRequests();
      return res.status(200).json(requests);
    } catch (err) {
      next(err);
    }
  }

  static async importLocalStorage(req, res, next) {
    try {
      const result = await AdminService.importLocalStorage(req.body, req.user, {
        ip: req.ip,
        userAgent: req.headers['user-agent']
      });
      return res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  }

  static async getImportedLocalStorage(req, res, next) {
    try {
      const records = await AdminService.getImportedLocalStorage(req.user);
      return res.status(200).json(records);
    } catch (err) {
      next(err);
    }
  }

  static async cleanOrphanStudents(req, res, next) {
    try {
      const count = await AdminService.cleanOrphanStudents(req.user, {
        ip: req.ip,
        userAgent: req.headers['user-agent']
      });
      return res.status(200).json({
        success: true,
        cleanedCount: count,
        message: `Cleaned up ${count} orphan student records successfully.`
      });
    } catch (err) {
      next(err);
    }
  }

  static async purgeStudents(req, res, next) {
    try {
      const registrationNumbers = Array.isArray(req.body)
        ? req.body
        : (Array.isArray(req.body?.registrationNumbers) ? req.body.registrationNumbers : null);
      const count = await AdminService.purgeStudents(registrationNumbers, req.user, {
        ip: req.ip,
        userAgent: req.headers['user-agent']
      });
      return res.status(200).json({
        success: true,
        purgedCount: count,
        message: `Successfully purged ${count} student records and related clearance data.`
      });
    } catch (err) {
      next(err);
    }
  }

  static async bulkUploadUsers(req, res, next) {
    try {
      const uploadType = req.body?.uploadType || req.query?.uploadType || 'STUDENT';
      const count = await AdminService.processBulkUpload(
        req.file,
        req.user,
        {
          ip: req.ip,
          userAgent: req.headers['user-agent']
        },
        uploadType
      );
      const label = String(uploadType).toUpperCase() === 'STAFF' ? 'staff members' : 'students';
      return res.status(200).json({
        success: true,
        message: `Successfully uploaded and processed ${count} ${label}.`,
        processedCount: count
      });
    } catch (err) {
      next(err);
    }
  }

  static async downloadExcelTemplate(req, res, next) {
    try {
      const type = req.query.type || 'STUDENT';
      const isStaff = String(type).toUpperCase() === 'STAFF';
      const buffer = await AdminService.generateTemplateExcel(type);
      const filename = isStaff ? 'staff_registration_template.xlsx' : 'clearance_registration_template.xlsx';
      res.setHeader('Content-Disposition', `attachment; filename=${filename}`);
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      return res.status(200).send(buffer);
    } catch (err) {
      next(err);
    }
  }

  static async downloadCsvTemplate(req, res, next) {
    try {
      const type = req.query.type || 'STUDENT';
      const isStaff = String(type).toUpperCase() === 'STAFF';
      const buffer = AdminService.generateTemplateCsv(type);
      const filename = isStaff ? 'staff_registration_template.csv' : 'clearance_registration_template.csv';
      res.setHeader('Content-Disposition', `attachment; filename=${filename}`);
      res.setHeader('Content-Type', 'text/csv; charset=UTF-8');
      return res.status(200).send(buffer);
    } catch (err) {
      next(err);
    }
  }

  static async seedSampleData(req, res, next) {
    try {
      const count = await AdminService.seedUdsmSampleData(req.user, {
        ip: req.ip,
        userAgent: req.headers['user-agent']
      });
      return res.status(200).json({
        success: true,
        message: `Successfully seeded ${count} users matching UDSM table format.`,
        processedCount: count
      });
    } catch (err) {
      next(err);
    }
  }

  static async exportUsersToExcel(req, res, next) {
    try {
      const buffer = await AdminService.exportUsersToExcel();
      res.setHeader('Content-Disposition', 'attachment; filename=udsm_clearance_users.xlsx');
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      return res.status(200).send(buffer);
    } catch (err) {
      next(err);
    }
  }

  static async exportUsersToCsv(req, res, next) {
    try {
      const buffer = await AdminService.exportUsersToCsv();
      res.setHeader('Content-Disposition', 'attachment; filename=udsm_clearance_users.csv');
      res.setHeader('Content-Type', 'text/csv; charset=UTF-8');
      return res.status(200).send(buffer);
    } catch (err) {
      next(err);
    }
  }

  static async generateSampleFiles(req, res, next) {
    try {
      const count = await AdminService.regenerateSampleFiles();
      return res.status(200).json({
        success: true,
        message: 'Successfully exported live database records to spreadsheets.',
        exportedCount: count
      });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = AdminController;
