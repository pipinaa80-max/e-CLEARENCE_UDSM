/**
 * Shared Postgraduate Classification Helper
 * Fixes false positives from naive substring checks (e.g. "Doctor of Medicine",
 * "Doctor of Dental Surgery", or "Diploma in ..." matching "doctor" or "ma ").
 */

const UNDERGRADUATE_DOCTOR_EXCLUSIONS = [
  /\bdoctor\s+of\s+medicine\b/i,
  /\bdoctor\s+of\s+dental\s+surgery\b/i,
  /\bdoctor\s+of\s+veterinary\s+medicine\b/i,
  /\bdoctor\s+of\s+pharmacy\b/i
];

const POSTGRADUATE_AWARD_PATTERNS = [
  /\bpostgraduate\b/i,
  /\bpgd\b/i,
  /\bmaster'?s?\b/i,
  /\bph\.?\s*d\.?\b/i,
  /\bdoctor\s+of\s+philosophy\b/i,
  /\bdoctorate\b/i,
  /\bdoctoral\b/i
];

const POSTGRADUATE_PROGRAMME_PATTERNS = [
  /\bpostgraduate\b/i,
  /\bpgd\b/i,
  /\bmaster\b/i,
  /\bm\.?\s*sc\.?\b/i,
  /\bmba\b/i,
  /\bm\.?\s*ed\.?\b/i,
  /\bm\.?\s*eng\.?\b/i,
  /\bm\.?\s*phil\.?\b/i,
  /\bllm\b/i,
  /\bll\.?\s*m\.?\b/i,
  /\bm\.?\s*a\.?\s+in\b/i,
  /\bph\.?\s*d\.?\b/i,
  /\bdoctor\s+of\s+philosophy\b/i,
  /\bdoctorate\b/i
];

const EXPLICIT_UNDERGRADUATE_AWARD_PATTERNS = [
  /\bbachelor\b/i,
  /\bundergraduate\b/i,
  /\bordinary\s+diploma\b/i,
  /^diploma$/i,
  /\bcertificate\b/i
];

function isExplicitUndergraduateDoctor(text) {
  if (!text) return false;
  return UNDERGRADUATE_DOCTOR_EXCLUSIONS.some((rx) => rx.test(String(text)));
}

function isPostgraduateAward(award) {
  if (!award || typeof award !== 'string') return false;
  const clean = award.trim();
  if (!clean) return false;
  if (isExplicitUndergraduateDoctor(clean)) return false;
  return POSTGRADUATE_AWARD_PATTERNS.some((rx) => rx.test(clean));
}

function isPostgraduateProgramme(programme) {
  if (!programme || typeof programme !== 'string') return false;
  const clean = programme.trim();
  if (!clean) return false;
  if (isExplicitUndergraduateDoctor(clean)) return false;
  // Exclude regular undergraduate Bachelor / ordinary Diploma / Certificate programmes
  if (/^\s*(bachelor|certificate|ordinary\s+diploma)\b/i.test(clean)) return false;
  if (/^\s*diploma\b/i.test(clean) && !/\bpostgraduate\b/i.test(clean)) return false;
  return POSTGRADUATE_PROGRAMME_PATTERNS.some((rx) => rx.test(clean));
}

function isPostgraduateRecord(record = {}) {
  if (!record || typeof record !== 'object') return false;

  const explicitFlag = record.isPostgraduate !== undefined
    ? record.isPostgraduate
    : record.is_postgraduate;

  if (explicitFlag === true || explicitFlag === 1 || explicitFlag === '1' || explicitFlag === 'true') {
    return true;
  }

  const award = record.award || '';
  const programme = record.programme || '';

  if (isPostgraduateAward(award)) {
    return true;
  }

  // If award explicitly states an undergraduate qualification, trust it over ambiguous strings
  if (award && EXPLICIT_UNDERGRADUATE_AWARD_PATTERNS.some((rx) => rx.test(String(award).trim()))) {
    return false;
  }

  return isPostgraduateProgramme(programme);
}

module.exports = {
  isPostgraduateAward,
  isPostgraduateProgramme,
  isPostgraduateRecord
};
