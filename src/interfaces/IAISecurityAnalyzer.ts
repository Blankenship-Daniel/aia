/**
 * IAISecurityAnalyzer.ts - Interface for AI-powered security analysis
 *
 * Responsibilities:
 * - Defines contract for AI-based security threat analysis
 * - Specifies context-aware command validation
 * - Establishes interface for intelligent security recommendations
 *
 * Architecture:
 * - Integrates with existing SecurityValidator as enhanced validation layer
 * - Provides fallback compatibility with regex-based validation
 * - Supports adaptive learning from user feedback
 */

export interface SecurityContext {
  workingDirectory?: string;
  userRole?: 'admin' | 'developer' | 'user' | 'restricted';
  projectType?: string;
  recentHistory?: string[];
  environment?: 'development' | 'staging' | 'production';
  userPermissions?: string[];
}

export interface AISecurityAnalysis {
  threat_level: 'low' | 'medium' | 'high' | 'critical';
  confidence: number; // 0-1 scale
  reasoning: string;
  context_factors: string[];
  recommended_action: 'allow' | 'warn' | 'block' | 'modify';
  suggested_modification?: string;
  false_positive_likelihood?: number; // 0-1 scale
  security_score: number; // 0-100 scale, 100 = completely safe
}

export interface SecurityAnalysisOptions {
  use_context?: boolean;
  strict_mode?: boolean;
  include_suggestions?: boolean;
  enable_learning?: boolean;
}

export interface IAISecurityAnalyzer {
  /**
   * Analyze a command for security threats using AI
   */
  analyzeCommand(
    command: string,
    context: SecurityContext,
    options?: SecurityAnalysisOptions
  ): Promise<AISecurityAnalysis>;

  /**
   * Batch analyze multiple commands
   */
  analyzeCommands(
    commands: string[],
    context: SecurityContext,
    options?: SecurityAnalysisOptions
  ): Promise<AISecurityAnalysis[]>;

  /**
   * Learn from user feedback to improve analysis
   */
  provideFeedback(
    command: string,
    analysis: AISecurityAnalysis,
    userFeedback: 'correct' | 'false_positive' | 'false_negative',
    userComment?: string
  ): Promise<void>;

  /**
   * Get security recommendations for a command
   */
  getSaferAlternatives(
    command: string,
    context: SecurityContext
  ): Promise<string[]>;

  /**
   * Check if the AI analyzer is available and configured
   */
  isAvailable(): Promise<boolean>;
}
