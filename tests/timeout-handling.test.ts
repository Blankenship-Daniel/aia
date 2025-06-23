import ErrorHandler from '../src/ErrorHandler';

describe('Timeout Handling Tests', () => {
  let errorHandler: ErrorHandler;

  beforeEach(() => {
    errorHandler = new ErrorHandler();
  });

  describe('Timeout Error Categorization', () => {
    test('should categorize timeout errors correctly', () => {
      const timeoutError = new Error('Request timeout');
      const category = errorHandler.categorizeError(timeoutError);

      expect(category.type).toBe('timeout');
      expect(category.recoverable).toBe(true);
    });

    test('should handle connection timeout errors', () => {
      const connTimeoutError = new Error('ETIMEDOUT');
      const category = errorHandler.categorizeError(connTimeoutError);

      expect(category.type).toBe('network'); // Updated from 'timeout' to 'network'
      expect(category.recoverable).toBe(true);
    });
  });

  describe('Timeout Recovery', () => {
    test('should suggest retry for timeout errors', () => {
      const timeoutError = new Error('Request timeout');
      const recovery = errorHandler.suggestRecovery(timeoutError);

      expect(recovery.action).toBe('retry');
      expect(recovery.delay).toBeGreaterThan(0);
      expect(recovery.maxRetries).toBeGreaterThan(0);
    });
  });

  describe('Promise Timeout Simulation', () => {
    test('should handle promise timeout simulation', async () => {
      const slowOperation = new Promise((resolve) => {
        setTimeout(() => resolve('completed'), 1000);
      });

      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Operation timed out')), 500);
      });

      try {
        await Promise.race([slowOperation, timeoutPromise]);
        fail('Expected promise to timeout');
      } catch (error) {
        expect((error as Error).message).toBe('Operation timed out');
      }
    });

    test('should complete fast operations within timeout', async () => {
      const fastOperation = new Promise((resolve) => {
        setTimeout(() => resolve('completed'), 100);
      });

      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Operation timed out')), 500);
      });

      const result = await Promise.race([fastOperation, timeoutPromise]);
      expect(result).toBe('completed');
    });
  });

  describe('Retry with Timeout', () => {
    test('should retry timed out operations', async () => {
      let attempts = 0;
      const operation = jest.fn().mockImplementation(() => {
        attempts++;
        if (attempts < 3) {
          throw new Error('Request timeout');
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
  });
});
