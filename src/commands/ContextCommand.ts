/**
 * Context Command Implementation
 * Shows current environment context
 */
import { ICommand, CommandDefinition } from '../interfaces/ICommand';
import { IContextService } from '../interfaces/IContextService';
import { CommandContext, CommandResult, CommandOptions } from '../types/index';

/**
 * ContextCommand class
 * 
 * TODO: Add class description
 */
export class ContextCommand implements ICommand {
  private contextService: IContextService;
  private logger?: any;

  /**
   * Creates an instance of the class
   * 
   * @param contextService - Parameter description
   * @param logger? - Parameter description
   */
  constructor(contextService: IContextService, logger?: any) {
    this.contextService = contextService;
    this.logger = logger;
  }

  /**
   * Get command definition
   */
  getDefinition(): CommandDefinition {
    return {
      name: 'context',
      description: 'Show current environment context and project information',
      aliases: ['ctx', 'info'],
      usage: 'context [--json] [--verbose]',
      examples: ['context', 'context --json', 'context --verbose'],
      options: [
        {
          name: 'json',
          description: 'Output in JSON format',
          type: 'boolean',
          default: false,
        },
        {
          name: 'verbose',
          description: 'Show detailed information',
          type: 'boolean',
          default: false,
        },
      ],
    };
  }

  /**
   * Get command name
   */
  getName(): string {
    return 'context';
  }

  /**
   * Get command aliases
   */
  getAliases(): string[] {
    return ['ctx', 'info'];
  }

  /**
   * Validate command arguments
   */
  validateArgs(args: string[]): { valid: boolean; errors: string[] } {
    // Context command doesn't require specific arguments
    return { valid: true, errors: [] };
  }

  /**
   * Get command help text
   */
  getHelp(): string {
    return `
Usage: context [--json] [--verbose]

Show current environment context and project information.

Options:
  --json        Output in JSON format
  --verbose     Show detailed information including dependencies, metrics, and security status

Examples:
  context                  Show basic context information
  context --json          Output context as JSON
  context --verbose       Show detailed context information
    `.trim();
  }

  /**
   * Execute the context command
   */
  async execute(
    context: Record<string, unknown>,
    args: string[],
    options: CommandOptions
  ): Promise<CommandResult> {
    try {
      this.logger?.info('Gathering context information');

      // Get current context
      const currentContext = await this.contextService.gatherContext();

      if (options.json) {
        // Return JSON format
        console.log(JSON.stringify(currentContext, null, 2));
        return {
          success: true,
          data: currentContext,
        };
      }

      // Format and display context
      this.displayContext(currentContext, options.verbose as boolean);
      return {
        success: true,
        data: currentContext,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger?.error('Failed to gather context:', errorMessage);

      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  /**
   * Display formatted context information
   */
  private displayContext(context: any, verbose: boolean = false): void {
    const chalk = require('chalk');

    console.log(chalk.cyan.bold('📍 Current Context'));
    console.log('');

    // Basic information
    console.log(
      chalk.yellow('Directory:'),
      context.workingDirectory || 'Unknown'
    );
    console.log(
      chalk.yellow('Platform:'),
      `${context.platform || 'Unknown'} (${context.arch || 'Unknown'})`
    );
    console.log(chalk.yellow('User:'), context.user || 'Unknown');
    console.log(chalk.yellow('Shell:'), context.shell || 'Unknown');

    if (context.projectType) {
      console.log(chalk.yellow('Project Type:'), context.projectType);
    }

    // Git information
    if (context.gitStatus) {
      console.log('');
      console.log(chalk.green.bold('🔀 Git Status'));
      if (typeof context.gitStatus === 'string') {
        console.log(context.gitStatus);
      } else {
        console.log(JSON.stringify(context.gitStatus, null, 2));
      }
    }

    // Project information
    if (context.projectInfo && Object.keys(context.projectInfo).length > 0) {
      console.log('');
      console.log(chalk.blue.bold('📦 Project Information'));

      if (context.projectInfo.name) {
        console.log(chalk.yellow('Name:'), context.projectInfo.name);
      }
      if (context.projectInfo.version) {
        console.log(chalk.yellow('Version:'), context.projectInfo.version);
      }
      if (context.projectInfo.description) {
        console.log(
          chalk.yellow('Description:'),
          context.projectInfo.description
        );
      }

      // Dependencies (if verbose)
      if (verbose && context.projectInfo.dependencies) {
        console.log('');
        console.log(chalk.yellow('Dependencies:'));
        const deps = context.projectInfo.dependencies;
        for (const [name, version] of Object.entries(deps)) {
          console.log(`  ${name}: ${version}`);
        }
      }
    }

    // Environment score
    if (context.environmentScore !== undefined) {
      console.log('');
      console.log(
        chalk.yellow('Environment Score:'),
        this.formatScore(context.environmentScore)
      );
    }

    // Performance metrics (if verbose)
    if (verbose && context.performanceMetrics) {
      console.log('');
      console.log(chalk.magenta.bold('⚡ Performance Metrics'));
      const metrics = context.performanceMetrics;
      for (const [key, value] of Object.entries(metrics)) {
        console.log(chalk.yellow(`${key}:`), value);
      }
    }

    // Security status (if verbose)
    if (verbose && context.securityStatus) {
      console.log('');
      console.log(chalk.red.bold('🔒 Security Status'));
      const security = context.securityStatus;
      for (const [key, value] of Object.entries(security)) {
        console.log(chalk.yellow(`${key}:`), value);
      }
    }

    console.log('');
  }

  /**
   * Format environment score with color coding
   */
  private formatScore(score: number): string {
    const chalk = require('chalk');

    if (score >= 0.8) {
      return chalk.green(`${(score * 100).toFixed(1)}% (Excellent)`);
    } else if (score >= 0.6) {
      return chalk.yellow(`${(score * 100).toFixed(1)}% (Good)`);
    } else if (score >= 0.4) {
      return chalk.orange(`${(score * 100).toFixed(1)}% (Fair)`);
    } else {
      return chalk.red(`${(score * 100).toFixed(1)}% (Poor)`);
    }
  }
}
