/**
 * Enhanced caching service interface with user feedback and performance analytics
 */
export interface IEnhancedCachingService {
  // Cache analytics and metrics
  getCacheMetrics(
    key?: string
  ): Promise<CacheMetrics | Map<string, CacheMetrics>>;
  getCacheAnalytics(): Promise<CacheAnalytics>;
  displayCachePerformance(): Promise<void>;

  // Cache strategy management
  setCacheStrategy(key: string, strategy: CacheStrategy): Promise<void>;
  getCacheStrategy(key: string): Promise<CacheStrategy>;

  // Cache warming and optimization
  warmCache(keys: string[]): Promise<void>;
  suggestCacheWarmingTargets(): Promise<string[]>;
  cleanupCache(): Promise<void>;

  // Standard cache operations with enhanced tracking
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T, ttl?: number): Promise<void>;
  delete(key: string): Promise<boolean>;
  clear(): Promise<void>;
  has(key: string): Promise<boolean>;
  keys(): Promise<string[]>;
  size(): Promise<number>;
}

/**
 * Cache performance metrics for individual keys
 */
export interface CacheMetrics {
  hits: number;
  misses: number;
  hitRate: number;
  missRate: number;
  averageRetrievalTime: number;
  spaceSavings: number;
  accessFrequency: number;
  lastAccessed: Date;
}

/**
 * Cache strategy configuration
 */
export interface CacheStrategy {
  ttl: number; // Time to live in milliseconds
  maxSize: number; // Maximum number of entries
  evictionPolicy: 'lru' | 'lfu' | 'fifo'; // Eviction policy
  priority: 'low' | 'medium' | 'high'; // Cache priority
}

/**
 * Overall cache analytics
 */
export interface CacheAnalytics {
  totalHits: number;
  totalMisses: number;
  hitRate: number;
  missRate: number;
  averageRetrievalTime: number;
  spaceSavings: number;
  performanceImprovement: number;
  timestamp?: Date;
}

/**
 * Cache warming target suggestion
 */
export interface CacheWarmingTarget {
  key: string;
  priority: number;
  expectedBenefit: number;
  reason: string;
}

/**
 * Cache cleanup recommendation
 */
export interface CacheCleanupRecommendation {
  key: string;
  reason: string;
  spaceSavings: number;
  lastAccessed: Date;
}
