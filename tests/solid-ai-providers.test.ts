/**
 * SOLID AI Provider Strategy Tests
 * Tests the AI provider strategy pattern implementation for SOLID compliance
 */

import { OpenAIProvider } from '../src/services/providers/OpenAIProvider';
import { AnthropicProvider } from '../src/services/providers/AnthropicProvider';
import { GeminiProvider } from '../src/services/providers/GeminiProvider';
import { AIProviderFactory } from '../src/services/AIProviderFactory';
import { ConfigurationValidator } from '../src/services/ConfigurationValidator';
import { ProfileManager } from '../src/services/ProfileManager';

// Mock dependencies
const mockMemoryPersistence = {
  loadMemory: jest.fn().mockResolvedValue({
    conversations: [],
    commands: [],
    preferences: {},
    workingDirectories: {},
    semanticIndex: {},
    agenticHistory: [],
  }),
  saveMemory: jest.fn().mockResolvedValue(undefined),
  exists: jest.fn().mockResolvedValue(true),
  getMemoryPath: jest.fn().mockReturnValue('/test/path'),
};

describe('SOLID AI Provider Strategy Pattern', () => {
  describe('Single Responsibility Principle (SRP)', () => {
    it('should have providers with single responsibility', () => {
      const openAIProvider = new OpenAIProvider('test-key', 'gpt-3.5-turbo');
      const anthropicProvider = new AnthropicProvider(
        'test-key',
        'claude-3-5-sonnet-20241022'
      );
      const geminiProvider = new GeminiProvider('test-key', 'gemini-pro');

      // Each provider has a single responsibility: handle its specific AI service
      expect(openAIProvider.name).toBe('openai');
      expect(anthropicProvider.name).toBe('anthropic');
      expect(geminiProvider.name).toBe('gemini');

      // Each provider implements the same interface methods
      expect(typeof openAIProvider.call).toBe('function');
      expect(typeof openAIProvider.validateConfig).toBe('function');
      expect(typeof openAIProvider.getModelCapabilities).toBe('function');
      expect(typeof openAIProvider.estimateTokens).toBe('function');
    });

    it('should have configuration validator with single responsibility', () => {
      const validator = new ConfigurationValidator();

      // Validator only handles validation logic
      expect(typeof validator.validateApiKey).toBe('function');
      expect(typeof validator.validateModel).toBe('function');
      expect(typeof validator.validateConfiguration).toBe('function');
      expect(typeof validator.getSupportedModels).toBe('function');
    });

    it('should have profile manager with single responsibility', () => {
      const profileManager = new ProfileManager(mockMemoryPersistence as any);

      // Profile manager only handles profile operations
      expect(typeof profileManager.create).toBe('function');
      expect(typeof profileManager.switch).toBe('function');
      expect(typeof profileManager.list).toBe('function');
      expect(typeof profileManager.getActive).toBe('function');
      expect(typeof profileManager.delete).toBe('function');
    });
  });

  describe('Open/Closed Principle (OCP)', () => {
    it('should allow new providers without modifying existing code', () => {
      // Factory supports multiple providers
      const providers = AIProviderFactory.getSupportedProviders();
      expect(providers).toContain('openai');
      expect(providers).toContain('anthropic');
      expect(providers).toContain('gemini');

      // New providers can be added without modifying the factory
      expect(() => {
        const openaiProvider = AIProviderFactory.create({
          provider: 'openai',
          apiKey: 'sk-test',
          model: 'gpt-3.5-turbo',
        });
        expect(openaiProvider.name).toBe('openai');
      }).not.toThrow();
    });

    it('should validate new provider configurations', () => {
      const validation = AIProviderFactory.validateConfig({
        provider: 'openai',
        apiKey: 'sk-test',
        model: 'gpt-3.5-turbo',
      });

      expect(validation.valid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });
  });

  describe('Liskov Substitution Principle (LSP)', () => {
    it('should allow all providers to be substitutable', () => {
      const providers = [
        new OpenAIProvider('sk-test', 'gpt-3.5-turbo'),
        new AnthropicProvider('sk-ant-test', 'claude-3-5-sonnet-20241022'),
        new GeminiProvider('test-key', 'gemini-pro'),
      ];

      // All providers can be used interchangeably
      providers.forEach((provider) => {
        expect(typeof provider.name).toBe('string');
        expect(typeof provider.call).toBe('function');
        expect(typeof provider.validateConfig).toBe('function');
        expect(typeof provider.getModelCapabilities).toBe('function');
        expect(typeof provider.estimateTokens).toBe('function');

        // All providers return model capabilities
        const capabilities = provider.getModelCapabilities();
        expect(capabilities).toHaveProperty('maxTokens');
        expect(capabilities).toHaveProperty('supportsFunctions');
        expect(capabilities).toHaveProperty('supportsVision');
        expect(capabilities).toHaveProperty('supportsStreaming');
        expect(capabilities).toHaveProperty('models');
      });
    });
  });

  describe('Interface Segregation Principle (ISP)', () => {
    it('should have focused interfaces', () => {
      const provider = new OpenAIProvider('sk-test', 'gpt-3.5-turbo');

      // IAIProvider interface is focused on AI provider capabilities only
      expect(provider).toHaveProperty('name');
      expect(provider).toHaveProperty('call');
      expect(provider).toHaveProperty('validateConfig');
      expect(provider).toHaveProperty('getModelCapabilities');
      expect(provider).toHaveProperty('estimateTokens');

      // No unnecessary methods that providers don't need
      expect(provider).not.toHaveProperty('saveMemory');
      expect(provider).not.toHaveProperty('loadConfig');
      expect(provider).not.toHaveProperty('manageProfiles');
    });

    it('should have configuration validator with focused interface', () => {
      const validator = new ConfigurationValidator();

      // IConfigurationValidator interface is focused only on validation
      expect(validator).toHaveProperty('validateApiKey');
      expect(validator).toHaveProperty('validateModel');
      expect(validator).toHaveProperty('validateConfiguration');
      expect(validator).toHaveProperty('getSupportedModels');

      // No persistence or profile management methods
      expect(validator).not.toHaveProperty('save');
      expect(validator).not.toHaveProperty('load');
      expect(validator).not.toHaveProperty('createProfile');
    });
  });

  describe('Dependency Inversion Principle (DIP)', () => {
    it('should depend on abstractions not concretions', () => {
      // AIProviderFactory creates providers based on interfaces
      const provider = AIProviderFactory.create({
        provider: 'openai',
        apiKey: 'sk-test',
        model: 'gpt-3.5-turbo',
      });

      // Factory returns interface type, not concrete implementation
      expect(provider.name).toBe('openai');
      expect(typeof provider.call).toBe('function');
    });

    it('should have profile manager depend on persistence abstraction', () => {
      // ProfileManager depends on IMemoryPersistence interface
      expect(() => {
        new ProfileManager(mockMemoryPersistence as any);
      }).not.toThrow();

      // Can use any implementation of IMemoryPersistence
      const alternativeMock = {
        loadMemory: jest.fn().mockResolvedValue({}),
        saveMemory: jest.fn().mockResolvedValue(undefined),
        exists: jest.fn().mockResolvedValue(false),
        getMemoryPath: jest.fn().mockReturnValue('/alt/path'),
      };

      expect(() => {
        new ProfileManager(alternativeMock as any);
      }).not.toThrow();
    });
  });

  describe('Provider Strategy Pattern Functionality', () => {
    it('should validate API keys correctly', () => {
      const validator = new ConfigurationValidator();

      // OpenAI validation
      expect(
        validator.validateApiKey(
          'sk-1234567890abcdef1234567890abcdef',
          'openai'
        )
      ).toBe(true);
      expect(validator.validateApiKey('invalid-key', 'openai')).toBe(false);

      // Anthropic validation
      expect(
        validator.validateApiKey(
          'sk-ant-1234567890abcdef1234567890abcdef',
          'anthropic'
        )
      ).toBe(true);
      expect(
        validator.validateApiKey(
          'sk-1234567890abcdef1234567890abcdef',
          'anthropic'
        )
      ).toBe(false);

      // Gemini validation
      expect(
        validator.validateApiKey('1234567890abcdef1234567890abcdef', 'gemini')
      ).toBe(true);
      expect(validator.validateApiKey('short', 'gemini')).toBe(false);
    });

    it('should validate models correctly', () => {
      const validator = new ConfigurationValidator();

      // OpenAI models
      expect(validator.validateModel('gpt-4', 'openai')).toBe(true);
      expect(validator.validateModel('invalid-model', 'openai')).toBe(false);

      // Anthropic models
      expect(
        validator.validateModel('claude-3-5-sonnet-20241022', 'anthropic')
      ).toBe(true);
      expect(validator.validateModel('gpt-4', 'anthropic')).toBe(false);

      // Gemini models
      expect(validator.validateModel('gemini-pro', 'gemini')).toBe(true);
      expect(validator.validateModel('claude-3-opus', 'gemini')).toBe(false);
    });

    it('should estimate tokens appropriately', () => {
      const openaiProvider = new OpenAIProvider('sk-test', 'gpt-3.5-turbo');
      const anthropicProvider = new AnthropicProvider(
        'sk-ant-test',
        'claude-3-5-sonnet-20241022'
      );

      const testText = 'This is a test prompt for token estimation';

      const openaiTokens = openaiProvider.estimateTokens(testText);
      const anthropicTokens = anthropicProvider.estimateTokens(testText);

      // Both should return reasonable estimates
      expect(openaiTokens).toBeGreaterThan(0);
      expect(anthropicTokens).toBeGreaterThan(0);

      // Token estimates should be within reasonable ranges
      expect(Math.abs(openaiTokens - anthropicTokens)).toBeLessThanOrEqual(2);
    });
  });

  describe('Profile Management Functionality', () => {
    let profileManager: ProfileManager;

    beforeEach(() => {
      jest.clearAllMocks();
      profileManager = new ProfileManager(mockMemoryPersistence as any);
    });

    it('should create and manage profiles', async () => {
      const profile = profileManager.create('test-profile', {
        description: 'Test profile',
        config: { provider: 'openai' },
      });

      expect(profile.name).toBe('test-profile');
      expect(profile.description).toBe('Test profile');
      expect(profile.config.provider).toBe('openai');

      // Wait for the async save to complete
      await new Promise((resolve) => setTimeout(resolve, 10));
      expect(mockMemoryPersistence.saveMemory).toHaveBeenCalled();
    });

    it('should switch between profiles', () => {
      profileManager.create('profile1');
      profileManager.create('profile2');

      profileManager.switch('profile2');
      const active = profileManager.getActive();
      expect(active.name).toBe('profile2');
    });

    it('should list profiles with active first', () => {
      profileManager.create('z-profile');
      profileManager.create('a-profile');
      profileManager.switch('z-profile');

      const profiles = profileManager.list();
      expect(profiles[0].name).toBe('z-profile'); // Active profile first
      expect(profiles[1].name).toBe('a-profile'); // Then alphabetical
    });

    it('should prevent deletion of default profile', () => {
      expect(() => {
        profileManager.delete('default');
      }).toThrow('Cannot delete default profile');
    });
  });
});

describe('Integration Tests', () => {
  it('should work together without tight coupling', () => {
    // Services can be composed without dependencies on each other
    const validator = new ConfigurationValidator();
    const profileManager = new ProfileManager(mockMemoryPersistence as any);

    // Validator can validate without knowing about profiles
    const validation = validator.validateConfiguration({
      provider: 'openai',
      apiKey: 'sk-1234567890abcdef1234567890abcdef',
      model: 'gpt-4',
    });

    expect(validation.valid).toBe(true);

    // Profile manager can create profiles without knowing about validation
    const profile = profileManager.create('validated-profile', {
      config: {
        provider: 'openai',
        apiKey: 'sk-1234567890abcdef1234567890abcdef',
        model: 'gpt-4',
      },
    });

    expect(profile.name).toBe('validated-profile');

    // Provider factory can create providers independently
    const provider = AIProviderFactory.create({
      provider: 'openai',
      apiKey: 'sk-1234567890abcdef1234567890abcdef',
      model: 'gpt-4',
    });

    expect(provider.name).toBe('openai');
  });
});
