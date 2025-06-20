/**
 * Configuration Validator Service Implementation
 * SOLID SRP: Responsible only for configuration validation
 * SOLID OCP: Can be extended with new validation rules without modification
 * SOLID LSP: Substitutable with other IConfigurationValidator implementations
 * SOLID ISP: Implements only validation-specific interface methods
 * SOLID DIP: Uses abstractions for provider information
 */

import {
  IConfigurationValidator,
  ValidationResult,
} from '../interfaces/IConfigurationValidator';

export class ConfigurationValidator implements IConfigurationValidator {
  private readonly providerValidators: Map<string, ProviderValidator>;

  constructor() {
    this.providerValidators = new Map([
      ['openai', new OpenAIValidator()],
      ['anthropic', new AnthropicValidator()],
      ['gemini', new GeminiValidator()],
    ]);
  }

  validateApiKey(key: string, provider: string): boolean {
    if (!key || typeof key !== 'string') {
      return false;
    }

    const validator = this.providerValidators.get(provider.toLowerCase());
    return validator ? validator.validateApiKey(key) : false;
  }

  validateModel(model: string, provider: string): boolean {
    if (!model || typeof model !== 'string') {
      return false;
    }

    const validator = this.providerValidators.get(provider.toLowerCase());
    return validator ? validator.validateModel(model) : false;
  }

  validateConfiguration(config: any): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Required fields validation
    if (!config.provider) {
      errors.push('Provider is required');
    }

    if (!config.apiKey) {
      errors.push('API key is required');
    }

    if (!config.model) {
      errors.push('Model is required');
    }

    // Provider-specific validation
    if (config.provider && config.apiKey) {
      if (!this.validateApiKey(config.apiKey, config.provider)) {
        errors.push(`Invalid API key format for provider: ${config.provider}`);
      }
    }

    if (config.provider && config.model) {
      if (!this.validateModel(config.model, config.provider)) {
        errors.push(
          `Invalid model '${config.model}' for provider: ${config.provider}`
        );
      }
    }

    // Performance warnings
    if (
      config.temperature &&
      (config.temperature < 0 || config.temperature > 2)
    ) {
      warnings.push(
        'Temperature should be between 0 and 2 for optimal results'
      );
    }

    if (config.maxTokens && config.maxTokens > 4000) {
      warnings.push(
        'High token limits may result in slower responses and higher costs'
      );
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings: warnings.length > 0 ? warnings : undefined,
    };
  }

  getSupportedModels(provider: string): string[] {
    const validator = this.providerValidators.get(provider.toLowerCase());
    return validator ? validator.getSupportedModels() : [];
  }
}

// Provider-specific validation logic
interface ProviderValidator {
  validateApiKey(key: string): boolean;
  validateModel(model: string): boolean;
  getSupportedModels(): string[];
}

class OpenAIValidator implements ProviderValidator {
  validateApiKey(key: string): boolean {
    return key.startsWith('sk-') && key.length > 20;
  }

  validateModel(model: string): boolean {
    return this.getSupportedModels().includes(model);
  }

  getSupportedModels(): string[] {
    return ['gpt-4', 'gpt-3.5-turbo', 'gpt-4-turbo', 'gpt-4-vision-preview'];
  }
}

class AnthropicValidator implements ProviderValidator {
  validateApiKey(key: string): boolean {
    return key.startsWith('sk-ant-') && key.length > 20;
  }

  validateModel(model: string): boolean {
    return this.getSupportedModels().includes(model);
  }

  getSupportedModels(): string[] {
    return [
      'claude-3-5-sonnet-20241022',
      'claude-3-5-haiku-20241022',
      'claude-3-opus-20240229',
      'claude-3-sonnet-20240229',
      'claude-3-haiku-20240307',
    ];
  }
}

class GeminiValidator implements ProviderValidator {
  validateApiKey(key: string): boolean {
    return key.length > 20;
  }

  validateModel(model: string): boolean {
    return this.getSupportedModels().includes(model);
  }

  getSupportedModels(): string[] {
    return ['gemini-pro', 'gemini-pro-vision', 'gemini-1.5-pro'];
  }
}
