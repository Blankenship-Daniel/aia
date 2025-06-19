/**
 * CLI Application
 * Main CLI application that integrates the service architecture with Commander.js
 */
const { Command } = require('commander');
const chalk = require('chalk');
const { ServiceFactory } = require('../../dist/container/ServiceFactory');
const { CommandFactory } = require('../../dist/commands/CommandFactory');
const { CommandRegistry } = require('../../dist/services/CommandRegistry');

class CLIApplication {
  constructor() {
    this.program = new Command();
    this.container = null;
    this.services = {};
    this.commandRegistry = new CommandRegistry();
    this.initialized = false;
  }

  /**
   * Initialize the CLI application
   * @returns {Promise<void>}
   */
  async initialize() {
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
    } catch (error) {
      console.error(
        chalk.red('Failed to initialize CLI application:'),
        error.message
      );
      throw error;
    }
  }

  /**
   * Setup dependency injection container and services
   * @returns {Promise<void>}
   */
  async setupServices() {
    // Create container with all services
    this.container = ServiceFactory.createContainer();

    // Resolve all services
    this.services = {
      aiService: this.container.resolve('ai'),
      memoryService: this.container.resolve('memory'),
      contextService: this.container.resolve('context'),
      commandService: this.container.resolve('command'),
      configurationService: this.container.resolve('configuration'),
      pluginService: this.container.resolve('plugin'),
      workflowService: this.container.resolve('workflow'),
      logger: console, // Simple logger for now
    };

    // Initialize services that need it
    await this.services.configurationService.initialize();
    await this.services.memoryService.initialize();
    await this.services.contextService.initialize();
  }

  /**
   * Setup CLI commands using the command registry
   * @returns {Promise<void>}
   */
  async setupCommands() {
    // Create and register commands
    const registeredCount = CommandFactory.registerCommands(
      this.commandRegistry,
      this.services
    );
    console.log(chalk.green(`✅ Registered ${registeredCount} commands`));

    // Add commands to Commander.js program
    this.addCommandsToProgram();
  }

  /**
   * Add registered commands to Commander.js program
   */
  addCommandsToProgram() {
    const commands = this.commandRegistry.getAllCommands();

    for (const [name, commandInstance] of commands) {
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

      cmd.action(async (...args) => {
        await this.executeCommand(commandInstance, args);
      });

      // Add aliases
      if (definition.aliases && definition.aliases.length > 0) {
        definition.aliases.forEach((alias) => {
          cmd.alias(alias);
        });
      }

      // Add options based on command type
      this.addCommandOptions(cmd, commandInstance);
    }

    // Add special index commands from the legacy system
    this.addIndexCommands();

    // Add other legacy commands
    this.addLegacyCommands();
  }
  /**
   * Add command-specific options
   * @param {Command} cmd - Commander.js command
   * @param {ICommand} commandInstance - Command instance
   */
  addCommandOptions(cmd, commandInstance) {
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

      case 'exec':
        cmd.option('--no-optimize', 'Disable command optimization');
        cmd.option('--force', 'Force execution of unsafe commands');
        cmd.option('--dry-run', 'Show what would be executed without running');
        break;

      case 'context':
        cmd.option('--json', 'Output context as JSON');
        // Note: --verbose is already added as common option above
        break;

      case 'memory':
        cmd.option('--search <query>', 'Search memory for specific content');
        cmd.option('--clear', 'Clear all memory (requires confirmation)');
        cmd.option('--export <file>', 'Export memory to file');
        cmd.option('--force', 'Skip confirmation prompts');
        break;

      case 'config':
        cmd.option('--interactive', 'Interactive configuration mode');
        cmd.option('--set <key=value>', 'Set configuration value');
        cmd.option('--get <key>', 'Get configuration value');
        cmd.option('--list', 'List all configuration');
        break;

      case 'agent':
        cmd.option('--auto-execute', 'Execute commands without confirmation');
        cmd.option(
          '--max-iterations <number>',
          'Maximum number of refinement iterations',
          '5'
        );
        cmd.option('--no-iteration', 'Disable iterative refinement');
        break;
    }
  }

  /**
   * Execute a command with proper error handling
   * @param {ICommand} commandInstance - Command to execute
   * @param {Array} args - Command arguments
   */ async executeCommand(commandInstance, args) {
    try {
      let cmdArgs, options;

      // Handle different argument structures:
      // 1. From Commander.js: [argumentsArray, optionsObject, commandObject]
      // 2. From Interactive mode: [argumentsArray, optionsObject]
      if (args.length >= 2) {
        const lastElement = args[args.length - 1];

        // Check if last element is a Commander.js command object (has .opts method)
        if (lastElement && typeof lastElement.opts === 'function') {
          // Commander.js call
          const argumentsArray = args[0];
          const commandObj = lastElement;
          options = commandObj.opts();
          cmdArgs = Array.isArray(argumentsArray) ? argumentsArray : [];
        } else {
          // Interactive mode call: [args, options]
          cmdArgs = Array.isArray(args[0]) ? args[0] : [];
          options = args[1] || {};
        }
      } else {
        // Fallback for unexpected argument structure
        cmdArgs = [];
        options = {};
      }

      // Get current context
      const context = await this.services.contextService.gatherContext();

      // Execute command
      const result = await commandInstance.execute(context, cmdArgs, options);

      // Handle result if needed
      if (result && !options.quiet) {
        // Most commands handle their own output, but we can add common handling here
      }
    } catch (error) {
      // Handle options extraction for error reporting
      let finalOptions = {};
      try {
        const lastElement = args[args.length - 1];
        if (lastElement && typeof lastElement.opts === 'function') {
          // Commander.js call
          finalOptions = lastElement.opts();
        } else if (args[1] && typeof args[1] === 'object') {
          // Interactive mode call
          finalOptions = args[1];
        }
      } catch (optsError) {
        // If options extraction fails, use empty options
        finalOptions = {};
      }

      // Show error message appropriately for interactive vs non-interactive mode
      if (!finalOptions.quiet) {
        if (finalOptions.interactive) {
          // In interactive mode, show friendly error message and continue
          console.error(chalk.red('❌ Error:'), error.message);
          if (finalOptions.verbose) {
            console.error(chalk.gray('Stack trace:'), error.stack);
          }

          // If it's a usage error, show help for the command
          if (
            error.message.includes('Usage:') ||
            error.message.includes('requires')
          ) {
            const commandName = commandInstance.getName();
            console.log(
              chalk.yellow(
                `\n💡 Use 'help' to see all commands or check the ${commandName} command usage.`
              )
            );
          }
        } else {
          // In non-interactive mode, show standard error message
          console.error(chalk.red('Command failed:'), error.message);
          if (finalOptions.verbose) {
            console.error(error.stack);
          }
        }
      }

      // Only exit if not in interactive mode
      if (!finalOptions.interactive) {
        process.exit(1);
      }
      // In interactive mode, don't throw - just return so the loop continues
    }
  }

  /**
   * Configure the main CLI program
   */
  configureCLI() {
    this.program
      .name('aia')
      .description(
        'AI Agentic Assistant - Intelligent CLI tool with context awareness'
      )
      .version('1.1.0')
      .option('--config <path>', 'Custom configuration file path')
      .option('--debug', 'Enable debug output');

    // Add interactive mode command
    this.program
      .command('interactive')
      .alias('i')
      .description('Start interactive mode')
      .action(async (options) => {
        await this.startInteractiveMode(options);
      });

    // Add default action for no command
    this.program.action(() => {
      // If no command specified, start interactive mode
      this.startInteractiveMode({});
    });
  }

  /**
   * Start interactive mode
   * @param {Object} options - Command options
   */
  async startInteractiveMode(options) {
    const inquirer = require('inquirer');

    console.log(chalk.blue.bold('🤖 AIA Interactive Mode'));
    console.log(
      chalk.gray('Type "help" for available commands, "exit" to quit\n')
    );

    let running = true;
    while (running) {
      try {
        const { input } = await inquirer.prompt([
          {
            type: 'input',
            name: 'input',
            message: chalk.cyan('aia>'),
            prefix: '',
          },
        ]);

        const trimmed = input.trim();
        if (!trimmed) continue;

        if (trimmed === 'exit' || trimmed === 'quit') {
          running = false;
          console.log(chalk.yellow('Goodbye! 👋'));
          break;
        }

        if (trimmed === 'help') {
          this.showInteractiveHelp();
          continue;
        }

        // Parse and execute command
        await this.executeInteractiveCommand(trimmed, options);
      } catch (error) {
        if (error.name === 'ExitPromptError') {
          running = false;
          console.log(chalk.yellow('\nGoodbye! 👋'));
        } else {
          console.error(chalk.red('Error:'), error.message);
        }
      }
    }
  }

  /**
   * Show help for interactive mode
   */
  showInteractiveHelp() {
    console.log(chalk.blue.bold('\n📋 Available Commands:'));

    const commands = this.commandRegistry.getAllCommands();
    for (const [name, commandInstance] of commands) {
      const definition = commandInstance.getDefinition();
      const aliases = definition.aliases
        ? ` ${chalk.gray(`(${definition.aliases.join(', ')})`)}`
        : '';

      // Add usage hints for key commands
      let usage = '';
      switch (name) {
        case 'ask':
          usage = chalk.gray(' <question>');
          break;
        case 'exec':
          usage = chalk.gray(' <command>');
          break;
        case 'agent':
          usage = chalk.gray(' <goal>');
          break;
      }

      console.log(
        `  ${chalk.green(name)}${usage}${aliases} - ${definition.description}`
      );
    }

    console.log(`\n  ${chalk.green('help')} - Show this help`);
    console.log(`  ${chalk.green('exit')} - Exit interactive mode`);

    console.log(chalk.blue.bold('\n💡 Examples:'));
    console.log(`  ${chalk.cyan('ask')} "How do I install npm packages?"`);
    console.log(`  ${chalk.cyan('exec')} "ls -la"`);
    console.log(
      `  ${chalk.cyan('agent')} "optimize this project for production"`
    );
    console.log(`  ${chalk.cyan('context')} - Show current environment`);
    console.log(`  ${chalk.cyan('memory')} - View conversation history\n`);
  }

  /**
   * Execute command in interactive mode
   * @param {string} input - User input
   * @param {Object} globalOptions - Global CLI options
   */
  async executeInteractiveCommand(input, globalOptions) {
    try {
      // Parse input into command and arguments
      const parts = input.split(' ');
      const commandName = parts[0];
      const args = parts.slice(1);

      // Find command
      const commandInstance = this.commandRegistry.getCommand(commandName);
      if (!commandInstance) {
        console.log(chalk.yellow(`Unknown command: ${commandName}`));
        console.log(chalk.gray('Type "help" to see available commands'));
        return;
      }

      // Execute command with interactive flag
      const options = { ...globalOptions, interactive: true };
      await this.executeCommand(commandInstance, [args, options]);
    } catch (error) {
      // This shouldn't happen anymore since executeCommand handles errors gracefully in interactive mode
      // But keeping as a safety net
      console.error(chalk.red('❌ Unexpected error:'), error.message);
      if (globalOptions.verbose) {
        console.error(chalk.gray('Stack trace:'), error.stack);
      }
    }
  }

  /**
   * Run the CLI application
   * @param {Array} argv - Command line arguments
   * @returns {Promise<void>}
   */
  async run(argv = process.argv) {
    try {
      await this.initialize();
      await this.program.parseAsync(argv);
    } catch (error) {
      console.error(chalk.red('CLI Application Error:'), error.message);
      process.exit(1);
    }
  }

  /**
   * Add legacy index commands to the CLI
   * These commands are from the original index.js and provide code indexing functionality
   */
  addIndexCommands() {
    const { IndexCommand } = require('../../dist/commands/IndexCommand');
    const indexCommand = new IndexCommand();

    // Main index command with subcommands
    this.program
      .command('index [args...]')
      .alias('idx')
      .description('Create and manage codebase index for AI analysis')
      .option('--force', 'Force rebuild even if index exists')
      .option('--directory <path>', 'Directory to index (default: current)')
      .option('--verbose', 'Show detailed output')
      .option('--json', 'Output results as JSON')
      .option('--detailed', 'Show detailed information')
      .action(async (args, options) => {
        try {
          // Default to 'build' if no arguments provided
          const argsArray = args && args.length > 0 ? args : ['build'];
          const result = await indexCommand.execute({}, argsArray, options);
          if (!result.success && !options.quiet) {
            console.error(
              chalk.red('Index command failed:', result.error || result.output)
            );
            process.exit(1);
          }
        } catch (error) {
          console.error(chalk.red('Index command error:', error.message));
          process.exit(1);
        }
      });

    // Note: Individual index commands (index-build, index-search, etc.) have been removed
    // in favor of using the main 'index' command with subcommands (e.g., 'aia index search "term"')
  }

  /**
   * Add additional legacy commands that aren't part of the TypeScript system yet
   */
  addLegacyCommands() {
    // config-outputs command
    this.program
      .command('config-outputs')
      .alias('co')
      .description(
        'Configure output directories for prompt and instruction files'
      )
      .action(async () => {
        try {
          // Use the legacy ConfigurationManager for this functionality
          const ConfigurationManager = require('../ConfigurationManager');
          const configManager = new ConfigurationManager();
          await configManager.configureOutputDirectories();
        } catch (error) {
          console.error(
            chalk.red('Failed to configure outputs:', error.message)
          );
          process.exit(1);
        }
      });
  }

  /**
   * Get the configured services
   * @returns {Object} Services object
   */
  getServices() {
    return this.services;
  }

  /**
   * Get the command registry
   * @returns {CommandRegistry} Command registry
   */
  getCommandRegistry() {
    return this.commandRegistry;
  }
}

module.exports = CLIApplication;
