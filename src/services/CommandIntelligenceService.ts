/**
 * Command Intelligence Service Implementation
 * Provides intelligent command suggestions, auto-completion, and contextual recommendations
 */
import {
  ICommandIntelligenceService,
  CommandContext,
  CommandSuggestion,
  CommandRecommendation,
  AutoCompletionResult,
  UserProfile,
  CommandUsagePattern,
} from '../interfaces/ICommandIntelligenceService.js';
import { ICommandRegistry } from '../interfaces/ICommandRegistry.js';
import { IContextService } from '../interfaces/IContextService.js';
import { IMemoryService } from '../interfaces/IMemoryService.js';
import { IConfigurationService } from '../interfaces/IConfigurationService.js';
import * as fs from 'fs-extra';
import * as path from 'path';
import chalk from 'chalk';

export class CommandIntelligenceService implements ICommandIntelligenceService {
  private commandUsageHistory: Map<string, CommandUsagePattern> = new Map();
  private projectTypeCommandMapping: Map<string, string[]> = new Map();
  private contextualSuggestions: Map<string, CommandSuggestion[]> = new Map();

  constructor(
    private commandRegistry: ICommandRegistry,
    private contextService: IContextService,
    private memoryService: IMemoryService,
    private configurationService: IConfigurationService
  ) {
    this.initializeCommandMappings();
    this.loadUsageHistory();
  }

  /**
   * Initialize project type to command mappings
   */
  private initializeCommandMappings(): void {
    this.projectTypeCommandMapping.set('typescript', [
      'index',
      'agent "analyze TypeScript code quality"',
      'ask "how to optimize TypeScript performance"',
    ]);

    this.projectTypeCommandMapping.set('javascript', [
      'index',
      'agent "review JavaScript code"',
      'ask "JavaScript best practices"',
    ]);

    this.projectTypeCommandMapping.set('node', [
      'index',
      'agent "optimize Node.js application"',
      'ask "Node.js performance tips"',
    ]);

    this.projectTypeCommandMapping.set('react', [
      'agent "analyze React components"',
      'ask "React optimization strategies"',
      'index',
    ]);

    this.projectTypeCommandMapping.set('git', [
      'agent "review git changes"',
      'ask "git workflow suggestions"',
      'agent "prepare commit message"',
    ]);
  }

  /**
   * Load command usage history from memory service
   */
  private async loadUsageHistory(): Promise<void> {
    try {
      const preferences = await this.memoryService.getPreferences();
      const history = preferences.commandUsageHistory as any[];
      if (history && Array.isArray(history)) {
        for (const pattern of history) {
          this.commandUsageHistory.set(pattern.command, {
            ...pattern,
            lastUsed: new Date(pattern.lastUsed),
          });
        }
      }
    } catch (error) {
      // History not available, start fresh
    }
  }

  /**
   * Save command usage history to memory service
   */
  private async saveUsageHistory(): Promise<void> {
    try {
      const history = Array.from(this.commandUsageHistory.values());
      await this.memoryService.updatePreferences({
        commandUsageHistory: history,
      });
    } catch (error) {
      console.warn('Failed to save command usage history:', error);
    }
  }

  /**
   * Get suggested commands based on current context
   */
  async getSuggestedCommands(
    context: CommandContext
  ): Promise<CommandSuggestion[]> {
    const suggestions: CommandSuggestion[] = [];

    // Get project-based suggestions
    if (context.projectType) {
      const projectCommands =
        this.projectTypeCommandMapping.get(context.projectType) || [];
      for (const command of projectCommands) {
        suggestions.push({
          command,
          description: this.getCommandDescription(command),
          relevanceScore: 0.8,
          contextReason: `Recommended for ${context.projectType} projects`,
          usage: this.getCommandUsage(command),
          category: this.getCommandCategory(command),
          priority: 'high',
        });
      }
    }

    // Get git-based suggestions
    if (context.gitStatus?.hasChanges) {
      suggestions.push({
        command: 'agent "review my changes and suggest improvements"',
        description: 'AI-powered code review of your current changes',
        relevanceScore: 0.9,
        contextReason: 'You have uncommitted changes',
        usage: 'aia agent "review my changes and suggest improvements"',
        category: 'analysis',
        priority: 'high',
      });
    }

    // Get package.json based suggestions
    if (context.packageInfo?.hasPackageJson) {
      suggestions.push({
        command:
          'agent "analyze package dependencies and suggest optimizations"',
        description: 'Review and optimize your project dependencies',
        relevanceScore: 0.7,
        contextReason: 'Project has package.json with dependencies',
        usage:
          'aia agent "analyze package dependencies and suggest optimizations"',
        category: 'analysis',
        priority: 'medium',
      });
    }

    // Get usage-based suggestions
    const frequentCommands = this.getFrequentCommands();
    for (const pattern of frequentCommands.slice(0, 3)) {
      suggestions.push({
        command: pattern.command,
        description: this.getCommandDescription(pattern.command),
        relevanceScore: pattern.frequency / 100,
        contextReason: `You use this command frequently (${pattern.frequency} times)`,
        usage: this.getCommandUsage(pattern.command),
        category: this.getCommandCategory(pattern.command),
        priority: 'medium',
      });
    }

    // Add general purpose suggestions if none found
    if (suggestions.length === 0) {
      suggestions.push(...this.getDefaultSuggestions());
    }

    // Sort by relevance and priority
    return suggestions
      .sort((a, b) => {
        const priorityWeight = { high: 3, medium: 2, low: 1 };
        const priorityDiff =
          priorityWeight[b.priority] - priorityWeight[a.priority];
        if (priorityDiff !== 0) return priorityDiff;
        return b.relevanceScore - a.relevanceScore;
      })
      .slice(0, 8); // Limit to top 8 suggestions
  }

  /**
   * Get auto-completion suggestions for partial command input
   */
  async getAutoCompletion(
    partial: string,
    context: CommandContext
  ): Promise<AutoCompletionResult> {
    const completions: string[] = [];
    let contextualInfo = '';

    // Get all registered commands
    const allCommands = this.commandRegistry.getCommandNames();

    // Filter commands that match the partial input
    const matchingCommands = allCommands.filter((cmd) =>
      cmd.toLowerCase().startsWith(partial.toLowerCase())
    );

    completions.push(...matchingCommands);

    // Add intelligent parameter completion for specific commands
    if (partial.includes(' ')) {
      const [command, ...params] = partial.split(' ');
      const paramCompletions = await this.getParameterCompletions(
        command,
        params.join(' '),
        context
      );
      completions.push(...paramCompletions);
    }

    // Add contextual command variations
    const contextualCompletions = await this.getContextualCompletions(
      partial,
      context
    );
    completions.push(...contextualCompletions);

    // Remove duplicates and sort by relevance
    const uniqueCompletions = Array.from(new Set(completions))
      .sort((a, b) => {
        // Prioritize exact matches
        if (
          a.toLowerCase().startsWith(partial.toLowerCase()) &&
          !b.toLowerCase().startsWith(partial.toLowerCase())
        ) {
          return -1;
        }
        if (
          !a.toLowerCase().startsWith(partial.toLowerCase()) &&
          b.toLowerCase().startsWith(partial.toLowerCase())
        ) {
          return 1;
        }
        return a.localeCompare(b);
      })
      .slice(0, 10);

    if (uniqueCompletions.length > 0) {
      contextualInfo = this.getCompletionContextInfo(
        partial,
        uniqueCompletions,
        context
      );
    }

    return {
      completions: uniqueCompletions,
      contextualInfo,
      hasMore: completions.length > 10,
    };
  }

  /**
   * Record command usage for learning and personalization
   */
  async recordCommandUsage(
    command: string,
    context: CommandContext,
    executionTime: number,
    success: boolean
  ): Promise<void> {
    const existing = this.commandUsageHistory.get(command);

    if (existing) {
      existing.frequency += 1;
      existing.lastUsed = new Date();
      existing.averageExecutionTime =
        (existing.averageExecutionTime + executionTime) / 2;
      existing.successRate =
        (existing.successRate * (existing.frequency - 1) + (success ? 1 : 0)) /
        existing.frequency;

      // Update context patterns
      if (
        context.projectType &&
        !existing.contextPatterns.includes(context.projectType)
      ) {
        existing.contextPatterns.push(context.projectType);
      }
    } else {
      this.commandUsageHistory.set(command, {
        command,
        frequency: 1,
        lastUsed: new Date(),
        averageExecutionTime: executionTime,
        successRate: success ? 1 : 0,
        contextPatterns: context.projectType ? [context.projectType] : [],
      });
    }

    await this.saveUsageHistory();
  }

  /**
   * Get personalized command recommendations based on user profile and patterns
   */
  async getCommandRecommendations(
    userProfile: UserProfile
  ): Promise<CommandRecommendation[]> {
    const recommendations: CommandRecommendation[] = [];

    // Analyze patterns and suggest optimizations
    const patterns = await this.analyzeWorkflowPatterns(userProfile);

    // Recommend based on expertise level
    if (userProfile.preferences.expertiseLevel === 'beginner') {
      recommendations.push({
        suggestion: {
          command: 'index',
          description: 'Build understanding of your codebase',
          relevanceScore: 0.9,
          contextReason: 'Essential for new users to understand their project',
          usage: 'aia index',
          category: 'analysis',
          priority: 'high',
        },
        trigger: 'New user workflow',
        benefit: 'Provides comprehensive codebase analysis',
      });
    }

    // Recommend based on usage patterns
    for (const pattern of patterns.optimizations) {
      recommendations.push({
        suggestion: {
          command: pattern,
          description: this.getCommandDescription(pattern),
          relevanceScore: 0.7,
          contextReason: 'Based on your usage patterns',
          usage: this.getCommandUsage(pattern),
          category: this.getCommandCategory(pattern),
          priority: 'medium',
        },
        trigger: 'Workflow optimization',
        benefit: 'Could improve your development efficiency',
      });
    }

    return recommendations.slice(0, 5);
  }

  /**
   * Get contextual help for a command based on current project state
   */
  async getContextualHelp(
    command: string,
    context: CommandContext
  ): Promise<string> {
    let help = `Command: ${chalk.cyan(command)}\n`;

    // Add contextual information based on project state
    if (context.projectType) {
      help += `${chalk.yellow('Project Context:')} ${
        context.projectType
      } project detected\n`;
    }

    if (context.gitStatus?.hasChanges) {
      help += `${chalk.yellow('Git Status:')} Uncommitted changes detected\n`;
    }

    // Add usage recommendations
    const usage = this.commandUsageHistory.get(command);
    if (usage) {
      help += `${chalk.green('Your Usage:')} Used ${
        usage.frequency
      } times, ${Math.round(usage.successRate * 100)}% success rate\n`;
    }

    return help;
  }

  /**
   * Get welcome suggestions for new users or project initialization
   */
  async getWelcomeSuggestions(
    context: CommandContext
  ): Promise<CommandSuggestion[]> {
    const welcomeSuggestions: CommandSuggestion[] = [
      {
        command: 'index',
        description: 'Build comprehensive understanding of your codebase',
        relevanceScore: 1.0,
        contextReason: 'Recommended for first-time setup',
        usage: 'aia index',
        category: 'analysis',
        priority: 'high',
      },
      {
        command: 'config',
        description: 'Set up your AI model preferences and API keys',
        relevanceScore: 0.9,
        contextReason: 'Essential for personalized experience',
        usage: 'aia config',
        category: 'configuration',
        priority: 'high',
      },
    ];

    // Add context-specific suggestions
    if (context.projectType) {
      const projectCommands =
        this.projectTypeCommandMapping.get(context.projectType) || [];
      for (const command of projectCommands.slice(0, 2)) {
        welcomeSuggestions.push({
          command,
          description: this.getCommandDescription(command),
          relevanceScore: 0.8,
          contextReason: `Perfect for ${context.projectType} projects`,
          usage: this.getCommandUsage(command),
          category: this.getCommandCategory(command),
          priority: 'medium',
        });
      }
    }

    return welcomeSuggestions;
  }

  /**
   * Get next-step suggestions after command completion
   */
  async getNextStepSuggestions(
    completedCommand: string,
    context: CommandContext
  ): Promise<CommandSuggestion[]> {
    const suggestions: CommandSuggestion[] = [];

    // Command-specific next steps
    switch (completedCommand) {
      case 'index':
        suggestions.push({
          command:
            'ask "what are the main areas for improvement in this codebase?"',
          description: 'Get AI analysis of improvement opportunities',
          relevanceScore: 0.9,
          contextReason: 'Follow up on index analysis',
          usage:
            'aia ask "what are the main areas for improvement in this codebase?"',
          category: 'analysis',
          priority: 'high',
        });
        break;

      case 'config':
        suggestions.push({
          command: 'agent "help me create a development plan for this project"',
          description: 'Create a structured development approach',
          relevanceScore: 0.8,
          contextReason: 'Now that configuration is set up',
          usage:
            'aia agent "help me create a development plan for this project"',
          category: 'agent',
          priority: 'medium',
        });
        break;
    }

    return suggestions;
  }

  /**
   * Analyze command patterns and suggest workflow optimizations
   */
  async analyzeWorkflowPatterns(userProfile: UserProfile): Promise<{
    patterns: string[];
    suggestions: string[];
    optimizations: string[];
  }> {
    const patterns: string[] = [];
    const suggestions: string[] = [];
    const optimizations: string[] = [];

    // Analyze frequent command sequences
    for (const pattern of userProfile.commandHistory) {
      if (pattern.frequency > 5) {
        patterns.push(
          `Frequent use of '${pattern.command}' (${pattern.frequency} times)`
        );
      }
    }

    // Suggest workflow improvements
    const mostUsed = userProfile.commandHistory
      .sort((a, b) => b.frequency - a.frequency)
      .slice(0, 3);

    for (const command of mostUsed) {
      suggestions.push(`Consider creating shortcuts for '${command.command}'`);
      optimizations.push(
        `agent "optimize my workflow with ${command.command}"`
      );
    }

    return { patterns, suggestions, optimizations };
  }

  // Helper methods
  private getCommandDescription(command: string): string {
    if (command.startsWith('agent'))
      return 'AI-powered task execution with reasoning';
    if (command.startsWith('ask')) return 'Direct AI query and assistance';
    if (command.startsWith('index')) return 'Codebase analysis and indexing';
    if (command.startsWith('config')) return 'Configuration management';
    return 'Command execution';
  }

  private getCommandUsage(command: string): string {
    return `aia ${command}`;
  }

  private getCommandCategory(
    command: string
  ): 'development' | 'analysis' | 'configuration' | 'memory' | 'agent' {
    if (command.startsWith('agent')) return 'agent';
    if (command.startsWith('ask')) return 'analysis';
    if (command.startsWith('index')) return 'analysis';
    if (command.startsWith('config')) return 'configuration';
    if (command.startsWith('memory')) return 'memory';
    return 'development';
  }

  private getFrequentCommands(): CommandUsagePattern[] {
    return Array.from(this.commandUsageHistory.values()).sort(
      (a, b) => b.frequency - a.frequency
    );
  }

  private getDefaultSuggestions(): CommandSuggestion[] {
    return [
      {
        command: 'index',
        description: 'Analyze and index your codebase',
        relevanceScore: 0.8,
        contextReason: 'Essential for codebase understanding',
        usage: 'aia index',
        category: 'analysis',
        priority: 'high',
      },
      {
        command: 'ask "help me understand this project structure"',
        description: 'Get AI assistance with project comprehension',
        relevanceScore: 0.7,
        contextReason: 'Great for project exploration',
        usage: 'aia ask "help me understand this project structure"',
        category: 'analysis',
        priority: 'medium',
      },
    ];
  }

  private async getParameterCompletions(
    command: string,
    params: string,
    context: CommandContext
  ): Promise<string[]> {
    const completions: string[] = [];

    // Command-specific parameter completion
    switch (command) {
      case 'agent':
        if (params.includes('"')) {
          // Already in quoted context, suggest common tasks
          completions.push(
            '"analyze code quality"',
            '"optimize performance"',
            '"review security vulnerabilities"',
            '"suggest improvements"'
          );
        }
        break;

      case 'ask':
        if (params.includes('"')) {
          completions.push(
            '"how to optimize this code?"',
            '"what are the best practices for this project?"',
            '"explain this error message"'
          );
        }
        break;
    }

    return completions;
  }

  private async getContextualCompletions(
    partial: string,
    context: CommandContext
  ): Promise<string[]> {
    const completions: string[] = [];

    // Add context-specific command variations
    if (partial.startsWith('ag')) {
      if (context.gitStatus?.hasChanges) {
        completions.push('agent "review my git changes"');
      }
      if (context.projectType === 'typescript') {
        completions.push('agent "optimize TypeScript code"');
      }
    }

    return completions;
  }

  private getCompletionContextInfo(
    partial: string,
    completions: string[],
    context: CommandContext
  ): string {
    let info = '';

    if (context.projectType) {
      info += `${chalk.blue('Project:')} ${context.projectType}`;
    }

    if (context.gitStatus?.hasChanges) {
      info += ` ${chalk.yellow('(uncommitted changes)')}`;
    }

    if (completions.length > 0) {
      info += ` - ${completions.length} suggestions`;
    }

    return info;
  }
}
