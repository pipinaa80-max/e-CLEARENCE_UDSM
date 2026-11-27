const express = require('express');
const DusSecretaryController = require('../controllers/dusSecretary.controller');
const { authenticate, authorize } = require('../middleware/auth.middleware');

const router = express.Router();

// Permitted roles matching Spring Boot DusSecretaryController @PreAuthorize
router.use(
  authenticate,
  authorize(
    'DUS_SECRETARY',
    'DIRECTOR_OF_UNDERGRADUATE_STUDIES',
    'DIRECTOR_OF_POSTGRADUATE_STUDIES',
    'ADMINISTRATOR',
    'ADMIN',
    'SUPERUSER',
    'PRINCIPAL'
  )
);

// Main Campus DUS Secretary
router.get('/students', DusSecretaryController.getStudents);
router.get('/students/:studentId/documents', DusSecretaryController.getStudentTranscriptDocuments);
router.post('/verify-certificate', DusSecretaryController.verifyCertificate);
router.post('/update-dispatch', DusSecretaryController.updateDispatchState);
router.post('/notify-release', DusSecretaryController.notifyCertificateRelease);

// Regional / Campus Station Intake & Handover
router.get('/station/consignments', DusSecretaryController.getStationConsignments);
router.post('/station/intake', DusSecretaryController.receiveStationIntake);
router.post('/station/bulk-intake', DusSecretaryController.bulkStationIntake);
router.post('/station/approve-handover', DusSecretaryController.approveStationHandover);
router.post('/station/report-discrepancy', DusSecretaryController.reportStationDiscrepancy);

// Station Secretary Staff Management
router.get('/station-secretaries', DusSecretaryController.getStationSecretaries);
router.post('/station-secretaries', DusSecretaryController.createStationSecretary);
router.put('/station-secretaries/:id', DusSecretaryController.updateStationSecretary);
router.delete('/station-secretaries/:id', DusSecretaryController.deleteStationSecretary);

module.exports = router;
