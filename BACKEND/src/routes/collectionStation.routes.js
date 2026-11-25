const express = require('express');
const CollectionStationController = require('../controllers/collectionStation.controller');
const { authenticate, authorize } = require('../middleware/auth.middleware');

const router = express.Router();

// Public / Student endpoint for active pickup stations
router.get('/', CollectionStationController.getActiveStations);

// Director / DUS Secretary / Admin endpoint for all stations
router.get(
  '/all',
  authenticate,
  authorize(
    'DIRECTOR_OF_UNDERGRADUATE_STUDIES',
    'DUS_SECRETARY',
    'ADMINISTRATOR',
    'ADMIN',
    'SUPERUSER',
    'PRINCIPAL'
  ),
  CollectionStationController.getAllStations
);

// Create new collection station
router.post(
  '/',
  authenticate,
  authorize('DIRECTOR_OF_UNDERGRADUATE_STUDIES', 'ADMINISTRATOR', 'ADMIN', 'SUPERUSER'),
  CollectionStationController.createStation
);

// Update collection station
router.put(
  '/:id',
  authenticate,
  authorize('DIRECTOR_OF_UNDERGRADUATE_STUDIES', 'ADMINISTRATOR', 'ADMIN', 'SUPERUSER'),
  CollectionStationController.updateStation
);

// Soft delete / deactivate collection station
router.delete(
  '/:id',
  authenticate,
  authorize('DIRECTOR_OF_UNDERGRADUATE_STUDIES', 'ADMINISTRATOR', 'ADMIN', 'SUPERUSER'),
  CollectionStationController.deleteStation
);

module.exports = router;
