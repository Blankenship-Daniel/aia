Below is an example of how to create Jest tests for `UnifiedPerformanceMonitor` following the specified patterns. This includes tests for the main functionality as well as error scenarios, while focusing on proper mocking and TypeScript best practices.

```typescript
// Import necessary modules and mock utilities
import { jest } from '@jest/globals';
import { UnifiedPerformanceMonitor, PerformanceMetrics, CacheEntry } from '../src/utils/UnifiedPerformanceMonitor';
import * as mockUtils from '../tests/__mocks__/mockUtils';  // Assuming mock utilities are available here

describe('UnifiedPerformanceMonitor', () => {
  let monitor: UnifiedPerformanceMonitor;
  let mockFn: jest.Mock;

  beforeEach(() => {
    monitor = new UnifiedPerformanceMonitor();
    mockFn = jest.fn();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('monitor method', () => {
    it('should measure and cache a successful operation', async () => {
      mockFn.mockResolvedValue('result');

      const result = await monitor.monitor('test-operation', mockFn, {
        cache: true,
        cacheKey: 'test-key',
      });

      expect(result).toBe('result');
      expect(monitor.getFromCache('test-key')).toBe('result');

      const metrics: PerformanceMetrics[] = monitor['metrics'];
      expect(metrics.length).toBe(1);
      expect(metrics[0].operation).toBe('test-operation');

      expect(mockFn).toHaveBeenCalledTimes(1);
    });

    it('should return cached value on cache hit', async () => {
      const cacheEntry: CacheEntry = {
        value: 'cached-result',
        timestamp: Date.now(),
        accessCount: 1,
        size: 1,
      };
      jest.spyOn(monitor as any, 'getFromCache').mockReturnValueOnce(cacheEntry);

      const result = await monitor.monitor('test-operation', mockFn, {
        cache: true,
        cacheKey: 'test-key',
      });

      expect(result).toBe('cached-result');
      expect(mockFn).toHaveBeenCalledTimes(0);  // Ensure original function is not called

      const metrics: PerformanceMetrics[] = monitor['metrics'];
      expect(metrics[0].operation).toBe('test-operation:cache-hit');
    });

    it('should handle and throw an error from the monitored function', async () => {
      const error = new Error('Test Error');
      mockFn.mockRejectedValueOnce(error);

      await expect(
        monitor.monitor('test-error', mockFn)
      ).rejects.toThrow('Test Error');

      const metrics: PerformanceMetrics[] = monitor['metrics'];
      expect(metrics[0].success).toBe(false);
      expect(metrics[0].operation).toBe('test-error');
    });
  });

  describe('cache management', () => {
    it('should clear cache with matching pattern', () => {
      monitor.setCache('test-key1', 'value1');
      monitor.setCache('test-key2', 'value2');
      monitor.clearCache('test-key1');

      expect(monitor.getFromCache('test-key1')).toBeNull();
      expect(monitor.getFromCache('test-key2')).not.toBeNull();
    });

    it('should clear entire cache when no pattern is provided', () => {
      monitor.setCache('test-key1', 'value1');
      monitor.setCache('test-key2', 'value2');
      monitor.clearCache();

      expect(monitor.getFromCache('test-key1')).toBeNull();
      expect(monitor.getFromCache('test-key2')).toBeNull();
    });
  });

  describe('performance analysis', () => {
    it('should analyze performance metrics correctly', () => {
      monitor['metrics'] = [
        {
          operation: 'op1',
          duration: 100,
         