/**
 * Shared Postgraduate Classification Utility
 * Fixes false positives from naive substring checks (e.g., "Doctor of Medicine",
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

export function isExplicitUndergraduateDoctor(text?: string | null): boolean {
  if (!text) return false;
  return UNDERGRADUATE_DOCTOR_EXCLUSIONS.some(rx => rx.test(text));
}

export function isPostgraduateAward(award?: string | null): boolean {
  if (!award) return false;
  const clean = award.trim();
  if (!clean || isExplicitUndergraduateDoctor(clean)) return false;
  return POSTGRADUATE_AWARD_PATTERNS.some(rx => rx.test(clean));
}

export function isPostgraduateProgramme(programme?: string | null): boolean {
  if (!programme) return false;
  const clean = programme.trim();
  if (!clean || isExplicitUndergraduateDoctor(clean)) return false;
  if (/^\s*(bachelor|certificate|ordinary\s+diploma)\b/i.test(clean)) return false;
  if (/^\s*diploma\b/i.test(clean) && !/\bpostgraduate\b/i.test(clean)) return false;
  return POSTGRADUATE_PROGRAMME_PATTERNS.some(rx => rx.test(clean));
}

export function isPostgraduateEntity(entity?: {
  isPostgraduate?: boolean | null;
  is_postgraduate?: boolean | number | null;
  award?: string | null;
  programme?: string | null;
} | null): boolean {
  if (!entity) return false;
  if (entity.isPostgraduate === true || entity.is_postgraduate === true || entity.is_postgraduate === 1) {
    return true;
  }
  const award = (entity.award || '').trim();
  if (isPostgraduateAward(award)) {
    return true;
  }
  if (award && EXPLICIT_UNDERGRADUATE_AWARD_PATTERNS.some(rx => rx.test(award))) {
    return false;
  }
  return isPostgraduateProgramme(entity.programme);
}
