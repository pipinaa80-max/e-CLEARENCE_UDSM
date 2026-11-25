const bcrypt = require('bcryptjs');

/**
 * Normalizes password hash prefix to ensure 100% interoperability between
 * Spring Security's BCryptPasswordEncoder ($2a$), PHP/Unix ($2y$), and Node ($2b$).
 */
function normalizeHashPrefix(hash) {
  if (!hash || typeof hash !== 'string') return '';
  let normalized = hash.trim();

  // Strip Spring DelegatingPasswordEncoder prefix {bcrypt} if present
  if (normalized.startsWith('{bcrypt}')) {
    normalized = normalized.substring(8);
  }

  // Normalize $2y$ prefix to $2a$ for standard BCrypt library parsers
  if (normalized.startsWith('$2y$')) {
    normalized = '$2a$' + normalized.substring(4);
  }

  return normalized;
}

/**
 * Verifies a plaintext password against a stored BCrypt hash.
 * Fully compatible with Spring Security BCryptPasswordEncoder without resetting credentials.
 *
 * @param {string} plainPassword - Plaintext candidate password
 * @param {string} storedHash - Stored BCrypt hash ($2a$, $2b$, or $2y$)
 * @returns {Promise<boolean>} - True if password matches
 */
async function verifyPassword(plainPassword, storedHash) {
  if (!plainPassword || !storedHash) {
    return false;
  }

  try {
    const cleanHash = normalizeHashPrefix(storedHash);
    return await bcrypt.compare(plainPassword, cleanHash);
  } catch (err) {
    return false;
  }
}

/**
 * Hashes a plaintext password using BCrypt with standard 10 salt rounds.
 *
 * @param {string} plainPassword - Plaintext password to hash
 * @returns {Promise<string>} - BCrypt hash string
 */
async function hashPassword(plainPassword) {
  if (!plainPassword || typeof plainPassword !== 'string') {
    throw new Error('Password must be a non-empty string');
  }
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(plainPassword, salt);
}

module.exports = {
  verifyPassword,
  hashPassword,
  normalizeHashPrefix
};
