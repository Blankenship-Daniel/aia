/**
 * AI Error Diagnostic Service Interface
 * SOLID SRP: Responsible only for AI-powered error analysis and diagnostics
 * SOLID OCP: Can be extended with new diagnostic strategies
 * SOLID LSP: Substitutable with other IErrorDiagnosticService implementations
 * SOLID ISP: Implements only error diagnostic specific interface methods
 * SOLID DIP: Uses abstractions for AI service and context dependencies
 */

import { ExecutionStep } from '../types/index';
import { AIModel } from '../types/index';

export interface ExecutionError {
  message: string;
  code?: string | number;
  stack?: string;
  timestamp: Date;
  step: ExecutionStep;
  context: ExecutionContext;
}

export interface ExecutionContext {
  command?: string;
  workingDirectory: string;
  environment: Record<string, string>;
  systemInfo: SystemInfo;
  projectContext?: ProjectContext;
  userContext?: UserContext;
  previousErrors?: ExecutionError[];
}

export interface SystemInfo {
  platform: string;
  architecture: string;
  nodeVersion?: string;
  shell?: string;
  availableMemory: number;
  diskSpace: number;
}

export interface ProjectContext {
  type: 'node' | 'python' | 'typescript' | 'docker' | 'git' | 'unknown';
  dependencies: string[];
  scripts: Record<string, string>;
  configFiles: string[];
  version?: string;
}

export interface UserContext {
  experienceLevel: 'beginner' | 'intermediate' | 'advanced';
  preferences: Record<string, unknown>;
  recentActions: string[];
  currentGoal?: string;
}

export interface ErrorDiagnosis {
  id: string;
  category: ErrorCategory;
  severity: ErrorSeverity;
  rootCause: string;
  contextualFactors: ContextualFactor[];
  similarCases: ErrorCase[];
  confidence: number;
  analysis: DiagnosisAnalysis;
  metadata: {
    processingTime: number;
    aiModel: AIModel;
    analysisTimestamp: Date;
  };
}

export interface ErrorCategory {
  primary:
    | 'system'
    | 'permission'
    | 'network'
    | 'configuration'
    | 'dependency'
    | 'syntax'
    | 'runtime'
    | 'logic'
    | 'resource'
    | 'security';
  secondary?: string;
  tags: string[];
}

export interface ErrorSeverity {
  level: 'low' | 'medium' | 'high' | 'critical';
  impact: 'minimal' | 'moderate' | 'significant' | 'blocking';
  urgency: 'low' | 'medium' | 'high' | 'immediate';
  scope: 'local' | 'project' | 'system' | 'environment';
}

export interface ContextualFactor {
  type:
    | 'environmental'
    | 'temporal'
    | 'configuration'
    | 'dependency'
    | 'user_action'
    | 'system_state';
  description: string;
  relevance: number;
  impact: 'positive' | 'negative' | 'neutral';
}

export interface ErrorCase {
  id: string;
  error: string;
  context: string;
  resolution: Resolution;
  similarity: number;
  outcome: 'successful' | 'partial' | 'failed';
  timestamp: Date;
}

export interface Resolution {
  id: string;
  strategy: ResolutionStrategy;
  steps: ResolutionStep[];
  estimatedTime: number;
  successProbability: number;
  requiredResources: string[];
  prerequisites: string[];
  risks: ResolutionRisk[];
}

export interface ResolutionStrategy {
  type:
    | 'immediate'
    | 'diagnostic'
    | 'workaround'
    | 'fundamental'
    | 'preventive';
  approach: 'automatic' | 'guided' | 'manual' | 'interactive';
  priority: number;
  description: string;
}

export interface ResolutionStep {
  id: string;
  type: 'command' | 'check' | 'configuration' | 'installation' | 'verification';
  description: string;
  command?: string;
  expectedOutput?: string;
  timeout?: number;
  retryable: boolean;
  dependencies: string[];
}

export interface ResolutionRisk {
  type:
    | 'data_loss'
    | 'system_change'
    | 'security'
    | 'performance'
    | 'compatibility';
  description: string;
  probability: number;
  severity: 'low' | 'medium' | 'high';
  mitigation: string;
}

export interface DiagnosisAnalysis {
  errorClassification: ErrorClassification;
  causality: CausalityAnalysis;
  impact: ImpactAssessment;
  recommendations: DiagnosticRecommendation[];
  learning: LearningInsights;
}

export interface ErrorClassification {
  primaryType: string;
  subTypes: string[];
  patterns: string[];
  frequency: 'rare' | 'occasional' | 'common' | 'frequent';
  complexity: 'simple' | 'moderate' | 'complex' | 'critical';
}

export interface CausalityAnalysis {
  directCause: string;
  contributingFactors: string[];
  chainOfEvents: EventChain[];
  preventability:
    | 'easily_preventable'
    | 'preventable'
    | 'difficult_to_prevent'
    | 'unavoidable';
}

export interface EventChain {
  sequence: number;
  event: string;
  timestamp?: Date;
  impact: number;
  relationship: 'trigger' | 'amplifier' | 'catalyst' | 'consequence';
}

export interface ImpactAssessment {
  immediate: string[];
  shortTerm: string[];
  longTerm: string[];
  systemWide: boolean;
  userExperience: 'minimal' | 'moderate' | 'significant' | 'severe';
  businessImpact: 'none' | 'low' | 'medium' | 'high' | 'critical';
}

export interface DiagnosticRecommendation {
  type:
    | 'immediate_action'
    | 'investigation'
    | 'monitoring'
    | 'prevention'
    | 'improvement';
  priority: number;
  description: string;
  rationale: string;
  estimatedEffort: 'minimal' | 'low' | 'medium' | 'high' | 'extensive';
  expectedOutcome: string;
}

export interface LearningInsights {
  patternRecognition: string[];
  improvementOpportunities: string[];
  knowledgeGaps: string[];
  systemWeaknesses: string[];
  userEducation: string[];
}

export interface RecoveryStrategy {
  id: string;
  name: string;
  type: 'automatic' | 'guided' | 'manual';
  priority: number;
  description: string;
  steps: RecoveryStep[];
  successRate: number;
  estimatedTime: number;
  requiredSkillLevel: 'beginner' | 'intermediate' | 'advanced';
  fallbackStrategy?: string;
}

export interface RecoveryStep {
  id: string;
  order: number;
  type: 'diagnostic' | 'corrective' | 'verification' | 'monitoring';
  title: string;
  description: string;
  instructions: string[];
  expectedResult: string;
  troubleshooting: TroubleshootingGuide;
  automation?: AutomationHints;
}

export interface TroubleshootingGuide {
  commonIssues: string[];
  solutions: Record<string, string[]>;
  escalationPath: string[];
  expertHelp?: string;
}

export interface AutomationHints {
  canAutomate: boolean;
  automationCommand?: string;
  requiredPermissions: string[];
  safetyChecks: string[];
}

export interface ErrorLearning {
  errorId: string;
  originalDiagnosis: ErrorDiagnosis;
  actualResolution: Resolution;
  outcome: LearningOutcome;
  feedback: UserFeedback;
  improvements: string[];
}

export interface LearningOutcome {
  successful: boolean;
  timeToResolve: number;
  stepsRequired: number;
  userSatisfaction: number;
  effectivenessRating: number;
  additionalIssues: string[];
}

export interface UserFeedback {
  helpfulness: number;
  accuracy: number;
  completeness: number;
  clarity: number;
  comments?: string;
  suggestions?: string[];
}

/**
 * AI Error Diagnostic Service Interface
 *
 * Provides comprehensive AI-powered error analysis, diagnosis, and recovery
 * strategies to replace pattern-based error categorization
 */
export interface IErrorDiagnosticService {
  /**
   * Analyze an execution error using AI-powered diagnosis
   *
   * @param error - The execution error to analyze
   * @param context - Execution context including environment and project info
   * @returns Promise resolving to comprehensive error diagnosis
   */
  analyzeError(
    error: ExecutionError,
    context: ExecutionContext
  ): Promise<ErrorDiagnosis>;

  /**
   * Generate recovery strategies based on error diagnosis
   *
   * @param diagnosis - The error diagnosis from analyzeError
   * @returns Promise resolving to prioritized recovery strategies
   */
  generateRecoveryStrategies(
    diagnosis: ErrorDiagnosis
  ): Promise<RecoveryStrategy[]>;

  /**
   * Learn from error resolution outcomes to improve future diagnostics
   *
   * @param error - The original execution error
   * @param resolution - The resolution that was applied
   * @param outcome - The outcome of the resolution attempt
   */
  learnFromErrorResolution(
    error: ExecutionError,
    resolution: Resolution,
    outcome: LearningOutcome
  ): Promise<void>;

  /**
   * Get historical error patterns and insights for continuous improvement
   *
   * @param timeframe - Time period to analyze (in days)
   * @param context - Optional context filter
   * @returns Promise resolving to error patterns and insights
   */
  analyzeErrorPatterns(
    timeframe: number,
    context?: Partial<ExecutionContext>
  ): Promise<{
    patterns: ErrorPattern[];
    insights: LearningInsights;
    recommendations: string[];
  }>;

  /**
   * Provide real-time error prevention suggestions based on current context
   *
   * @param context - Current execution context
   * @returns Promise resolving to prevention suggestions
   */
  getPreventionSuggestions(
    context: ExecutionContext
  ): Promise<PreventionSuggestion[]>;
}

export interface ErrorPattern {
  pattern: string;
  frequency: number;
  contexts: string[];
  commonResolutions: string[];
  preventionMethods: string[];
  trend: 'increasing' | 'stable' | 'decreasing';
}

export interface PreventionSuggestion {
  type:
    | 'environment'
    | 'configuration'
    | 'dependency'
    | 'practice'
    | 'monitoring';
  priority: number;
  description: string;
  implementation: string[];
  impact: 'low' | 'medium' | 'high';
  effort: 'minimal' | 'low' | 'medium' | 'high';
}
