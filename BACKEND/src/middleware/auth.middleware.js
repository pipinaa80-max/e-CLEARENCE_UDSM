const { verifyToken, checkSessionValidity } = require('../utils/token');
const { db } = require('../config/database');
const { ROLES, normalizeRole } = require('../constants/roles');

/**
 * Middleware: Verifies JWT token and attaches user to req.user
 */
async function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      status: 401,
      error: 'Unauthorized',
      message: 'Authentication token is required.'
    });
  }

  const token = authHeader.substring(7).trim();

  try {
    const decoded = verifyToken(token);

    if (decoded.type !== 'access') {
      return res.status(401).json({
        success: false,
        status: 401,
        error: 'Unauthorized',
        message: 'Invalid token type. Access token required.'
      });
    }

    // Persistent MySQL-backed token, session revocation, and inactivity timeout check
    const validity = await checkSessionValidity(decoded.jti, decoded.sessionId);
    if (!validity.valid) {
      const isIdle = validity.reason === 'inactivity_timeout';
      const isExpired = validity.reason === 'session_expired';
      return res.status(401).json({
        success: false,
        status: 401,
        error: isIdle ? 'InactivityTimeout' : isExpired ? 'SessionExpired' : 'SessionRevoked',
        message: isIdle
          ? 'Your session expired due to inactivity. Please log in again.'
          : isExpired
            ? 'Your authentication session has expired. Please log in again.'
            : 'Token has been revoked. Please log in again.'
      });
    }

    // Verify user exists and is active in database (lightweight projection: excludes photo/password)
    const user = await db('users')
      .where({ id: decoded.userId })
      .select(
        'id',
        'email',
        'username',
        'full_name',
        'registration_number',
        'role',
        'project_id',
        'college',
        'department',
        'programme',
        'award',
        'is_postgraduate',
        'station_code',
        'station_name',
        'is_active',
        'is_locked',
        'lock_reason'
      )
      .first();

    if (!user) {
      return res.status(401).json({
        success: false,
        status: 401,
        error: 'Unauthorized',
        message: 'User account not found.'
      });
    }

    if (!user.is_active) {
      return res.status(403).json({
        success: false,
        status: 403,
        error: 'Forbidden',
        message: 'User account is deactivated. Please contact the administrator.'
      });
    }

    if (user.is_locked) {
      return res.status(403).json({
        success: false,
        status: 403,
        error: 'Forbidden',
        message: `Account is locked: ${user.lock_reason || 'Security lock active'}`
      });
    }

    // Attach user information to request
    req.user = {
      id: user.id,
      email: user.email,
      username: user.username,
      fullName: user.full_name,
      registrationNumber: user.registration_number,
      role: normalizeRole(user.role),
      projectId: user.project_id,
      college: user.college,
      department: user.department,
      programme: user.programme,
      award: user.award || null,
      isPostgraduate: Boolean(user.is_postgraduate),
      stationCode: user.station_code,
      stationName: user.station_name,
      token
    };

    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        status: 401,
        error: 'TokenExpired',
        message: 'Your authentication session has expired. Please log in again.'
      });
    }

    if (err.name === 'TokenRevokedError') {
      return res.status(401).json({
        success: false,
        status: 401,
        error: 'TokenRevoked',
        message: 'Token has been revoked. Please log in again.'
      });
    }

    return res.status(401).json({
      success: false,
      status: 401,
      error: 'Unauthorized',
      message: 'Invalid authentication token.'
    });
  }
}

/**
 * Middleware: Role-based authorization gate
 * @param  {...string} allowedRoles - List of permitted roles
 */
function authorize(...allowedRoles) {
  const normalizedAllowed = allowedRoles.map(r => normalizeRole(r));

  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        status: 401,
        error: 'Unauthorized',
        message: 'Authentication required.'
      });
    }

    const userRole = normalizeRole(req.user.role);

    // Superuser always has full administrative visibility across the control plane
    if (userRole === ROLES.SUPERUSER || normalizedAllowed.includes(userRole)) {
      return next();
    }

    return res.status(403).json({
      success: false,
      status: 403,
      error: 'Forbidden',
      message: `Access denied. Role '${userRole}' is not authorized for this resource.`
    });
  };
}

/**
 * Middleware: Strict Superuser check (cannot be bypassed by normal admins)
 */
function requireSuperuser(req, res, next) {
  if (!req.user || req.user.role !== ROLES.SUPERUSER) {
    return res.status(403).json({
      success: false,
      status: 403,
      error: 'Forbidden',
      message: 'Superuser permission required.'
    });
  }
  next();
}

module.exports = {
  authenticate,
  authorize,
  requireSuperuser
};
