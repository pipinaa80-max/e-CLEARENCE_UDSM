const { getDb } = require('../config/database');
const AuditService = require('../services/audit.service');

const DEFAULT_PROJECT_ID = 'default';

const CANONICAL_BRANDING = {
  universityName: 'University of Dar es Salaam',
  shortName: 'UDSM',
  logoUrl: '/udsm-logo.png',
  backgroundUrl: '/background.png',
  primaryColor: '#0864af',
  fontFamily: 'Segoe UI',
  projectId: DEFAULT_PROJECT_ID,
  footerLinks: []
};

const DEFAULT_DASHBOARDS = [
  { id: 'Convocation', name: 'Convocation Office', description: 'Convocation and Alumni Clearance', enabled: true },
  { id: 'Department', name: 'Academic Department', description: 'Departmental Head Clearance', enabled: true },
  { id: 'Dean of Students', name: 'Dean of Students', description: 'Student Affairs Clearance', enabled: true },
  { id: 'Library', name: 'University Library', description: 'Library Books and Equipment Return', enabled: true },
  { id: 'Finance', name: 'Bursar / Finance', description: 'Financial Obligations and Fees', enabled: true },
  { id: 'Principal', name: 'College Principal', description: 'College Executive Clearance', enabled: true },
  { id: 'Smart Card', name: 'Smart Card Unit', description: 'Student ID and Smart Card Clearance', enabled: true },
  { id: 'USAB', name: 'USAB', description: 'University Students Accommodation Bureau', enabled: true },
  { id: 'Hall Warden', name: 'Hall Warden', description: 'Hostel Accommodation Clearance', enabled: true },
  { id: 'Games Coach', name: 'Games Coach', description: 'Sports and Sports Equipment Clearance', enabled: true },
  { id: 'DARUSO', name: 'DARUSO', description: 'Student Government Clearance', enabled: true }
];

function safeParseJson(raw, fallback) {
  if (!raw) return fallback;
  try {
    const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
    return parsed ?? fallback;
  } catch (_) {
    return fallback;
  }
}

function resolveProjectId(req) {
  const fromUser = req?.user?.projectId ? String(req.user.projectId).trim() : '';
  return fromUser || DEFAULT_PROJECT_ID;
}

function mapRowToState(row, fallbackProjectId = DEFAULT_PROJECT_ID) {
  if (!row) {
    return {
      projectId: fallbackProjectId,
      branding: { ...CANONICAL_BRANDING, projectId: fallbackProjectId, footerLinks: [...CANONICAL_BRANDING.footerLinks] },
      dashboards: DEFAULT_DASHBOARDS.map(d => ({ ...d }))
    };
  }

  const footerLinks = safeParseJson(row.footer_links_json, []);
  const dashboards = safeParseJson(row.dashboards_json, DEFAULT_DASHBOARDS);

  return {
    projectId: row.project_id || fallbackProjectId,
    branding: {
      universityName: row.university_name || CANONICAL_BRANDING.universityName,
      shortName: row.short_name || CANONICAL_BRANDING.shortName,
      logoUrl: row.logo_url !== null && row.logo_url !== undefined ? row.logo_url : CANONICAL_BRANDING.logoUrl,
      backgroundUrl: row.background_url !== null && row.background_url !== undefined ? row.background_url : CANONICAL_BRANDING.backgroundUrl,
      primaryColor: row.primary_color || CANONICAL_BRANDING.primaryColor,
      fontFamily: row.font_family || CANONICAL_BRANDING.fontFamily,
      projectId: row.project_id || fallbackProjectId,
      footerLinks: Array.isArray(footerLinks) ? footerLinks : []
    },
    dashboards: Array.isArray(dashboards) && dashboards.length > 0
      ? dashboards
      : DEFAULT_DASHBOARDS.map(d => ({ ...d }))
  };
}

async function loadProjectSettings(projectId = DEFAULT_PROJECT_ID) {
  try {
    const db = getDb();
    let row = await db('project_settings').where({ project_id: projectId }).first();
    if (!row && projectId !== DEFAULT_PROJECT_ID) {
      row = await db('project_settings').where({ project_id: DEFAULT_PROJECT_ID }).first();
    }
    if (!row) {
      row = await db('project_settings').orderBy('updated_at', 'desc').first();
    }
    return mapRowToState(row, projectId);
  } catch (_) {
    // Graceful fallback if table is unseeded or DB is temporarily unreachable
    return mapRowToState(null, projectId);
  }
}

async function upsertProjectSettings(projectId, nextBranding, nextDashboards) {
  const db = getDb();
  const now = new Date();
  const record = {
    project_id: projectId,
    university_name: String(nextBranding.universityName || CANONICAL_BRANDING.universityName).trim(),
    short_name: String(nextBranding.shortName || CANONICAL_BRANDING.shortName).trim(),
    logo_url: nextBranding.logoUrl !== undefined ? String(nextBranding.logoUrl) : CANONICAL_BRANDING.logoUrl,
    background_url: nextBranding.backgroundUrl !== undefined ? String(nextBranding.backgroundUrl) : CANONICAL_BRANDING.backgroundUrl,
    primary_color: String(nextBranding.primaryColor || CANONICAL_BRANDING.primaryColor).trim(),
    font_family: String(nextBranding.fontFamily || CANONICAL_BRANDING.fontFamily).trim(),
    dashboards_json: JSON.stringify(nextDashboards),
    footer_links_json: JSON.stringify(Array.isArray(nextBranding.footerLinks) ? nextBranding.footerLinks : []),
    updated_at: now
  };

  const existing = await db('project_settings').where({ project_id: projectId }).first();
  if (existing) {
    await db('project_settings').where({ project_id: projectId }).update(record);
  } else {
    await db('project_settings').insert({
      ...record,
      created_at: now
    });
  }

  return mapRowToState(record, projectId);
}

exports.getPublicBranding = async (req, res) => {
  const state = await loadProjectSettings(DEFAULT_PROJECT_ID);
  return res.status(200).json(state.branding);
};

exports.getMyBranding = async (req, res) => {
  const state = await loadProjectSettings(resolveProjectId(req));
  return res.status(200).json(state.branding);
};

exports.getOverview = async (req, res) => {
  const state = await loadProjectSettings(resolveProjectId(req));
  return res.status(200).json({
    role: req.user?.role || 'INSTITUTIONAL_ADMIN',
    projectId: state.projectId,
    branding: state.branding,
    dashboards: state.dashboards,
    subAdmins: []
  });
};

exports.updateBranding = async (req, res, next) => {
  try {
    const projectId = resolveProjectId(req);
    const current = await loadProjectSettings(projectId);
    const body = req.body || {};

    const nextBranding = {
      ...current.branding,
      universityName: body.universityName !== undefined ? String(body.universityName).trim() : current.branding.universityName,
      shortName: body.shortName !== undefined ? String(body.shortName).trim() : current.branding.shortName,
      logoUrl: body.logoUrl !== undefined ? String(body.logoUrl).trim() : current.branding.logoUrl,
      backgroundUrl: body.backgroundUrl !== undefined ? String(body.backgroundUrl).trim() : current.branding.backgroundUrl,
      primaryColor: body.primaryColor !== undefined ? String(body.primaryColor).trim() : current.branding.primaryColor,
      fontFamily: body.fontFamily !== undefined ? String(body.fontFamily).trim() : current.branding.fontFamily,
      footerLinks: Array.isArray(body.footerLinks)
        ? body.footerLinks
            .filter(link => link && typeof link === 'object')
            .map(link => ({
              label: String(link.label || '').trim(),
              url: String(link.url || '').trim()
            }))
            .filter(link => link.label && link.url)
        : current.branding.footerLinks
    };

    const saved = await upsertProjectSettings(projectId, nextBranding, current.dashboards);

    await AuditService.logAction({
      userId: req.user?.id,
      username: req.user?.email || req.user?.username || 'ADMIN',
      action: 'UPDATE_PROJECT_BRANDING',
      details: `Updated branding for project '${projectId}' (${saved.branding.universityName}, ${saved.branding.primaryColor})`,
      ipAddress: req.ip || null,
      userAgent: req.headers['user-agent'] || null,
      projectId
    });

    return res.status(200).json(saved.branding);
  } catch (err) {
    return next(err);
  }
};

exports.createDashboard = async (req, res, next) => {
  try {
    const projectId = resolveProjectId(req);
    const id = req.body?.id ? String(req.body.id).trim() : '';
    const name = req.body?.name ? String(req.body.name).trim() : '';
    const description = req.body?.description ? String(req.body.description).trim() : '';

    if (!id || !name) {
      return res.status(400).json({
        success: false,
        status: 400,
        error: 'BadRequest',
        message: 'Dashboard ID and Name are required.'
      });
    }

    const current = await loadProjectSettings(projectId);
    if (current.dashboards.some(d => String(d.id).toLowerCase() === id.toLowerCase())) {
      return res.status(409).json({
        success: false,
        status: 409,
        error: 'Conflict',
        message: `Dashboard ID '${id}' already exists.`
      });
    }

    const created = {
      id,
      name,
      description,
      enabled: req.body?.enabled !== undefined ? Boolean(req.body.enabled) : true
    };
    const nextDashboards = [...current.dashboards, created];
    await upsertProjectSettings(projectId, current.branding, nextDashboards);

    await AuditService.logAction({
      userId: req.user?.id,
      username: req.user?.email || req.user?.username || 'ADMIN',
      action: 'CREATE_PROJECT_DASHBOARD',
      details: `Created institutional dashboard '${id}' (${name})`,
      ipAddress: req.ip || null,
      userAgent: req.headers['user-agent'] || null,
      projectId
    });

    return res.status(201).json(created);
  } catch (err) {
    return next(err);
  }
};

exports.updateDashboard = async (req, res, next) => {
  try {
    const projectId = resolveProjectId(req);
    const targetId = String(req.params.id || '').trim();
    const current = await loadProjectSettings(projectId);

    const idx = current.dashboards.findIndex(d => String(d.id) === targetId);
    if (idx === -1) {
      return res.status(404).json({
        success: false,
        status: 404,
        error: 'NotFound',
        message: `Dashboard '${targetId}' not found.`
      });
    }

    const updated = {
      ...current.dashboards[idx],
      name: req.body?.name !== undefined ? String(req.body.name).trim() : current.dashboards[idx].name,
      description: req.body?.description !== undefined ? String(req.body.description).trim() : current.dashboards[idx].description,
      enabled: req.body?.enabled !== undefined ? Boolean(req.body.enabled) : current.dashboards[idx].enabled
    };

    const nextDashboards = [...current.dashboards];
    nextDashboards[idx] = updated;
    await upsertProjectSettings(projectId, current.branding, nextDashboards);

    await AuditService.logAction({
      userId: req.user?.id,
      username: req.user?.email || req.user?.username || 'ADMIN',
      action: 'UPDATE_PROJECT_DASHBOARD',
      details: `Updated institutional dashboard '${targetId}' (enabled=${updated.enabled})`,
      ipAddress: req.ip || null,
      userAgent: req.headers['user-agent'] || null,
      projectId
    });

    return res.status(200).json(updated);
  } catch (err) {
    return next(err);
  }
};

exports.deleteDashboard = async (req, res, next) => {
  try {
    const projectId = resolveProjectId(req);
    const targetId = String(req.params.id || '').trim();
    const current = await loadProjectSettings(projectId);

    const nextDashboards = current.dashboards.filter(d => String(d.id) !== targetId);
    if (nextDashboards.length === current.dashboards.length) {
      return res.status(404).json({
        success: false,
        status: 404,
        error: 'NotFound',
        message: `Dashboard '${targetId}' not found.`
      });
    }

    await upsertProjectSettings(projectId, current.branding, nextDashboards);

    await AuditService.logAction({
      userId: req.user?.id,
      username: req.user?.email || req.user?.username || 'ADMIN',
      action: 'DELETE_PROJECT_DASHBOARD',
      details: `Deleted institutional dashboard '${targetId}'`,
      ipAddress: req.ip || null,
      userAgent: req.headers['user-agent'] || null,
      projectId
    });

    return res.status(200).json({ message: `Dashboard '${targetId}' deleted successfully.` });
  } catch (err) {
    return next(err);
  }
};
