/**
 * CLI Application
 * Main CLI application that integrates the service architecture with Commander.js
 */
import { Command } from 'commander';
import chalk from 'chalk';
import { ServiceFactory } from '../container/ServiceFactory.js';
import { CommandFactory } from '../commands/CommandFactory.js';
import { CommandRegistry } from '../services/CommandRegistry.js';
import { ICommand } from '../interfaces/ICommand.js';
import { ICommandService } from '../interfaces/ICommandService.js';
import { IConfigurationService } from '../interfaces/IConfigurationService.js';
import { DIContainer } from '../container/DIContainer.js';

/**
 * CLI Application class that manages the command-line interface
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
   * Initialize the CLI application
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
   * Setup dependency injection container and services
   */
  private async setupServices(): Promise<void> {
    try {
      console.log(chalk.blue('Setting up services...'));

      // Create service factory and initialize services
      this.container = ServiceFactory.createContainer();

      // Initialize all services (this will call initialize() on each service)
      await this.container.initialize();

      // Store references to commonly used services
      this.services.configuration =
        this.container.resolve<IConfigurationService>('configuration');
      this.services.command =
        this.container.resolve<ICommandService>('command');

      console.log(chalk.green('✅ Services initialized successfully'));
    } catch (error: any) {
      console.error(chalk.red('Failed to setup services:'), error.message);
      throw error;
    }
  }

  /**
   * Setup CLI commands
   */
  private async setupCommands(): Promise<void> {
    try {
      console.log(chalk.blue('Setting up commands...'));

      // Create command factory with required services
      const aiService = this.container!.resolve('ai') as any;
      const memoryService = this.container!.resolve('memory') as any;
      const contextService = this.container!.resolve('context') as any;
      const commandService = this.container!.resolve('command') as any;
      const configurationService = this.container!.resolve(
        'configuration'
      ) as any;

      const commandFactory = new CommandFactory(
        aiService,
        memoryService,
        contextService,
        commandService,
        configurationService
      );

      const commands = commandFactory.getAllCommands();

      // Register commands with the registry
      for (const [name, commandInstance] of commands) {
        this.commandRegistry.register(commandInstance);
        this.addCommand(name, commandInstance);
      }

      console.log(chalk.green(`✅ ${commands.size} commands registered`));
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
    } else if (name === 'ask' || name === 'exec' || name === 'agent') {
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

    // Global error handling
    this.program.exitOverride();

    // Add help customization
    this.program.configureHelp({
      sortSubcommands: true,
      subcommandTerm: (cmd) => cmd.name() + ' ' + cmd.usage(),
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
      }

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

    // The last argument in Commander.js is typically the options object
    const lastArg = args[args.length - 1];
    if (
      lastArg &&
      typeof lastArg === 'object' &&
      lastArg.constructor === Object
    ) {
      Object.assign(options, lastArg);
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

      if (argv) {
        await this.program.parseAsync(argv);
      } else {
        await this.program.parseAsync();
      }

      // Successful execution - cleanup and exit
      await this.shutdown();
      process.exit(0);
    } catch (error: any) {
      if (error.code === 'commander.help') {
        // Help was displayed, exit gracefully
        await this.shutdown();
        return;
      }

      if (error.code === 'commander.unknownCommand') {
        console.error(chalk.red('Unknown command:'), error.message);
        console.log(chalk.yellow('Run "aia --help" to see available commands'));
        await this.shutdown();
        process.exit(1);
      }

      console.error(chalk.red('CLI error:'), error.message);

      if (this.program.opts().debug) {
        console.error(chalk.gray('Stack trace:'), error.stack);
      }

      await this.shutdown();
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
      console.log(chalk.blue('Shutting down CLI application...'));

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

      console.log(chalk.green('✅ CLI application shutdown complete'));
    } catch (error: any) {
      console.error(chalk.red('Error during shutdown:'), error.message);
    }
  }
}
