import ErrorHandler from '../src/ErrorHandler';

describe('ErrorHandler', () => {
  let errorHandler: ErrorHandler;

  beforeEach(() => {
    errorHandler = new ErrorHandler();
  });

  describe('Error Categorization', () => {
    test('should categorize network errors', () => {
      const networkError = new Error('ENOTFOUND api.openai.com');
      const category = errorHandler.categorizeError(networkError);

      expect(category.type).toBe('network');
      expect(category.recoverable).toBe(true);
    });

    test('should categorize API errors', () => {
      const apiError = new Error('401 Unauthorized');
      const category = errorHandler.categorizeError(apiError);

      expect(category.type).toBe('api');
      expect(category.recoverable).toBe(false);
    });

    test('should categorize timeout errors', () => {
      const timeoutError = new Error('Request timeout');
      const category = errorHandler.categorizeError(timeoutError);

      expect(category.type).toBe('timeout');
      expect(category.recoverable).toBe(true);
    });

    test('should categorize command errors correctly', () => {
      const commandError = new Error('Command failed with exit code 1');
      const category = errorHandler.categorizeError(commandError);

      expect(category.type).toBe('command');
      expect(category.recoverable).toBe(false);
    });

    test('should categorize unknown errors as system errors', () => {
      const unknownError = new Error('Something unexpected happened');
      const category = errorHandler.categorizeError(unknownError);

      expect(category.type).toBe('system');
      expect(category.recoverable).toBe(false);
    });
  });

  describe('Error Recovery', () => {
    test('should suggest retry for recoverable/network errors', () => {
      const networkError = new Error('ECONNRESET');
      const recovery = errorHandler.suggestRecovery(networkError);

      expect(recovery.action).toBe('retry');
      expect(recovery.delay).toBeGreaterThan(0);
      expect(recovery.maxRetries).toBeGreaterThan(0);
    });

    test('should suggest user action for API/auth errors', () => {
      const apiError = new Error('401 Unauthorized');
      const recovery = errorHandler.suggestRecovery(apiError);

      expect(recovery.action).toBe('user_action');
      expect(recovery.suggestion).toContain('API key');
    });

    test('should suggest ignore for non-critical errors', () => {
      const warningError = new Error('Warning: deprecated feature');
      const recovery = errorHandler.suggestRecovery(warningError);

      expect(recovery.action).toBe('ignore');
    });
  });

  describe('Retry Mechanism', () => {
    test('should retry operations with exponential backoff', async () => {
      let attempts = 0;
      const operation = jest.fn().mockImplementation(() => {
        attempts++;
        if (attempts < 3) {
          throw new Error('Temporary failure');
        }
        return 'success';
      });

      const result = await errorHandler.withRetry(operation, {
        maxRetries: 3,
        baseDelay: 10,
      });

      expect(result).toBe('success');
      expect(attempts).toBe(3);
    });

    test('should fail after max retries', async () => {
      const operation = jest.fn().mockImplementation(() => {
        throw new Error('Persistent failure');
      });

      try {
        await errorHandler.withRetry(operation, {
          maxRetries: 2,
          baseDelay: 10,
        });
        fail('Expected operation to fail after retries');
      } catch (error) {
        expect((error as Error).message).toBe('Persistent failure');
        expect(operation).toHaveBeenCalledTimes(3); // Initial + 2 retries
      }
    });

    test('should not retry non-recoverable errors', async () => {
      const operation = jest.fn().mockImplementation(() => {
        throw new Error('401 Unauthorized');
      });

      try {
        await errorHandler.withRetry(operation);
        fail('Expected operation to fail immediately');
      } catch (error) {
        expect((error as Error).message).toBe('401 Unauthorized');
        expect(operation).toHaveBeenCalledTimes(1); // No retries
      }
    });
  });

  describe('Circuit Breaker', () => {
    test('should open circuit after failure threshold', async () => {
      const operation = jest.fn().mockImplementation(() => {
        throw new Error('Service unavailable');
      });

      // Trigger multiple failures
      for (let i = 0; i < 5; i++) {
        try {
          await errorHandler.withCircuitBreaker('test-service', operation);
        } catch (error) {
          // Expected to fail
        }
      }

      // Circuit should be open now
      try {
        await errorHandler.withCircuitBreaker('test-service', operation);
        fail('Expected circuit breaker to prevent call');
      } catch (error) {
        expect((error as Error).message).toContain('Circuit breaker is open');
      }
    });

    test('should allow calls when circuit is closed', async () => {
      const operation = jest.fn().mockReturnValue('success');

      const result = await errorHandler.withCircuitBreaker(
        'test-service',
        operation
      );

      expect(result).toBe('success');
      expect(operation).toHaveBeenCalledTimes(1);
    });
  });

  describe('Error Logging', () => {
    test('should log errors with context', () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      const error = new Error('Test error');
      const context = { operation: 'test', userId: '123' };

      errorHandler.logError(error, context);

      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });
    test('should track error metrics', () => {
      const error = new Error('Test error');
      errorHandler.logError(error, { operation: 'test' });
      const metrics = errorHandler.getErrorMetrics();
      expect(metrics.total).toBeGreaterThan(0);
      expect(metrics.byType.system).toBeGreaterThan(0);
    });
  });

  describe('Error Metrics', () => {
    test('should provide error statistics', () => {
      // Generate some test errors
      errorHandler.logError(new Error('Network error'));
      errorHandler.logError(new Error('401 Unauthorized'));
      errorHandler.logError(new Error('Timeout'));

      const metrics = errorHandler.getErrorMetrics();

      expect(metrics).toHaveProperty('total');
      expect(metrics).toHaveProperty('byType');
      expect(metrics).toHaveProperty('recentErrors');
      expect(metrics.total).toBeGreaterThan(0);
    });
    test('should provide recent error history', () => {
      const error = new Error('Recent error');
      errorHandler.logError(error);
      const metrics = errorHandler.getErrorMetrics();
      expect(metrics.recentErrors.length).toBeGreaterThan(0);
      expect(
        metrics.recentErrors[metrics.recentErrors.length - 1]
      ).toHaveProperty('message', 'Recent error');
      expect(
        metrics.recentErrors[metrics.recentErrors.length - 1]
      ).toHaveProperty('timestamp');
    });
  });
});
