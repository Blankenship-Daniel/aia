To generate comprehensive Jest tests for the `AnthropicProvider` class, we need to follow the conventions and context provided in the project description. Here's how you can structure your test suite:

```typescript
// tests/services/providers/AnthropicProvider.test.ts
import { AnthropicProvider } from '../../../src/services/providers/AnthropicProvider';
import { IAIProvider, AICallOptions } from '../../../src/interfaces/IAIProvider';
import Anthropic from '@anthropic-ai/sdk';
import { mocked } from 'jest-mock';

jest.mock('@anthropic-ai/sdk');
const MockedAnthropic = mocked(Anthropic, true);

describe('AnthropicProvider', () => {
  let anthropicProvider: IAIProvider;
  const mockApiKey = 'sk-ant-fakeapikey123456';
  const model = 'claude-3-5-sonnet-20241022';
  const defaultCallOptions: AICallOptions = {
    model: 'claude-3-5-sonnet-20241022',
    maxTokens: 1000,
    temperature: 0.5,
    topP: 0.9,
    systemPrompt: 'Testing system prompt',
  };

  beforeEach(() => {
    MockedAnthropic.mockClear();
    anthropicProvider = new AnthropicProvider(mockApiKey, model);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Constructor', () => {
    it('should initialize with correct parameters', () => {
      expect(MockedAnthropic).toHaveBeenCalledWith({ apiKey: mockApiKey });
    });
  });

  describe('call', () => {
    it('should successfully call the Anthropic API and return a response', async () => {
      const expectedResponse = { content: [{ type: 'text', text: 'Hello World' }] };
      MockedAnthropic.prototype.messages.create.mockResolvedValueOnce(expectedResponse);

      const prompt = 'Hello';
      const result = await anthropicProvider.call(prompt, defaultCallOptions);

      expect(MockedAnthropic.prototype.messages.create).toHaveBeenCalledWith({
        model: defaultCallOptions.model, 
        messages: [{ role: 'user', content: prompt }],
        max_tokens: defaultCallOptions.maxTokens,
        temperature: defaultCallOptions.temperature,
        top_p: defaultCallOptions.topP,
        system: defaultCallOptions.systemPrompt,
      });
      expect(result).toBe('Hello World');
    });

    it('should handle errors from the Anthropic API', async () => {
      MockedAnthropic.prototype.messages.create.mockRejectedValueOnce(new Error('API Error'));

      await expect(anthropicProvider.call('Hello', defaultCallOptions)).rejects.toThrow('Anthropic API error: API Error');
    });
  });

  describe('validateConfig', () => {
    it('should return true for valid config', () => {
      const validConfig = { apiKey: mockApiKey, model };
      expect(anthropicProvider.validateConfig(validConfig)).toBe(true);
    });

    it('should return false for invalid apiKey format', () => {
      const invalidConfig = { apiKey: 'invalid-key', model };
      expect(anthropicProvider.validateConfig(invalidConfig)).toBe(false);
    });

    it('should return false for missing model in capabilities', () => {
      const invalidConfig = { apiKey: mockApiKey, model: 'non-existent-model' };
      expect(anthropicProvider.validateConfig(invalidConfig)).toBe(false);
    });
  });

  describe('getModelCapabilities', () => {
    it('should return correct model capabilities', () => {
      const capabilities = anthropicProvider.getModelCapabilities();
      expect(capabilities).toEqual({
        maxTokens: 200000,
        supportsFunctions: true,
        supportsVision: false,
        supportsStreaming: true,
