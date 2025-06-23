To generate comprehensive Jest tests for the `AgentExecutionEngine` class described in your TypeScript CLI project, we can follow the project patterns and context you've outlined. This will involve mocking dependencies, setting up the environment, and testing various scenarios including both successful operations and error handling. Here’s an example test suite structured to adhere to the guidelines you’ve provided:

```typescript
// __tests__/AgentExecutionEngine.test.ts
import { AgentExecutionEngine } from '../src/services/AgentExecutionEngine';
import {
  IAIService,
  IContextService,
  ICommandService,
  IAgentExecutionEngine,
} from '../src/interfaces';
import {
  ContextInfo,
  AgenticExecution,
  ExecutionStep,
  CommandResult,
} from '../src/types';
import {
  EnhancedTaskComplexityAnalyzer,
  OutcomeValidationSystem,
} from '../src/services';

// Mocking dependencies
jest.mock('../src/services/EnhancedTaskComplexityAnalyzer');
jest.mock('../src/services/OutcomeValidationSystem');
jest.mock('../src/interfaces/IAIService');
jest.mock('../src/interfaces/IContextService');
jest.mock('../src/interfaces/ICommandService');

describe('AgentExecutionEngine', () => {
  let engine: IAgentExecutionEngine;
  let mockAiService: jest.Mocked<IAIService>;
  let mockContextService: jest.Mocked<IContextService>;
  let mockCommandService: jest.Mocked<ICommandService>;

  beforeEach(() => {
    // Setting up mocked services
    mockAiService = new (jest.requireMock('../src/interfaces/IAIService'))();
    mockContextService = new (jest.requireMock('../src/interfaces/IContextService'))();
    mockCommandService = new (jest.requireMock('../src/interfaces/ICommandService'))();

    // Initialize the execution engine with mocked services
    engine = new AgentExecutionEngine(mockAiService, mockContextService, mockCommandService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('planExecution', () => {
    it('should return a success plan when AI provides a valid response', async () => {
      const mockGoal = 'Analyze code for potential issues';
      const mockContext: ContextInfo = { platform: 'node', projectType: 'typescript', workingDirectory: '/project' };
      const mockResponse = { content: JSON.stringify([{ id: "step-1", description: "Check code", command: "npm run check" }]) };

      const mockAnalyzer = jest.fn().mockResolvedValue({ type: 'analysis', requiredCapabilities: [] });
      (EnhancedTaskComplexityAnalyzer as jest.Mock).mockImplementation(() => ({
        analyzeTask: mockAnalyzer,
      }));

      mockAiService.queryAI.mockResolvedValue(mockResponse);

      const result = await engine.planExecution(mockGoal, mockContext);

      expect(result.success).toBe(true);
      expect(result.plan).toBeDefined();
      expect(mockAnalyzer).toHaveBeenCalledWith(mockGoal);
    });

    it('should throw an error if the AI service fails', async () => {
      const mockGoal = 'Analyze code';
      const mockContext: ContextInfo = { platform: 'node', projectType: 'typescript', workingDirectory: '/project' };

      mockAiService.queryAI.mockRejectedValue(new Error('AI service error'));

      const result = await engine.planExecution(mockGoal, mockContext);

      expect(result.success).toBe(false);
      expect(result.error).toBe('AI service error');
    });

    it('should detect a code analysis task and use safe commands', async () => {
      const mockGoal = 'Analyze code smells';
      const mockContext: ContextInfo = { platform: 'node', projectType: 'typescript', workingDirectory: '/project' };
      const mockAnalyzer = jest.fn().mockResolvedValue({
        type: 'analysis',
        requiredCapabilities: ['CODE_ANALYSIS'],
      });

      (EnhancedTaskComplexity