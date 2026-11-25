const express = require('express');
const multer = require('multer');
const QRController = require('../controllers/qr.controller');

const router = express.Router();

// Isolated in-memory multer handler for QR image uploads (max 5 MB)
const qrUpload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024,
    files: 1
  }
});

function handleQrImageUpload(req, res, next) {
  qrUpload.single('file')(req, res, (err) => {
    if (!err) return next();
    if (err instanceof multer.MulterError) {
      return res.status(400).json({
        success: false,
        status: 400,
        error: 'UploadError',
        message: err.code === 'LIMIT_FILE_SIZE'
          ? 'QR image exceeds maximum allowed size of 5 MB.'
          : err.message
      });
    }
    return next(err);
  });
}

// Public utility routes matching Spring Boot SecurityConfig ("/qr/**" permitAll)
router.get('/generate', QRController.generateQRCode);
router.post('/read', handleQrImageUpload, QRController.readQRCode);

module.exports = router;
