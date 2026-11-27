const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const env = require('../config/env');
const { db } = require('../config/database');

/**
 * Computes SHA-256 hash of a token string for secure database storage
 */
function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

/**
 * Creates a new persistent authenticated session in MySQL
 * Associates access and refresh tokens with an identifiable device/client session.
 */
async function createUserSession({ userId, deviceInfo = null, ipAddress = null }) {
  const sessionId = crypto.randomUUID();
  // Session duration matches refresh token lifetime (7 days)
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  await db('user_sessions').insert({
    id: sessionId,
    user_id: userId,
    device_info: deviceInfo,
    ip_address: ipAddress,
    is_revoked: 0,
    expires_at: expiresAt,
    created_at: new Date(),
    updated_at: new Date()
  });

  return sessionId;
}

/**
 * Generates an Access JWT (default 24h expiration matching Spring Boot)
 * Payload contains unique JTI nonce, session ID, user ID, role, and permissions.
 */
function generateAccessToken(user, sessionId = null) {
  const payload = {
    jti: crypto.randomUUID(),
    sessionId: sessionId || user.session_id || user.sessionId || null,
    sub: user.email || user.username,
    userId: user.id,
    email: user.email,
    username: user.username,
    role: user.role,
    projectId: user.project_id || null,
    registrationNumber: user.registration_number || null,
    type: 'access'
  };

  return jwt.sign(payload, env.JWT_SECRET, {
    expiresIn: env.JWT_EXPIRES_IN
  });
}

/**
 * Generates a Refresh JWT and persists its tracked session in MySQL
 * Includes session correlation and rotation family tracking for replay attack detection.
 */
async function generateAndSaveRefreshToken(user, sessionId = null, familyId = null) {
  const jti = crypto.randomUUID();
  const famId = familyId || crypto.randomUUID();
  const sessId = sessionId || user.session_id || user.sessionId || null;

  const payload = {
    jti,
    sessionId: sessId,
    sub: user.email || user.username,
    userId: user.id,
    familyId: famId,
    type: 'refresh'
  };

  const refreshToken = jwt.sign(payload, env.JWT_SECRET, {
    expiresIn: env.JWT_REFRESH_EXPIRES_IN
  });

  const decoded = jwt.decode(refreshToken);
  const expiresAt = new Date(decoded.exp * 1000);
  const tokenHash = hashToken(refreshToken);

  await db('refresh_tokens').insert({
    id: crypto.randomUUID(),
    user_id: user.id,
    session_id: sessId,
    jti,
    token_hash: tokenHash,
    family_id: famId,
    expires_at: expiresAt,
    is_revoked: 0,
    created_at: new Date(),
    updated_at: new Date()
  });

  return { refreshToken, jti, sessionId: sessId, familyId: famId };
}

/**
 * Verifies JWT signature and structure
 */
function verifyToken(token) {
  if (!token || typeof token !== 'string') {
    const error = new Error('Token is required');
    error.name = 'JsonWebTokenError';
    throw error;
  }

  return jwt.verify(token, env.JWT_SECRET);
}

const sessionLastTouchCache = new Map();
const SESSION_TOUCH_THROTTLE_MS = 60 * 1000;

function touchSessionActivity(sessionId, now = new Date()) {
  if (!sessionId) return;
  const lastTouch = sessionLastTouchCache.get(sessionId) || 0;
  if (now.getTime() - lastTouch < SESSION_TOUCH_THROTTLE_MS) {
    return;
  }
  sessionLastTouchCache.set(sessionId, now.getTime());
  // Prevent unbounded growth of touch cache
  if (sessionLastTouchCache.size > 5000) {
    const cutoff = now.getTime() - env.SESSION_INACTIVITY_TIMEOUT_MS;
    for (const [k, ts] of sessionLastTouchCache.entries()) {
      if (ts < cutoff) sessionLastTouchCache.delete(k);
    }
  }
  db('user_sessions')
    .where({ id: sessionId, is_revoked: 0 })
    .update({ updated_at: now })
    .catch(() => {});
}

/**
 * Validates access token JTI and parent session against revocation, absolute
 * expiry, and inactivity timeout (default 30m). Active sessions have their
 * updated_at activity timestamp refreshed (throttled to 1x/minute).
 */
async function checkSessionValidity(jti, sessionId = null) {
  const now = new Date();

  // 1. Check direct JTI revocation (e.g. single access token logout)
  if (jti) {
    const revokedToken = await db('revoked_tokens').where({ jti }).first();
    if (revokedToken) {
      return { valid: false, reason: 'token_revoked' };
    }
  }

  // 2. Check session-level revocation, absolute expiry, and inactivity timeout
  if (sessionId) {
    const session = await db('user_sessions').where({ id: sessionId }).first();
    if (!session || session.is_revoked) {
      sessionLastTouchCache.delete(sessionId);
      return { valid: false, reason: 'session_revoked' };
    }

    if (session.expires_at && new Date(session.expires_at) <= now) {
      sessionLastTouchCache.delete(sessionId);
      await revokeSession(sessionId, 'session_expired');
      return { valid: false, reason: 'session_expired' };
    }

    const lastActivityAt = new Date(session.updated_at || session.created_at).getTime();
    const inactivityTimeoutMs = env.SESSION_INACTIVITY_TIMEOUT_MS || (30 * 60 * 1000);
    if (Number.isFinite(lastActivityAt) && (now.getTime() - lastActivityAt) > inactivityTimeoutMs) {
      sessionLastTouchCache.delete(sessionId);
      await revokeSession(sessionId, 'inactivity_timeout');
      return { valid: false, reason: 'inactivity_timeout' };
    }

    touchSessionActivity(sessionId, now);
  }

  return { valid: true, reason: null };
}

/**
 * Checks if an access token JTI or its parent session is revoked or inactive-expired in MySQL.
 */
async function isTokenRevoked(jti, sessionId = null) {
  const result = await checkSessionValidity(jti, sessionId);
  return !result.valid;
}

/**
 * Persistently revokes an Access Token in MySQL
 */
async function revokeAccessToken(token, reason = 'logout') {
  if (!token) return;
  try {
    const decoded = jwt.decode(token);
    if (!decoded || !decoded.jti) return;

    const expiresAt = decoded.exp 
      ? new Date(decoded.exp * 1000) 
      : new Date(Date.now() + env.JWT_EXPIRES_IN_MS);

    await db('revoked_tokens')
      .insert({
        id: crypto.randomUUID(),
        jti: decoded.jti,
        user_id: decoded.userId || null,
        token_type: 'access',
        expires_at: expiresAt,
        reason,
        created_at: new Date()
      })
      .onConflict('jti')
      .ignore();

    // If access token had a session and this is a single session logout, revoke that session
    if (decoded.sessionId && reason === 'logout') {
      await revokeSession(decoded.sessionId, reason);
    }
  } catch (err) {
    console.error('Error recording revoked access token:', err.message);
  }
}

/**
 * Persistently revokes a Refresh Token by token string or JTI
 */
async function revokeRefreshToken(tokenOrJti, reason = 'logout') {
  if (!tokenOrJti) return;
  try {
    let jti = tokenOrJti;
    if (tokenOrJti.includes('.')) {
      const decoded = jwt.decode(tokenOrJti);
      if (decoded && decoded.jti) jti = decoded.jti;
    }

    const rec = await db('refresh_tokens').where({ jti }).first();
    if (rec) {
      await db('refresh_tokens')
        .where({ id: rec.id })
        .update({
          is_revoked: 1,
          revoked_at: new Date(),
          updated_at: new Date()
        });

      if (rec.session_id) {
        await revokeSession(rec.session_id, reason);
      }
    }
  } catch (err) {
    console.error('Error revoking refresh token:', err.message);
  }
}

/**
 * Revokes a single authenticated session (targeted logout)
 */
async function revokeSession(sessionId, reason = 'logout') {
  if (!sessionId) return;
  await db('user_sessions')
    .where({ id: sessionId })
    .update({
      is_revoked: 1,
      revoked_at: new Date(),
      revocation_reason: reason,
      updated_at: new Date()
    });

  await db('refresh_tokens')
    .where({ session_id: sessionId })
    .update({
      is_revoked: 1,
      revoked_at: new Date(),
      updated_at: new Date()
    });
}

/**
 * Rotates a Refresh Token with reuse detection (replay attack protection)
 * Validates session validity; if token or session revoked, blocks rotation.
 */
async function rotateRefreshToken(oldRefreshToken) {
  if (!oldRefreshToken) {
    const err = new Error('Refresh token is required');
    err.name = 'BadRequest';
    throw err;
  }

  const decoded = verifyToken(oldRefreshToken);
  if (decoded.type !== 'refresh') {
    const err = new Error('Invalid token type. Refresh token required.');
    err.name = 'InvalidTokenType';
    throw err;
  }

  // Session check (revocation, absolute expiry, and inactivity timeout)
  if (decoded.sessionId) {
    const session = await db('user_sessions').where({ id: decoded.sessionId }).first();
    if (!session || session.is_revoked) {
      sessionLastTouchCache.delete(decoded.sessionId);
      const sessErr = new Error('Session has been revoked. Please log in again.');
      sessErr.name = 'SessionRevokedError';
      throw sessErr;
    }
    const now = new Date();
    if (session.expires_at && new Date(session.expires_at) <= now) {
      sessionLastTouchCache.delete(decoded.sessionId);
      await revokeSession(decoded.sessionId, 'session_expired');
      const expErr = new Error('Session has expired. Please log in again.');
      expErr.name = 'SessionExpiredError';
      throw expErr;
    }
    const lastActivityAt = new Date(session.updated_at || session.created_at).getTime();
    const inactivityTimeoutMs = env.SESSION_INACTIVITY_TIMEOUT_MS || (30 * 60 * 1000);
    if (Number.isFinite(lastActivityAt) && (now.getTime() - lastActivityAt) > inactivityTimeoutMs) {
      sessionLastTouchCache.delete(decoded.sessionId);
      await revokeSession(decoded.sessionId, 'inactivity_timeout');
      const idleErr = new Error('Session expired due to inactivity. Please log in again.');
      idleErr.name = 'SessionInactivityExpiredError';
      throw idleErr;
    }
    // Active refresh: bump session last-activity timestamp
    sessionLastTouchCache.set(decoded.sessionId, now.getTime());
    await db('user_sessions').where({ id: decoded.sessionId }).update({ updated_at: now });
  }

  const record = await db('refresh_tokens').where({ jti: decoded.jti }).first();
  if (!record) {
    const err = new Error('Refresh token record not found or unmanaged.');
    err.name = 'InvalidRefreshToken';
    throw err;
  }

  // Token Reuse Detection
  if (record.is_revoked) {
    // Invalidate ALL tokens in this family (potential compromise)
    await db('refresh_tokens')
      .where({ family_id: record.family_id })
      .update({
        is_revoked: 1,
        revoked_at: new Date(),
        updated_at: new Date()
      });

    // Also revoke the parent session
    if (record.session_id) {
      await revokeSession(record.session_id, 'token_reuse_breach');
    }

    const breachErr = new Error('Refresh token reuse detected. All active sessions in this family have been revoked.');
    breachErr.name = 'TokenReuseBreachError';
    throw breachErr;
  }

  // Expiration Check
  if (new Date(record.expires_at) <= new Date()) {
    const expErr = new Error('Refresh token has expired. Please log in again.');
    expErr.name = 'TokenExpiredError';
    throw expErr;
  }

  // Fetch active user
  const user = await db('users').where({ id: record.user_id }).first();
  if (!user || !user.is_active) {
    const userErr = new Error('User account is inactive or no longer exists.');
    userErr.name = 'Forbidden';
    throw userErr;
  }

  // Generate new refresh token in same family and session
  const newJti = crypto.randomUUID();
  const sessionId = record.session_id || decoded.sessionId || null;

  const newRefreshToken = jwt.sign(
    {
      jti: newJti,
      sessionId,
      sub: user.email || user.username,
      userId: user.id,
      familyId: record.family_id,
      type: 'refresh'
    },
    env.JWT_SECRET,
    { expiresIn: env.JWT_REFRESH_EXPIRES_IN }
  );

  const newDecoded = jwt.decode(newRefreshToken);
  const newExpiresAt = new Date(newDecoded.exp * 1000);
  const newTokenHash = hashToken(newRefreshToken);

  // Mark old token revoked and record replacement
  await db('refresh_tokens')
    .where({ id: record.id })
    .update({
      is_revoked: 1,
      revoked_at: new Date(),
      replaced_by_jti: newJti,
      updated_at: new Date()
    });

  // Insert new refresh token record
  await db('refresh_tokens').insert({
    id: crypto.randomUUID(),
    user_id: user.id,
    session_id: sessionId,
    jti: newJti,
    token_hash: newTokenHash,
    family_id: record.family_id,
    expires_at: newExpiresAt,
    is_revoked: 0,
    created_at: new Date(),
    updated_at: new Date()
  });

  // Generate new access token bound to the same session
  const newAccessToken = generateAccessToken(user, sessionId);

  return {
    token: newAccessToken,
    refreshToken: newRefreshToken,
    user
  };
}

/**
 * Revokes ALL active sessions and refresh tokens for a user (global logout, password change, reset)
 * Cross-device invalidation: every access token carrying these sessionIds will be rejected by authenticate.
 */
async function revokeAllUserSessions(userId, reason = 'global_logout') {
  if (!userId) return;

  await db('user_sessions')
    .where({ user_id: userId, is_revoked: 0 })
    .update({
      is_revoked: 1,
      revoked_at: new Date(),
      revocation_reason: reason,
      updated_at: new Date()
    });

  await db('refresh_tokens')
    .where({ user_id: userId, is_revoked: 0 })
    .update({
      is_revoked: 1,
      revoked_at: new Date(),
      updated_at: new Date()
    });
}

/**
 * Periodic cleanup strategy for expired records in MySQL
 */
async function cleanupExpiredTokens() {
  const now = new Date();
  const deletedRevoked = await db('revoked_tokens').where('expires_at', '<', now).del();
  const deletedRefresh = await db('refresh_tokens').where('expires_at', '<', now).del();
  const deletedSessions = await db('user_sessions').where('expires_at', '<', now).del();
  return { deletedRevoked, deletedRefresh, deletedSessions };
}

module.exports = {
  hashToken,
  createUserSession,
  generateAccessToken,
  generateAndSaveRefreshToken,
  verifyToken,
  checkSessionValidity,
  isTokenRevoked,
  revokeAccessToken,
  revokeRefreshToken,
  revokeSession,
  rotateRefreshToken,
  revokeAllUserSessions,
  cleanupExpiredTokens
};
