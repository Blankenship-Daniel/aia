// Enhanced Error Handling and Resilience Module
// Provides consistent error handling, retry logic, and circuit breaker patterns

const chalk = require('chalk');

class ErrorHandler {
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
  }

  async withRetry(operation, context = {}) {
    const {
      maxRetries = this.retryConfig.maxRetries,
      baseDelay = this.retryConfig.baseDelay,
      retryCondition = (error) => this.shouldRetry(error),
    } = context;

    let lastError;
    let attempt = 0;

    // Initial attempt + retries
    while (attempt <= maxRetries) {
      try {
        return await operation(attempt);
      } catch (error) {
        lastError = error;

        if (attempt >= maxRetries || !retryCondition(error)) {
          throw this.enhanceError(error, { attempt, maxRetries });
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

    throw this.enhanceError(lastError, { attempt: maxRetries, maxRetries });
  }

  async withCircuitBreaker(serviceId, operation, options = {}) {
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
      if (now - breaker.lastFailureTime > recoveryTimeout) {
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

      throw this.enhanceError(error, {
        serviceId,
        circuitBreakerState: breaker.state,
      });
    }
  }

  shouldRetry(error) {
    // Don't retry for these error types
    const nonRetryableErrors = [
      'authentication',
      'authorization',
      'invalid_request',
      'not_found',
      'syntax_error',
    ];

    const errorMessage = error.message?.toLowerCase() || '';
    const errorCode = error.code || error.status;

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

  enhanceError(error, context = {}) {
    const enhanced = new Error(error.message);
    enhanced.name = error.name;
    enhanced.stack = error.stack;
    enhanced.originalError = error;
    enhanced.context = context;
    enhanced.timestamp = new Date().toISOString();
    enhanced.errorId = this.generateErrorId();

    const classification = this.categorizeError(error);
    enhanced.category = classification.type; // Retain 'category' for compatibility if used elsewhere
    enhanced.type = classification.type; // Add 'type' for clarity
    enhanced.severity = classification.severity.toUpperCase();
    enhanced.recoverable = classification.recoverable;

    // Return a plain object for consistency, especially for logging and metrics
    return {
      message: enhanced.message,
      name: enhanced.name,
      stack: enhanced.stack,
      originalError: enhanced.originalError,
      context: enhanced.context,
      timestamp: enhanced.timestamp,
      errorId: enhanced.errorId,
      category: classification.type, // Keep category for compatibility
      type: classification.type,
      severity: classification.severity.toUpperCase(),
      recoverable: classification.recoverable,
    };
  }

  categorizeError(error) {
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

  suggestRecovery(error) {
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

    // Default retryCounts to an empty object if not initialized
    this.retryCounts = this.retryCounts || {};
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
  getErrorMetrics() {
    return {
      total: this.errorMetrics.total, // Changed from totalErrors to total
      byType: this.errorMetrics.byType,
      bySeverity: this.errorMetrics.bySeverity,
      recentErrors: this.errorMetrics.recentErrors,
    };
  }

  // Reset error metrics
  resetErrorMetrics() {
    this.errorMetrics = {
      total: 0,
      byType: {},
      bySeverity: {},
      recentErrors: [],
      maxRecentErrors: 50,
    };
  }

  getCircuitBreakerStatusSummary() {
    const summary = {};
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

  assessSeverity(error) {
    const category = this.categorizeError(error);
    return category.severity.toUpperCase();
  }

  isRecoverable(error) {
    const category = this.categorizeError(error);
    return category.recoverable;
  }

  generateErrorId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  async sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  logError(error, context = {}) {
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

  recordErrorPattern(error) {
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

    const patternData = this.recordedErrorPatterns.get(patternKey);
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

  getErrorStatistics() {
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

module.exports = ErrorHandler;
