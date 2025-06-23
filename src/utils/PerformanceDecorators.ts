/**
 * Performance Monitoring Decorators
 *
 * Method decorators that automatically track performance metrics
 * using the IPerformanceMonitor interface.
 *
 * Part of SOLID Week 3: Advanced Performance Optimizations
 */

import { IPerformanceMonitor } from '../interfaces/IPerformanceMonitor.js';

/**
 * Performance monitoring decorator for methods
 * Automatically tracks execution time and success/failure rates
 */
export function MonitorPerformance(performanceMonitor: IPerformanceMonitor) {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      const startTime = Date.now();
      let success = true;
      let error: Error | undefined;

      try {
        const result = await originalMethod.apply(this, args);
        return result;
      } catch (err) {
        success = false;
        error = err instanceof Error ? err : new Error(String(err));
        throw err;
      } finally {
        const executionTime = Date.now() - startTime;
        await performanceMonitor.recordMethodExecution(
          target.constructor.name,
          propertyKey,
          executionTime,
          success,
          error
        );
      }
    };

    return descriptor;
  };
}

/**
 * Performance benchmark decorator
 * Logs detailed performance information for development/debugging
 */
export function Benchmark(
  options: {
    logLevel?: 'debug' | 'info' | 'warn';
    threshold?: number;
    includeArgs?: boolean;
  } = {}
) {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      const startTime = Date.now();
      const startMemory = process.memoryUsage().heapUsed;

      try {
        const result = await originalMethod.apply(this, args);

        const executionTime = Date.now() - startTime;
        const memoryDelta = process.memoryUsage().heapUsed - startMemory;

        // Log if execution time exceeds threshold or if no threshold is set
        if (!options.threshold || executionTime > options.threshold) {
          const logLevel = options.logLevel || 'debug';
          const message = `${target.constructor.name}.${propertyKey} - ${executionTime}ms, ${memoryDelta} bytes`;

          if (options.includeArgs) {
            console[logLevel](message, { args });
          } else {
            console[logLevel](message);
          }
        }

        return result;
      } catch (error) {
        const executionTime = Date.now() - startTime;
        console.error(
          `${target.constructor.name}.${propertyKey} failed after ${executionTime}ms`,
          error
        );
        throw error;
      }
    };

    return descriptor;
  };
}

/**
 * Throttle decorator to limit method execution frequency
 */
export function Throttle(limitMs: number) {
  const lastExecution = new Map<string, number>();

  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      const key = `${target.constructor.name}.${propertyKey}`;
      const now = Date.now();
      const last = lastExecution.get(key) || 0;

      if (now - last < limitMs) {
        throw new Error(
          `Method ${key} is being called too frequently. Please wait ${
            limitMs - (now - last)
          }ms.`
        );
      }

      lastExecution.set(key, now);
      return originalMethod.apply(this, args);
    };

    return descriptor;
  };
}

/**
 * Retry decorator with exponential backoff
 */
export function Retry(
  options: {
    maxAttempts?: number;
    baseDelayMs?: number;
    maxDelayMs?: number;
    backoffMultiplier?: number;
    retryCondition?: (error: Error) => boolean;
  } = {}
) {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      const maxAttempts = options.maxAttempts || 3;
      const baseDelayMs = options.baseDelayMs || 1000;
      const maxDelayMs = options.maxDelayMs || 10000;
      const backoffMultiplier = options.backoffMultiplier || 2;

      let lastError: Error;

      for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        try {
          return await originalMethod.apply(this, args);
        } catch (error) {
          lastError = error instanceof Error ? error : new Error(String(error));

          // Check if we should retry this error
          if (options.retryCondition && !options.retryCondition(lastError)) {
            throw lastError;
          }

          // Don't retry on last attempt
          if (attempt === maxAttempts) {
            throw lastError;
          }

          // Calculate delay with exponential backoff
          const delay = Math.min(
            baseDelayMs * Math.pow(backoffMultiplier, attempt - 1),
            maxDelayMs
          );

          console.warn(
            `${target.constructor.name}.${propertyKey} attempt ${attempt} failed, retrying in ${delay}ms`,
            error
          );

          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      }

      throw lastError!;
    };

    return descriptor;
  };
}

/**
 * Timeout decorator to limit method execution time
 */
export function Timeout(timeoutMs: number) {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      return Promise.race([
        originalMethod.apply(this, args),
        new Promise((_, reject) => {
          setTimeout(() => {
            reject(
              new Error(
                `Method ${target.constructor.name}.${propertyKey} timed out after ${timeoutMs}ms`
              )
            );
          }, timeoutMs);
        }),
      ]);
    };

    return descriptor;
  };
}

/**
 * Circuit breaker decorator to prevent cascade failures
 */
export function CircuitBreaker(
  options: {
    failureThreshold?: number;
    recoveryTimeMs?: number;
    monitorWindowMs?: number;
  } = {}
) {
  const failureThreshold = options.failureThreshold || 5;
  const recoveryTimeMs = options.recoveryTimeMs || 60000;
  const monitorWindowMs = options.monitorWindowMs || 60000;

  const circuits = new Map<
    string,
    {
      failures: number;
      lastFailureTime: number;
      state: 'closed' | 'open' | 'half-open';
    }
  >();

  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      const key = `${target.constructor.name}.${propertyKey}`;
      const circuit = circuits.get(key) || {
        failures: 0,
        lastFailureTime: 0,
        state: 'closed' as const,
      };

      const now = Date.now();

      // Reset circuit if enough time has passed
      if (now - circuit.lastFailureTime > monitorWindowMs) {
        circuit.failures = 0;
        circuit.state = 'closed';
      }

      // Check circuit state
      if (circuit.state === 'open') {
        if (now - circuit.lastFailureTime > recoveryTimeMs) {
          circuit.state = 'half-open';
        } else {
          throw new Error(
            `Circuit breaker is open for ${target.constructor.name}.${propertyKey}`
          );
        }
      }

      try {
        const result = await originalMethod.apply(this, args);

        // Success - close circuit if it was half-open
        if (circuit.state === 'half-open') {
          circuit.state = 'closed';
          circuit.failures = 0;
        }

        circuits.set(key, circuit);
        return result;
      } catch (error) {
        circuit.failures++;
        circuit.lastFailureTime = now;

        if (circuit.failures >= failureThreshold) {
          circuit.state = 'open';
        }

        circuits.set(key, circuit);
        throw error;
      }
    };

    return descriptor;
  };
}
