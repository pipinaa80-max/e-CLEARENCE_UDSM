require('dotenv').config();
const path = require('path');

const nodeEnv = process.env.NODE_ENV || 'development';

// Startup validation: JWT Secret must meet strict cryptographic requirements
const devDefaultSecret = 'smartclearance-udsm-super-secret-key-2024-min-256-bits-long-secure-key';
const jwtSecret = process.env.JWT_SECRET || (nodeEnv === 'production' ? null : devDefaultSecret);

if (nodeEnv === 'production') {
  if (!jwtSecret || jwtSecret.length < 32 || jwtSecret === devDefaultSecret) {
    throw new Error('FATAL: A unique, cryptographically strong JWT_SECRET (minimum 32 characters) must be configured in production environment.');
  }
  if (!process.env.CERTIFICATE_VERIFY_BASE_URL || !process.env.CERTIFICATE_VERIFY_BASE_URL.trim()) {
    throw new Error('FATAL: CERTIFICATE_VERIFY_BASE_URL must be explicitly configured in production environment. Assumed fallback domains are strictly prohibited.');
  }
  if (!process.env.CORS_ALLOWED_ORIGINS || !process.env.CORS_ALLOWED_ORIGINS.trim()) {
    throw new Error('FATAL: CORS_ALLOWED_ORIGINS must be explicitly configured in production environment.');
  }
  if (!process.env.FRONTEND_URL || !process.env.FRONTEND_URL.trim()) {
    throw new Error('FATAL: FRONTEND_URL must be explicitly configured in production environment.');
  }
  if (!process.env.DB_HOST || !process.env.DB_USER || !process.env.DB_NAME) {
    throw new Error('FATAL: DB_HOST, DB_USER, and DB_NAME must be explicitly configured in production environment.');
  }
} else if (!jwtSecret || jwtSecret.length < 32) {
  throw new Error('FATAL: JWT_SECRET must be at least 32 characters in length.');
}

const certificateVerifyBaseUrl = process.env.CERTIFICATE_VERIFY_BASE_URL || (
  nodeEnv === 'production'
    ? null
    : `http://localhost:${Number(process.env.PORT) || 8080}/api/v1/clearance/certificate/verify`
);

const uploadDir = process.env.UPLOAD_DIR || path.resolve(__dirname, '../../uploads');
const trustProxyRaw = process.env.TRUST_PROXY;
const trustProxy = trustProxyRaw === undefined || trustProxyRaw === ''
  ? 1
  : (trustProxyRaw === 'false' ? false : (trustProxyRaw === 'true' ? true : (!isNaN(Number(trustProxyRaw)) ? Number(trustProxyRaw) : trustProxyRaw)));

const rawPort = process.env.PORT;
const parsedPort = rawPort && String(rawPort).trim() !== ''
  ? (/^\d+$/.test(String(rawPort).trim()) ? Number(rawPort) : String(rawPort).trim())
  : 8080;

const env = {
  NODE_ENV: nodeEnv,
  PORT: parsedPort,
  TRUST_PROXY: trustProxy,
  
  // Database configuration
  DB_HOST: process.env.DB_HOST || '127.0.0.1',
  DB_PORT: Number(process.env.DB_PORT) || 3306,
  DB_USER: process.env.DB_USER || 'root',
  DB_PASSWORD: process.env.DB_PASSWORD || '',
  DB_NAME: process.env.DB_NAME || 'clearance_db',
  DB_TEST_NAME: process.env.DB_TEST_NAME || 'clearance_test_db',
  
  // JWT Configuration (Default dev secret is strictly for development)
  JWT_SECRET: jwtSecret,
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '24h',
  JWT_REFRESH_EXPIRES_IN: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  JWT_EXPIRES_IN_MS: 86400000, // 24 hours in milliseconds (matches Spring Boot)
  
  // Password Reset Token Expiry (1 hour = 3600000ms)
  PASSWORD_RESET_TOKEN_EXPIRY_MS: 60 * 60 * 1000,

  // CORS Configuration
  CORS_ALLOWED_ORIGINS: process.env.CORS_ALLOWED_ORIGINS
    ? process.env.CORS_ALLOWED_ORIGINS.split(',').map(s => s.trim()).filter(Boolean)
    : ['http://localhost:4200', 'http://127.0.0.1:4200', 'http://localhost:3000', 'http://localhost:8090'],

  // Rate Limiting
  RATE_LIMIT_WINDOW_MS: 15 * 60 * 1000, // 15 minutes
  RATE_LIMIT_MAX_ATTEMPTS: Number(process.env.RATE_LIMIT_MAX_ATTEMPTS) || 10,

  // File Upload Configuration
  UPLOAD_DIR: uploadDir,
  PRIVATE_DOCUMENTS_DIR: path.join(uploadDir, 'private-documents'),
  MAX_FILE_SIZE_BYTES: Number(process.env.MAX_FILE_SIZE_BYTES) || 10 * 1024 * 1024, // 10MB

  // Certificate Verification Base URL (Explicit in prod, local default in dev/test)
  CERTIFICATE_VERIFY_BASE_URL: certificateVerifyBaseUrl,

  // Outbound SMTP Email Configuration (Optional — no-ops safely if unset)
  SMTP_HOST: process.env.SMTP_HOST || '',
  SMTP_PORT: Number(process.env.SMTP_PORT) || 587,
  SMTP_SECURE: process.env.SMTP_SECURE === 'true' || Number(process.env.SMTP_PORT) === 465,
  SMTP_USER: process.env.SMTP_USER || '',
  SMTP_PASS: process.env.SMTP_PASS || '',
  SMTP_FROM: process.env.SMTP_FROM || process.env.SMTP_USER || 'no-reply@udsm.ac.tz',
  APP_NAME: process.env.APP_NAME || 'SmartClearance UDSM',
  FRONTEND_URL: process.env.FRONTEND_URL || 'http://localhost:4200'
};

module.exports = env;
