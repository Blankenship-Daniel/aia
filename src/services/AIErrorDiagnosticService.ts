/**
 * AI Error Diagnostic Service
 *
 * Phase 2.1.3: AI-powered error analysis and diagnostic service
 * Replaces pattern-based error categorization with comprehensive AI analysis
 *
 * Features:
 * - AI-powered error analysis replacing regex patterns
 * - Contextual diagnosis considering environment and user state
 * - Intelligent recovery strategy generation
 * - Learning system for continuous improvement
 * - Real-time error prevention suggestions
 */

import chalk from 'chalk';
import {
  IErrorDiagnosticService,
  ExecutionError,
  ExecutionContext,
  ErrorDiagnosis,
  RecoveryStrategy,
  Resolution,
  LearningOutcome,
  ErrorPattern,
  PreventionSuggestion,
  LearningInsights,
  ErrorCategory,
  ErrorSeverity,
  ContextualFactor,
  ErrorCase,
  DiagnosisAnalysis,
  RecoveryStep,
  TroubleshootingGuide,
} from '../interfaces/IErrorDiagnosticService.js';
import { AIModel } from '../types/index.js';

export class AIErrorDiagnosticService implements IErrorDiagnosticService {
  private aiService: any;
  private errorMemory: Map<string, ErrorCase> = new Map();
  private diagnosticHistory: ErrorDiagnosis[] = [];
  private learningInsights: LearningInsights[] = [];

  // AI prompts for error analysis
  private readonly ERROR_ANALYSIS_PROMPT = `
Analyze the following error for comprehensive diagnosis:

Error: "{error}"
Command: "{command}"
Context: {context}
System Info: {systemInfo}
Project Context: {projectContext}

Provide a comprehensive AI-powered error analysis including:

1. **Error Classification**: Categorize the error type, severity, and scope
2. **Root Cause Analysis**: Identify the primary cause and contributing factors
3. **Contextual Analysis**: Consider environmental, temporal, and user factors
4. **Impact Assessment**: Evaluate immediate and long-term implications
5. **Similar Cases**: Reference similar errors and their resolutions
6. **Recovery Strategies**: Suggest prioritized approaches to resolution

Respond with JSON:
{
  "category": {
    "primary": "system|permission|network|configuration|dependency|syntax|runtime|logic|resource|security",
    "secondary": "specific subcategory",
    "tags": ["relevant", "classification", "tags"]
  },
  "severity": {
    "level": "low|medium|high|critical",
    "impact": "minimal|moderate|significant|blocking",
    "urgency": "low|medium|high|immediate",
    "scope": "local|project|system|environment"
  },
  "rootCause": "Primary cause of the error",
  "contextualFactors": [
    {
      "type": "environmental|temporal|configuration|dependency|user_action|system_state",
      "description": "Factor description",
      "relevance": 0.8,
      "impact": "positive|negative|neutral"
    }
  ],
  "analysis": {
    "errorClassification": {
      "primaryType": "Main error type",
      "subTypes": ["sub", "types"],
      "patterns": ["error", "patterns"],
      "frequency": "rare|occasional|common|frequent",
      "complexity": "simple|moderate|complex|critical"
    },
    "causality": {
      "directCause": "Direct cause",
      "contributingFactors": ["factor1", "factor2"],
      "chainOfEvents": [
        {
          "sequence": 1,
          "event": "Event description",
          "impact": 0.7,
          "relationship": "trigger|amplifier|catalyst|consequence"
        }
      ],
      "preventability": "easily_preventable|preventable|difficult_to_prevent|unavoidable"
    },
    "impact": {
      "immediate": ["immediate impact"],
      "shortTerm": ["short term effects"],
      "longTerm": ["long term consequences"],
      "systemWide": false,
      "userExperience": "minimal|moderate|significant|severe",
      "businessImpact": "none|low|medium|high|critical"
    },
    "recommendations": [
      {
        "type": "immediate_action|investigation|monitoring|prevention|improvement",
        "priority": 1,
        "description": "Recommendation description",
        "rationale": "Why this recommendation",
        "estimatedEffort": "minimal|low|medium|high|extensive",
        "expectedOutcome": "Expected result"
      }
    ]
  },
  "similarCases": [
    {
      "error": "Similar error",
      "context": "Similar context",
      "similarity": 0.8,
      "outcome": "successful|partial|failed"
    }
  ],
  "confidence": 0.85
}
`;

  private readonly RECOVERY_STRATEGY_PROMPT = `
Based on the error diagnosis, generate comprehensive recovery strategies:

Error Diagnosis: {diagnosis}
User Experience Level: {userLevel}
Available Resources: {resources}

Generate prioritized recovery strategies with detailed steps:

Respond with JSON:
{
  "strategies": [
    {
      "name": "Strategy name",
      "type": "automatic|guided|manual",
      "priority": 1,
      "description": "Strategy description",
      "successRate": 0.85,
      "estimatedTime": 300,
      "requiredSkillLevel": "beginner|intermediate|advanced",
      "steps": [
        {
          "order": 1,
          "type": "diagnostic|corrective|verification|monitoring",
          "title": "Step title",
          "description": "Step description",
          "instructions": ["instruction 1", "instruction 2"],
          "expectedResult": "What should happen",
          "troubleshooting": {
            "commonIssues": ["issue1", "issue2"],
            "solutions": {
              "issue1": ["solution1", "solution2"]
            },
            "escalationPath": ["step1", "step2"]
          },
          "automation": {
            "canAutomate": true,
            "automationCommand": "command to run",
            "requiredPermissions": ["permission1"],
            "safetyChecks": ["check1", "check2"]
          }
        }
      ],
      "fallbackStrategy": "Alternative approach if this fails"
    }
  ]
}
`;

  private readonly ERROR_PATTERN_ANALYSIS_PROMPT = `
Analyze error patterns and provide insights for system improvement:

Error History: {errorHistory}
Timeframe: {timeframe} days
Context Filter: {contextFilter}

Analyze patterns, trends, and provide actionable insights:

Respond with JSON:
{
  "patterns": [
    {
      "pattern": "Pattern description",
      "frequency": 15,
      "contexts": ["context1", "context2"],
      "commonResolutions": ["resolution1", "resolution2"],
      "preventionMethods": ["prevention1", "prevention2"],
      "trend": "increasing|stable|decreasing"
    }
  ],
  "insights": {
    "patternRecognition": ["insight1", "insight2"],
    "improvementOpportunities": ["opportunity1", "opportunity2"],
    "knowledgeGaps": ["gap1", "gap2"],
    "systemWeaknesses": ["weakness1", "weakness2"],
    "userEducation": ["education1", "education2"]
  },
  "recommendations": ["recommendation1", "recommendation2"]
}
`;

  private readonly PREVENTION_SUGGESTION_PROMPT = `
Provide real-time error prevention suggestions based on current context:

Current Context: {context}
Recent Errors: {recentErrors}
System State: {systemState}

Generate proactive prevention suggestions:

Respond with JSON:
{
  "suggestions": [
    {
      "type": "environment|configuration|dependency|practice|monitoring",
      "priority": 1,
      "description": "Prevention suggestion",
      "implementation": ["step1", "step2"],
      "impact": "low|medium|high",
      "effort": "minimal|low|medium|high"
    }
  ]
}
`;

  constructor(aiService: any) {
    this.aiService = aiService;
  }

  async analyzeError(
    error: ExecutionError,
    context: ExecutionContext
  ): Promise<ErrorDiagnosis> {
    try {
      console.log(chalk.blue('🔍 AI Error Diagnostic: Analyzing error...'));

      const startTime = Date.now();

      // Build comprehensive prompt with error and context
      const prompt = this.buildErrorAnalysisPrompt(error, context);

      // Create ContextInfo for AI service
      const contextInfo = {
        currentDirectory: context.workingDirectory,
        projectContext: context.projectContext,
        systemInfo: context.systemInfo,
        errorContext: true,
      };

      // Get AI analysis
      const aiResponse = await this.aiService.queryAI(prompt, contextInfo);

      // Parse AI response
      const analysis = this.parseErrorAnalysisResponse(aiResponse.content);

      // Generate unique ID for this diagnosis
      const diagnosisId = this.generateDiagnosisId(error, context);

      // Build comprehensive diagnosis
      const diagnosis: ErrorDiagnosis = {
        id: diagnosisId,
        category: analysis.category,
        severity: analysis.severity,
        rootCause: analysis.rootCause,
        contextualFactors: analysis.contextualFactors,
        similarCases: await this.findSimilarCases(error, analysis),
        confidence: analysis.confidence,
        analysis: analysis.analysis,
        metadata: {
          processingTime: Date.now() - startTime,
          aiModel: aiResponse.model,
          analysisTimestamp: new Date(),
        },
      };

      // Store in diagnostic history
      this.diagnosticHistory.push(diagnosis);

      console.log(
        chalk.green(
          `✅ Error diagnosed (confidence: ${diagnosis.confidence.toFixed(2)})`
        )
      );

      return diagnosis;
    } catch (error) {
      console.error(chalk.red('❌ Error diagnosis failed:'), error);
      return this.getFallbackDiagnosis(error as ExecutionError, context);
    }
  }

  async generateRecoveryStrategies(
    diagnosis: ErrorDiagnosis
  ): Promise<RecoveryStrategy[]> {
    try {
      console.log(chalk.blue('🔧 Generating recovery strategies...'));

      const prompt = this.buildRecoveryStrategyPrompt(diagnosis);

      const contextInfo = {
        errorDiagnosis: true,
        category: diagnosis.category.primary,
        severity: diagnosis.severity.level,
      };

      const aiResponse = await this.aiService.queryAI(prompt, contextInfo);
      const strategies = this.parseRecoveryStrategiesResponse(
        aiResponse.content
      );

      console.log(
        chalk.green(`✅ Generated ${strategies.length} recovery strategies`)
      );

      return strategies;
    } catch (error) {
      console.error(
        chalk.red('❌ Recovery strategy generation failed:'),
        error
      );
      return this.getFallbackRecoveryStrategies(diagnosis);
    }
  }

  async learnFromErrorResolution(
    error: ExecutionError,
    resolution: Resolution,
    outcome: LearningOutcome
  ): Promise<void> {
    try {
      console.log(chalk.blue('📚 Learning from error resolution...'));

      // Create error case record
      const errorCase: ErrorCase = {
        id: this.generateErrorCaseId(error, resolution),
        error: error.message,
        context: JSON.stringify(error.context),
        resolution,
        similarity: 1.0, // Self-reference
        outcome: outcome.successful ? 'successful' : 'failed',
        timestamp: new Date(),
      };

      // Store in memory
      this.errorMemory.set(errorCase.id, errorCase);

      // Update learning insights
      await this.updateLearningInsights(error, resolution, outcome);

      console.log(chalk.green('✅ Learning recorded successfully'));
    } catch (error) {
      console.error(chalk.red('❌ Learning recording failed:'), error);
    }
  }

  async analyzeErrorPatterns(
    timeframe: number,
    context?: Partial<ExecutionContext>
  ): Promise<{
    patterns: ErrorPattern[];
    insights: LearningInsights;
    recommendations: string[];
  }> {
    try {
      console.log(chalk.blue('📊 Analyzing error patterns...'));

      const recentDiagnoses = this.getRecentDiagnoses(timeframe);
      const prompt = this.buildPatternAnalysisPrompt(
        recentDiagnoses,
        timeframe,
        context
      );

      const contextInfo = {
        patternAnalysis: true,
        timeframe,
        errorCount: recentDiagnoses.length,
      };

      const aiResponse = await this.aiService.queryAI(prompt, contextInfo);
      const analysis = this.parsePatternAnalysisResponse(aiResponse.content);

      console.log(
        chalk.green(`✅ Analyzed ${analysis.patterns.length} error patterns`)
      );

      return analysis;
    } catch (error) {
      console.error(chalk.red('❌ Pattern analysis failed:'), error);
      return {
        patterns: [],
        insights: this.getDefaultInsights(),
        recommendations: ['Monitor error patterns for continuous improvement'],
      };
    }
  }

  async getPreventionSuggestions(
    context: ExecutionContext
  ): Promise<PreventionSuggestion[]> {
    try {
      console.log(chalk.blue('🛡️ Generating prevention suggestions...'));

      const recentErrors = this.getRecentErrors(7); // Last 7 days
      const prompt = this.buildPreventionPrompt(context, recentErrors);

      const contextInfo = {
        preventionMode: true,
        systemInfo: context.systemInfo,
        projectType: context.projectContext?.type,
      };

      const aiResponse = await this.aiService.queryAI(prompt, contextInfo);
      const suggestions = this.parsePreventionResponse(aiResponse.content);

      console.log(
        chalk.green(`✅ Generated ${suggestions.length} prevention suggestions`)
      );

      return suggestions;
    } catch (error) {
      console.error(
        chalk.red('❌ Prevention suggestion generation failed:'),
        error
      );
      return this.getFallbackPreventionSuggestions(context);
    }
  }

  // Private helper methods

  private buildErrorAnalysisPrompt(
    error: ExecutionError,
    context: ExecutionContext
  ): string {
    return this.ERROR_ANALYSIS_PROMPT.replace('{error}', error.message)
      .replace('{command}', context.command || 'unknown')
      .replace('{context}', JSON.stringify(context))
      .replace('{systemInfo}', JSON.stringify(context.systemInfo))
      .replace(
        '{projectContext}',
        JSON.stringify(context.projectContext || {})
      );
  }

  private buildRecoveryStrategyPrompt(diagnosis: ErrorDiagnosis): string {
    return this.RECOVERY_STRATEGY_PROMPT.replace(
      '{diagnosis}',
      JSON.stringify(diagnosis)
    )
      .replace('{userLevel}', 'intermediate') // Default, could be from context
      .replace(
        '{resources}',
        JSON.stringify(['terminal', 'filesystem', 'network'])
      );
  }

  private buildPatternAnalysisPrompt(
    diagnoses: ErrorDiagnosis[],
    timeframe: number,
    context?: Partial<ExecutionContext>
  ): string {
    return this.ERROR_PATTERN_ANALYSIS_PROMPT.replace(
      '{errorHistory}',
      JSON.stringify(diagnoses)
    )
      .replace('{timeframe}', timeframe.toString())
      .replace('{contextFilter}', JSON.stringify(context || {}));
  }

  private buildPreventionPrompt(
    context: ExecutionContext,
    recentErrors: ExecutionError[]
  ): string {
    return this.PREVENTION_SUGGESTION_PROMPT.replace(
      '{context}',
      JSON.stringify(context)
    )
      .replace('{recentErrors}', JSON.stringify(recentErrors))
      .replace('{systemState}', JSON.stringify(context.systemInfo));
  }

  private parseErrorAnalysisResponse(content: string): any {
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in AI response');
      }
      const parsed = JSON.parse(jsonMatch[0]);

      // Handle different response structures
      if (parsed.analysis) {
        // If the response has an 'analysis' property, extract the actual analysis
        const analysis = parsed.analysis;
        return {
          category: this.mapCategory(analysis.category),
          severity: this.mapSeverity(analysis.severity),
          rootCause: analysis.rootCause || 'Unknown error',
          contextualFactors: [],
          confidence: 0.8,
          analysis: analysis.analysis || this.getDefaultAnalysis(),
        };
      }

      // Direct analysis structure
      return {
        category: this.mapCategory(parsed.category),
        severity: this.mapSeverity(parsed.severity),
        rootCause: parsed.rootCause || 'Unknown error',
        contextualFactors: parsed.contextualFactors || [],
        confidence: parsed.confidence || 0.8,
        analysis: parsed.analysis || this.getDefaultAnalysis(),
      };
    } catch (error) {
      console.error(chalk.red('❌ Failed to parse error analysis response'));
      return {
        category: this.mapCategory('system'),
        severity: this.mapSeverity('medium'),
        rootCause: 'Error analysis unavailable',
        contextualFactors: [],
        confidence: 0.1,
        analysis: this.getDefaultAnalysis(),
      };
    }
  }

  private mapCategory(category: string): ErrorCategory {
    const validCategories = [
      'system',
      'permission',
      'network',
      'configuration',
      'dependency',
      'syntax',
      'runtime',
      'logic',
      'resource',
      'security',
    ];
    const primaryCategory = validCategories.includes(category?.toLowerCase())
      ? category.toLowerCase()
      : 'system';

    return {
      primary: primaryCategory as any,
      tags: [category?.toLowerCase() || 'unknown'],
    };
  }

  private mapSeverity(severity: string): ErrorSeverity {
    const validLevels = ['low', 'medium', 'high', 'critical'];
    const level = validLevels.includes(severity?.toLowerCase())
      ? severity.toLowerCase()
      : 'medium';

    return {
      level: level as any,
      impact: 'moderate',
      urgency: 'medium',
      scope: 'local',
    };
  }

  private parseRecoveryStrategiesResponse(content: string): RecoveryStrategy[] {
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in AI response');
      }
      const parsed = JSON.parse(jsonMatch[0]);
      return parsed.strategies || [];
    } catch (error) {
      console.error(
        chalk.red('❌ Failed to parse recovery strategies response')
      );
      return [];
    }
  }

  private parsePatternAnalysisResponse(content: string): {
    patterns: ErrorPattern[];
    insights: LearningInsights;
    recommendations: string[];
  } {
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in AI response');
      }
      return JSON.parse(jsonMatch[0]);
    } catch (error) {
      console.error(chalk.red('❌ Failed to parse pattern analysis response'));
      return {
        patterns: [],
        insights: this.getDefaultInsights(),
        recommendations: [],
      };
    }
  }

  private parsePreventionResponse(content: string): PreventionSuggestion[] {
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in AI response');
      }
      const parsed = JSON.parse(jsonMatch[0]);
      return parsed.suggestions || [];
    } catch (error) {
      console.error(chalk.red('❌ Failed to parse prevention response'));
      return [];
    }
  }

  private async findSimilarCases(
    error: ExecutionError,
    analysis: any
  ): Promise<ErrorCase[]> {
    const similarCases: ErrorCase[] = [];

    for (const [id, errorCase] of this.errorMemory) {
      const similarity = this.calculateSimilarity(error, errorCase);
      if (similarity > 0.7) {
        similarCases.push({
          ...errorCase,
          similarity,
        });
      }
    }

    return similarCases.sort((a, b) => b.similarity - a.similarity).slice(0, 5);
  }

  private calculateSimilarity(
    error: ExecutionError,
    errorCase: ErrorCase
  ): number {
    // Simple similarity calculation based on error message and context
    const errorWords = error.message.toLowerCase().split(/\s+/);
    const caseWords = errorCase.error.toLowerCase().split(/\s+/);

    const commonWords = errorWords.filter((word) => caseWords.includes(word));
    return commonWords.length / Math.max(errorWords.length, caseWords.length);
  }

  private generateDiagnosisId(
    error: ExecutionError,
    context: ExecutionContext
  ): string {
    const timestamp = error.timestamp ? error.timestamp.getTime() : Date.now();
    const errorHash = this.simpleHash(error.message + context.command);
    return `diag_${timestamp}_${errorHash}`;
  }

  private generateErrorCaseId(
    error: ExecutionError,
    resolution: Resolution
  ): string {
    const timestamp = error.timestamp ? error.timestamp.getTime() : Date.now();
    const errorHash = this.simpleHash(error.message + resolution.id);
    return `case_${timestamp}_${errorHash}`;
  }

  private simpleHash(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(36);
  }

  private getRecentDiagnoses(timeframe: number): ErrorDiagnosis[] {
    const cutoffDate = new Date(Date.now() - timeframe * 24 * 60 * 60 * 1000);
    return this.diagnosticHistory.filter(
      (diagnosis) => diagnosis.metadata.analysisTimestamp > cutoffDate
    );
  }

  private getRecentErrors(days: number): ExecutionError[] {
    const cutoffDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    return Array.from(this.errorMemory.values())
      .filter((errorCase) => errorCase.timestamp > cutoffDate)
      .map(
        (errorCase) =>
          ({
            message: errorCase.error,
            timestamp: errorCase.timestamp,
          } as ExecutionError)
      );
  }

  private async updateLearningInsights(
    error: ExecutionError,
    resolution: Resolution,
    outcome: LearningOutcome
  ): Promise<void> {
    // Update learning insights based on resolution outcomes
    // This would involve analyzing success patterns, failure modes, etc.
    // For now, we'll just log the learning
    console.log(chalk.blue('📚 Updated learning insights from resolution'));
  }

  private getFallbackDiagnosis(
    error: ExecutionError,
    context: ExecutionContext
  ): ErrorDiagnosis {
    return {
      id: this.generateDiagnosisId(error, context),
      category: {
        primary: 'system',
        tags: ['fallback', 'unknown'],
      },
      severity: {
        level: 'medium',
        impact: 'moderate',
        urgency: 'medium',
        scope: 'local',
      },
      rootCause: 'Error analysis unavailable',
      contextualFactors: [],
      similarCases: [],
      confidence: 0.1,
      analysis: this.getDefaultAnalysis(),
      metadata: {
        processingTime: 0,
        aiModel: 'fallback' as AIModel,
        analysisTimestamp: new Date(),
      },
    };
  }

  private getFallbackRecoveryStrategies(
    diagnosis: ErrorDiagnosis
  ): RecoveryStrategy[] {
    return [
      {
        id: 'fallback_manual',
        name: 'Manual Investigation',
        type: 'manual',
        priority: 1,
        description: 'Manually investigate and resolve the error',
        steps: [
          {
            id: 'step_1',
            order: 1,
            type: 'diagnostic',
            title: 'Review Error Details',
            description: 'Carefully review the error message and context',
            instructions: [
              'Read the full error message',
              'Check system logs',
              'Verify environment',
            ],
            expectedResult: 'Understanding of the error context',
            troubleshooting: {
              commonIssues: ['Unclear error message', 'Missing context'],
              solutions: {
                'Unclear error message': [
                  'Search for similar errors online',
                  'Check documentation',
                ],
              },
              escalationPath: [
                'Consult team members',
                'Search online resources',
              ],
            },
          },
        ],
        successRate: 0.6,
        estimatedTime: 1800, // 30 minutes
        requiredSkillLevel: 'intermediate',
      },
    ];
  }

  private getFallbackPreventionSuggestions(
    context: ExecutionContext
  ): PreventionSuggestion[] {
    return [
      {
        type: 'monitoring',
        priority: 1,
        description: 'Implement basic error monitoring',
        implementation: ['Set up error logging', 'Monitor system resources'],
        impact: 'medium',
        effort: 'low',
      },
    ];
  }

  private getDefaultAnalysis(): DiagnosisAnalysis {
    return {
      errorClassification: {
        primaryType: 'unknown',
        subTypes: [],
        patterns: [],
        frequency: 'occasional',
        complexity: 'moderate',
      },
      causality: {
        directCause: 'Unknown cause',
        contributingFactors: [],
        chainOfEvents: [],
        preventability: 'difficult_to_prevent',
      },
      impact: {
        immediate: [],
        shortTerm: [],
        longTerm: [],
        systemWide: false,
        userExperience: 'moderate',
        businessImpact: 'low',
      },
      recommendations: [],
      learning: this.getDefaultInsights(),
    };
  }

  private getDefaultInsights(): LearningInsights {
    return {
      patternRecognition: [],
      improvementOpportunities: [],
      knowledgeGaps: [],
      systemWeaknesses: [],
      userEducation: [],
    };
  }
}
