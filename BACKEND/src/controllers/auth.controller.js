const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const { db } = require('../config/database');
const { verifyPassword, hashPassword } = require('../utils/password');
const {
  createUserSession,
  generateAccessToken,
  generateAndSaveRefreshToken,
  verifyToken,
  revokeAccessToken,
  revokeRefreshToken,
  revokeSession,
  rotateRefreshToken,
  revokeAllUserSessions
} = require('../utils/token');
const { ROLES, normalizeRole } = require('../constants/roles');
const { isPostgraduateRecord } = require('../utils/postgraduate');
const env = require('../config/env');
const NotificationService = require('../services/notification.service');
const EmailService = require('../services/email.service');

/**
 * Validates password complexity
 * Requirement: Minimum 8 characters, at least one letter, at least one digit or special character.
 */
function validatePasswordStrength(password) {
  if (!password || typeof password !== 'string') {
    return { valid: false, message: 'Password is required.' };
  }
  if (password.length < 8) {
    return { valid: false, message: 'Password must be at least 8 characters in length.' };
  }
  if (!/[a-zA-Z]/.test(password)) {
    return { valid: false, message: 'Password must contain at least one letter.' };
  }
  if (!/[0-9!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(password)) {
    return { valid: false, message: 'Password must contain at least one number or special character.' };
  }
  return { valid: true };
}

/**
 * Controller: Handles all authentication, session lifecycle, and profile operations
 */

// POST /api/v1/auth/login
async function login(req, res, next) {
  try {
    const { identifier, email, username, registrationNumber, password, honeypotTrap } = req.body;

    // Honeypot bot trap check
    if (honeypotTrap && typeof honeypotTrap === 'string' && honeypotTrap.trim().length > 0) {
      return res.status(403).json({
        success: false,
        status: 403,
        error: 'Forbidden',
        message: 'Security policy trigger: Automated form submission detected.'
      });
    }

    const loginId = (identifier || email || username || registrationNumber || '').trim();

    if (!loginId || !password) {
      return res.status(400).json({
        success: false,
        status: 400,
        error: 'BadRequest',
        message: 'Identifier (email/username/registration number) and password are required.'
      });
    }

    // Lookup user by email, username, or registration number
    const user = await db('users')
      .whereRaw('LOWER(email) = ?', [loginId.toLowerCase()])
      .orWhereRaw('LOWER(username) = ?', [loginId.toLowerCase()])
      .orWhereRaw('UPPER(registration_number) = ?', [loginId.toUpperCase()])
      .first();

    if (!user) {
      return res.status(401).json({
        success: false,
        status: 401,
        error: 'Unauthorized',
        message: 'Invalid email/registration number or password.'
      });
    }

    // Verify BCrypt password (compatible with Spring Security $2a$10$ hashes)
    const isPasswordValid = await verifyPassword(password, user.password);

    if (!isPasswordValid) {
      // Record failed login attempt in audit logs
      try {
        await db('audit_logs').insert({
          id: crypto.randomUUID(),
          user_id: user.id,
          username: user.username,
          action: 'LOGIN_FAILURE',
          details: `Failed password verification for ${user.email}`,
          ip_address: req.ip || req.connection.remoteAddress,
          user_agent: req.headers['user-agent'] || 'Unknown',
          status: 'FAILURE',
          created_at: new Date()
        });
      } catch (err) {}

      return res.status(401).json({
        success: false,
        status: 401,
        error: 'Unauthorized',
        message: 'Invalid email/registration number or password.'
      });
    }

    // Check if account is locked
    if (user.is_locked) {
      return res.status(403).json({
        success: false,
        status: 403,
        error: 'AccountLocked',
        message: `Account is locked: ${user.lock_reason || 'Please contact administrator.'}`
      });
    }

    // Check if account is active
    if (!user.is_active) {
      return res.status(403).json({
        success: false,
        status: 403,
        error: 'AccountDisabled',
        message: 'Your account is currently disabled. Please contact the administrator.'
      });
    }

    // Create identifiable authenticated session in MySQL
    const sessionId = await createUserSession({
      userId: user.id,
      deviceInfo: req.headers['user-agent'] || 'Unknown',
      ipAddress: req.ip || req.connection.remoteAddress
    });

    // Generate session-bound JWT access token and persist tracked refresh token
    const accessToken = generateAccessToken(user, sessionId);
    const { refreshToken } = await generateAndSaveRefreshToken(user, sessionId);

    // Update last login metadata
    await db('users')
      .where({ id: user.id })
      .update({
        last_login: new Date(),
        last_login_ip: req.ip || req.connection.remoteAddress,
        last_login_device: req.headers['user-agent'] || 'Unknown',
        updated_at: new Date()
      });

    // Fetch linked student academic profile if student role
    let student = null;
    if (user.role === ROLES.STUDENT) {
      student = await db('students').where({ user_id: user.id }).first();
      if (!student && user.registration_number) {
        student = await db('students').where({ registration_number: user.registration_number }).first();
      }
    }

    // Log successful login audit
    try {
      await db('audit_logs').insert({
        id: crypto.randomUUID(),
        user_id: user.id,
        username: user.username,
        action: 'LOGIN_SUCCESS',
        details: `Successful login for ${user.email} (${user.role})`,
        ip_address: req.ip || req.connection.remoteAddress,
        user_agent: req.headers['user-agent'] || 'Unknown',
        status: 'SUCCESS',
        created_at: new Date()
      });
    } catch (err) {}

    // Return Spring Boot contract compatible JwtResponse
    return res.status(200).json({
      accessToken,
      refreshToken,
      tokenType: 'Bearer',
      expiresIn: env.JWT_EXPIRES_IN_MS,
      userId: user.id,
      email: user.email,
      fullName: user.full_name,
      registrationNumber: user.registration_number,
      role: normalizeRole(user.role),
      isActive: Boolean(user.is_active),
      department: user.department || (student ? student.department : null),
      faculty: user.college || (student ? student.faculty : null),
      college: user.college || (student ? student.college : null),
      programme: user.programme || (student ? student.programme : null),
      award: user.award || (student ? student.award : null),
      isPostgraduate: isPostgraduateRecord({
        isPostgraduate: user.is_postgraduate || (student ? student.is_postgraduate : false),
        award: user.award || (student ? student.award : null),
        programme: user.programme || (student ? student.programme : null)
      }),
      undergraduateCertificateUrl: student ? (student.undergraduate_certificate_url || null) : null,
      stationCode: user.station_code || null,
      stationName: user.station_name || null,
      photo: user.photo || (student ? student.photo : null)
    });
  } catch (err) {
    next(err);
  }
}

// POST /api/v1/auth/register
// Self-registration is strictly restricted to students only.
async function register(req, res, next) {
  try {
    const {
      firstName,
      middleName,
      lastName,
      email,
      password,
      registrationNumber,
      college,
      department,
      programme,
      phone,
      yearOfStudy,
      award,
      isPostgraduate,
      role,
      roles,
      honeypotTrap
    } = req.body;

    // Honeypot check
    if (honeypotTrap && typeof honeypotTrap === 'string' && honeypotTrap.trim().length > 0) {
      return res.status(403).json({
        success: false,
        status: 403,
        error: 'Forbidden',
        message: 'Security policy trigger: Automated form submission detected.'
      });
    }

    // CRITICAL SECURITY RULE: Block privilege escalation attempts.
    // Self-registration cannot assign any role other than STUDENT.
    const requestedRole = role || (Array.isArray(roles) && roles.length > 0 ? roles[0] : null);
    if (requestedRole) {
      const normalizedRequested = normalizeRole(requestedRole);
      if (normalizedRequested !== ROLES.STUDENT && normalizedRequested !== 'STUDENT') {
        return res.status(403).json({
          success: false,
          status: 403,
          error: 'PrivilegeEscalationAttempt',
          message: 'Self-registration is strictly restricted to students. Privileged staff and administrative accounts must be provisioned by a System Administrator.'
        });
      }
    }

    // Validate required fields
    if (!firstName || !lastName || !email || !password || !registrationNumber) {
      return res.status(400).json({
        success: false,
        status: 400,
        error: 'BadRequest',
        message: 'First name, last name, email, password, and registration number are required.'
      });
    }

    // Validate password complexity
    const passwordValidation = validatePasswordStrength(password);
    if (!passwordValidation.valid) {
      return res.status(400).json({
        success: false,
        status: 400,
        error: 'WeakPassword',
        message: passwordValidation.message
      });
    }

    const cleanEmail = email.trim().toLowerCase();
    const cleanRegNo = registrationNumber.trim().toUpperCase();

    // Check if email already registered
    const existingEmail = await db('users').whereRaw('LOWER(email) = ?', [cleanEmail]).first();
    if (existingEmail) {
      return res.status(409).json({
        success: false,
        status: 409,
        error: 'Conflict',
        message: 'Email address is already registered.'
      });
    }

    // Check if registration number already registered
    const existingReg = await db('users').where({ registration_number: cleanRegNo }).first();
    if (existingReg) {
      return res.status(409).json({
        success: false,
        status: 409,
        error: 'Conflict',
        message: 'Registration number already exists.'
      });
    }

    const hashedPassword = await hashPassword(password);
    const userId = crypto.randomUUID();
    const studentId = crypto.randomUUID();
    const now = new Date();

    const fullName = `${firstName.trim()} ${middleName ? middleName.trim() + ' ' : ''}${lastName.trim()}`.trim();
    const resolvedIsPostgrad = isPostgraduateRecord({ isPostgraduate, award, programme }) ? 1 : 0;

    // Insert user row
    await db('users').insert({
      id: userId,
      username: cleanEmail,
      email: cleanEmail,
      password: hashedPassword,
      full_name: fullName,
      first_name: firstName.trim(),
      middle_name: middleName ? middleName.trim() : null,
      last_name: lastName.trim(),
      registration_number: cleanRegNo,
      programme: programme || null,
      college: college || null,
      department: department || null,
      phone_number: phone || null,
      year_of_study: yearOfStudy || null,
      award: award || null,
      is_postgraduate: resolvedIsPostgrad,
      role: ROLES.STUDENT,
      is_active: 1,
      is_email_verified: 1,
      created_at: now,
      updated_at: now
    });

    // Insert linked student row
    await db('students').insert({
      id: studentId,
      registration_number: cleanRegNo,
      full_name: fullName,
      email: cleanEmail,
      phone_number: phone || null,
      programme: programme || null,
      faculty: college || null,
      college: college || null,
      department: department || null,
      year_of_study: yearOfStudy || null,
      award: award || null,
      is_postgraduate: resolvedIsPostgrad,
      user_id: userId,
      is_final_year: 1,
      clearance_status: 'PENDING',
      created_at: now,
      updated_at: now
    });

    // Audit log
    try {
      await db('audit_logs').insert({
        id: crypto.randomUUID(),
        user_id: userId,
        username: cleanEmail,
        action: 'REGISTER_STUDENT',
        details: `Student self-registration completed for ${cleanRegNo} (${cleanEmail})`,
        ip_address: req.ip || req.connection.remoteAddress,
        user_agent: req.headers['user-agent'] || 'Unknown',
        status: 'SUCCESS',
        created_at: now
      });
    } catch (err) {}

    // Generate session and tokens for immediate seamless login
    const sessionId = await createUserSession({
      userId,
      deviceInfo: req.headers['user-agent'] || 'Unknown',
      ipAddress: req.ip || req.connection.remoteAddress
    });
    const newUser = { id: userId, email: cleanEmail, username: cleanEmail, role: ROLES.STUDENT, registration_number: cleanRegNo };
    const accessToken = generateAccessToken(newUser, sessionId);
    const { refreshToken } = await generateAndSaveRefreshToken(newUser, sessionId);

    // Non-blocking welcome email
    EmailService.dispatchAsync(() =>
      EmailService.sendWelcomeEmail(cleanEmail, {
        name: fullName,
        email: cleanEmail,
        registrationNumber: cleanRegNo
      })
    );

    return res.status(201).json({
      success: true,
      status: 201,
      message: 'Registration successful. You can now login with your credentials.',
      token: accessToken,
      refreshToken,
      user: {
        id: userId,
        email: cleanEmail,
        fullName,
        registrationNumber: cleanRegNo,
        role: ROLES.STUDENT
      }
    });
  } catch (err) {
    next(err);
  }
}

// POST /api/v1/auth/refresh
async function refresh(req, res, next) {
  try {
    const refreshToken = req.body?.refreshToken || req.query?.refreshToken;

    if (!refreshToken) {
      return res.status(400).json({
        success: false,
        status: 400,
        error: 'BadRequest',
        message: 'Refresh token is required.'
      });
    }

    try {
      const result = await rotateRefreshToken(refreshToken);
      return res.status(200).json({
        success: true,
        accessToken: result.token,
        token: result.token,
        refreshToken: result.refreshToken,
        tokenType: 'Bearer',
        expiresIn: env.JWT_EXPIRES_IN_MS
      });
    } catch (tokenErr) {
      if (tokenErr.name === 'TokenReuseBreachError') {
        return res.status(401).json({
          success: false,
          status: 401,
          error: 'SecurityBreach',
          message: 'Refresh token reuse detected. All active sessions in this chain have been revoked.'
        });
      }
      return res.status(401).json({
        success: false,
        status: 401,
        error: 'InvalidToken',
        message: tokenErr.message || 'Invalid or expired refresh token.'
      });
    }
  } catch (err) {
    next(err);
  }
}

// POST /api/v1/auth/logout
// Supports targeted session logout (revokes current access token + specified refresh token)
// as well as global logout (allDevices: true) across all user sessions.
async function logout(req, res, next) {
  try {
    let token = null;
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7).trim();
      await revokeAccessToken(token, 'logout');
    }

    const { refreshToken, allDevices } = req.body || {};

    if (refreshToken) {
      await revokeRefreshToken(refreshToken, 'logout');
    }

    if (req.user && req.user.id) {
      if (allDevices) {
        // Global logout requested: revokes all user sessions and refresh tokens across all devices
        await revokeAllUserSessions(req.user.id, 'global_logout');
      } else if (token) {
        try {
          const decoded = jwt.decode(token);
          if (decoded && decoded.sessionId) {
            await revokeSession(decoded.sessionId, 'logout');
          }
        } catch (e) {}
      }

      try {
        await db('audit_logs').insert({
          id: crypto.randomUUID(),
          user_id: req.user.id,
          username: req.user.username || req.user.email,
          action: 'LOGOUT',
          details: `User logged out [${allDevices ? 'ALL_DEVICES' : 'CURRENT_SESSION'}]: ${req.user.email}`,
          ip_address: req.ip || req.connection.remoteAddress,
          user_agent: req.headers['user-agent'] || 'Unknown',
          status: 'SUCCESS',
          created_at: new Date()
        });
      } catch (err) {}
    }

    return res.status(200).json({
      success: true,
      message: 'Logged out successfully.'
    });
  } catch (err) {
    next(err);
  }
}

// GET /api/v1/auth/profile
async function getProfile(req, res, next) {
  try {
    const profile = await db('vw_student_profiles')
      .where({ user_id: req.user.id })
      .first();

    if (!profile) {
      const user = await db('users').where({ id: req.user.id }).first();
      if (!user) {
        return res.status(404).json({
          success: false,
          status: 404,
          error: 'NotFound',
          message: 'User profile not found.'
        });
      }
      return res.status(200).json(sanitizeUser(user));
    }

    return res.status(200).json(profile);
  } catch (err) {
    next(err);
  }
}

// PUT /api/v1/auth/profile
async function updateProfile(req, res, next) {
  try {
    const allowedFields = [
      'phoneNumber',
      'address',
      'physicalAddress',
      'hall',
      'wing',
      'block',
      'roomNumber',
      'sponsor',
      'photo'
    ];

    const updates = {};
    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        const dbCol = field.replace(/([A-Z])/g, '_$1').toLowerCase();
        updates[dbCol] = req.body[field];
      }
    }

    // Explicitly reject prohibited modifications
    delete updates.id;
    delete updates.email;
    delete updates.username;
    delete updates.role;
    delete updates.registration_number;
    delete updates.password;

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({
        success: false,
        status: 400,
        error: 'BadRequest',
        message: 'No valid updatable fields provided.'
      });
    }

    updates.updated_at = new Date();

    await db('users').where({ id: req.user.id }).update(updates);

    if (req.user.role === ROLES.STUDENT) {
      const studentUpdates = {};
      if (updates.phone_number !== undefined) studentUpdates.phone_number = updates.phone_number;
      if (updates.photo !== undefined) studentUpdates.photo = updates.photo;
      if (Object.keys(studentUpdates).length > 0) {
        studentUpdates.updated_at = new Date();
        await db('students').where({ user_id: req.user.id }).update(studentUpdates);
      }
    }

    const updatedUser = await db('users').where({ id: req.user.id }).first();

    // Non-blocking profile update confirmation email
    if (updatedUser && updatedUser.email) {
      EmailService.dispatchAsync(() =>
        EmailService.sendProfileUpdatedEmail(updatedUser.email, {
          name: updatedUser.full_name || updatedUser.username,
          deviceInfo: req.headers['user-agent'] || 'Web Browser',
          clientIp: req.ip || req.connection?.remoteAddress || 'Unknown'
        })
      );
    }

    return res.status(200).json({
      success: true,
      message: 'Profile updated successfully.',
      user: sanitizeUser(updatedUser)
    });
  } catch (err) {
    next(err);
  }
}

// POST /api/v1/auth/change-password
async function changePassword(req, res, next) {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        status: 400,
        error: 'BadRequest',
        message: 'Current password and new password are required.'
      });
    }

    const passwordValidation = validatePasswordStrength(newPassword);
    if (!passwordValidation.valid) {
      return res.status(400).json({
        success: false,
        status: 400,
        error: 'WeakPassword',
        message: passwordValidation.message
      });
    }

    const user = await db('users').where({ id: req.user.id }).first();
    const isCurrentValid = await verifyPassword(currentPassword, user.password);

    if (!isCurrentValid) {
      return res.status(401).json({
        success: false,
        status: 401,
        error: 'InvalidCurrentPassword',
        message: 'Current password is incorrect.'
      });
    }

    const newHashedPassword = await hashPassword(newPassword);

    await db('users').where({ id: req.user.id }).update({
      password: newHashedPassword,
      updated_at: new Date()
    });

    // Invalidate all existing refresh sessions for this user
    await revokeAllUserSessions(user.id);

    try {
      await db('audit_logs').insert({
        id: crypto.randomUUID(),
        user_id: user.id,
        username: user.username,
        action: 'PASSWORD_CHANGE',
        details: 'User password changed successfully; sessions revoked',
        ip_address: req.ip || req.connection.remoteAddress,
        user_agent: req.headers['user-agent'] || 'Unknown',
        status: 'SUCCESS',
        created_at: new Date()
      });
    } catch (err) {}

    // Non-blocking password changed notification email
    EmailService.dispatchAsync(() =>
      EmailService.sendPasswordChangedEmail(user.email, {
        name: user.full_name || user.username
      })
    );

    return res.status(200).json({
      success: true,
      message: 'Password changed successfully. Please log in with your new credentials.'
    });
  } catch (err) {
    next(err);
  }
}

// POST /api/v1/auth/reset-password
async function resetPassword(req, res, next) {
  try {
    const email = req.body?.email || req.query?.email;

    if (!email) {
      return res.status(400).json({
        success: false,
        status: 400,
        error: 'BadRequest',
        message: 'Email address is required.'
      });
    }

    const cleanEmail = email.trim().toLowerCase();
    const user = await db('users').whereRaw('LOWER(email) = ?', [cleanEmail]).first();

    let testToken = null;
    if (user) {
      // 256-bit cryptographically secure token
      const rawToken = crypto.randomBytes(32).toString('hex');
      const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
      const expiry = new Date(Date.now() + env.PASSWORD_RESET_TOKEN_EXPIRY_MS); // 60 minutes

      await db('users').where({ id: user.id }).update({
        reset_token: tokenHash,
        reset_token_expiry: expiry,
        updated_at: new Date()
      });

      // Non-blocking outbound SMTP dispatch (no-ops safely when SMTP is not configured)
      const resetLink = `${env.FRONTEND_URL}/reset-password?token=${encodeURIComponent(rawToken)}`;
      EmailService.dispatchAsync(() =>
        EmailService.sendPasswordResetEmail(user.email, {
          name: user.full_name || user.username,
          email: user.email,
          resetLink,
          expiryTime: '1 hour'
        })
      );

      // Raw token is strictly NEVER exposed in production or development environments.
      if (env.NODE_ENV === 'test') {
        testToken = rawToken;
      }
    }

    // Uniform response to prevent account enumeration without false dispatch claims
    const smtpReady = EmailService.isConfigured();
    const responsePayload = {
      success: true,
      message: smtpReady
        ? 'If an account exists for that email, a password reset link has been dispatched.'
        : 'Password reset request processed. Outbound email delivery is pending university SMTP service configuration.'
    };

    if (env.NODE_ENV === 'test' && testToken) {
      responsePayload._testResetToken = testToken;
    }

    return res.status(200).json(responsePayload);
  } catch (err) {
    next(err);
  }
}

// POST /api/v1/auth/reset-password/confirm
async function resetPasswordConfirm(req, res, next) {
  try {
    const token = req.body?.token || req.query?.token;
    const newPassword = req.body?.newPassword || req.query?.newPassword;

    if (!token || !newPassword) {
      return res.status(400).json({
        success: false,
        status: 400,
        error: 'BadRequest',
        message: 'Reset token and new password are required.'
      });
    }

    const passwordValidation = validatePasswordStrength(newPassword);
    if (!passwordValidation.valid) {
      return res.status(400).json({
        success: false,
        status: 400,
        error: 'WeakPassword',
        message: passwordValidation.message
      });
    }

    // Compute SHA-256 hash of submitted token to match database
    const tokenHash = crypto.createHash('sha256').update(token.trim()).digest('hex');

    const user = await db('users')
      .where({ reset_token: tokenHash })
      .andWhere('reset_token_expiry', '>', new Date())
      .first();

    if (!user) {
      return res.status(400).json({
        success: false,
        status: 400,
        error: 'InvalidToken',
        message: 'Invalid or expired password reset token.'
      });
    }

    const hashedPassword = await hashPassword(newPassword);

    // Enforce single-use: nullify reset_token and reset_token_expiry immediately
    await db('users').where({ id: user.id }).update({
      password: hashedPassword,
      reset_token: null,
      reset_token_expiry: null,
      updated_at: new Date()
    });

    // Invalidate all existing refresh sessions for this user
    await revokeAllUserSessions(user.id);

    return res.status(200).json({
      success: true,
      message: 'Password has been reset successfully. You can now login with your new password.'
    });
  } catch (err) {
    next(err);
  }
}

// GET /api/v1/auth/profile/:userId
async function getUserProfile(req, res, next) {
  try {
    const { userId } = req.params;

    // Prevent horizontal privilege escalation (IDOR): students may only read their own profile
    if (req.user?.role === ROLES.STUDENT && String(req.user.id) !== String(userId)) {
      return res.status(403).json({
        success: false,
        status: 403,
        error: 'Forbidden',
        message: 'You are only authorized to view your own profile.'
      });
    }

    const user = await db('users').where({ id: userId }).first();
    if (!user) {
      return res.status(404).json({
        success: false,
        status: 404,
        error: 'NotFound',
        message: 'User not found.'
      });
    }

    let student = null;
    if (user.registration_number) {
      student = await db('students')
        .where({ registration_number: user.registration_number })
        .orWhere({ user_id: user.id })
        .first();
    } else {
      student = await db('students').where({ user_id: user.id }).first();
    }

    return res.status(200).json({
      ...sanitizeUser(user),
      id: user.id,
      username: user.username,
      email: user.email,
      fullName: user.full_name,
      firstName: user.first_name,
      middleName: user.middle_name,
      lastName: user.last_name,
      registrationNumber: user.registration_number,
      role: normalizeRole(user.role),
      isActive: Boolean(user.is_active),
      phoneNumber: user.phone_number || (student ? student.phone_number : null),
      department: user.department || (student ? student.department : null),
      college: user.college || (student ? student.college : null),
      programme: user.programme || (student ? student.programme : null),
      hall: user.hall || (student ? student.hall : null),
      wing: user.wing || (student ? student.wing : null),
      block: user.block || (student ? student.block : null),
      roomNumber: user.room_number || (student ? student.room_number : null),
      sponsor: user.sponsor || (student ? student.sponsor : null),
      photo: user.photo || (student ? student.photo : null),
      academicYear: user.academic_year || (student ? student.academic_year : null),
      graduationYear: user.graduation_year || (student ? student.graduation_year : null),
      semester: user.semester || (student ? student.semester : null),
      stationCode: user.station_code || null,
      stationName: user.station_name || null,
      lastLogin: user.last_login,
      createdAt: user.created_at,
      updatedAt: user.updated_at,
      clearanceStatus: student ? student.clearance_status : null,
      isFinalYear: student ? Boolean(student.is_final_year) : false
    });
  } catch (err) {
    next(err);
  }
}

// PUT /api/v1/auth/activate/:userId
async function activateAccount(req, res, next) {
  try {
    const { userId } = req.params;
    const user = await db('users').where({ id: userId }).first();
    if (!user) {
      return res.status(404).json({
        success: false,
        status: 404,
        error: 'NotFound',
        message: 'User not found.'
      });
    }

    const now = new Date();
    await db('users').where({ id: user.id }).update({
      is_active: 1,
      is_email_verified: 1,
      updated_at: now
    });

    const student = user.registration_number
      ? await db('students').where({ registration_number: user.registration_number }).first()
      : await db('students').where({ user_id: user.id }).first();

    if (student) {
      await db('students').where({ id: student.id }).update({ updated_at: now });
    }

    try {
      await db('audit_logs').insert({
        id: crypto.randomUUID(),
        user_id: req.user?.id || null,
        username: req.user?.username || req.user?.email || 'ADMINISTRATOR',
        action: 'ACTIVATE_ACCOUNT',
        details: `Account activated for: ${user.email}`,
        ip_address: req.ip || req.connection?.remoteAddress || null,
        user_agent: req.headers['user-agent'] || 'Unknown',
        status: 'SUCCESS',
        created_at: now
      });
    } catch (err) {}

    await NotificationService.sendNotification({
      userId: user.id,
      studentId: student ? student.id : null,
      title: 'Account Activated',
      message: 'Your account has been activated. You can now login to SmartClearance UDSM.',
      type: 'SYSTEM'
    });

    EmailService.dispatchAsync(() =>
      EmailService.sendAccountActivatedEmail(user.email, {
        name: user.full_name || user.username
      })
    );

    return res.status(200).json({
      success: true,
      message: 'Account activated successfully'
    });
  } catch (err) {
    next(err);
  }
}

// PUT /api/v1/auth/deactivate/:userId
async function deactivateAccount(req, res, next) {
  try {
    const { userId } = req.params;
    const user = await db('users').where({ id: userId }).first();
    if (!user) {
      return res.status(404).json({
        success: false,
        status: 404,
        error: 'NotFound',
        message: 'User not found.'
      });
    }

    const now = new Date();
    await db('users').where({ id: user.id }).update({
      is_active: 0,
      updated_at: now
    });

    await revokeAllUserSessions(user.id, 'account_deactivated');

    try {
      await db('audit_logs').insert({
        id: crypto.randomUUID(),
        user_id: req.user?.id || null,
        username: req.user?.username || req.user?.email || 'ADMINISTRATOR',
        action: 'DEACTIVATE_ACCOUNT',
        details: `Account deactivated for: ${user.email}`,
        ip_address: req.ip || req.connection?.remoteAddress || null,
        user_agent: req.headers['user-agent'] || 'Unknown',
        status: 'SUCCESS',
        created_at: now
      });
    } catch (err) {}

    return res.status(200).json({
      success: true,
      message: 'Account deactivated successfully'
    });
  } catch (err) {
    next(err);
  }
}

// POST /api/v1/auth/verify-email
async function verifyEmail(req, res, next) {
  try {
    const rawToken = req.body?.token || req.query?.token;
    if (!rawToken || !String(rawToken).trim()) {
      return res.status(400).json({
        success: false,
        status: 400,
        error: 'BadRequest',
        message: 'Verification token is required.'
      });
    }

    const token = String(rawToken).trim();
    const now = new Date();

    const user = await db('users')
      .where({ verification_token: token })
      .andWhere('verification_token_expiry', '>', now)
      .first();

    if (!user) {
      return res.status(400).json({
        success: false,
        status: 400,
        error: 'InvalidToken',
        message: 'This verification link is invalid or has expired. Request a new verification email.'
      });
    }

    await db('users').where({ id: user.id }).update({
      is_email_verified: 1,
      is_active: 1,
      verification_token: null,
      verification_token_expiry: null,
      updated_at: now
    });

    try {
      await db('audit_logs').insert({
        id: crypto.randomUUID(),
        user_id: user.id,
        username: user.username || user.email,
        action: 'VERIFY_EMAIL',
        details: `Email verified and account activated: ${user.email}`,
        ip_address: req.ip || req.connection?.remoteAddress || null,
        user_agent: req.headers['user-agent'] || 'Unknown',
        status: 'SUCCESS',
        created_at: now
      });
    } catch (err) {}

    return res.status(200).json({
      success: true,
      message: 'Email verified successfully. Your account is now active and ready to use.'
    });
  } catch (err) {
    next(err);
  }
}

// POST /api/v1/auth/resend-verification
async function resendVerificationEmail(req, res, next) {
  try {
    const rawEmail = req.body?.email || req.query?.email;
    if (!rawEmail || !String(rawEmail).trim()) {
      return res.status(400).json({
        success: false,
        status: 400,
        error: 'BadRequest',
        message: 'Email is required.'
      });
    }

    const cleanEmail = String(rawEmail).trim().toLowerCase();
    const user = await db('users').whereRaw('LOWER(email) = ?', [cleanEmail]).first();

    if (!user) {
      return res.status(404).json({
        success: false,
        status: 404,
        error: 'NotFound',
        message: 'User not found.'
      });
    }

    if (user.is_email_verified) {
      return res.status(200).json({
        success: true,
        message: 'This email address is already verified.'
      });
    }

    const verificationToken = crypto.randomUUID();
    const now = new Date();
    const expiry = new Date(Date.now() + 48 * 60 * 60 * 1000); // 48 hours

    await db('users').where({ id: user.id }).update({
      verification_token: verificationToken,
      verification_token_expiry: expiry,
      updated_at: now
    });

    const verificationLink = `${env.FRONTEND_URL}/verify-email?token=${encodeURIComponent(verificationToken)}`;
    EmailService.dispatchAsync(() =>
      EmailService.sendVerificationEmail(user.email, {
        name: user.full_name || user.username,
        verificationLink
      })
    );

    const responsePayload = {
      success: true,
      message: 'Verification email sent successfully'
    };

    if (env.NODE_ENV === 'test') {
      responsePayload._testVerificationToken = verificationToken;
    }

    return res.status(200).json(responsePayload);
  } catch (err) {
    next(err);
  }
}

// Helper: sanitize user object
function sanitizeUser(user) {
  const { password, reset_token, reset_token_expiry, verification_token, verification_token_expiry, ...safe } = user;
  return safe;
}

module.exports = {
  login,
  register,
  refresh,
  logout,
  getProfile,
  getUserProfile,
  updateProfile,
  activateAccount,
  deactivateAccount,
  verifyEmail,
  resendVerificationEmail,
  changePassword,
  resetPassword,
  resetPasswordConfirm,
  validatePasswordStrength
};
