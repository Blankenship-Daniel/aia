/**
 * AI Model Recommendation Service Interface
 * SOLID SRP: Responsible only for AI-powered model recommendation
 * SOLID OCP: Can be extended with new recommendation strategies
 * SOLID LSP: Substitutable with other IModelRecommendationService implementations
 * SOLID ISP: Implements only model recommendation specific interface methods
 * SOLID DIP: Uses abstractions for AI service and context dependencies
 */

import { AIModel } from '../types/index';

export interface ModelSelectionContext {
  query: string;
  conversationHistory?: any[];
  projectContext?: ProjectContext;
  userPreferences?: UserPreferences;
  availableModels: AIModel[];
  performanceHistory?: ModelPerformanceData[];
  currentWorkspace?: string;
  recentCommands?: string[];
}

export interface ProjectContext {
  projectType?: string;
  language?: string;
  frameworks?: string[];
  gitStatus?: string;
  workingDirectory: string;
  packageManager?: string;
  dependencies?: string[];
}

export interface UserPreferences {
  preferredModel?: AIModel;
  preferredProvider?: string;
  performancePriority?: 'speed' | 'quality' | 'cost';
  domainExpertise?: string[];
}

export interface ModelPerformanceData {
  model: AIModel;
  taskType: string;
  averageResponseTime: number;
  successRate: number;
  userSatisfactionScore?: number;
  costPerQuery?: number;
  lastUsed: Date;
  totalUsage: number;
}

export interface TaskRequirements {
  complexity: 'low' | 'medium' | 'high' | 'expert';
  domain: string;
  skillsRequired: string[];
  expectedOutputType: 'text' | 'code' | 'analysis' | 'creative';
  contextSensitivity: 'low' | 'medium' | 'high';
  reasoning: string;
  confidence: number;
}

export interface ModelRecommendation {
  recommendedModel: AIModel;
  confidence: number;
  reasoning: string;
  alternatives: AlternativeModel[];
  taskRequirements: TaskRequirements;
  expectedPerformance: {
    quality: number;
    speed: number;
    cost: number;
  };
  contextFactors: string[];
}

export interface AlternativeModel {
  model: AIModel;
  confidence: number;
  reasoning: string;
  tradeoffs: string[];
}

export interface ModelRecommendationAnalysis {
  taskAnalysis: TaskRequirements;
  contextAnalysis: ContextAnalysis;
  modelComparison: ModelComparison[];
  recommendation: ModelRecommendation;
  metadata: {
    analysisTimestamp: Date;
    aiModel: string;
    confidenceThreshold: number;
  };
}

export interface ContextAnalysis {
  projectComplexity: number;
  userExpertiseLevel: string;
  taskUrgency: 'low' | 'medium' | 'high';
  resourceConstraints: {
    timeConstraint: boolean;
    costConstraint: boolean;
    qualityRequirement: 'basic' | 'standard' | 'premium';
  };
  environmentFactors: string[];
}

export interface ModelComparison {
  model: AIModel;
  suitabilityScore: number;
  strengths: string[];
  weaknesses: string[];
  costEffectiveness: number;
  performanceMetrics: {
    expectedQuality: number;
    expectedSpeed: number;
    reliability: number;
  };
}

/**
 * AI Model Recommendation Service Interface
 * Provides intelligent model selection based on task analysis and context
 */
export interface IModelRecommendationService {
  /**
   * Recommend the optimal AI model for a given context
   * @param context - Complete context for model selection decision
   * @returns Promise resolving to model recommendation with reasoning
   */
  recommendModel(context: ModelSelectionContext): Promise<ModelRecommendation>;

  /**
   * Analyze task requirements using AI to understand complexity and needs
   * @param task - The task description to analyze
   * @param context - Optional additional context
   * @returns Promise resolving to detailed task requirements analysis
   */
  analyzeTaskRequirements(
    task: string,
    context?: Partial<ModelSelectionContext>
  ): Promise<TaskRequirements>;

  /**
   * Track model performance for continuous improvement
   * @param model - The model that was used
   * @param task - The task that was performed
   * @param result - The result/outcome information
   * @param userFeedback - Optional user satisfaction feedback
   */
  trackModelPerformance(
    model: AIModel,
    task: string,
    result: any,
    userFeedback?: {
      satisfaction: number; // 1-5 scale
      comments?: string;
    }
  ): Promise<void>;

  /**
   * Get comprehensive analysis including task analysis and model comparison
   * @param context - Complete context for analysis
   * @returns Promise resolving to detailed recommendation analysis
   */
  getDetailedRecommendationAnalysis(
    context: ModelSelectionContext
  ): Promise<ModelRecommendationAnalysis>;

  /**
   * Update model performance data based on usage patterns
   * @param performanceData - New performance data to incorporate
   */
  updatePerformanceData(performanceData: ModelPerformanceData[]): Promise<void>;

  /**
   * Get available models with their current performance metrics
   * @param provider - Optional filter by provider
   * @returns Promise resolving to list of models with performance data
   */
  getAvailableModelsWithMetrics(
    provider?: string
  ): Promise<ModelPerformanceData[]>;
}
