To effectively test the `EnhancedTaskComplexityAnalyzer` class, we'll follow the given guidelines and structure our tests using Jest. We'll create mock implementations for the `IAIService` and `IContextService` interfaces and simulate different scenarios, including success and various error cases.

Here is a Jest test suite that follows the specified patterns:

```typescript
import { EnhancedTaskComplexityAnalyzer } from '../src/services/EnhancedTaskComplexityAnalyzer';
import { AITaskClassifier } from '../src/services/AITaskClassifier';
import { IAIService } from '../src/interfaces/IAIService';
import { IContextService } from '../src/interfaces/IContextService';
import { TaskAnalysis } from '../src/services/TaskComplexityAnalyzer';

// Mock utilities from the project's __mocks__ directory
jest.mock('../src/services/AITaskClassifier');
const MockedAITaskClassifier = jest.mocked(AITaskClassifier);

describe('EnhancedTaskComplexityAnalyzer', () => {
  let aiServiceMock: jest.Mocked<IAIService>;
  let contextServiceMock: jest.Mocked<IContextService>;
  let enhancedTaskComplexityAnalyzer: EnhancedTaskComplexityAnalyzer;

  beforeEach(() => {
    aiServiceMock = {
      classify: jest.fn(),
    };

    contextServiceMock = {
      getContext: jest.fn(),
    };

    // Reset the mocks before each test
    MockedAITaskClassifier.mockReset();
    
    enhancedTaskComplexityAnalyzer = new EnhancedTaskComplexityAnalyzer(
      aiServiceMock,
      contextServiceMock
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('constructor', () => {
    it('should throw an error if aiService is not provided', () => {
      expect(() => new EnhancedTaskComplexityAnalyzer(null as any, contextServiceMock)).toThrow(
        '🚨 AI service is required for AIA CLI. Please configure your API keys using "aia config"'
      );
    });

    it('should throw an error if contextService is not provided', () => {
      expect(() => new EnhancedTaskComplexityAnalyzer(aiServiceMock, null as any)).toThrow(
        '🚨 Context service is required for task analysis.'
      );
    });
  });

  describe('analyzeTask', () => {
    const taskDescription = 'example task';

    it('should return a TaskAnalysis on successful classification', async () => {
      const expectedAnalysis: TaskAnalysis = { complexity: 'medium' };
      MockedAITaskClassifier.prototype.classifyTask.mockResolvedValue(expectedAnalysis);

      const result = await enhancedTaskComplexityAnalyzer.analyzeTask(taskDescription);

      expect(result).toEqual(expectedAnalysis);
      expect(MockedAITaskClassifier.prototype.classifyTask).toHaveBeenCalledWith(taskDescription);
    });

    it('should throw a specific authentication error message when API key is invalid', async () => {
      MockedAITaskClassifier.prototype.classifyTask.mockRejectedValue(
        new Error('401 Unauthorized')
      );

      await expect(enhancedTaskComplexityAnalyzer.analyzeTask(taskDescription)).rejects.toThrow(
        '🚨 AI API authentication failed. Please check your API keys:\n' +
          '   Run: aia config --set openaiApiKey=your_key\n' +
          '   Or:  aia config --set anthropicApiKey=your_key'
      );
    });

    it('should throw a specific network error message on network issues', async () => {
      MockedAITaskClassifier.prototype.classifyTask.mockRejectedValue(
        new Error('Network timeout')
      );

      await expect(enhancedTaskComplexityAnalyzer.analyzeTask(taskDescription)).rejects.toThrow(
        '🚨 AI service network error. Please check your internet connection and try again.'
      );
    });

    it('should throw a general error when other errors occur', async () =>