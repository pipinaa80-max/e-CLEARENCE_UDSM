const crypto = require('crypto');
const { getDb } = require('../config/database');
const cache = require('../utils/cache');

const COLLEGES_CACHE_KEY = 'colleges:active';
const DEPARTMENTS_CACHE_KEY = 'departments:active';

function formatCollegeSummary(row) {
  if (!row) return null;
  return {
    id: row.id,
    code: row.code,
    name: row.name,
    description: row.description || null,
    isActive: Boolean(row.is_active),
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function formatDepartment(row, collegeSummary = undefined) {
  if (!row) return null;
  const formatted = {
    id: row.id,
    collegeId: row.college_id || null,
    code: row.code,
    name: row.name,
    description: row.description || null,
    isActive: Boolean(row.is_active),
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
  if (collegeSummary !== undefined) {
    formatted.college = collegeSummary;
  }
  return formatted;
}

class CollegeDepartmentService {
  static evictCache() {
    cache.clearPrefix('colleges:');
    cache.clearPrefix('departments:');
  }

  static async getAllColleges() {
    const cached = cache.get(COLLEGES_CACHE_KEY);
    if (cached) return cached;

    const db = getDb();
    const colleges = await db('colleges')
      .where({ is_active: 1 })
      .orderBy('name', 'asc');

    if (colleges.length === 0) {
      return [];
    }

    const collegeIds = colleges.map(c => c.id);
    const departments = await db('departments')
      .whereIn('college_id', collegeIds)
      .andWhere({ is_active: 1 })
      .orderBy('name', 'asc');

    const deptByCollege = {};
    for (const dept of departments) {
      if (!deptByCollege[dept.college_id]) {
        deptByCollege[dept.college_id] = [];
      }
      deptByCollege[dept.college_id].push(formatDepartment(dept));
    }

    const result = colleges.map(c => ({
      ...formatCollegeSummary(c),
      departments: deptByCollege[c.id] || []
    }));
    cache.set(COLLEGES_CACHE_KEY, result);
    return result;
  }

  static async getCollegeById(id) {
    const db = getDb();
    const college = await db('colleges').where({ id }).first();
    if (!college) {
      return null;
    }

    const departments = await db('departments')
      .where({ college_id: college.id, is_active: 1 })
      .orderBy('name', 'asc');

    return {
      ...formatCollegeSummary(college),
      departments: departments.map(d => formatDepartment(d))
    };
  }

  static async createCollege(payload = {}) {
    const db = getDb();
    const code = payload.code ? String(payload.code).trim() : '';
    const name = payload.name ? String(payload.name).trim() : '';

    if (!code || !name) {
      const err = new Error('College code and name are required.');
      err.statusCode = 400;
      throw err;
    }

    const existing = await db('colleges')
      .whereRaw('LOWER(code) = ?', [code.toLowerCase()])
      .first();

    if (existing) {
      const err = new Error(`A college with code '${code}' already exists.`);
      err.statusCode = 409;
      throw err;
    }

    const id = payload.id && String(payload.id).trim() ? String(payload.id).trim() : crypto.randomUUID();
    const activeInput = payload.isActive !== undefined ? payload.isActive : payload.is_active;
    const isActive = activeInput !== undefined ? (activeInput ? 1 : 0) : 1;
    const now = new Date();

    await db('colleges').insert({
      id,
      code,
      name,
      description: payload.description ? String(payload.description).trim() : null,
      is_active: isActive,
      created_at: now,
      updated_at: now
    });

    const created = await db('colleges').where({ id }).first();
    this.evictCache();
    return {
      ...formatCollegeSummary(created),
      departments: []
    };
  }

  static async updateCollege(id, payload = {}) {
    const db = getDb();
    const existing = await db('colleges').where({ id }).first();
    if (!existing) {
      return null;
    }

    const updates = { updated_at: new Date() };

    if (payload.code !== undefined && payload.code !== null && String(payload.code).trim()) {
      const cleanCode = String(payload.code).trim();
      const duplicate = await db('colleges')
        .whereRaw('LOWER(code) = ?', [cleanCode.toLowerCase()])
        .whereNot({ id })
        .first();
      if (duplicate) {
        const err = new Error(`A college with code '${cleanCode}' already exists.`);
        err.statusCode = 409;
        throw err;
      }
      updates.code = cleanCode;
    }

    if (payload.name !== undefined && payload.name !== null) {
      updates.name = String(payload.name).trim();
    }
    if (payload.description !== undefined) {
      updates.description = payload.description !== null ? String(payload.description).trim() : null;
    }

    const activeInput = payload.isActive !== undefined ? payload.isActive : payload.is_active;
    if (activeInput !== undefined && activeInput !== null) {
      updates.is_active = activeInput ? 1 : 0;
    }

    await db('colleges').where({ id }).update(updates);
    this.evictCache();
    return this.getCollegeById(id);
  }

  static async deleteCollege(id) {
    const db = getDb();
    const existing = await db('colleges').where({ id }).first();
    if (!existing) {
      return false;
    }

    await db('colleges').where({ id }).update({
      is_active: 0,
      updated_at: new Date()
    });
    this.evictCache();
    return true;
  }

  static async getAllDepartments() {
    const cached = cache.get(DEPARTMENTS_CACHE_KEY);
    if (cached) return cached;

    const db = getDb();
    const departments = await db('departments')
      .where({ is_active: 1 })
      .orderBy('name', 'asc');

    if (departments.length === 0) {
      return [];
    }

    const collegeIds = [...new Set(departments.map(d => d.college_id).filter(Boolean))];
    const colleges = collegeIds.length > 0
      ? await db('colleges').whereIn('id', collegeIds)
      : [];
    const collegeMap = {};
    for (const c of colleges) {
      collegeMap[c.id] = formatCollegeSummary(c);
    }

    const result = departments.map(d => formatDepartment(d, d.college_id ? (collegeMap[d.college_id] || null) : null));
    cache.set(DEPARTMENTS_CACHE_KEY, result);
    return result;
  }

  static async getDepartmentsByCollege(collegeId) {
    const db = getDb();
    const college = await db('colleges').where({ id: collegeId }).first();
    const collegeSummary = college ? formatCollegeSummary(college) : null;

    const departments = await db('departments')
      .where({ college_id: collegeId, is_active: 1 })
      .orderBy('name', 'asc');

    return departments.map(d => formatDepartment(d, collegeSummary));
  }

  static async createDepartment(collegeId, payload = {}) {
    const db = getDb();
    const college = await db('colleges').where({ id: collegeId }).first();
    if (!college) {
      return null;
    }

    const code = payload.code ? String(payload.code).trim() : '';
    const name = payload.name ? String(payload.name).trim() : '';

    if (!code || !name) {
      const err = new Error('Department code and name are required.');
      err.statusCode = 400;
      throw err;
    }

    const duplicate = await db('departments')
      .where({ college_id: collegeId })
      .andWhereRaw('LOWER(code) = ?', [code.toLowerCase()])
      .first();

    if (duplicate) {
      const err = new Error(`A department with code '${code}' already exists in college '${college.code}'.`);
      err.statusCode = 409;
      throw err;
    }

    const id = payload.id && String(payload.id).trim() ? String(payload.id).trim() : crypto.randomUUID();
    const activeInput = payload.isActive !== undefined ? payload.isActive : payload.is_active;
    const isActive = activeInput !== undefined ? (activeInput ? 1 : 0) : 1;
    const now = new Date();

    await db('departments').insert({
      id,
      college_id: collegeId,
      code,
      name,
      description: payload.description ? String(payload.description).trim() : null,
      is_active: isActive,
      created_at: now,
      updated_at: now
    });

    const created = await db('departments').where({ id }).first();
    this.evictCache();
    return formatDepartment(created, formatCollegeSummary(college));
  }

  static async updateDepartment(deptId, payload = {}) {
    const db = getDb();
    const existing = await db('departments').where({ id: deptId }).first();
    if (!existing) {
      return null;
    }

    const updates = { updated_at: new Date() };

    if (payload.code !== undefined && payload.code !== null && String(payload.code).trim()) {
      const cleanCode = String(payload.code).trim();
      const duplicate = await db('departments')
        .where({ college_id: existing.college_id })
        .andWhereRaw('LOWER(code) = ?', [cleanCode.toLowerCase()])
        .whereNot({ id: deptId })
        .first();
      if (duplicate) {
        const err = new Error(`A department with code '${cleanCode}' already exists in this college.`);
        err.statusCode = 409;
        throw err;
      }
      updates.code = cleanCode;
    }

    if (payload.name !== undefined && payload.name !== null) {
      updates.name = String(payload.name).trim();
    }
    if (payload.description !== undefined) {
      updates.description = payload.description !== null ? String(payload.description).trim() : null;
    }

    const activeInput = payload.isActive !== undefined ? payload.isActive : payload.is_active;
    if (activeInput !== undefined && activeInput !== null) {
      updates.is_active = activeInput ? 1 : 0;
    }

    await db('departments').where({ id: deptId }).update(updates);
    this.evictCache();
    const updated = await db('departments').where({ id: deptId }).first();
    const college = updated.college_id
      ? await db('colleges').where({ id: updated.college_id }).first()
      : null;

    return formatDepartment(updated, college ? formatCollegeSummary(college) : null);
  }
}

module.exports = CollegeDepartmentService;
