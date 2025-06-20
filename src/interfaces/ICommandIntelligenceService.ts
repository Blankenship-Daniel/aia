/**
 * Command Intelligence Service Interface
 * Provides intelligent command suggestions, auto-completion, and contextual recommendations
 */

export interface CommandContext {
  workingDirectory: string;
  projectType?: string;
  recentCommands: string[];
  currentInput?: string;
  gitStatus?: {
    hasChanges: boolean;
    currentBranch: string;
    hasUncommittedFiles: boolean;
  };
  packageInfo?: {
    hasPackageJson: boolean;
    scripts: string[];
    dependencies: string[];
  };
}

export interface CommandSuggestion {
  command: string;
  description: string;
  relevanceScore: number;
  contextReason: string;
  usage: string;
  category: 'development' | 'analysis' | 'configuration' | 'memory' | 'agent';
  priority: 'high' | 'medium' | 'low';
}

export interface CommandRecommendation {
  suggestion: CommandSuggestion;
  trigger: string;
  benefit: string;
  estimatedTimeSaving?: number;
}

export interface AutoCompletionResult {
  completions: string[];
  contextualInfo?: string;
  hasMore: boolean;
}

export interface UserProfile {
  commandHistory: CommandUsagePattern[];
  preferences: {
    favoriteCommands: string[];
    preferredWorkflow: string;
    expertiseLevel: 'beginner' | 'intermediate' | 'advanced';
  };
  productivity: {
    mostProductiveHours: number[];
    averageCommandsPerSession: number;
    frequentPatterns: string[];
  };
}

export interface CommandUsagePattern {
  command: string;
  frequency: number;
  lastUsed: Date;
  averageExecutionTime: number;
  successRate: number;
  contextPatterns: string[];
}

/**
 * Interface for Command Intelligence Service
 * Provides smart command suggestions and auto-completion based on context
 */
export interface ICommandIntelligenceService {
  /**
   * Get suggested commands based on current context
   */
  getSuggestedCommands(context: CommandContext): Promise<CommandSuggestion[]>;

  /**
   * Get auto-completion suggestions for partial command input
   */
  getAutoCompletion(
    partial: string,
    context: CommandContext
  ): Promise<AutoCompletionResult>;

  /**
   * Record command usage for learning and personalization
   */
  recordCommandUsage(
    command: string,
    context: CommandContext,
    executionTime: number,
    success: boolean
  ): Promise<void>;

  /**
   * Get personalized command recommendations based on user profile and patterns
   */
  getCommandRecommendations(
    userProfile: UserProfile
  ): Promise<CommandRecommendation[]>;

  /**
   * Get contextual help for a command based on current project state
   */
  getContextualHelp(command: string, context: CommandContext): Promise<string>;

  /**
   * Get welcome suggestions for new users or project initialization
   */
  getWelcomeSuggestions(context: CommandContext): Promise<CommandSuggestion[]>;

  /**
   * Get next-step suggestions after command completion
   */
  getNextStepSuggestions(
    completedCommand: string,
    context: CommandContext
  ): Promise<CommandSuggestion[]>;

  /**
   * Analyze command patterns and suggest workflow optimizations
   */
  analyzeWorkflowPatterns(userProfile: UserProfile): Promise<{
    patterns: string[];
    suggestions: string[];
    optimizations: string[];
  }>;
}
