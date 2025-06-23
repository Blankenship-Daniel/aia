To create Jest tests for the `AIService` class, we need to follow the requirements and best practices outlined for the project. We'll create a series of tests that cover the main functionalities of the `AIService` class, including initialization, querying the AI provider, and error handling. We'll use Jest's mocking features to mock external dependencies and ensure a controlled testing environment.

Here's an example of how you might set up the Jest tests for `AIService`:

```typescript
import { AIService } from '../src/services/AIService';
import { IAIProvider, AICallOptions, AIModel } from '../src/interfaces/IAIProvider';
import { IConfigurationService } from '../src/interfaces/IConfigurationService';
import { IConversationMemory } from '../src/interfaces/IConversationMemory';
import { AIProviderFactory } from '../src/services/AIProviderFactory';

// Mock the modules
jest.mock('../src/services/AIProviderFactory');
jest.mock('../src/interfaces/IConfigurationService');
jest.mock('../src/interfaces/IConversationMemory');

describe('AIService', () => {
  let configServiceMock: jest.Mocked<IConfigurationService>;
  let memoryServiceMock: jest.Mocked<IConversationMemory>;
  let aiProviderMock: jest.Mocked<IAIProvider>;
  let aiService: AIService;

  beforeEach(() => {
    configServiceMock = {
      getConfiguration: jest.fn(() => ({
        preferredProvider: 'openai',
        preferredModel: 'gpt-3.5-turbo',
      })),
    } as unknown as jest.Mocked<IConfigurationService>;

    memoryServiceMock = {
      addConversation: jest.fn(),
    } as unknown as jest.Mocked<IConversationMemory>;

    aiProviderMock = {
      call: jest.fn().mockResolvedValue('Mock AI response'),
      estimateTokens: jest.fn().mockReturnValue(100),
      name: 'MockProvider',
    };

    // Mock the factory to return our mock provider
    (AIProviderFactory.create as jest.Mock).mockReturnValue(aiProviderMock);

    aiService = new AIService(configServiceMock, memoryServiceMock);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('initialize', () => {
    it('should initialize the provider based on configuration', async () => {
      process.env.OPENAI_API_KEY = 'test-key';
      await aiService.initialize();

      expect(AIProviderFactory.create).toHaveBeenCalledWith({
        provider: 'openai',
        apiKey: 'test-key',
        model: 'gpt-3.5-turbo',
      });

      expect(aiService.isConfigured()).toBe(true);
    });

    it('should handle errors during provider initialization', async () => {
      (AIProviderFactory.create as jest.Mock).mockImplementationOnce(() => {
        throw new Error('Initialization error');
      });

      process.env.OPENAI_API_KEY = 'test-key';

      await expect(aiService.initialize()).resolves.not.toThrow();
      expect(aiService.isConfigured()).toBe(false);
    });
  });

  describe('queryAI', () => {
    beforeEach(async () => {
      process.env.OPENAI_API_KEY = 'test-key';
      await aiService.initialize();
    });

    it('should query AI provider successfully', async () => {
      const context = { workingDirectory: '/app', projectType: 'node' };
      const response = await aiService.queryAI('Explain this function', context);

      expect(aiProviderMock.call).toHaveBeenCalledWith('Explain this function', expect.objectContaining<AICallOptions>({
        model: 'gpt-3.5-turbo',
        systemPrompt: expect.stringContaining('node'),
      }));

      expect(response).toEqual({
        content: 'Mock AI response',
        model: 'gpt-3.5-turbo',
        metadata: expect.any(Object),
      });
      expect(memoryServiceMock.addConversation).