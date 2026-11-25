const crypto = require('crypto');
const { getDb } = require('../config/database');
const cache = require('../utils/cache');

const ACTIVE_STATIONS_CACHE_KEY = 'stations:active';

function formatStation(row) {
  if (!row) return null;
  return {
    id: row.id,
    code: row.code,
    name: row.name,
    region: row.region,
    district: row.district || null,
    address: row.address,
    operatingHours: row.operating_hours || 'Mon - Fri: 08:00 - 16:00',
    contactPhone: row.contact_phone || null,
    contactEmail: row.contact_email || null,
    isActive: Boolean(row.is_active),
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

class CollectionStationService {
  static async getActiveStations() {
    const cached = cache.get(ACTIVE_STATIONS_CACHE_KEY);
    if (cached) return cached;

    const db = getDb();
    const rows = await db('collection_stations')
      .where({ is_active: 1 })
      .orderBy([
        { column: 'region', order: 'asc' },
        { column: 'name', order: 'asc' }
      ]);
    const formatted = rows.map(formatStation);
    cache.set(ACTIVE_STATIONS_CACHE_KEY, formatted);
    return formatted;
  }

  static async getAllStations() {
    const db = getDb();
    const rows = await db('collection_stations')
      .orderBy([
        { column: 'region', order: 'asc' },
        { column: 'name', order: 'asc' }
      ]);
    return rows.map(formatStation);
  }

  static async createStation(payload = {}) {
    const db = getDb();
    const code = payload.code ? String(payload.code).trim() : '';
    const name = payload.name ? String(payload.name).trim() : '';
    const region = payload.region ? String(payload.region).trim() : '';
    const address = payload.address ? String(payload.address).trim() : '';

    if (!code || !name || !region || !address) {
      const err = new Error('Station code, name, region, and address are required.');
      err.statusCode = 400;
      throw err;
    }

    const existing = await db('collection_stations')
      .whereRaw('LOWER(code) = ?', [code.toLowerCase()])
      .first();

    if (existing) {
      const err = new Error(`A collection station with code '${code}' already exists.`);
      err.statusCode = 409;
      throw err;
    }

    const id = payload.id && String(payload.id).trim() ? String(payload.id).trim() : crypto.randomUUID();
    const operatingHours = payload.operatingHours || payload.operating_hours || 'Mon - Fri: 08:00 - 16:00';
    const contactPhone = payload.contactPhone !== undefined ? payload.contactPhone : payload.contact_phone;
    const contactEmail = payload.contactEmail !== undefined ? payload.contactEmail : payload.contact_email;
    const activeInput = payload.isActive !== undefined ? payload.isActive : payload.is_active;
    const isActive = activeInput !== undefined ? (activeInput ? 1 : 0) : 1;
    const now = new Date();

    await db('collection_stations').insert({
      id,
      code,
      name,
      region,
      district: payload.district ? String(payload.district).trim() : null,
      address,
      operating_hours: String(operatingHours).trim(),
      contact_phone: contactPhone ? String(contactPhone).trim() : null,
      contact_email: contactEmail ? String(contactEmail).trim() : null,
      is_active: isActive,
      created_at: now,
      updated_at: now
    });

    const created = await db('collection_stations').where({ id }).first();
    cache.clearPrefix('stations:');
    return formatStation(created);
  }

  static async updateStation(id, payload = {}) {
    const db = getDb();
    const existing = await db('collection_stations').where({ id }).first();
    if (!existing) {
      return null;
    }

    const updates = { updated_at: new Date() };

    if (payload.code !== undefined && payload.code !== null && String(payload.code).trim()) {
      const cleanCode = String(payload.code).trim();
      const duplicate = await db('collection_stations')
        .whereRaw('LOWER(code) = ?', [cleanCode.toLowerCase()])
        .whereNot({ id })
        .first();
      if (duplicate) {
        const err = new Error(`A collection station with code '${cleanCode}' already exists.`);
        err.statusCode = 409;
        throw err;
      }
      updates.code = cleanCode;
    }

    if (payload.name !== undefined && payload.name !== null) {
      updates.name = String(payload.name).trim();
    }
    if (payload.region !== undefined && payload.region !== null) {
      updates.region = String(payload.region).trim();
    }
    if (payload.district !== undefined) {
      updates.district = payload.district !== null ? String(payload.district).trim() : null;
    }
    if (payload.address !== undefined && payload.address !== null) {
      updates.address = String(payload.address).trim();
    }

    const operatingHours = payload.operatingHours !== undefined ? payload.operatingHours : payload.operating_hours;
    if (operatingHours !== undefined && operatingHours !== null) {
      updates.operating_hours = String(operatingHours).trim();
    }

    const contactPhone = payload.contactPhone !== undefined ? payload.contactPhone : payload.contact_phone;
    if (contactPhone !== undefined) {
      updates.contact_phone = contactPhone !== null ? String(contactPhone).trim() : null;
    }

    const contactEmail = payload.contactEmail !== undefined ? payload.contactEmail : payload.contact_email;
    if (contactEmail !== undefined) {
      updates.contact_email = contactEmail !== null ? String(contactEmail).trim() : null;
    }

    const activeInput = payload.isActive !== undefined ? payload.isActive : payload.is_active;
    if (activeInput !== undefined && activeInput !== null) {
      updates.is_active = activeInput ? 1 : 0;
    }

    await db('collection_stations').where({ id }).update(updates);
    cache.clearPrefix('stations:');
    const updated = await db('collection_stations').where({ id }).first();
    return formatStation(updated);
  }

  static async deleteStation(id) {
    const db = getDb();
    const existing = await db('collection_stations').where({ id }).first();
    if (!existing) {
      return false;
    }

    await db('collection_stations').where({ id }).update({
      is_active: 0,
      updated_at: new Date()
    });
    cache.clearPrefix('stations:');
    return true;
  }
}

module.exports = CollectionStationService;
