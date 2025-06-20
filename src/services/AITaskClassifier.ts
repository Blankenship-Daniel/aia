/**
 * AI-Powered Task Classifier
 * Uses AI models to classify development tasks with programmatic fallbacks
 */

import {
  TaskType,
  TaskComplexity,
  TaskAnalysis,
  TaskCapability,
  RiskLevel,
  ValidationStrategy,
} from './TaskComplexityAnalyzer';
import { IAIService } from '../interfaces/IAIService';
import { IContextService } from '../interfaces/IContextService';

interface ClassificationPromptResult {
  taskType: TaskType;
  complexity: TaskComplexity;
  riskLevel: RiskLevel;
  confidence: number;
  reasoning: string;
  requiredCapabilities: TaskCapability[];
}

export class AITaskClassifier {
  private classificationCache = new Map<string, ClassificationPromptResult>();
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes
  private readonly cacheTimestamps = new Map<string, number>();

  constructor(
    private aiService: IAIService,
    private contextService: IContextService
  ) {}

  /**
   * Classify a task using AI - requires successful AI classification
   */
  async classifyTask(taskDescription: string): Promise<TaskAnalysis> {
    const normalizedTask = taskDescription.toLowerCase().trim();

    // Check cache first
    const cachedResult = this.getCachedClassification(normalizedTask);
    if (cachedResult) {
      return this.buildTaskAnalysis(cachedResult, taskDescription);
    }

    // AI-based classification (required)
    const aiResult = await this.classifyWithAI(taskDescription);

    if (!aiResult) {
      throw new Error('AI classification failed to return a result');
    }

    if (aiResult.confidence < 0.7) {
      throw new Error(
        `AI classification confidence too low (${aiResult.confidence.toFixed(
          2
        )}). ` +
          'AIA CLI requires high-confidence AI reasoning for reliable task execution.'
      );
    }

    this.cacheClassification(normalizedTask, aiResult);
    return this.buildTaskAnalysis(aiResult, taskDescription);
  }

  /**
   * AI-based classification using structured prompts
   */
  private async classifyWithAI(
    taskDescription: string
  ): Promise<ClassificationPromptResult | null> {
    const context = await this.contextService.gatherContext();

    const prompt = this.buildClassificationPrompt(taskDescription, context);

    try {
      const response = await this.aiService.queryAI(prompt, context);

      if (!response?.content) {
        return null;
      }

      return this.parseAIResponse(response.content);
    } catch (error) {
      console.error('AI classification failed:', error);
      return null;
    }
  }

  /**
   * Build structured prompt for task classification
   */
  private buildClassificationPrompt(
    taskDescription: string,
    context: any
  ): string {
    return `You are an expert development task classifier. Analyze the following task and provide a structured classification.

TASK TO CLASSIFY: "${taskDescription}"

PROJECT CONTEXT:
- Language: ${context.language || 'Unknown'}
- Project Type: ${context.projectType || 'Unknown'}
- Working Directory: ${context.workingDirectory || 'Unknown'}

CLASSIFICATION REQUIREMENTS:
1. Determine the primary task type from these options:
   - ANALYSIS: Code review, examination, reporting, markdown generation, summarization
   - DOCUMENTATION: Adding JSDoc, inline comments, API docs (not markdown summaries)
   - CODE_MODIFICATION: Adding/changing code functionality
   - REFACTORING: Improving code structure without changing functionality
   - TEST_GENERATION: Creating unit tests, test suites
   - BUG_FIXING: Fixing errors, debugging issues
   - FILE_OPERATION: Creating, moving, deleting files
   - CONFIGURATION: Setting up build tools, environment config
   - BUILD_DEPLOYMENT: Compilation, packaging, deployment

2. Assess complexity level:
   - SIMPLE: 1-3 steps, low risk
   - MODERATE: 4-8 steps, medium complexity
   - COMPLEX: 9-15 steps, high complexity
   - ADVANCED: 16+ steps, very complex

3. Evaluate risk level:
   - LOW: Safe operations, minimal impact
   - MEDIUM: Some risk, requires validation
   - HIGH: Significant changes, careful execution needed
   - CRITICAL: High impact, extensive testing required

4. Identify required capabilities from:
   - FILE_READING, FILE_WRITING, CODE_PARSING, CODE_GENERATION
   - CODE_MODIFICATION, AST_MANIPULATION, COMMAND_EXECUTION
   - VALIDATION, TEMPLATE_PROCESSING, PATTERN_MATCHING
   - DEPENDENCY_ANALYSIS, TEST_GENERATION, CODE_ANALYSIS

RESPOND IN THIS EXACT JSON FORMAT:
{
  "taskType": "ANALYSIS|DOCUMENTATION|CODE_MODIFICATION|REFACTORING|TEST_GENERATION|BUG_FIXING|FILE_OPERATION|CONFIGURATION|BUILD_DEPLOYMENT",
  "complexity": "SIMPLE|MODERATE|COMPLEX|ADVANCED",
  "riskLevel": "LOW|MEDIUM|HIGH|CRITICAL",
  "confidence": 0.0-1.0,
  "reasoning": "Brief explanation of why this classification was chosen",
  "requiredCapabilities": ["CAPABILITY1", "CAPABILITY2", ...]
}

IMPORTANT GUIDELINES:
- Markdown generation/summarization tasks are ANALYSIS, not DOCUMENTATION
- JSDoc/comment additions are DOCUMENTATION
- Be confident in your classification (aim for 0.8+ confidence)
- Consider the user's intent, not just keywords`;
  }

  /**
   * Parse AI response into structured result
   */
  private parseAIResponse(content: string): ClassificationPromptResult | null {
    try {
      // Extract JSON from response (handle potential markdown formatting)
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        return null;
      }

      const parsed = JSON.parse(jsonMatch[0]);

      // Validate and convert response
      return {
        taskType: this.validateTaskType(parsed.taskType),
        complexity: this.validateComplexity(parsed.complexity),
        riskLevel: this.validateRiskLevel(parsed.riskLevel),
        confidence: Math.max(0, Math.min(1, parsed.confidence || 0)),
        reasoning: parsed.reasoning || 'No reasoning provided',
        requiredCapabilities: this.validateCapabilities(
          parsed.requiredCapabilities || []
        ),
      };
    } catch (error) {
      console.error('Failed to parse AI classification response:', error);
      return null;
    }
  }

  /**
   * Build task analysis from AI result
   */
  private buildTaskAnalysis(
    aiResult: ClassificationPromptResult,
    taskDescription: string
  ): TaskAnalysis {
    return {
      type: aiResult.taskType,
      complexity: aiResult.complexity,
      requiredCapabilities: aiResult.requiredCapabilities,
      estimatedSteps: this.estimateSteps(
        aiResult.taskType,
        aiResult.complexity
      ),
      riskLevel: aiResult.riskLevel,
      validationStrategy: this.determineValidationStrategy(aiResult.taskType),
    };
  }

  // Helper methods for validation and fallback logic
  private validateTaskType(type: string): TaskType {
    return Object.values(TaskType).includes(type as TaskType)
      ? (type as TaskType)
      : TaskType.UNKNOWN;
  }

  private validateComplexity(complexity: string): TaskComplexity {
    return Object.values(TaskComplexity).includes(complexity as TaskComplexity)
      ? (complexity as TaskComplexity)
      : TaskComplexity.MODERATE;
  }

  private validateRiskLevel(risk: string): RiskLevel {
    return Object.values(RiskLevel).includes(risk as RiskLevel)
      ? (risk as RiskLevel)
      : RiskLevel.MEDIUM;
  }

  private validateCapabilities(capabilities: string[]): TaskCapability[] {
    return capabilities
      .filter((cap) =>
        Object.values(TaskCapability).includes(cap as TaskCapability)
      )
      .map((cap) => cap as TaskCapability);
  }

  // Cache management
  private getCachedClassification(
    task: string
  ): ClassificationPromptResult | null {
    const cached = this.classificationCache.get(task);
    const timestamp = this.cacheTimestamps.get(task);

    if (cached && timestamp && Date.now() - timestamp < this.CACHE_TTL) {
      return cached;
    }

    // Clean expired cache entries
    if (timestamp && Date.now() - timestamp >= this.CACHE_TTL) {
      this.classificationCache.delete(task);
      this.cacheTimestamps.delete(task);
    }

    return null;
  }

  private cacheClassification(
    task: string,
    result: ClassificationPromptResult
  ): void {
    this.classificationCache.set(task, result);
    this.cacheTimestamps.set(task, Date.now());
  }

  // Simplified implementations of existing methods
  private assessComplexity(task: string, taskType: TaskType): TaskComplexity {
    // Simplified complexity assessment
    const hasMultipleTargets = /all|every|each|multiple/i.test(task);
    const hasCrosFileOperation = /across|throughout|entire/i.test(task);

    if (hasCrosFileOperation) return TaskComplexity.ADVANCED;
    if (hasMultipleTargets) return TaskComplexity.COMPLEX;
    if (taskType === TaskType.REFACTORING || taskType === TaskType.BUG_FIXING) {
      return TaskComplexity.COMPLEX;
    }
    return TaskComplexity.MODERATE;
  }

  private identifyCapabilities(taskType: TaskType): TaskCapability[] {
    const capabilityMap: Record<TaskType, TaskCapability[]> = {
      [TaskType.ANALYSIS]: [
        TaskCapability.FILE_READING,
        TaskCapability.PATTERN_MATCHING,
        TaskCapability.CODE_PARSING,
      ],
      [TaskType.DOCUMENTATION]: [
        TaskCapability.FILE_READING,
        TaskCapability.FILE_WRITING,
        TaskCapability.CODE_PARSING,
        TaskCapability.CODE_GENERATION,
      ],
      [TaskType.CODE_MODIFICATION]: [
        TaskCapability.FILE_READING,
        TaskCapability.FILE_WRITING,
        TaskCapability.CODE_MODIFICATION,
        TaskCapability.VALIDATION,
      ],
      [TaskType.REFACTORING]: [
        TaskCapability.CODE_MODIFICATION,
        TaskCapability.AST_MANIPULATION,
        TaskCapability.VALIDATION,
      ],
      [TaskType.TEST_GENERATION]: [
        TaskCapability.CODE_ANALYSIS,
        TaskCapability.TEST_GENERATION,
        TaskCapability.CODE_GENERATION,
      ],
      [TaskType.BUG_FIXING]: [
        TaskCapability.CODE_ANALYSIS,
        TaskCapability.CODE_MODIFICATION,
        TaskCapability.VALIDATION,
      ],
      [TaskType.FILE_OPERATION]: [TaskCapability.COMMAND_EXECUTION],
      [TaskType.CONFIGURATION]: [
        TaskCapability.FILE_WRITING,
        TaskCapability.COMMAND_EXECUTION,
      ],
      [TaskType.BUILD_DEPLOYMENT]: [
        TaskCapability.COMMAND_EXECUTION,
        TaskCapability.VALIDATION,
      ],
      [TaskType.UNKNOWN]: [TaskCapability.FILE_READING],
    };

    return capabilityMap[taskType] || [TaskCapability.FILE_READING];
  }

  private assessRiskLevel(
    taskType: TaskType,
    complexity: TaskComplexity,
    capabilities: TaskCapability[]
  ): RiskLevel {
    let riskScore = 0;

    // Base risk by task type
    const taskRisk = {
      [TaskType.CODE_MODIFICATION]: 3,
      [TaskType.REFACTORING]: 3,
      [TaskType.BUG_FIXING]: 2,
      [TaskType.BUILD_DEPLOYMENT]: 2,
      [TaskType.DOCUMENTATION]: 1,
      [TaskType.ANALYSIS]: 0,
      [TaskType.FILE_OPERATION]: 1,
      [TaskType.CONFIGURATION]: 1,
      [TaskType.TEST_GENERATION]: 1,
      [TaskType.UNKNOWN]: 2,
    };

    riskScore += taskRisk[taskType] || 1;

    // Complexity risk
    const complexityRisk = {
      [TaskComplexity.SIMPLE]: 0,
      [TaskComplexity.MODERATE]: 1,
      [TaskComplexity.COMPLEX]: 2,
      [TaskComplexity.ADVANCED]: 3,
    };

    riskScore += complexityRisk[complexity];

    // Capability risk
    if (capabilities.includes(TaskCapability.AST_MANIPULATION)) riskScore += 2;
    if (capabilities.includes(TaskCapability.CODE_MODIFICATION)) riskScore += 1;

    if (riskScore <= 2) return RiskLevel.LOW;
    if (riskScore <= 4) return RiskLevel.MEDIUM;
    if (riskScore <= 6) return RiskLevel.HIGH;
    return RiskLevel.CRITICAL;
  }

  private estimateSteps(
    taskType: TaskType,
    complexity: TaskComplexity
  ): number {
    const baseSteps = {
      [TaskType.DOCUMENTATION]: 6,
      [TaskType.CODE_MODIFICATION]: 8,
      [TaskType.REFACTORING]: 10,
      [TaskType.TEST_GENERATION]: 7,
      [TaskType.BUG_FIXING]: 9,
      [TaskType.FILE_OPERATION]: 3,
      [TaskType.ANALYSIS]: 4,
      [TaskType.CONFIGURATION]: 5,
      [TaskType.BUILD_DEPLOYMENT]: 6,
      [TaskType.UNKNOWN]: 4,
    };

    const multiplier = {
      [TaskComplexity.SIMPLE]: 0.8,
      [TaskComplexity.MODERATE]: 1.0,
      [TaskComplexity.COMPLEX]: 1.5,
      [TaskComplexity.ADVANCED]: 2.0,
    };

    return Math.round(baseSteps[taskType] * multiplier[complexity]);
  }

  private determineValidationStrategy(taskType: TaskType): ValidationStrategy {
    const strategyMap = {
      [TaskType.DOCUMENTATION]: ValidationStrategy.SYNTAX_VALIDATION,
      [TaskType.CODE_MODIFICATION]: ValidationStrategy.EXECUTION_TEST,
      [TaskType.REFACTORING]: ValidationStrategy.EXECUTION_TEST,
      [TaskType.TEST_GENERATION]: ValidationStrategy.EXECUTION_TEST,
      [TaskType.BUG_FIXING]: ValidationStrategy.EXECUTION_TEST,
      [TaskType.FILE_OPERATION]: ValidationStrategy.FILE_COMPARISON,
      [TaskType.ANALYSIS]: ValidationStrategy.METRIC_BASED,
      [TaskType.CONFIGURATION]: ValidationStrategy.SYNTAX_VALIDATION,
      [TaskType.BUILD_DEPLOYMENT]: ValidationStrategy.EXECUTION_TEST,
      [TaskType.UNKNOWN]: ValidationStrategy.MANUAL_REVIEW,
    };

    return strategyMap[taskType];
  }
}
