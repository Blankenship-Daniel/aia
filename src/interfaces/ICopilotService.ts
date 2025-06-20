/**
 * ICopilotService.ts - Interface for GitHub Copilot CLI integration with AIA.
 *
 * Responsibilities:
 * - Provides command explanation capabilities via GitHub Copilot CLI.
 * - Generates command suggestions based on natural language queries.
 * - Creates and manages shell aliases for frequently used commands.
 * - Integrates with AIA's context awareness and caching systems.
 *
 * Architecture:
 * - Core service interface following SOLID principles and dependency injection.
 * - Supports context-aware suggestions with project and environment information.
 * - Provides structured results for consistent UI presentation.
 * - Integrates with existing AIA memory and configuration services.
 *
 * Exports:
 * - {@link ICopilotService}: Main service interface for Copilot CLI integration.
 * - {@link ExplanationResult}: Structured command explanation data.
 * - {@link SuggestionResult}: Command suggestion with metadata.
 * - {@link CommandContext}: Context information for enhanced suggestions.
 *
 * @see CopilotService - Implementation of this interface.
 * @see ICopilotDependencyService - Dependency checking for Copilot CLI.
 */

export interface CommandComponent {
  /** The specific part of the command (flag, argument, etc.) */
  part: string;
  /** Human-readable description of this component */
  description: string;
  /** Whether this component is required or optional */
  required?: boolean;
  /** Example values for this component */
  examples?: string[];
}

export interface ExplanationResult {
  /** The original command that was explained */
  command: string;
  /** Natural language explanation of the command */
  explanation: string;
  /** Breakdown of command components (flags, arguments, etc.) */
  components: CommandComponent[];
  /** Usage examples demonstrating the command */
  examples?: string[];
  /** Important warnings or cautions about the command */
  warnings?: string[];
  /** Related commands or alternatives */
  relatedCommands?: string[];
  /** Confidence score from Copilot (0-1) */
  confidence?: number;
}

export interface SuggestionResult {
  /** The suggested command */
  command: string;
  /** Human-readable description of what the command does */
  description: string;
  /** Confidence score from Copilot (0-1) */
  confidence: number;
  /** Tags categorizing the command type */
  tags: string[];
  /** Estimated safety level (safe, caution, dangerous) */
  safetyLevel?: 'safe' | 'caution' | 'dangerous';
  /** Whether the command requires user confirmation */
  requiresConfirmation?: boolean;
  /** Additional context or notes about the suggestion */
  notes?: string;
}

export interface CommandContext {
  /** Current working directory */
  workingDirectory: string;
  /** Detected project type (git, npm, python, etc.) */
  projectType?: string;
  /** Available files and directories */
  filesContext?: string[];
  /** Git repository information */
  gitContext?: {
    branch: string;
    hasChanges: boolean;
    remoteUrl?: string;
  };
  /** Environment variables relevant to the query */
  environmentContext?: Record<string, string>;
  /** Recently executed commands */
  recentCommands?: string[];
  /** User preferences and settings */
  userPreferences?: Record<string, any>;
}

export interface CopilotOptions {
  /** Maximum number of suggestions to return */
  maxSuggestions?: number;
  /** Whether to include context in the query */
  includeContext?: boolean;
  /** Whether to perform safety checks on suggestions */
  safetyCheck?: boolean;
  /** Cache TTL for results in milliseconds */
  cacheTTL?: number;
  /** Whether to use AI fallback if Copilot unavailable */
  useAIFallback?: boolean;
}

export interface ICopilotService {
  /**
   * Explains a command using GitHub Copilot CLI with caching support.
   *
   * @param {string} command - The command to explain.
   * @param {CopilotOptions} options - Options for explanation behavior.
   * @returns {Promise<ExplanationResult>} Structured explanation with components and examples.
   *
   * @example
   * const explanation = await copilotService.explain('git rebase -i HEAD~3');
   * console.log(explanation.explanation);
   * explanation.components.forEach(comp => console.log(`${comp.part}: ${comp.description}`));
   */
  explain(
    command: string,
    options?: CopilotOptions
  ): Promise<ExplanationResult>;

  /**
   * Suggests commands based on natural language query with context awareness.
   *
   * @param {string} query - Natural language description of desired action.
   * @param {CommandContext} context - Current environment and project context.
   * @param {CopilotOptions} options - Options for suggestion behavior.
   * @returns {Promise<SuggestionResult[]>} Array of suggested commands with metadata.
   *
   * @example
   * const suggestions = await copilotService.suggest(
   *   'find all Python files modified in the last week',
   *   { workingDirectory: '/project', projectType: 'python' }
   * );
   */
  suggest(
    query: string,
    context?: CommandContext,
    options?: CopilotOptions
  ): Promise<SuggestionResult[]>;

  /**
   * Creates a shell alias for a command using GitHub Copilot CLI.
   *
   * @param {string} name - The alias name to create.
   * @param {string} command - The command to alias.
   * @returns {Promise<void>} Resolves when alias is created successfully.
   *
   * @example
   * await copilotService.createAlias('gs', 'git status');
   */
  createAlias(name: string, command: string): Promise<void>;

  /**
   * Checks if GitHub Copilot CLI is available and properly configured.
   *
   * @returns {Promise<boolean>} Whether Copilot CLI is ready for use.
   */
  isAvailable(): Promise<boolean>;

  /**
   * Gets the current configuration and status of the Copilot service.
   *
   * @returns {Promise<{ available: boolean; version?: string; authenticated: boolean }>}
   */
  getStatus(): Promise<{
    available: boolean;
    version?: string;
    authenticated: boolean;
    lastCheck: Date;
  }>;

  /**
   * Clears cached explanations and suggestions.
   *
   * @param {string} pattern - Optional pattern to match cache keys (supports wildcards).
   * @returns {Promise<number>} Number of cache entries cleared.
   */
  clearCache(pattern?: string): Promise<number>;
}
