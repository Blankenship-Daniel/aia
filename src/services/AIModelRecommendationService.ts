/**
 * AI Model Recommendation Service
 *
 * Replaces pattern-based ModelSelector with AI-powered model selection.
 * Uses AI to analyze queries and recommend optimal models based on context.
 */

import { AIModel, ContextInfo } from '../types/index';
import {
  IModelRecommendationService,
  ModelRecommendation,
  ModelSelectionContext,
  TaskRequirements,
  AlternativeModel,
  ModelRecommendationAnalysis,
  ModelPerformanceData,
  ContextAnalysis,
  ModelComparison,
} from '../interfaces/IModelRecommendationService';
import { IAIService } from '../interfaces/IAIService';
import { IContextService } from '../interfaces/IContextService';
// @ts-ignore - chalk may not have types available
const { Chalk } = require('chalk');
// Instantiate Chalk for color methods in CommonJS context
const chalk = new Chalk({ level: 3 });

/**
 * AIModelRecommendationService class
 * 
 * TODO: Add class description
 */
export class AIModelRecommendationService
  implements IModelRecommendationService
{
  private aiService: IAIService;
  private contextService: IContextService;
  private performanceData: Map<string, any> = new Map();

  private readonly AI_ANALYSIS_PROMPT_TEMPLATE = `
Analyze this query and recommend the optimal AI model:

Query: "{query}"
Available Models: {availableModels}
Project Type: {projectType}
Language: {language}
Working Directory: {workingDirectory}
User Preferences: {userPreferences}

Based on this context, analyze:
1. Task complexity (low, medium, high, expert)
2. Domain requirements (code, general, creative, analytical)
3. Speed vs quality trade-offs
4. Cost considerations

Respond with JSON:
{
  "recommendedModel": "model-name",
  "confidence": 0.95,
  "reasoning": "explanation",
  "alternatives": [{"model": "alt1", "confidence": 0.8, "reasoning": "why", "tradeoffs": ["faster", "cheaper"]}],
  "taskRequirements": {
    "complexity": "high",
    "domain": "code",
    "skillsRequired": ["programming", "debugging"],
    "expectedOutputType": "code",
    "contextSensitivity": "high",
    "reasoning": "requires deep code understanding",
    "confidence": 0.9
  }
}
`;

  /**
   * Creates an instance of the class
   * 
   * @param aiService - Parameter description
   * @param contextService - Parameter description
   */
  constructor(aiService: IAIService, contextService: IContextService) {
    this.aiService = aiService;
    this.contextService = contextService;
  }

  async recommendModel(
    context: ModelSelectionContext
  ): Promise<ModelRecommendation> {
    try {
      console.log(
        chalk.blue('🤖 AI Model Recommendation: Analyzing task and context...')
      );

      // Enhance context with additional information
      const enhancedContext = await this.enhanceContext(context);

      // Build AI prompt with context
      const prompt = this.buildAnalysisPrompt(enhancedContext);

      // Create ContextInfo for AI service
      const contextInfo: ContextInfo = {
        workingDirectory:
          enhancedContext.projectContext?.workingDirectory || process.cwd(),
        platform: process.platform,
        arch: process.arch,
        nodeVersion: process.version,
        user: process.env.USER || 'unknown',
        shell: process.env.SHELL || 'unknown',
        timestamp: new Date().toISOString(),
        projectType: enhancedContext.projectContext?.projectType || '',
        projectInfo: {},
        gitStatus: '',
        environmentScore: 1.0,
      };

      // Get AI analysis
      const aiResponse = await this.aiService.queryAI(prompt, contextInfo);

      // Parse and validate AI response
      const analysis = this.parseAIResponse(aiResponse.content);

      // Apply performance history adjustments
      const finalRecommendation = this.applyPerformanceAdjustments(
        analysis,
        context.performanceHistory || []
      );

      console.log(
        chalk.green(
          `✅ Recommended model: ${finalRecommendation.recommendedModel} (confidence: ${finalRecommendation.confidence})`
        )
      );

      return finalRecommendation;
    } catch (error) {
      console.error(chalk.red('❌ Model recommendation failed:'), error);
      // Fallback to a default model
      return this.getDefaultRecommendation(context);
    }
  }

  /**
   * Analyzes taskrequirements
   * 
   * @param task - Parameter description
   * 
   * @returns Promise<TaskRequirements> - Return value description
   */
  async analyzeTaskRequirements(task: string): Promise<TaskRequirements> {
    try {
      const prompt = `
Analyze this task and determine its requirements:

Task: "${task}"

Provide a detailed analysis in JSON format:
{
  "complexity": "low|medium|high|expert",
  "domain": "code|general|creative|analytical|research",
  "skillsRequired": ["reasoning", "code-analysis", "creative-writing"],
  "expectedOutputType": "text|code|analysis|creative",
  "contextSensitivity": "low|medium|high",
  "reasoning": "detailed explanation of the task requirements",
  "confidence": 0.95
}
`;

      const contextInfo: ContextInfo = {
        workingDirectory: process.cwd(),
        platform: process.platform,
        arch: process.arch,
        nodeVersion: process.version,
        user: process.env.USER || 'unknown',
        shell: process.env.SHELL || 'unknown',
        timestamp: new Date().toISOString(),
        projectType: 'analysis',
        projectInfo: {},
        gitStatus: '',
        environmentScore: 1.0,
      };

      const response = await this.aiService.queryAI(prompt, contextInfo);

      return this.parseTaskRequirements(response.content);
    } catch (error) {
      console.error(chalk.red('❌ Task analysis failed:'), error);
      // Return default task requirements
      return {
        complexity: 'medium',
        domain: 'general',
        skillsRequired: ['reasoning'],
        expectedOutputType: 'text',
        contextSensitivity: 'medium',
        reasoning: 'Default task analysis due to error',
        confidence: 0.5,
      };
    }
  }

  async trackModelPerformance(
    model: AIModel,
    task: string,
    result: any,
    userFeedback?: { satisfaction: number; comments?: string }
  ): Promise<void> {
    try {
      const key = `${model}_${task.substring(0, 50)}`;
      const performanceData = {
        model,
        task: task.substring(0, 100),
        timestamp: new Date().toISOString(),
        success: result.success || false,
        responseTime: result.responseTime || 0,
        tokenCount: result.tokenCount || 0,
        quality: result.quality || 0.5,
        userFeedback: userFeedback || null,
      };

      this.performanceData.set(key, performanceData);

      // Keep only the last 100 entries to prevent memory bloat
      if (this.performanceData.size > 100) {
        const keys = Array.from(this.performanceData.keys());
        const firstKey = keys[0];
        this.performanceData.delete(firstKey);
      }

      console.log(
        chalk.gray(
          `📊 Tracked performance for ${model}: ${result.success ? '✅' : '❌'}`
        )
      );
    } catch (error) {
      console.error(chalk.red('❌ Performance tracking failed:'), error);
    }
  }

  async getDetailedRecommendationAnalysis(
    context: ModelSelectionContext
  ): Promise<ModelRecommendationAnalysis> {
    try {
      // Get basic recommendation
      const recommendation = await this.recommendModel(context);

      // Analyze task requirements
      const taskAnalysis = await this.analyzeTaskRequirements(context.query);

      // Build context analysis
      const contextAnalysis: ContextAnalysis = {
        projectComplexity: this.calculateProjectComplexity(context),
        userExpertiseLevel:
          context.userPreferences?.domainExpertise?.join(', ') || 'general',
        taskUrgency: 'medium',
        resourceConstraints: {
          timeConstraint: false,
          costConstraint: false,
          qualityRequirement: 'standard',
        },
        environmentFactors: [context.projectContext?.projectType || 'general'],
      };

      // Build model comparison
      const modelComparison: ModelComparison[] = context.availableModels.map(
        (model) => ({
          model,
          suitabilityScore: this.calculateSuitabilityScore(model, taskAnalysis),
          strengths: this.getModelPros(model),
          weaknesses: this.getModelCons(model),
          costEffectiveness: this.calculateCostEffectiveness(model),
          performanceMetrics: {
            expectedQuality: this.getExpectedQuality(model),
            expectedSpeed: this.getExpectedSpeed(model),
            reliability: this.getReliability(model),
          },
        })
      );

      return {
        taskAnalysis,
        contextAnalysis,
        modelComparison,
        recommendation,
        metadata: {
          analysisTimestamp: new Date(),
          aiModel: 'gpt-3.5-turbo',
          confidenceThreshold: 0.8,
        },
      };
    } catch (error) {
      console.error(chalk.red('❌ Detailed analysis failed:'), error);
      throw new Error('Failed to generate detailed recommendation analysis');
    }
  }

  async updatePerformanceData(
    performanceData: ModelPerformanceData[]
  ): Promise<void> {
    try {
      performanceData.forEach((data) => {
        const key = `${data.model}_${data.taskType}`;
        this.performanceData.set(key, data);
      });

      console.log(
        chalk.green(
          `✅ Updated performance data for ${performanceData.length} entries`
        )
      );
    } catch (error) {
      console.error(chalk.red('❌ Failed to update performance data:'), error);
    }
  }

  async getAvailableModelsWithMetrics(
    provider?: string
  ): Promise<ModelPerformanceData[]> {
    try {
      const availableModels: AIModel[] = [
        'gpt-4',
        'gpt-3.5-turbo',
        'claude-opus-4-20250514',
        'claude-sonnet-4-20250514',
        'claude-3-5-sonnet-20241022',
        'claude-3-5-haiku-20241022',
      ];

      const modelsWithMetrics: ModelPerformanceData[] = availableModels
        .filter(
          (model) => !provider || this.getModelProvider(model) === provider
        )
        .map((model) => {
          const existingData = Array.from(this.performanceData.values()).filter(
            (data: any) => data.model === model
          );

          if (existingData.length > 0) {
            const avgResponseTime =
              existingData.reduce(
                (sum: number, data: any) => sum + (data.responseTime || 0),
                0
              ) / existingData.length;
            const successRate =
              existingData.reduce(
                (sum: number, data: any) => sum + (data.success ? 1 : 0),
                0
              ) / existingData.length;
            const totalUsage = existingData.length;

            return {
              model,
              taskType: 'general',
              averageResponseTime: avgResponseTime,
              successRate,
              userSatisfactionScore: 0.8,
              costPerQuery: this.estimateCost(model),
              lastUsed: new Date(),
              totalUsage,
            };
          }

          // Default metrics for models without performance history
          return {
            model,
            taskType: 'general',
            averageResponseTime: this.estimateResponseTime(model),
            successRate: 0.85,
            userSatisfactionScore: 0.8,
            costPerQuery: this.estimateCost(model),
            lastUsed: new Date(),
            totalUsage: 0,
          };
        });

      return modelsWithMetrics;
    } catch (error) {
      console.error(chalk.red('❌ Failed to get models with metrics:'), error);
      return [];
    }
  }

  // Private helper methods

  private async enhanceContext(
    context: ModelSelectionContext
  ): Promise<ModelSelectionContext> {
    try {
      // Enhance context with additional information from context service
      const currentContext = await this.contextService.gatherContext();

      return {
        ...context,
        projectContext: {
          ...context.projectContext,
          workingDirectory:
            currentContext.workingDirectory ||
            context.projectContext?.workingDirectory ||
            process.cwd(),
        },
        conversationHistory: context.conversationHistory || [],
        performanceHistory:
          context.performanceHistory ||
          Array.from(this.performanceData.values()),
      };
    } catch (error) {
      console.warn(
        chalk.yellow('⚠️ Context enhancement failed, using basic context')
      );
      return context;
    }
  }

  /**
   * Builds analysisprompt
   * 
   * @param context - Parameter description
   * 
   * @returns string - Return value description
   */
  private buildAnalysisPrompt(context: ModelSelectionContext): string {
    return this.AI_ANALYSIS_PROMPT_TEMPLATE.replace('{query}', context.query)
      .replace('{availableModels}', JSON.stringify(context.availableModels))
      .replace(
        '{projectType}',
        context.projectContext?.projectType || 'unknown'
      )
      .replace('{language}', context.projectContext?.language || 'unknown')
      .replace(
        '{workingDirectory}',
        context.projectContext?.workingDirectory || 'unknown'
      )
      .replace(
        '{userPreferences}',
        JSON.stringify(context.userPreferences || {})
      );
  }

  /**
   * Parses airesponse
   * 
   * @param content - Parameter description
   * 
   * @returns ModelRecommendation - Return value description
   */
  private parseAIResponse(content: string): ModelRecommendation {
    try {
      // Extract JSON from AI response
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in AI response');
      }

      const parsed = JSON.parse(jsonMatch[0]);

      return {
        recommendedModel: parsed.recommendedModel || 'gpt-3.5-turbo',
        confidence: parsed.confidence || 0.5,
        reasoning: parsed.reasoning || 'AI analysis',
        alternatives: parsed.alternatives || [],
        taskRequirements: parsed.taskRequirements || {
          complexity: 'medium',
          domain: 'general',
          skillsRequired: ['reasoning'],
          expectedOutputType: 'text',
          contextSensitivity: 'medium',
          reasoning: 'Default requirements',
          confidence: 0.5,
        },
        expectedPerformance: {
          quality: 0.8,
          speed: 0.7,
          cost: 0.6,
        },
        contextFactors: ['ai-analysis', 'query-complexity'],
      };
    } catch (error) {
      console.error(chalk.red('❌ Failed to parse AI recommendation'));
      return this.getDefaultRecommendation();
    }
  }

  /**
   * Parses taskrequirements
   * 
   * @param content - Parameter description
   * 
   * @returns TaskRequirements - Return value description
   */
  private parseTaskRequirements(content: string): TaskRequirements {
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in AI response');
      }

      const parsed = JSON.parse(jsonMatch[0]);

      return {
        complexity: parsed.complexity || 'medium',
        domain: parsed.domain || 'general',
        skillsRequired: parsed.skillsRequired || ['reasoning'],
        expectedOutputType: parsed.expectedOutputType || 'text',
        contextSensitivity: parsed.contextSensitivity || 'medium',
        reasoning: parsed.reasoning || 'AI task analysis',
        confidence: parsed.confidence || 0.5,
      };
    } catch (error) {
      console.error(chalk.red('❌ Failed to parse task requirements'));
      return {
        complexity: 'medium',
        domain: 'general',
        skillsRequired: ['reasoning'],
        expectedOutputType: 'text',
        contextSensitivity: 'medium',
        reasoning: 'Default task analysis due to parse error',
        confidence: 0.5,
      };
    }
  }

  private applyPerformanceAdjustments(
    recommendation: ModelRecommendation,
    performanceHistory: any[]
  ): ModelRecommendation {
    // Simple performance adjustment logic
    const modelHistory = performanceHistory.filter(
      (h) => h.model === recommendation.recommendedModel
    );

    if (modelHistory.length > 0) {
      const avgSuccess =
        modelHistory.reduce((sum, h) => sum + (h.success ? 1 : 0), 0) /
        modelHistory.length;

      // Adjust confidence based on historical performance
      recommendation.confidence *= avgSuccess;

      if (avgSuccess < 0.5 && recommendation.alternatives.length > 0) {
        // Switch to an alternative if current model has poor performance
        const alternative = recommendation.alternatives[0];
        recommendation.recommendedModel = alternative.model;
        recommendation.reasoning +=
          ' (Adjusted due to poor historical performance)';
      }
    }

    return recommendation;
  }

  private getDefaultRecommendation(
    context?: ModelSelectionContext
  ): ModelRecommendation {
    const alternative: AlternativeModel = {
      model: 'gpt-4' as AIModel,
      confidence: 0.7,
      reasoning: 'High-quality alternative',
      tradeoffs: ['slower', 'more expensive', 'higher quality'],
    };

    return {
      recommendedModel: 'gpt-3.5-turbo' as AIModel,
      confidence: 0.5,
      reasoning: 'Default fallback recommendation',
      alternatives: [alternative],
      taskRequirements: {
        complexity: 'medium',
        domain: 'general',
        skillsRequired: ['reasoning'],
        expectedOutputType: 'text',
        contextSensitivity: 'medium',
        reasoning: 'Default task requirements',
        confidence: 0.5,
      },
      expectedPerformance: {
        quality: 0.7,
        speed: 0.8,
        cost: 0.9,
      },
      contextFactors: ['fallback'],
    };
  }

  // Private helper methods for the new functionality

  /**
   * Calculates projectcomplexity
   * 
   * @param context - Parameter description
   * 
   * @returns number - Return value description
   */
  private calculateProjectComplexity(context: ModelSelectionContext): number {
    let complexity = 0.5; // Base complexity

    // Adjust based on project type
    if (
      context.projectContext?.projectType?.includes('typescript') ||
      context.projectContext?.projectType?.includes('javascript')
    ) {
      complexity += 0.2;
    }

    // Adjust based on frameworks
    if (
      context.projectContext?.frameworks &&
      context.projectContext.frameworks.length > 0
    ) {
      complexity += 0.1 * context.projectContext.frameworks.length;
    }

    return Math.min(1.0, complexity);
  }

  private calculateSuitabilityScore(
    model: AIModel,
    taskAnalysis: TaskRequirements
  ): number {
    let score = 0.5; // Base score

    // Adjust based on model capabilities for task complexity
    if (
      taskAnalysis.complexity === 'expert' &&
      (model === 'gpt-4' || model.includes('claude-opus'))
    ) {
      score += 0.3;
    } else if (
      taskAnalysis.complexity === 'high' &&
      (model === 'gpt-4' || model.includes('sonnet'))
    ) {
      score += 0.2;
    }

    // Adjust based on domain match
    if (
      taskAnalysis.domain === 'code' &&
      (model === 'gpt-4' || model.includes('claude'))
    ) {
      score += 0.2;
    }

    return Math.min(1.0, score);
  }

  /**
   * Gets modelpros
   * 
   * @param model - Parameter description
   * 
   * @returns string[] - Return value description
   */
  private getModelPros(model: AIModel): string[] {
    const prosMap: Record<string, string[]> = {
      'gpt-4': ['High accuracy', 'Complex reasoning', 'Code generation'],
      'gpt-3.5-turbo': [
        'Fast response',
        'Cost effective',
        'Good general purpose',
      ],
      'claude-opus-4-20250514': [
        'Excellent reasoning',
        'High quality output',
        'Safety focused',
      ],
      'claude-sonnet-4-20250514': [
        'Balanced performance',
        'Good speed',
        'Quality output',
      ],
      'claude-3-5-sonnet-20241022': [
        'Fast processing',
        'Code analysis',
        'Recent knowledge',
      ],
    };

    return prosMap[model] || ['General purpose', 'Reliable'];
  }

  /**
   * Gets modelcons
   * 
   * @param model - Parameter description
   * 
   * @returns string[] - Return value description
   */
  private getModelCons(model: AIModel): string[] {
    const consMap: Record<string, string[]> = {
      'gpt-4': ['Higher cost', 'Slower response'],
      'gpt-3.5-turbo': ['Lower accuracy for complex tasks'],
      'claude-opus-4-20250514': ['Higher cost', 'Potential slower response'],
      'claude-sonnet-4-20250514': ['Mid-tier cost'],
      'claude-3-5-sonnet-20241022': ['Limited context for very long documents'],
    };

    return consMap[model] || ['Standard limitations'];
  }

  /**
   * Handles estimateCost operation
   * 
   * @param model - Parameter description
   * 
   * @returns number - Return value description
   */
  private estimateCost(model: AIModel): number {
    const costMap: Record<string, number> = {
      'gpt-4': 0.03,
      'gpt-3.5-turbo': 0.002,
      'claude-opus-4-20250514': 0.015,
      'claude-sonnet-4-20250514': 0.003,
      'claude-3-5-sonnet-20241022': 0.003,
    };

    return costMap[model] || 0.005;
  }

  /**
   * Handles estimateResponseTime operation
   * 
   * @param model - Parameter description
   * 
   * @returns number - Return value description
   */
  private estimateResponseTime(model: AIModel): number {
    const timeMap: Record<string, number> = {
      'gpt-4': 3000,
      'gpt-3.5-turbo': 1000,
      'claude-opus-4-20250514': 2500,
      'claude-sonnet-4-20250514': 1500,
      'claude-3-5-sonnet-20241022': 1200,
    };

    return timeMap[model] || 2000;
  }

  /**
   * Gets modelprovider
   * 
   * @param model - Parameter description
   * 
   * @returns string - Return value description
   */
  private getModelProvider(model: AIModel): string {
    if (model.startsWith('gpt')) return 'openai';
    if (model.startsWith('claude')) return 'anthropic';
    return 'unknown';
  }

  /**
   * Calculates costeffectiveness
   * 
   * @param model - Parameter description
   * 
   * @returns number - Return value description
   */
  private calculateCostEffectiveness(model: AIModel): number {
    const cost = this.estimateCost(model);
    const quality = this.getExpectedQuality(model);

    // Higher score means better cost effectiveness (quality/cost ratio)
    return quality / Math.max(cost * 100, 0.1); // Scale cost to reasonable range
  }

  /**
   * Gets expectedquality
   * 
   * @param model - Parameter description
   * 
   * @returns number - Return value description
   */
  private getExpectedQuality(model: AIModel): number {
    const qualityMap: Record<string, number> = {
      'gpt-4': 0.95,
      'gpt-3.5-turbo': 0.85,
      'claude-opus-4-20250514': 0.97,
      'claude-sonnet-4-20250514': 0.9,
      'claude-3-5-sonnet-20241022': 0.88,
      'claude-3-5-haiku-20241022': 0.8,
    };

    return qualityMap[model] || 0.8;
  }

  /**
   * Gets expectedspeed
   * 
   * @param model - Parameter description
   * 
   * @returns number - Return value description
   */
  private getExpectedSpeed(model: AIModel): number {
    const responseTime = this.estimateResponseTime(model);

    // Convert response time to speed score (lower time = higher speed)
    // Scale: 500ms = 1.0, 5000ms = 0.1
    return Math.max(0.1, Math.min(1.0, 500 / responseTime));
  }

  /**
   * Gets reliability
   * 
   * @param model - Parameter description
   * 
   * @returns number - Return value description
   */
  private getReliability(model: AIModel): number {
    const reliabilityMap: Record<string, number> = {
      'gpt-4': 0.95,
      'gpt-3.5-turbo': 0.92,
      'claude-opus-4-20250514': 0.96,
      'claude-sonnet-4-20250514': 0.93,
      'claude-3-5-sonnet-20241022': 0.9,
      'claude-3-5-haiku-20241022': 0.88,
    };

    return reliabilityMap[model] || 0.85;
  }
}
