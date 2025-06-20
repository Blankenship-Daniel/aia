import { AgenticReasoningEngine } from '../dist/AgenticReasoningEngine.js';
import { AgenticPlan } from '../dist/types/index.js';

interface MockDependencies {
  agenticSearchEngine: {
    search: jest.Mock;
  };
  nlpEngine: {
    processQuery: jest.Mock;
  };
  conversationContextManager: {
    getCurrentContext: jest.Mock;
    addMessage: jest.Mock;
  };
}

interface MockAgenticExecutionContext {
  goal: string;
  enhancedGoal: string;
  nlpAnalysis: any;
  iterations: number;
  maxIterations: number;
  autoExecute: boolean;
  allowIteration: boolean;
}

describe('AgenticReasoningEngine', () => {
  let engine: AgenticReasoningEngine;
  let mockDependencies: MockDependencies;

  beforeEach(() => {
    // Mock dependencies
    mockDependencies = {
      agenticSearchEngine: {
        search: jest.fn().mockResolvedValue({ results: [] }),
      },
      nlpEngine: {
        processQuery: jest.fn().mockResolvedValue({
          intent: 'test',
          entities: [],
        }),
      },
      conversationContextManager: {
        getCurrentContext: jest.fn().mockReturnValue({
          messages: [],
        }),
        addMessage: jest.fn(),
      },
    };

    engine = new AgenticReasoningEngine(mockDependencies);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Plan Generation', () => {
    test('should generate a plan with steps', async () => {
      const mockContext: MockAgenticExecutionContext = {
        goal: 'test goal',
        enhancedGoal: 'enhanced test goal',
        nlpAnalysis: { intent: 'test', entities: [] },
        iterations: 0,
        maxIterations: 3,
        autoExecute: false,
        allowIteration: true,
      };

      // Mock the AI query
      const mockPlan: AgenticPlan = {
        id: 'test-plan-1',
        description: 'test plan',
        confidence: 0.8,
        reasoning: 'test reasoning',
        fallbackOptions: [],
        steps: [
          {
            id: '1',
            description: 'test step',
            type: 'COMMAND',
            command: 'echo test',
            critical: false,
            expectedOutput: 'test output',
          },
        ],
      };

      // Mock the aia object
      (engine as any).aia = {
        queryAI: jest.fn().mockResolvedValue(JSON.stringify(mockPlan)),
      };

      const plan = await engine.generatePlan(mockContext as any);

      expect(plan).toHaveProperty('steps');
      expect(Array.isArray(plan.steps)).toBe(true);
      expect(plan).toHaveProperty('reasoning');
    });

    test('should handle empty goal gracefully', async () => {
      const mockContext: MockAgenticExecutionContext = {
        goal: '',
        enhancedGoal: '',
        nlpAnalysis: { intent: 'unknown', entities: [] },
        iterations: 0,
        maxIterations: 3,
        autoExecute: false,
        allowIteration: true,
      };

      // Mock AI query to return empty plan
      (engine as any).aia = {
        queryAI: jest.fn().mockResolvedValue(
          JSON.stringify({
            id: 'empty-plan',
            description: 'empty plan',
            confidence: 0.1,
            reasoning: 'No clear goal provided',
            fallbackOptions: [],
            steps: [],
          })
        ),
      };

      const plan = await engine.generatePlan(mockContext as any);

      expect(plan).toHaveProperty('steps');
      expect(plan.steps).toEqual([]);
    });
  });

  describe('Result Evaluation', () => {
    test('should evaluate execution results', async () => {
      const mockExecutionResult = {
        success: true,
        output: 'test output',
        code: 0,
      };

      const mockContext: MockAgenticExecutionContext = {
        goal: 'complete test task',
        enhancedGoal: 'complete test task with verification',
        nlpAnalysis: { intent: 'task_completion', entities: [] },
        iterations: 1,
        maxIterations: 3,
        autoExecute: false,
        allowIteration: true,
      };

      // Mock AI query for evaluation
      (engine as any).aia = {
        queryAI: jest.fn().mockResolvedValue(
          JSON.stringify({
            goalAchieved: true,
            confidence: 0.9,
            reasoning: 'Task completed successfully',
          })
        ),
      };

      const evaluation = await (engine as any).evaluateResult(
        mockExecutionResult,
        mockContext
      );

      expect(evaluation).toHaveProperty('goalAchieved');
      expect(evaluation).toHaveProperty('confidence');
      expect(evaluation).toHaveProperty('reasoning');
    });
  });

  describe('Error Handling', () => {
    test('should handle AI service errors gracefully', async () => {
      const mockContext: MockAgenticExecutionContext = {
        goal: 'test goal',
        enhancedGoal: 'enhanced test goal',
        nlpAnalysis: { intent: 'test', entities: [] },
        iterations: 0,
        maxIterations: 3,
        autoExecute: false,
        allowIteration: true,
      };

      // Mock AI service failure
      (engine as any).aia = {
        queryAI: jest
          .fn()
          .mockRejectedValue(new Error('AI service unavailable')),
      };

      await expect(engine.generatePlan(mockContext as any)).rejects.toThrow(
        'Failed to generate execution plan'
      );
    });
  });
});
