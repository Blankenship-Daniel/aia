To generate comprehensive tests for the `AITaskClassifier` class, we will create a set of Jest tests following the project's patterns, as outlined in your request. Here's how you can implement these tests:

### Jest Test File for `AITaskClassifier`

Create a file named `AITaskClassifier.test.ts` in your test directory, and write the following tests:

```typescript
import { AITaskClassifier } from '../../src/services/AITaskClassifier';
import { IAIService } from '../../src/interfaces/IAIService';
import { IContextService } from '../../src/interfaces/IContextService';
import { mockedAIService, mockedContextService } from '../__mocks__/services';
import { TaskType, TaskComplexity, RiskLevel, TaskCapability, TaskAnalysis, ValidationStrategy } from '../../src/services/TaskComplexityAnalyzer';

jest.mock('../../src/interfaces/IAIService');
jest.mock('../../src/interfaces/IContextService');

describe('AITaskClassifier', () => {
  let aiTaskClassifier: AITaskClassifier;
  let aiService: jest.Mocked<IAIService>;
  let contextService: jest.Mocked<IContextService>;

  beforeEach(() => {
    aiService = new mockedAIService();
    contextService = new mockedContextService();
    aiTaskClassifier = new AITaskClassifier(aiService, contextService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('classifyTask', () => {
    it('should return a TaskAnalysis when AI classification is successful with high confidence', async () => {
      const taskDescription = 'Add JSDoc to existing functions';
      const classificationResult = {
        taskType: TaskType.DOCUMENTATION,
        complexity: TaskComplexity.SIMPLE,
        riskLevel: RiskLevel.LOW,
        confidence: 0.85,
        reasoning: 'The task involves documentation.',
        requiredCapabilities: [TaskCapability.FILE_READING, TaskCapability.FILE_WRITING],
      };

      aiService.queryAI.mockResolvedValueOnce({ content: JSON.stringify(classificationResult) });

      const result = await aiTaskClassifier.classifyTask(taskDescription);

      expect(result).toEqual<TaskAnalysis>({
        type: TaskType.DOCUMENTATION,
        complexity: TaskComplexity.SIMPLE,
        requiredCapabilities: [TaskCapability.FILE_READING, TaskCapability.FILE_WRITING],
        estimatedSteps: 5,
        riskLevel: RiskLevel.LOW,
        validationStrategy: ValidationStrategy.SYNTAX_VALIDATION,
      });
    });

    it('should throw an error when AI classification returns low confidence', async () => {
      const taskDescription = 'Fix unknown bugs';
      const lowConfidenceResult = {
        taskType: TaskType.BUG_FIXING,
        complexity: TaskComplexity.COMPLEX,
        riskLevel: RiskLevel.HIGH,
        confidence: 0.55,
        reasoning: 'The classification confidence is low.',
        requiredCapabilities: [TaskCapability.CODE_ANALYSIS],
      };

      aiService.queryAI.mockResolvedValueOnce({ content: JSON.stringify(lowConfidenceResult) });

      await expect(aiTaskClassifier.classifyTask(taskDescription)).rejects.toThrow(
        'AI classification confidence too low (0.55). AIA CLI requires high-confidence AI reasoning for reliable task execution.'
      );
    });

    it('should throw an error when AI classification fails to return content', async () => {
      const taskDescription = 'Improve code structure';
      
      aiService.queryAI.mockResolvedValueOnce(null);

      await expect(aiTaskClassifier.classifyTask(taskDescription)).rejects.toThrow(
        'AI classification failed to return a result'
      );
    });

    it('should not query AI service if classification exists in cache', async () => {
      const taskDescription = 'Refactor module';
      const classificationResult = {
        taskType: TaskType.REFACTORING,
        complexity: TaskComplexity.COMPLE