/**
 * Resilience Service Interface
 * Handles timeout management, circuit breaking, and failure recovery
 */

export interface ExecutionOptions {
  maxRetries?: number;
  timeoutMs?: number;
  continueOnFailure?: boolean;
  gracefulDegradation?: boolean;
  allowFallbackExecution?: boolean;
}

export interface CircuitBreakerState {
  command: string;
  failureCount: number;
  lastFailure: string;
  consecutiveFailures: number;
  isBlocked: boolean;
  blockUntil: number;
  alternativeSuggested?: string;
}

export interface IResilienceService {
  /**
   * Execute operation with circuit breaker pattern
   */
  executeWithCircuitBreaker<T>(
    operation: () => Promise<T>,
    commandName: string,
    options?: ExecutionOptions
  ): Promise<T>;

  /**
   * Execute operation with timeout
   */
  executeWithTimeout<T>(
    operation: () => Promise<T>,
    timeoutMs: number,
    timeoutMessage?: string
  ): Promise<T>;

  /**
   * Execute operation with retry logic
   */
  executeWithRetry<T>(
    operation: () => Promise<T>,
    maxRetries: number,
    backoffFactor?: number
  ): Promise<T>;

  /**
   * Execute operation with all resilience patterns
   */
  executeWithFallback<T>(
    operation: () => Promise<T>,
    fallback: () => Promise<T>,
    options?: ExecutionOptions
  ): Promise<T>;

  /**
   * Check if a command is currently blocked
   */
  isCommandBlocked(commandName: string): boolean;

  /**
   * Get circuit breaker state for a command
   */
  getCircuitBreakerState(commandName: string): CircuitBreakerState | null;

  /**
   * Reset circuit breaker for a command
   */
  resetCircuitBreaker(commandName: string): void;

  /**
   * Get failure statistics
   */
  getFailureStats(): Record<string, CircuitBreakerState>;
}
