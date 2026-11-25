const CollectionStationService = require('../services/collectionStation.service');

class CollectionStationController {
  static async getActiveStations(req, res, next) {
    try {
      const stations = await CollectionStationService.getActiveStations();
      return res.status(200).json(stations);
    } catch (err) {
      next(err);
    }
  }

  static async getAllStations(req, res, next) {
    try {
      const stations = await CollectionStationService.getAllStations();
      return res.status(200).json(stations);
    } catch (err) {
      next(err);
    }
  }

  static async createStation(req, res, next) {
    try {
      const created = await CollectionStationService.createStation(req.body);
      return res.status(200).json(created);
    } catch (err) {
      next(err);
    }
  }

  static async updateStation(req, res, next) {
    try {
      const updated = await CollectionStationService.updateStation(req.params.id, req.body);
      if (!updated) {
        return res.status(404).json({
          success: false,
          status: 404,
          error: 'NotFound',
          message: 'Collection station not found.'
        });
      }
      return res.status(200).json(updated);
    } catch (err) {
      next(err);
    }
  }

  static async deleteStation(req, res, next) {
    try {
      const deleted = await CollectionStationService.deleteStation(req.params.id);
      if (!deleted) {
        return res.status(404).json({
          success: false,
          status: 404,
          error: 'NotFound',
          message: 'Collection station not found.'
        });
      }
      return res.status(204).send();
    } catch (err) {
      next(err);
    }
  }
}

module.exports = CollectionStationController;
