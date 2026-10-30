interface CacheEntry<T> {
  data: T;
  expiresAt: number;
  cachedAt: string;
}

export class SimpleTtlCache<T> {
  private cache = new Map<string, CacheEntry<T>>();
  private readonly defaultTtlMs: number;
  private readonly maxSize: number;

  constructor(defaultTtlMs: number = 5 * 60 * 1000, maxSize: number = 200) {
    this.defaultTtlMs = defaultTtlMs;
    this.maxSize = maxSize;
  }

  get(key: string): { data: T; cachedAt: string } | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }

    return {
      data: entry.data,
      cachedAt: entry.cachedAt
    };
  }

  set(key: string, data: T, ttlMs?: number): void {
    if (this.cache.size >= this.maxSize) {
      // Evict oldest entry
      const firstKey = this.cache.keys().next().value;
      if (firstKey) this.cache.delete(firstKey);
    }

    this.cache.set(key, {
      data,
      expiresAt: Date.now() + (ttlMs || this.defaultTtlMs),
      cachedAt: new Date().toISOString()
    });
  }

  clear(): void {
    this.cache.clear();
  }

  size(): number {
    return this.cache.size;
  }
}
