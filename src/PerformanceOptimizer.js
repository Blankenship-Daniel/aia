// Performance Optimization Module
// Provides caching, indexing, and performance monitoring capabilities

const EventEmitter = require('events');

class PerformanceOptimizer extends EventEmitter {
  constructor() {
    super();
    this.cache = new Map();
    this.performanceMetrics = new Map();
    this.indexCache = new Map();
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
  async cached(key, operation, ttl = 300000) {
    // 5 minute default TTL
    const cacheKey = this.generateCacheKey(key);
    const cached = this.cache.get(cacheKey);

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
  buildOptimizedIndex(data, options = {}) {
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
    const index = new Map();
    const termFrequency = new Map();
    const documentFrequency = new Map();

    data.forEach((item, docId) => {
      const text = this.extractText(item);
      const tokens = this.tokenizeText(text);
      const docTerms = new Set();

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

    const indexData = {
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
  async search(query, index, options = {}) {
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
      ? await this.expandQuery(queryTerms)
      : queryTerms;

    const scores = new Map();

    expandedTerms.forEach((term) => {
      const postings = index.get(term);
      if (postings) {
        postings.forEach(({ docId, weight }) => {
          const currentScore = scores.get(docId) || 0;
          scores.set(docId, currentScore + weight);
        });
      }
    });

    // Apply additional ranking factors
    const rankedResults = Array.from(scores.entries())
      .map(([docId, score]) => ({
        docId: parseInt(docId),
        score: this.applyRankingFactors(score, docId, options),
      }))
      .filter((result) => result.score >= threshold)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);

    this.recordSearchMetrics(
      query,
      rankedResults.length,
      Date.now() - startTime
    );

    return rankedResults;
  }

  // Memory optimization
  optimizeMemoryUsage() {
    const usage = process.memoryUsage();

    if (usage.heapUsed > this.thresholds.memoryWarning) {
      console.warn(
        `⚠️  High memory usage: ${Math.round(usage.heapUsed / 1024 / 1024)}MB`
      );

      // Aggressive cleanup
      this.cleanupCache(true);
      this.cleanupIndexes();

      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }

      this.emit('memoryOptimized', {
        before: usage,
        after: process.memoryUsage(),
      });
    }
  }

  // Batch processing for large operations
  async processBatch(items, processor, options = {}) {
    const { batchSize = 100, concurrency = 5, showProgress = true } = options;

    const batches = this.createBatches(items, batchSize);
    const results = [];
    let processed = 0;

    for (let i = 0; i < batches.length; i += concurrency) {
      const concurrentBatches = batches.slice(i, i + concurrency);

      const batchPromises = concurrentBatches.map(async (batch, batchIndex) => {
        const batchResults = [];

        for (const item of batch) {
          try {
            const result = await processor(item);
            batchResults.push({ success: true, data: result });
          } catch (error) {
            batchResults.push({ success: false, error: error.message });
          }

          processed++;

          if (showProgress && processed % 10 === 0) {
            console.log(
              `📊 Progress: ${processed}/${items.length} (${Math.round(
                (processed / items.length) * 100
              )}%)`
            );
          }
        }

        return batchResults;
      });

      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults.flat());
    }

    return results;
  }

  // Helper methods
  generateCacheKey(key) {
    return typeof key === 'string' ? key : JSON.stringify(key);
  }

  generateIndexKey(data, options) {
    return `index_${data.length}_${JSON.stringify(options)}`;
  }

  isCacheExpired(cached, ttl) {
    return Date.now() - cached.timestamp > ttl;
  }

  isIndexStale(indexData) {
    return (
      Date.now() - indexData.timestamp > this.thresholds.indexRebuildInterval
    );
  }

  extractText(item) {
    if (typeof item === 'string') return item;
    if (item.query && item.response) return `${item.query} ${item.response}`;
    if (item.command) return item.command;
    return JSON.stringify(item);
  }

  tokenizeText(text) {
    return text
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter((token) => token.length > 2);
  }

  generateNgrams(tokens, n) {
    const ngrams = [];
    for (let i = 0; i <= tokens.length - n; i++) {
      ngrams.push(tokens.slice(i, i + n).join(' '));
    }
    return ngrams;
  }

  addToIndex(index, term, docId, weight) {
    if (!index.has(term)) {
      index.set(term, []);
    }
    index.get(term).push({ docId: docId.toString(), weight });
  }

  applyTfIdfWeighting(index, termFrequency, documentFrequency, totalDocs) {
    for (const [term, postings] of index) {
      const df = documentFrequency.get(term) || 1;
      const idf = Math.log(totalDocs / df);

      postings.forEach((posting) => {
        const tf = termFrequency.get(term) || 1;
        posting.weight = (1 + Math.log(tf)) * idf;
      });
    }
  }

  async expandQuery(terms) {
    // Simple query expansion - could be enhanced with synonyms, stemming, etc.
    const expanded = [...terms];

    // Add common variations
    terms.forEach((term) => {
      if (term.endsWith('s') && term.length > 3) {
        expanded.push(term.slice(0, -1)); // Remove plural
      }
      if (term.includes('ing') && term.length > 5) {
        expanded.push(term.replace(/ing$/, '')); // Remove -ing
      }
    });

    return [...new Set(expanded)];
  }

  applyRankingFactors(baseScore, docId, options) {
    let score = baseScore;

    // Boost recent documents if enabled
    if (options.boostRecent && options.timestamps) {
      const timestamp = options.timestamps[docId];
      if (timestamp) {
        const age = Date.now() - new Date(timestamp).getTime();
        const daysSince = age / (1000 * 60 * 60 * 24);

        if (daysSince < 7) score *= 1.5;
        else if (daysSince < 30) score *= 1.2;
      }
    }

    return score;
  }

  cleanupCache(aggressive = false) {
    const maxSize = aggressive
      ? this.thresholds.cacheSize / 2
      : this.thresholds.cacheSize;

    if (this.cache.size > maxSize) {
      const entries = Array.from(this.cache.entries()).sort((a, b) => {
        // Sort by access count and recency
        const scoreA = a[1].accessCount + (Date.now() - a[1].timestamp) / 1000;
        const scoreB = b[1].accessCount + (Date.now() - b[1].timestamp) / 1000;
        return scoreB - scoreA;
      });

      this.cache.clear();

      // Keep the most valuable entries
      entries.slice(0, maxSize).forEach(([key, value]) => {
        this.cache.set(key, value);
      });

      this.emit('cacheCleanup', { removed: entries.length - maxSize });
    }
  }

  cleanupIndexes() {
    const now = Date.now();
    const staleKeys = [];

    for (const [key, indexData] of this.indexCache) {
      if (this.isIndexStale(indexData)) {
        staleKeys.push(key);
      }
    }

    staleKeys.forEach((key) => this.indexCache.delete(key));

    if (staleKeys.length > 0) {
      this.emit('indexCleanup', { removed: staleKeys.length });
    }
  }

  createBatches(items, batchSize) {
    const batches = [];
    for (let i = 0; i < items.length; i += batchSize) {
      batches.push(items.slice(i, i + batchSize));
    }
    return batches;
  }

  recordCacheHit(key) {
    const cached = this.cache.get(key);
    if (cached) {
      cached.accessCount++;
    }
  }

  recordCacheMiss(key) {
    this.incrementMetric('cache.misses');
  }

  recordOperationTime(operation, time, success) {
    this.incrementMetric(`operations.${operation}.count`);
    this.recordMetric(`operations.${operation}.avgTime`, time);

    if (!success) {
      this.incrementMetric(`operations.${operation}.errors`);
    }

    if (time > this.thresholds.slowOperation) {
      this.emit('slowOperation', { operation, time });
    }
  }

  recordSearchMetrics(query, resultCount, time) {
    this.incrementMetric('search.count');
    this.recordMetric('search.avgTime', time);
    this.recordMetric('search.avgResults', resultCount);
  }

  incrementMetric(key) {
    const current = this.performanceMetrics.get(key) || 0;
    this.performanceMetrics.set(key, current + 1);
  }

  recordMetric(key, value) {
    const current = this.performanceMetrics.get(key) || { sum: 0, count: 0 };
    current.sum += value;
    current.count++;
    this.performanceMetrics.set(key, current);
  }

  startPerformanceMonitoring() {
    // Clear any existing intervals
    this.stopPerformanceMonitoring();

    const memoryInterval = setInterval(() => {
      this.optimizeMemoryUsage();
    }, 60000); // Check every minute

    const indexInterval = setInterval(() => {
      this.cleanupIndexes();
    }, this.thresholds.indexRebuildInterval);

    // Store interval references for cleanup
    this.intervals.push(memoryInterval, indexInterval);
  }

  stopPerformanceMonitoring() {
    // Clear all intervals
    this.intervals.forEach((interval) => {
      clearInterval(interval);
    });
    this.intervals = [];
  }

  getPerformanceReport() {
    const report = {
      memory: process.memoryUsage(),
      cache: {
        size: this.cache.size,
        hitRate: this.calculateCacheHitRate(),
      },
      indexes: {
        count: this.indexCache.size,
      },
      metrics: Object.fromEntries(this.performanceMetrics),
    };

    return report;
  }

  calculateCacheHitRate() {
    const hits = this.performanceMetrics.get('cache.hits') || 0;
    const misses = this.performanceMetrics.get('cache.misses') || 0;
    const total = hits + misses;

    return total > 0 ? hits / total : 0;
  }

  // Optimize a command
  optimizeCommand(command, context) {
    // Basic optimization: limit output of find commands
    if (command.startsWith('find ') && !command.includes('| head')) {
      return {
        optimized: true,
        command: `${command} | head -n 100`, // Limit to 100 lines
        reason: 'Limited find output to 100 lines for performance.',
      };
    }
    // Add more optimization rules here based on context
    return { optimized: false, command, reason: 'No optimization applied.' };
  }

  // Cleanup all resources
  cleanup() {
    // Stop performance monitoring intervals
    this.stopPerformanceMonitoring();

    this.cleanupCache(true);
    this.cleanupIndexes();
    this.cache.clear();
    this.indexCache.clear();
    this.performanceMetrics.clear();
  }
}

module.exports = PerformanceOptimizer;
