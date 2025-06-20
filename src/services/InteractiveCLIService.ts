/**
 * Interactive CLI Service
 * Provides enhanced interactive mode with command suggestions and auto-completion
 */
import {
  ICommandIntelligenceService,
  CommandContext,
  CommandSuggestion,
} from '../interfaces/ICommandIntelligenceService.js';
import { IContextService } from '../interfaces/IContextService.js';
import { ICommandService } from '../interfaces/ICommandService.js';
import { IConfigurationService } from '../interfaces/IConfigurationService.js';
import { ICommandRegistry } from '../interfaces/ICommandRegistry.js';
import * as readline from 'readline';
import chalk from 'chalk';
import * as fs from 'fs-extra';
import * as path from 'path';

export interface InteractiveCLIOptions {
  enableSuggestions: boolean;
  enableAutoCompletion: boolean;
  enableWelcomeMessage: boolean;
  maxSuggestions: number;
}

export class InteractiveCLIService {
  private rl: readline.Interface | null = null;
  private isInteractive: boolean = false;
  private currentContext: CommandContext | null = null;
  private options: InteractiveCLIOptions;

  constructor(
    private commandIntelligence: ICommandIntelligenceService,
    private contextService: IContextService,
    private commandService: ICommandService,
    private configurationService: IConfigurationService,
    private commandRegistry: ICommandRegistry
  ) {
    this.options = {
      enableSuggestions: true,
      enableAutoCompletion: true,
      enableWelcomeMessage: true,
      maxSuggestions: 5,
    };
  }

  /**
   * Start interactive mode
   */
  async startInteractiveMode(): Promise<void> {
    if (this.isInteractive) {
      return;
    }

    this.isInteractive = true;
    await this.initializeContext();
    await this.setupReadline();

    if (this.options.enableWelcomeMessage) {
      await this.displayWelcomeMessage();
    }

    await this.startPromptLoop();
  }

  /**
   * Stop interactive mode
   */
  async stopInteractiveMode(): Promise<void> {
    if (!this.isInteractive) {
      return;
    }

    this.isInteractive = false;
    if (this.rl) {
      this.rl.close();
      this.rl = null;
    }
  }

  /**
   * Initialize command context
   */
  private async initializeContext(): Promise<void> {
    try {
      const workingDirectory = process.cwd();
      const recentCommands = await this.getRecentCommands();

      this.currentContext = {
        workingDirectory,
        projectType: await this.detectProjectType(workingDirectory),
        recentCommands,
        gitStatus: await this.getGitStatus(workingDirectory),
        packageInfo: await this.getPackageInfo(workingDirectory),
      };
    } catch (error) {
      console.warn('Failed to initialize context:', error);
      this.currentContext = {
        workingDirectory: process.cwd(),
        recentCommands: [],
      };
    }
  }

  /**
   * Setup readline interface with auto-completion
   */
  private async setupReadline(): Promise<void> {
    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
      completer: this.options.enableAutoCompletion
        ? this.completer.bind(this)
        : undefined,
      prompt: chalk.cyan('aia> '),
    });

    // Handle Ctrl+C gracefully
    this.rl.on('SIGINT', () => {
      console.log(
        chalk.yellow('\nUse "exit" or "quit" to leave interactive mode')
      );
      this.rl?.prompt();
    });
  }

  /**
   * Auto-completion function
   */
  private async completer(line: string): Promise<[string[], string]> {
    if (!this.currentContext) {
      return [[], line];
    }

    try {
      const result = await this.commandIntelligence.getAutoCompletion(
        line,
        this.currentContext
      );
      return [result.completions, line];
    } catch (error) {
      return [[], line];
    }
  }

  /**
   * Display welcome message with suggestions
   */
  private async displayWelcomeMessage(): Promise<void> {
    console.log(chalk.bold.blue('\n🤖 AIA Interactive Mode'));
    console.log(
      chalk.gray('Type "help" for available commands, "exit" to quit\n')
    );

    if (this.currentContext) {
      // Display context information
      console.log(chalk.blue('📁 Project Context:'));
      console.log(
        `  Directory: ${chalk.cyan(this.currentContext.workingDirectory)}`
      );

      if (this.currentContext.projectType) {
        console.log(`  Type: ${chalk.green(this.currentContext.projectType)}`);
      }

      if (this.currentContext.gitStatus?.currentBranch) {
        console.log(
          `  Git: ${chalk.yellow(this.currentContext.gitStatus.currentBranch)}`
        );
      }

      // Show welcome suggestions
      try {
        const suggestions =
          await this.commandIntelligence.getWelcomeSuggestions(
            this.currentContext
          );
        if (suggestions.length > 0) {
          console.log(chalk.blue('\n💡 Recommended Commands:'));
          for (const suggestion of suggestions.slice(
            0,
            this.options.maxSuggestions
          )) {
            console.log(
              `  ${chalk.green('●')} ${chalk.cyan(suggestion.command)}`
            );
            console.log(`    ${chalk.gray(suggestion.description)}`);
            console.log(`    ${chalk.gray(suggestion.contextReason)}`);
          }
        }
      } catch (error) {
        // Suggestions failed, continue without them
      }
    }

    console.log();
  }

  /**
   * Start the interactive prompt loop
   */
  private async startPromptLoop(): Promise<void> {
    if (!this.rl) {
      return;
    }

    this.rl.prompt();

    this.rl.on('line', async (input: string) => {
      const trimmedInput = input.trim();

      if (!trimmedInput) {
        this.rl?.prompt();
        return;
      }

      // Handle special commands
      if (await this.handleSpecialCommands(trimmedInput)) {
        this.rl?.prompt();
        return;
      }

      // Process regular commands
      await this.processCommand(trimmedInput);

      // Show suggestions after command completion
      if (this.options.enableSuggestions && this.currentContext) {
        await this.showNextStepSuggestions(trimmedInput);
      }

      this.rl?.prompt();
    });

    this.rl.on('close', () => {
      console.log(chalk.yellow('\nGoodbye! 👋'));
      process.exit(0);
    });
  }

  /**
   * Handle special interactive commands
   */
  private async handleSpecialCommands(input: string): Promise<boolean> {
    switch (input.toLowerCase()) {
      case 'exit':
      case 'quit':
      case 'q':
        await this.stopInteractiveMode();
        process.exit(0);
        return true;

      case 'help':
        await this.displayHelp();
        return true;

      case 'suggestions':
      case 'suggest':
        await this.displaySuggestions();
        return true;

      case 'context':
        await this.displayContext();
        return true;

      case 'clear':
        console.clear();
        return true;

      default:
        return false;
    }
  }

  /**
   * Process a regular command
   */
  private async processCommand(input: string): Promise<void> {
    const startTime = Date.now();
    let success = false;

    try {
      // Parse command and arguments
      const parts = input.split(' ');
      const commandName = parts[0];
      const args = parts.slice(1);

      // Check if command exists
      const command = this.commandRegistry.getCommand(commandName);
      if (!command) {
        console.error(chalk.red(`Unknown command: ${commandName}`));
        await this.suggestSimilarCommands(commandName);
        return;
      }

      // Execute command
      console.log(chalk.blue(`Executing: ${input}`));
      const result = await command.execute({}, args, {});

      success = !result || result.success !== false;

      if (!success && result?.error) {
        console.error(chalk.red('Command failed:'), result.error);
      }
    } catch (error: any) {
      console.error(chalk.red('Command execution failed:'), error.message);
    } finally {
      const executionTime = Date.now() - startTime;

      // Record command usage for learning
      if (this.currentContext) {
        await this.commandIntelligence.recordCommandUsage(
          input,
          this.currentContext,
          executionTime,
          success
        );
      }
    }
  }

  /**
   * Display help information
   */
  private async displayHelp(): Promise<void> {
    console.log(chalk.bold.blue('\n📖 AIA Interactive Help'));
    console.log(chalk.gray('Available commands:\n'));

    const commands = this.commandRegistry.getCommandNames();
    for (const commandName of commands.sort()) {
      const command = this.commandRegistry.getCommand(commandName);
      if (command) {
        const definition = command.getDefinition();
        console.log(
          `  ${chalk.cyan(commandName.padEnd(12))} ${chalk.gray(
            definition.description || 'No description'
          )}`
        );
      }
    }

    console.log(chalk.gray('\nSpecial commands:'));
    console.log(
      `  ${chalk.cyan('help'.padEnd(12))} ${chalk.gray(
        'Show this help message'
      )}`
    );
    console.log(
      `  ${chalk.cyan('suggestions'.padEnd(12))} ${chalk.gray(
        'Show command suggestions'
      )}`
    );
    console.log(
      `  ${chalk.cyan('context'.padEnd(12))} ${chalk.gray(
        'Show current context'
      )}`
    );
    console.log(
      `  ${chalk.cyan('clear'.padEnd(12))} ${chalk.gray('Clear the screen')}`
    );
    console.log(
      `  ${chalk.cyan('exit'.padEnd(12))} ${chalk.gray(
        'Exit interactive mode'
      )}`
    );
    console.log();
  }

  /**
   * Display current suggestions
   */
  private async displaySuggestions(): Promise<void> {
    if (!this.currentContext) {
      console.log(chalk.yellow('No context available for suggestions'));
      return;
    }

    try {
      const suggestions = await this.commandIntelligence.getSuggestedCommands(
        this.currentContext
      );

      if (suggestions.length === 0) {
        console.log(chalk.yellow('No suggestions available'));
        return;
      }

      console.log(chalk.bold.blue('\n💡 Command Suggestions:'));
      for (const suggestion of suggestions.slice(
        0,
        this.options.maxSuggestions
      )) {
        console.log(
          `\n  ${chalk.green('●')} ${chalk.cyan(suggestion.command)}`
        );
        console.log(`    ${chalk.gray(suggestion.description)}`);
        console.log(`    ${chalk.gray('Reason:')} ${suggestion.contextReason}`);
        console.log(
          `    ${chalk.gray('Priority:')} ${this.getPriorityDisplay(
            suggestion.priority
          )}`
        );
      }
      console.log();
    } catch (error) {
      console.error(chalk.red('Failed to get suggestions:'), error);
    }
  }

  /**
   * Display current context
   */
  private async displayContext(): Promise<void> {
    if (!this.currentContext) {
      console.log(chalk.yellow('No context available'));
      return;
    }

    console.log(chalk.bold.blue('\n📋 Current Context:'));
    console.log(
      `  Directory: ${chalk.cyan(this.currentContext.workingDirectory)}`
    );

    if (this.currentContext.projectType) {
      console.log(
        `  Project Type: ${chalk.green(this.currentContext.projectType)}`
      );
    }

    if (this.currentContext.gitStatus) {
      console.log(
        `  Git Branch: ${chalk.yellow(
          this.currentContext.gitStatus.currentBranch
        )}`
      );
      console.log(
        `  Has Changes: ${
          this.currentContext.gitStatus.hasChanges
            ? chalk.red('Yes')
            : chalk.green('No')
        }`
      );
    }

    if (this.currentContext.packageInfo) {
      console.log(
        `  Package.json: ${
          this.currentContext.packageInfo.hasPackageJson
            ? chalk.green('Yes')
            : chalk.gray('No')
        }`
      );
      if (this.currentContext.packageInfo.hasPackageJson) {
        console.log(
          `  Scripts: ${this.currentContext.packageInfo.scripts.length}`
        );
        console.log(
          `  Dependencies: ${this.currentContext.packageInfo.dependencies.length}`
        );
      }
    }

    if (this.currentContext.recentCommands.length > 0) {
      console.log(
        `  Recent Commands: ${this.currentContext.recentCommands
          .slice(0, 3)
          .join(', ')}`
      );
    }

    console.log();
  }

  /**
   * Show next step suggestions after command completion
   */
  private async showNextStepSuggestions(
    completedCommand: string
  ): Promise<void> {
    if (!this.currentContext) {
      return;
    }

    try {
      const suggestions = await this.commandIntelligence.getNextStepSuggestions(
        completedCommand,
        this.currentContext
      );

      if (suggestions.length > 0) {
        console.log(chalk.blue('\n💭 Next Steps:'));
        for (const suggestion of suggestions.slice(0, 2)) {
          console.log(
            `  ${chalk.green('→')} ${chalk.cyan(suggestion.command)}`
          );
          console.log(`    ${chalk.gray(suggestion.description)}`);
        }
        console.log();
      }
    } catch (error) {
      // Suggestions failed, continue silently
    }
  }

  /**
   * Suggest similar commands for unknown commands
   */
  private async suggestSimilarCommands(unknownCommand: string): Promise<void> {
    const commands = this.commandRegistry.getCommandNames();
    const similar = commands.filter(
      (cmd) =>
        cmd.includes(unknownCommand) ||
        unknownCommand.includes(cmd) ||
        this.levenshteinDistance(cmd, unknownCommand) <= 2
    );

    if (similar.length > 0) {
      console.log(chalk.yellow('Did you mean:'));
      for (const cmd of similar.slice(0, 3)) {
        console.log(`  ${chalk.cyan(cmd)}`);
      }
    }
  }

  // Helper methods
  private async getRecentCommands(): Promise<string[]> {
    try {
      // This would typically come from command history
      return [];
    } catch (error) {
      return [];
    }
  }

  private async detectProjectType(
    workingDirectory: string
  ): Promise<string | undefined> {
    try {
      const packageJsonPath = path.join(workingDirectory, 'package.json');
      const tsconfigPath = path.join(workingDirectory, 'tsconfig.json');
      const gitPath = path.join(workingDirectory, '.git');

      if (await fs.pathExists(tsconfigPath)) {
        return 'typescript';
      }

      if (await fs.pathExists(packageJsonPath)) {
        const packageJson = await fs.readJson(packageJsonPath);
        if (
          packageJson.dependencies?.react ||
          packageJson.devDependencies?.react
        ) {
          return 'react';
        }
        return 'node';
      }

      if (await fs.pathExists(gitPath)) {
        return 'git';
      }

      return undefined;
    } catch (error) {
      return undefined;
    }
  }

  private async getGitStatus(workingDirectory: string): Promise<any> {
    try {
      const { execSync } = require('child_process');
      const branch = execSync('git branch --show-current', {
        cwd: workingDirectory,
        encoding: 'utf8',
      }).trim();

      const status = execSync('git status --porcelain', {
        cwd: workingDirectory,
        encoding: 'utf8',
      });

      return {
        currentBranch: branch,
        hasChanges: status.trim().length > 0,
        hasUncommittedFiles: status.trim().length > 0,
      };
    } catch (error) {
      return undefined;
    }
  }

  private async getPackageInfo(workingDirectory: string): Promise<any> {
    try {
      const packageJsonPath = path.join(workingDirectory, 'package.json');
      const hasPackageJson = await fs.pathExists(packageJsonPath);

      if (!hasPackageJson) {
        return { hasPackageJson: false, scripts: [], dependencies: [] };
      }

      const packageJson = await fs.readJson(packageJsonPath);
      return {
        hasPackageJson: true,
        scripts: Object.keys(packageJson.scripts || {}),
        dependencies: Object.keys({
          ...packageJson.dependencies,
          ...packageJson.devDependencies,
        }),
      };
    } catch (error) {
      return { hasPackageJson: false, scripts: [], dependencies: [] };
    }
  }

  private getPriorityDisplay(priority: string): string {
    switch (priority) {
      case 'high':
        return chalk.red('High');
      case 'medium':
        return chalk.yellow('Medium');
      case 'low':
        return chalk.green('Low');
      default:
        return priority;
    }
  }

  private levenshteinDistance(a: string, b: string): number {
    const matrix = [];

    for (let i = 0; i <= b.length; i++) {
      matrix[i] = [i];
    }

    for (let j = 0; j <= a.length; j++) {
      matrix[0][j] = j;
    }

    for (let i = 1; i <= b.length; i++) {
      for (let j = 1; j <= a.length; j++) {
        if (b.charAt(i - 1) === a.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }

    return matrix[b.length][a.length];
  }
}
