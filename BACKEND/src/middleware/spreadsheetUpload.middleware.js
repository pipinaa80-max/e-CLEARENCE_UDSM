const multer = require('multer');
const path = require('path');
const env = require('../config/env');

const ALLOWED_EXTENSIONS = new Set(['.csv', '.xlsx', '.xls']);

const storage = multer.memoryStorage();

function fileFilter(req, file, cb) {
  const ext = path.extname(file.originalname || '').toLowerCase();
  if (!ALLOWED_EXTENSIONS.has(ext)) {
    const err = new Error('Unsupported file format. Please upload CSV or Excel (.csv, .xlsx, .xls).');
    err.statusCode = 400;
    return cb(err, false);
  }
  cb(null, true);
}

const upload = multer({
  storage,
  limits: {
    fileSize: env.MAX_FILE_SIZE_BYTES
  },
  fileFilter
});

function handleSpreadsheetUpload(req, res, next) {
  const uploadSingle = upload.single('file');
  uploadSingle(req, res, (err) => {
    if (err) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({
          success: false,
          status: 400,
          error: 'PayloadTooLarge',
          message: `File size exceeds maximum permitted limit (${Math.round(env.MAX_FILE_SIZE_BYTES / (1024 * 1024))}MB).`
        });
      }
      return res.status(err.statusCode || err.status || 400).json({
        success: false,
        status: err.statusCode || err.status || 400,
        error: 'UploadError',
        message: err.message
      });
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        status: 400,
        error: 'BadRequest',
        message: 'No file was uploaded. Field "file" is required.'
      });
    }

    next();
  });
}

module.exports = {
  handleSpreadsheetUpload
};
