import { deepFreeze } from "./deepFreeze.util.js";

export class SingleFlightCache {
  constructor(options = {}) {
    this.cache = new Map();
    this.pending = new Map();
    this.ttl = options.stdTTL ?? 0;
    this.freeze = options.freeze ?? false;
  }

  get(key) {
    const hit = this.cache.get(key);
    if (!hit) return undefined;

    if (hit.expiresAt && Date.now() > hit.expiresAt) {
      this.cache.delete(key);
      return undefined;
    }

    return hit.value;
  }

  set(key, value, ttl = this.ttl) {
    const stored = this.freeze ? deepFreeze(value) : value;

    this.cache.set(key, {
      value: stored,
      expiresAt: ttl ? Date.now() + ttl * 1000 : null,
    });

    return stored;
  }

  async resolve(key, factory, ttl = this.ttl) {
    const cached = this.get(key);
    if (cached !== undefined) return cached;

    if (this.pending.has(key)) {
      return this.pending.get(key);
    }

    const promise = (async () => {
      const value = await factory();
      this.set(key, value, ttl);
      return value;
    })();

    this.pending.set(key, promise);

    try {
      return await promise;
    } finally {
      this.pending.delete(key);
    }
  }
}
