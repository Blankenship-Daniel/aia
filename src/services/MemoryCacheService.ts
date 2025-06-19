/**
 * Memory Cache Service Implementation
 *
 * High-performance in-memory LRU cache with TTL support,
 * automatic cleanup, and comprehensive statistics.
 *
 * Part of SOLID Week 3: Advanced Performance Optimizations
 */

import {
  ICachingService,
  CacheOptions,
  CacheEntry,
  CacheStatistics,
} from '../interfaces/ICachingService.js';

export class MemoryCacheService implements ICachingService {
  private cache = new Map<string, CacheEntry<any>>();
  private statistics = {
    totalHits: 0,
    totalMisses: 0,
    totalRequests: 0,
    totalAccessTime: 0,
    memoryUsage: 0,
  };

  private cleanupInterval?: NodeJS.Timeout;
  private readonly defaultTTL: number;
  private readonly maxItems: number;

  constructor(
    private config: {
      defaultTTL?: number;
      maxItems?: number;
      cleanupIntervalMs?: number;
    } = {}
  ) {
    this.defaultTTL = config.defaultTTL || 300000; // 5 minutes default
    this.maxItems = config.maxItems || 1000;

    if (config.cleanupIntervalMs) {
      this.startCleanup(config.cleanupIntervalMs);
    }
  }

  async set<T>(
    key: string,
    value: T,
    options: CacheOptions = {}
  ): Promise<void> {
    const startTime = Date.now();

    try {
      // Enforce max items limit (LRU eviction)
      if (this.cache.size >= this.maxItems && !this.cache.has(key)) {
        await this.evictOldest();
      }

      const ttl = options.ttl || this.defaultTTL;
      const entry: CacheEntry<T> = {
        value: value,
        timestamp: Date.now(),
        ttl,
        accessCount: 0,
        lastAccessed: Date.now(),
      };

      this.cache.set(key, entry);
      this.updateMemoryUsage();
    } finally {
      this.statistics.totalAccessTime += Date.now() - startTime;
    }
  }

  async get<T>(key: string): Promise<T | null> {
    const startTime = Date.now();
    this.statistics.totalRequests++;

    try {
      const entry = this.cache.get(key);

      if (!entry) {
        this.statistics.totalMisses++;
        return null;
      }

      // Check if entry has expired
      if (this.isExpired(entry)) {
        this.cache.delete(key);
        this.statistics.totalMisses++;
        return null;
      }

      // Update access statistics and move to end for LRU
      entry.accessCount++;
      entry.lastAccessed = Date.now();
      this.statistics.totalHits++;

      // Move to end for LRU (re-insert to maintain insertion order)
      this.cache.delete(key);
      this.cache.set(key, entry);

      return entry.value as T;
    } finally {
      this.statistics.totalAccessTime += Date.now() - startTime;
    }
  }

  async has(key: string): Promise<boolean> {
    const entry = this.cache.get(key);

    if (!entry) {
      return false;
    }

    if (this.isExpired(entry)) {
      this.cache.delete(key);
      return false;
    }

    return true;
  }

  async delete(key: string): Promise<boolean> {
    const deleted = this.cache.delete(key);
    if (deleted) {
      this.updateMemoryUsage();
    }
    return deleted;
  }

  async deletePattern(pattern: string): Promise<number> {
    const regex = new RegExp(pattern.replace(/\*/g, '.*'));
    let deletedCount = 0;

    const keysToDelete: string[] = [];
    for (const key of Array.from(this.cache.keys())) {
      if (regex.test(key)) {
        keysToDelete.push(key);
      }
    }

    for (const key of keysToDelete) {
      this.cache.delete(key);
      deletedCount++;
    }

    if (deletedCount > 0) {
      this.updateMemoryUsage();
    }

    return deletedCount;
  }

  async clear(): Promise<void> {
    this.cache.clear();
    this.statistics.memoryUsage = 0;
  }

  async getStatistics(): Promise<CacheStatistics> {
    const totalRequests = this.statistics.totalRequests || 1; // Avoid division by zero
    const entries = Array.from(this.cache.values());

    return {
      totalKeys: this.cache.size,
      hitRate: this.statistics.totalHits / totalRequests,
      missRate: this.statistics.totalMisses / totalRequests,
      totalHits: this.statistics.totalHits,
      totalMisses: this.statistics.totalMisses,
      totalRequests: this.statistics.totalRequests,
      averageAccessTime: this.statistics.totalAccessTime / totalRequests,
      memoryUsage: this.statistics.memoryUsage,
      oldestEntry:
        entries.length > 0 ? Math.min(...entries.map((e) => e.timestamp)) : 0,
      newestEntry:
        entries.length > 0 ? Math.max(...entries.map((e) => e.timestamp)) : 0,
    };
  }

  async keys(): Promise<string[]> {
    // Clean up expired keys before returning
    await this.cleanup();
    return Array.from(this.cache.keys());
  }

  async size(): Promise<number> {
    return this.statistics.memoryUsage;
  }

  async refresh(key: string, ttl?: number): Promise<boolean> {
    const entry = this.cache.get(key);

    if (!entry) {
      return false;
    }

    entry.ttl = ttl || this.defaultTTL;
    entry.timestamp = Date.now();
    return true;
  }

  async mget<T>(keys: string[]): Promise<(T | null)[]> {
    const results: (T | null)[] = [];

    for (const key of keys) {
      results.push(await this.get<T>(key));
    }

    return results;
  }

  async mset<T>(
    entries: Array<{ key: string; value: T; options?: CacheOptions }>
  ): Promise<void> {
    for (const entry of entries) {
      await this.set(entry.key, entry.value, entry.options);
    }
  }

  async warm<T>(
    key: string,
    loader: () => Promise<T>,
    options: CacheOptions = {}
  ): Promise<T> {
    // Check if already cached and not expired
    const cached = await this.get<T>(key);
    if (cached !== null) {
      return cached;
    }

    // Load data and cache it
    const value = await loader();
    await this.set(key, value, options);
    return value;
  }

  startCleanup(intervalMs: number = 60000): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }

    this.cleanupInterval = setInterval(() => {
      this.cleanup().catch(console.error);
    }, intervalMs);
  }

  stopCleanup(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = undefined;
    }
  }

  async cleanup(): Promise<number> {
    let removedCount = 0;
    const now = Date.now();

    const keysToDelete: string[] = [];
    for (const [key, entry] of Array.from(this.cache.entries())) {
      if (this.isExpired(entry, now)) {
        keysToDelete.push(key);
      }
    }

    for (const key of keysToDelete) {
      this.cache.delete(key);
      removedCount++;
    }

    if (removedCount > 0) {
      this.updateMemoryUsage();
    }

    return removedCount;
  }

  private isExpired(entry: CacheEntry<any>, now: number = Date.now()): boolean {
    return now - entry.timestamp > entry.ttl;
  }

  private async evictOldest(): Promise<void> {
    // In a Map, the first entry is the oldest (insertion order)
    const firstEntry = Array.from(this.cache.entries())[0];
    if (firstEntry) {
      this.cache.delete(firstEntry[0]);
    }
  }

  private updateMemoryUsage(): void {
    // Rough estimate of memory usage
    let totalSize = 0;

    for (const [key, entry] of Array.from(this.cache.entries())) {
      totalSize += key.length * 2; // String chars are 2 bytes
      totalSize += JSON.stringify(entry.value).length * 2;
      totalSize += 64; // Approximate overhead for entry metadata
    }

    this.statistics.memoryUsage = totalSize;
  }

  /**
   * Destroy the cache service and clean up resources
   */
  destroy(): void {
    this.stopCleanup();
    this.cache.clear();
    this.statistics = {
      totalHits: 0,
      totalMisses: 0,
      totalRequests: 0,
      totalAccessTime: 0,
      memoryUsage: 0,
    };
  }
}
