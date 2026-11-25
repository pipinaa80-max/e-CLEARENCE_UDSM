const QRService = require('../services/qr.service');

class QRController {
  /**
   * GET /api/v1/qr/generate?text=...
   * Returns image/png QR code bytes.
   */
  static async generateQRCode(req, res, next) {
    try {
      const text = req.query.text;
      if (!text || typeof text !== 'string' || !text.trim()) {
        return res.status(400).json({
          success: false,
          status: 400,
          error: 'BadRequest',
          message: 'Query parameter "text" is required.'
        });
      }

      const pngBuffer = await QRService.generateQRCode(text);
      res.setHeader('Content-Type', 'image/png');
      res.setHeader('Content-Disposition', 'inline; filename="qrcode.png"');
      res.setHeader('X-Content-Type-Options', 'nosniff');
      return res.status(200).send(pngBuffer);
    } catch (err) {
      return next(err);
    }
  }

  /**
   * POST /api/v1/qr/read (multipart/form-data, field "file")
   * Returns decoded text/plain payload matching Spring Boot QRCodeController.
   */
  static async readQRCode(req, res, next) {
    try {
      if (!req.file || !req.file.buffer || req.file.buffer.length === 0) {
        return res.status(400).type('text/plain').send('QR code image is required');
      }

      const decodedText = QRService.readQRCode(req.file.buffer);
      return res.status(200).type('text/plain').send(decodedText);
    } catch (err) {
      return next(err);
    }
  }
}

module.exports = QRController;
