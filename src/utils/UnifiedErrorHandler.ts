/**
 * Unified Error Handling System
 *
 * Simplifies error handling across the application while maintaining
 * robust error recovery and reporting capabilities.
 */

import { EventEmitter } from 'events';

export enum ErrorSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
}

export enum ErrorCategory {
  NETWORK = 'network',
  API = 'api',
  VALIDATION = 'validation',
  SYSTEM = 'system',
  USER = 'user',
  TIMEOUT = 'timeout',
  PERMISSION = 'permission',
}

export interface ErrorContext {
  operation?: string;
  component?: string;
  userId?: string;
  requestId?: string;
  retryAttempt?: number;
  fallback?: boolean;
  metadata?: Record<string, unknown>;
}

export interface EnhancedError extends Error {
  readonly id: string;
  readonly category: ErrorCategory;
  readonly severity: ErrorSeverity;
  readonly context: ErrorContext;
  readonly timestamp: Date;
  readonly recoverable: boolean;
  readonly retryable: boolean;
}

export interface ErrorRecoveryStrategy {
  retry?: {
    maxAttempts: number;
    delayMs: number;
    backoffMultiplier?: number;
  };
  fallback?: () => Promise<any>;
  skipStep?: boolean;
  userAction?: string;
}

export interface ErrorMetrics {
  totalErrors: number;
  errorsByCategory: Record<ErrorCategory, number>;
  errorsBySeverity: Record<ErrorSeverity, number>;
  recentErrors: EnhancedError[];
  lastResetTime: Date;
}

/**
 * Unified Error Handler
 *
 * Provides centralized error processing, classification, and recovery strategies
 */
export class UnifiedErrorHandler extends EventEmitter {
  private metrics: ErrorMetrics;
  private readonly maxRecentErrors = 100;
  private readonly errorPatterns: Map<
    RegExp,
    { category: ErrorCategory; severity: ErrorSeverity }
  >;

  /**
   * Creates an instance of the class
   */
  constructor() {
    super();
    this.metrics = this.initializeMetrics();
    this.errorPatterns = this.initializePatterns();
  }

  /**
   * Enhance and classify an error
   */
  enhanceError(
    error: Error,
    context: ErrorContext = {},
    options: { category?: ErrorCategory; severity?: ErrorSeverity } = {}
  ): EnhancedError {
    const classification = this.classifyError(error, options);

    const enhanced: EnhancedError = Object.assign(error, {
      id: this.generateErrorId(),
      category: classification.category,
      severity: classification.severity,
      context,
      timestamp: new Date(),
      recoverable: this.isRecoverable(
        classification.category,
        classification.severity
      ),
      retryable: this.isRetryable(classification.category, error.message),
    });

    this.recordError(enhanced);
    this.emit('error', enhanced);

    return enhanced;
  }

  /**
   * Get recovery strategy for an error
   */
  getRecoveryStrategy(error: EnhancedError): ErrorRecoveryStrategy {
    const strategy: ErrorRecoveryStrategy = {};

    // Retryable errors
    if (error.retryable) {
      strategy.retry = {
        maxAttempts: this.getMaxRetries(error.category),
        delayMs: this.getRetryDelay(error.category),
        backoffMultiplier: error.category === ErrorCategory.NETWORK ? 2 : 1.5,
      };
    }

    // Category-specific strategies
    switch (error.category) {
      case ErrorCategory.NETWORK:
      case ErrorCategory.TIMEOUT:
        strategy.fallback = async () => {
          console.warn(
            'Network operation failed, using cached data if available'
          );
          return null;
        };
        break;

      case ErrorCategory.API:
        if (error.message.includes('401') || error.message.includes('403')) {
          strategy.userAction =
            'Please check your API credentials and try again';
        } else if (error.message.includes('429')) {
          strategy.retry = {
            maxAttempts: 3,
            delayMs: 5000,
            backoffMultiplier: 2,
          };
        }
        break;

      case ErrorCategory.VALIDATION:
        strategy.userAction = 'Please check your input and try again';
        break;

      case ErrorCategory.PERMISSION:
        strategy.skipStep = error.severity !== ErrorSeverity.CRITICAL;
        strategy.userAction =
          'Insufficient permissions. Please check your access rights.';
        break;
    }

    return strategy;
  }

  /**
   * Execute operation with error handling and recovery
   */
  async executeWithRecovery<T>(
    operation: () => Promise<T>,
    context: ErrorContext = {},
    customStrategy?: Partial<ErrorRecoveryStrategy>
  ): Promise<T | null> {
    let lastError: EnhancedError;

    try {
      return await operation();
    } catch (error) {
      lastError = this.enhanceError(error as Error, context);
    }

    const strategy = {
      ...this.getRecoveryStrategy(lastError),
      ...customStrategy,
    };

    // Try retry strategy
    if (strategy.retry) {
      const { maxAttempts, delayMs, backoffMultiplier = 1.5 } = strategy.retry;

      for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        try {
          await this.delay(delayMs * Math.pow(backoffMultiplier, attempt - 1));
          return await operation();
        } catch (error) {
          if (attempt === maxAttempts) {
            lastError = this.enhanceError(error as Error, {
              ...context,
              retryAttempt: attempt,
            });
          }
        }
      }
    }

    // Try fallback strategy
    if (strategy.fallback) {
      try {
        return await strategy.fallback();
      } catch (fallbackError) {
        this.enhanceError(fallbackError as Error, {
          ...context,
          fallback: true,
        });
      }
    }

    // Skip step if configured
    if (strategy.skipStep) {
      console.warn(`Skipping operation due to error: ${lastError.message}`);
      return null;
    }

    // If user action is required, throw with enhanced context
    if (strategy.userAction) {
      lastError.message = `${lastError.message}\n${strategy.userAction}`;
    }

    throw lastError;
  }

  /**
   * Get current error metrics
   */
  getMetrics(): ErrorMetrics {
    return { ...this.metrics };
  }

  /**
   * Reset error metrics
   */
  resetMetrics(): void {
    this.metrics = this.initializeMetrics();
  }

  /**
   * Check if error is recoverable
   */
  private isRecoverable(
    category: ErrorCategory,
    severity: ErrorSeverity
  ): boolean {
    if (severity === ErrorSeverity.CRITICAL) return false;

    switch (category) {
      case ErrorCategory.NETWORK:
      case ErrorCategory.TIMEOUT:
      case ErrorCategory.API:
        return true;
      case ErrorCategory.VALIDATION:
      case ErrorCategory.USER:
        return severity !== ErrorSeverity.HIGH;
      default:
        return false;
    }
  }

  /**
   * Check if error is retryable
   */
  private isRetryable(category: ErrorCategory, message: string): boolean {
    // Non-retryable conditions
    if (
      message.includes('401') ||
      message.includes('403') ||
      message.includes('invalid')
    ) {
      return false;
    }

    switch (category) {
      case ErrorCategory.NETWORK:
      case ErrorCategory.TIMEOUT:
        return true;
      case ErrorCategory.API:
        return (
          message.includes('429') ||
          message.includes('503') ||
          message.includes('502')
        );
      default:
        return false;
    }
  }

  /**
   * Classify error based on message patterns and context
   */
  private classifyError(
    error: Error,
    options: { category?: ErrorCategory; severity?: ErrorSeverity }
  ): { category: ErrorCategory; severity: ErrorSeverity } {
    // Use provided classification if available
    if (options.category && options.severity) {
      return { category: options.category, severity: options.severity };
    }

    const message = error.message.toLowerCase();

    // Pattern-based classification
    for (const [pattern, classification] of this.errorPatterns) {
      if (pattern.test(message)) {
        return {
          category: options.category || classification.category,
          severity: options.severity || classification.severity,
        };
      }
    }

    // Default classification
    return {
      category: options.category || ErrorCategory.SYSTEM,
      severity: options.severity || ErrorSeverity.MEDIUM,
    };
  }

  /**
   * Initialize error classification patterns
   */
  private initializePatterns(): Map<
    RegExp,
    { category: ErrorCategory; severity: ErrorSeverity }
  > {
    return new Map([
      // Network errors
      [
        /network|connection|timeout|enotfound|econnreset/i,
        { category: ErrorCategory.NETWORK, severity: ErrorSeverity.HIGH },
      ],

      // API errors
      [
        /api|401|403|429|rate.?limit/i,
        { category: ErrorCategory.API, severity: ErrorSeverity.HIGH },
      ],

      // Validation errors
      [
        /validation|invalid|required|missing/i,
        { category: ErrorCategory.VALIDATION, severity: ErrorSeverity.MEDIUM },
      ],

      // Permission errors
      [
        /permission|denied|unauthorized|forbidden/i,
        { category: ErrorCategory.PERMISSION, severity: ErrorSeverity.HIGH },
      ],

      // Timeout errors
      [
        /timeout|timed.?out/i,
        { category: ErrorCategory.TIMEOUT, severity: ErrorSeverity.MEDIUM },
      ],
    ]);
  }

  /**
   * Initialize metrics
   */
  private initializeMetrics(): ErrorMetrics {
    return {
      totalErrors: 0,
      errorsByCategory: {
        [ErrorCategory.NETWORK]: 0,
        [ErrorCategory.API]: 0,
        [ErrorCategory.VALIDATION]: 0,
        [ErrorCategory.SYSTEM]: 0,
        [ErrorCategory.USER]: 0,
        [ErrorCategory.TIMEOUT]: 0,
        [ErrorCategory.PERMISSION]: 0,
      },
      errorsBySeverity: {
        [ErrorSeverity.LOW]: 0,
        [ErrorSeverity.MEDIUM]: 0,
        [ErrorSeverity.HIGH]: 0,
        [ErrorSeverity.CRITICAL]: 0,
      },
      recentErrors: [],
      lastResetTime: new Date(),
    };
  }

  /**
   * Record error in metrics
   */
  private recordError(error: EnhancedError): void {
    this.metrics.totalErrors++;
    this.metrics.errorsByCategory[error.category]++;
    this.metrics.errorsBySeverity[error.severity]++;

    this.metrics.recentErrors.unshift(error);
    if (this.metrics.recentErrors.length > this.maxRecentErrors) {
      this.metrics.recentErrors.pop();
    }
  }

  /**
   * Generate unique error ID
   */
  private generateErrorId(): string {
    return `err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get maximum retry attempts for category
   */
  private getMaxRetries(category: ErrorCategory): number {
    switch (category) {
      case ErrorCategory.NETWORK:
      case ErrorCategory.TIMEOUT:
        return 3;
      case ErrorCategory.API:
        return 2;
      default:
        return 1;
    }
  }

  /**
   * Get retry delay for category
   */
  private getRetryDelay(category: ErrorCategory): number {
    switch (category) {
      case ErrorCategory.NETWORK:
        return 1000;
      case ErrorCategory.API:
        return 2000;
      case ErrorCategory.TIMEOUT:
        return 500;
      default:
        return 1000;
    }
  }

  /**
   * Delay utility
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

// Global error handler instance
export const errorHandler = new UnifiedErrorHandler();

/**
 * Decorator for automatic error handling and recovery
 */
export function HandleErrors(
  context?: ErrorContext,
  strategy?: Partial<ErrorRecoveryStrategy>
) {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      const operationContext = {
        operation: `${target.constructor.name}.${propertyKey}`,
        component: target.constructor.name,
        ...context,
      };

      return errorHandler.executeWithRecovery(
        () => originalMethod.apply(this, args),
        operationContext,
        strategy
      );
    };

    return descriptor;
  };
}

/**
 * Utility functions for common error scenarios
 */
export const ErrorUtils = {
  /**
   * Create a validation error
   */
  validation: (message: string, context?: ErrorContext): EnhancedError => {
    return errorHandler.enhanceError(new Error(message), context, {
      category: ErrorCategory.VALIDATION,
      severity: ErrorSeverity.MEDIUM,
    });
  },

  /**
   * Create a network error
   */
  network: (message: string, context?: ErrorContext): EnhancedError => {
    return errorHandler.enhanceError(new Error(message), context, {
      category: ErrorCategory.NETWORK,
      severity: ErrorSeverity.HIGH,
    });
  },

  /**
   * Create an API error
   */
  api: (
    message: string,
    statusCode?: number,
    context?: ErrorContext
  ): EnhancedError => {
    const severity =
      statusCode && statusCode >= 500
        ? ErrorSeverity.HIGH
        : ErrorSeverity.MEDIUM;
    return errorHandler.enhanceError(
      new Error(`${message}${statusCode ? ` (${statusCode})` : ''}`),
      context,
      { category: ErrorCategory.API, severity }
    );
  },

  /**
   * Check if error should be retried
   */
  shouldRetry: (error: Error | EnhancedError): boolean => {
    if ('retryable' in error) {
      return error.retryable;
    }
    return false;
  },
};
