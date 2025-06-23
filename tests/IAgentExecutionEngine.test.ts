Here is an example of how you might implement Jest tests for the `IAgentExecutionEngine` interface using the project's specified patterns:

```typescript
// Import mock utilities and Jest
import { mockAgentExecutionEngine } from '../__mocks__/agentExecutionEngineMock'; // assuming this path and mock exist
import { jest } from '@jest/globals';
import { IAgentExecutionEngine } from '../interfaces/IAgentExecutionEngine';
import {
  ContextInfo,
  AgenticExecution,
  ExecutionStep,
  CommandResult,
} from '../types';

describe('IAgentExecutionEngine', () => {
  let agentExecutionEngine: jest.Mocked<IAgentExecutionEngine>;
  let mockContext: ContextInfo;
  let mockExecutionStep: ExecutionStep;
  let mockAgenticExecution: AgenticExecution;

  beforeEach(() => {
    // Create a mocked instance of IAgentExecutionEngine
    agentExecutionEngine = mockAgentExecutionEngine();

    // Setting up mock data
    mockContext = { userId: 'user123', sessionId: 'session123' }; // example context
    mockExecutionStep = { description: 'step1', execute: jest.fn() }; // example execution step
    mockAgenticExecution = { plan: [mockExecutionStep] }; // example execution
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('planExecution', () => {
    it('should return a successful plan when given a valid goal and context', async () => {
      agentExecutionEngine.planExecution.mockResolvedValue({
        success: true,
        plan: [mockExecutionStep],
      });

      const result = await agentExecutionEngine.planExecution(
        'Achieve goal A',
        mockContext
      );

      expect(result.success).toBe(true);
      expect(result.plan).toEqual([mockExecutionStep]);
    });

    it('should handle errors gracefully and return error message', async () => {
      const errorMessage = 'Planning failed';
      agentExecutionEngine.planExecution.mockResolvedValue({
        success: false,
        error: errorMessage,
      });

      const result = await agentExecutionEngine.planExecution(
        'Invalid goal',
        mockContext
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe(errorMessage);
    });
  });

  describe('executeStep', () => {
    it('should return successful execution result when step is executed correctly', async () => {
      agentExecutionEngine.executeStep.mockResolvedValue({
        success: true,
        output: 'Execution result',
      });

      const result = await agentExecutionEngine.executeStep(mockExecutionStep, true);

      expect(result.success).toBe(true);
      expect(result.output).toBe('Execution result');
    });

    it('should capture any errors and return an error message', async () => {
      const errorMessage = 'Execution failed';
      agentExecutionEngine.executeStep.mockResolvedValue({
        success: false,
        error: errorMessage,
      });

      const result = await agentExecutionEngine.executeStep(mockExecutionStep, false);

      expect(result.success).toBe(false);
      expect(result.error).toBe(errorMessage);
    });
  });

  describe('executePlan', () => {
    it('should perform a complete execution with the given plan', async () => {
      agentExecutionEngine.executePlan.mockResolvedValue({
        success: true,
        results: ['Result 1', 'Result 2'],
        learnings: ['Learning A'],
      });

      const result = await agentExecutionEngine.executePlan(mockAgenticExecution, {
        autoExecute: true,
        maxIterations: 3,
        noIteration: false,
      });

      expect(result.success).toBe(true);
      expect(result.results).toHaveLength(2);
      expect(result.learnings).toContain('Learning A');
    });

    it('should handle execution errors and return proper learnings