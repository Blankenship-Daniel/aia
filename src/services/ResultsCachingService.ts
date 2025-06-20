/**
 * Results Caching Service
 * Provides intelligent caching of execution results to avoid redundant work
 */
import { ExecutionStep } from '../types/index';
import * as crypto from 'crypto';
import * as fs from 'fs-extra';
import * as path from 'path';
import chalk from 'chalk';

export interface CachedResult {
  stepHash: string;
  command: string;
  description: string;
  result: any;
  success: boolean;
  timestamp: string;
  environment: {
    platform: string;
    nodeVersion: string;
    workingDirectory: string;
  };
  ttl: number; // Time to live in milliseconds
  tags: string[];
}

export interface CacheStats {
  totalEntries: number;
  hitRate: number;
  totalHits: number;
  totalMisses: number;
  cacheSize: number; // in bytes
  oldestEntry?: string;
  newestEntry?: string;
}

export class ResultsCachingService {
  private cache = new Map<string, CachedResult>();
  private cacheDir: string;
  private maxCacheSize = 100 * 1024 * 1024; // 100MB
  private defaultTTL = 24 * 60 * 60 * 1000; // 24 hours
  private stats = {
    hits: 0,
    misses: 0,
  };

  constructor(cacheDirectory?: string) {
    this.cacheDir = cacheDirectory || path.join(process.cwd(), '.aia', 'cache');
    this.loadCacheFromDisk();
  }

  /**
   * Generate a hash for a step to use as cache key
   */
  private generateStepHash(step: ExecutionStep, context?: any): string {
    const stepData = {
      command: step.command,
      description: step.description,
      expectedOutcome: step.expectedOutcome,
      workingDirectory: process.cwd(),
      platform: process.platform,
      nodeVersion: process.version,
      context: context ? JSON.stringify(context) : undefined,
    };

    return crypto
      .createHash('sha256')
      .update(JSON.stringify(stepData))
      .digest('hex')
      .substring(0, 16); // Use first 16 characters for shorter keys
  }

  /**
   * Check if a step result is cached and still valid
   */
  async getCachedResult(
    step: ExecutionStep,
    context?: any
  ): Promise<any | null> {
    const hash = this.generateStepHash(step, context);
    const cached = this.cache.get(hash);

    if (!cached) {
      this.stats.misses++;
      return null;
    }

    // Check TTL
    const now = Date.now();
    const age = now - new Date(cached.timestamp).getTime();

    if (age > cached.ttl) {
      console.log(chalk.gray(`🗑️  Cache expired for: ${step.description}`));
      this.cache.delete(hash);
      this.stats.misses++;
      return null;
    }

    // Check if environment has changed significantly
    if (!this.isEnvironmentCompatible(cached.environment)) {
      console.log(
        chalk.gray(`🔄 Environment changed for: ${step.description}`)
      );
      this.cache.delete(hash);
      this.stats.misses++;
      return null;
    }

    this.stats.hits++;
    console.log(chalk.green(`✨ Cache hit for: ${step.description}`));

    return cached.result;
  }

  /**
   * Cache a step result
   */
  async cacheResult(
    step: ExecutionStep,
    result: any,
    success: boolean,
    context?: any,
    ttl?: number,
    tags: string[] = []
  ): Promise<void> {
    const hash = this.generateStepHash(step, context);

    const cachedResult: CachedResult = {
      stepHash: hash,
      command: step.command || '',
      description: step.description,
      result,
      success,
      timestamp: new Date().toISOString(),
      environment: {
        platform: process.platform,
        nodeVersion: process.version,
        workingDirectory: process.cwd(),
      },
      ttl: ttl || this.defaultTTL,
      tags,
    };

    this.cache.set(hash, cachedResult);

    // Clean up cache if it's getting too large
    await this.cleanupCache();

    // Persist to disk
    await this.saveCacheToDisk();

    console.log(chalk.blue(`💾 Cached result for: ${step.description}`));
  }

  /**
   * Check if we should use cache for this step
   */
  shouldUseCache(step: ExecutionStep): boolean {
    // Don't cache destructive operations
    const destructiveKeywords = [
      'delete',
      'remove',
      'drop',
      'truncate',
      'format',
      'destroy',
      'rm ',
      'rmdir',
    ];
    const stepText = `${step.description} ${step.command || ''}`.toLowerCase();

    if (destructiveKeywords.some((keyword) => stepText.includes(keyword))) {
      return false;
    }

    // Don't cache time-sensitive operations
    const timeSensitiveKeywords = [
      'time',
      'date',
      'now',
      'current',
      'latest',
      'update',
    ];
    if (timeSensitiveKeywords.some((keyword) => stepText.includes(keyword))) {
      return false;
    }

    // Don't cache operations that modify state
    const statefulKeywords = [
      'create',
      'write',
      'save',
      'install',
      'configure',
      'setup',
    ];
    if (statefulKeywords.some((keyword) => stepText.includes(keyword))) {
      return false;
    }

    return true;
  }

  /**
   * Invalidate cache entries by tags
   */
  async invalidateByTags(tags: string[]): Promise<number> {
    let invalidated = 0;

    for (const [key, cached] of this.cache.entries()) {
      if (cached.tags.some((tag) => tags.includes(tag))) {
        this.cache.delete(key);
        invalidated++;
      }
    }

    if (invalidated > 0) {
      console.log(chalk.yellow(`🗑️  Invalidated ${invalidated} cache entries`));
      await this.saveCacheToDisk();
    }

    return invalidated;
  }

  /**
   * Clear all cache
   */
  async clearCache(): Promise<void> {
    this.cache.clear();
    this.stats.hits = 0;
    this.stats.misses = 0;

    // Remove cache directory
    if (await fs.pathExists(this.cacheDir)) {
      await fs.remove(this.cacheDir);
    }

    console.log(chalk.yellow('🗑️  Cache cleared'));
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): CacheStats {
    const entries = Array.from(this.cache.values());
    const totalRequests = this.stats.hits + this.stats.misses;

    return {
      totalEntries: this.cache.size,
      hitRate: totalRequests > 0 ? (this.stats.hits / totalRequests) * 100 : 0,
      totalHits: this.stats.hits,
      totalMisses: this.stats.misses,
      cacheSize: this.estimateCacheSize(),
      oldestEntry:
        entries.length > 0
          ? entries.reduce((oldest, entry) =>
              new Date(entry.timestamp) < new Date(oldest.timestamp)
                ? entry
                : oldest
            ).timestamp
          : undefined,
      newestEntry:
        entries.length > 0
          ? entries.reduce((newest, entry) =>
              new Date(entry.timestamp) > new Date(newest.timestamp)
                ? entry
                : newest
            ).timestamp
          : undefined,
    };
  }

  /**
   * Display cache statistics
   */
  displayCacheStats(): void {
    const stats = this.getCacheStats();

    console.log(chalk.blue('\n📊 Cache Statistics'));
    console.log(chalk.gray('━'.repeat(40)));
    console.log(`📦 Total Entries: ${chalk.cyan(stats.totalEntries)}`);
    console.log(`🎯 Hit Rate: ${chalk.green(stats.hitRate.toFixed(1))}%`);
    console.log(`✅ Cache Hits: ${chalk.green(stats.totalHits)}`);
    console.log(`❌ Cache Misses: ${chalk.red(stats.totalMisses)}`);
    console.log(
      `💾 Cache Size: ${chalk.yellow(this.formatBytes(stats.cacheSize))}`
    );

    if (stats.oldestEntry) {
      const age = Date.now() - new Date(stats.oldestEntry).getTime();
      console.log(
        `⏰ Oldest Entry: ${chalk.gray(this.formatDuration(age))} ago`
      );
    }

    console.log(chalk.gray('━'.repeat(40)));
  }

  private async loadCacheFromDisk(): Promise<void> {
    try {
      const cacheFile = path.join(this.cacheDir, 'results.json');

      if (await fs.pathExists(cacheFile)) {
        const data = await fs.readJson(cacheFile);

        if (data.cache && Array.isArray(data.cache)) {
          data.cache.forEach((item: CachedResult) => {
            this.cache.set(item.stepHash, item);
          });
        }

        if (data.stats) {
          this.stats = { ...this.stats, ...data.stats };
        }

        console.log(chalk.gray(`📂 Loaded ${this.cache.size} cached results`));
      }
    } catch (error) {
      console.log(chalk.yellow('⚠️  Could not load cache from disk'));
    }
  }

  private async saveCacheToDisk(): Promise<void> {
    try {
      await fs.ensureDir(this.cacheDir);

      const cacheFile = path.join(this.cacheDir, 'results.json');
      const data = {
        cache: Array.from(this.cache.values()),
        stats: this.stats,
        lastSaved: new Date().toISOString(),
      };

      await fs.writeJson(cacheFile, data, { spaces: 2 });
    } catch (error) {
      console.log(chalk.yellow('⚠️  Could not save cache to disk'));
    }
  }

  private async cleanupCache(): Promise<void> {
    const currentSize = this.estimateCacheSize();

    if (currentSize > this.maxCacheSize) {
      // Remove oldest entries until we're under the limit
      const entries = Array.from(this.cache.entries()).sort(
        ([, a], [, b]) =>
          new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
      );

      let removedCount = 0;
      while (
        this.estimateCacheSize() > this.maxCacheSize * 0.8 &&
        entries.length > 0
      ) {
        const [key] = entries.shift()!;
        this.cache.delete(key);
        removedCount++;
      }

      if (removedCount > 0) {
        console.log(
          chalk.yellow(`🗑️  Cleaned up ${removedCount} old cache entries`)
        );
      }
    }
  }

  private isEnvironmentCompatible(
    cachedEnv: CachedResult['environment']
  ): boolean {
    return (
      cachedEnv.platform === process.platform &&
      cachedEnv.nodeVersion === process.version &&
      cachedEnv.workingDirectory === process.cwd()
    );
  }

  private estimateCacheSize(): number {
    let size = 0;
    for (const cached of this.cache.values()) {
      size += JSON.stringify(cached).length * 2; // Rough estimate
    }
    return size;
  }

  private formatBytes(bytes: number): string {
    const units = ['B', 'KB', 'MB', 'GB'];
    let size = bytes;
    let unitIndex = 0;

    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }

    return `${size.toFixed(1)} ${units[unitIndex]}`;
  }

  private formatDuration(ms: number): string {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}d`;
    if (hours > 0) return `${hours}h`;
    if (minutes > 0) return `${minutes}m`;
    return `${seconds}s`;
  }
}
