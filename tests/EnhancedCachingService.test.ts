Below are the Jest tests for `EnhancedCachingService`. These tests cover the class's main functionalities, including success and error scenarios, while mocking external dependencies. They follow TypeScript best practices and utilize the project's specific patterns:

```typescript
import { EnhancedCachingService } from '../../src/services/EnhancedCachingService';
import {
  ICachingService,
  IConfigurationService,
  CacheMetrics,
  CacheStrategy,
  CacheAnalytics,
} from '../../src/interfaces/IEnhancedCachingService';
import { mocked } from 'ts-jest/utils';
import { EventEmitter } from 'events';

// Mock the external dependencies
jest.mock('../../src/interfaces/ICachingService');
jest.mock('../../src/interfaces/IConfigurationService');

describe('EnhancedCachingService', () => {
  let cachingService: jest.Mocked<ICachingService>;
  let configService: jest.Mocked<IConfigurationService>;
  let enhancedCachingService: EnhancedCachingService;

  beforeEach(() => {
    cachingService = new (mocked(ICachingService))();
    configService = new (mocked(IConfigurationService))();
    enhancedCachingService = new EnhancedCachingService(
      cachingService,
      configService
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getCacheMetrics', () => {
    it('should return metrics for a specific key if it exists', async () => {
      const metrics: CacheMetrics = {
        hits: 10,
        misses: 2,
        hitRate: 0.83,
        missRate: 0.17,
        averageRetrievalTime: 50,
        spaceSavings: 1000,
        accessFrequency: 15,
        lastAccessed: new Date(),
      };
      enhancedCachingService['cacheMetrics'].set('testKey', metrics);

      const result = await enhancedCachingService.getCacheMetrics('testKey');
      expect(result).toEqual(metrics);
    });

    it('should return default metrics for a non-existing key', async () => {
      const result = await enhancedCachingService.getCacheMetrics('nonExistentKey');
      expect(result).toEqual(expect.objectContaining({
        hits: 0,
        misses: 0,
        hitRate: 0,
        missRate: 0,
        averageRetrievalTime: 0,
        spaceSavings: 0,
        accessFrequency: 0,
      }));
    });

    it('should return all metrics in a Map if no key is provided', async () => {
      const metrics: CacheMetrics = {
        hits: 10,
        misses: 2,
        hitRate: 0.83,
        missRate: 0.17,
        averageRetrievalTime: 50,
        spaceSavings: 1000,
        accessFrequency: 15,
        lastAccessed: new Date(),
      };
      enhancedCachingService['cacheMetrics'].set('testKey', metrics);

      const result = await enhancedCachingService.getCacheMetrics();
      expect(result).toBeInstanceOf(Map);
      expect(result).toHaveProperty('size', 1);
    });
  });

  describe('setCacheStrategy', () => {
    it('should set a cache strategy and emit an event', async () => {
      const strategy: CacheStrategy = {
        ttl: 300000,
        maxSize: 50,
        evictionPolicy: 'lru',
        priority: 'high',
      };

      const emitSpy = jest.spyOn(enhancedCachingService, 'emit');
      await enhancedCachingService.setCacheStrategy('strategyKey', strategy);
      expect(enhancedCachingService['cacheStrategies'].get('strategyKey')).toEqual(strategy);
      expect(emitSpy).toHaveBeenCalledWith('strategyUpdated', { key: 'strategyKey', strategy });
    });
  });

  describe('getCacheStrategy', () => {
    it('should return the cache strategy for an existing key',