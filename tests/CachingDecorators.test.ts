Below are Jest test cases for the decorators defined in `CachingDecorators.ts`, following the patterns and project context specified:

```typescript
import { CacheResult, InvalidateCache, WarmCache, Memoize, BatchCache, CacheStats } from '../utils/CachingDecorators';
import { ICachingService, CacheOptions } from '../interfaces/ICachingService';
import { mockedCacheService } from '../tests/__mocks__/MockedCachingService';

// Mocked Data and Utilities
jest.mock('../interfaces/ICachingService', () => ({
  ...jest.requireActual('../interfaces/ICachingService'),
  mockedCacheService: {
    get: jest.fn(),
    set: jest.fn(),
    delete: jest.fn(),
    deletePattern: jest.fn(),
    warm: jest.fn(),
    mset: jest.fn(),
    getStatistics: jest.fn(),
  }
}));

describe('CachingDecorators', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('CacheResult', () => {
    let cacheService: jest.Mocked<ICachingService>;
    let TestClass: { new(): any };
    let testInstance: any;

    beforeEach(() => {
      cacheService = mockedCacheService;
      
      TestClass = class {
        @CacheResult(cacheService, { keyGenerator: (arg) => `custom-key-${arg}` })
        async compute(arg: number) {
          return arg * 2;
        }
      };
      
      testInstance = new TestClass();
    });

    it('should return cached result if available', async () => {
      cacheService.get.mockResolvedValueOnce(10);
      const result = await testInstance.compute(5);
      
      expect(cacheService.get).toHaveBeenCalledWith('custom-key-5');
      expect(result).toBe(10);
    });

    it('should compute result and cache it if not cached', async () => {
      cacheService.get.mockResolvedValueOnce(null);
      const result = await testInstance.compute(5);
      
      expect(cacheService.get).toHaveBeenCalledWith('custom-key-5');
      expect(result).toBe(10);
      expect(cacheService.set).toHaveBeenCalledWith('custom-key-5', 10, expect.anything());
    });

    it('should handle errors in computation', async () => {
      const errorMessage = 'Computation error';
      testInstance.compute = jest.fn().mockRejectedValueOnce(new Error(errorMessage));

      await expect(testInstance.compute(5)).rejects.toThrow(errorMessage);
    });
  });

  describe('InvalidateCache', () => {
    let cacheService: jest.Mocked<ICachingService>;
    let TestClass: { new(): any };
    let testInstance: any;

    beforeEach(() => {
      cacheService = mockedCacheService;

      TestClass = class {
        @InvalidateCache(cacheService, { keyPattern: 'invalidate-*' })
        async updateData() {
          return 'updated';
        }
      };
      
      testInstance = new TestClass();
    });

    it('should invalidate cache entries based on key pattern', async () => {
      const result = await testInstance.updateData();
      
      expect(cacheService.deletePattern).toHaveBeenCalledWith('invalidate-*');
      expect(result).toBe('updated');
    });

    it('should handle errors in cache invalidation', async () => {
      cacheService.deletePattern.mockRejectedValueOnce(new Error('Invalidation failed'));

      await expect(testInstance.updateData()).rejects.toThrow('Invalidation failed');
    });
  });

  describe('WarmCache', () => {
    let cacheService: jest.Mocked<ICachingService>;
    let TestClass: { new(): any };
    let testInstance: any;

    beforeEach(() => {
      cacheService = mockedCacheService;

      TestClass = class {
        @WarmCache(cacheService, { keys: ['