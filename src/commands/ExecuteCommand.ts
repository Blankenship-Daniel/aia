import { ICommand, CommandDefinition } from '../interfaces/ICommand';
import { ICommandService } from '../interfaces/ICommandService';
import { IContextService } from '../interfaces/IContextService';
import { IMemoryService } from '../interfaces/IMemoryService';
import { CommandResult, CommandOptions, CommandOption } from '../types/index';
import chalk from 'chalk';
import { spawn } from 'child_process';

export class ExecuteCommand implements ICommand {
  constructor(
    private commandService: ICommandService,
    private contextService: IContextService,
    private memoryService: IMemoryService
  ) {}

  /**
   * Execute the command
   */
  public async execute(
    context: Record<string, unknown>,
    args: string[],
    options: CommandOptions
  ): Promise<CommandResult> {
    try {
      const command = args.join(' ').trim();

      if (!command) {
        return {
          success: false,
          error: 'Please provide a command to execute',
        };
      }

      // Get current context
      const contextResult = await this.contextService.gatherContext();
      const context = contextResult;

      // Validate command safety
      if (!options.force) {
        const validationResult =
          await this.commandService.validateCommandSafety(command);
        if (!validationResult.safe) {
          return {
            success: false,
            error: `Command safety validation failed: ${validationResult.warnings.join(
              ', '
            )}`,
          };
        }
      }

      // Optimize command if not disabled
      let finalCommand = command;
      if (!options['no-optimize']) {
        const optimizationResult = await this.commandService.optimizeCommand(
          command,
          context
        );
        if (optimizationResult.applied) {
          finalCommand = optimizationResult.optimized;
          if (optimizationResult.reason && !options.quiet) {
            console.log(
              chalk.yellow(
                `💡 Optimization applied: ${optimizationResult.reason}`
              )
            );
          }
        }
      }

      // Execute command
      console.log(chalk.dim(`Executing: ${finalCommand}`));

      const executionResult = await this.executeShellCommand(
        finalCommand,
        options
      );

      // Store command in history
      await this.memoryService.addCommand(
        finalCommand,
        process.cwd(),
        executionResult.exitCode,
        executionResult.duration
      );

      return {
        success: executionResult.exitCode === 0,
        data: {
          command: finalCommand,
          exitCode: executionResult.exitCode,
          duration: executionResult.duration,
          output: executionResult.output,
        },
        output: executionResult.output,
        error:
          executionResult.exitCode !== 0
            ? `Command exited with code ${executionResult.exitCode}`
            : undefined,
      };
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error ? error.message : 'Command execution failed',
      };
    }
  }

  private async executeShellCommand(
    command: string,
    options: CommandOptions
  ): Promise<{ exitCode: number; duration: number; output: string }> {
    return new Promise((resolve) => {
      const startTime = Date.now();
      let output = '';

      const shell = process.platform === 'win32' ? 'cmd.exe' : '/bin/sh';
      const shellArgs =
        process.platform === 'win32' ? ['/c', command] : ['-c', command];

      const child = spawn(shell, shellArgs, {
        stdio: options.quiet ? ['inherit', 'pipe', 'pipe'] : 'inherit',
        shell: true,
      });

      if (options.quiet) {
        child.stdout?.on('data', (data) => {
          output += data.toString();
        });

        child.stderr?.on('data', (data) => {
          output += data.toString();
        });
      }

      child.on('close', (code) => {
        const duration = Date.now() - startTime;
        resolve({
          exitCode: code || 0,
          duration,
          output,
        });
      });

      child.on('error', (error) => {
        const duration = Date.now() - startTime;
        resolve({
          exitCode: 1,
          duration,
          output: error.message,
        });
      });
    });
  }

  public validate(args: string[], options: CommandOptions): string | null {
    if (args.length === 0) {
      return 'Command is required';
    }

    return null;
  }

  public getUsage(): string {
    return 'exec <command> [options]';
  }

  public getOptions() {
    return [
      {
        name: 'no-optimize',
        description: 'Disable command optimization',
        type: 'boolean',
        required: false,
        default: false,
      },
      {
        name: 'force',
        description: 'Skip safety validation',
        type: 'boolean',
        required: false,
        default: false,
      },
      {
        name: 'quiet',
        description: 'Suppress command output',
        type: 'boolean',
        required: false,
        default: false,
      },
      {
        name: 'dry-run',
        description: 'Show what would be executed without running',
        type: 'boolean',
        required: false,
        default: false,
      },
    ];
  }

  /**
   * Get command definition
   */
  public getDefinition(): CommandDefinition {
    return {
      name: 'exec',
      description: 'Execute terminal commands with optimization',
      usage: 'exec <command> [options]',
      aliases: ['x', 'execute'],
      examples: this.getExamples(),
      options: this.getOptions().map((opt) => ({
        name: opt.name,
        description: opt.description,
        type: opt.type as 'string' | 'number' | 'boolean',
        required: opt.required,
        default: opt.default,
      })),
    };
  }

  /**
   * Get command name
   */
  public getName(): string {
    return 'exec';
  }

  /**
   * Get command aliases
   */
  public getAliases(): string[] {
    return ['x', 'execute'];
  }

  /**
   * Validate command arguments
   */
  public validateArgs(args: string[]): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (args.length === 0) {
      errors.push('Command is required');
    }

    const command = args.join(' ').trim();
    if (!command) {
      errors.push('Command cannot be empty');
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Get help text for the command
   */
  public getHelp(): string {
    return `
Usage: exec <command> [options]

Execute terminal commands with optimization and safety validation.

Options:
  --no-optimize       Disable command optimization
  --force             Skip safety validation
  --quiet             Suppress command output
  --dry-run           Show what would be executed without running

Examples:
  aia exec "npm test"
  aia exec "git status" --no-optimize
  aia x "rm -rf node_modules" --force
    `.trim();
  }

  /**
   * Get command examples
   */
  public getExamples(): string[] {
    return [
      'exec ls -la',
      'exec --no-optimize npm install',
      'exec --dry-run rm -rf node_modules',
    ];
  }
}
