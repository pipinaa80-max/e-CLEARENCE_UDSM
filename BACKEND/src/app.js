const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const env = require('./config/env');
const authRoutes = require('./routes/auth.routes');
const clearanceRoutes = require('./routes/clearance.routes');
const convocationRoutes = require('./routes/convocation.routes');
const studentDebtRoutes = require('./routes/studentDebt.routes');
const documentRoutes = require('./routes/document.routes');
const analyticsRoutes = require('./routes/analytics.routes');
const notificationRoutes = require('./routes/notification.routes');
const controlPlaneRoutes = require('./routes/controlPlane.routes');
const sponsorRoutes = require('./routes/sponsor.routes');
const collectionStationRoutes = require('./routes/collectionStation.routes');
const collegeDepartmentRoutes = require('./routes/collegeDepartment.routes');
const adminRoutes = require('./routes/admin.routes');
const dusSecretaryRoutes = require('./routes/dusSecretary.routes');
const qrRoutes = require('./routes/qr.routes');
const transcriptPaymentRoutes = require('./routes/transcriptPayment.routes');
const roleTestRoutes = require('./routes/roleTest.routes');
const coalesceGetMiddleware = require('./middleware/coalesceGet.middleware');
const { apiSpikeLimiter } = require('./middleware/rateLimiter.middleware');
const { errorHandler, notFoundHandler } = require('./middleware/errorHandler.middleware');

const app = express();

// Trust first reverse proxy (Nginx / Apache / Load Balancer) so req.ip and rate limiters use real client IPs
app.set('trust proxy', env.TRUST_PROXY);

// Security Headers
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' }
}));

// CORS Configuration
app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps, curl, postman) or matching allowed origins
    if (!origin || env.CORS_ALLOWED_ORIGINS.includes(origin) || env.NODE_ENV !== 'production') {
      return callback(null, true);
    }
    return callback(new Error('Blocked by CORS policy'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'X-Skip-Error-Toast']
}));

// Body Parsers
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Sanitize logs: never log sensitive headers or passwords
app.use((req, res, next) => {
  if (env.NODE_ENV === 'development') {
    const safeBody = req.body ? { ...req.body } : {};
    if (safeBody.password) safeBody.password = '[REDACTED]';
    if (safeBody.newPassword) safeBody.newPassword = '[REDACTED]';
    if (safeBody.currentPassword) safeBody.currentPassword = '[REDACTED]';
  }
  next();
});

// Block unauthenticated static access to private student documents and convocation receipts
app.use([
  '/uploads/private-documents',
  '/api/v1/uploads/private-documents',
  '/uploads/convocation',
  '/api/v1/uploads/convocation'
], (req, res) => {
  res.status(403).json({
    success: false,
    status: 403,
    error: 'Forbidden',
    message: 'Direct static access to private student documents or receipts is forbidden. Use the authenticated API endpoint.'
  });
});

// Static uploaded assets (profile photos & convocation receipts; matches Spring Boot WebConfig /uploads/**)
const staticUploadsOptions = {
  maxAge: '7d',
  index: false,
  dotfiles: 'ignore'
};
app.use('/uploads', express.static(env.UPLOAD_DIR, staticUploadsOptions));
app.use('/api/v1/uploads', express.static(env.UPLOAD_DIR, staticUploadsOptions));

// Root & Health
app.get('/', (req, res) => {
  res.status(200).json({
    status: 'ONLINE',
    service: 'UDSM e-Clearance Express API',
    version: '1.0.0',
    documentation: '/api/v1/auth/health'
  });
});

// API v1 Routing (protect against endpoint flooding + coalesce concurrent identical GETs)
app.use('/api/v1', apiSpikeLimiter, coalesceGetMiddleware);
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/clearance', clearanceRoutes);
app.use('/api/v1/convocation', convocationRoutes);
app.use('/api/v1/student-debts', studentDebtRoutes);
app.use('/api/v1/documents', documentRoutes);
app.use('/api/v1/analytics', analyticsRoutes);
app.use('/api/v1/notifications', notificationRoutes);
app.use('/api/v1/control-plane', controlPlaneRoutes);
app.use('/api/v1/sponsors', sponsorRoutes);
app.use('/api/v1/collection-stations', collectionStationRoutes);
app.use('/api/v1/colleges', collegeDepartmentRoutes);
app.use('/api/v1/admin', adminRoutes);
app.use('/api/v1/dus-secretary', dusSecretaryRoutes);
app.use('/api/v1/qr', qrRoutes);
app.use('/api/v1/transcript-payments', transcriptPaymentRoutes);

// Test-only harness routes: strictly forbidden and disabled in production
if (env.NODE_ENV === 'test') {
  app.use('/api/v1/test-roles', roleTestRoutes);
}

// Catch 404
app.use(notFoundHandler);

// Centralized Error Handler
app.use(errorHandler);

module.exports = app;
