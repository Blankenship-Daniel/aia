/**
 * AI Provider Interface
 * Defines the contract for different AI service providers
 * SOLID SRP: Each provider handles only its specific AI service integration
 * SOLID OCP: New providers can be added without modifying existing code
 * SOLID LSP: All providers are substitutable through this interface
 * SOLID ISP: Interface is focused on AI provider capabilities only
 * SOLID DIP: High-level AIService depends on this abstraction
 */

export interface IAIProvider {
  name: string;
  call(prompt: string, options: AICallOptions): Promise<string>;
  validateConfig(config: any): boolean;
  getModelCapabilities(): ModelCapabilities;
  estimateTokens(text: string): number;
}

export interface AICallOptions {
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  stream?: boolean;
  systemPrompt?: string;
  model?: string;
}

export interface ModelCapabilities {
  maxTokens: number;
  supportsFunctions: boolean;
  supportsVision: boolean;
  supportsStreaming: boolean;
  models: string[];
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}
