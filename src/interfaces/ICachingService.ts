/**
 * Caching Service Interface
 *
 * Provides intelligent caching capabilities with TTL support,
 * cache invalidation strategies, and different cache types.
 *
 * Part of SOLID Week 3: Advanced Performance Optimizations
 */

export interface CacheOptions {
  /** Time to live in milliseconds */
  ttl?: number;
  /** Maximum number of items in cache */
  maxItems?: number;
  /** Whether to refresh on access */
  refreshOnAccess?: boolean;
  /** Custom serialization function */
  serialize?: (value: any) => string;
  /** Custom deserialization function */
  deserialize?: (value: string) => any;
}

export interface CacheEntry<T> {
  value: T;
  timestamp: number;
  ttl: number;
  accessCount: number;
  lastAccessed: number;
}

export interface CacheStatistics {
  totalKeys: number;
  hitRate: number;
  missRate: number;
  totalHits: number;
  totalMisses: number;
  totalRequests: number;
  averageAccessTime: number;
  memoryUsage: number;
  oldestEntry: number;
  newestEntry: number;
}

export interface ICachingService {
  /**
   * Store a value in the cache with optional TTL
   */
  set<T>(key: string, value: T, options?: CacheOptions): Promise<void>;

  /**
   * Retrieve a value from the cache
   */
  get<T>(key: string): Promise<T | null>;

  /**
   * Check if a key exists in the cache
   */
  has(key: string): Promise<boolean>;

  /**
   * Remove a specific key from the cache
   */
  delete(key: string): Promise<boolean>;

  /**
   * Remove multiple keys matching a pattern
   */
  deletePattern(pattern: string): Promise<number>;

  /**
   * Clear all cache entries
   */
  clear(): Promise<void>;

  /**
   * Get cache statistics and metrics
   */
  getStatistics(): Promise<CacheStatistics>;

  /**
   * Get all cache keys
   */
  keys(): Promise<string[]>;

  /**
   * Get cache size in bytes
   */
  size(): Promise<number>;

  /**
   * Refresh TTL for a specific key
   */
  refresh(key: string, ttl?: number): Promise<boolean>;

  /**
   * Bulk operations for better performance
   */
  mget<T>(keys: string[]): Promise<(T | null)[]>;
  mset<T>(
    entries: Array<{ key: string; value: T; options?: CacheOptions }>
  ): Promise<void>;

  /**
   * Cache warming - preload data
   */
  warm<T>(
    key: string,
    loader: () => Promise<T>,
    options?: CacheOptions
  ): Promise<T>;

  /**
   * Set up automatic cleanup of expired entries
   */
  startCleanup(intervalMs?: number): void;

  /**
   * Stop automatic cleanup
   */
  stopCleanup(): void;

  /**
   * Manually trigger cleanup of expired entries
   */
  cleanup(): Promise<number>;
}
