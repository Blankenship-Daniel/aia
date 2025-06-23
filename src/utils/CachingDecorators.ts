/**
 * Caching Decorators
 *
 * Method decorators that automatically cache function results
 * using the ICachingService interface.
 *
 * Part of SOLID Week 3: Advanced Performance Optimizations
 */

import {
  ICachingService,
  CacheOptions,
} from '../interfaces/ICachingService.js';

/**
 * Cache result decorator for methods
 * Automatically caches method results based on parameters
 */
export function CacheResult(
  cacheService: ICachingService,
  options: CacheOptions & {
    keyGenerator?: (...args: any[]) => string;
    condition?: (...args: any[]) => boolean;
  } = {}
) {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      // Check condition if provided
      if (options.condition && !options.condition(...args)) {
        return originalMethod.apply(this, args);
      }

      // Generate cache key
      const cacheKey = options.keyGenerator
        ? options.keyGenerator(...args)
        : `${target.constructor.name}:${propertyKey}:${JSON.stringify(args)}`;

      // Try to get from cache first
      const cached = await cacheService.get(cacheKey);
      if (cached !== null) {
        return cached;
      }

      // Execute original method and cache result
      const result = await originalMethod.apply(this, args);
      await cacheService.set(cacheKey, result, options);

      return result;
    };

    return descriptor;
  };
}

/**
 * Cache invalidation decorator for methods
 * Automatically invalidates cache entries when method is called
 */
export function InvalidateCache(
  cacheService: ICachingService,
  options: {
    keyPattern?: string;
    keyGenerator?: (...args: any[]) => string;
    patterns?: string[];
  } = {}
) {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      const result = await originalMethod.apply(this, args);

      // Invalidate cache entries
      if (options.keyPattern) {
        await cacheService.deletePattern(options.keyPattern);
      }

      if (options.keyGenerator) {
        const key = options.keyGenerator(...args);
        await cacheService.delete(key);
      }

      if (options.patterns) {
        for (const pattern of options.patterns) {
          await cacheService.deletePattern(pattern);
        }
      }

      return result;
    };

    return descriptor;
  };
}

/**
 * Cache warming decorator for methods
 * Pre-loads cache with commonly used data
 */
export function WarmCache(
  cacheService: ICachingService,
  options: {
    keys: string[];
    loader: (key: string) => Promise<any>;
    cacheOptions?: CacheOptions;
  }
) {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      // Warm cache before executing method
      for (const key of options.keys) {
        await cacheService.warm(
          key,
          () => options.loader(key),
          options.cacheOptions
        );
      }

      return originalMethod.apply(this, args);
    };

    return descriptor;
  };
}

/**
 * Memoization decorator for expensive computations
 * Caches method results based on input parameters
 */
export function Memoize(
  cacheService: ICachingService,
  options: CacheOptions & {
    maxEntries?: number;
    keySelector?: (...args: any[]) => string;
  } = {}
) {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      const cacheKey = options.keySelector
        ? options.keySelector(...args)
        : `memoize:${target.constructor.name}:${propertyKey}:${JSON.stringify(
            args
          )}`;

      // Check cache first
      const cached = await cacheService.get(cacheKey);
      if (cached !== null) {
        return cached;
      }

      // Execute and cache result
      const result = await originalMethod.apply(this, args);
      await cacheService.set(cacheKey, result, options);

      return result;
    };

    return descriptor;
  };
}

/**
 * Batch caching decorator for methods that can benefit from bulk operations
 */
export function BatchCache(
  cacheService: ICachingService,
  options: {
    batchSize?: number;
    keyExtractor: (item: any) => string;
    valueExtractor: (item: any) => any;
    cacheOptions?: CacheOptions;
  }
) {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      const result = await originalMethod.apply(this, args);

      // If result is an array, batch cache the items
      if (Array.isArray(result)) {
        const entries = result.map((item) => ({
          key: options.keyExtractor(item),
          value: options.valueExtractor(item),
          options: options.cacheOptions,
        }));

        await cacheService.mset(entries);
      }

      return result;
    };

    return descriptor;
  };
}

/**
 * Cache statistics decorator for monitoring cache performance
 */
export function CacheStats(cacheService: ICachingService) {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      const startTime = Date.now();

      try {
        const result = await originalMethod.apply(this, args);

        // Log cache performance if in debug mode
        if (process.env.NODE_ENV === 'development') {
          const stats = await cacheService.getStatistics();
          console.debug(
            `Cache Stats for ${target.constructor.name}.${propertyKey}:`,
            {
              hitRate: (stats.hitRate * 100).toFixed(2) + '%',
              totalKeys: stats.totalKeys,
              memoryUsage: `${(stats.memoryUsage / 1024).toFixed(2)} KB`,
              executionTime: `${Date.now() - startTime}ms`,
            }
          );
        }

        return result;
      } catch (error) {
        throw error;
      }
    };

    return descriptor;
  };
}
