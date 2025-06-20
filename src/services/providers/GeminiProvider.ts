/**
 * Gemini Provider Implementation
 * SOLID SRP: Handles only Google Gemini API integration
 * SOLID OCP: Can be extended without modifying other providers
 * SOLID LSP: Fully substitutable with other IAIProvider implementations
 * SOLID ISP: Implements only IAIProvider interface methods
 * SOLID DIP: Uses dependency injection for configuration
 */

import {
  IAIProvider,
  AICallOptions,
  ModelCapabilities,
} from '../../interfaces/IAIProvider';

export class GeminiProvider implements IAIProvider {
  name = 'gemini';
  private model: string;

  constructor(private apiKey: string, model: string) {
    this.model = model;
  }

  async call(prompt: string, options: AICallOptions): Promise<string> {
    try {
      // For now, return a simulated response since Gemini SDK implementation varies
      // In a real implementation, this would integrate with Google's Gemini API
      const response = `Gemini response to: ${prompt.substring(0, 50)}...`;
      return response;
    } catch (error) {
      throw new Error(
        `Gemini API error: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`
      );
    }
  }

  validateConfig(config: any): boolean {
    if (!config.apiKey || typeof config.apiKey !== 'string') {
      return false;
    }

    return (
      config.apiKey.length > 20 &&
      this.getModelCapabilities().models.includes(config.model || this.model)
    );
  }

  getModelCapabilities(): ModelCapabilities {
    return {
      maxTokens: 30720, // Gemini Pro context length
      supportsFunctions: true,
      supportsVision: this.model.includes('vision'),
      supportsStreaming: true,
      models: ['gemini-pro', 'gemini-pro-vision', 'gemini-1.5-pro'],
    };
  }

  estimateTokens(text: string): number {
    // Gemini tokenization estimation
    return Math.ceil(text.length / 4);
  }
}
