/**
 * Config Command Implementation
 * Manages AIA configuration settings
 */
const ICommand = require('../interfaces/ICommand');

class ConfigCommand extends ICommand {
  constructor(configurationService, logger) {
    super();
    this.configurationService = configurationService;
    this.logger = logger;
  }

  /**
   * Get command definition
   * @returns {Object} Command definition
   */
  getDefinition() {
    return {
      name: 'config',
      description: 'Manage AIA configuration settings and API keys',
      aliases: ['cfg', 'configure'],
      usage:
        'config [--set <key=value>] [--get <key>] [--list] [--interactive]',
      examples: [
        'config --interactive',
        'config --list',
        'config --get preferredModel',
        'config --set preferredModel=gpt-4',
      ],
    };
  }

  /**
   * Execute the config command
   * @param {Object} context - Execution context
   * @param {Array} args - Command arguments
   * @param {Object} options - Command options
   * @returns {Promise<Object>} Configuration result
   */
  async execute(context, args, options) {
    try {
      this.logger?.info('Processing config command');

      // Handle set operation
      if (options.set) {
        return await this.handleSet(options.set);
      }

      // Handle get operation
      if (options.get) {
        return await this.handleGet(options.get);
      }

      // Handle list operation
      if (options.list) {
        return await this.handleList();
      }

      // Default or interactive mode
      return await this.handleInteractive();
    } catch (error) {
      this.logger?.error('Config command failed:', error);
      throw error;
    }
  }

  /**
   * Handle interactive configuration
   * @returns {Promise<Object>} Configuration result
   */
  async handleInteractive() {
    const chalk = require('chalk');
    const inquirer = require('inquirer');

    console.log(chalk.blue.bold('🔧 AIA Configuration'));
    console.log(chalk.gray('Configure your AI Assistant settings'));
    console.log('');

    const currentConfig = await this.configurationService.getAllSettings();

    const questions = [
      {
        type: 'list',
        name: 'preferredModel',
        message: 'Select your preferred AI model:',
        choices: [
          {
            name: 'GPT-4 (OpenAI) - Best for coding and complex tasks',
            value: 'gpt-4',
          },
          {
            name: 'GPT-3.5 Turbo (OpenAI) - Fast and efficient',
            value: 'gpt-3.5-turbo',
          },
          {
            name: 'Claude-3.5 Sonnet (Anthropic) - Great for analysis',
            value: 'claude-3-5-sonnet-20241022',
          },
          {
            name: 'Claude-3 Haiku (Anthropic) - Quick responses',
            value: 'claude-3-haiku-20240307',
          },
        ],
        default: currentConfig.preferredModel || 'gpt-4',
      },
      {
        type: 'password',
        name: 'openaiApiKey',
        message: 'Enter your OpenAI API key (leave empty to skip):',
        mask: '*',
        when: () => true,
      },
      {
        type: 'password',
        name: 'anthropicApiKey',
        message: 'Enter your Anthropic API key (leave empty to skip):',
        mask: '*',
        when: () => true,
      },
      {
        type: 'confirm',
        name: 'autoOptimize',
        message: 'Enable automatic command optimization?',
        default: currentConfig.autoOptimize !== false,
      },
      {
        type: 'confirm',
        name: 'autoExecute',
        message:
          'Enable automatic command execution (auto-confirm all prompts)?',
        default: currentConfig.autoExecute === true,
      },
      {
        type: 'confirm',
        name: 'memoryEnabled',
        message: 'Enable conversation and command memory?',
        default: currentConfig.memoryEnabled !== false,
      },
    ];

    const answers = await inquirer.prompt(questions);

    // Save configuration
    const updates = {};
    Object.entries(answers).forEach(([key, value]) => {
      if (value !== '') {
        updates[key] = value;
      }
    });

    await this.configurationService.updateSettings(updates);

    console.log('');
    console.log(chalk.green('✅ Configuration saved successfully!'));
    console.log('');

    // Show current configuration
    await this.handleList();

    return { updated: true, settings: updates };
  }

  /**
   * Handle set configuration value
   * @param {string} keyValue - Key=value pair
   * @returns {Promise<Object>} Set result
   */
  async handleSet(keyValue) {
    const chalk = require('chalk');

    if (!keyValue.includes('=')) {
      throw new Error('Invalid format. Use: --set key=value');
    }

    const [key, ...valueParts] = keyValue.split('=');
    const rawValue = valueParts.join('=');

    if (!key || !rawValue) {
      throw new Error('Both key and value are required');
    }

    // Parse the value to proper type
    const value = this.parseConfigValue(rawValue.trim());

    await this.configurationService.set(key.trim(), value);
    console.log(
      chalk.green('✅ Configuration updated:'),
      chalk.cyan(key),
      '=',
      chalk.yellow(value)
    );

    return { set: true, key, value };
  }

  /**
   * Parse configuration value to appropriate type
   * @param {string} value - Raw string value
   * @returns {*} Parsed value
   */
  parseConfigValue(value) {
    // Handle boolean values
    if (value.toLowerCase() === 'true') return true;
    if (value.toLowerCase() === 'false') return false;

    // Handle null and undefined
    if (value.toLowerCase() === 'null') return null;
    if (value.toLowerCase() === 'undefined') return undefined;

    // Handle numbers
    if (/^-?\d+$/.test(value)) return parseInt(value, 10);
    if (/^-?\d*\.\d+$/.test(value)) return parseFloat(value);

    // Handle JSON objects and arrays
    if (
      (value.startsWith('{') && value.endsWith('}')) ||
      (value.startsWith('[') && value.endsWith(']'))
    ) {
      try {
        return JSON.parse(value);
      } catch (e) {
        // If JSON parsing fails, return as string
      }
    }

    // Return as string by default
    return value;
  }

  /**
   * Handle get configuration value
   * @param {string} key - Configuration key
   * @returns {Promise<Object>} Get result
   */
  async handleGet(key) {
    const chalk = require('chalk');

    const value = await this.configurationService.get(key);

    if (value === undefined) {
      console.log(
        chalk.yellow('⚠️  Configuration key not found:'),
        chalk.cyan(key)
      );
      return { found: false, key };
    }

    console.log(chalk.green(key + ':'), chalk.yellow(value));
    return { found: true, key, value };
  }

  /**
   * Handle list all configuration
   * @returns {Promise<Object>} List result
   */
  async handleList() {
    const chalk = require('chalk');

    const config = await this.configurationService.getAllSettings();

    console.log(chalk.blue.bold('📋 Current Configuration'));
    console.log(chalk.gray('─'.repeat(50)));

    if (!config || Object.keys(config).length === 0) {
      console.log(
        chalk.yellow('No configuration found. Run `aia config` to set up.')
      );
      return { empty: true };
    }

    Object.entries(config).forEach(([key, value]) => {
      // Hide sensitive values
      let displayValue = value;
      if (
        key.toLowerCase().includes('key') ||
        key.toLowerCase().includes('password')
      ) {
        displayValue = value ? '***' + value.slice(-4) : 'Not set';
      }

      console.log(chalk.green(key + ':'), chalk.yellow(displayValue));
    });

    console.log(chalk.gray('─'.repeat(50)));
    return { config };
  }
}

module.exports = ConfigCommand;
