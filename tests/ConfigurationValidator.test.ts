To create comprehensive Jest tests for the `ConfigurationValidator` class in a TypeScript project following the mentioned patterns, we will structure the test file with clear `describe` and `it` blocks. The tests will cover different scenarios including success and error cases. Mocks will be used for external dependencies, following the existing test patterns in the codebase. Here's how you might write these tests:

```typescript
// tests/services/ConfigurationValidator.test.ts

import { ConfigurationValidator } from '../../src/services/ConfigurationValidator';
import { ValidationResult } from '../../src/interfaces/IConfigurationValidator';
import { mocked } from 'ts-jest/utils';

// Mock ProviderValidators
jest.mock('../../src/services/OpenAIValidator');
jest.mock('../../src/services/AnthropicValidator');
jest.mock('../../src/services/GeminiValidator');

import OpenAIValidator from '../../src/services/OpenAIValidator';
import AnthropicValidator from '../../src/services/AnthropicValidator';
import GeminiValidator from '../../src/services/GeminiValidator';

describe('ConfigurationValidator', () => {
  let validator: ConfigurationValidator;
  const mockOpenAIValidator = mocked(new OpenAIValidator(), true);
  const mockAnthropicValidator = mocked(new AnthropicValidator(), true);
  const mockGeminiValidator = mocked(new GeminiValidator(), true);

  beforeEach(() => {
    jest.clearAllMocks();
    validator = new ConfigurationValidator();
  });

  describe('validateApiKey', () => {
    it('should return false for empty key', () => {
      expect(validator.validateApiKey('', 'openai')).toBe(false);
    });

    it('should return false for invalid provider', () => {
      expect(validator.validateApiKey('some-valid-key', 'invalid')).toBe(false);
    });

    it('should delegate validation to the provider validator', () => {
      mockOpenAIValidator.validateApiKey.mockReturnValue(true);
      
      const isValid = validator.validateApiKey('sk-valid-key', 'openai');
      expect(isValid).toBe(true);
      expect(mockOpenAIValidator.validateApiKey).toHaveBeenCalledWith('sk-valid-key');
    });
  });

  describe('validateModel', () => {
    it('should return false for empty model', () => {
      expect(validator.validateModel('', 'openai')).toBe(false);
    });

    it('should return false for invalid provider', () => {
      expect(validator.validateModel('gpt-4', 'invalid')).toBe(false);
    });

    it('should delegate validation to the provider validator', () => {
      mockOpenAIValidator.validateModel.mockReturnValue(true);

      const isValid = validator.validateModel('gpt-4', 'openai');
      expect(isValid).toBe(true);
      expect(mockOpenAIValidator.validateModel).toHaveBeenCalledWith('gpt-4');
    });
  });

  describe('validateConfiguration', () => {
    it('should return errors if provider, apiKey, or model are missing', () => {
      const config = { someField: 'someValue' };
      const result: ValidationResult = validator.validateConfiguration(config);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Provider is required');
      expect(result.errors).toContain('API key is required');
      expect(result.errors).toContain('Model is required');
    });

    it('should return errors for invalid apiKey and model', () => {
      const config = { provider: 'openai', apiKey: 'invalid-key', model: 'invalid-model' };
      
      mockOpenAIValidator.validateApiKey.mockReturnValue(false);
      mockOpenAIValidator.validateModel.mockReturnValue(false);

      const result: ValidationResult = validator.validateConfiguration(config);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Invalid API key format for provider: openai');
      expect(result.errors).toContain(`Invalid model '