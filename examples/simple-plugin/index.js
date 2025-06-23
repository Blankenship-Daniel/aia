// Sample AIA Plugin - Hello World
// Demonstrates basic plugin functionality

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
    console.log(`🔌 Hello Plugin v${this.version} initialized`);

    // Register custom commands
    this.api.registerCommand('hello', this.helloCommand.bind(this));
    this.api.registerCommand('greet', this.greetCommand.bind(this));
  }

  // Plugin cleanup
  async cleanup() {
    console.log('👋 Hello Plugin shutting down');
  }

  // Hook: Before command execution
  async beforeCommand(context) {
    const { command, args } = context;

    if (command === 'ls' || command === 'dir') {
      console.log('📁 Hello Plugin: About to list directory contents');
    }

    return context;
  }

  // Hook: After AI query
  async afterAIQuery(context) {
    const { prompt, response } = context;

    if (prompt.toLowerCase().includes('hello')) {
      console.log('👋 Hello Plugin: Detected greeting in AI query!');
    }

    return context;
  }

  // Custom command: hello
  async helloCommand(args, context) {
    const timestamp = new Date().toLocaleTimeString();
    const message =
      args.length > 0 ? `Hello, ${args.join(' ')}!` : 'Hello from AIA Plugin!';

    console.log(`🎉 ${message}`);
    console.log(`   Time: ${timestamp}`);
    console.log(`   Working Directory: ${context.workingDirectory}`);

    return { success: true, message };
  }

  // Custom command: greet
  async greetCommand(args, context) {
    const greetings = [
      'Hello there!',
      'Greetings!',
      'How are you doing?',
      'Nice to see you!',
      'Welcome!',
    ];

    const randomGreeting =
      greetings[Math.floor(Math.random() * greetings.length)];
    const name = args.length > 0 ? args.join(' ') : 'friend';

    console.log(`💫 ${randomGreeting} ${name}`);
    console.log(`   Plugin: ${this.name} v${this.version}`);

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
    console.log('⚙️  Hello Plugin configuration updated');
  }
}

// Export plugin class
module.exports = HelloPlugin;
