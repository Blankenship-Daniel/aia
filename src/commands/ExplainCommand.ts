/**
 * ExplainCommand.ts - Command explanation using GitHub Copilot CLI integration.
 *
 * Responsibilities:
 * - Provides detailed command explanations using GitHub Copilot CLI.
 * - Stores explanations in memory for future reference and learning.
 * - Displays formatted explanations with components, examples, and warnings.
 * - Integrates with AIA's existing command structure and memory system.
 *
 * Architecture:
 * - Implements ICommand interface following AIA's command patterns.
 * - Uses dependency injection for Copilot and memory services.
 * - Provides user-friendly output with progress indicators and error handling.
 * - Supports caching and fallback mechanisms for reliability.
 *
 * @see ICopilotService - Service for GitHub Copilot CLI integration.
 * @see IMemoryService - Memory management for storing explanations.
 * @see ICommand - Base command interface.
 */

import { ICommand, CommandDefinition } from '../interfaces/ICommand';
import { ICopilotService } from '../interfaces/ICopilotService';
import { IMemoryService } from '../interfaces/IMemoryService';
import { CommandResult, CommandOptions, CommandOption } from '../types/index';
// @ts-ignore - chalk may not have types available
const { Chalk } = require('chalk');
// Instantiate Chalk for color methods in CommonJS context
const chalk = new Chalk({ level: 3 });
import ora from 'ora';

/**
 * ExplainCommand class
 * 
 * TODO: Add class description
 */
export class ExplainCommand implements ICommand {
  constructor(
    private copilotService: ICopilotService,
    private memoryService: IMemoryService
  ) {}

  /**
   * Executes the explain command with GitHub Copilot integration.
   */
  async execute(
    context: Record<string, unknown>,
    args: string[],
    options: CommandOptions
  ): Promise<CommandResult> {
    try {
      if (args.length === 0) {
        console.log(chalk.red('❌ Please provide a command to explain'));
        console.log(chalk.gray('Usage: aia explain <command>'));
        console.log(chalk.gray('Example: aia explain "git rebase -i HEAD~3"'));
        return {
          success: false,
          error: 'No command provided',
          data: { usage: 'aia explain <command>' },
        };
      }

      const command = args.join(' ');
      const spinner = ora(`Explaining command: ${chalk.cyan(command)}`).start();

      try {
        // Get explanation from Copilot service
        const explanation = await this.copilotService.explain(command, {
          useAIFallback: options.fallback !== false,
          safetyCheck: options.safetyCheck !== false,
        });

        spinner.succeed('Command explained successfully');

        // Display formatted explanation
        this.displayExplanation(explanation);

        // Store in memory for future reference
        await this.storeExplanation(command, explanation);

        return {
          success: true,
          data: {
            command,
            explanation: explanation.explanation,
            components: explanation.components,
            examples: explanation.examples,
            warnings: explanation.warnings,
          },
        };
      } catch (error) {
        spinner.fail('Failed to explain command');
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
          data: { command },
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
      name: 'explain',
      description: 'Explain commands using GitHub Copilot CLI',
      usage: 'aia explain <command>',
      examples: [
        'aia explain "git rebase -i HEAD~3"',
        "aia explain \"find . -name '*.js' -exec grep -l 'TODO' {} \\;\"",
        'aia explain "docker-compose up -d --build"',
        'aia explain "rsync -avz --progress source/ destination/"',
      ],
      options: [
        {
          name: 'no-fallback',
          description: 'Disable AI fallback when Copilot is unavailable',
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
          name: 'cache',
          description: 'Use cached explanation if available',
          type: 'boolean',
          default: true,
        },
      ],
    };
  }

  /**
   * Returns the command name.
   */
  getName(): string {
    return 'explain';
  }

  /**
   * Returns command aliases.
   */
  getAliases(): string[] {
    return ['exp'];
  }

  /**
   * Validates command arguments.
   */
  validateArgs(args: string[]): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (args.length === 0) {
      errors.push('Command to explain is required');
    }

    // Validate that the command doesn't contain only whitespace
    if (args.length > 0 && args.join(' ').trim() === '') {
      errors.push('Command cannot be empty or only whitespace');
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
      chalk.bold('📖 Command Explanation Tool'),
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
      '  • 💾 Automatic caching for performance',
      '  • 🔄 AI fallback when Copilot unavailable',
      '  • ⚠️  Safety warnings for dangerous commands',
      '  • 🧠 Memory integration for learning',
      '',
      chalk.bold('Tips:'),
      '  • Quote complex commands to prevent shell interpretation',
      '  • Use aia copilot-check to verify Copilot setup',
      '  • Explanations are cached for faster repeated access',
    ];

    return help.join('\\n');
  }

  /**
   * Private helper methods
   */

  private displayExplanation(result: any): void {
    console.log('\n' + chalk.bold('📖 Command Explanation'));
    console.log(chalk.gray('─'.repeat(50)));

    console.log(chalk.bold('\n🔧 Command:'));
    console.log(`  ${chalk.cyan(result.command)}`);

    console.log(chalk.bold('\n💡 Explanation:'));
    console.log(`  ${result.explanation}`);

    if (result.components?.length > 0) {
      console.log(chalk.bold('\n🔍 Components:'));
      result.components.forEach((comp: any) => {
        console.log(`  ${chalk.yellow(comp.part)}: ${comp.description}`);
      });
    }

    if (result.examples?.length > 0) {
      console.log(chalk.bold('\n📝 Examples:'));
      result.examples.forEach((ex: string) => {
        console.log(`  ${chalk.gray(ex)}`);
      });
    }

    if (result.warnings?.length > 0) {
      console.log(chalk.bold('\n⚠️  Warnings:'));
      result.warnings.forEach((warning: string) => {
        console.log(`  ${chalk.red(warning)}`);
      });
    }

    if (result.relatedCommands?.length > 0) {
      console.log(chalk.bold('\n🔗 Related Commands:'));
      result.relatedCommands.forEach((cmd: string) => {
        console.log(`  ${chalk.blue(cmd)}`);
      });
    }

    if (result.confidence) {
      const confidencePercent = Math.round(result.confidence * 100);
      const confidenceColor =
        result.confidence > 0.8
          ? chalk.green
          : result.confidence > 0.6
          ? chalk.yellow
          : chalk.red;
      console.log(
        `\\n${chalk.bold('🎯 Confidence:')} ${confidenceColor(
          confidencePercent + '%'
        )}`
      );
    }

    console.log('\n' + chalk.gray('─'.repeat(50)));
  }

  private async storeExplanation(
    command: string,
    explanation: any
  ): Promise<void> {
    try {
      // Store as a conversation entry since there's no addEntry method
      const basicContext = {
        workingDirectory: process.cwd(),
        platform: process.platform,
        arch: process.arch,
        nodeVersion: process.version,
        user: process.env.USER || process.env.USERNAME || 'unknown',
        shell: process.env.SHELL || 'unknown',
        timestamp: new Date().toISOString(),
        projectType: 'unknown',
        projectInfo: {},
        gitStatus: 'unknown',
        environmentScore: 1.0,
      };

      await this.memoryService.addConversation(
        `Explain: ${command}`,
        `${explanation.explanation}\\n\\nComponents: ${JSON.stringify(
          explanation.components
        )}`,
        basicContext
      );
    } catch (error) {
      // Non-fatal error - log but don't fail the command
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      console.log(
        chalk.gray(
          `Warning: Failed to store explanation in memory: ${errorMessage}`
        )
      );
    }
  }
}
