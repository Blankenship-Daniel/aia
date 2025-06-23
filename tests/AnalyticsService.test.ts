To generate comprehensive jest tests for the `AnalyticsService` class in the TypeScript CLI tool project, we will follow the given guidelines. We'll create separate describe blocks for different functionalities and ensure robust testing of both successful and error scenarios, leveraging Jest mocks to handle external dependencies.

```typescript
// tests/services/AnalyticsService.test.ts

import { AnalyticsService } from '../../src/services/AnalyticsService';
import { IMemoryService } from '../../src/interfaces/IMemoryService';
import { IPerformanceMonitor } from '../../src/interfaces/IPerformanceMonitor';
import { IEnhancedCachingService } from '../../src/interfaces/IEnhancedCachingService';
import { UsageAnalytics, PerformanceAnalytics, ProductivityReport } from '../../src/interfaces/IAnalyticsService';
import { CommandHistoryEntry } from '../../src/types/index';

// Mock implementations from __mocks__ if available
import { mockMemoryService } from '../__mocks__/IMemoryService';
import { mockPerformanceMonitor } from '../__mocks__/IPerformanceMonitor';
import { mockCachingService } from '../__mocks__/IEnhancedCachingService';

// Jest utilities for mocking
jest.mock('../../src/interfaces/IMemoryService');
jest.mock('../../src/interfaces/IPerformanceMonitor');
jest.mock('../../src/interfaces/IEnhancedCachingService');

describe('AnalyticsService', () => {
  let analyticsService: AnalyticsService;
  let memoryService: jest.Mocked<IMemoryService>;
  let performanceMonitor: jest.Mocked<IPerformanceMonitor>;
  let cachingService: jest.Mocked<IEnhancedCachingService>;

  beforeEach(() => {
    memoryService = new mockMemoryService();
    performanceMonitor = new mockPerformanceMonitor();
    cachingService = new mockCachingService();

    analyticsService = new AnalyticsService(memoryService, performanceMonitor, cachingService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getUsageAnalytics', () => {
    it('should return correct usage analytics data', async () => {
      // Setup mock memory data
      const mockMemoryData = {
        commands: [
          { command: 'test-command', duration: 200, exitCode: 0, timestamp: '2023-10-10T10:00:00Z', optimized: false },
          { command: 'another-command', duration: 300, exitCode: 1, timestamp: '2023-10-10T11:00:00Z', optimized: true },
        ] as CommandHistoryEntry[],
      };
      memoryService.loadMemory.mockResolvedValueOnce(mockMemoryData);

      const result: UsageAnalytics = await analyticsService.getUsageAnalytics();

      expect(result.totalCommands).toBe(2);
      expect(result.uniqueFeatures).toBe(2);
      expect(result.mostUsedCommands.length).toBeGreaterThan(0);
      expect(memoryService.loadMemory).toHaveBeenCalled();
    });

    it('should handle memory service errors gracefully', async () => {
      memoryService.loadMemory.mockRejectedValueOnce(new Error('Memory load error'));

      await expect(analyticsService.getUsageAnalytics()).rejects.toThrow('Memory load error');
    });
  });

  describe('getPerformanceAnalytics', () => {
    it('should handle empty command history correctly', async () => {
      memoryService.loadMemory.mockResolvedValueOnce({ commands: [] });

      const result: PerformanceAnalytics = await analyticsService.getPerformanceAnalytics();

      expect(result.averageExecutionTime).toBe(0);
      expect(result.commandPerformance).toHaveLength(0);
      expect(result.cacheEfficiency).toBe(0);
      expect(result.performanceImprovement).toBe(1);
    });

    it('should calculate performance analytics details correctly', async () => {
      // Mock command history
      const mockCommands: CommandHistoryEntry[] = [
        { command: 'perf-command', duration: 150, exitCode: 0, timestamp: '2023-10-10T12:00:00