import { AIAConfig, ContextInfo, AIModel, CommandResult } from '../types/index';

/**
 * AI Service Interface
 * Defines the contract for AI model interactions and query processing
 */
export interface IAIService {
  /**
   * Initialize AI clients and model selection
   */
  initialize(config: AIAConfig): Promise<void>;

  /**
   * Query AI with intelligent model selection
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
   * Select the optimal AI model based on query type and context
   */
  selectModel(query: string, context: ContextInfo): AIModel;

  /**
   * Get available AI models and their capabilities
   */
  getAvailableModels(): Array<{
    id: AIModel;
    name: string;
    description: string;
    capabilities: string[];
    maxTokens: number;
  }>;

  /**
   * Check if AI service is properly configured
   */
  isConfigured(): boolean;

  /**
   * Validate API keys for configured services
   */
  validateKeys(): Promise<{
    openai: boolean;
    anthropic: boolean;
  }>;
}
