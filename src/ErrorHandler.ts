// Enhanced Error Handling and Resilience Module
// Provides consistent error handling, retry logic, and circuit breaker patterns

// @ts-ignore - chalk doesn't have types available
import chalk from 'chalk';

interface RetryConfig {
  maxRetries: number;
  baseDelay: number;
  maxDelay: number;
  backoffFactor: number;
}

interface ErrorPattern {
  regex: RegExp;
  type: string;
  severity: string;
  recoverable: boolean;
}

interface ErrorMetrics {
  total: number;
  byType: Record<string, number>;
  bySeverity: Record<string, number>;
  recentErrors: ErrorRecord[];
  maxRecentErrors: number;
}

interface ErrorRecord {
  errorId: string;
  message: string;
  type: string;
  severity: string;
  timestamp: string;
  context: Record<string, unknown>;
}

interface CircuitBreaker {
  state: 'CLOSED' | 'OPEN' | 'HALF_OPEN';
  failures: number;
  lastFailureTime: number | null;
  successes: number;
  requests: Array<{ timestamp: number; success: boolean }>;
  failureThreshold: number;
  recoveryTimeout: number;
  monitoringWindow: number;
}

interface EnhancedError {
  message: string;
  name: string;
  stack?: string;
  originalError: Error;
  context: Record<string, unknown>;
  timestamp: string;
  errorId: string;
  category: string;
  type: string;
  severity: string;
  recoverable: boolean;
}

interface ErrorClassification {
  type: string;
  severity: string;
  recoverable: boolean;
  message: string;
}

interface RecoveryAction {
  action: 'retry' | 'ignore' | 'escalate' | 'user_action';
  delay?: number;
  maxRetries?: number;
  suggestion?: string;
}

interface RecordedErrorPattern {
  count: number;
  firstSeen: string;
  lastSeen: string;
  examples: Array<{
    message: string;
    timestamp: string;
    context: Record<string, unknown>;
  }>;
  regex: RegExp | null;
}

interface CircuitBreakerOptions {
  failureThreshold?: number;
  recoveryTimeout?: number;
  monitoringWindow?: number;
}

interface RetryContext {
  maxRetries?: number;
  baseDelay?: number;
  retryCondition?: (error: Error) => boolean;
}

class ErrorHandler {
  private retryConfig: RetryConfig;
  private circuitBreakers: Map<string, CircuitBreaker>;
  private errorPatterns: Map<string, ErrorPattern>;
  private errorMetrics: ErrorMetrics;
  private recordedErrorPatterns: Map<string, RecordedErrorPattern>;
  private retryCounts: Record<string, number>;

  constructor() {
    this.retryConfig = {
      maxRetries: 3,
      baseDelay: 1000,
      maxDelay: 10000,
      backoffFactor: 2,
    };

    this.circuitBreakers = new Map();
    // Ensure regex patterns are robust
    this.errorPatterns = new Map([
      [
        'NetworkError',
        {
          regex: /ENOTFOUND|ECONNRESET|ETIMEDOUT|socket hang up/i,
          type: 'network',
          severity: 'HIGH',
          recoverable: true,
        },
      ],
      [
        'APIError', // Matches common HTTP error codes and "API key" text
        {
          regex:
            /(?:\b(?:400|401|403|404|429|500|502|503|504)\b|API key|rate_limit_exceeded|invalid_api_key)/i,
          type: 'api',
          severity: 'HIGH',
          recoverable: false, // Typically API errors like 401/403 are not simply retryable
        },
      ],
      [
        'TimeoutError',
        {
          regex: /timeout/i,
          type: 'timeout',
          severity: 'MEDIUM',
          recoverable: true,
        },
      ],
      [
        'CommandError',
        {
          regex: /command failed|exit code/i,
          type: 'command',
          severity: 'MEDIUM',
          recoverable: false,
        },
      ],
      [
        'Warning',
        {
          regex: /warning|deprecated/i,
          type: 'warning',
          severity: 'LOW',
          recoverable: true,
        },
      ],
      // Added a generic system error pattern as a fallback if others don't match
      [
        'SystemError',
        {
          // This regex is a placeholder and will likely be overridden by more specific checks.
          // The primary purpose is to have a 'system' type defined.
          regex: /.*/, // Matches any error message, should be last in evaluation or handled by fallback
          type: 'system',
          severity: 'MEDIUM',
          recoverable: false,
        },
      ],
    ]);

    this.errorMetrics = {
      total: 0,
      byType: {},
      bySeverity: {},
      recentErrors: [],
      maxRecentErrors: 50,
    };
    this.recordedErrorPatterns = new Map(); // Separate map for dynamic pattern recording
    this.retryCounts = {};
  }

  async withRetry<T>(
    operation: (attempt: number) => Promise<T>,
    context: RetryContext = {}
  ): Promise<T> {
    const {
      maxRetries = this.retryConfig.maxRetries,
      baseDelay = this.retryConfig.baseDelay,
      retryCondition = (error: Error) => this.shouldRetry(error),
    } = context;

    let lastError: Error;
    let attempt = 0;

    // Initial attempt + retries
    while (attempt <= maxRetries) {
      try {
        return await operation(attempt);
      } catch (error) {
        lastError = error as Error;

        if (attempt >= maxRetries || !retryCondition(lastError)) {
          throw this.enhanceError(lastError, { attempt, maxRetries });
        }

        const delay = Math.min(
          baseDelay * Math.pow(this.retryConfig.backoffFactor, attempt),
          this.retryConfig.maxDelay
        );

        console.log(
          chalk.yellow(
            `⚠️  Attempt ${attempt + 1} failed, retrying in ${delay}ms...`
          )
        );
        await this.sleep(delay);
        attempt++;
      }
    }

    throw this.enhanceError(lastError!, { attempt: maxRetries, maxRetries });
  }

  async withCircuitBreaker<T>(
    serviceId: string,
    operation: () => Promise<T>,
    options: CircuitBreakerOptions = {}
  ): Promise<T> {
    const {
      failureThreshold = 5,
      recoveryTimeout = 30000,
      monitoringWindow = 60000,
    } = options;

    let breaker = this.circuitBreakers.get(serviceId);

    if (!breaker) {
      breaker = {
        state: 'CLOSED', // CLOSED, OPEN, HALF_OPEN
        failures: 0,
        lastFailureTime: null,
        successes: 0,
        requests: [],
        failureThreshold,
        recoveryTimeout,
        monitoringWindow,
      };
      this.circuitBreakers.set(serviceId, breaker);
    }

    // Clean old requests from monitoring window
    const now = Date.now();
    breaker.requests = breaker.requests.filter(
      (req) => now - req.timestamp < monitoringWindow
    );

    // Check circuit breaker state
    if (breaker.state === 'OPEN') {
      if (
        breaker.lastFailureTime &&
        now - breaker.lastFailureTime > recoveryTimeout
      ) {
        breaker.state = 'HALF_OPEN';
        console.log(
          chalk.blue(
            `🔄 Circuit breaker for ${serviceId} is half-open, testing...`
          )
        );
      } else {
        throw new Error(
          `Circuit breaker is open for ${serviceId}. Service unavailable.`
        );
      }
    }

    try {
      const result = await operation();

      // Record success
      breaker.requests.push({ timestamp: now, success: true });
      breaker.successes++;

      if (breaker.state === 'HALF_OPEN') {
        breaker.state = 'CLOSED';
        breaker.failures = 0;
        console.log(
          chalk.green(`✅ Circuit breaker for ${serviceId} is now CLOSED`)
        );
      }

      return result;
    } catch (error) {
      // Record failure
      breaker.requests.push({ timestamp: now, success: false });
      breaker.failures++;
      breaker.lastFailureTime = now;

      // Check if we should open the circuit
      const recentFailures = breaker.requests.filter(
        (req) => !req.success && now - req.timestamp < monitoringWindow
      ).length;

      if (recentFailures >= failureThreshold && breaker.state === 'CLOSED') {
        breaker.state = 'OPEN';
        console.log(
          chalk.red(
            `🚫 Circuit breaker OPENED for ${serviceId} due to ${recentFailures} failures`
          )
        );
      }

      throw this.enhanceError(error as Error, {
        serviceId,
        circuitBreakerState: breaker.state,
      });
    }
  }

  shouldRetry(error: Error): boolean {
    // Don't retry for these error types
    const nonRetryableErrors = [
      'authentication',
      'authorization',
      'invalid_request',
      'not_found',
      'syntax_error',
    ];

    const errorMessage = error.message?.toLowerCase() || '';
    const errorCode = (error as any).code || (error as any).status;

    // Don't retry 4xx errors (except rate limiting 429 and specific API errors deemed retryable by patterns)
    const classification = this.categorizeError(error);
    if (classification.type === 'api' && classification.recoverable === false) {
      // If our patterns explicitly say an API error is not recoverable, don't retry.
      // This allows fine-grained control over which API errors (e.g. 401 vs 429) are retried.
      if (errorCode !== 429) return false; // Still allow 429 to be retryable by default
    } else if (errorCode >= 400 && errorCode < 500 && errorCode !== 429) {
      return false;
    }

    if (nonRetryableErrors.some((pattern) => errorMessage.includes(pattern))) {
      return false;
    }

    // Retry network errors, timeouts, 5xx errors, and generic failure messages
    return (
      errorMessage.includes('network') ||
      errorMessage.includes('timeout') ||
      errorMessage.includes('econnreset') ||
      errorMessage.includes('enotfound') ||
      errorMessage.includes('failure') || // Generic failure might be retryable
      errorCode >= 500 || // Server-side errors
      errorCode === 429 // Rate limiting
    );
  }

  enhanceError(
    error: Error,
    context: Record<string, unknown> = {}
  ): EnhancedError {
    const enhanced = new Error(error.message);
    enhanced.name = error.name;
    enhanced.stack = error.stack;
    (enhanced as any).originalError = error;
    (enhanced as any).context = context;
    (enhanced as any).timestamp = new Date().toISOString();
    (enhanced as any).errorId = this.generateErrorId();

    const classification = this.categorizeError(error);
    (enhanced as any).category = classification.type; // Retain 'category' for compatibility if used elsewhere
    (enhanced as any).type = classification.type; // Add 'type' for clarity
    (enhanced as any).severity = classification.severity.toUpperCase();
    (enhanced as any).recoverable = classification.recoverable;

    // Return a plain object for consistency, especially for logging and metrics
    return {
      message: enhanced.message,
      name: enhanced.name,
      stack: enhanced.stack,
      originalError: (enhanced as any).originalError,
      context: (enhanced as any).context,
      timestamp: (enhanced as any).timestamp,
      errorId: (enhanced as any).errorId,
      category: classification.type, // Keep category for compatibility
      type: classification.type,
      severity: classification.severity.toUpperCase(),
      recoverable: classification.recoverable,
    };
  }

  categorizeError(error: Error): ErrorClassification {
    const errorMessage = error.message || String(error);
    let type = 'unknown';
    let severity = 'LOW';
    let recoverable = false;

    // Iterate over predefined patterns first
    for (const [, patternDetails] of this.errorPatterns) {
      // Ensure regex exists before testing to prevent TypeError
      if (patternDetails.regex && patternDetails.regex.test(errorMessage)) {
        type = patternDetails.type;
        severity = patternDetails.severity;
        recoverable = patternDetails.recoverable;
        break;
      }
    }

    // If no pattern matched, and it's a generic Error, classify as 'system'
    // This helps distinguish from specifically patterned errors.
    if (type === 'unknown' && error instanceof Error) {
      const systemPattern = this.errorPatterns.get('SystemError');
      if (systemPattern) {
        type = systemPattern.type;
        severity = systemPattern.severity;
        recoverable = systemPattern.recoverable;
      } else {
        // Fallback if SystemError somehow isn't in map
        type = 'system';
        severity = 'MEDIUM';
        recoverable = false;
      }
    } else if (type === 'unknown') {
      // Non-Error objects that were thrown
      type = 'system'; // Or handle as a different kind of unknown
      severity = 'HIGH';
      recoverable = false;
    }

    return { type, severity, recoverable, message: errorMessage };
  }

  suggestRecovery(error: Error): RecoveryAction {
    const { type, recoverable, message = '' } = this.categorizeError(error);

    // Prioritize API key error for 401 specifically
    if (
      type === 'api' &&
      (message.includes('401') ||
        message.toLowerCase().includes('unauthorized') ||
        message.toLowerCase().includes('invalid_api_key'))
    ) {
      return {
        action: 'user_action',
        suggestion:
          'Check your API key and permissions. Run `aia config` to update.',
      };
    }

    if (!recoverable) {
      return {
        action: 'escalate',
        suggestion:
          'This error may require manual intervention or investigation.',
      };
    }

    const retryDelay =
      this.retryConfig.baseDelay * Math.pow(2, this.retryCounts[type] || 0);

    switch (type) {
      case 'network':
      case 'timeout':
        return {
          action: 'retry',
          delay: retryDelay,
          maxRetries: this.retryConfig.maxRetries,
        };
      case 'warning':
        return {
          action: 'ignore',
          suggestion: 'This is a warning and can likely be ignored.',
        };
      default: // Includes 'system' if it was marked recoverable by a pattern, or other recoverable 'unknowns'
        return {
          action: 'retry',
          delay: this.retryConfig.baseDelay,
          maxRetries: 1,
        };
    }
  }

  // Get error metrics
  getErrorMetrics(): ErrorMetrics {
    return {
      total: this.errorMetrics.total, // Changed from totalErrors to total
      byType: this.errorMetrics.byType,
      bySeverity: this.errorMetrics.bySeverity,
      recentErrors: this.errorMetrics.recentErrors,
      maxRecentErrors: this.errorMetrics.maxRecentErrors,
    };
  }

  // Reset error metrics
  resetErrorMetrics(): void {
    this.errorMetrics = {
      total: 0,
      byType: {},
      bySeverity: {},
      recentErrors: [],
      maxRecentErrors: 50,
    };
  }

  getCircuitBreakerStatusSummary(): Record<string, Partial<CircuitBreaker>> {
    const summary: Record<string, Partial<CircuitBreaker>> = {};
    for (const [serviceId, breaker] of this.circuitBreakers.entries()) {
      summary[serviceId] = {
        state: breaker.state,
        failures: breaker.failures,
        successes: breaker.successes,
        lastFailureTime: breaker.lastFailureTime,
      };
    }
    return summary;
  }

  assessSeverity(error: Error): string {
    const category = this.categorizeError(error);
    return category.severity.toUpperCase();
  }

  isRecoverable(error: Error): boolean {
    const category = this.categorizeError(error);
    return category.recoverable;
  }

  generateErrorId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  async sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  logError(error: Error, context: Record<string, unknown> = {}): EnhancedError {
    const enhanced = this.enhanceError(error, context);

    this.errorMetrics.total++;
    // Ensure type and severity are correctly cased for metric keys
    const typeKey = enhanced.type || 'unknown';
    const severityKey = enhanced.severity || 'MEDIUM'; // Default severity if undefined

    this.errorMetrics.byType[typeKey] =
      (this.errorMetrics.byType[typeKey] || 0) + 1;
    this.errorMetrics.bySeverity[severityKey] =
      (this.errorMetrics.bySeverity[severityKey] || 0) + 1;

    if (!this.errorMetrics.recentErrors) {
      this.errorMetrics.recentErrors = [];
    }
    this.errorMetrics.recentErrors.unshift({
      errorId: enhanced.errorId,
      message: enhanced.message,
      type: enhanced.type,
      severity: enhanced.severity,
      timestamp: enhanced.timestamp,
      context: enhanced.context,
    });
    if (
      this.errorMetrics.recentErrors.length > this.errorMetrics.maxRecentErrors
    ) {
      this.errorMetrics.recentErrors.pop();
    }

    console.error(chalk.red(`\n❌ Error [${enhanced.errorId}]:`));
    console.error(chalk.red(`   Category: ${enhanced.category}`)); // Keep 'category' for log output if desired
    console.error(chalk.red(`   Type: ${enhanced.type}`)); // Also log 'type'
    console.error(chalk.red(`   Severity: ${enhanced.severity}`));
    console.error(chalk.red(`   Message: ${enhanced.message}`));

    if (enhanced.context && Object.keys(enhanced.context).length > 0) {
      console.error(
        chalk.yellow(`   Context: ${JSON.stringify(enhanced.context, null, 2)}`)
      );
    }

    // Use the separate map for recording dynamic patterns
    this.recordErrorPattern(enhanced);

    return enhanced;
  }

  recordErrorPattern(error: EnhancedError): void {
    // This method now records to a separate map to avoid corrupting predefined errorPatterns
    const patternKey = error.type || 'unknown'; // Use 'type' as the key

    if (!this.recordedErrorPatterns.has(patternKey)) {
      this.recordedErrorPatterns.set(patternKey, {
        count: 0,
        firstSeen: error.timestamp,
        lastSeen: error.timestamp,
        examples: [],
        // Store the original regex if this pattern was from a predefined one, otherwise null
        regex: this.errorPatterns.get(error.name)?.regex || null,
      });
    }

    const patternData = this.recordedErrorPatterns.get(patternKey)!;
    patternData.count++;
    patternData.lastSeen = error.timestamp;

    patternData.examples.push({
      message: error.message,
      timestamp: error.timestamp,
      context: error.context,
    });

    if (patternData.examples.length > 5) {
      patternData.examples = patternData.examples.slice(-5);
    }
  }

  getErrorStatistics(): Record<string, unknown> {
    // Return statistics from the recordedErrorPatterns, not the predefined ones
    return {
      patterns: Object.fromEntries(this.recordedErrorPatterns),
      circuitBreakers: Object.fromEntries(
        Array.from(this.circuitBreakers.entries()).map(([id, breaker]) => [
          id,
          {
            state: breaker.state,
            failures: breaker.failures,
            successes: breaker.successes,
            lastFailureTime: breaker.lastFailureTime,
          },
        ])
      ),
    };
  }
}

export default ErrorHandler;
