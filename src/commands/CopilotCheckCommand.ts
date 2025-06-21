/**
 * CopilotCheckCommand.ts - Diagnostic command for GitHub Copilot CLI setup verification.
 *
 * Responsibilities:
 * - Verifies GitHub CLI installation and configuration.
 * - Checks GitHub Copilot CLI extension availability.
 * - Validates user authentication and Copilot access.
 * - Provides detailed installation and setup instructions.
 *
 * Architecture:
 * - Implements ICommand interface following AIA's command patterns.
 * - Uses dependency injection for Copilot dependency service.
 * - Provides user-friendly diagnostics and guidance.
 * - Integrates with existing AIA help and documentation system.
 *
 * @see ICopilotDependencyService - Service for dependency checking.
 * @see ICommand - Base command interface.
 */

import { ICommand, CommandDefinition } from '../interfaces/ICommand';
import { ICopilotDependencyService } from '../interfaces/ICopilotDependencyService';
import { CommandResult, CommandOptions } from '../types/index';
import chalk from 'chalk';
import ora from 'ora';

export class CopilotCheckCommand implements ICommand {
  constructor(private copilotDependencyService: ICopilotDependencyService) {}

  /**
   * Executes the Copilot check command.
   */
  async execute(
    context: Record<string, unknown>,
    args: string[],
    options: CommandOptions
  ): Promise<CommandResult> {
    try {
      console.log(chalk.bold('🔍 GitHub Copilot CLI Setup Check'));
      console.log(chalk.gray('─'.repeat(50)));

      const spinner = ora(
        'Checking GitHub Copilot CLI dependencies...'
      ).start();

      try {
        const status = await this.copilotDependencyService.checkDependencies();
        spinner.succeed('Dependency check completed');

        // Display results
        this.displayStatus(status);

        // Provide instructions if needed
        if (!this.isFullyConfigured(status)) {
          console.log('\n' + chalk.bold('📋 Setup Instructions:'));
          console.log(chalk.gray('─'.repeat(30)));
          const instructions =
            await this.copilotDependencyService.getInstallInstructions(status);
          console.log(instructions);
        } else {
          console.log(
            '\\n' + chalk.green('✅ GitHub Copilot CLI is ready to use!')
          );
        }

        return {
          success: true,
          data: { status, fullyConfigured: this.isFullyConfigured(status) },
        };
      } catch (error) {
        spinner.fail('Dependency check failed');
        const errorMessage =
          error instanceof Error ? error.message : String(error);

        console.log(chalk.red(`❌ Error: ${errorMessage}`));

        return {
          success: false,
          error: errorMessage,
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
      name: 'copilot-check',
      description: 'Check GitHub Copilot CLI setup and dependencies',
      usage: 'aia copilot-check',
      examples: ['aia copilot-check'],
      aliases: ['check-copilot', 'gh-check'],
      options: [],
    };
  }

  /**
   * Returns the command name.
   */
  getName(): string {
    return 'copilot-check';
  }

  /**
   * Returns command aliases.
   */
  getAliases(): string[] {
    return ['check-copilot', 'gh-check'];
  }

  /**
   * Validates command arguments.
   */
  validateArgs(args: string[]): { valid: boolean; errors: string[] } {
    // No arguments needed for this command
    return { valid: true, errors: [] };
  }

  /**
   * Provides help information for the command.
   */
  getHelp(): string {
    const help = [
      chalk.bold('🔍 GitHub Copilot CLI Setup Checker'),
      '',
      chalk.bold('Description:'),
      '  Verifies that GitHub Copilot CLI is properly installed and configured',
      '',
      chalk.bold('Usage:'),
      `  ${chalk.cyan('aia copilot-check')}`,
      '',
      chalk.bold('What this command checks:'),
      '  • GitHub CLI (gh) installation',
      '  • GitHub Copilot CLI extension',
      '  • User authentication status',
      '  • Copilot subscription access',
      '',
      chalk.bold('Example output:'),
      '  ✅ GitHub CLI: Installed (v2.40.0)',
      '  ✅ Copilot Extension: Installed',
      '  ✅ Authentication: Logged in as username',
      '  ✅ Copilot Access: Active subscription',
      '',
      chalk.bold('If issues are found:'),
      '  • Detailed installation instructions will be provided',
      '  • Platform-specific commands will be suggested',
      '  • Links to documentation will be included',
    ];

    return help.join('\\n');
  }

  /**
   * Private helper methods
   */

  private displayStatus(status: any): void {
    console.log('\n' + chalk.bold('📊 Status Report:'));

    // GitHub CLI status
    const ghIcon = status.gh ? chalk.green('✅') : chalk.red('❌');
    console.log(
      `${ghIcon} GitHub CLI: ${status.gh ? 'Installed' : 'Not found'}`
    );

    // Copilot extension status
    const copilotIcon = status.copilot ? chalk.green('✅') : chalk.red('❌');
    console.log(
      `${copilotIcon} Copilot Extension: ${
        status.copilot ? 'Installed' : 'Not found'
      }`
    );

    // Authentication status
    const authIcon = status.authenticated ? chalk.green('✅') : chalk.red('❌');
    console.log(
      `${authIcon} Authentication: ${
        status.authenticated ? 'Logged in' : 'Not authenticated'
      }`
    );

    // Copilot access status
    const accessIcon = status.copilotAccess
      ? chalk.green('✅')
      : chalk.red('❌');
    console.log(
      `${accessIcon} Copilot Access: ${
        status.copilotAccess ? 'Active' : 'No access'
      }`
    );

    // Overall status
    if (this.isFullyConfigured(status)) {
      console.log('\n' + chalk.green('🎉 Overall Status: Ready to use!'));
    } else {
      console.log('\n' + chalk.yellow('⚠️  Overall Status: Setup required'));
    }

    if (status.message) {
      console.log(`\n${chalk.bold('Message:')} ${status.message}`);
    }

    if (status.errors && status.errors.length > 0) {
      console.log(`\n${chalk.bold('Issues found:')}`);
      status.errors.forEach((error: string) => {
        console.log(`  ${chalk.red('•')} ${error}`);
      });
    }
  }

  private isFullyConfigured(status: any): boolean {
    return (
      status.gh &&
      status.copilot &&
      status.authenticated &&
      status.copilotAccess
    );
  }
}
