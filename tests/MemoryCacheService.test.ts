To create comprehensive Jest tests for the `MemoryCacheService`, the tests will be structured to follow the patterns and practices mentioned. They will validate the main functionalities: setting, getting, deleting, and handling cache evictions, along with error handling and mocked external dependencies. Let's outline the tests step by step.

First, we need the appropriate import statements and setup/teardown logic. Then, tests will target each method with both success and error scenarios.

```typescript
import { MemoryCacheService } from '../src/services/MemoryCacheService';
import {
  ICachingService,
  CacheOptions,
  CacheEntry,
  CacheStatistics,
} from '../src/interfaces/ICachingService';
import { setTimeout } from 'timers/promises';

// Mock utilities and dependencies if any
jest.mock('../src/interfaces/ICachingService');

describe('MemoryCacheService', () => {
  let cacheService: ICachingService;

  beforeEach(() => {
    cacheService = new MemoryCacheService({
      defaultTTL: 1000, // 1 second for easy testing
      maxItems: 2,
      cleanupIntervalMs: 50, // Quick cleanup intervals for test efficiency
    });
  });

  afterEach(() => {
    cacheService.dispose();
    jest.clearAllMocks();
  });

  describe('set and get operations', () => {
    it('should set and get a value successfully', async () => {
      await cacheService.set('testKey', 'testValue');
      const value = await cacheService.get<string>('testKey');
      expect(value).toBe('testValue');
    });

    it('should return null for a non-existent key', async () => {
      const value = await cacheService.get<string>('nonExistentKey');
      expect(value).toBeNull();
    });

    it('should evict oldest entry when maxItems is exceeded', async () => {
      await cacheService.set('key1', 'value1');
      await cacheService.set('key2', 'value2');
      await cacheService.set('key3', 'value3');

      const value1 = await cacheService.get<string>('key1');
      expect(value1).toBeNull(); // Should be evicted

      const value3 = await cacheService.get<string>('key3');
      expect(value3).toBe('value3');
    });

    it('should return null and delete an expired entry', async () => {
      await cacheService.set('expiringKey', 'expiringValue', { ttl: 100 });
      await setTimeout(150); // Wait for it to expire
      const value = await cacheService.get<string>('expiringKey');
      expect(value).toBeNull();
    });
  });

  describe('has operation', () => {
    it('should confirm existence of a key', async () => {
      await cacheService.set('existingKey', 'value');
      const hasKey = await cacheService.has('existingKey');
      expect(hasKey).toBe(true);
    });

    it('should confirm non-existence of a non-existent key', async () => {
      const hasKey = await cacheService.has('nonExistentKey');
      expect(hasKey).toBe(false);
    });

    it('should confirm non-existence of an expired key', async () => {
      await cacheService.set('expiringKey', 'value', { ttl: 50 });
      await setTimeout(100); // Wait beyond TTL
      const hasKey = await cacheService.has('expiringKey');
      expect(hasKey).toBe(false);
    });
  });

  describe('delete operation', () => {
    it('should delete an existing key and confirm', async () => {
      await cacheService.set('keyToDelete', 'value');
      const deleted = await cacheService.delete('keyToDelete');
      expect(deleted).toBe(true);
      const hasKey = await cache