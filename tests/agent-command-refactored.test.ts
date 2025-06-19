/**
 * Test for Refactored Agent Command (SOLID Compliance)
 * Validates that the AgentCommand properly separates concerns
 */
import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { AgentCommandRefactored } from '../src/commands/AgentCommandRefactored';
import { IAgentExecutionEngine } from '../src/interfaces/IAgentExecutionEngine';
import { IAgentPresenter } from '../src/interfaces/IAgentPresenter';
import { IResilienceService } from '../src/interfaces/IResilienceService';
import { IContextService } from '../src/interfaces/IContextService';
import { IMemoryService } from '../src/interfaces/IMemoryService';
import {
  ContextInfo,
  ExecutionStep,
  AgenticExecution,
} from '../src/types/index';

describe('AgentCommandRefactored - SOLID Compliance', () => {
  let mockExecutionEngine: jest.Mocked<IAgentExecutionEngine>;
  let mockPresenter: jest.Mocked<IAgentPresenter>;
  let mockResilienceService: jest.Mocked<IResilienceService>;
  let mockContextService: jest.Mocked<IContextService>;
  let mockMemoryService: jest.Mocked<IMemoryService>;
  let agentCommand: AgentCommandRefactored;

  const mockContext: ContextInfo = {
    workingDirectory: '/test',
    platform: 'linux',
    arch: 'x64',
    nodeVersion: '18.0.0',
    user: 'testuser',
    shell: 'bash',
    timestamp: '2025-06-19T00:00:00Z',
    projectType: 'node',
    projectInfo: {},
    gitStatus: 'clean',
    environmentScore: 1.0,
  };

  const mockExecutionStep: ExecutionStep = {
    id: 'step-1',
    command: 'echo "test"',
    description: 'Test step',
    expectedOutcome: 'Success',
    reasoning: 'Test reasoning',
    risks: [],
    dependencies: [],
    timeout: 30000,
  };

  beforeEach(() => {
    // Create mock services
    mockExecutionEngine = {
      planExecution: jest.fn(),
      executeStep: jest.fn(),
      executePlan: jest.fn(),
      validateResult: jest.fn(),
    };

    mockPresenter = {
      showPlanningPhase: jest.fn(),
      displayExecutionPlan: jest.fn(),
      showExecutionStep: jest.fn(),
      showIteration: jest.fn(),
      displayStepOutput: jest.fn(),
      displayExecutionSummary: jest.fn(),
      displayError: jest.fn(),
      displayWarning: jest.fn(),
      displaySuccess: jest.fn(),
      askConfirmation: jest.fn(),
      formatExecutionSummary: jest.fn(),
    };

    mockResilienceService = {
      executeWithCircuitBreaker: jest.fn(),
      executeWithTimeout: jest.fn(),
      executeWithRetry: jest.fn(),
      executeWithFallback: jest.fn(),
      isCommandBlocked: jest.fn(),
      getCircuitBreakerState: jest.fn(),
      resetCircuitBreaker: jest.fn(),
      getFailureStats: jest.fn(),
    };

    mockContextService = {
      gatherContext: jest.fn(),
      getCurrentContext: jest.fn(),
      updateContext: jest.fn(),
      initialize: jest.fn(),
    };

    mockMemoryService = {
      initialize: jest.fn(),
      loadMemory: jest.fn(),
      saveMemory: jest.fn(),
      addConversation: jest.fn(),
      searchConversations: jest.fn(),
      getRecentConversations: jest.fn(),
      addCommand: jest.fn(),
      getCommandHistory: jest.fn(),
      searchCommands: jest.fn(),
      clearMemory: jest.fn(),
      exportMemory: jest.fn(),
      importMemory: jest.fn(),
      getMemoryStats: jest.fn(),
      getPreference: jest.fn(),
      setPreference: jest.fn(),
      getWorkingDirectoryContext: jest.fn(),
      setWorkingDirectoryContext: jest.fn(),
      getAgenticHistory: jest.fn(),
      storeAgenticExecution: jest.fn(),
    };

    // Create AgentCommand with mocked dependencies
    agentCommand = new AgentCommandRefactored(
      mockExecutionEngine,
      mockPresenter,
      mockResilienceService,
      mockContextService,
      mockMemoryService
    );
  });

  describe('Single Responsibility Principle (SRP)', () => {
    it('should delegate planning to execution engine', async () => {
      // Setup mocks
      mockContextService.gatherContext.mockResolvedValue(mockContext);
      mockMemoryService.getAgenticHistory.mockResolvedValue([]);
      mockExecutionEngine.planExecution.mockResolvedValue({
        success: true,
        plan: [mockExecutionStep],
      });
      mockPresenter.askConfirmation.mockResolvedValue(true);
      mockExecutionEngine.executePlan.mockResolvedValue({
        success: true,
        results: [],
        learnings: [],
      });
      mockResilienceService.executeWithTimeout.mockImplementation(
        async (fn) => await fn()
      );
      mockResilienceService.executeWithCircuitBreaker.mockImplementation(
        async (fn) => await fn()
      );
      mockResilienceService.executeWithFallback.mockImplementation(
        async (fn) => await fn()
      );
      mockPresenter.formatExecutionSummary.mockReturnValue('Summary');

      await agentCommand.execute({}, ['test goal'], {});

      // Verify planning is delegated
      expect(mockExecutionEngine.planExecution).toHaveBeenCalledWith(
        'test goal',
        mockContext,
        []
      );
    });

    it('should delegate presentation to presenter service', async () => {
      // Setup mocks
      mockContextService.gatherContext.mockResolvedValue(mockContext);
      mockMemoryService.getAgenticHistory.mockResolvedValue([]);
      mockExecutionEngine.planExecution.mockResolvedValue({
        success: true,
        plan: [mockExecutionStep],
      });
      mockPresenter.askConfirmation.mockResolvedValue(true);
      mockExecutionEngine.executePlan.mockResolvedValue({
        success: true,
        results: [],
        learnings: [],
      });
      mockResilienceService.executeWithTimeout.mockImplementation(
        async (fn) => await fn()
      );
      mockResilienceService.executeWithCircuitBreaker.mockImplementation(
        async (fn) => await fn()
      );
      mockResilienceService.executeWithFallback.mockImplementation(
        async (fn) => await fn()
      );
      mockPresenter.formatExecutionSummary.mockReturnValue('Summary');

      await agentCommand.execute({}, ['test goal'], {});

      // Verify presentation methods are called
      expect(mockPresenter.showPlanningPhase).toHaveBeenCalledWith('test goal');
      expect(mockPresenter.displayExecutionPlan).toHaveBeenCalledWith([
        mockExecutionStep,
      ]);
      expect(mockPresenter.askConfirmation).toHaveBeenCalledWith(
        'Proceed with execution?'
      );
      expect(mockPresenter.displayExecutionSummary).toHaveBeenCalled();
    });

    it('should delegate resilience patterns to resilience service', async () => {
      // Setup mocks
      mockContextService.gatherContext.mockResolvedValue(mockContext);
      mockMemoryService.getAgenticHistory.mockResolvedValue([]);
      mockExecutionEngine.planExecution.mockResolvedValue({
        success: true,
        plan: [mockExecutionStep],
      });
      mockPresenter.askConfirmation.mockResolvedValue(true);
      mockExecutionEngine.executePlan.mockResolvedValue({
        success: true,
        results: [],
        learnings: [],
      });
      mockResilienceService.executeWithTimeout.mockImplementation(
        async (fn) => await fn()
      );
      mockResilienceService.executeWithCircuitBreaker.mockImplementation(
        async (fn) => await fn()
      );
      mockResilienceService.executeWithFallback.mockImplementation(
        async (fn) => await fn()
      );
      mockPresenter.formatExecutionSummary.mockReturnValue('Summary');

      await agentCommand.execute({}, ['test goal'], {});

      // Verify resilience methods are called
      expect(mockResilienceService.executeWithTimeout).toHaveBeenCalled();
      expect(
        mockResilienceService.executeWithCircuitBreaker
      ).toHaveBeenCalled();
      expect(mockResilienceService.executeWithFallback).toHaveBeenCalled();
    });
  });

  describe('Command Interface Compliance', () => {
    it('should implement all ICommand methods', () => {
      expect(agentCommand.execute).toBeDefined();
      expect(agentCommand.getDefinition).toBeDefined();
      expect(agentCommand.getName).toBeDefined();
      expect(agentCommand.getAliases).toBeDefined();
      expect(agentCommand.validateArgs).toBeDefined();
      expect(agentCommand.getHelp).toBeDefined();
    });

    it('should validate arguments correctly', () => {
      const validResult = agentCommand.validateArgs(['valid goal']);
      expect(validResult.valid).toBe(true);
      expect(validResult.errors).toHaveLength(0);

      const invalidResult = agentCommand.validateArgs([]);
      expect(invalidResult.valid).toBe(false);
      expect(invalidResult.errors).toContain('Goal is required');
    });

    it('should return proper command definition', () => {
      const definition = agentCommand.getDefinition();
      expect(definition.name).toBe('agent');
      expect(definition.description).toBe(
        'Execute agentic reasoning for complex goals'
      );
      expect(definition.aliases).toEqual(['a', 'agentic']);
      expect(definition.options).toBeDefined();
    });
  });

  describe('Error Handling', () => {
    it('should handle empty goal gracefully', async () => {
      const result = await agentCommand.execute({}, [], {});

      expect(result.success).toBe(false);
      expect(result.error).toBe('Please provide a goal to achieve');
      expect(mockPresenter.displayError).toHaveBeenCalledWith(
        'Please provide a goal to achieve'
      );
    });

    it('should handle planning failures gracefully', async () => {
      mockContextService.gatherContext.mockResolvedValue(mockContext);
      mockMemoryService.getAgenticHistory.mockResolvedValue([]);
      mockExecutionEngine.planExecution.mockResolvedValue({
        success: false,
        error: 'Planning failed',
      });
      mockResilienceService.executeWithTimeout.mockImplementation(
        async (fn) => await fn()
      );
      mockResilienceService.executeWithCircuitBreaker.mockImplementation(
        async (fn) => await fn()
      );

      const result = await agentCommand.execute({}, ['test goal'], {});

      expect(result.success).toBe(false);
      expect(result.error).toBe('Planning failed');
      expect(mockPresenter.displayError).toHaveBeenCalledWith(
        'Planning failed'
      );
    });

    it('should handle timeout errors', async () => {
      mockResilienceService.executeWithTimeout.mockRejectedValue(
        new Error('Operation timed out')
      );

      const result = await agentCommand.execute({}, ['test goal'], {});

      expect(result.success).toBe(false);
      expect(result.error).toBe('Operation timed out');
      expect(mockPresenter.displayError).toHaveBeenCalledWith(
        'Operation timed out'
      );
    });
  });

  describe('Service Integration', () => {
    it('should integrate all services correctly for successful execution', async () => {
      // Setup complete successful execution
      mockContextService.gatherContext.mockResolvedValue(mockContext);
      mockMemoryService.getAgenticHistory.mockResolvedValue([]);
      mockExecutionEngine.planExecution.mockResolvedValue({
        success: true,
        plan: [mockExecutionStep],
      });
      mockPresenter.askConfirmation.mockResolvedValue(true);
      mockExecutionEngine.executePlan.mockResolvedValue({
        success: true,
        results: [{ success: true, output: 'Success' }],
        learnings: [],
      });
      mockMemoryService.storeAgenticExecution.mockResolvedValue();
      mockPresenter.formatExecutionSummary.mockReturnValue(
        'Execution completed successfully'
      );

      // Mock resilience service to pass through
      mockResilienceService.executeWithTimeout.mockImplementation(
        async (fn) => await fn()
      );
      mockResilienceService.executeWithCircuitBreaker.mockImplementation(
        async (fn) => await fn()
      );
      mockResilienceService.executeWithFallback.mockImplementation(
        async (fn) => await fn()
      );

      const result = await agentCommand.execute({}, ['test goal'], {});

      expect(result.success).toBe(true);
      expect(result.output).toBe('Execution completed successfully');

      // Verify all services were called in the right order
      expect(mockContextService.gatherContext).toHaveBeenCalled();
      expect(mockMemoryService.getAgenticHistory).toHaveBeenCalled();
      expect(mockExecutionEngine.planExecution).toHaveBeenCalled();
      expect(mockPresenter.displayExecutionPlan).toHaveBeenCalled();
      expect(mockExecutionEngine.executePlan).toHaveBeenCalled();
      expect(mockMemoryService.storeAgenticExecution).toHaveBeenCalled();
      expect(mockPresenter.displayExecutionSummary).toHaveBeenCalled();
    });
  });
});
