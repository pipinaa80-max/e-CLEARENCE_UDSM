const fs = require('fs');
const path = require('path');
const nodemailer = require('nodemailer');
const env = require('../config/env');

const TEMPLATES_DIR = path.resolve(__dirname, '../templates/email');
const templateCache = new Map();

let customTransporter = null;
let cachedSmtpTransporter = null;
let cachedSmtpKey = null;

function escapeHtml(value) {
  if (value === null || value === undefined) return '';
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function formatTimestamp(date = new Date()) {
  const d = date instanceof Date ? date : new Date(date);
  return Number.isNaN(d.getTime()) ? String(date) : d.toISOString().replace('T', ' ').substring(0, 19) + ' UTC';
}

function loadTemplateRaw(templateName) {
  const cleanName = String(templateName).replace(/\.html$/i, '').replace(/[^a-zA-Z0-9_-]/g, '');
  if (templateCache.has(cleanName)) {
    return templateCache.get(cleanName);
  }
  const filePath = path.join(TEMPLATES_DIR, `${cleanName}.html`);
  const content = fs.readFileSync(filePath, 'utf8');
  templateCache.set(cleanName, content);
  return content;
}

class EmailService {
  /**
   * Inject a custom Nodemailer-compatible transporter (used in tests or custom mail gateways).
   */
  static setTransporter(transporter) {
    customTransporter = transporter;
  }

  /**
   * Reset any injected or cached transporter back to default env-driven behavior.
   */
  static resetTransporter() {
    customTransporter = null;
    cachedSmtpTransporter = null;
    cachedSmtpKey = null;
  }

  /**
   * Returns true if SMTP is configured or a custom transporter is injected.
   */
  static isConfigured() {
    if (customTransporter) return true;
    const host = (env.SMTP_HOST || '').trim();
    const user = (env.SMTP_USER || '').trim();
    return Boolean(host && user);
  }

  /**
   * Lazily resolve the active transporter, or null when unconfigured.
   */
  static getTransporter() {
    if (customTransporter) return customTransporter;
    if (!this.isConfigured()) return null;

    const smtpKey = `${env.SMTP_HOST}|${env.SMTP_PORT}|${env.SMTP_SECURE}|${env.SMTP_USER}`;
    if (cachedSmtpTransporter && cachedSmtpKey === smtpKey) {
      return cachedSmtpTransporter;
    }

    cachedSmtpTransporter = nodemailer.createTransport({
      host: env.SMTP_HOST,
      port: env.SMTP_PORT,
      secure: env.SMTP_SECURE,
      auth: {
        user: env.SMTP_USER,
        pass: env.SMTP_PASS
      }
    });
    cachedSmtpKey = smtpKey;
    return cachedSmtpTransporter;
  }

  /**
   * Render one of the 8 HTML templates in src/templates/email/ with safe HTML escaping.
   */
  static renderTemplate(templateName, variables = {}) {
    let html = loadTemplateRaw(templateName);

    const ctx = {
      appName: env.APP_NAME,
      frontendUrl: env.FRONTEND_URL,
      currentYear: new Date().getFullYear(),
      ...variables
    };

    // Process {{#eq key "VALUE"}}...{{/eq}} blocks
    html = html.replace(/\{\{#eq\s+(\w+)\s+"([^"]*)"\}\}([\s\S]*?)\{\{\/eq\}\}/g, (_, key, expected, inner) => {
      const actual = ctx[key] !== undefined && ctx[key] !== null ? String(ctx[key]) : '';
      return actual === expected ? inner : '';
    });

    // Process {{#if key}}...{{/if}} blocks
    html = html.replace(/\{\{#if\s+(\w+)\}\}([\s\S]*?)\{\{\/if\}\}/g, (_, key, inner) => {
      const val = ctx[key];
      const truthy = Boolean(val && String(val).trim() !== '');
      return truthy ? inner : '';
    });

    // Replace {{key}} placeholders with HTML-escaped values
    html = html.replace(/\{\{(\w+)\}\}/g, (_, key) => escapeHtml(ctx[key]));

    return html;
  }

  /**
   * Low-level HTML email dispatch. Never throws — always resolves cleanly.
   */
  static async sendHtmlEmail({ to, subject, html, cc = null, bcc = null, attachments = null }) {
    const recipient = Array.isArray(to) ? to.filter(Boolean) : (to ? String(to).trim() : '');
    if (!recipient || (Array.isArray(recipient) && recipient.length === 0)) {
      return { sent: false, skipped: true, reason: 'No recipient address provided' };
    }

    const transporter = this.getTransporter();
    if (!transporter) {
      if (env.NODE_ENV !== 'test') {
        console.warn(`[EmailService] SMTP not configured; skipping email "${subject}" to ${Array.isArray(recipient) ? recipient.join(', ') : recipient}`);
      }
      return { sent: false, skipped: true, reason: 'SMTP not configured' };
    }

    try {
      const mailOptions = {
        from: env.SMTP_FROM,
        to: recipient,
        subject,
        html
      };
      if (cc) mailOptions.cc = cc;
      if (bcc) mailOptions.bcc = bcc;
      if (attachments && attachments.length > 0) mailOptions.attachments = attachments;

      const info = await transporter.sendMail(mailOptions);
      return {
        sent: true,
        skipped: false,
        messageId: info?.messageId || null
      };
    } catch (err) {
      console.error(`[EmailService] Failed to send email "${subject}" to ${Array.isArray(recipient) ? recipient.join(', ') : recipient}:`, err.message);
      return {
        sent: false,
        skipped: false,
        error: err.message
      };
    }
  }

  /**
   * Render a named template and dispatch via sendHtmlEmail.
   */
  static async sendTemplatedEmail({ to, subject, templateName, variables = {}, attachments = null }) {
    try {
      const html = this.renderTemplate(templateName, variables);
      return await this.sendHtmlEmail({ to, subject, html, attachments });
    } catch (err) {
      console.error(`[EmailService] Failed to render/send template "${templateName}":`, err.message);
      return { sent: false, skipped: false, error: err.message };
    }
  }

  /**
   * Send an HTML email with a binary attachment (e.g., PDF clearance certificate).
   */
  static async sendEmailWithAttachment({
    to,
    subject,
    html,
    attachmentData,
    attachmentType = 'application/pdf',
    attachmentName = 'attachment.pdf'
  }) {
    const attachments = attachmentData && attachmentData.length > 0
      ? [{ filename: attachmentName, content: attachmentData, contentType: attachmentType }]
      : null;

    return this.sendHtmlEmail({ to, subject, html, attachments });
  }

  // =========================================================================
  // DOMAIN BUSINESS METHODS (MIRRORING SPRING BOOT EmailService)
  // =========================================================================

  static async sendWelcomeEmail(to, { name = 'User', email = to, registrationNumber = 'N/A' } = {}) {
    return this.sendTemplatedEmail({
      to,
      subject: `Welcome to ${env.APP_NAME}`,
      templateName: 'welcome',
      variables: { name, email, registrationNumber }
    });
  }

  static async sendVerificationEmail(to, { name = 'User', verificationLink = env.FRONTEND_URL } = {}) {
    return this.sendTemplatedEmail({
      to,
      subject: `Verify Your Email - ${env.APP_NAME}`,
      templateName: 'verify-email',
      variables: { name, verificationLink }
    });
  }

  static async sendAccountActivatedEmail(to, { name = 'User', activationTime = formatTimestamp() } = {}) {
    return this.sendTemplatedEmail({
      to,
      subject: `Account Activated - ${env.APP_NAME}`,
      templateName: 'account-activated',
      variables: { name, activationTime }
    });
  }

  static async sendLoginNotificationEmail(to, {
    name = 'User',
    loginTime = formatTimestamp(),
    deviceInfo = 'Web Browser',
    location = 'Unknown'
  } = {}) {
    return this.sendTemplatedEmail({
      to,
      subject: `New Login Alert - ${env.APP_NAME}`,
      templateName: 'login-notification',
      variables: { name, loginTime, deviceInfo, location }
    });
  }

  static async sendPasswordResetEmail(to, {
    name = 'User',
    email = to,
    resetLink = `${env.FRONTEND_URL}/reset-password`,
    expiryTime = '1 hour'
  } = {}) {
    return this.sendTemplatedEmail({
      to,
      subject: `Password Reset Request - ${env.APP_NAME}`,
      templateName: 'password-reset',
      variables: { name, email, resetLink, expiryTime }
    });
  }

  static async sendPasswordChangedEmail(to, { name = 'User', changeTime = formatTimestamp() } = {}) {
    return this.sendTemplatedEmail({
      to,
      subject: `Password Changed Successfully - ${env.APP_NAME}`,
      templateName: 'password-changed',
      variables: { name, changeTime }
    });
  }

  static async sendProfileUpdatedEmail(to, {
    name = 'User',
    updateTime = formatTimestamp(),
    deviceInfo = 'Web Browser',
    clientIp = 'Unknown'
  } = {}) {
    return this.sendTemplatedEmail({
      to,
      subject: `Profile Updated - ${env.APP_NAME}`,
      templateName: 'profile-updated',
      variables: { name, updateTime, deviceInfo, clientIp }
    });
  }

  static async sendClearanceUpdateEmail(student, status, department, comments = '') {
    if (!student) return { sent: false, skipped: true, reason: 'No student provided' };
    const recipientEmail = student.email || student.user?.email || null;
    if (!recipientEmail) {
      return { sent: false, skipped: true, reason: 'Student has no email address' };
    }

    const cleanStatus = status || 'UPDATED';
    const isOtherStatus = cleanStatus !== 'APPROVED' && cleanStatus !== 'REJECTED';

    return this.sendTemplatedEmail({
      to: recipientEmail,
      subject: `Clearance Update - ${env.APP_NAME}`,
      templateName: 'clearance-update',
      variables: {
        name: student.full_name || student.fullName || 'Student',
        registrationNumber: student.registration_number || student.registrationNumber || 'N/A',
        programme: student.programme || 'Academic Programme',
        status: cleanStatus,
        isOtherStatus: isOtherStatus ? '1' : '',
        department: department || 'Clearance Office',
        comments: comments || ''
      }
    });
  }

  static async sendClearanceCertificateEmail(student, certificateData, certificateName = 'clearance-certificate.pdf') {
    if (!student || !student.email) {
      return { sent: false, skipped: true, reason: 'Student email not available' };
    }

    const html = this.renderTemplate('clearance-update', {
      name: student.full_name || student.fullName || 'Student',
      registrationNumber: student.registration_number || student.registrationNumber || 'N/A',
      programme: student.programme || 'Academic Programme',
      status: 'APPROVED',
      isOtherStatus: '',
      department: 'Directorate of Undergraduate Studies',
      comments: 'Your official clearance certificate is attached to this email.'
    });

    return this.sendEmailWithAttachment({
      to: student.email,
      subject: `Your Clearance Certificate is Ready - ${env.APP_NAME}`,
      html,
      attachmentData: certificateData,
      attachmentType: 'application/pdf',
      attachmentName: certificateName
    });
  }

  /**
   * Fire-and-forget helper so HTTP routes never wait on or fail due to SMTP latency/errors.
   */
  static dispatchAsync(promiseFn) {
    Promise.resolve()
      .then(() => promiseFn())
      .catch((err) => {
        console.error('[EmailService.dispatchAsync] Suppressed async email error:', err.message);
      });
  }
}

module.exports = EmailService;
