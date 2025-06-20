/**
 * IAIService.ts - AI service interface defining the contract for AI model interactions.
 *
 * Responsibilities:
 * - Defines standard interface for AI model interactions and query processing.
 * - Specifies intelligent model selection based on query context and requirements.
 * - Establishes contract for AI service initialization and configuration validation.
 * - Provides interface for model capability discovery and API key validation.
 *
 * Architecture:
 * - Central interface enabling Strategy Pattern for different AI providers.
 * - Supports multiple AI models (OpenAI, Anthropic) through unified interface.
 * - Integrates with configuration service for API key and preference management.
 *
 * Exports:
 * - {@link IAIService}: Main AI service interface for all AI interactions.
 *
 * @see AIService - Concrete implementation of this interface.
 * @see AIProviderFactory - Factory for creating specific AI provider instances.
 * @see ContextInfo - Context information structure for AI queries.
 */

import { AIAConfig, ContextInfo, AIModel, CommandResult } from '../types/index';

/**
 * IAIService - Interface defining the contract for AI model interactions and query processing.
 *
 * Purpose:
 * - Establishes unified interface for AI service implementations across different providers.
 * - Defines intelligent model selection capabilities based on query complexity and context.
 * - Specifies configuration validation and API key management requirements.
 * - Enables provider abstraction through Strategy Pattern implementation.
 *
 * Key Capabilities:
 * - Multi-provider AI model support (OpenAI, Anthropic, etc.).
 * - Context-aware model selection for optimal responses.
 * - Configuration validation and API key verification.
 * - Model capability discovery and metadata access.
 *
 * Dependencies:
 * @see AIAConfig - Configuration structure for AI service settings.
 * @see ContextInfo - Context information for AI query processing.
 * @see AIModel - AI model type definitions and capabilities.
 *
 * @example
 * // Implementation example:
 * // class MyAIService implements IAIService {
 * //   async initialize(config) { ... }
 * //   async queryAI(prompt, context) { return { content: '...', model: 'gpt-4', metadata: {} }; }
 * //   // ... other methods
 * // }
 */
export interface IAIService {
  /**
   * Initializes AI service with configuration including API keys and provider settings.
   *
   * @param {AIAConfig} config - Configuration containing API keys, model preferences, and provider settings.
   * @returns {Promise<void>} Resolves when AI service is initialized and ready for queries.
   * @throws {Error} If configuration is invalid or provider initialization fails.
   *
   * @example
   * await aiService.initialize({ openaiApiKey: 'sk-...', preferredModel: 'gpt-4' });
   */
  initialize(config: AIAConfig): Promise<void>;

  /**
   * Queries AI with intelligent model selection based on prompt and context.
   *
   * @param {string} prompt - The user query or prompt to send to the AI model.
   * @param {ContextInfo} context - Contextual information including project details and environment.
   * @param {AIModel | null} [preferredModel] - Optional preferred model override.
   * @returns {Promise<{content: string, model: AIModel, metadata: Record<string, unknown>}>} AI response with model info and metadata.
   * @throws {Error} If AI query fails or service is not properly initialized.
   *
   * @example
   * const response = await aiService.queryAI('Explain this code', contextInfo, 'gpt-4');
   * console.log(response.content, response.model);
   */
  queryAI(
    prompt: string,
    context: ContextInfo,
    preferredModel?: AIModel | null
  ): Promise<{
    content: string;
    model: AIModel;
    metadata: Record<string, unknown>;
  }>;

  /**
   * Selects the optimal AI model based on query characteristics and context requirements.
   *
   * @param {string} query - The query to analyze for model selection.
   * @param {ContextInfo} context - Context information that may influence model choice.
   * @returns {AIModel} The selected AI model best suited for the query.
   *
   * @example
   * const model = aiService.selectModel('Complex code analysis needed', contextInfo);
   * // Returns 'gpt-4' for complex tasks, 'gpt-3.5-turbo' for simpler ones
   */
  selectModel(query: string, context: ContextInfo): AIModel;

  /**
   * Returns information about available AI models and their capabilities.
   *
   * @returns {Array<{id: AIModel, name: string, description: string, capabilities: string[], maxTokens: number}>} Array of available models with metadata.
   *
   * @example
   * const models = aiService.getAvailableModels();
   * models.forEach(model => console.log(model.name, model.capabilities));
   */
  getAvailableModels(): Array<{
    id: AIModel;
    name: string;
    description: string;
    capabilities: string[];
    maxTokens: number;
  }>;

  /**
   * Checks if the AI service is properly configured with valid API keys.
   *
   * @returns {boolean} True if service is configured and ready for use.
   *
   * @example
   * if (aiService.isConfigured()) {
   *   await aiService.queryAI(prompt, context);
   * }
   */
  isConfigured(): boolean;

  /**
   * Validates API keys for all configured AI providers.
   *
   * @returns {Promise<{openai: boolean, anthropic: boolean}>} Validation status for each provider.
   * @throws {Error} If API key validation fails due to network or service issues.
   *
   * @example
   * const validation = await aiService.validateKeys();
   * if (validation.openai) console.log('OpenAI key is valid');
   */
  validateKeys(): Promise<{
    openai: boolean;
    anthropic: boolean;
  }>;
}
