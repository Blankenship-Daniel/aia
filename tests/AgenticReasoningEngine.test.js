const { AgenticReasoningEngine } = require('../dist/AgenticReasoningEngine');

describe('AgenticReasoningEngine', () => {
  let engine;

  beforeEach(() => {
    // Mock dependencies
    const mockDependencies = {
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
      const mockContext = {
        goal: 'test goal',
        iterations: 0,
        maxIterations: 3,
        workingDirectory: '/test',
      };

      const plan = await engine.generatePlan(mockContext);

      expect(plan).toHaveProperty('steps');
      expect(Array.isArray(plan.steps)).toBe(true);
      expect(plan).toHaveProperty('reasoning');
    });

    test('should handle empty context gracefully', async () => {
      const plan = await engine.generatePlan({});

      expect(plan).toHaveProperty('steps');
      expect(plan.steps).toEqual([]);
    });
  });

  describe('Step Verification', () => {
    test('should verify step success', async () => {
      const mockStep = {
        description: 'test step',
        command: 'echo test',
        expectedOutcome: 'test output',
      };

      const mockResult = {
        success: true,
        output: 'test output',
        code: 0,
      };

      const verification = await engine.verifyStepSuccess(mockStep, mockResult);

      expect(verification).toHaveProperty('success');
      expect(verification).toHaveProperty('reasoning');
    });

    test('should detect step failure', async () => {
      const mockStep = {
        description: 'test step',
        command: 'failing-command',
        expectedOutcome: 'success',
      };

      const mockResult = {
        success: false,
        error: 'Command failed',
        code: 1,
      };

      const verification = await engine.verifyStepSuccess(mockStep, mockResult);

      expect(verification.success).toBe(false);
      expect(verification).toHaveProperty('reasoning');
    });
  });

  describe('Goal Evaluation', () => {
    test('should evaluate goal completion', async () => {
      const mockContext = {
        goal: 'complete test task',
        executionResults: {
          stepResults: [
            { success: true, step: { description: 'step 1' } },
            { success: true, step: { description: 'step 2' } },
          ],
        },
      };

      const evaluation = await engine.evaluateGoalCompletion(mockContext);

      expect(evaluation).toHaveProperty('completed');
      expect(evaluation).toHaveProperty('confidence');
      expect(evaluation).toHaveProperty('reasoning');
    });

    test('should detect incomplete goals', async () => {
      const mockContext = {
        goal: 'incomplete task',
        executionResults: {
          stepResults: [
            { success: true, step: { description: 'step 1' } },
            { success: false, step: { description: 'step 2' } },
          ],
        },
      };

      const evaluation = await engine.evaluateGoalCompletion(mockContext);

      expect(evaluation.completed).toBe(false);
      expect(evaluation.confidence).toBeLessThan(1.0);
    });
  });

  describe('Error Handling', () => {
    test('should handle AI service errors gracefully', async () => {
      // Mock AI service failure
      engine.queryAI = jest
        .fn()
        .mockRejectedValue(new Error('AI service unavailable'));

      const mockContext = {
        goal: 'test goal',
        iterations: 0,
        maxIterations: 3,
      };

      const plan = await engine.generatePlan(mockContext);

      expect(plan).toHaveProperty('steps');
      expect(plan.steps).toEqual([]);
      expect(plan).toHaveProperty('error');
    });
  });
});
