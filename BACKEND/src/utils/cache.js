/**
 * Lightweight in-memory TTL cache for high-frequency reference lookups
 * (colleges, departments, collection stations, sponsors).
 * Evicted automatically on write mutations.
 */
class MemoryCache {
  constructor() {
    this.store = new Map();
  }

  get(key) {
    const entry = this.store.get(key);
    if (!entry) return undefined;
    if (entry.expiresAt && Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return undefined;
    }
    return entry.value;
  }

  set(key, value, ttlMs = 5 * 60 * 1000) {
    this.store.set(key, {
      value,
      expiresAt: ttlMs > 0 ? Date.now() + ttlMs : null
    });
  }

  del(key) {
    this.store.delete(key);
  }

  clearPrefix(prefix) {
    for (const key of this.store.keys()) {
      if (key.startsWith(prefix)) {
        this.store.delete(key);
      }
    }
  }

  clearAll() {
    this.store.clear();
  }
}

module.exports = new MemoryCache();
