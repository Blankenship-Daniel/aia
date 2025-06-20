/**
 * Anthropic Provider Implementation
 * SOLID SRP: Handles only Anthropic Claude API integration
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
import Anthropic from '@anthropic-ai/sdk';

export class AnthropicProvider implements IAIProvider {
  name = 'anthropic';
  private client: Anthropic;
  private model: string;

  constructor(private apiKey: string, model: string) {
    this.client = new Anthropic({ apiKey });
    this.model = model;
  }

  async call(prompt: string, options: AICallOptions): Promise<string> {
    try {
      const messages: Anthropic.Messages.MessageParam[] = [
        { role: 'user', content: prompt },
      ];

      const response = await this.client.messages.create({
        model: options.model || this.model,
        messages,
        max_tokens: options.maxTokens || 4000,
        temperature: options.temperature,
        top_p: options.topP,
        system: options.systemPrompt,
      });

      const content = response.content[0];
      return content?.type === 'text' ? content.text : '';
    } catch (error) {
      throw new Error(
        `Anthropic API error: ${
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
      config.apiKey.startsWith('sk-ant-') &&
      config.apiKey.length > 20 &&
      this.getModelCapabilities().models.includes(config.model || this.model)
    );
  }

  getModelCapabilities(): ModelCapabilities {
    return {
      maxTokens: 200000, // Claude 3.5 supports large context
      supportsFunctions: true,
      supportsVision:
        this.model.includes('vision') || this.model.includes('opus'),
      supportsStreaming: true,
      models: [
        'claude-3-5-sonnet-20241022',
        'claude-3-5-haiku-20241022',
        'claude-3-opus-20240229',
        'claude-3-sonnet-20240229',
        'claude-3-haiku-20240307',
      ],
    };
  }

  estimateTokens(text: string): number {
    // Claude tokenization is roughly 3.5 characters per token
    return Math.ceil(text.length / 3.5);
  }
}
