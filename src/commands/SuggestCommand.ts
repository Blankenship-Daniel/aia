/**
 * SuggestCommand.ts - Command suggestion using GitHub Copilot CLI integration.
 *
 * Responsibilities:
 * - Provides command suggestions based on natural language queries.
 * - Integrates with AIA's context service for enhanced suggestions.
 * - Offers interactive command selection with safety checks.
 * - Supports execution of selected commands with user confirmation.
 *
 * Architecture:
 * - Implements ICommand interface following AIA's command patterns.
 * - Uses dependency injection for Copilot and context services.
 * - Provides interactive UI with safety warnings and execution options.
 * - Integrates with existing AIA memory and configuration systems.
 *
 * @see ICopilotService - Service for GitHub Copilot CLI integration.
 * @see IContextService - Service for environment and project context.
 * @see ICommand - Base command interface.
 */

import { ICommand, CommandDefinition } from '../interfaces/ICommand';
import { ICopilotService } from '../interfaces/ICopilotService';
import { IContextService } from '../interfaces/IContextService';
import { CommandResult, CommandOptions } from '../types/index';
import chalk from 'chalk';
import ora from 'ora';
import inquirer from 'inquirer';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export class SuggestCommand implements ICommand {
  constructor(
    private copilotService: ICopilotService,
    private contextService: IContextService
  ) {}

  /**
   * Executes the suggest command with GitHub Copilot integration.
   */
  async execute(
    context: Record<string, unknown>,
    args: string[],
    options: CommandOptions
  ): Promise<CommandResult> {
    try {
      if (args.length === 0) {
        console.log(
          chalk.red('❌ Please provide a description of what you want to do')
        );
        console.log(chalk.gray('Usage: aia suggest <description>'));
        console.log(
          chalk.gray(
            'Example: aia suggest "find all Python files modified in the last week"'
          )
        );
        return {
          success: false,
          error: 'No description provided',
          data: { usage: 'aia suggest <description>' },
        };
      }

      const query = args.join(' ');
      const spinner = ora(
        `Getting suggestions for: ${chalk.cyan(query)}`
      ).start();

      try {
        // Get current context for enhanced suggestions
        const projectContext = await this.contextService.gatherContext();

        // Convert AIA context to Copilot context format
        const copilotContext = this.convertToCommandContext(projectContext);

        // Get suggestions from Copilot service
        const suggestions = await this.copilotService.suggest(
          query,
          copilotContext,
          {
            maxSuggestions: (options.limit as number) || 5,
            includeContext: !options['no-context'],
            safetyCheck: !options['no-safety-check'],
            useAIFallback: !options['no-fallback'],
          }
        );

        spinner.succeed(`Found ${suggestions.length} suggestions`);

        if (suggestions.length === 0) {
          console.log(chalk.yellow('🤔 No suggestions found for your query'));
          console.log(
            chalk.gray('Try rephrasing your request or being more specific')
          );
          return {
            success: true,
            data: { query, suggestions: [] },
          };
        }

        // Display suggestions and handle interaction
        const result = await this.handleSuggestionSelection(
          suggestions,
          options
        );

        return {
          success: true,
          data: {
            query,
            suggestions,
            selected: result.selected,
            executed: result.executed,
            output: result.output,
          },
        };
      } catch (error) {
        spinner.fail('Failed to get suggestions');
        const errorMessage =
          error instanceof Error ? error.message : String(error);

        console.log(chalk.red(`❌ Error: ${errorMessage}`));

        // Provide helpful suggestions
        if (errorMessage.includes('not available')) {
          console.log(chalk.yellow('💡 Try running: aia copilot-check'));
          console.log(
            chalk.gray('   This will verify GitHub Copilot CLI setup')
          );
        }

        return {
          success: false,
          error: errorMessage,
          data: { query },
        };
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      console.log(chalk.red(`❌ Unexpected error: ${errorMessage}`));
      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  /**
   * Returns command definition for registration and help.
   */
  getDefinition(): CommandDefinition {
    return {
      name: 'suggest',
      description: 'Get command suggestions using GitHub Copilot CLI',
      usage: 'aia suggest <description>',
      examples: [
        'aia suggest "find all Python files modified in the last week"',
        'aia suggest "compress all images in current directory"',
        'aia suggest "create a backup of the database"',
        'aia suggest "show git commits from last month"',
      ],
      aliases: ['sug'],
      options: [
        {
          name: 'limit',
          description: 'Maximum number of suggestions to show',
          type: 'number',
          default: 5,
        },
        {
          name: 'no-context',
          description: 'Do not include project context in suggestions',
          type: 'boolean',
          default: false,
        },
        {
          name: 'no-safety-check',
          description:
            'Skip safety warnings for potentially dangerous commands',
          type: 'boolean',
          default: false,
        },
        {
          name: 'no-fallback',
          description: 'Disable AI fallback when Copilot is unavailable',
          type: 'boolean',
          default: false,
        },
        {
          name: 'auto-execute',
          description: 'Automatically execute the first safe suggestion',
          type: 'boolean',
          default: false,
        },
      ],
    };
  }

  /**
   * Returns the command name.
   */
  getName(): string {
    return 'suggest';
  }

  /**
   * Returns command aliases.
   */
  getAliases(): string[] {
    return ['sug', 'rec'];
  }

  /**
   * Validates command arguments.
   */
  validateArgs(args: string[]): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (args.length === 0) {
      errors.push('Description of what you want to do is required');
    }

    // Validate that the description doesn't contain only whitespace
    if (args.length > 0 && args.join(' ').trim() === '') {
      errors.push('Description cannot be empty or only whitespace');
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Provides help information for the command.
   */
  getHelp(): string {
    const definition = this.getDefinition();

    const help = [
      chalk.bold('🤖 Command Suggestion Tool'),
      '',
      chalk.bold('Description:'),
      `  ${definition.description}`,
      '',
      chalk.bold('Usage:'),
      `  ${chalk.cyan(definition.usage)}`,
      '',
      chalk.bold('Examples:'),
      ...definition.examples!.map((example) => `  ${chalk.gray(example)}`),
      '',
      chalk.bold('Options:'),
      ...definition.options!.map(
        (option) =>
          `  ${chalk.yellow(`--${option.name}`)}  ${option.description}`
      ),
      '',
      chalk.bold('Features:'),
      '  • 🤖 Powered by GitHub Copilot CLI',
      '  • 🎯 Context-aware suggestions',
      '  • ⚠️  Safety checks for dangerous commands',
      '  • 🔄 AI fallback when Copilot unavailable',
      '  • 🖱️  Interactive command selection',
      '  • ⚡ Direct command execution',
      '',
      chalk.bold('Safety Levels:'),
      `  ${chalk.green('●')} Safe - Execute without confirmation`,
      `  ${chalk.yellow('●')} Caution - Requires user confirmation`,
      `  ${chalk.red('●')} Dangerous - Strong warning and confirmation`,
      '',
      chalk.bold('Tips:'),
      '  • Be specific in your descriptions for better suggestions',
      '  • Include context like file types or directory names',
      '  • Use --auto-execute for safe, repetitive tasks',
    ];

    return help.join('\\n');
  }

  /**
   * Private helper methods
   */

  private convertToCommandContext(aiaContext: any): any {
    return {
      workingDirectory: aiaContext.workingDirectory || process.cwd(),
      projectType: aiaContext.projectType || 'unknown',
      filesContext: [], // Could be enhanced with file listing
      gitContext: aiaContext.gitStatus
        ? {
            branch: 'unknown',
            hasChanges: aiaContext.gitStatus.includes('modified'),
          }
        : undefined,
      environmentContext: {
        platform: aiaContext.platform,
        shell: aiaContext.shell,
      },
      recentCommands: [], // Could be enhanced with command history
      userPreferences: {},
    };
  }

  private async handleSuggestionSelection(
    suggestions: any[],
    options: CommandOptions
  ): Promise<{
    selected?: any;
    executed: boolean;
    output?: string;
  }> {
    // Auto-execute first safe suggestion if enabled
    if (options['auto-execute']) {
      const safeSuggestion = suggestions.find((s) => s.safetyLevel === 'safe');
      if (safeSuggestion) {
        console.log(
          chalk.green(
            `🚀 Auto-executing: ${chalk.cyan(safeSuggestion.command)}`
          )
        );
        const output = await this.executeCommand(safeSuggestion.command);
        return { selected: safeSuggestion, executed: true, output };
      }
    }

    // Display suggestions
    this.displaySuggestions(suggestions);

    // Interactive selection
    const choices = [
      ...suggestions.map((s, i) => ({
        name: this.formatSuggestionChoice(s, i + 1),
        value: { action: 'execute', suggestion: s },
      })),
      { name: chalk.gray('❌ Cancel'), value: { action: 'cancel' } },
    ];

    const { selected } = await inquirer.prompt([
      {
        type: 'list',
        name: 'selected',
        message: 'Select a command to execute:',
        choices,
        pageSize: 10,
      },
    ]);

    if (selected.action === 'cancel') {
      console.log(chalk.gray('Operation cancelled'));
      return { executed: false };
    }

    // Handle command execution with safety checks
    const suggestion = selected.suggestion;

    if (suggestion.requiresConfirmation || suggestion.safetyLevel !== 'safe') {
      const confirmed = await this.confirmExecution(suggestion);
      if (!confirmed) {
        console.log(chalk.gray('Execution cancelled'));
        return { selected: suggestion, executed: false };
      }
    }

    console.log(chalk.blue(`🔧 Executing: ${chalk.cyan(suggestion.command)}`));
    const output = await this.executeCommand(suggestion.command);

    return { selected: suggestion, executed: true, output };
  }

  private displaySuggestions(suggestions: any[]): void {
    console.log('\\n' + chalk.bold('💡 Command Suggestions'));
    console.log(chalk.gray('─'.repeat(50)));

    suggestions.forEach((suggestion, index) => {
      const safetyIcon = this.getSafetyIcon(suggestion.safetyLevel);
      const confidenceBar = this.getConfidenceBar(suggestion.confidence);

      console.log(
        `\\n${chalk.bold(`${index + 1}.`)} ${safetyIcon} ${chalk.cyan(
          suggestion.command
        )}`
      );
      console.log(`   ${suggestion.description}`);
      console.log(
        `   ${chalk.gray('Confidence:')} ${confidenceBar} ${chalk.gray(
          `(${Math.round(suggestion.confidence * 100)}%)`
        )}`
      );

      if (suggestion.tags.length > 0) {
        console.log(
          `   ${chalk.gray('Tags:')} ${suggestion.tags
            .map((tag: string) => chalk.blue(tag))
            .join(', ')}`
        );
      }

      if (suggestion.notes) {
        console.log(`   ${chalk.gray('Note:')} ${suggestion.notes}`);
      }
    });

    console.log('\\n' + chalk.gray('─'.repeat(50)));
  }

  private formatSuggestionChoice(suggestion: any, index: number): string {
    const safetyIcon = this.getSafetyIcon(suggestion.safetyLevel);
    const confidence = Math.round(suggestion.confidence * 100);
    return `${index}. ${safetyIcon} ${chalk.cyan(
      suggestion.command
    )} ${chalk.gray(`(${confidence}%)`)}`;
  }

  private getSafetyIcon(safetyLevel: string): string {
    switch (safetyLevel) {
      case 'safe':
        return chalk.green('●');
      case 'caution':
        return chalk.yellow('⚠️');
      case 'dangerous':
        return chalk.red('🚨');
      default:
        return chalk.gray('○');
    }
  }

  private getConfidenceBar(confidence: number): string {
    const barLength = 10;
    const filledLength = Math.round(confidence * barLength);
    const filled = '█'.repeat(filledLength);
    const empty = '░'.repeat(barLength - filledLength);

    const color =
      confidence > 0.8
        ? chalk.green
        : confidence > 0.6
        ? chalk.yellow
        : chalk.red;

    return color(filled) + chalk.gray(empty);
  }

  private async confirmExecution(suggestion: any): Promise<boolean> {
    const messages = [];

    if (suggestion.safetyLevel === 'dangerous') {
      messages.push(
        chalk.red('🚨 WARNING: This command is potentially dangerous!')
      );
    } else if (suggestion.safetyLevel === 'caution') {
      messages.push(
        chalk.yellow('⚠️  CAUTION: This command requires careful review')
      );
    }

    if (suggestion.notes) {
      messages.push(chalk.gray(`Note: ${suggestion.notes}`));
    }

    if (messages.length > 0) {
      console.log('\\n' + messages.join('\\n'));
    }

    console.log(`\\nCommand: ${chalk.cyan(suggestion.command)}`);

    const { confirmed } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'confirmed',
        message: 'Do you want to execute this command?',
        default: suggestion.safetyLevel === 'safe',
      },
    ]);

    return confirmed;
  }

  private async executeCommand(command: string): Promise<string> {
    try {
      const { stdout, stderr } = await execAsync(command, {
        cwd: process.cwd(),
        timeout: 30000, // 30 second timeout
      });

      if (stdout) console.log(stdout);
      if (stderr) console.error(chalk.yellow(stderr));

      return stdout || stderr || 'Command executed successfully';
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      console.error(chalk.red(`❌ Command failed: ${errorMessage}`));
      throw error;
    }
  }
}
