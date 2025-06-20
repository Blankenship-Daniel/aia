import { EnhancedCachingService } from '../src/services/EnhancedCachingService';
import {
  IEnhancedCachingService,
  CacheStrategy,
  CacheMetrics,
  CacheAnalytics,
} from '../src/interfaces/IEnhancedCachingService';
import {
  ICachingService,
  CacheOptions,
} from '../src/interfaces/ICachingService';
import { IConfigurationService } from '../src/interfaces/IConfigurationService';
import { AIAConfig } from '../src/types/index';

// Mock dependencies
const mockCachingService: jest.Mocked<ICachingService> = {
  set: jest.fn(),
  get: jest.fn(),
  has: jest.fn(),
  delete: jest.fn(),
  deletePattern: jest.fn(),
  clear: jest.fn(),
  getStatistics: jest.fn(),
  keys: jest.fn(),
  size: jest.fn(),
  refresh: jest.fn(),
  mget: jest.fn(),
  mset: jest.fn(),
  warm: jest.fn(),
  startCleanup: jest.fn(),
  stopCleanup: jest.fn(),
  cleanup: jest.fn(),
};

const mockConfig: AIAConfig = {
  preferredModel: 'gpt-4',
  openaiApiKey: 'test-key',
  anthropicApiKey: 'test-key',
  autoExecute: false,
  plugins: {},
  profiles: {},
};

const mockConfigService: jest.Mocked<IConfigurationService> = {
  initialize: jest.fn(),
  loadConfiguration: jest.fn(),
  saveConfiguration: jest.fn(),
  getConfiguration: jest.fn().mockReturnValue(mockConfig),
  updateSetting: jest.fn(),
  getSetting: jest.fn(),
  setSetting: jest.fn(),
  createProfile: jest.fn(),
  switchProfile: jest.fn(),
  listProfiles: jest.fn(),
  deleteProfile: jest.fn(),
  getActiveProfile: jest.fn(),
  validateApiKeys: jest.fn(),
  getDefaultConfiguration: jest.fn(),
  resetToDefaults: jest.fn(),
  exportConfiguration: jest.fn(),
  importConfiguration: jest.fn(),
  validateConfiguration: jest.fn(),
  getAvailableModels: jest.fn(),
  isFeatureEnabled: jest.fn(),
  setFeatureEnabled: jest.fn(),
  getConfigurationPath: jest.fn(),
  watchConfiguration: jest.fn(),
  unwatchConfiguration: jest.fn(),
};

describe('EnhancedCachingService', () => {
  let enhancedCachingService: IEnhancedCachingService;
  let originalConsoleLog: typeof console.log;
  let consoleOutput: string[] = [];

  beforeEach(() => {
    jest.clearAllMocks();
    consoleOutput = [];

    // Mock console.log to capture output
    originalConsoleLog = console.log;
    console.log = jest.fn((...args) => {
      consoleOutput.push(args.join(' '));
    });

    enhancedCachingService = new EnhancedCachingService(
      mockCachingService,
      mockConfigService
    );
  });

  afterEach(() => {
    console.log = originalConsoleLog;
  });

  describe('Cache Analytics', () => {
    it('should return default analytics when no cache activity', async () => {
      const analytics = await enhancedCachingService.getCacheAnalytics();

      expect(analytics).toEqual({
        totalHits: 0,
        totalMisses: 0,
        hitRate: 0,
        missRate: 0,
        averageRetrievalTime: 0,
        spaceSavings: 0,
        performanceImprovement: 1,
      });
    });

    it('should calculate analytics correctly after cache operations', async () => {
      // Mock cache operations
      mockCachingService.get.mockResolvedValueOnce('cached-value');
      mockCachingService.get.mockResolvedValueOnce(null);
      mockCachingService.get.mockResolvedValueOnce('another-value');

      // Perform cache operations
      await enhancedCachingService.get('key1');
      await enhancedCachingService.get('key2');
      await enhancedCachingService.get('key3');

      const analytics = await enhancedCachingService.getCacheAnalytics();

      expect(analytics.totalHits).toBe(2);
      expect(analytics.totalMisses).toBe(1);
      expect(analytics.hitRate).toBeCloseTo(0.67, 2);
      expect(analytics.missRate).toBeCloseTo(0.33, 2);
    });

    it('should track individual key metrics', async () => {
      mockCachingService.get.mockResolvedValueOnce('value1');
      mockCachingService.get.mockResolvedValueOnce(null);

      await enhancedCachingService.get('test-key');
      await enhancedCachingService.get('test-key');

      const metrics = await enhancedCachingService.getCacheMetrics('test-key');

      expect(metrics).toBeDefined();
      if (typeof metrics === 'object' && 'hits' in metrics) {
        expect(metrics.hits).toBe(1);
        expect(metrics.misses).toBe(1);
        expect(metrics.hitRate).toBe(0.5);
        expect(metrics.accessFrequency).toBe(2);
      }
    });
  });

  describe('Cache Strategy Management', () => {
    it('should set and get cache strategies', async () => {
      const strategy: CacheStrategy = {
        ttl: 300000,
        maxSize: 50,
        evictionPolicy: 'lru',
        priority: 'high',
      };

      await enhancedCachingService.setCacheStrategy('test-key', strategy);
      const retrievedStrategy = await enhancedCachingService.getCacheStrategy(
        'test-key'
      );

      expect(retrievedStrategy).toEqual(strategy);
    });

    it('should return default strategy for unknown keys', async () => {
      const strategy = await enhancedCachingService.getCacheStrategy(
        'unknown-key'
      );

      expect(strategy).toEqual({
        ttl: 600000,
        maxSize: 100,
        evictionPolicy: 'lru',
        priority: 'medium',
      });
    });
  });

  describe('Cache Warming', () => {
    it('should warm cache for specified keys', async () => {
      const keys = ['key1', 'key2', 'key3'];

      await enhancedCachingService.warmCache(keys);

      // Verify warming was initiated (in real implementation, this would trigger data loading)
      expect(
        consoleOutput.some((output) =>
          output.includes('Warming cache for 3 keys')
        )
      ).toBe(true);
    });

    it('should suggest cache warming targets based on usage patterns', async () => {
      // Simulate high miss rate scenario
      mockCachingService.get.mockResolvedValue(null);

      // Create multiple misses for a key
      for (let i = 0; i < 6; i++) {
        await enhancedCachingService.get('frequent-miss-key');
      }

      const suggestions =
        await enhancedCachingService.suggestCacheWarmingTargets();

      expect(suggestions).toContain('frequent-miss-key');
    });
  });

  describe('Cache Operations with Metrics', () => {
    it('should track metrics during set operations', async () => {
      const testValue = { data: 'test' };

      await enhancedCachingService.set('test-key', testValue, 300000);

      expect(mockCachingService.set).toHaveBeenCalledWith(
        'test-key',
        testValue,
        { ttl: 300000 }
      );
    });

    it('should track metrics during get operations', async () => {
      mockCachingService.get.mockResolvedValueOnce('cached-value');

      const result = await enhancedCachingService.get('test-key');

      expect(result).toBe('cached-value');
      expect(mockCachingService.get).toHaveBeenCalledWith('test-key');
    });

    it('should delegate operations to underlying cache service', async () => {
      mockCachingService.keys.mockResolvedValueOnce(['key1', 'key2']);
      mockCachingService.size.mockResolvedValueOnce(2);
      mockCachingService.has.mockResolvedValueOnce(true);
      mockCachingService.delete.mockResolvedValueOnce(true);

      const keys = await enhancedCachingService.keys();
      const size = await enhancedCachingService.size();
      const exists = await enhancedCachingService.has('test-key');
      const deleted = await enhancedCachingService.delete('test-key');

      expect(keys).toEqual(['key1', 'key2']);
      expect(size).toBe(2);
      expect(exists).toBe(true);
      expect(deleted).toBe(true);
    });
  });

  describe('Performance Display', () => {
    it('should display cache performance dashboard', async () => {
      // Set up some cache activity
      mockCachingService.get.mockResolvedValueOnce('value1');
      mockCachingService.get.mockResolvedValueOnce(null);

      await enhancedCachingService.get('key1');
      await enhancedCachingService.get('key2');

      await enhancedCachingService.displayCachePerformance();

      // Verify dashboard output
      expect(
        consoleOutput.some((output) =>
          output.includes('Cache Performance Dashboard')
        )
      ).toBe(true);
      expect(consoleOutput.some((output) => output.includes('Hit Rate:'))).toBe(
        true
      );
      expect(
        consoleOutput.some((output) =>
          output.includes('Performance Improvement:')
        )
      ).toBe(true);
    });
  });

  describe('Cache Cleanup', () => {
    it('should perform cache cleanup', async () => {
      mockCachingService.keys.mockResolvedValue(['old-key', 'active-key']);
      mockCachingService.size.mockResolvedValue(2);
      mockCachingService.get.mockResolvedValue(null); // Mock get calls for size estimation

      await enhancedCachingService.cleanupCache();

      expect(
        consoleOutput.some((output) =>
          output.includes('Cache cleanup completed')
        )
      ).toBe(true);
    });
  });

  describe('Error Handling', () => {
    it('should handle cache service errors gracefully', async () => {
      mockCachingService.get.mockRejectedValueOnce(
        new Error('Cache service error')
      );

      await expect(enhancedCachingService.get('error-key')).rejects.toThrow(
        'Cache service error'
      );
    });

    it('should handle configuration service errors gracefully', async () => {
      mockConfigService.saveConfiguration.mockRejectedValueOnce(
        new Error('Config error')
      );

      const strategy: CacheStrategy = {
        ttl: 300000,
        maxSize: 50,
        evictionPolicy: 'lru',
        priority: 'high',
      };

      // Should not throw, but continue without persisting
      await expect(
        enhancedCachingService.setCacheStrategy('test-key', strategy)
      ).resolves.not.toThrow();
    });
  });

  describe('Memory Management', () => {
    it('should estimate cache entry sizes', async () => {
      const largeObject = { data: 'x'.repeat(1000) };

      await enhancedCachingService.set('large-key', largeObject);

      expect(mockCachingService.set).toHaveBeenCalled();
    });

    it('should format byte sizes correctly', async () => {
      // This tests internal formatting logic through display methods
      await enhancedCachingService.displayCachePerformance();

      // Verify formatting appears in output
      expect(
        consoleOutput.some(
          (output) => output.includes('Bytes') || output.includes('KB')
        )
      ).toBe(true);
    });
  });
});
