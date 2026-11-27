/**
 * Canonical UDSM College & Department Scope Matching Utility
 *
 * Shared across ClearanceService, AnalyticsService, DocumentService, and
 * StudentDebtService so acronym/full-name/catalog matching behaves identically
 * everywhere (e.g. "CoET" <-> "College of Engineering and Technology (CoET)").
 */

function escapeRegex(str) {
  return String(str).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function normalizeAcademicUnitString(raw) {
  if (!raw) return '';
  return String(raw)
    .toLowerCase()
    .trim()
    .replace(/&/g, ' and ')
    .replace(/^(department\s+of\s+|dept\.?\s+of\s+|department\s+|school\s+of\s+|college\s+of\s+|institute\s+of\s+)/i, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function generateInitials(norm) {
  if (!norm) return '';
  const stopWords = new Set(['and', 'of', 'in', 'the', 'for', 'dept', 'department', 'college', 'school', 'institute']);
  return norm
    .split(/\s+/)
    .filter(w => w && !stopWords.has(w))
    .map(w => w[0])
    .join('')
    .toLowerCase();
}

function extractAcronymOrInitials(raw, norm) {
  const parenMatch = String(raw || '').match(/\(([^)]+)\)/);
  if (parenMatch && parenMatch[1]) {
    return parenMatch[1].trim().toLowerCase();
  }
  if (norm && norm.length <= 6 && !norm.includes(' ')) {
    return norm;
  }
  return generateInitials(norm);
}

function isComputerScienceAlias(raw) {
  if (!raw) return false;
  const lower = String(raw).toLowerCase().trim();
  return (
    lower === 'cse' ||
    lower === 'cs' ||
    lower === 'docse' ||
    lower.includes('computer science') ||
    lower.includes('computer engineering')
  );
}

function matchesCatalogEntity(raw, norm, entity) {
  if (!entity) return false;
  if (entity.code) {
    const code = String(entity.code).trim().toLowerCase();
    if (String(raw).trim().toLowerCase() === code || norm === code) {
      return true;
    }
    const paren = String(raw || '').match(/\(([^)]+)\)/);
    if (paren && paren[1] && paren[1].trim().toLowerCase() === code) {
      return true;
    }
  }
  if (entity.name) {
    const eNorm = normalizeAcademicUnitString(entity.name);
    if (String(raw).trim().toLowerCase() === String(entity.name).trim().toLowerCase() || (norm && norm === eNorm)) {
      return true;
    }
    if (norm && eNorm && (norm.includes(eNorm) || eNorm.includes(norm))) {
      return true;
    }
    const eInitials = generateInitials(eNorm);
    if (eInitials && (norm === eInitials || String(raw).trim().toLowerCase() === eInitials)) {
      return true;
    }
  }
  return false;
}

/**
 * Acronym-, prefix-, alias-, and catalog-aware Department scope matcher.
 */
function matchesDepartmentScope(studentScope, userScope, activeDepartments = []) {
  if (!studentScope || !userScope || !String(studentScope).trim() || !String(userScope).trim()) {
    return true;
  }
  const uClean = String(userScope).trim();
  if (/^(all|administration)$/i.test(uClean)) return true;

  const s1 = String(studentScope).trim();
  const s2 = uClean;
  if (s1.toLowerCase() === s2.toLowerCase()) return true;

  const n1 = normalizeAcademicUnitString(s1);
  const n2 = normalizeAcademicUnitString(s2);
  if (n1 && n2 && (n1 === n2 || n1.includes(n2) || n2.includes(n1))) {
    return true;
  }

  if (isComputerScienceAlias(s1) && isComputerScienceAlias(s2)) {
    return true;
  }

  for (const dept of activeDepartments) {
    if (matchesCatalogEntity(s1, n1, dept) && matchesCatalogEntity(s2, n2, dept)) {
      return true;
    }
  }

  const a1 = extractAcronymOrInitials(s1, n1);
  const a2 = extractAcronymOrInitials(s2, n2);
  if (a1 && a2 && (a1 === a2 || a1 === n2 || a2 === n1)) {
    return true;
  }

  return false;
}

/**
 * Acronym-, prefix-, and catalog-aware College scope matcher.
 * Uses word-boundary checks for short codes so 3-letter codes (IDS/IMS/IKS/MRI)
 * cannot accidentally substring-match inside unrelated words.
 */
function matchesCollegeScope(studentScope, userScope, activeColleges = []) {
  if (!studentScope || !userScope || !String(studentScope).trim() || !String(userScope).trim()) {
    return true;
  }
  const uClean = String(userScope).trim();
  if (/^(all|administration)$/i.test(uClean)) return true;

  const s1 = String(studentScope).trim();
  const s2 = uClean;
  if (s1.toLowerCase() === s2.toLowerCase()) return true;

  const n1 = normalizeAcademicUnitString(s1);
  const n2 = normalizeAcademicUnitString(s2);
  if (n1 && n2 && (n1 === n2 || n1.includes(n2) || n2.includes(n1))) {
    return true;
  }

  for (const col of activeColleges) {
    if (matchesCatalogEntity(s1, n1, col) && matchesCatalogEntity(s2, n2, col)) {
      return true;
    }
  }

  const a1 = extractAcronymOrInitials(s1, n1);
  const a2 = extractAcronymOrInitials(s2, n2);
  if (a1 && (a1 === n2 || new RegExp(`\\b${escapeRegex(a1)}\\b`, 'i').test(n2))) return true;
  if (a2 && (a2 === n1 || new RegExp(`\\b${escapeRegex(a2)}\\b`, 'i').test(n1))) return true;
  if (a1 && a2 && a1 === a2) return true;

  return false;
}

/**
 * Check whether a scoped officer (Principal, Department Officer, or Supervisor)
 * is authorized to access/act on a student/request record.
 *
 * - PRINCIPAL / COLLEGE_PRINCIPAL: matched by college when user.college is set.
 * - DEPARTMENT_OFFICER: matched by department (when user.department is set) AND
 *   by college when BOTH user.college and target.college are set (prevents
 *   collisions for shared department names across colleges, e.g. Economics in
 *   UDSE vs CoSS).
 * - SUPERVISOR: matched by department (when user.department is set) AND/OR
 *   college (when user.college is set), supporting both college-level and
 *   department-level research supervisors.
 */
function matchesUserAcademicScope(user, target = {}, catalogs = {}) {
  if (!user || !user.role) return true;
  const role = String(user.role).toUpperCase();
  const activeColleges = catalogs.activeColleges || [];
  const activeDepartments = catalogs.activeDepartments || [];

  const targetCol = (target.college || '').trim();
  const targetDept = (target.department || '').trim();

  if (role === 'PRINCIPAL' || role === 'COLLEGE_PRINCIPAL') {
    if (user.college && String(user.college).trim()) {
      return matchesCollegeScope(targetCol, user.college, activeColleges);
    }
    return true;
  }

  if (role === 'DEPARTMENT_OFFICER') {
    if (user.college && String(user.college).trim() && targetCol) {
      if (!matchesCollegeScope(targetCol, user.college, activeColleges)) {
        return false;
      }
    }
    if (user.department && String(user.department).trim()) {
      return matchesDepartmentScope(targetDept, user.department, activeDepartments);
    }
    return true;
  }

  if (role === 'SUPERVISOR') {
    if (user.college && String(user.college).trim() && targetCol) {
      if (!matchesCollegeScope(targetCol, user.college, activeColleges)) {
        return false;
      }
    }
    if (user.department && String(user.department).trim()) {
      return matchesDepartmentScope(targetDept, user.department, activeDepartments);
    }
    return true;
  }

  return true;
}

/**
 * Throw HTTP 403 if the officer is outside the student's college/department scope.
 */
function assertOfficerAcademicScope(user, target = {}, options = {}) {
  if (!user || !user.role) return;
  const role = String(user.role).toUpperCase();
  if (!['PRINCIPAL', 'COLLEGE_PRINCIPAL', 'DEPARTMENT_OFFICER', 'SUPERVISOR'].includes(role)) {
    return;
  }

  const actionLabel = options.actionLabel || 'modify clearance';
  const ok = matchesUserAcademicScope(user, target, {
    activeColleges: options.activeColleges || [],
    activeDepartments: options.activeDepartments || []
  });

  if (!ok) {
    let msg;
    if (role === 'PRINCIPAL' || role === 'COLLEGE_PRINCIPAL') {
      msg = `Unauthorized: Principal of '${user.college}' cannot ${actionLabel} for student in '${target.college || 'different college'}'`;
    } else if (role === 'SUPERVISOR') {
      const scopeDesc = user.department ? `${user.department}${user.college ? ` (${user.college})` : ''}` : user.college;
      msg = `Unauthorized: Supervisor for '${scopeDesc}' cannot ${actionLabel} for student in '${target.department || target.college || 'different unit'}'`;
    } else {
      const scopeDesc = user.department ? `${user.department}${user.college ? ` (${user.college})` : ''}` : user.college;
      msg = `Unauthorized: Department Officer for '${scopeDesc}' cannot ${actionLabel} for student in '${target.department || target.college || 'different department'}'`;
    }
    const err = new Error(msg);
    err.statusCode = 403;
    throw err;
  }
}

async function loadAcademicCatalogs(dbOrTrx, user) {
  if (!user || !user.role) return { activeColleges: [], activeDepartments: [] };
  const role = String(user.role).toUpperCase();
  const needsColleges = Boolean(
    user.college && ['PRINCIPAL', 'COLLEGE_PRINCIPAL', 'DEPARTMENT_OFFICER', 'SUPERVISOR'].includes(role)
  );
  const needsDepartments = Boolean(
    user.department && ['DEPARTMENT_OFFICER', 'SUPERVISOR', 'LECTURER'].includes(role)
  );

  const [activeColleges, activeDepartments] = await Promise.all([
    needsColleges ? dbOrTrx('colleges').where({ is_active: 1 }).select('code', 'name') : Promise.resolve([]),
    needsDepartments ? dbOrTrx('departments').where({ is_active: 1 }).select('code', 'name') : Promise.resolve([])
  ]);

  return { activeColleges, activeDepartments };
}

module.exports = {
  normalizeAcademicUnitString,
  generateInitials,
  extractAcronymOrInitials,
  isComputerScienceAlias,
  matchesCatalogEntity,
  matchesDepartmentScope,
  matchesCollegeScope,
  matchesUserAcademicScope,
  assertOfficerAcademicScope,
  loadAcademicCatalogs
};
