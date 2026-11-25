const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const env = require('../config/env');

const CONVOCATION_UPLOAD_DIR = path.join(env.UPLOAD_DIR, 'convocation');

// Ensure upload directories exist
if (!fs.existsSync(env.UPLOAD_DIR)) {
  fs.mkdirSync(env.UPLOAD_DIR, { recursive: true });
}
if (!fs.existsSync(env.PRIVATE_DOCUMENTS_DIR)) {
  fs.mkdirSync(env.PRIVATE_DOCUMENTS_DIR, { recursive: true });
}
if (!fs.existsSync(CONVOCATION_UPLOAD_DIR)) {
  fs.mkdirSync(CONVOCATION_UPLOAD_DIR, { recursive: true });
}

// Permitted extensions and MIME types for uploaded student documents & receipts
const ALLOWED_MIME_TYPES = new Set([
  'application/pdf',
  'image/jpeg',
  'image/png'
]);

const ALLOWED_EXTENSIONS = new Set([
  '.pdf',
  '.jpg',
  '.jpeg',
  '.png'
]);

// Permitted MIME types for Angular multipart JSON metadata Blob parts (@RequestPart("document") / @RequestPart("receipt"))
const JSON_PART_MIME_TYPES = new Set([
  'application/json',
  'text/plain',
  'application/octet-stream'
]);

// Magic byte signatures
const MAGIC_BYTES = {
  PDF: Buffer.from([0x25, 0x50, 0x44, 0x46]), // %PDF
  PNG: Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]),
  JPEG: Buffer.from([0xFF, 0xD8, 0xFF])
};

function safeUnlink(filePath) {
  if (!filePath) return;
  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  } catch (err) {
    // Ignore cleanup errors
  }
}

function createDiskStorage(targetDir, jsonPartFieldName) {
  return multer.diskStorage({
    destination: (req, file, cb) => {
      if (!fs.existsSync(targetDir)) {
        fs.mkdirSync(targetDir, { recursive: true });
      }
      cb(null, targetDir);
    },
    filename: (req, file, cb) => {
      if (file.fieldname === jsonPartFieldName) {
        return cb(null, `.meta-${crypto.randomUUID()}.json`);
      }
      const ext = path.extname(file.originalname || '').toLowerCase();
      const safeName = `${crypto.randomUUID()}${ext}`;
      cb(null, safeName);
    }
  });
}

function createFileFilter(jsonPartFieldName, { allowPlainText = false } = {}) {
  return (req, file, cb) => {
    // Allow Angular FormData JSON Blob part (e.g. 'document' or 'receipt')
    if (file.fieldname === jsonPartFieldName) {
      const mime = (file.mimetype || '').toLowerCase().split(';')[0].trim();
      if (!mime || JSON_PART_MIME_TYPES.has(mime)) {
        return cb(null, true);
      }
      const err = new Error(`Unsupported metadata part MIME type: '${file.mimetype}'. Expected application/json.`);
      err.status = 400;
      return cb(err, false);
    }

    const ext = path.extname(file.originalname || '').toLowerCase();
    const mime = (file.mimetype || '').toLowerCase().split(';')[0].trim();

    if (allowPlainText && (ext === '.txt' || mime === 'text/plain')) {
      return cb(null, true);
    }

    if (!ALLOWED_EXTENSIONS.has(ext)) {
      const err = new Error(`Unsupported file extension: '${ext}'. Allowed extensions: .pdf, .jpg, .jpeg, .png`);
      err.status = 400;
      return cb(err, false);
    }

    if (!ALLOWED_MIME_TYPES.has(mime)) {
      const err = new Error(`Unsupported MIME type: '${file.mimetype}'. Allowed types: application/pdf, image/jpeg, image/png`);
      err.status = 400;
      return cb(err, false);
    }

    cb(null, true);
  };
}

const documentUpload = multer({
  storage: createDiskStorage(env.PRIVATE_DOCUMENTS_DIR, 'document'),
  limits: {
    fileSize: env.MAX_FILE_SIZE_BYTES
  },
  fileFilter: createFileFilter('document')
});

const convocationUpload = multer({
  storage: createDiskStorage(CONVOCATION_UPLOAD_DIR, 'receipt'),
  limits: {
    fileSize: env.MAX_FILE_SIZE_BYTES
  },
  fileFilter: createFileFilter('receipt', { allowPlainText: true })
});

/**
 * Validates the file magic bytes on disk after multer has written it
 */
async function verifyMagicBytes(filePath, mimetype) {
  return new Promise((resolve, reject) => {
    const stream = fs.createReadStream(filePath, { start: 0, end: 15 });
    const chunks = [];

    stream.on('data', chunk => chunks.push(chunk));
    stream.on('error', err => reject(err));
    stream.on('end', () => {
      const buffer = Buffer.concat(chunks);
      if (buffer.length < 3) {
        return resolve(false);
      }

      if (mimetype === 'application/pdf') {
        return resolve(buffer.subarray(0, 4).equals(MAGIC_BYTES.PDF));
      } else if (mimetype === 'image/png') {
        return resolve(buffer.subarray(0, 8).equals(MAGIC_BYTES.PNG));
      } else if (mimetype === 'image/jpeg') {
        return resolve(buffer.subarray(0, 3).equals(MAGIC_BYTES.JPEG));
      }

      resolve(false);
    });
  });
}

/**
 * Extracts and cleans up an Angular JSON Blob part (if uploaded as a file part)
 * or parses a plain-text JSON form field into req.body.
 */
function mergeJsonMetadataPart(req, partName) {
  const partFile = req.files?.[partName]?.[0] || null;
  if (partFile && partFile.path) {
    try {
      const rawJson = fs.readFileSync(partFile.path, 'utf8');
      const parsed = JSON.parse(rawJson);
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        req.body = { ...(req.body || {}), ...parsed };
      }
    } catch (parseErr) {
      // Keep req.body as-is if metadata part is not valid JSON
    } finally {
      safeUnlink(partFile.path);
    }
    return;
  }

  if (req.body && req.body[partName]) {
    try {
      const parsed = typeof req.body[partName] === 'string'
        ? JSON.parse(req.body[partName])
        : req.body[partName];
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        req.body = { ...req.body, ...parsed };
      }
    } catch (parseErr) {
      // Keep req.body as-is if not valid JSON
    }
  }
}

/**
 * Express middleware for POST /api/v1/documents/upload
 * Supports both plain multipart fields + 'file' and Angular's Blob('document') + 'file'.
 */
function handleUpload(req, res, next) {
  const uploadFields = documentUpload.fields([
    { name: 'file', maxCount: 1 },
    { name: 'document', maxCount: 1 }
  ]);

  uploadFields(req, res, async (err) => {
    // Always extract and clean up any uploaded JSON metadata blob
    mergeJsonMetadataPart(req, 'document');
    req.file = req.files?.file?.[0] || null;

    if (err) {
      safeUnlink(req.file?.path);
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({
          success: false,
          status: 400,
          error: 'PayloadTooLarge',
          message: `File size exceeds maximum permitted limit (${Math.round(env.MAX_FILE_SIZE_BYTES / (1024 * 1024))}MB).`
        });
      }
      return res.status(err.status || 400).json({
        success: false,
        status: err.status || 400,
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

    // Verify magic bytes
    try {
      const isValid = await verifyMagicBytes(req.file.path, req.file.mimetype);
      if (!isValid) {
        safeUnlink(req.file.path);
        return res.status(400).json({
          success: false,
          status: 400,
          error: 'SecurityValidationFailed',
          message: 'File content does not match its claimed MIME type or extension (magic byte verification failed).'
        });
      }
    } catch (readErr) {
      safeUnlink(req.file.path);
      return res.status(500).json({
        success: false,
        status: 500,
        error: 'FileInspectionError',
        message: 'Failed to inspect uploaded file.'
      });
    }

    next();
  });
}

/**
 * Express middleware for POST /api/v1/convocation/submit-receipt
 * Supports Angular's multipart/form-data (Blob('receipt') + 'file') AND backward-compatible application/json payloads.
 */
function handleConvocationUpload(req, res, next) {
  if (!req.is('multipart/form-data')) {
    return next();
  }

  const uploadFields = convocationUpload.fields([
    { name: 'file', maxCount: 1 },
    { name: 'receipt', maxCount: 1 }
  ]);

  uploadFields(req, res, async (err) => {
    mergeJsonMetadataPart(req, 'receipt');
    req.file = req.files?.file?.[0] || null;

    if (err) {
      safeUnlink(req.file?.path);
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({
          success: false,
          status: 400,
          error: 'PayloadTooLarge',
          message: `Receipt file exceeds maximum permitted limit (${Math.round(env.MAX_FILE_SIZE_BYTES / (1024 * 1024))}MB).`
        });
      }
      return res.status(err.status || 400).json({
        success: false,
        status: err.status || 400,
        error: 'UploadError',
        message: err.message
      });
    }

    if (req.file) {
      const ext = path.extname(req.file.originalname || '').toLowerCase();
      const mime = (req.file.mimetype || '').toLowerCase().split(';')[0].trim();
      const isPlainTextReceipt = ext === '.txt' || mime === 'text/plain';

      if (!isPlainTextReceipt) {
        try {
          const isValid = await verifyMagicBytes(req.file.path, req.file.mimetype);
          if (!isValid) {
            safeUnlink(req.file.path);
            return res.status(400).json({
              success: false,
              status: 400,
              error: 'SecurityValidationFailed',
              message: 'Receipt file content does not match its claimed MIME type or extension (magic byte verification failed).'
            });
          }
        } catch (readErr) {
          safeUnlink(req.file.path);
          return res.status(500).json({
            success: false,
            status: 500,
            error: 'FileInspectionError',
            message: 'Failed to inspect uploaded receipt file.'
          });
        }
      }
    }

    next();
  });
}

module.exports = {
  handleUpload,
  handleConvocationUpload,
  verifyMagicBytes,
  ALLOWED_MIME_TYPES,
  ALLOWED_EXTENSIONS
};
