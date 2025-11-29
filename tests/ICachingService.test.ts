Certainly! Below is an example of how you might set up Jest tests in TypeScript for the `ICachingService` interface, following the guidelines of using mocks, thorough testing, and considering both success and error scenarios.

```typescript
// jest.config.js mock utilities (hypothetical path, adjust as necessary)
import { mockCachingServiceFactory } from '../tests/__mocks__/mockCachingService';
import { ICachingService, CacheOptions, CacheStatistics } from '../../src/interfaces/ICachingService';

describe('ICachingService Tests', () => {
  let cachingService: ICachingService;

  beforeEach(() => {
    cachingService = mockCachingServiceFactory();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('set method', () => {
    it('should successfully set a value in the cache', async () => {
      const key = 'testKey';
      const value = 'testValue';
      const options: CacheOptions = { ttl: 1000 };

      await expect(cachingService.set(key, value, options)).resolves.toBeUndefined();
      expect(cachingService.set).toHaveBeenCalledWith(key, value, options);
    });

    it('should handle error when setting a value in the cache', async () => {
      const key = 'errorKey';
      const value = 'errorValue';
      cachingService.set = jest.fn().mockRejectedValue(new Error('Failed to set in cache'));

      await expect(cachingService.set(key, value)).rejects.toThrow('Failed to set in cache');
    });
  });

  describe('get method', () => {
    it('should retrieve a value by key', async () => {
      const key = 'existingKey';
      const expectedValue = 'existingValue';
      cachingService.get = jest.fn().mockResolvedValue(expectedValue);

      await expect(cachingService.get(key)).resolves.toEqual(expectedValue);
      expect(cachingService.get).toHaveBeenCalledWith(key);
    });

    it('should return null for non-existing key', async () => {
      const key = 'nonExistingKey';
      cachingService.get = jest.fn().mockResolvedValue(null);

      await expect(cachingService.get(key)).resolves.toBeNull();
    });

    it('should handle error during retrieval', async () => {
      const key = 'errorKey';
      cachingService.get = jest.fn().mockRejectedValue(new Error('Failed to retrieve from cache'));

      await expect(cachingService.get(key)).rejects.toThrow('Failed to retrieve from cache');
    });
  });

  describe('getStatistics method', () => {
    it('should return cache statistics', async () => {
      const statistics: CacheStatistics = {
        totalKeys: 10,
        hitRate: 0.8,
        missRate: 0.2,
        totalHits: 8,
        totalMisses: 2,
        totalRequests: 10,
        averageAccessTime: 5,
        memoryUsage: 2048,
        oldestEntry: 1633045698123,
        newestEntry: 1633045698123,
      };
      cachingService.getStatistics = jest.fn().mockResolvedValue(statistics);

      await expect(cachingService.getStatistics()).resolves.toEqual(statistics);
      expect(cachingService.getStatistics).toHaveBeenCalled();
    });

    it('should handle error when fetching statistics', async () => {
      cachingService.getStatistics = jest.fn().mockRejectedValue(new Error('Failed to fetch statistics'));

      await expect(cachingService.getStatistics()).rejects.toThrow('Failed to fetch statistics');
    });
  });

  describe('delete method', () => {
    it('should delete a key from the cache', async () => {
      const key = 'removableKey';
      cachingService.delete = jest.fn().mockResolvedValue(true);

      await expect