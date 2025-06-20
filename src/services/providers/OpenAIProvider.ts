/**
 * OpenAI Provider Implementation
 * SOLID SRP: Handles only OpenAI API integration
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
import OpenAI from 'openai';

export class OpenAIProvider implements IAIProvider {
  name = 'openai';
  private client: OpenAI;
  private model: string;

  constructor(private apiKey: string, model: string) {
    this.client = new OpenAI({ apiKey });
    this.model = model;
  }

  async call(prompt: string, options: AICallOptions): Promise<string> {
    try {
      const response = await this.client.chat.completions.create({
        model: options.model || this.model,
        messages: [
          ...(options.systemPrompt
            ? [{ role: 'system' as const, content: options.systemPrompt }]
            : []),
          { role: 'user' as const, content: prompt },
        ],
        temperature: options.temperature,
        max_tokens: options.maxTokens,
        top_p: options.topP,
        stream: false, // Always use non-streaming for now
      });

      // Type assertion since we're not using streaming
      const completion = response as OpenAI.Chat.Completions.ChatCompletion;
      return completion.choices[0]?.message?.content || '';
    } catch (error) {
      throw new Error(
        `OpenAI API error: ${
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
      config.apiKey.startsWith('sk-') &&
      config.apiKey.length > 20 &&
      this.getModelCapabilities().models.includes(config.model || this.model)
    );
  }

  getModelCapabilities(): ModelCapabilities {
    const isGPT4 = this.model.includes('gpt-4');
    return {
      maxTokens: isGPT4 ? 8192 : 4096,
      supportsFunctions: true,
      supportsVision: this.model.includes('vision'),
      supportsStreaming: true,
      models: ['gpt-4', 'gpt-3.5-turbo', 'gpt-4-turbo', 'gpt-4-vision-preview'],
    };
  }

  estimateTokens(text: string): number {
    // Rough estimation: ~4 characters per token for English text
    return Math.ceil(text.length / 4);
  }
}
