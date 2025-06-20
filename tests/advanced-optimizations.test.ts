/**
 * Week 3 Advanced Optimizations Tests
 * Tests for caching, performance monitoring, and enhanced memory services
 */

import { MemoryCacheService } from '../src/services/MemoryCacheService';
import { PerformanceMonitorService } from '../src/services/PerformanceMonitorService';
import { ConversationMemoryService } from '../src/services/ConversationMemoryService';
import { MemoryPersistenceService } from '../src/services/MemoryPersistenceService';
import { ICachingService } from '../src/interfaces/ICachingService';
import { IPerformanceMonitor } from '../src/interfaces/IPerformanceMonitor';
import { MemoryEntry, ContextInfo } from '../src/types/index';

describe('Week 3: Advanced Optimizations', () => {
  describe('MemoryCacheService', () => {
    let cacheService: ICachingService;

    beforeEach(() => {
      cacheService = new MemoryCacheService({
        defaultTTL: 1000, // 1 second for testing
        maxItems: 10,
        cleanupIntervalMs: 100,
      });
    });

    afterEach(async () => {
      await cacheService.clear();
      if (cacheService instanceof MemoryCacheService) {
        cacheService.destroy();
      }
    });

    it('should store and retrieve values', async () => {
      await cacheService.set('test-key', { data: 'test-value' });
      const result = await cacheService.get('test-key');

      expect(result).toEqual({ data: 'test-value' });
    });

    it('should handle TTL expiration', async () => {
      await cacheService.set('ttl-key', 'test-value', { ttl: 50 });

      // Should exist immediately
      expect(await cacheService.has('ttl-key')).toBe(true);

      // Wait for expiration
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Should be expired
      expect(await cacheService.has('ttl-key')).toBe(false);
    });

    it('should enforce max items limit with LRU eviction', async () => {
      // Fill cache to max capacity
      for (let i = 0; i < 10; i++) {
        await cacheService.set(`key-${i}`, `value-${i}`);
      }

      // Add one more item to trigger eviction
      await cacheService.set('new-key', 'new-value');

      // First item should be evicted
      expect(await cacheService.has('key-0')).toBe(false);
      expect(await cacheService.has('new-key')).toBe(true);
    });

    it('should provide accurate statistics', async () => {
      await cacheService.set('stat-key-1', 'value1');
      await cacheService.set('stat-key-2', 'value2');

      // Generate some hits and misses
      await cacheService.get('stat-key-1'); // hit
      await cacheService.get('stat-key-2'); // hit
      await cacheService.get('nonexistent'); // miss

      const stats = await cacheService.getStatistics();

      expect(stats.totalKeys).toBe(2);
      expect(stats.totalHits).toBe(2);
      expect(stats.totalMisses).toBe(1);
      expect(stats.totalRequests).toBe(3);
      expect(stats.hitRate).toBeCloseTo(0.67, 2);
    });

    it('should support bulk operations', async () => {
      const entries = [
        { key: 'bulk-1', value: 'value1' },
        { key: 'bulk-2', value: 'value2' },
        { key: 'bulk-3', value: 'value3' },
      ];

      await cacheService.mset(entries);

      const results = await cacheService.mget([
        'bulk-1',
        'bulk-2',
        'bulk-3',
        'nonexistent',
      ]);

      expect(results).toEqual(['value1', 'value2', 'value3', null]);
    });

    it('should support pattern-based deletion', async () => {
      await cacheService.set('user:1:profile', 'profile1');
      await cacheService.set('user:2:profile', 'profile2');
      await cacheService.set('user:1:settings', 'settings1');
      await cacheService.set('system:config', 'config');

      const deletedCount = await cacheService.deletePattern('user:*');

      expect(deletedCount).toBe(3);
      expect(await cacheService.has('system:config')).toBe(true);
    });

    it('should support cache warming', async () => {
      let loaderCalled = false;
      const loader = async () => {
        loaderCalled = true;
        return 'loaded-value';
      };

      // First call should load and cache
      const result1 = await cacheService.warm('warm-key', loader);
      expect(result1).toBe('loaded-value');
      expect(loaderCalled).toBe(true);

      // Second call should use cache
      loaderCalled = false;
      const result2 = await cacheService.warm('warm-key', loader);
      expect(result2).toBe('loaded-value');
      expect(loaderCalled).toBe(false);
    });
  });

  describe('PerformanceMonitorService', () => {
    let performanceMonitor: IPerformanceMonitor;

    beforeEach(() => {
      performanceMonitor = new PerformanceMonitorService();
    });

    afterEach(async () => {
      await performanceMonitor.clearMetrics();
    });

    it('should record method execution metrics', async () => {
      await performanceMonitor.recordMethodExecution(
        'TestClass',
        'testMethod',
        150,
        true
      );

      const metrics = await performanceMonitor.getMethodMetrics(
        'TestClass',
        'testMethod'
      );

      expect(metrics).not.toBeNull();
      expect(metrics!.executionCount).toBe(1);
      expect(metrics!.totalExecutionTime).toBe(150);
      expect(metrics!.averageExecutionTime).toBe(150);
      expect(metrics!.errorCount).toBe(0);
    });

    it('should track multiple executions and calculate statistics', async () => {
      await performanceMonitor.recordMethodExecution(
        'TestClass',
        'testMethod',
        100,
        true
      );
      await performanceMonitor.recordMethodExecution(
        'TestClass',
        'testMethod',
        200,
        true
      );
      await performanceMonitor.recordMethodExecution(
        'TestClass',
        'testMethod',
        150,
        false,
        new Error('Test error')
      );

      const metrics = await performanceMonitor.getMethodMetrics(
        'TestClass',
        'testMethod'
      );

      expect(metrics!.executionCount).toBe(3);
      expect(metrics!.totalExecutionTime).toBe(450);
      expect(metrics!.averageExecutionTime).toBe(150);
      expect(metrics!.minExecutionTime).toBe(100);
      expect(metrics!.maxExecutionTime).toBe(200);
      expect(metrics!.errorCount).toBe(1);
    });

    it('should generate alerts when thresholds are exceeded', async () => {
      await performanceMonitor.setThresholds({
        maxExecutionTime: 100,
        maxErrorRate: 25,
      });

      // Trigger execution time threshold
      await performanceMonitor.recordMethodExecution(
        'SlowClass',
        'slowMethod',
        150,
        true
      );

      // Trigger error rate threshold
      await performanceMonitor.recordMethodExecution(
        'ErrorClass',
        'errorMethod',
        50,
        false
      );
      await performanceMonitor.recordMethodExecution(
        'ErrorClass',
        'errorMethod',
        50,
        false
      );
      await performanceMonitor.recordMethodExecution(
        'ErrorClass',
        'errorMethod',
        50,
        true
      );

      const alerts = await performanceMonitor.getAlerts();

      expect(alerts.length).toBeGreaterThan(0);
      const executionTimeAlert = alerts.find((a) =>
        a.message.includes('execution time')
      );
      expect(executionTimeAlert).toBeDefined();
    });

    it('should provide comprehensive performance report', async () => {
      // Add some test data
      await performanceMonitor.recordMethodExecution(
        'ClassA',
        'methodA',
        100,
        true
      );
      await performanceMonitor.recordMethodExecution(
        'ClassB',
        'methodB',
        200,
        true
      );
      await performanceMonitor.recordMethodExecution(
        'ClassC',
        'methodC',
        50,
        false
      );

      const report = await performanceMonitor.getPerformanceReport();

      expect(report.summary.totalMethods).toBe(3);
      expect(report.summary.totalExecutions).toBe(3);
      expect(report.summary.averageExecutionTime).toBeCloseTo(116.67, 1);
      expect(report.summary.errorRate).toBeCloseTo(33.33, 1);
      expect(report.topSlowMethods).toHaveLength(3);
      expect(report.systemMetrics).toBeDefined();
    });

    it('should respect enabled/disabled state', async () => {
      await performanceMonitor.setEnabled(false);

      await performanceMonitor.recordMethodExecution(
        'TestClass',
        'testMethod',
        100,
        true
      );

      const metrics = await performanceMonitor.getMethodMetrics(
        'TestClass',
        'testMethod'
      );
      expect(metrics).toBeNull();

      await performanceMonitor.setEnabled(true);
      expect(await performanceMonitor.isEnabled()).toBe(true);
    });
  });

  describe('Enhanced ConversationMemoryService with Caching', () => {
    let conversationMemory: ConversationMemoryService;
    let persistence: MemoryPersistenceService;
    let cacheService: ICachingService;
    let mockConfigService: any;

    beforeEach(async () => {
      mockConfigService = {
        getConfig: jest.fn().mockResolvedValue({}),
        setConfig: jest.fn().mockResolvedValue(undefined),
      };

      persistence = new MemoryPersistenceService(mockConfigService);
      cacheService = new MemoryCacheService();
      conversationMemory = new ConversationMemoryService(
        persistence,
        cacheService
      );

      // Initialize with empty memory
      await persistence.saveMemory({
        conversations: [],
        commands: [],
        preferences: {},
        workingDirectories: {},
        semanticIndex: {},
        agenticHistory: [],
      });
    });

    afterEach(async () => {
      await cacheService.clear();
      if (cacheService instanceof MemoryCacheService) {
        cacheService.destroy();
      }
    });

    it('should cache search results', async () => {
      const context: ContextInfo = {
        workingDirectory: '/test',
        platform: 'linux',
        arch: 'x64',
        nodeVersion: '18.0.0',
        user: 'testuser',
        shell: 'bash',
        timestamp: new Date().toISOString(),
        projectType: 'nodejs',
        projectInfo: {},
        gitStatus: 'clean',
        environmentScore: 0.8,
      };

      // Add test conversations
      await conversationMemory.addConversation(
        'How to implement caching?',
        'You can implement caching using in-memory stores like Redis or simple Maps',
        context
      );

      await conversationMemory.addConversation(
        'What is performance monitoring?',
        'Performance monitoring tracks application metrics and execution times',
        context
      );

      // First search should hit the database and cache the result
      const results1 = await conversationMemory.searchConversations(
        'caching',
        5
      );
      expect(results1).toHaveLength(1);

      // Verify the result is cached
      const cacheKey = 'conversation:search:caching:5';
      const cachedResult = await cacheService.get(cacheKey);
      expect(cachedResult).toBeDefined();
      expect(cachedResult).toEqual(results1);

      // Second identical search should use cached result
      const results2 = await conversationMemory.searchConversations(
        'caching',
        5
      );
      expect(results2).toEqual(results1);
    });

    it('should invalidate cache when new conversations are added', async () => {
      const context: ContextInfo = {
        workingDirectory: '/test',
        platform: 'linux',
        arch: 'x64',
        nodeVersion: '18.0.0',
        user: 'testuser',
        shell: 'bash',
        timestamp: new Date().toISOString(),
        projectType: 'nodejs',
        projectInfo: {},
        gitStatus: 'clean',
        environmentScore: 0.8,
      };

      // First search (empty results, but cached)
      await conversationMemory.searchConversations('typescript', 5);

      // Verify empty result is cached
      const cacheKey = 'conversation:search:typescript:5';
      let cachedResult = await cacheService.get(cacheKey);
      expect(cachedResult).toEqual([]);

      // Add a new conversation
      await conversationMemory.addConversation(
        'How to use TypeScript?',
        'TypeScript adds static typing to JavaScript',
        context
      );

      // Cache should be invalidated
      cachedResult = await cacheService.get(cacheKey);
      expect(cachedResult).toBeNull();

      // New search should return the added conversation
      const results = await conversationMemory.searchConversations(
        'typescript',
        5
      );
      expect(results).toHaveLength(1);
      expect(results[0].query).toBe('How to use TypeScript?');
    });

    it('should cache recent conversations', async () => {
      const context: ContextInfo = {
        workingDirectory: '/test',
        platform: 'linux',
        arch: 'x64',
        nodeVersion: '18.0.0',
        user: 'testuser',
        shell: 'bash',
        timestamp: new Date().toISOString(),
        projectType: 'nodejs',
        projectInfo: {},
        gitStatus: 'clean',
        environmentScore: 0.8,
      };

      // Add test conversations
      for (let i = 0; i < 3; i++) {
        await conversationMemory.addConversation(
          `Query ${i}`,
          `Response ${i}`,
          context
        );
      }

      // First call should cache the results
      const recent1 = await conversationMemory.getRecentConversations(2);
      expect(recent1).toHaveLength(2);

      // Verify caching
      const cacheKey = 'conversation:recent:2';
      const cachedRecent = await cacheService.get(cacheKey);
      expect(cachedRecent).toEqual(recent1);

      // Second call should use cache
      const recent2 = await conversationMemory.getRecentConversations(2);
      expect(recent2).toEqual(recent1);
    });
  });
});
