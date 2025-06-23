To create comprehensive Jest tests for the `ResilienceService` class in a TypeScript environment, we should follow the patterns you described. This includes import statements that use project-specific mock utilities, clear `describe` and `it` blocks for structure, setup/teardown with `beforeEach` and `afterEach`, and extensive use of Jest mocks for dependencies.

Here's an example of how the tests could be structured:

```typescript
import { ResilienceService } from '../src/services/ResilienceService';
import { CircuitBreakerState, ExecutionOptions } from '../src/interfaces/IResilienceService';
// Mock our operation so we can control its behavior in tests
const mockOperation = jest.fn<Promise<unknown>, []>();

describe('ResilienceService', () => {
  let resilienceService: ResilienceService;

  beforeEach(() => {
    resilienceService = new ResilienceService();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('executeWithCircuitBreaker', () => {
    it('should execute the operation successfully when circuit is closed', async () => {
      mockOperation.mockResolvedValueOnce('Success');
      
      const result = await resilienceService.executeWithCircuitBreaker(mockOperation, 'testCommand');
      
      expect(result).toBe('Success');
      expect(mockOperation).toHaveBeenCalledTimes(1);
    });

    it('should throw error if circuit breaker is open', async () => {
      const state: CircuitBreakerState = {
        command: 'testCommand',
        failureCount: 3,
        lastFailure: 'Test error',
        consecutiveFailures: 3,
        isBlocked: true,
        blockUntil: Date.now() + 30000,
      };
      
      // Manually set the mock state
      (resilienceService as any).circuitBreakers.set('testCommand', state);

      await expect(resilienceService.executeWithCircuitBreaker(mockOperation, 'testCommand'))
        .rejects
        .toThrow('Circuit breaker is open for command: testCommand. Try again later.');
      
      expect(mockOperation).not.toHaveBeenCalled();
    });

    it('should reset circuit breaker after timeout and execute operation', async () => {
      const pastTime = Date.now() - 31000; // Past the reset time
      const state: CircuitBreakerState = {
        command: 'testCommand',
        failureCount: 3,
        lastFailure: 'Test error',
        consecutiveFailures: 3,
        isBlocked: true,
        blockUntil: pastTime,
      };

      (resilienceService as any).circuitBreakers.set('testCommand', state);
      mockOperation.mockResolvedValueOnce('Success');

      const result = await resilienceService.executeWithCircuitBreaker(mockOperation, 'testCommand');
      expect(result).toBe('Success');
      expect(mockOperation).toHaveBeenCalledTimes(1);
    });

    it('should open the circuit breaker after consecutive failures and throw error', async () => {
      mockOperation.mockRejectedValue(new Error('Operation failed'));

      await expect(resilienceService.executeWithCircuitBreaker(mockOperation, 'testCommand'))
        .rejects
        .toThrow('Operation failed');

      const state = (resilienceService as any).circuitBreakers.get('testCommand');
      expect(state.isBlocked).toBeTruthy();
      expect(state.consecutiveFailures).toBeGreaterThanOrEqual(3);
    });
  });

  describe('executeWithTimeout', () => {
    it('should execute the operation within timeout', async () => {
      mockOperation.mockResolvedValueOnce('Success');

      const result = await resilienceService.executeWithTimeout(mockOperation, 5000);

      expect(result).toBe('Success');
      expect(mockOperation).toHaveBeenCalledTimes(1);
    });

    it('should throw timeout error if operation exceeds limit', async () => {
      jest.useFake