// Performance Optimization Module
// Provides caching, indexing, and performance monitoring capabilities

import { EventEmitter } from 'events';

interface CacheEntry<T = unknown> {
  data: T;
  timestamp: number;
  accessCount: number;
}

interface PerformanceThresholds {
  slowOperation: number;
  memoryWarning: number;
  cacheSize: number;
  indexRebuildInterval: number;
}

interface IndexBuildOptions {
  useNgrams?: boolean;
  ngramSize?: number;
  useWeighting?: boolean;
  includeMetadata?: boolean;
}

interface IndexMetadata {
  buildTime: number;
  termCount: number;
  documentCount: number;
  options: IndexBuildOptions;
}

interface IndexData {
  index: Map<string, Map<number, number>>;
  metadata: IndexMetadata | null;
  timestamp: number;
}

interface SearchOptions {
  limit?: number;
  threshold?: number;
  useExpansion?: boolean;
  boostRecent?: boolean;
}

interface SearchResult {
  docId: number;
  score: number;
  relevance: number;
}

interface PerformanceMetric {
  count: number;
  totalTime: number;
  averageTime: number;
  errors: number;
  lastRun: number;
}

interface MemoryUsage {
  used: number;
  total: number;
  percentage: number;
}

interface OptimizationResult {
  optimized: boolean;
  command: string;
  reason: string;
  originalTime?: number;
  optimizedTime?: number;
}

/**
 * PerformanceOptimizer class
 * 
 * TODO: Add class description
 */
export class PerformanceOptimizer extends EventEmitter {
  private cache: Map<string, CacheEntry>;
  private performanceMetrics: Map<string, PerformanceMetric>;
  private indexCache: Map<string, IndexData>;
  private compressionEnabled: boolean;
  private intervals: NodeJS.Timeout[]; // Store interval references for cleanup
  private thresholds: PerformanceThresholds;

  /**
   * Creates an instance of the class
   */
  constructor() {
    super();
    this.cache = new Map<string, CacheEntry>();
    this.performanceMetrics = new Map<string, PerformanceMetric>();
    this.indexCache = new Map<string, IndexData>();
    this.compressionEnabled = true;
    this.intervals = []; // Store interval references for cleanup

    // Performance thresholds
    this.thresholds = {
      slowOperation: 1000, // 1 second
      memoryWarning: 50 * 1024 * 1024, // 50MB
      cacheSize: 100,
      indexRebuildInterval: 300000, // 5 minutes
    };

    // Don't start monitoring automatically to prevent hanging processes
    // Call startPerformanceMonitoring() explicitly when needed
  }

  // Enhanced caching system
  public async cached<T>(
    key: string,
    operation: () => Promise<T>,
    ttl: number = 300000
  ): Promise<T> {
    // 5 minute default TTL
    const cacheKey = this.generateCacheKey(key);
    const cached = this.cache.get(cacheKey) as CacheEntry<T> | undefined;

    if (cached && !this.isCacheExpired(cached, ttl)) {
      this.recordCacheHit(cacheKey);
      return cached.data;
    }

    const startTime = Date.now();
    try {
      const result = await operation();

      // Cache the result
      this.cache.set(cacheKey, {
        data: result,
        timestamp: Date.now(),
        accessCount: 1,
      });

      this.recordCacheMiss(cacheKey);
      this.cleanupCache();

      return result;
    } catch (error) {
      this.recordOperationTime(key, Date.now() - startTime, false);
      throw error;
    } finally {
      this.recordOperationTime(key, Date.now() - startTime, true);
    }
  }

  // Optimized semantic indexing
  public buildOptimizedIndex(
    data: unknown[],
    options: IndexBuildOptions = {}
  ): Map<string, Map<number, number>> {
    const {
      useNgrams = true,
      ngramSize = 3,
      useWeighting = true,
      includeMetadata = true,
    } = options;

    const indexKey = this.generateIndexKey(data, options);
    const cached = this.indexCache.get(indexKey);

    if (cached && !this.isIndexStale(cached)) {
      return cached.index;
    }

    const startTime = Date.now();
    const index = new Map<string, Map<number, number>>();
    const termFrequency = new Map<string, number>();
    const documentFrequency = new Map<string, number>();

    data.forEach((item, docId) => {
      const text = this.extractText(item);
      const tokens = this.tokenizeText(text);
      const docTerms = new Set<string>();

      // Process unigrams
      tokens.forEach((token) => {
        this.addToIndex(index, token, docId, 1.0);
        docTerms.add(token);
        termFrequency.set(token, (termFrequency.get(token) || 0) + 1);
      });

      // Process n-grams if enabled
      if (useNgrams) {
        const ngrams = this.generateNgrams(tokens, ngramSize);
        ngrams.forEach((ngram) => {
          this.addToIndex(index, ngram, docId, 0.8); // Lower weight for n-grams
          docTerms.add(ngram);
        });
      }

      // Update document frequency
      docTerms.forEach((term) => {
        documentFrequency.set(term, (documentFrequency.get(term) || 0) + 1);
      });
    });

    // Calculate TF-IDF weights if enabled
    if (useWeighting) {
      this.applyTfIdfWeighting(
        index,
        termFrequency,
        documentFrequency,
        data.length
      );
    }

    const indexData: IndexData = {
      index,
      metadata: includeMetadata
        ? {
            buildTime: Date.now() - startTime,
            termCount: index.size,
            documentCount: data.length,
            options,
          }
        : null,
      timestamp: Date.now(),
    };

    this.indexCache.set(indexKey, indexData);
    this.emit('indexBuilt', { key: indexKey, ...indexData.metadata });

    return index;
  }

  // Advanced search with ranking
  public async search(
    query: string,
    index: Map<string, Map<number, number>>,
    options: SearchOptions = {}
  ): Promise<SearchResult[]> {
    const {
      limit = 10,
      threshold = 0.1,
      useExpansion = true,
      boostRecent = true,
    } = options;

    const startTime = Date.now();
    const queryTerms = this.tokenizeText(query);

    // Expand query if enabled
    const expandedTerms = useExpansion
      ? await this.expandQuery(queryTerms, index)
      : queryTerms;

    const scores = new Map<number, number>();

    expandedTerms.forEach((term) => {
      const termDocs = index.get(term);
      if (termDocs) {
        termDocs.forEach((weight, docId) => {
          scores.set(docId, (scores.get(docId) || 0) + weight);
        });
      }
    });

    // Convert to results array and sort
    const results: SearchResult[] = Array.from(scores.entries())
      .map(([docId, score]) => ({
        docId,
        score,
        relevance: score / expandedTerms.length,
      }))
      .filter((result) => result.relevance >= threshold)
      .sort((a, b) => b.relevance - a.relevance)
      .slice(0, limit);

    this.recordOperationTime('search', Date.now() - startTime, true);

    return results;
  }

  // Memory management
  /**
   * Handles optimizeMemoryUsage operation
   * 
   * @returns Promise< - Return value description
   */
  public async optimizeMemoryUsage(): Promise<{
    beforeUsage: MemoryUsage;
    afterUsage: MemoryUsage;
    optimized: boolean;
  }> {
    const beforeUsage = this.getMemoryUsage();

    // Cleanup expired cache entries
    this.cleanupCache();
    this.cleanupIndexes();

    // Force garbage collection if available
    if (global.gc) {
      global.gc();
    }

    const afterUsage = this.getMemoryUsage();

    return {
      beforeUsage,
      afterUsage,
      optimized: afterUsage.used < beforeUsage.used,
    };
  }

  // Performance monitoring
  /**
   * Handles startPerformanceMonitoring operation
   */
  public startPerformanceMonitoring(): void {
    // Memory monitoring
    const memoryInterval = setInterval(() => {
      const usage = this.getMemoryUsage();
      if (usage.used > this.thresholds.memoryWarning) {
        this.emit('memoryWarning', usage);
      }
    }, 30000); // Check every 30 seconds

    // Cache monitoring
    const cacheInterval = setInterval(() => {
      this.cleanupCache();
      this.cleanupIndexes();
    }, this.thresholds.indexRebuildInterval);

    this.intervals.push(memoryInterval, cacheInterval);
  }

  /**
   * Handles stopPerformanceMonitoring operation
   */
  public stopPerformanceMonitoring(): void {
    this.intervals.forEach((interval) => clearInterval(interval));
    this.intervals = [];
  }

  // Command optimization
  public async optimizeCommand(
    command: string,
    context: Record<string, unknown>
  ): Promise<OptimizationResult> {
    const startTime = Date.now();

    // Check if command can be cached
    if (this.isCommandCacheable(command)) {
      const cacheKey = this.generateCommandCacheKey(command, context);
      const cached = this.cache.get(cacheKey);

      if (cached) {
        return {
          optimized: true,
          command,
          reason: 'Command result served from cache',
          originalTime: 0,
          optimizedTime: Date.now() - startTime,
        };
      }
    }

    return { optimized: false, command, reason: 'No optimization applied.' };
  }

  // Private helper methods
  /**
   * Generates cachekey
   * 
   * @param key - Parameter description
   * 
   * @returns string - Return value description
   */
  private generateCacheKey(key: string): string {
    return `cache:${key}`;
  }

  private generateIndexKey(
    data: unknown[],
    options: IndexBuildOptions
  ): string {
    const optionsStr = JSON.stringify(options);
    const dataHash = this.hashData(data);
    return `index:${dataHash}:${optionsStr}`;
  }

  private generateCommandCacheKey(
    command: string,
    context: Record<string, unknown>
  ): string {
    const contextStr = JSON.stringify(context, Object.keys(context).sort());
    return `command:${command}:${this.hashString(contextStr)}`;
  }

  /**
   * Handles hashData operation
   * 
   * @param data - Parameter description
   * 
   * @returns string - Return value description
   */
  private hashData(data: unknown[]): string {
    // Simple hash for data array
    return Buffer.from(JSON.stringify(data)).toString('base64').slice(0, 16);
  }

  /**
   * Handles hashString operation
   * 
   * @param str - Parameter description
   * 
   * @returns string - Return value description
   */
  private hashString(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return hash.toString(36);
  }

  /**
   * Handles isCacheExpired operation
   * 
   * @param entry - Parameter description
   * @param ttl - Parameter description
   * 
   * @returns boolean - Return value description
   */
  private isCacheExpired(entry: CacheEntry, ttl: number): boolean {
    return Date.now() - entry.timestamp > ttl;
  }

  /**
   * Handles isIndexStale operation
   * 
   * @param indexData - Parameter description
   * 
   * @returns boolean - Return value description
   */
  private isIndexStale(indexData: IndexData): boolean {
    const age = Date.now() - indexData.timestamp;
    return age > this.thresholds.indexRebuildInterval;
  }

  /**
   * Handles recordCacheHit operation
   * 
   * @param key - Parameter description
   */
  private recordCacheHit(key: string): void {
    const entry = this.cache.get(key);
    if (entry) {
      entry.accessCount++;
    }
  }

  /**
   * Handles recordCacheMiss operation
   * 
   * @param key - Parameter description
   */
  private recordCacheMiss(key: string): void {
    // Could be used for cache miss statistics
  }

  private recordOperationTime(
    operation: string,
    time: number,
    success: boolean
  ): void {
    const metric = this.performanceMetrics.get(operation) || {
      count: 0,
      totalTime: 0,
      averageTime: 0,
      errors: 0,
      lastRun: 0,
    };

    metric.count++;
    metric.totalTime += time;
    metric.averageTime = metric.totalTime / metric.count;
    metric.lastRun = Date.now();

    if (!success) {
      metric.errors++;
    }

    this.performanceMetrics.set(operation, metric);

    if (time > this.thresholds.slowOperation) {
      this.emit('slowOperation', { operation, time, success });
    }
  }

  /**
   * Handles extractText operation
   * 
   * @param item - Parameter description
   * 
   * @returns string - Return value description
   */
  private extractText(item: unknown): string {
    if (typeof item === 'string') {
      return item;
    }
    if (typeof item === 'object' && item !== null) {
      // Try common text fields
      const obj = item as Record<string, unknown>;
      const text = obj.text || obj.content || obj.description;
      return typeof text === 'string' ? text : JSON.stringify(item);
    }
    return String(item);
  }

  /**
   * Handles tokenizeText operation
   * 
   * @param text - Parameter description
   * 
   * @returns string[] - Return value description
   */
  private tokenizeText(text: string): string[] {
    return text
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter((token) => token.length > 1);
  }

  /**
   * Generates ngrams
   * 
   * @param tokens - Parameter description
   * @param size - Parameter description
   * 
   * @returns string[] - Return value description
   */
  private generateNgrams(tokens: string[], size: number): string[] {
    const ngrams: string[] = [];
    for (let i = 0; i <= tokens.length - size; i++) {
      ngrams.push(tokens.slice(i, i + size).join(' '));
    }
    return ngrams;
  }

  private addToIndex(
    index: Map<string, Map<number, number>>,
    term: string,
    docId: number,
    weight: number
  ): void {
    if (!index.has(term)) {
      index.set(term, new Map<number, number>());
    }
    const termDocs = index.get(term)!;
    termDocs.set(docId, (termDocs.get(docId) || 0) + weight);
  }

  private applyTfIdfWeighting(
    index: Map<string, Map<number, number>>,
    termFrequency: Map<string, number>,
    documentFrequency: Map<string, number>,
    totalDocs: number
  ): void {
    index.forEach((termDocs, term) => {
      const df = documentFrequency.get(term) || 1;
      const idf = Math.log(totalDocs / df);

      termDocs.forEach((tf, docId) => {
        const tfidf = tf * idf;
        termDocs.set(docId, tfidf);
      });
    });
  }

  private async expandQuery(
    terms: string[],
    index: Map<string, Map<number, number>>
  ): Promise<string[]> {
    // Simple query expansion - in practice, you might use more sophisticated methods
    const expanded = [...terms];

    // Add similar terms based on co-occurrence
    terms.forEach((term) => {
      const termDocs = index.get(term);
      if (termDocs && termDocs.size > 0) {
        // Find terms that co-occur with this term
        // This is a simplified approach
        const coOccurringTerms = this.findCoOccurringTerms(term, index);
        expanded.push(...coOccurringTerms.slice(0, 2)); // Add top 2 co-occurring terms
      }
    });

    return [...new Set(expanded)]; // Remove duplicates
  }

  private findCoOccurringTerms(
    term: string,
    index: Map<string, Map<number, number>>
  ): string[] {
    const termDocs = index.get(term);
    if (!termDocs) return [];

    const coOccurrence = new Map<string, number>();
    const targetDocIds = new Set(termDocs.keys());

    index.forEach((otherTermDocs, otherTerm) => {
      if (otherTerm === term) return;

      let commonDocs = 0;
      otherTermDocs.forEach((_, docId) => {
        if (targetDocIds.has(docId)) {
          commonDocs++;
        }
      });

      if (commonDocs > 0) {
        coOccurrence.set(otherTerm, commonDocs);
      }
    });

    return Array.from(coOccurrence.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([term]) => term);
  }

  /**
   * Gets memoryusage
   * 
   * @returns MemoryUsage - Return value description
   */
  private getMemoryUsage(): MemoryUsage {
    const usage = process.memoryUsage();
    return {
      used: usage.heapUsed,
      total: usage.heapTotal,
      percentage: (usage.heapUsed / usage.heapTotal) * 100,
    };
  }

  /**
   * Cleans up cache
   * 
   * @param force - Parameter description
   */
  private cleanupCache(force: boolean = false): void {
    if (force) {
      this.cache.clear();
      return;
    }

    // Remove expired entries
    const now = Date.now();
    const entriesToDelete: string[] = [];

    this.cache.forEach((entry, key) => {
      if (this.isCacheExpired(entry, 300000)) {
        // 5 minute default TTL
        entriesToDelete.push(key);
      }
    });

    entriesToDelete.forEach((key) => this.cache.delete(key));

    // Limit cache size
    if (this.cache.size > this.thresholds.cacheSize) {
      const entries = Array.from(this.cache.entries());
      entries
        .sort((a, b) => a[1].accessCount - b[1].accessCount) // Sort by access count
        .slice(0, this.cache.size - this.thresholds.cacheSize)
        .forEach(([key]) => this.cache.delete(key));
    }
  }

  /**
   * Cleans up indexes
   */
  private cleanupIndexes(): void {
    const now = Date.now();
    const indexesToDelete: string[] = [];

    this.indexCache.forEach((indexData, key) => {
      if (this.isIndexStale(indexData)) {
        indexesToDelete.push(key);
      }
    });

    indexesToDelete.forEach((key) => this.indexCache.delete(key));
  }

  /**
   * Handles isCommandCacheable operation
   * 
   * @param command - Parameter description
   * 
   * @returns boolean - Return value description
   */
  private isCommandCacheable(command: string): boolean {
    // Define which commands can be cached
    const cacheableCommands = ['index', 'summary', 'search', 'analyze'];
    return cacheableCommands.some((cmd) => command.includes(cmd));
  }

  // Cleanup all resources
  /**
   * Cleans up the operation
   */
  public cleanup(): void {
    // Stop performance monitoring intervals
    this.stopPerformanceMonitoring();

    this.cleanupCache(true);
    this.cleanupIndexes();
    this.cache.clear();
    this.indexCache.clear();
    this.performanceMetrics.clear();
  }

  // Dispose method for DIContainer compatibility
  /**
   * Handles dispose operation
   */
  public dispose(): void {
    this.cleanup();
  }
}
