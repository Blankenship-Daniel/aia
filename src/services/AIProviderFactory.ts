/**
 * AI Provider Factory
 * SOLID SRP: Responsible only for creating AI provider instances
 * SOLID OCP: New providers can be added by extending the factory
 * SOLID LSP: All created providers are substitutable through IAIProvider
 * SOLID ISP: Uses focused interfaces for provider creation
 * SOLID DIP: Depends on IAIProvider abstraction, not concrete implementations
 */

import { IAIProvider } from '../interfaces/IAIProvider';
import { OpenAIProvider } from './providers/OpenAIProvider';
import { AnthropicProvider } from './providers/AnthropicProvider';
import { GeminiProvider } from './providers/GeminiProvider';

export interface ProviderConfig {
  provider: string;
  apiKey: string;
  model: string;
}

/**
 * AIProviderFactory class
 * 
 * TODO: Add class description
 */
export class AIProviderFactory {
  /**
   * Create an AI provider instance based on configuration
   * @param config Provider configuration
   * @returns IAIProvider instance
   */
  static create(config: ProviderConfig): IAIProvider {
    const { provider, apiKey, model } = config;

    switch (provider.toLowerCase()) {
      case 'openai':
        return new OpenAIProvider(apiKey, model);
      case 'anthropic':
        return new AnthropicProvider(apiKey, model);
      case 'gemini':
        return new GeminiProvider(apiKey, model);
      default:
        throw new Error(
          `Unknown AI provider: ${provider}. Supported providers: ${this.getSupportedProviders().join(
            ', '
          )}`
        );
    }
  }

  /**
   * Get list of supported provider names
   * @returns Array of provider names
   */
  static getSupportedProviders(): string[] {
    return ['openai', 'anthropic', 'gemini'];
  }

  /**
   * Validate provider configuration
   * @param config Provider configuration
   * @returns Validation result
   */
  static validateConfig(config: ProviderConfig): {
    valid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    if (!config.provider) {
      errors.push('Provider is required');
    } else if (
      !this.getSupportedProviders().includes(config.provider.toLowerCase())
    ) {
      errors.push(
        `Unsupported provider: ${
          config.provider
        }. Supported: ${this.getSupportedProviders().join(', ')}`
      );
    }

    if (!config.apiKey) {
      errors.push('API key is required');
    }

    if (!config.model) {
      errors.push('Model is required');
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Get default model for a provider
   * @param provider Provider name
   * @returns Default model name
   */
  static getDefaultModel(provider: string): string {
    switch (provider.toLowerCase()) {
      case 'openai':
        return 'gpt-3.5-turbo';
      case 'anthropic':
        return 'claude-3-5-sonnet-20241022';
      case 'gemini':
        return 'gemini-pro';
      default:
        throw new Error(`Unknown provider: ${provider}`);
    }
  }
}
