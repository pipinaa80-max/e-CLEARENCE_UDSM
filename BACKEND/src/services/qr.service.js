const QRCode = require('qrcode');
const { PNG } = require('pngjs');
const jpeg = require('jpeg-js');
const jsQR = require('jsqr');

function createHttpError(statusCode, message) {
  const err = new Error(message);
  err.statusCode = statusCode;
  return err;
}

function isPngBuffer(buf) {
  return (
    buf.length >= 8 &&
    buf[0] === 0x89 &&
    buf[1] === 0x50 &&
    buf[2] === 0x4e &&
    buf[3] === 0x47 &&
    buf[4] === 0x0d &&
    buf[5] === 0x0a &&
    buf[6] === 0x1a &&
    buf[7] === 0x0a
  );
}

function isJpegBuffer(buf) {
  return buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff;
}

class QRService {
  /**
   * Generate a 300x300 PNG QR code image buffer from the given text.
   * Mirrors Spring Boot QRCodeService.generateQRCode.
   */
  static async generateQRCode(text) {
    if (!text || typeof text !== 'string' || !text.trim()) {
      throw createHttpError(400, 'QR code text cannot be empty');
    }

    // Cap QR payload length to 1024 characters to prevent DoS / memory abuse
    if (text.length > 1024) {
      throw createHttpError(400, 'QR code text must not exceed 1024 characters');
    }

    const buffer = await QRCode.toBuffer(text.trim(), {
      type: 'png',
      width: 300,
      margin: 2,
      errorCorrectionLevel: 'M',
      color: {
        dark: '#000000',
        light: '#ffffff'
      }
    });

    return buffer;
  }

  /**
   * Decode a QR code from an uploaded PNG or JPEG image buffer.
   * Mirrors Spring Boot QRCodeReaderService.readQRCode.
   */
  static readQRCode(imageBuffer) {
    if (!imageBuffer || !Buffer.isBuffer(imageBuffer) || imageBuffer.length === 0) {
      throw createHttpError(400, 'QR code image cannot be empty');
    }

    let decodedImage;
    try {
      if (isPngBuffer(imageBuffer)) {
        const png = PNG.sync.read(imageBuffer);
        decodedImage = {
          data: new Uint8ClampedArray(png.data),
          width: png.width,
          height: png.height
        };
      } else if (isJpegBuffer(imageBuffer)) {
        const jpg = jpeg.decode(imageBuffer, { useTArray: true });
        decodedImage = {
          data: new Uint8ClampedArray(jpg.data),
          width: jpg.width,
          height: jpg.height
        };
      } else {
        throw createHttpError(400, 'Unable to read the uploaded image. Supported formats: PNG, JPEG.');
      }
    } catch (err) {
      if (err.statusCode) throw err;
      throw createHttpError(400, 'Unable to read the uploaded image');
    }

    const result = jsQR(decodedImage.data, decodedImage.width, decodedImage.height);
    if (!result || !result.data) {
      throw createHttpError(
        400,
        'Unable to decode QR code. Make sure the uploaded image contains a valid QR code.'
      );
    }

    return result.data;
  }
}

module.exports = QRService;
