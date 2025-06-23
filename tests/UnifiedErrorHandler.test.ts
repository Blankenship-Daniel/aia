Here's a comprehensive set of Jest tests for the `UnifiedErrorHandler.ts` file, following your project's testing patterns and TypeScript best practices:

```typescript
// Import from our __mocks__ directory, and the necessary classes, enums, and interfaces
import { UnifiedErrorHandler, ErrorSeverity, ErrorCategory, EnhancedError, ErrorUtils } from '../src/utils/UnifiedErrorHandler';
import { jest } from '@jest/globals';

// Mocking dependencies from the EventEmitter
jest.mock('events', () => ({
  EventEmitter: jest.fn().mockImplementation(() => ({
    emit: jest.fn(),
  })),
}));

describe('UnifiedErrorHandler', () => {
  let errorHandler: UnifiedErrorHandler;

  beforeEach(() => {
    errorHandler = new UnifiedErrorHandler();
  });

  describe('enhanceError method', () => {
    it('should enhance error with default classification and context', () => {
      const error = new Error('Test error');
      const enhancedError: EnhancedError = errorHandler.enhanceError(error);

      expect(enhancedError.id).toBeDefined();
      expect(enhancedError.category).toBe(ErrorCategory.SYSTEM);
      expect(enhancedError.severity).toBe(ErrorSeverity.MEDIUM);
      expect(enhancedError.timestamp).toBeInstanceOf(Date);
    });

    it('should enhance error with provided classification and context', () => {
      const error = new Error('Test API error');
      const context = { operation: 'testOperation' };
      const options = { category: ErrorCategory.API, severity: ErrorSeverity.HIGH };

      const enhancedError: EnhancedError = errorHandler.enhanceError(error, context, options);

      expect(enhancedError.category).toBe(ErrorCategory.API);
      expect(enhancedError.severity).toBe(ErrorSeverity.HIGH);
      expect(enhancedError.context.operation).toBe('testOperation');
    });

    it('should emit an error event with the enhanced error', () => {
      const error = new Error('Emit test');
      const emitSpy = jest.spyOn(errorHandler, 'emit');

      errorHandler.enhanceError(error);
      expect(emitSpy).toHaveBeenCalledWith('error', expect.any(Object));
    });
  });

  describe('getRecoveryStrategy method', () => {
    it('should provide a retry strategy for NETWORK errors', () => {
      const error: EnhancedError = { 
        category: ErrorCategory.NETWORK, 
        severity: ErrorSeverity.HIGH, 
        retryable: true 
      } as EnhancedError;

      const strategy = errorHandler.getRecoveryStrategy(error);
      expect(strategy.retry).toBeDefined();
      expect(strategy.retry.maxAttempts).toBe(3);
      expect(strategy.retry.backoffMultiplier).toBe(2);
    });

    it('should provide a fallback strategy for TIMEOUT errors', async () => {
      const error: EnhancedError = { 
        category: ErrorCategory.TIMEOUT, 
        severity: ErrorSeverity.MEDIUM, 
        retryable: true 
      } as EnhancedError;

      const strategy = errorHandler.getRecoveryStrategy(error);
      const fallbackResult = await strategy.fallback();
      expect(fallbackResult).toBeNull();
    });

    it('should provide a user action for API credential errors', () => {
      const error: EnhancedError = { 
        message: 'Unauthorized request (401)', 
        category: ErrorCategory.API, 
        severity: ErrorSeverity.HIGH 
      } as EnhancedError;

      const strategy = errorHandler.getRecoveryStrategy(error);
      expect(strategy.userAction).toContain('check your API credentials');
    });
  });

  describe('executeWithRecovery method', () => {
    it('should execute operation and return result without errors', async () => {
      const operation = jest.fn().mockResolvedValue('success');
      const result = await errorHandler