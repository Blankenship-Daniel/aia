// Sample AIA Plugin - Hello World
// Demonstrates basic plugin functionality

const chalk = require('chalk');

class HelloPlugin {
  constructor() {
    this.name = 'hello-plugin';
    this.version = '1.0.0';
    this.commands = ['hello', 'greet'];
    this.hooks = ['beforeCommand', 'afterAIQuery'];
  }

  // Plugin initialization
  async initialize(api) {
    this.api = api;
    console.log(chalk.green(`🔌 Hello Plugin v${this.version} initialized`));

    // Register custom commands
    this.api.registerCommand('hello', this.helloCommand.bind(this));
    this.api.registerCommand('greet', this.greetCommand.bind(this));
  }

  // Plugin cleanup
  async cleanup() {
    console.log(chalk.yellow('👋 Hello Plugin shutting down'));
  }

  // Hook: Before command execution
  async beforeCommand(context) {
    const { command, args } = context;

    if (command === 'ls' || command === 'dir') {
      console.log(
        chalk.blue('📁 Hello Plugin: About to list directory contents')
      );
    }

    return context;
  }

  // Hook: After AI query
  async afterAIQuery(context) {
    const { prompt, response } = context;

    if (prompt.toLowerCase().includes('hello')) {
      console.log(
        chalk.magenta('👋 Hello Plugin: Detected greeting in AI query!')
      );
    }

    return context;
  }

  // Custom command: hello
  async helloCommand(callContext) {
    const {
      args = [],
      context = {},
      workingDirectory,
      options = {},
    } = callContext || {};

    // Get arguments from Commander.js - they're in options.args
    const commandArgs =
      options.args || args.filter((arg) => typeof arg === 'string');

    const timestamp = new Date().toLocaleTimeString();
    const message =
      commandArgs.length > 0
        ? `Hello, ${commandArgs.join(' ')}!`
        : 'Hello from AIA Plugin!';

    console.log(chalk.green(`🎉 ${message}`));
    console.log(chalk.gray(`   Time: ${timestamp}`));
    console.log(
      chalk.gray(`   Working Directory: ${workingDirectory || process.cwd()}`)
    );

    return { success: true, message };
  }

  // Custom command: greet
  async greetCommand(callContext) {
    const {
      args = [],
      context = {},
      workingDirectory,
      options = {},
    } = callContext || {};

    const greetings = [
      'Hello there!',
      'Greetings!',
      'How are you doing?',
      'Nice to see you!',
      'Welcome!',
    ];

    const randomGreeting =
      greetings[Math.floor(Math.random() * greetings.length)];

    // Get arguments from Commander.js - they're in options.args
    const commandArgs =
      options.args || args.filter((arg) => typeof arg === 'string');
    const name = commandArgs.length > 0 ? commandArgs.join(' ') : 'friend';

    console.log(chalk.cyan(`💫 ${randomGreeting} ${name}`));
    console.log(chalk.gray(`   Plugin: ${this.name} v${this.version}`));

    return { success: true, greeting: randomGreeting, name };
  }

  // Plugin configuration
  getConfig() {
    return {
      greeting: 'Hello from AIA Plugin!',
      showTimestamp: true,
    };
  }

  // Update plugin configuration
  updateConfig(newConfig) {
    this.config = { ...this.config, ...newConfig };
    console.log(chalk.blue('⚙️  Hello Plugin configuration updated'));
  }
}

// Export plugin class
module.exports = HelloPlugin;
