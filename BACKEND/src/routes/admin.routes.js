const express = require('express');
const AdminController = require('../controllers/admin.controller');
const { authenticate, authorize } = require('../middleware/auth.middleware');
const { handleSpreadsheetUpload } = require('../middleware/spreadsheetUpload.middleware');
const env = require('../config/env');

const router = express.Router();

// Block demo/sample data helpers in production to prevent accidental pollution or disk exports
function blockInProduction(req, res, next) {
  if (env.NODE_ENV === 'production') {
    return res.status(403).json({
      success: false,
      status: 403,
      error: 'Forbidden',
      message: 'This sample-data utility endpoint is disabled in production.'
    });
  }
  return next();
}

// All /api/v1/admin/* routes require Admin / Administrator / Superuser authentication
router.use(authenticate, authorize('ADMIN', 'ADMINISTRATOR', 'SUPERUSER'));

router.get('/users', AdminController.getAllUsers);
router.get('/roles', AdminController.getAllRoles);
router.post('/users', AdminController.createUser);
router.post('/users/bulk-upload', handleSpreadsheetUpload, AdminController.bulkUploadUsers);
router.post('/users/seed-sample-data', blockInProduction, AdminController.seedSampleData);
router.delete('/users/:userId', AdminController.deleteUser);
router.delete('/users', AdminController.deleteUsers);
router.delete('/maintenance/students/clean-orphans', AdminController.cleanOrphanStudents);
router.delete('/maintenance/students/purge', AdminController.purgeStudents);
router.put('/users/:userId/role', AdminController.updateUserRole);
router.get('/clearance-requests', AdminController.getAllClearanceRequests);
router.get('/export/excel', AdminController.exportUsersToExcel);
router.get('/export/csv', AdminController.exportUsersToCsv);
router.get('/export/template/excel', AdminController.downloadExcelTemplate);
router.get('/export/template/csv', AdminController.downloadCsvTemplate);
router.post('/generate-sample-files', blockInProduction, AdminController.generateSampleFiles);
router.post('/import/local-storage', AdminController.importLocalStorage);
router.get('/import/local-storage', AdminController.getImportedLocalStorage);

module.exports = router;
