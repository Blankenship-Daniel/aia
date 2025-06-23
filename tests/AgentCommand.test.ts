Here are comprehensive Jest tests for the `AgentCommand` class, following the guidelines and project patterns. The tests cover the main functionalities, error handling, and mock external dependencies using Jest mocks. I've taken the liberty to assume certain available mock functionalities in accordance with your project's context.

```typescript
// tests/commands/AgentCommand.test.ts

import { AgentCommand } from '../../src/commands/AgentCommand';
import { ICommand } from '../../src/interfaces/ICommand';
import { IAgentExecutionEngine } from '../../src/interfaces/IAgentExecutionEngine';
import { IAgentPresenter } from '../../src/interfaces/IAgentPresenter';
import { IResilienceService } from '../../src/interfaces/IResilienceService';
import { IContextService } from '../../src/interfaces/IContextService';
import { IMemoryService } from '../../src/interfaces/IMemoryService';
import { ICodeHighlightService } from '../../src/interfaces/ICodeHighlightService';
import { CommandResult } from '../../src/types';
import {
  mockExecutionEngine,
  mockPresenter,
  mockResilienceService,
  mockContextService,
  mockMemoryService,
  mockCodeHighlightService
} from '../__mocks__/AgentCommandMocks';

describe('AgentCommand - Jest Tests', () => {
  let agentCommand: AgentCommand;
  let executionEngine: jest.Mocked<IAgentExecutionEngine>;
  let presenter: jest.Mocked<IAgentPresenter>;
  let resilienceService: jest.Mocked<IResilienceService>;
  let contextService: jest.Mocked<IContextService>;
  let memoryService: jest.Mocked<IMemoryService>;
  let codeHighlightService: jest.Mocked<ICodeHighlightService>;

  beforeEach(() => {
    executionEngine = mockExecutionEngine();
    presenter = mockPresenter();
    resilienceService = mockResilienceService();
    contextService = mockContextService();
    memoryService = mockMemoryService();
    codeHighlightService = mockCodeHighlightService();

    agentCommand = new AgentCommand(
      executionEngine,
      presenter,
      resilienceService,
      contextService,
      memoryService,
      codeHighlightService
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('execute', () => {
    it('should return error if no goal is provided', async () => {
      const result: CommandResult = await agentCommand.execute({}, [], {});
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('Please provide a goal to achieve');
      expect(presenter.displayEnhancedErrorFromCommandExecution).toHaveBeenCalledWith(
        expect.any(Error),
        'agent',
        [],
        { phase: 'validation', context: 'goal-required' }
      );
    });

    it('should execute with a valid goal and return success', async () => {
      const goal = 'create a React component';
      executionEngine.planExecution.mockResolvedValue({
        success: true,
        plan: [{ id: 'step-1', description: 'Do something', command: 'echo "hello"' }]
      });
      resilienceService.executeWithTimeout.mockResolvedValue({
        success: true,
        output: 'Execution completed'
      });

      const result = await agentCommand.execute({}, [goal], {});

      expect(result.success).toBe(true);
      expect(result.output).toContain('Execution completed');
      expect(executionEngine.planExecution).toHaveBeenCalledWith(goal, expect.anything(), expect.anything());
    });

    it('should handle errors during execution and return failure', async () => {
      const goal = 'analyze something';
      resilienceService.executeWithTimeout.mockRejectedValue(new Error('Execution timed out'));

      const result = await agentCommand.execute({}, [goal], {});

      expect(result.success).toBe(false);
      expect(result.error).toBe('Execution timed out');
      expect(presenter.displayEnhancedErrorFromCommandExecution).toHaveBeenCalledWith(
        expect.any(Error),
