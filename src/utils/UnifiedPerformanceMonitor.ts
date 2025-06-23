/**
 * Unified Performance Monitoring System
 *
 * Consolidates performance monitoring, caching, and optimization
 * strategies across the application.
 */

import { EventEmitter } from 'events';

export interface PerformanceMetrics {
  operation: string;
  duration: number;
  memoryUsage: NodeJS.MemoryUsage;
  success: boolean;
  timestamp: Date;
  metadata?: Record<string, unknown>;
}

export interface CacheEntry<T = any> {
  value: T;
  timestamp: number;
  accessCount: number;
  size: number;
  ttl?: number;
}

export interface OptimizationResult {
  optimized: boolean;
  before: PerformanceMetrics;
  after: PerformanceMetrics;
  improvement: number; // Percentage improvement
  strategy: string;
}

/**
 * Unified Performance Monitor
 *
 * Provides centralized performance tracking, caching, and optimization
 */
export class UnifiedPerformanceMonitor extends EventEmitter {
  private metrics: PerformanceMetrics[] = [];
  private cache = new Map<string, CacheEntry>();
  private readonly maxMetrics = 1000;
  private readonly defaultTTL = 300000; // 5 minutes
  private readonly maxCacheSize = 500;

  /**
   * Creates an instance of the class
   */
  constructor() {
    super();
    this.startCleanupInterval();
  }

  /**
   * Monitor function execution with automatic caching
   */
  async monitor<T>(
    operation: string,
    fn: () => Promise<T>,
    options: {
      cache?: boolean;
      ttl?: number;
      cacheKey?: string;
      metadata?: Record<string, unknown>;
    } = {}
  ): Promise<T> {
    const {
      cache = false,
      ttl = this.defaultTTL,
      cacheKey,
      metadata,
    } = options;

    // Check cache first
    if (cache && cacheKey) {
      const cached = this.getFromCache<T>(cacheKey);
      if (cached !== null) {
        this.recordMetric({
          operation: `${operation}:cache-hit`,
          duration: 0,
          memoryUsage: process.memoryUsage(),
          success: true,
          timestamp: new Date(),
          metadata: { ...metadata, cacheHit: true },
        });
        return cached;
      }
    }

    const startTime = Date.now();
    const startMemory = process.memoryUsage();
    let result: T;
    let success = true;

    try {
      result = await fn();

      // Cache successful result
      if (cache && cacheKey && result !== null && result !== undefined) {
        this.setCache(cacheKey, result, ttl);
      }

      return result;
    } catch (error) {
      success = false;
      throw error;
    } finally {
      const duration = Date.now() - startTime;
      const endMemory = process.memoryUsage();

      this.recordMetric({
        operation,
        duration,
        memoryUsage: {
          rss: endMemory.rss - startMemory.rss,
          heapUsed: endMemory.heapUsed - startMemory.heapUsed,
          heapTotal: endMemory.heapTotal - startMemory.heapTotal,
          external: endMemory.external - startMemory.external,
          arrayBuffers: endMemory.arrayBuffers - startMemory.arrayBuffers,
        },
        success,
        timestamp: new Date(),
        metadata,
      });
    }
  }

  /**
   * Cache management
   */
  setCache<T>(key: string, value: T, ttl = this.defaultTTL): void {
    const size = this.calculateSize(value);

    this.cache.set(key, {
      value,
      timestamp: Date.now(),
      accessCount: 0,
      size,
      ttl,
    });

    this.enforceMaxCacheSize();
  }

  getFromCache<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    // Check TTL
    if (entry.ttl && Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      return null;
    }

    entry.accessCount++;
    return entry.value as T;
  }

  /**
   * Handles clearCache operation
   *
   * @param pattern? - Parameter description
   */
  clearCache(pattern?: string): void {
    if (pattern) {
      const regex = new RegExp(pattern);
      for (const key of this.cache.keys()) {
        if (regex.test(key)) {
          this.cache.delete(key);
        }
      }
    } else {
      this.cache.clear();
    }
  }

  /**
   * Performance analysis
   */
  analyzePerformance(operation?: string): {
    totalOperations: number;
    averageDuration: number;
    successRate: number;
    memoryTrends: {
      averageHeapUsed: number;
      peakHeapUsed: number;
      memoryLeakIndicator: boolean;
    };
    slowestOperations: PerformanceMetrics[];
    recommendations: string[];
  } {
    const relevantMetrics = operation
      ? this.metrics.filter((m) => m.operation === operation)
      : this.metrics;

    if (relevantMetrics.length === 0) {
      return {
        totalOperations: 0,
        averageDuration: 0,
        successRate: 0,
        memoryTrends: {
          averageHeapUsed: 0,
          peakHeapUsed: 0,
          memoryLeakIndicator: false,
        },
        slowestOperations: [],
        recommendations: ['No performance data available'],
      };
    }

    const totalOperations = relevantMetrics.length;
    const averageDuration =
      relevantMetrics.reduce((sum, m) => sum + m.duration, 0) / totalOperations;
    const successfulOps = relevantMetrics.filter((m) => m.success).length;
    const successRate = (successfulOps / totalOperations) * 100;

    const heapUsages = relevantMetrics.map((m) => m.memoryUsage.heapUsed);
    const averageHeapUsed =
      heapUsages.reduce((sum, usage) => sum + usage, 0) / heapUsages.length;
    const peakHeapUsed = Math.max(...heapUsages);

    // Simple memory leak detection (increasing trend)
    const recentMetrics = relevantMetrics.slice(-10);
    const memoryLeakIndicator =
      recentMetrics.length >= 5 &&
      recentMetrics
        .slice(-5)
        .every(
          (m, i, arr) =>
            i === 0 || m.memoryUsage.heapUsed > arr[i - 1].memoryUsage.heapUsed
        );

    const slowestOperations = relevantMetrics
      .sort((a, b) => b.duration - a.duration)
      .slice(0, 5);

    const recommendations = this.generateRecommendations({
      averageDuration,
      successRate,
      memoryLeakIndicator,
      peakHeapUsed,
      slowestOperations,
    });

    return {
      totalOperations,
      averageDuration,
      successRate,
      memoryTrends: {
        averageHeapUsed,
        peakHeapUsed,
        memoryLeakIndicator,
      },
      slowestOperations,
      recommendations,
    };
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): {
    totalEntries: number;
    totalSize: number;
    hitRate: number;
    topEntries: Array<{ key: string; accessCount: number; size: number }>;
  } {
    const entries = Array.from(this.cache.entries());
    const totalEntries = entries.length;
    const totalSize = entries.reduce((sum, [, entry]) => sum + entry.size, 0);

    // Calculate hit rate from cache-hit metrics
    const cacheMetrics = this.metrics.filter((m) =>
      m.operation.includes('cache-hit')
    );
    const totalCacheableOps =
      this.metrics.filter(
        (m) =>
          !m.operation.includes('cache-hit') &&
          m.metadata?.cacheHit !== undefined
      ).length + cacheMetrics.length;

    const hitRate =
      totalCacheableOps > 0
        ? (cacheMetrics.length / totalCacheableOps) * 100
        : 0;

    const topEntries = entries
      .map(([key, entry]) => ({
        key,
        accessCount: entry.accessCount,
        size: entry.size,
      }))
      .sort((a, b) => b.accessCount - a.accessCount)
      .slice(0, 10);

    return {
      totalEntries,
      totalSize,
      hitRate,
      topEntries,
    };
  }

  /**
   * Optimize performance based on analysis
   */
  async optimizePerformance(): Promise<OptimizationResult[]> {
    const results: OptimizationResult[] = [];

    // Memory optimization
    const beforeMemory = process.memoryUsage();
    this.cleanupExpiredCache();
    this.cleanupOldMetrics();

    if (global.gc) {
      global.gc();
    }

    const afterMemory = process.memoryUsage();

    if (beforeMemory.heapUsed > afterMemory.heapUsed) {
      results.push({
        optimized: true,
        before: {
          operation: 'memory-cleanup',
          duration: 0,
          memoryUsage: beforeMemory,
          success: true,
          timestamp: new Date(),
        },
        after: {
          operation: 'memory-cleanup',
          duration: 0,
          memoryUsage: afterMemory,
          success: true,
          timestamp: new Date(),
        },
        improvement:
          ((beforeMemory.heapUsed - afterMemory.heapUsed) /
            beforeMemory.heapUsed) *
          100,
        strategy: 'memory-cleanup',
      });
    }

    // Cache optimization
    const cacheStats = this.getCacheStats();
    if (cacheStats.hitRate < 50 && cacheStats.totalEntries > 100) {
      const beforeCount = cacheStats.totalEntries;
      this.optimizeCache();
      const afterCount = this.cache.size;

      results.push({
        optimized: true,
        before: {
          operation: 'cache-optimization',
          duration: 0,
          memoryUsage: process.memoryUsage(),
          success: true,
          timestamp: new Date(),
          metadata: { cacheEntries: beforeCount },
        },
        after: {
          operation: 'cache-optimization',
          duration: 0,
          memoryUsage: process.memoryUsage(),
          success: true,
          timestamp: new Date(),
          metadata: { cacheEntries: afterCount },
        },
        improvement: ((beforeCount - afterCount) / beforeCount) * 100,
        strategy: 'cache-optimization',
      });
    }

    return results;
  }

  /**
   * Export metrics for analysis
   */
  exportMetrics(): {
    metrics: PerformanceMetrics[];
    summary: {
      totalOperations: number;
      averageDuration: number;
      successRate: number;
      memoryTrends: {
        averageHeapUsed: number;
        peakHeapUsed: number;
        memoryLeakIndicator: boolean;
      };
      slowestOperations: PerformanceMetrics[];
      recommendations: string[];
    };
    cacheStats: {
      totalEntries: number;
      totalSize: number;
      hitRate: number;
      topEntries: Array<{ key: string; accessCount: number; size: number }>;
    };
  } {
    return {
      metrics: [...this.metrics],
      summary: this.analyzePerformance(),
      cacheStats: this.getCacheStats(),
    };
  }

  /**
   * Private helper methods
   */
  private recordMetric(metric: PerformanceMetrics): void {
    this.metrics.unshift(metric);

    if (this.metrics.length > this.maxMetrics) {
      this.metrics = this.metrics.slice(0, this.maxMetrics);
    }

    this.emit('metric', metric);
  }

  /**
   * Calculates size
   *
   * @param value - Parameter description
   *
   * @returns number - Return value description
   */
  private calculateSize(value: any): number {
    try {
      return JSON.stringify(value).length * 2; // Rough approximation
    } catch {
      return 0;
    }
  }

  /**
   * Handles enforceMaxCacheSize operation
   */
  private enforceMaxCacheSize(): void {
    if (this.cache.size <= this.maxCacheSize) return;

    // Remove least recently used entries
    const entries = Array.from(this.cache.entries()).sort(
      (a, b) => a[1].accessCount - b[1].accessCount
    );

    const toRemove = entries.slice(0, entries.length - this.maxCacheSize);
    toRemove.forEach(([key]) => this.cache.delete(key));
  }

  /**
   * Cleans up expiredcache
   */
  private cleanupExpiredCache(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (entry.ttl && now - entry.timestamp > entry.ttl) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Cleans up oldmetrics
   */
  private cleanupOldMetrics(): void {
    const oneHourAgo = Date.now() - 3600000; // 1 hour
    this.metrics = this.metrics.filter(
      (m) => m.timestamp.getTime() > oneHourAgo
    );
  }

  /**
   * Handles optimizeCache operation
   */
  private optimizeCache(): void {
    // Remove entries with low access count and high age
    const now = Date.now();
    const maxAge = 1800000; // 30 minutes

    for (const [key, entry] of this.cache.entries()) {
      const age = now - entry.timestamp;
      const accessRate = entry.accessCount / (age / 60000); // accesses per minute

      if (accessRate < 0.1 && age > maxAge) {
        this.cache.delete(key);
      }
    }
  }

  private generateRecommendations(analysis: {
    averageDuration: number;
    successRate: number;
    memoryLeakIndicator: boolean;
    peakHeapUsed: number;
    slowestOperations: PerformanceMetrics[];
  }): string[] {
    const recommendations: string[] = [];

    if (analysis.averageDuration > 1000) {
      recommendations.push(
        'Consider optimizing slow operations or implementing caching'
      );
    }

    if (analysis.successRate < 95) {
      recommendations.push('Improve error handling and retry strategies');
    }

    if (analysis.memoryLeakIndicator) {
      recommendations.push('Investigate potential memory leaks');
    }

    if (analysis.peakHeapUsed > 100 * 1024 * 1024) {
      // 100MB
      recommendations.push('Consider memory optimization techniques');
    }

    if (analysis.slowestOperations.length > 0) {
      const slowest = analysis.slowestOperations[0];
      recommendations.push(
        `Optimize ${slowest.operation} operation (${slowest.duration}ms)`
      );
    }

    return recommendations;
  }

  /**
   * Handles startCleanupInterval operation
   */
  private startCleanupInterval(): void {
    setInterval(() => {
      this.cleanupExpiredCache();
      this.cleanupOldMetrics();
    }, 300000); // 5 minutes
  }
}

/**
 * Performance monitoring decorator
 */
export function MonitorPerformance(
  operation?: string,
  options: { cache?: boolean; ttl?: number } = {}
) {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value;
    const operationName =
      operation || `${target.constructor.name}.${propertyKey}`;

    descriptor.value = async function (...args: any[]) {
      const monitor = getGlobalMonitor();

      return monitor.monitor(
        operationName,
        () => originalMethod.apply(this, args),
        {
          ...options,
          cacheKey: options.cache
            ? `${operationName}:${JSON.stringify(args)}`
            : undefined,
          metadata: { className: target.constructor.name, method: propertyKey },
        }
      );
    };

    return descriptor;
  };
}

// Global monitor instance
let globalMonitor: UnifiedPerformanceMonitor | null = null;

export function getGlobalMonitor(): UnifiedPerformanceMonitor {
  if (!globalMonitor) {
    globalMonitor = new UnifiedPerformanceMonitor();
  }
  return globalMonitor;
}

export function resetGlobalMonitor(): void {
  if (globalMonitor) {
    globalMonitor.removeAllListeners();
  }
  globalMonitor = new UnifiedPerformanceMonitor();
}
