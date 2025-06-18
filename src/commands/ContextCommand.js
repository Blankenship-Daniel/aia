/**
 * Context Command Implementation
 * Shows current environment context
 */
const ICommand = require('../interfaces/ICommand');

class ContextCommand extends ICommand {
  constructor(contextService, logger) {
    super();
    this.contextService = contextService;
    this.logger = logger;
  }

  /**
   * Get command definition
   * @returns {Object} Command definition
   */
  getDefinition() {
    return {
      name: 'context',
      description: 'Show current environment context and project information',
      aliases: ['ctx', 'info'],
      usage: 'context [--json] [--verbose]',
      examples: ['context', 'context --json', 'context --verbose'],
    };
  }

  /**
   * Execute the context command
   * @param {Object} context - Execution context
   * @param {Array} args - Command arguments
   * @param {Object} options - Command options
   * @returns {Promise<Object>} Context information
   */
  async execute(context, args, options) {
    try {
      this.logger?.info('Gathering context information');

      // Get current context
      const currentContext = await this.contextService.gatherContext();

      if (options.json) {
        // Return JSON format
        console.log(JSON.stringify(currentContext, null, 2));
        return currentContext;
      }

      // Format and display context
      this.displayContext(currentContext, options.verbose);
      return currentContext;
    } catch (error) {
      this.logger?.error('Context command failed:', error);
      throw error;
    }
  }

  /**
   * Display context information in a formatted way
   * @param {Object} context - Context information
   * @param {boolean} verbose - Whether to show verbose information
   */
  displayContext(context, verbose = false) {
    const chalk = require('chalk');

    console.log(chalk.blue.bold('🔍 Current Context'));
    console.log(chalk.gray('─'.repeat(50)));

    // Basic information
    console.log(chalk.green('📁 Working Directory:'), context.workingDirectory);
    console.log(
      chalk.green('💻 Platform:'),
      `${context.platform} ${context.arch}`
    );
    console.log(chalk.green('🐚 Shell:'), context.shell);
    console.log(chalk.green('👤 User:'), context.user);

    // Project information
    if (context.projectType) {
      console.log(chalk.green('📦 Project Type:'), context.projectType);
    }

    if (context.projectInfo && Object.keys(context.projectInfo).length > 0) {
      console.log(chalk.green('📋 Project Info:'));
      Object.entries(context.projectInfo).forEach(([key, value]) => {
        console.log('  ' + chalk.yellow(key + ':') + ' ' + value);
      });
    }

    // Git information
    if (context.gitStatus) {
      console.log(chalk.green('🔀 Git Status:'), context.gitStatus);
    }

    // Environment score
    if (context.environmentScore !== undefined) {
      const scoreColor =
        context.environmentScore > 0.8
          ? 'green'
          : context.environmentScore > 0.6
          ? 'yellow'
          : 'red';
      console.log(
        chalk.green('⚡ Environment Score:'),
        chalk[scoreColor](Math.round(context.environmentScore * 100) + '%')
      );
    }

    // Verbose information
    if (verbose) {
      console.log(chalk.gray('─'.repeat(50)));
      console.log(chalk.blue.bold('🔧 Verbose Information'));

      if (context.nodeVersion) {
        console.log(chalk.green('🟢 Node.js:'), context.nodeVersion);
      }

      if (context.performanceMetrics) {
        console.log(chalk.green('📊 Performance:'));
        Object.entries(context.performanceMetrics).forEach(([key, value]) => {
          console.log('  ' + chalk.yellow(key + ':') + ' ' + value);
        });
      }

      if (context.securityStatus) {
        console.log(chalk.green('🔒 Security Status:'));
        Object.entries(context.securityStatus).forEach(([key, value]) => {
          const statusColor =
            value === 'secure' || value === true ? 'green' : 'yellow';
          console.log(
            '  ' + chalk.yellow(key + ':') + ' ' + chalk[statusColor](value)
          );
        });
      }
    }

    console.log(chalk.gray('─'.repeat(50)));
  }
}

module.exports = ContextCommand;
