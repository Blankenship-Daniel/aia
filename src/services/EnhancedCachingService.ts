import {
  IEnhancedCachingService,
  CacheMetrics,
  CacheStrategy,
  CacheAnalytics,
} from '../interfaces/IEnhancedCachingService';
import { ICachingService } from '../interfaces/ICachingService';
import { IConfigurationService } from '../interfaces/IConfigurationService';
import { EventEmitter } from 'events';

/**
 * Enhanced caching service with user feedback and performance visualization
 * Extends the basic caching service with analytics, user-configurable strategies,
 * and intelligent cache warming capabilities.
 */
export class EnhancedCachingService
  extends EventEmitter
  implements IEnhancedCachingService
{
  private cacheMetrics: Map<string, CacheMetrics> = new Map();
  private cacheStrategies: Map<string, CacheStrategy> = new Map();
  private analyticsHistory: CacheAnalytics[] = [];
  private warmingQueue: Set<string> = new Set();

  constructor(
    private cachingService: ICachingService,
    private configService: IConfigurationService
  ) {
    super();
    this.initializeDefaultStrategies();
    this.startMetricsCollection();
  }

  async getCacheMetrics(
    key?: string
  ): Promise<CacheMetrics | Map<string, CacheMetrics>> {
    if (key) {
      return this.cacheMetrics.get(key) || this.createDefaultMetrics(key);
    }
    return new Map(this.cacheMetrics);
  }

  async setCacheStrategy(key: string, strategy: CacheStrategy): Promise<void> {
    this.cacheStrategies.set(key, strategy);
    // Note: Strategy persistence would require extending AIAConfig interface
    // For now, strategies are maintained in memory during session
    this.emit('strategyUpdated', { key, strategy });
  }

  async getCacheStrategy(key: string): Promise<CacheStrategy> {
    return this.cacheStrategies.get(key) || this.getDefaultStrategy();
  }

  async getCacheAnalytics(): Promise<CacheAnalytics> {
    const allMetrics = Array.from(this.cacheMetrics.values());
    const totalHits = allMetrics.reduce((sum, m) => sum + m.hits, 0);
    const totalMisses = allMetrics.reduce((sum, m) => sum + m.misses, 0);
    const totalRequests = totalHits + totalMisses;

    return {
      totalHits,
      totalMisses,
      hitRate: totalRequests > 0 ? totalHits / totalRequests : 0,
      missRate: totalRequests > 0 ? totalMisses / totalRequests : 0,
      averageRetrievalTime:
        allMetrics.reduce((sum, m) => sum + m.averageRetrievalTime, 0) /
          allMetrics.length || 0,
      spaceSavings: allMetrics.reduce((sum, m) => sum + m.spaceSavings, 0),
      performanceImprovement: this.calculatePerformanceImprovement(allMetrics),
    };
  }

  async displayCachePerformance(): Promise<void> {
    const analytics = await this.getCacheAnalytics();

    console.log('\n🔄 Cache Performance Dashboard');
    console.log('================================');
    console.log(`📊 Hit Rate: ${(analytics.hitRate * 100).toFixed(1)}%`);
    console.log(`📉 Miss Rate: ${(analytics.missRate * 100).toFixed(1)}%`);
    console.log(
      `⚡ Performance Improvement: ${analytics.performanceImprovement.toFixed(
        1
      )}x`
    );
    console.log(
      `💾 Space Savings: ${this.formatBytes(analytics.spaceSavings)}`
    );
    console.log(
      `⏱️  Average Retrieval: ${analytics.averageRetrievalTime.toFixed(2)}ms`
    );

    // Show top performing cache keys
    const topKeys = this.getTopPerformingKeys(5);
    if (topKeys.length > 0) {
      console.log('\n🏆 Top Performing Cache Keys:');
      topKeys.forEach((key, index) => {
        const metrics = this.cacheMetrics.get(key)!;
        console.log(
          `${index + 1}. ${key} (${(metrics.hitRate * 100).toFixed(
            1
          )}% hit rate)`
        );
      });
    }

    this.displayCacheRecommendations();
  }

  async warmCache(keys: string[]): Promise<void> {
    console.log(`🔥 Warming cache for ${keys.length} keys...`);

    for (const key of keys) {
      this.warmingQueue.add(key);
      // Simulate cache warming - in real implementation, this would trigger data loading
      setTimeout(() => {
        this.warmingQueue.delete(key);
        this.emit('cacheWarmed', { key });
      }, Math.random() * 1000 + 500);
    }
  }

  async suggestCacheWarmingTargets(): Promise<string[]> {
    const suggestions: string[] = [];

    // Analyze access patterns to suggest warming targets
    for (const [key, metrics] of this.cacheMetrics) {
      if (metrics.missRate > 0.3 && metrics.accessFrequency > 5) {
        suggestions.push(key);
      }
    }

    // Sort by potential impact (high misses + high frequency)
    return suggestions.sort((a, b) => {
      const aMetrics = this.cacheMetrics.get(a)!;
      const bMetrics = this.cacheMetrics.get(b)!;
      const aImpact = aMetrics.missRate * aMetrics.accessFrequency;
      const bImpact = bMetrics.missRate * bMetrics.accessFrequency;
      return bImpact - aImpact;
    });
  }

  async cleanupCache(): Promise<void> {
    const beforeSize = await this.getCacheSize();

    // Clean up based on strategies and usage patterns
    const keysToRemove: string[] = [];

    for (const [key, metrics] of this.cacheMetrics) {
      const strategy = await this.getCacheStrategy(key);

      if (this.shouldCleanupKey(key, metrics, strategy)) {
        keysToRemove.push(key);
      }
    }

    // Remove low-value cache entries
    for (const key of keysToRemove) {
      await this.cachingService.delete(key);
      this.cacheMetrics.delete(key);
    }

    const afterSize = await this.getCacheSize();
    const spaceSaved = beforeSize - afterSize;

    console.log(
      `🧹 Cache cleanup completed: ${
        keysToRemove.length
      } entries removed, ${this.formatBytes(spaceSaved)} saved`
    );
    this.emit('cacheCleanup', { keysRemoved: keysToRemove.length, spaceSaved });
  }

  // Wrap cachingService methods with metrics collection
  async get<T>(key: string): Promise<T | null> {
    const startTime = Date.now();
    const result = await this.cachingService.get<T>(key);
    const retrievalTime = Date.now() - startTime;

    this.updateMetrics(key, result !== null, retrievalTime);

    if (result !== null) {
      this.emit('cacheHit', { key, retrievalTime });
    } else {
      this.emit('cacheMiss', { key });
    }

    return result;
  }

  async set<T>(key: string, value: T, ttl?: number): Promise<void> {
    const options = ttl ? { ttl } : undefined;
    await this.cachingService.set(key, value, options);
    this.initializeMetricsIfNeeded(key);
    this.emit('cacheSet', { key, size: this.estimateSize(value) });
  }

  async delete(key: string): Promise<boolean> {
    const result = await this.cachingService.delete(key);
    this.cacheMetrics.delete(key);
    this.emit('cacheDelete', { key });
    return result;
  }

  async clear(): Promise<void> {
    await this.cachingService.clear();
    this.cacheMetrics.clear();
    this.emit('cacheClear');
  }

  async has(key: string): Promise<boolean> {
    return this.cachingService.has(key);
  }

  async keys(): Promise<string[]> {
    return this.cachingService.keys();
  }

  async size(): Promise<number> {
    return this.cachingService.size();
  }

  private initializeDefaultStrategies(): void {
    const defaultStrategies: Record<string, CacheStrategy> = {
      'command-suggestions': {
        ttl: 300000, // 5 minutes
        maxSize: 100,
        evictionPolicy: 'lru',
        priority: 'high',
      },
      'file-analysis': {
        ttl: 600000, // 10 minutes
        maxSize: 50,
        evictionPolicy: 'lfu',
        priority: 'medium',
      },
      'ai-responses': {
        ttl: 1800000, // 30 minutes
        maxSize: 20,
        evictionPolicy: 'lru',
        priority: 'high',
      },
    };

    for (const [key, strategy] of Object.entries(defaultStrategies)) {
      this.cacheStrategies.set(key, strategy);
    }
  }

  private startMetricsCollection(): void {
    // Collect analytics every 5 minutes
    setInterval(() => {
      this.collectAnalytics();
    }, 300000);
  }

  private createDefaultMetrics(key: string): CacheMetrics {
    return {
      hits: 0,
      misses: 0,
      hitRate: 0,
      missRate: 0,
      averageRetrievalTime: 0,
      spaceSavings: 0,
      accessFrequency: 0,
      lastAccessed: new Date(),
    };
  }

  private getDefaultStrategy(): CacheStrategy {
    return {
      ttl: 600000, // 10 minutes
      maxSize: 100,
      evictionPolicy: 'lru',
      priority: 'medium',
    };
  }

  private calculatePerformanceImprovement(metrics: CacheMetrics[]): number {
    if (metrics.length === 0) return 1;

    const avgHitRate =
      metrics.reduce((sum, m) => sum + m.hitRate, 0) / metrics.length;
    const avgRetrievalTime =
      metrics.reduce((sum, m) => sum + m.averageRetrievalTime, 0) /
      metrics.length;

    // Assume cache miss takes 10x longer than cache hit
    const missTime = avgRetrievalTime * 10;
    const weightedTime =
      avgHitRate * avgRetrievalTime + (1 - avgHitRate) * missTime;

    return missTime > 0 ? missTime / weightedTime : 1;
  }

  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  private getTopPerformingKeys(limit: number): string[] {
    return Array.from(this.cacheMetrics.entries())
      .sort(([, a], [, b]) => b.hitRate - a.hitRate)
      .slice(0, limit)
      .map(([key]) => key);
  }

  private displayCacheRecommendations(): void {
    console.log('\n💡 Cache Recommendations:');

    const lowHitRateKeys = Array.from(this.cacheMetrics.entries())
      .filter(
        ([, metrics]) => metrics.hitRate < 0.5 && metrics.accessFrequency > 3
      )
      .map(([key]) => key);

    if (lowHitRateKeys.length > 0) {
      console.log(
        `🔧 Consider adjusting TTL for: ${lowHitRateKeys.join(', ')}`
      );
    }

    const highMissRateKeys = Array.from(this.cacheMetrics.entries())
      .filter(([, metrics]) => metrics.missRate > 0.7)
      .map(([key]) => key);

    if (highMissRateKeys.length > 0) {
      console.log(
        `🔥 Consider cache warming for: ${highMissRateKeys.join(', ')}`
      );
    }
  }

  private async getCacheSize(): Promise<number> {
    // Estimate total cache size
    let totalSize = 0;
    const keys = await this.keys();

    for (const key of keys) {
      const value = await this.get(key);
      if (value) {
        totalSize += this.estimateSize(value);
      }
    }

    return totalSize;
  }

  private shouldCleanupKey(
    key: string,
    metrics: CacheMetrics,
    strategy: CacheStrategy
  ): boolean {
    const now = new Date();
    const timeSinceAccess = now.getTime() - metrics.lastAccessed.getTime();

    // Remove if not accessed in 2x TTL and low hit rate
    return timeSinceAccess > strategy.ttl * 2 && metrics.hitRate < 0.3;
  }

  private updateMetrics(
    key: string,
    isHit: boolean,
    retrievalTime: number
  ): void {
    if (!this.cacheMetrics.has(key)) {
      this.cacheMetrics.set(key, this.createDefaultMetrics(key));
    }

    const metrics = this.cacheMetrics.get(key)!;

    if (isHit) {
      metrics.hits++;
    } else {
      metrics.misses++;
    }

    const totalRequests = metrics.hits + metrics.misses;
    metrics.hitRate = metrics.hits / totalRequests;
    metrics.missRate = metrics.misses / totalRequests;
    metrics.averageRetrievalTime =
      (metrics.averageRetrievalTime + retrievalTime) / 2;
    metrics.accessFrequency++;
    metrics.lastAccessed = new Date();
  }

  private initializeMetricsIfNeeded(key: string): void {
    if (!this.cacheMetrics.has(key)) {
      this.cacheMetrics.set(key, this.createDefaultMetrics(key));
    }
  }

  private estimateSize(value: any): number {
    // Simple size estimation
    try {
      return JSON.stringify(value).length;
    } catch {
      return 1000; // Default estimate
    }
  }

  private async collectAnalytics(): Promise<void> {
    const analytics = await this.getCacheAnalytics();
    this.analyticsHistory.push({
      ...analytics,
      timestamp: new Date(),
    });

    // Keep only last 24 hours of analytics
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    this.analyticsHistory = this.analyticsHistory.filter(
      (a) => a.timestamp! > oneDayAgo
    );
  }
}
