const crypto = require('crypto');
const { db } = require('../config/database');
const cache = require('../utils/cache');

const ACTIVE_SPONSORS_CACHE_KEY = 'sponsors:active';

const DEFAULT_SPONSORS = [
  { id: 'spn-heslb', name: 'HESLB', code: 'HESLB', description: "Higher Education Students' Loans Board", isActive: true, is_active: true },
  { id: 'spn-karimjee', name: 'Karimjee Scholarships', code: 'KARIMJEE', description: 'Karimjee Jivanjee Foundation Scholarship', isActive: true, is_active: true },
  { id: 'spn-mo', name: 'MO scholarship', code: 'MO', description: 'Mo Dewji Foundation Scholarship', isActive: true, is_active: true },
  { id: 'spn-private', name: 'PRIVATE', code: 'PRIVATE', description: 'Self-sponsored / Private funding', isActive: true, is_active: true }
];

function formatSponsor(s) {
  return {
    id: s.id,
    name: s.name,
    code: s.code,
    description: s.description,
    isActive: Boolean(s.is_active),
    is_active: Boolean(s.is_active),
    createdAt: s.created_at,
    updatedAt: s.updated_at
  };
}

/**
 * GET /api/v1/sponsors
 * Public / authenticated dropdown of active sponsors for clearance forms
 */
async function getActiveSponsors(req, res, next) {
  try {
    const cached = cache.get(ACTIVE_SPONSORS_CACHE_KEY);
    if (cached) {
      return res.status(200).json(cached);
    }

    const sponsors = await db('sponsors')
      .where({ is_active: 1 })
      .orderBy('name', 'asc');

    if (!sponsors || sponsors.length === 0) {
      return res.status(200).json(DEFAULT_SPONSORS);
    }

    const formatted = sponsors.map(formatSponsor);
    cache.set(ACTIVE_SPONSORS_CACHE_KEY, formatted);
    return res.status(200).json(formatted);
  } catch (err) {
    // If DB is offline or table is uninitialized, return canonical defaults
    console.warn('⚠️ Could not load sponsors from database, returning defaults:', err.message);
    return res.status(200).json(DEFAULT_SPONSORS);
  }
}

/**
 * GET /api/v1/sponsors/all
 * Administrative list of all sponsors (active and inactive)
 */
async function getAllSponsors(req, res, next) {
  try {
    const sponsors = await db('sponsors')
      .orderBy('name', 'asc');

    if (!sponsors || sponsors.length === 0) {
      return res.status(200).json(DEFAULT_SPONSORS);
    }

    return res.status(200).json(sponsors.map(formatSponsor));
  } catch (err) {
    console.warn('⚠️ Could not load all sponsors from database, returning defaults:', err.message);
    return res.status(200).json(DEFAULT_SPONSORS);
  }
}

/**
 * POST /api/v1/sponsors
 * Create a new sponsor (Admin)
 */
async function createSponsor(req, res, next) {
  try {
    const { name, code, description, isActive, is_active } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({
        success: false,
        status: 400,
        error: 'BadRequest',
        message: 'Sponsor name is required.'
      });
    }

    const trimmedName = name.trim();
    const existing = await db('sponsors')
      .whereRaw('LOWER(name) = ?', [trimmedName.toLowerCase()])
      .first();

    if (existing) {
      return res.status(409).json({
        success: false,
        status: 409,
        error: 'Conflict',
        message: `A sponsor with name '${trimmedName}' already exists.`
      });
    }

    const sponsorId = `spn-${crypto.randomBytes(6).toString('hex')}`;
    const generatedCode = code && code.trim()
      ? code.trim().toUpperCase()
      : trimmedName.toUpperCase().replace(/[^A-Z0-9]/g, '_');

    const activeVal = (isActive !== undefined ? isActive : (is_active !== undefined ? is_active : true)) ? 1 : 0;

    await db('sponsors').insert({
      id: sponsorId,
      name: trimmedName,
      code: generatedCode,
      description: description ? description.trim() : null,
      is_active: activeVal,
      created_at: new Date(),
      updated_at: new Date()
    });

    const created = await db('sponsors').where({ id: sponsorId }).first();
    cache.clearPrefix('sponsors:');
    return res.status(201).json(formatSponsor(created));
  } catch (err) {
    next(err);
  }
}

/**
 * PUT /api/v1/sponsors/:id
 * Update sponsor details (Admin)
 */
async function updateSponsor(req, res, next) {
  try {
    const { id } = req.params;
    const { name, code, description, isActive, is_active } = req.body;

    const existing = await db('sponsors').where({ id }).first();
    if (!existing) {
      return res.status(404).json({
        success: false,
        status: 404,
        error: 'NotFound',
        message: 'Sponsor not found.'
      });
    }

    const updates = { updated_at: new Date() };

    if (name !== undefined && name.trim()) {
      const trimmedName = name.trim();
      const duplicate = await db('sponsors')
        .whereRaw('LOWER(name) = ?', [trimmedName.toLowerCase()])
        .whereNot({ id })
        .first();

      if (duplicate) {
        return res.status(409).json({
          success: false,
          status: 409,
          error: 'Conflict',
          message: `A sponsor with name '${trimmedName}' already exists.`
        });
      }
      updates.name = trimmedName;
    }

    if (code !== undefined) {
      updates.code = code ? code.trim().toUpperCase() : null;
    }

    if (description !== undefined) {
      updates.description = description ? description.trim() : null;
    }

    if (isActive !== undefined) {
      updates.is_active = isActive ? 1 : 0;
    } else if (is_active !== undefined) {
      updates.is_active = is_active ? 1 : 0;
    }

    await db('sponsors').where({ id }).update(updates);
    cache.clearPrefix('sponsors:');
    const updated = await db('sponsors').where({ id }).first();

    return res.status(200).json(formatSponsor(updated));
  } catch (err) {
    next(err);
  }
}

/**
 * DELETE /api/v1/sponsors/:id
 * Delete a sponsor (Admin)
 */
async function deleteSponsor(req, res, next) {
  try {
    const { id } = req.params;
    const existing = await db('sponsors').where({ id }).first();

    if (!existing) {
      return res.status(404).json({
        success: false,
        status: 404,
        error: 'NotFound',
        message: 'Sponsor not found.'
      });
    }

    await db('sponsors').where({ id }).del();
    cache.clearPrefix('sponsors:');
    return res.status(204).send();
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getActiveSponsors,
  getAllSponsors,
  createSponsor,
  updateSponsor,
  deleteSponsor,
  DEFAULT_SPONSORS
};
