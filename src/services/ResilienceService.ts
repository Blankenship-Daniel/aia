/**
 * Resilience Service Implementation
 * Handles timeout management, circuit breaking, and failure recovery
 */
import {
  IResilienceService,
  ExecutionOptions,
  CircuitBreakerState,
} from '../interfaces/IResilienceService';

export class ResilienceService implements IResilienceService {
  private circuitBreakers = new Map<string, CircuitBreakerState>();
  private readonly circuitBreakerThreshold = 3;
  private readonly circuitBreakerResetTimeMs = 30000; // 30 seconds
  private readonly defaultTimeoutMs = 30000; // 30 seconds
  private readonly defaultMaxRetries = 2;

  async executeWithCircuitBreaker<T>(
    operation: () => Promise<T>,
    commandName: string,
    options?: ExecutionOptions
  ): Promise<T> {
    const state = this.getOrCreateCircuitBreakerState(commandName);

    // Check if circuit breaker is open
    if (state.isBlocked) {
      if (Date.now() < state.blockUntil) {
        throw new Error(
          `Circuit breaker is open for command: ${commandName}. Try again later.`
        );
      } else {
        // Reset circuit breaker after timeout
        this.resetCircuitBreaker(commandName);
      }
    }

    try {
      const result = await operation();

      // Success - reset failure count
      state.consecutiveFailures = 0;
      state.isBlocked = false;

      return result;
    } catch (error) {
      // Failure - increment counters
      state.failureCount++;
      state.consecutiveFailures++;
      state.lastFailure =
        error instanceof Error ? error.message : 'Unknown error';

      // Check if we should open the circuit breaker
      if (state.consecutiveFailures >= this.circuitBreakerThreshold) {
        state.isBlocked = true;
        state.blockUntil = Date.now() + this.circuitBreakerResetTimeMs;

        if (options?.gracefulDegradation) {
          state.alternativeSuggested = `Consider using alternative approach for: ${commandName}`;
        }
      }

      throw error;
    }
  }

  async executeWithTimeout<T>(
    operation: () => Promise<T>,
    timeoutMs: number,
    timeoutMessage?: string
  ): Promise<T> {
    const timeout = timeoutMs || this.defaultTimeoutMs;
    const message = timeoutMessage || `Operation timed out after ${timeout}ms`;

    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => {
        reject(new Error(message));
      }, timeout);
    });

    return Promise.race([operation(), timeoutPromise]);
  }

  async executeWithRetry<T>(
    operation: () => Promise<T>,
    maxRetries: number,
    backoffFactor: number = 2
  ): Promise<T> {
    let lastError: Error | null = null;
    let delay = 1000; // Start with 1 second delay

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Unknown error');

        if (attempt === maxRetries) {
          throw lastError;
        }

        // Wait before retrying with exponential backoff
        await new Promise((resolve) => setTimeout(resolve, delay));
        delay *= backoffFactor;
      }
    }

    throw lastError;
  }

  async executeWithFallback<T>(
    operation: () => Promise<T>,
    fallback: () => Promise<T>,
    options?: ExecutionOptions
  ): Promise<T> {
    try {
      // Wrap the operation with all resilience patterns
      const wrappedOperation = async () => {
        if (options?.maxRetries && options.maxRetries > 0) {
          return await this.executeWithRetry(operation, options.maxRetries);
        }
        return await operation();
      };

      if (options?.timeoutMs) {
        return await this.executeWithTimeout(
          wrappedOperation,
          options.timeoutMs
        );
      }

      return await wrappedOperation();
    } catch (error) {
      if (options?.allowFallbackExecution) {
        try {
          return await fallback();
        } catch (fallbackError) {
          // If fallback also fails, throw the original error
          throw error;
        }
      }
      throw error;
    }
  }

  isCommandBlocked(commandName: string): boolean {
    const state = this.circuitBreakers.get(commandName);
    if (!state) return false;

    if (state.isBlocked && Date.now() >= state.blockUntil) {
      // Circuit breaker timeout expired, reset it
      this.resetCircuitBreaker(commandName);
      return false;
    }

    return state.isBlocked;
  }

  getCircuitBreakerState(commandName: string): CircuitBreakerState | null {
    return this.circuitBreakers.get(commandName) || null;
  }

  resetCircuitBreaker(commandName: string): void {
    const state = this.circuitBreakers.get(commandName);
    if (state) {
      state.consecutiveFailures = 0;
      state.isBlocked = false;
      state.blockUntil = 0;
      state.alternativeSuggested = undefined;
    }
  }

  getFailureStats(): Record<string, CircuitBreakerState> {
    const stats: Record<string, CircuitBreakerState> = {};

    this.circuitBreakers.forEach((state, commandName) => {
      stats[commandName] = { ...state };
    });

    return stats;
  }

  private getOrCreateCircuitBreakerState(
    commandName: string
  ): CircuitBreakerState {
    let state = this.circuitBreakers.get(commandName);

    if (!state) {
      state = {
        command: commandName,
        failureCount: 0,
        lastFailure: '',
        consecutiveFailures: 0,
        isBlocked: false,
        blockUntil: 0,
      };
      this.circuitBreakers.set(commandName, state);
    }

    return state;
  }
}
