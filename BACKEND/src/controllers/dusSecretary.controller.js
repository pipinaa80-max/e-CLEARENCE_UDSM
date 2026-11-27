const DusSecretaryService = require('../services/dusSecretary.service');

function buildReqContext(req) {
  return {
    ipAddress: req.ip || req.connection?.remoteAddress || null,
    userAgent: req.headers['user-agent'] || null
  };
}

class DusSecretaryController {
  // =========================================================================
  // MAIN CAMPUS DUS SECRETARY ENDPOINTS
  // =========================================================================

  static async getStudents(req, res, next) {
    try {
      const paginated = String(req.query.paginated || '').toLowerCase() === 'true' || req.query.page !== undefined;
      if (paginated) {
        const result = await DusSecretaryService.getStudents({
          paginated: true,
          query: req.query.query,
          page: req.query.page,
          pageSize: req.query.pageSize,
          section: req.query.section,
          filterTab: req.query.filterTab
        });
        return res.status(200).json(result);
      }
      const students = await DusSecretaryService.getStudents(req.query.query);
      return res.status(200).json(students);
    } catch (err) {
      return next(err);
    }
  }

  static async getStudentTranscriptDocuments(req, res, next) {
    try {
      const docs = await DusSecretaryService.getStudentTranscriptDocuments(req.params.studentId);
      return res.status(200).json(docs);
    } catch (err) {
      return next(err);
    }
  }

  static async verifyCertificate(req, res, next) {
    try {
      const result = await DusSecretaryService.verifyCertificate(
        req.body,
        req.user,
        buildReqContext(req)
      );
      return res.status(200).json(result);
    } catch (err) {
      return next(err);
    }
  }

  static async updateDispatchState(req, res, next) {
    try {
      const result = await DusSecretaryService.updateDispatchState(
        req.body,
        req.user,
        buildReqContext(req)
      );
      return res.status(200).json(result);
    } catch (err) {
      return next(err);
    }
  }

  static async notifyCertificateRelease(req, res, next) {
    try {
      const result = await DusSecretaryService.notifyCertificateRelease(
        req.body,
        req.user,
        buildReqContext(req)
      );
      return res.status(200).json(result);
    } catch (err) {
      return next(err);
    }
  }

  // =========================================================================
  // REGIONAL STATION INTAKE & HANDOVER ENDPOINTS
  // =========================================================================

  static async getStationConsignments(req, res, next) {
    try {
      const result = await DusSecretaryService.getStationConsignments(
        {
          stationCode: req.query.stationCode,
          query: req.query.query,
          status: req.query.status
        },
        req.user
      );
      return res.status(200).json(result);
    } catch (err) {
      return next(err);
    }
  }

  static async receiveStationIntake(req, res, next) {
    try {
      const result = await DusSecretaryService.receiveStationIntake(
        req.body,
        req.user,
        buildReqContext(req)
      );
      return res.status(200).json(result);
    } catch (err) {
      return next(err);
    }
  }

  static async bulkStationIntake(req, res, next) {
    try {
      const result = await DusSecretaryService.bulkStationIntake(
        req.body,
        req.user,
        buildReqContext(req)
      );
      return res.status(200).json(result);
    } catch (err) {
      return next(err);
    }
  }

  static async approveStationHandover(req, res, next) {
    try {
      const result = await DusSecretaryService.approveStationHandover(
        req.body,
        req.user,
        buildReqContext(req)
      );
      return res.status(200).json(result);
    } catch (err) {
      return next(err);
    }
  }

  static async reportStationDiscrepancy(req, res, next) {
    try {
      const result = await DusSecretaryService.reportStationDiscrepancy(
        req.body,
        req.user,
        buildReqContext(req)
      );
      return res.status(200).json(result);
    } catch (err) {
      return next(err);
    }
  }

  // =========================================================================
  // STATION SECRETARY STAFF MANAGEMENT ENDPOINTS
  // =========================================================================

  static async getStationSecretaries(req, res, next) {
    try {
      const secretaries = await DusSecretaryService.getStationSecretaries();
      return res.status(200).json(secretaries);
    } catch (err) {
      return next(err);
    }
  }

  static async createStationSecretary(req, res, next) {
    try {
      const result = await DusSecretaryService.createStationSecretary(
        req.body,
        req.user,
        buildReqContext(req)
      );
      return res.status(201).json(result);
    } catch (err) {
      return next(err);
    }
  }

  static async updateStationSecretary(req, res, next) {
    try {
      const result = await DusSecretaryService.updateStationSecretary(
        req.params.id,
        req.body,
        req.user,
        buildReqContext(req)
      );
      return res.status(200).json(result);
    } catch (err) {
      return next(err);
    }
  }

  static async deleteStationSecretary(req, res, next) {
    try {
      const result = await DusSecretaryService.deleteStationSecretary(
        req.params.id,
        req.user,
        buildReqContext(req)
      );
      return res.status(200).json(result);
    } catch (err) {
      return next(err);
    }
  }
}

module.exports = DusSecretaryController;
