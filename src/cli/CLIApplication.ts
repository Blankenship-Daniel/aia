/**
 * CLIApplication.ts - Main CLI application orchestrating service architecture with Commander.js.
 *
 * Responsibilities:
 * - Initializes dependency injection container and register  private async setupCommands(): Promise<void> {
    try {
      // Check for verbose flag directly from process arguments for startup messages
      const isVerbose = process.argv.includes('--verbose') || process.argv.includes('--debug');
      
      // Only show setup messages in verbose mode for cleaner UX
      if (isVerbose) {
        console.log(chalk.blue('Setting up commands...'));
      }services.
 * - Sets up command-line interface with Commander.js integration.
 * - Manages CLI program lifecycle including initialization, command setup, and execution.
 * - Provides error handling and graceful shutdown for CLI operations.
 *
 * Exports:
 * - {@link CLIApplication}: Main CLI application class managing the entire CLI lifecycle.
 *
 * @see ServiceFactory - Creates and configures the dependency injection container.
 * @see CommandRegistry - Manages command registration and execution.
 * @see DIContainer - Dependency injection container for service management.
 */

/**
 * CLI Application
 * Main CLI application that integrates the service architecture with Commander.js
 */
import { Command } from 'commander';
import chalk from 'chalk';
import { ServiceFactory } from '../container/ServiceFactory.js';
import { CommandRegistry } from '../services/CommandRegistry.js';
import { ICommand } from '../interfaces/ICommand.js';
import { ICommandService } from '../interfaces/ICommandService.js';
import { IConfigurationService } from '../interfaces/IConfigurationService.js';
import { DIContainer } from '../container/DIContainer.js';

/**
 * CLIApplication - Main application class orchestrating the entire CLI experience.
 *
 * Purpose:
 * - Manages the complete CLI lifecycle from initialization to command execution.
 * - Integrates dependency injection container with Commander.js for service-aware commands.
 * - Provides centralized error handling and graceful shutdown capabilities.
 * - Coordinates between service layer and command execution layer.
 *
 * Dependencies:
 * @see DIContainer - Manages service dependencies and lifecycle.
 * @see CommandRegistry - Handles command registration and routing.
 * @see ServiceFactory - Creates configured service instances.
 * @see IConfigurationService - Provides configuration management.
 * @see ICommandService - Handles command execution.
 *
 * @example
 * // Initialize and run CLI application
 * const app = new CLIApplication();
 * await app.initialize();
 * await app.run(process.argv);
 */
export default class CLIApplication {
  private program: Command;
  private container: DIContainer | null;
  private services: Record<string, any>;
  private commandRegistry: CommandRegistry;
  private initialized: boolean;

  constructor() {
    this.program = new Command();
    this.container = null;
    this.services = {};
    this.commandRegistry = new CommandRegistry();
    this.initialized = false;
  }

  /**
   * Initializes the CLI application with dependency injection and command setup.
   *
   * Detailed Process:
   * 1. Sets up dependency injection container and all services.
   * 2. Registers and configures all available commands.
   * 3. Configures the Commander.js CLI program with options and handlers.
   * 4. Ensures all components are ready for command execution.
   *
   * @returns {Promise<void>} Resolves when initialization is complete.
   * @throws {Error} If service setup, command registration, or CLI configuration fails.
   *
   * @example
   * const app = new CLIApplication();
   * await app.initialize();
   * console.log('CLI ready for commands');
   *
   * @see setupServices - Initializes dependency injection container.
   * @see setupCommands - Registers all available commands.
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    try {
      // Setup container and services
      await this.setupServices();

      // Setup CLI commands
      await this.setupCommands();

      // Configure CLI program
      this.configureCLI();

      this.initialized = true;
    } catch (error: any) {
      console.error(
        chalk.red('Failed to initialize CLI application:'),
        error.message
      );
      throw error;
    }
  }

  /**
   * Sets up the dependency injection container and initializes all services.
   *
   * Detailed Process:
   * - Creates DIContainer via ServiceFactory with all service registrations.
   * - Initializes all services including configuration, command, and interactive CLI services.
   * - Stores references to commonly used services for quick access.
   * - Configures command registry from the container.
   *
   * @returns {Promise<void>} Resolves when all services are initialized.
   * @throws {Error} If service creation or initialization fails.
   *
   * @example
   * await this.setupServices();
   * console.log('Services ready:', Object.keys(this.services));
   *
   * @see ServiceFactory - Creates configured dependency injection container.
   * @see DIContainer - Manages service lifecycle and resolution.
   */
  private async setupServices(): Promise<void> {
    try {
      // Check for verbose flag directly from process arguments for startup messages
      const isVerbose =
        process.argv.includes('--verbose') || process.argv.includes('--debug');

      // Only show setup messages in verbose mode for cleaner UX
      if (isVerbose) {
        console.log(chalk.blue('Setting up services...'));
      }

      // Create service factory and initialize services
      this.container = ServiceFactory.createContainer();

      // Initialize all services (this will call initialize() on each service)
      await this.container.initialize();

      // Store references to commonly used services
      this.services.configuration =
        this.container.resolve<IConfigurationService>('configuration');
      this.services.command =
        this.container.resolve<ICommandService>('command');
      this.services.interactiveCLI = this.container.resolve('interactiveCLI');

      // Use commandRegistry from the container instead of creating a new one
      this.commandRegistry = this.container.resolve('commandRegistry');

      // Only show success message in verbose mode for cleaner UX
      if (isVerbose) {
        console.log(chalk.green('✅ Services initialized successfully'));
      }
    } catch (error: any) {
      console.error(chalk.red('Failed to setup services:'), error.message);
      throw error;
    }
  }

  /**
   * Sets up CLI commands by registering them with Commander.js program.
   *
   * Detailed Process:
   * - Retrieves all command instances from the command factory.
   * - Registers each command with the command registry.
   * - Adds each command to the Commander.js program with appropriate options.
   * - Configures command aliases, arguments, and action handlers.
   *
   * @returns {Promise<void>} Resolves when all commands are registered.
   * @throws {Error} If command factory resolution or registration fails.
   *
   * @example
   * await this.setupCommands();
   * console.log('Commands registered:', this.commandRegistry.getAllCommands().length);
   *
   * @see CommandRegistry - Manages command registration and routing.
   * @see addCommand - Adds individual commands to CLI program.
   */
  private async setupCommands(): Promise<void> {
    try {
      // Only show setup messages in verbose mode for cleaner UX
      if (this.program?.opts()?.verbose) {
        console.log(chalk.blue('Setting up commands...'));
      }

      // Create command factory with required services
      // Get the command factory from the DI container
      const commandFactory = this.container!.resolve('commandFactory') as any;
      const commands = commandFactory.getAllCommands();

      // Register commands with the registry
      for (const [name, commandInstance] of commands) {
        this.commandRegistry.register(commandInstance);
        this.addCommand(name, commandInstance);
      }

      // Check for verbose flag directly from process arguments
      const isVerbose =
        process.argv.includes('--verbose') || process.argv.includes('--debug');

      // Only show registration message in verbose mode for cleaner UX
      if (isVerbose) {
        console.log(chalk.green(`✅ ${commands.size} commands registered`));
      }
    } catch (error: any) {
      console.error(chalk.red('Failed to setup commands:'), error.message);
      throw error;
    }
  }

  /**
   * Add a command to the CLI program
   */
  private addCommand(name: string, commandInstance: ICommand): void {
    const definition = commandInstance.getDefinition();

    let cmd = this.program
      .command(name)
      .description(definition.description || 'No description available');

    // Handle specific command arguments
    if (name === 'index') {
      cmd = cmd.argument(
        '<args...>',
        'Action and parameters (e.g., search "term")'
      );
    } else if (name === 'learn') {
      cmd = cmd.argument('[topic]', 'Learning topic (optional)');
    } else if (
      name === 'ask' ||
      name === 'exec' ||
      name === 'agent' ||
      name === 'suggest' ||
      name === 'explain'
    ) {
      cmd = cmd.argument('<input...>', 'Command or query input');
    }

    cmd.action(async (...args: any[]) => {
      await this.executeCommand(commandInstance, args);
    });

    // Add aliases
    if (definition.aliases && definition.aliases.length > 0) {
      definition.aliases.forEach((alias: string) => {
        cmd.alias(alias);
      });
    }

    // Add options based on command type
    this.addCommandOptions(cmd, commandInstance);
  }

  /**
   * Add command-specific options
   */
  private addCommandOptions(cmd: Command, commandInstance: ICommand): void {
    const name = commandInstance.getName();

    // Common options for all commands
    cmd.option('--verbose', 'Enable verbose output');
    cmd.option('--quiet', 'Suppress non-essential output');

    // Command-specific options
    switch (name) {
      case 'ask':
        cmd.option('--model <model>', 'Specify AI model to use');
        cmd.option('--context <context>', 'Additional context for the query');
        break;

      case 'index':
        cmd.option('--force', 'Force re-indexing');
        cmd.option('--watch', 'Watch for file changes');
        cmd.option(
          '--directory <dir>',
          'Directory to index (default: current)'
        );
        cmd.option('--json', 'Output results as JSON');
        cmd.option('--detailed', 'Show detailed information');
        cmd.option('--output <file>', 'Output file path for export');
        cmd.option(
          '--format <format>',
          'Export format: markdown, json, or text'
        );
        cmd.option('--code', 'Include code snippets in export');
        cmd.option(
          '--type <type>',
          'Type of prompt to generate (copilot-instructions, comprehensive, minimal, architecture, dev-focused, all)'
        );
        break;

      case 'agent':
        cmd.option('--auto', 'Execute without confirmation prompts');
        cmd.option(
          '--max-iterations <n>',
          'Maximum iterations for reasoning',
          '5'
        );
        break;

      case 'exec':
        cmd.option('--dry-run', 'Show what would be executed without running');
        cmd.option('--no-optimize', 'Disable command optimization');
        cmd.option('--force', 'Skip safety validation');
        cmd.option(
          '--timeout <ms>',
          'Command timeout in milliseconds',
          '30000'
        );
        break;

      case 'memory':
        cmd.option('--clear', 'Clear memory');
        cmd.option('--search <term>', 'Search memory for term');
        break;

      case 'config':
        cmd.option('--global', 'Use global configuration');
        cmd.option('--reset', 'Reset configuration to defaults');
        break;

      case 'context':
        cmd.option('--json', 'Output in JSON format');
        break;

      case 'cache':
        cmd.option('--stats', 'Show cache statistics');
        cmd.option('--performance', 'Display performance analytics');
        cmd.option('--perf', 'Alias for performance');
        cmd.option('--warm', 'Warm cache with suggested keys');
        cmd.option('--cleanup', 'Clean up low-value cache entries');
        cmd.option('--clean', 'Alias for cleanup');
        cmd.option('--analytics', 'Show comprehensive analytics');
        cmd.option('--suggest', 'Show optimization suggestions');
        cmd.option('--clear', 'Clear entire cache');
        cmd.option('--strategy', 'Manage cache strategies');
        cmd.option('--auto', 'Auto-execute suggestions');
        cmd.option('--confirm', 'Confirm destructive operations');
        break;

      case 'analytics':
        cmd.option('--usage', 'Show usage analytics');
        cmd.option('--performance', 'Display performance analytics');
        cmd.option('--perf', 'Alias for performance');
        cmd.option('--productivity', 'Generate productivity report');
        cmd.option(
          '--trends <timeRange>',
          'Show usage trends (day/week/month)'
        );
        cmd.option('--recommendations', 'Show optimization recommendations');
        cmd.option('--rec', 'Alias for recommendations');
        cmd.option('--export <format>', 'Export analytics data (json/csv)');
        cmd.option('--clear', 'Clear analytics data');
        cmd.option('--confirm', 'Confirm destructive operations');
        break;

      case 'explain':
        cmd.option(
          '--no-fallback',
          'Disable AI fallback when Copilot is unavailable'
        );
        cmd.option(
          '--no-safety-check',
          'Skip safety warnings for potentially dangerous commands'
        );
        cmd.option('--cache', 'Use cached explanation if available');
        break;

      case 'suggest':
        cmd.option(
          '--context <type>',
          'Context type for suggestions (git, shell, docker)'
        );
        cmd.option(
          '--no-fallback',
          'Disable AI fallback when Copilot is unavailable'
        );
        cmd.option(
          '--no-safety-check',
          'Skip safety warnings for potentially dangerous commands'
        );
        break;

      case 'learn':
        cmd.option('--interactive', 'Enable interactive learning mode');
        cmd.option('--depth <number>', 'Number of topics to cover', '3');
        cmd.option('--continuous', 'Do not pause between topics');
        cmd.option('--beginner', 'Focus on beginner-friendly content');
        cmd.option('--advanced', 'Include advanced tips and techniques');
        cmd.option(
          '--no-interactive',
          'Skip interactive prompts (useful for CI/scripts)'
        );
        cmd.option(
          '--no-fallback',
          'Disable AI fallback when Copilot is unavailable'
        );
        break;
    }
  }

  /**
   * Add special index commands from the legacy system
   */
  private addIndexCommands(): void {
    // Legacy index commands
    this.program
      .command('i')
      .alias('index')
      .argument('<action>', 'Index action (codebase, search, analyze)')
      .argument('[query]', 'Search query or analysis target')
      .description('Index operations (legacy compatibility)')
      .action(async (action: string, query?: string) => {
        const indexCommand = this.commandRegistry.resolveCommand('index');
        if (indexCommand) {
          await this.executeCommand(indexCommand, [action, query]);
        }
      });
  }

  /**
   * Add other legacy commands
   */
  private addLegacyCommands(): void {
    // Add backwards compatibility commands
    this.program
      .command('a')
      .alias('ask')
      .argument('<query...>', 'Question to ask the AI')
      .description('Ask AI (legacy alias)')
      .option('--model <model>', 'AI model to use')
      .action(async (query: string[]) => {
        const askCommand = this.commandRegistry.resolveCommand('ask');
        if (askCommand) {
          await this.executeCommand(askCommand, [query.join(' ')]);
        }
      });

    this.program
      .command('e')
      .alias('exec')
      .argument('<command...>', 'Command to execute')
      .description('Execute command (legacy alias)')
      .action(async (command: string[]) => {
        const execCommand = this.commandRegistry.resolveCommand('exec');
        if (execCommand) {
          await this.executeCommand(execCommand, [command.join(' ')]);
        }
      });
  }

  /**
   * Configure the CLI program
   */
  private configureCLI(): void {
    this.program
      .name('aia')
      .description('AI Assistant CLI - Intelligent development companion')
      .version('1.0.0')
      .option('--debug', 'Enable debug mode')
      .option('--config <path>', 'Custom configuration file path');

    // Global error handling - remove exitOverride to prevent outputHelp errors
    // this.program.exitOverride();

    // Add help customization
    this.program.configureHelp({
      sortSubcommands: true,
      subcommandTerm: (cmd) => cmd.name() + ' ' + cmd.usage(),
    });

    // Override help action to avoid throwing errors
    this.program.configureOutput({
      outputError: (str, write) => {
        // Suppress outputHelp errors for cleaner UX
        if (!str.includes('outputHelp')) {
          write(str);
        }
      },
    });
  }

  /**
   * Execute a command with error handling
   */
  private async executeCommand(
    commandInstance: ICommand,
    args: any[]
  ): Promise<void> {
    try {
      // Prepare options from CLI
      const options = this.extractOptionsFromArgs(args);

      // Extract clean arguments - commander.js passes variadic args as first element
      let cleanArgs: string[] = [];
      if (args.length > 0 && Array.isArray(args[0])) {
        cleanArgs = args[0]; // First element is the array of actual arguments
      } else if (args.length > 0 && typeof args[0] === 'string') {
        // Handle single argument case
        cleanArgs = [args[0]];
      }

      console.log(
        chalk.gray(`CLI Debug: cleanArgs = ${JSON.stringify(cleanArgs)}`)
      );

      // Execute the command with correct signature
      const result = await commandInstance.execute({}, cleanArgs, options);

      if (result && !result.success && result.error) {
        console.error(chalk.red('Command failed:'), result.error);
        process.exit(1);
      }
    } catch (error: any) {
      console.error(chalk.red('Command execution failed:'), error.message);

      if (this.program.opts().debug) {
        console.error(chalk.gray('Stack trace:'), error.stack);
      }

      process.exit(1);
    }
  }

  /**
   * Extract options from command arguments
   */
  private extractOptionsFromArgs(args: any[]): Record<string, any> {
    const options: Record<string, any> = {};

    // In Commander.js with variadic arguments, the last argument is the Command object
    const lastArg = args[args.length - 1];
    console.log(chalk.gray(`CLI Debug: lastArg type = ${typeof lastArg}`));
    console.log(
      chalk.gray(`CLI Debug: lastArg has opts = ${!!(lastArg && lastArg.opts)}`)
    );

    if (lastArg && typeof lastArg === 'object' && lastArg.opts) {
      // This is the Command object, extract options from it
      const commandOptions = lastArg.opts();
      console.log(
        chalk.gray(
          `CLI Debug: commandOptions = ${JSON.stringify(commandOptions)}`
        )
      );
      Object.assign(options, commandOptions);
    }

    // Add global options from program
    const globalOpts = this.program.opts();
    Object.assign(options, globalOpts);

    return options;
  }

  /**
   * Run the CLI application
   */
  async run(argv?: string[]): Promise<void> {
    try {
      await this.initialize();

      // Check if no arguments provided - start interactive mode
      const args = argv || process.argv;
      if (args.length <= 2) {
        // No command provided, start interactive mode
        await this.startInteractiveMode();
        return;
      }

      if (argv) {
        await this.program.parseAsync(argv);
      } else {
        await this.program.parseAsync();
      }

      // Successful execution - cleanup and exit
      await this.shutdown();
      process.exit(0);
    } catch (error: any) {
      if (error.code === 'commander.help' || error.message === 'outputHelp') {
        // Help was displayed, exit gracefully without extra messages
        return;
      }

      if (error.code === 'commander.unknownCommand') {
        console.error(chalk.red('Unknown command:'), error.message);
        console.log(chalk.yellow('Run "aia --help" to see available commands'));
        console.log(
          chalk.blue('Or run "aia" without arguments for interactive mode')
        );
        await this.shutdown();
        process.exit(1);
      }

      console.error(chalk.red('Error:'), error.message);

      if (this.program.opts().debug) {
        console.error(chalk.gray('Stack trace:'), error.stack);
      }

      await this.shutdown();
      process.exit(1);
    }
  }

  /**
   * Start interactive mode
   */
  private async startInteractiveMode(): Promise<void> {
    try {
      if (this.services.interactiveCLI) {
        await this.services.interactiveCLI.startInteractiveMode();
      } else {
        console.error(chalk.red('Interactive CLI service not available'));
        process.exit(1);
      }
    } catch (error: any) {
      console.error(
        chalk.red('Failed to start interactive mode:'),
        error.message
      );
      process.exit(1);
    }
  }

  /**
   * Get the Commander.js program instance
   */
  getProgram(): Command {
    return this.program;
  }

  /**
   * Get the dependency injection container
   */
  getContainer(): DIContainer | null {
    return this.container;
  }

  /**
   * Get initialized services
   */
  getServices(): Record<string, any> {
    return this.services;
  }

  /**
   * Get the command registry
   */
  getCommandRegistry(): CommandRegistry {
    return this.commandRegistry;
  }

  /**
   * Check if the application is initialized
   */
  isInitialized(): boolean {
    return this.initialized;
  }

  /**
   * Graceful shutdown
   */
  async shutdown(): Promise<void> {
    try {
      // Silent shutdown for cleaner UX - only show messages in debug mode
      if (this.program?.opts()?.debug) {
        console.log(chalk.blue('Shutting down CLI application...'));
      }

      // Cleanup services in order
      const cleanupTasks: Promise<void>[] = [];

      if (this.container) {
        // Get services that need cleanup based on ServiceFactory registrations
        const performanceOptimizer = this.container.resolve(
          'performance'
        ) as any;
        const memoryCacheService = this.container.resolve('caching') as any;
        const cliFormatter = this.container.resolve('formatter') as any;

        // Cleanup performance optimizer intervals
        if (
          performanceOptimizer &&
          typeof performanceOptimizer.cleanup === 'function'
        ) {
          cleanupTasks.push(Promise.resolve(performanceOptimizer.cleanup()));
        }

        // Cleanup memory cache service intervals
        if (
          memoryCacheService &&
          typeof memoryCacheService.destroy === 'function'
        ) {
          cleanupTasks.push(Promise.resolve(memoryCacheService.destroy()));
        }

        // Cleanup CLI formatter spinners
        if (cliFormatter && typeof cliFormatter.cleanup === 'function') {
          cleanupTasks.push(Promise.resolve(cliFormatter.cleanup()));
        }

        // Dispose of the entire container
        if (typeof this.container.dispose === 'function') {
          cleanupTasks.push(this.container.dispose());
        }
      }

      // Cleanup configuration service if it exists
      if (
        this.services.configuration &&
        typeof this.services.configuration.cleanup === 'function'
      ) {
        cleanupTasks.push(this.services.configuration.cleanup());
      }

      // Wait for all cleanup tasks to complete with timeout
      await Promise.race([
        Promise.allSettled(cleanupTasks),
        new Promise<void>((resolve) => setTimeout(resolve, 5000)), // 5 second timeout
      ]);

      // Only show completion message in debug mode for cleaner UX
      if (this.program?.opts()?.debug) {
        console.log(chalk.green('✅ CLI application shutdown complete'));
      }
    } catch (error: any) {
      console.error(chalk.red('Error during shutdown:'), error.message);
    }
  }
}
