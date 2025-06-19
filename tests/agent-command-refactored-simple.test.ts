/**
 * Test for Refactored Agent Command (SOLID Compliance)
 * Validates that the AgentCommand properly separates concerns
 */
import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { AgentCommandRefactored } from '../src/commands/AgentCommandRefactored';

describe('AgentCommandRefactored - SOLID Compliance', () => {
  let mockExecutionEngine: any;
  let mockPresenter: any;
  let mockResilienceService: any;
  let mockContextService: any;
  let mockMemoryService: any;
  let agentCommand: AgentCommandRefactored;

  beforeEach(() => {
    // Create simple mock services
    mockExecutionEngine = {
      planExecution: jest.fn(),
      executeStep: jest.fn(),
      executePlan: jest.fn(),
      validateResult: jest.fn(),
    };

    mockPresenter = {
      showPlanningPhase: jest.fn(),
      displayExecutionPlan: jest.fn(),
      showExecutionStep: jest.fn().mockReturnValue({
        succeed: jest.fn(),
        fail: jest.fn(),
        stop: jest.fn(),
      }),
      displayExecutionSummary: jest.fn(),
      displayError: jest.fn(),
      displayWarning: jest.fn(),
      askConfirmation: jest.fn(),
      formatExecutionSummary: jest.fn(),
    };

    mockResilienceService = {
      executeWithCircuitBreaker: jest
        .fn()
        .mockImplementation(async (fn: any) => await fn()),
      executeWithTimeout: jest
        .fn()
        .mockImplementation(async (fn: any) => await fn()),
      executeWithFallback: jest
        .fn()
        .mockImplementation(async (fn: any) => await fn()),
    };

    mockContextService = {
      gatherContext: jest.fn(),
    };

    mockMemoryService = {
      getAgenticHistory: jest.fn(),
      storeAgenticExecution: jest.fn(),
    };

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
      const mockContext = { workingDirectory: '/test', platform: 'linux' };
      mockContextService.gatherContext.mockResolvedValue(mockContext);
      mockMemoryService.getAgenticHistory.mockResolvedValue([]);
      mockExecutionEngine.planExecution.mockResolvedValue({
        success: true,
        plan: [{ id: 'step-1', command: 'echo test', description: 'Test' }],
      });
      mockPresenter.askConfirmation.mockResolvedValue(true);
      mockExecutionEngine.executePlan.mockResolvedValue({
        success: true,
        results: [],
        learnings: [],
      });
      mockPresenter.formatExecutionSummary.mockReturnValue('Summary');

      await agentCommand.execute({}, ['test goal'], {});

      expect(mockExecutionEngine.planExecution).toHaveBeenCalled();
      expect(mockPresenter.showPlanningPhase).toHaveBeenCalledWith('test goal');
      expect(mockResilienceService.executeWithTimeout).toHaveBeenCalled();
    });

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

      const invalidResult = agentCommand.validateArgs([]);
      expect(invalidResult.valid).toBe(false);
      expect(invalidResult.errors).toContain('Goal is required');
    });

    it('should handle empty goal gracefully', async () => {
      const result = await agentCommand.execute({}, [], {});

      expect(result.success).toBe(false);
      expect(result.error).toBe('Please provide a goal to achieve');
      expect(mockPresenter.displayError).toHaveBeenCalledWith(
        'Please provide a goal to achieve'
      );
    });
  });
});
