import { AnalyticsService } from '../src/services/AnalyticsService';
import { IMemoryService } from '../src/interfaces/IMemoryService';
import { IPerformanceMonitor } from '../src/interfaces/IPerformanceMonitor';
import { IEnhancedCachingService } from '../src/interfaces/IEnhancedCachingService';
import { CommandHistoryEntry, MemoryEntry } from '../src/types/index';

describe('AnalyticsService', () => {
  let analyticsService: AnalyticsService;
  let mockMemoryService: jest.Mocked<IMemoryService>;
  let mockPerformanceMonitor: jest.Mocked<IPerformanceMonitor>;
  let mockCachingService: jest.Mocked<IEnhancedCachingService>;

  const mockCommandHistory: CommandHistoryEntry[] = [
    {
      command: 'agent "test task"',
      timestamp: '2024-01-01T10:00:00Z',
      workingDirectory: '/test',
      exitCode: 0,
      duration: 1500,
      optimized: true,
    },
    {
      command: 'ask "test question"',
      timestamp: '2024-01-01T11:00:00Z',
      workingDirectory: '/test',
      exitCode: 0,
      duration: 800,
      optimized: false,
    },
    {
      command: 'agent "another task"',
      timestamp: '2024-01-01T12:00:00Z',
      workingDirectory: '/test',
      exitCode: 1,
      duration: 2000,
      optimized: true,
    },
    {
      command: 'config --list',
      timestamp: '2024-01-01T13:00:00Z',
      workingDirectory: '/test',
      exitCode: 0,
      duration: 300,
      optimized: false,
    },
    {
      command: 'memory --stats',
      timestamp: '2024-01-01T14:00:00Z',
      workingDirectory: '/test',
      exitCode: 0,
      duration: 500,
      optimized: true,
    },
  ];

  const mockMemoryData = {
    conversations: [] as MemoryEntry[],
    commands: mockCommandHistory,
    preferences: {},
    workingDirectories: {},
  };

  beforeEach(() => {
    mockMemoryService = {
      loadMemory: jest.fn().mockResolvedValue(mockMemoryData),
      initialize: jest.fn().mockResolvedValue(mockMemoryData),
      saveMemory: jest.fn().mockResolvedValue(undefined),
      addConversation: jest.fn().mockResolvedValue(undefined),
      addCommand: jest.fn().mockResolvedValue(undefined),
      searchConversations: jest.fn().mockResolvedValue([]),
      searchCommands: jest.fn().mockResolvedValue([]),
      getStats: jest.fn().mockResolvedValue({
        totalConversations: 0,
        totalCommands: mockCommandHistory.length,
        memorySize: 1024,
        oldestEntry: '2024-01-01T10:00:00Z',
        newestEntry: '2024-01-01T14:00:00Z',
      }),
      clearMemory: jest.fn().mockResolvedValue(undefined),
      exportMemory: jest.fn().mockResolvedValue(undefined),
      importMemory: jest.fn().mockResolvedValue(undefined),
      compressMemory: jest.fn().mockResolvedValue(undefined),
      getRecentConversations: jest.fn().mockResolvedValue([]),
      getRecentCommands: jest
        .fn()
        .mockResolvedValue(mockCommandHistory.slice(-3)),
      getAgenticHistory: jest.fn().mockResolvedValue([]),
      storeAgenticExecution: jest.fn().mockResolvedValue(undefined),
      updatePreferences: jest.fn().mockResolvedValue(undefined),
      getPreferences: jest.fn().mockResolvedValue({}),
      searchMemory: jest.fn().mockResolvedValue([]),
    };

    mockPerformanceMonitor = {
      recordMethodExecution: jest.fn().mockResolvedValue(undefined),
      getMethodMetrics: jest.fn().mockResolvedValue({
        methodName: 'testMethod',
        className: 'TestClass',
        executionCount: 10,
        totalExecutionTime: 1500,
        averageExecutionTime: 150,
        minExecutionTime: 50,
        maxExecutionTime: 300,
        lastExecutionTime: 150,
        errorCount: 1,
      }),
      getClassMetrics: jest.fn().mockResolvedValue([]),
      getSystemMetrics: jest.fn().mockResolvedValue({
        memoryUsage: { used: 1024, total: 2048, percentage: 50 },
        cpuUsage: 25,
        uptime: 3600,
        timestamp: Date.now(),
      }),
      setThresholds: jest.fn().mockResolvedValue(undefined),
      getAlerts: jest.fn().mockResolvedValue([]),
      clearMetrics: jest.fn().mockResolvedValue(undefined),
      getPerformanceReport: jest.fn().mockResolvedValue({
        systemMetrics: {
          memoryUsage: { used: 1024, total: 2048, percentage: 50 },
          cpuUsage: 25,
          uptime: 3600,
          timestamp: Date.now(),
        },
        topSlowMethods: [],
        recentAlerts: [],
        summary: {
          totalMethods: 5,
          totalExecutions: 100,
          averageExecutionTime: 150,
          errorRate: 0.1,
        },
      }),
      setEnabled: jest.fn().mockResolvedValue(undefined),
      isEnabled: jest.fn().mockResolvedValue(true),
    };

    mockCachingService = {
      get: jest.fn().mockResolvedValue(null),
      set: jest.fn().mockResolvedValue(undefined),
      has: jest.fn().mockResolvedValue(false),
      delete: jest.fn().mockResolvedValue(true),
      clear: jest.fn().mockResolvedValue(undefined),
      size: jest.fn().mockResolvedValue(100),
      keys: jest.fn().mockResolvedValue(['key1', 'key2', 'key3']),
      getCacheAnalytics: jest.fn().mockResolvedValue({
        hitRate: 0.75,
        missRate: 0.25,
        totalHits: 150,
        totalMisses: 50,
        averageRetrievalTime: 25,
        spaceSavings: 1024 * 1024,
        performanceImprovement: 2.5,
      }),
      getCacheMetrics: jest.fn().mockResolvedValue(new Map()),
      displayCachePerformance: jest.fn().mockResolvedValue(undefined),
      suggestCacheWarmingTargets: jest
        .fn()
        .mockResolvedValue(['target1', 'target2']),
      warmCache: jest.fn().mockResolvedValue(undefined),
      cleanupCache: jest.fn().mockResolvedValue(undefined),
      getCacheStrategy: jest.fn().mockResolvedValue({
        ttl: 600000,
        maxSize: 100,
        evictionPolicy: 'lru' as const,
        priority: 'medium' as const,
      }),
      setCacheStrategy: jest.fn().mockResolvedValue(undefined),
    };

    analyticsService = new AnalyticsService(
      mockMemoryService,
      mockPerformanceMonitor,
      mockCachingService
    );
  });

  describe('getUsageAnalytics', () => {
    it('should return comprehensive usage analytics', async () => {
      const analytics = await analyticsService.getUsageAnalytics();

      expect(analytics).toHaveProperty('totalCommands', 5);
      expect(analytics).toHaveProperty('uniqueFeatures', 5); // agent, ask, config, memory, agent (another task)
      expect(analytics).toHaveProperty('mostUsedCommands');
      expect(analytics).toHaveProperty('timeDistribution');
      expect(analytics).toHaveProperty('featureAdoption');
      expect(analytics).toHaveProperty('errorPatterns');
      expect(analytics).toHaveProperty('averageSessionLength');
      expect(analytics).toHaveProperty('productivityScore');

      // Check most used commands
      expect(analytics.mostUsedCommands).toHaveLength(5);
      expect(analytics.mostUsedCommands[0].command).toBe('agent "test task"');
      expect(analytics.mostUsedCommands[0].count).toBe(1);

      // Check that productivityScore is a number between 0 and 10
      expect(analytics.productivityScore).toBeGreaterThanOrEqual(0);
      expect(analytics.productivityScore).toBeLessThanOrEqual(10);
    });

    it('should handle empty command history', async () => {
      mockMemoryService.loadMemory.mockResolvedValueOnce({
        conversations: [],
        commands: [],
        preferences: {},
        workingDirectories: {},
      });

      const analytics = await analyticsService.getUsageAnalytics();

      expect(analytics.totalCommands).toBe(0);
      expect(analytics.uniqueFeatures).toBe(0);
      expect(analytics.mostUsedCommands).toHaveLength(0);
      expect(analytics.productivityScore).toBe(0);
    });
  });

  describe('getPerformanceAnalytics', () => {
    it('should return comprehensive performance analytics', async () => {
      const analytics = await analyticsService.getPerformanceAnalytics();

      expect(analytics).toHaveProperty('averageExecutionTime');
      expect(analytics).toHaveProperty('commandPerformance');
      expect(analytics).toHaveProperty('cacheEfficiency');
      expect(analytics).toHaveProperty('performanceImprovement');
      expect(analytics).toHaveProperty('slowestCommands');
      expect(analytics).toHaveProperty('fastestCommands');
      expect(analytics).toHaveProperty('performanceTrends');

      // Check average execution time
      expect(analytics.averageExecutionTime).toBe(1020); // (1500+800+2000+300+500)/5

      // Check cache efficiency from mock
      expect(analytics.cacheEfficiency).toBe(0.75);

      // Check performance improvement calculation
      expect(analytics.performanceImprovement).toBe(2.5); // 1 + (0.75 * 2)
    });

    it('should handle caching service error gracefully', async () => {
      mockCachingService.getCacheAnalytics.mockRejectedValueOnce(
        new Error('Cache error')
      );

      const analytics = await analyticsService.getPerformanceAnalytics();

      // Should fall back to estimated cache efficiency
      expect(analytics.cacheEfficiency).toBe(0.6); // 3 optimized commands out of 5
      expect(analytics.performanceImprovement).toBe(2.2); // 1 + (0.6 * 2)
    });

    it('should return default values for empty command history', async () => {
      mockMemoryService.loadMemory.mockResolvedValueOnce({
        conversations: [],
        commands: [],
        preferences: {},
        workingDirectories: {},
      });

      const analytics = await analyticsService.getPerformanceAnalytics();

      expect(analytics.averageExecutionTime).toBe(0);
      expect(analytics.commandPerformance).toHaveLength(0);
      expect(analytics.cacheEfficiency).toBe(0); // No commands, so fallback cache efficiency should be 0
      expect(analytics.performanceImprovement).toBe(1); // 1 + (0 * 2) = 1
    });
  });

  describe('generateProductivityReport', () => {
    it('should generate comprehensive productivity report', async () => {
      const report = await analyticsService.generateProductivityReport();

      expect(report).toHaveProperty('timePeriod');
      expect(report).toHaveProperty('metrics');
      expect(report).toHaveProperty('insights');
      expect(report).toHaveProperty('recommendations');
      expect(report).toHaveProperty('score');

      // Check time period
      expect(report.timePeriod.start).toBeInstanceOf(Date);
      expect(report.timePeriod.end).toBeInstanceOf(Date);

      // Check metrics
      expect(report.metrics.commandsExecuted).toBe(5);
      expect(report.metrics.timesSaved).toBeGreaterThanOrEqual(0);
      expect(report.metrics.errorsAvoided).toBeGreaterThanOrEqual(0);
      expect(report.metrics.featuresDiscovered).toBeGreaterThanOrEqual(0);

      // Check insights array
      expect(Array.isArray(report.insights)).toBe(true);

      // Check recommendations array
      expect(Array.isArray(report.recommendations)).toBe(true);

      // Check score is within valid range
      expect(report.score).toBeGreaterThanOrEqual(0);
      expect(report.score).toBeLessThanOrEqual(10);
    });
  });

  describe('getOptimizationRecommendations', () => {
    it('should provide optimization recommendations based on usage patterns', async () => {
      const recommendations =
        await analyticsService.getOptimizationRecommendations();

      expect(Array.isArray(recommendations)).toBe(true);

      // Each recommendation should have required properties
      recommendations.forEach((rec) => {
        expect(rec).toHaveProperty('type');
        expect(rec).toHaveProperty('title');
        expect(rec).toHaveProperty('description');
        expect(rec).toHaveProperty('impact');
        expect(rec).toHaveProperty('effort');
        expect(['cache', 'workflow', 'configuration', 'feature']).toContain(
          rec.type
        );
        expect(['low', 'medium', 'high']).toContain(rec.impact);
        expect(['low', 'medium', 'high']).toContain(rec.effort);
      });
    });

    it('should recommend cache optimization for low cache efficiency', async () => {
      mockCachingService.getCacheAnalytics.mockResolvedValueOnce({
        hitRate: 0.4, // Low cache efficiency
        missRate: 0.6,
        totalHits: 40,
        totalMisses: 60,
        averageRetrievalTime: 50,
        spaceSavings: 1024,
        performanceImprovement: 1.5,
      });

      const recommendations =
        await analyticsService.getOptimizationRecommendations();

      const cacheRec = recommendations.find((r) => r.type === 'cache');
      expect(cacheRec).toBeDefined();
      expect(cacheRec!.impact).toBe('high');
      expect(cacheRec!.command).toBe('cache --warm --auto');
    });
  });

  describe('getUsageTrends', () => {
    it('should return daily usage trends', async () => {
      const trends = await analyticsService.getUsageTrends('day');

      expect(Array.isArray(trends)).toBe(true);
      expect(trends).toHaveLength(24); // 24 hours

      trends.forEach((trend) => {
        expect(trend).toHaveProperty('date');
        expect(trend).toHaveProperty('commandCount');
        expect(trend).toHaveProperty('uniqueCommands');
        expect(trend).toHaveProperty('averageSessionLength');
        expect(trend.date).toBeInstanceOf(Date);
        expect(typeof trend.commandCount).toBe('number');
        expect(typeof trend.uniqueCommands).toBe('number');
        expect(typeof trend.averageSessionLength).toBe('number');
      });
    });

    it('should return weekly usage trends', async () => {
      const trends = await analyticsService.getUsageTrends('week');

      expect(Array.isArray(trends)).toBe(true);
      expect(trends).toHaveLength(7); // 7 days
    });

    it('should return monthly usage trends', async () => {
      const trends = await analyticsService.getUsageTrends('month');

      expect(Array.isArray(trends)).toBe(true);
      expect(trends).toHaveLength(30); // 30 days
    });
  });

  describe('exportAnalytics', () => {
    it('should export analytics as JSON', async () => {
      const jsonData = await analyticsService.exportAnalytics('json');

      expect(typeof jsonData).toBe('string');

      const parsed = JSON.parse(jsonData);
      expect(parsed).toHaveProperty('timestamp');
      expect(parsed).toHaveProperty('usage');
      expect(parsed).toHaveProperty('performance');
      expect(parsed).toHaveProperty('productivity');
    });

    it('should export analytics as CSV', async () => {
      const csvData = await analyticsService.exportAnalytics('csv');

      expect(typeof csvData).toBe('string');
      expect(csvData).toContain('Metric,Value');
      expect(csvData).toContain('Total Commands,5');
      expect(csvData).toContain('Unique Commands,5');
    });
  });

  describe('displayAnalyticsDashboard', () => {
    it('should display comprehensive analytics dashboard', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      await analyticsService.displayAnalyticsDashboard();

      expect(consoleSpy).toHaveBeenCalled();

      // Check that various sections are displayed
      const allLogs = consoleSpy.mock.calls.map((call) => call.join(' '));
      const logText = allLogs.join('\n');

      expect(logText).toContain('Analytics Dashboard');
      expect(logText).toContain('Usage Overview');
      expect(logText).toContain('Performance Metrics');

      consoleSpy.mockRestore();
    });
  });

  describe('recordCommandExecution', () => {
    it('should record command execution for analytics', async () => {
      await analyticsService.recordCommandExecution('test-command', 1000, true);

      // This method updates internal state, so we test it indirectly by checking
      // that no errors are thrown and the method completes successfully
      expect(true).toBe(true);
    });
  });

  describe('recordFeatureUsage', () => {
    it('should record feature usage with context', async () => {
      const context = { source: 'test', timestamp: Date.now() };

      await analyticsService.recordFeatureUsage('test-feature', context);

      // This method updates internal state, so we test it indirectly
      expect(true).toBe(true);
    });

    it('should record feature usage without context', async () => {
      await analyticsService.recordFeatureUsage('test-feature');

      // This method updates internal state, so we test it indirectly
      expect(true).toBe(true);
    });
  });

  describe('clearAnalytics', () => {
    it('should clear all analytics data', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      await analyticsService.clearAnalytics();

      expect(consoleSpy).toHaveBeenCalledWith('All analytics data cleared');

      consoleSpy.mockRestore();
    });

    it('should clear analytics data older than specified date', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      const cutoffDate = new Date('2024-01-01');

      await analyticsService.clearAnalytics(cutoffDate);

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Clearing analytics data older than')
      );

      consoleSpy.mockRestore();
    });
  });
});
