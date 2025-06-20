/**
 * AgenticSearchEngine.ts - Enhanced search and context discovery for agentic reasoning workflows.
 *
 * Responsibilities:
 * - Gathers relevant context including memory, project, environment, and historical patterns.
 * - Performs semantic search and resource suggestion to inform AI planning and execution.
 *
 * Exports:
 * - {@link AgenticSearchEngine}: Core engine for context gathering and search operations.
 *
 * @see AgenticReasoningEngine - Consumes context data for reasoning workflows.
 * @see MemoryService - Underlying memory search integration.
 */

import chalk from 'chalk';
import fs from 'fs-extra';
import path from 'path';
import { CommandResult } from './types/index.js';

/**
 * Context information gathered for goal analysis
 */
interface RelevantContext {
  memoryInsights: MemoryInsights;
  projectContext: ProjectInsights;
  environmentContext: EnvironmentContext;
  historicalPatterns: HistoricalPattern[];
  suggestedResources: SuggestedResource[];
}

/**
 * Memory insights from previous interactions
 */
interface MemoryInsights {
  conversations: any[];
  commands: any[];
  insights: string[];
}

/**
 * Project analysis insights
 */
interface ProjectInsights {
  projectType: string;
  workingDirectory: string;
  relevantFiles: string[];
  dependencies: Record<string, unknown>;
  configuration: Record<string, unknown>;
  gitContext: Record<string, unknown>;
}

/**
 * Environment context information
 */
interface EnvironmentContext {
  platform: string;
  shell: string;
  nodeVersion?: string;
  workingDirectory: string;
  availableCommands?: string[];
  systemResources?: Record<string, unknown>;
}

/**
 * Historical pattern analysis
 */
interface HistoricalPattern {
  pattern: string;
  frequency: number;
  successRate: number;
  context: Record<string, unknown>;
}

/**
 * Suggested resource for goal achievement
 */
interface SuggestedResource {
  type: 'documentation' | 'tool' | 'command' | 'file';
  name: string;
  description: string;
  relevance: number;
}

/**
 * Search result with relevance scoring
 */
interface SearchResult {
  content: any;
  relevance: number;
  type: string;
}

/**
 * AgenticSearchEngine - Core search engine for gathering contextual data and memory insights.
 *
 * Purpose:
 * - Provides semantic search capabilities across memory, project files, environment, and historical patterns.
 * - Supplies relevant resources to optimize AI-driven planning and reasoning.
 *
 * Dependencies:
 * @see RelevantContext - Structure of combined context data.
 * @see MemoryInsights - Interface for memory-based search results.
 *
 * @example
 * const searchEngine = new AgenticSearchEngine(aiaInstance);
 * const context = await searchEngine.gatherRelevantContext('Optimize build');
 */
export default class AgenticSearchEngine {
  private aia: any;
  private searchCache: Map<string, unknown>;
  private contextCache: Map<string, unknown>;

  constructor(aia: any) {
    this.aia = aia;
    this.searchCache = new Map();
    this.contextCache = new Map();
  }

  /**
   * Gathers a comprehensive set of context data to inform AI planning.
   *
   * Detailed Description:
   * - Performs memory search for conversational and command insights.
   * - Analyzes project structure, dependencies, and configurations.
   * - Assesses environment details (OS, shell, resources).
   * - Identifies historical patterns and suggests relevant resources.
   *
   * @param {string} goal - The user’s natural language goal to gather context for.
   * @param {Record<string, unknown>} [context={}] - Optional baseline context overrides.
   * @returns {Promise<RelevantContext>} Aggregated context including memory, project, environment, patterns, and resources.
   * @throws {Error} If critical context gathering operations fail.
   *
   * @example
   * const ctx = await engine.gatherRelevantContext('Refactor module');
   * console.log(ctx.projectContext.relevantFiles);
   *
   * @see searchMemoryForGoal - Retrieves memory-based insights.
   * @see analyzeProjectForGoal - Inspects project files and configurations.
   */
  async gatherRelevantContext(
    goal: string,
    context: Record<string, unknown> = {}
  ): Promise<RelevantContext> {
    console.log(chalk.blue('🔍 Gathering relevant context...'));

    const relevantContext: RelevantContext = {
      memoryInsights: await this.searchMemoryForGoal(goal),
      projectContext: await this.analyzeProjectForGoal(goal),
      environmentContext: await this.analyzeEnvironment(goal),
      historicalPatterns: await this.findHistoricalPatterns(goal),
      suggestedResources: await this.suggestRelevantResources(goal),
    };

    return relevantContext;
  }

  /**
   * Searches stored memory for insights related to the user’s goal.
   *
   * Detailed Description:
   * - Attempts service-based semantic memory search if available.
   * - Falls back to legacy semantic or simple text-based search.
   * - Filters and limits results for relevant conversations and commands.
   *
   * @param {string} goal - The goal to search memory for.
   * @returns {Promise<MemoryInsights>} Insights including past conversations, commands, and extracted insights.
   * @throws {Error} If memory loading or search operations fail critically.
   *
   * @example
   * const memInsights = await engine.searchMemoryForGoal('Deploy service');
   * console.log(memInsights.insights);
   *
   * @see extractInsightsFromMemory - Derives actionable insights from conversation history.
   */
  async searchMemoryForGoal(goal: string): Promise<MemoryInsights> {
    try {
      // Safely get memory data
      let memory: any = {};
      try {
        if (this.aia.loadMemory && typeof this.aia.loadMemory === 'function') {
          memory = await this.aia.loadMemory();
        } else if (this.aia.memory) {
          memory = this.aia.memory;
        } else {
          memory = { conversations: [], commands: [] };
        }
      } catch (memoryError: any) {
        console.log(
          chalk.yellow(`⚠️ Memory loading failed: ${memoryError.message}`)
        );
        memory = { conversations: [], commands: [] };
      }

      // Ensure memory has safe defaults
      if (!memory.conversations || !Array.isArray(memory.conversations)) {
        memory.conversations = [];
      }
      if (!memory.commands || !Array.isArray(memory.commands)) {
        memory.commands = [];
      }

      // Search conversations for similar goals or related content
      let relatedConversations: any[] = [];
      try {
        // Try new service-based search first
        if (this.aia.memoryService && this.aia.memoryService.searchMemory) {
          const searchResults = await this.aia.memoryService.searchMemory(
            goal,
            5,
            'conversation'
          );
          relatedConversations = searchResults.map(
            (result: any) => result.content
          );
        } else if (
          this.aia.memoryManager &&
          this.aia.memoryManager.semanticSearch
        ) {
          // Fallback to legacy semantic search
          const searchResults = await this.aia.memoryManager.semanticSearch(
            goal,
            5
          );
          relatedConversations = searchResults
            .filter((result: any) => result.type === 'conversation')
            .map((result: any) => result.content);
        } else {
          // Fallback to simple text search
          relatedConversations = memory.conversations
            .filter((conv: any) => {
              if (!conv || !conv.query) return false;
              return this.calculateRelevance(conv.query, goal) > 0;
            })
            .slice(-5);
        }
      } catch (error: any) {
        console.log(
          chalk.yellow(`⚠️ Conversation search failed: ${error.message}`)
        );
        // Fallback to simple text search if semantic search fails
        relatedConversations = memory.conversations
          .filter((conv: any) => {
            if (!conv || !conv.query) return false;
            return this.calculateRelevance(conv.query, goal) > 0;
          })
          .slice(-5);
      }

      // Find relevant command patterns
      const relevantCommands = memory.commands
        .filter((cmd: any) => this.isCommandRelevantToGoal(cmd.command, goal))
        .slice(-10);

      // Extract insights from previous interactions
      const insights = this.extractInsightsFromMemory(
        relatedConversations,
        goal
      );

      return {
        conversations: relatedConversations,
        commands: relevantCommands,
        insights,
      };
    } catch (error: any) {
      console.log(chalk.yellow(`⚠️ Memory search failed: ${error.message}`));
      return { conversations: [], commands: [], insights: [] };
    }
  }

  /**
   * Analyze current project structure for goal-relevant information
   */
  async analyzeProjectForGoal(goal: string): Promise<ProjectInsights> {
    try {
      let currentContext: any = {};
      try {
        currentContext = await this.aia.gatherContext();
      } catch (error: any) {
        console.log(
          chalk.yellow(`⚠️ Context gathering failed: ${error.message}`)
        );
        // Use basic context as fallback
        currentContext = {
          workingDirectory: process.cwd(),
          platform: process.platform,
          projectType: 'unknown',
        };
      }

      // Enhanced project analysis based on goal
      const projectInsights: ProjectInsights = {
        projectType: currentContext.projectType || 'unknown',
        workingDirectory: currentContext.workingDirectory || process.cwd(),
        relevantFiles: await this.findRelevantFiles(goal),
        dependencies: await this.analyzeDependencies(goal),
        configuration: await this.analyzeConfiguration(goal),
        gitContext: await this.analyzeGitContext(goal, currentContext),
      };

      return projectInsights;
    } catch (error: any) {
      console.log(chalk.yellow(`⚠️ Project analysis failed: ${error.message}`));
      return {
        projectType: 'unknown',
        workingDirectory: process.cwd(),
        relevantFiles: [],
        dependencies: {},
        configuration: {},
        gitContext: {},
      };
    }
  }

  /**
   * Analyze environment for goal-specific requirements
   */
  async analyzeEnvironment(goal: string): Promise<EnvironmentContext> {
    let environmentContext: any = {};
    try {
      environmentContext = await this.aia.gatherContext();
    } catch (error: any) {
      console.log(
        chalk.yellow(`⚠️ Environment analysis failed: ${error.message}`)
      );
      // Use basic environment as fallback
      environmentContext = {
        platform: process.platform,
        shell: process.env.SHELL || 'unknown',
        nodeVersion: process.version,
        workingDirectory: process.cwd(),
      };
    }

    return {
      platform: environmentContext.platform || process.platform,
      shell: environmentContext.shell || process.env.SHELL || 'unknown',
      nodeVersion: environmentContext.nodeVersion || process.version,
      workingDirectory: environmentContext.workingDirectory || process.cwd(),
      availableCommands: await this.getAvailableCommands(goal),
      systemResources: await this.analyzeSystemResources(goal),
    };
  }

  /**
   * Find historical patterns related to the goal
   */
  async findHistoricalPatterns(goal: string): Promise<HistoricalPattern[]> {
    try {
      const patterns: HistoricalPattern[] = [];

      // Analyze previous similar goals from memory
      const memory = (await this.aia.loadMemory?.()) || { agenticHistory: [] };
      const historicalGoals = memory.agenticHistory || [];

      for (const historicalGoal of historicalGoals) {
        const similarity = this.calculateRelevance(historicalGoal.goal, goal);
        if (similarity > 0.3) {
          patterns.push({
            pattern: historicalGoal.goal,
            frequency: 1,
            successRate: historicalGoal.success ? 1 : 0,
            context: historicalGoal.context || {},
          });
        }
      }

      return patterns;
    } catch (error: any) {
      console.log(chalk.yellow(`⚠️ Pattern analysis failed: ${error.message}`));
      return [];
    }
  }

  /**
   * Suggest relevant resources for achieving the goal
   */
  async suggestRelevantResources(goal: string): Promise<SuggestedResource[]> {
    const resources: SuggestedResource[] = [];
    const lowerGoal = goal.toLowerCase();

    // Suggest tools based on goal content
    if (lowerGoal.includes('git') || lowerGoal.includes('version')) {
      resources.push({
        type: 'tool',
        name: 'Git',
        description: 'Version control operations',
        relevance: 0.9,
      });
    }

    if (lowerGoal.includes('test') || lowerGoal.includes('testing')) {
      resources.push({
        type: 'tool',
        name: 'Jest/Testing Framework',
        description: 'Run and manage tests',
        relevance: 0.8,
      });
    }

    if (lowerGoal.includes('build') || lowerGoal.includes('compile')) {
      resources.push({
        type: 'tool',
        name: 'Build Tools',
        description: 'Build and compilation tools',
        relevance: 0.8,
      });
    }

    if (lowerGoal.includes('npm') || lowerGoal.includes('package')) {
      resources.push({
        type: 'tool',
        name: 'NPM',
        description: 'Package management',
        relevance: 0.9,
      });
    }

    return resources;
  }

  /**
   * Perform search operations with caching
   */
  async performSearch(query: string): Promise<CommandResult> {
    try {
      // Check cache first
      const cacheKey = `search:${query}`;
      if (this.searchCache.has(cacheKey)) {
        return this.searchCache.get(cacheKey) as CommandResult;
      }

      // Perform actual search
      const searchResult = await this.executeSearch(query);

      // Cache result
      this.searchCache.set(cacheKey, searchResult);

      return searchResult;
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
        output: '',
      };
    }
  }

  /**
   * Execute the actual search operation
   */
  private async executeSearch(query: string): Promise<CommandResult> {
    // Implementation will depend on the specific search requirements
    // For now, return a placeholder result
    return {
      success: true,
      output: `Search results for: ${query}`,
      data: { query, results: [] },
    };
  }

  /**
   * Calculate relevance between two text strings
   */
  private calculateRelevance(text1: string, text2: string): number {
    if (!text1 || !text2) return 0;

    const words1 = text1.toLowerCase().split(/\s+/);
    const words2 = text2.toLowerCase().split(/\s+/);

    const commonWords = words1.filter((word) => words2.includes(word));
    const totalWords = Math.max(words1.length, words2.length);

    return totalWords > 0 ? commonWords.length / totalWords : 0;
  }

  /**
   * Check if a command is relevant to the goal
   */
  private isCommandRelevantToGoal(command: string, goal: string): boolean {
    if (!command || !goal) return false;
    return this.calculateRelevance(command, goal) > 0.1;
  }

  /**
   * Extract insights from memory conversations
   */
  private extractInsightsFromMemory(
    conversations: any[],
    goal: string
  ): string[] {
    const insights: string[] = [];

    for (const conv of conversations) {
      if (conv && conv.response) {
        // Extract key phrases or patterns from successful interactions
        const relevance = this.calculateRelevance(conv.query || '', goal);
        if (relevance > 0.3) {
          insights.push(
            `Previous similar query: "${conv.query}" resulted in successful response`
          );
        }
      }
    }

    return insights.slice(0, 5); // Limit to top 5 insights
  }

  /**
   * Find files relevant to the goal
   */
  private async findRelevantFiles(goal: string): Promise<string[]> {
    try {
      const cwd = process.cwd();
      const files: string[] = [];

      // Basic file discovery based on goal keywords
      const keywords = goal.toLowerCase().split(/\s+/);

      // Check common directories and files
      const commonPaths = [
        'package.json',
        'README.md',
        'src/',
        'test/',
        'tests/',
        'lib/',
        'dist/',
      ];

      for (const filePath of commonPaths) {
        const fullPath = path.join(cwd, filePath);
        try {
          if (await fs.pathExists(fullPath)) {
            files.push(filePath);
          }
        } catch (error) {
          // Ignore individual file check errors
        }
      }

      return files;
    } catch (error: any) {
      console.log(chalk.yellow(`⚠️ File discovery failed: ${error.message}`));
      return [];
    }
  }

  /**
   * Analyze project dependencies
   */
  private async analyzeDependencies(
    goal: string
  ): Promise<Record<string, unknown>> {
    try {
      const packageJsonPath = path.join(process.cwd(), 'package.json');
      if (await fs.pathExists(packageJsonPath)) {
        const packageJson = await fs.readJson(packageJsonPath);
        return {
          dependencies: packageJson.dependencies || {},
          devDependencies: packageJson.devDependencies || {},
          scripts: packageJson.scripts || {},
        };
      }
    } catch (error: any) {
      console.log(
        chalk.yellow(`⚠️ Dependency analysis failed: ${error.message}`)
      );
    }
    return {};
  }

  /**
   * Analyze project configuration
   */
  private async analyzeConfiguration(
    goal: string
  ): Promise<Record<string, unknown>> {
    const config: Record<string, unknown> = {};

    try {
      // Check for common config files
      const configFiles = [
        'tsconfig.json',
        'jest.config.js',
        'jest.config.ts',
        '.eslintrc.js',
        '.eslintrc.json',
        'webpack.config.js',
        'vite.config.js',
        'vite.config.ts',
      ];

      for (const configFile of configFiles) {
        const configPath = path.join(process.cwd(), configFile);
        if (await fs.pathExists(configPath)) {
          config[configFile] = true;
        }
      }
    } catch (error: any) {
      console.log(
        chalk.yellow(`⚠️ Configuration analysis failed: ${error.message}`)
      );
    }

    return config;
  }

  /**
   * Analyze Git context
   */
  private async analyzeGitContext(
    goal: string,
    context: any
  ): Promise<Record<string, unknown>> {
    try {
      const gitDir = path.join(process.cwd(), '.git');
      if (await fs.pathExists(gitDir)) {
        return {
          isGitRepo: true,
          workingDirectory: context.workingDirectory || process.cwd(),
        };
      }
    } catch (error: any) {
      console.log(chalk.yellow(`⚠️ Git analysis failed: ${error.message}`));
    }
    return { isGitRepo: false };
  }

  /**
   * Get available commands for the goal
   */
  private async getAvailableCommands(goal: string): Promise<string[]> {
    const commands: string[] = [];
    const lowerGoal = goal.toLowerCase();

    // Suggest commands based on goal content
    if (lowerGoal.includes('git')) {
      commands.push('git status', 'git log', 'git branch', 'git diff');
    }
    if (lowerGoal.includes('npm') || lowerGoal.includes('package')) {
      commands.push('npm install', 'npm test', 'npm run build', 'npm list');
    }
    if (lowerGoal.includes('test')) {
      commands.push('npm test', 'jest', 'mocha');
    }

    return commands;
  }

  /**
   * Analyze system resources
   */
  private async analyzeSystemResources(
    goal: string
  ): Promise<Record<string, unknown>> {
    return {
      platform: process.platform,
      nodeVersion: process.version,
      memory: process.memoryUsage(),
      uptime: process.uptime(),
    };
  }

  /**
   * Advanced search capabilities (placeholder for future implementation)
   */
  async advancedSearch(
    query: string,
    options: Record<string, unknown> = {}
  ): Promise<SearchResult[]> {
    // Placeholder for advanced search implementation
    return [];
  }

  /**
   * Get codebase context (placeholder for compatibility)
   */
  async getCodebaseContext(
    goal: string,
    index: any
  ): Promise<Record<string, unknown>> {
    const context = {
      relevantFiles: await this.findRelevantFilesFromIndex(goal, index),
      relatedSymbols: await this.findRelatedSymbols(goal, index),
      dependencies: await this.getRelevantDependencies(goal, index),
      architecture: index.architecture || {},
      suggestions: this.generateContextualSuggestions(goal, index),
    };

    return context;
  }

  /**
   * Placeholder methods for compatibility with existing code
   */
  private async findRelevantFilesFromIndex(
    goal: string,
    index: any
  ): Promise<any[]> {
    return [];
  }

  private async findRelatedSymbols(goal: string, index: any): Promise<any[]> {
    return [];
  }

  private async getRelevantDependencies(
    goal: string,
    index: any
  ): Promise<Record<string, unknown>> {
    return {};
  }

  private generateContextualSuggestions(goal: string, index: any): string[] {
    return [];
  }
}
