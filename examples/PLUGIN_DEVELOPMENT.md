# AIA Plugin Development Guide

This guide explains how to create custom plugins for the AIA (AI Agentic Assistant) CLI tool.

## Plugin Architecture

AIA plugins are modular extensions that can:

- Add custom CLI commands
- Hook into AIA's lifecycle events
- Enhance AI query processing
- Extend context analysis
- Provide specialized functionality

## Plugin Structure

A basic plugin consists of:

```
my-plugin/
├── plugin.json         # Plugin manifest
├── index.js           # Main plugin code
├── package.json       # Node.js dependencies (optional)
├── README.md          # Documentation
└── lib/               # Additional modules (optional)
```

## Plugin Manifest (plugin.json)

The `plugin.json` file defines plugin metadata:

```json
{
  "name": "my-plugin",
  "version": "1.0.0",
  "description": "Plugin description",
  "author": "Your Name",
  "homepage": "https://github.com/username/my-plugin",
  "main": "index.js",
  "aia_version": "^1.0.0",
  "commands": ["command1", "command2"],
  "hooks": ["beforeCommand", "afterAIQuery"],
  "permissions": ["console", "memory", "filesystem"],
  "dependencies": {},
  "config": {
    "key": "default_value"
  }
}
```

### Manifest Fields

- **name**: Unique plugin identifier
- **version**: Plugin version (semver)
- **description**: Brief plugin description
- **author**: Plugin author name
- **homepage**: Plugin repository/homepage URL
- **main**: Entry point file (default: index.js)
- **aia_version**: Compatible AIA version range
- **commands**: Array of custom commands
- **hooks**: Array of lifecycle hooks to register
- **permissions**: Required permissions
- **dependencies**: Node.js dependencies
- **config**: Default configuration values

## Plugin Implementation

### Basic Plugin Class

```javascript
const chalk = require('chalk');

class MyPlugin {
  constructor() {
    this.name = 'my-plugin';
    this.version = '1.0.0';
  }

  // Initialize plugin
  async initialize(api) {
    this.api = api;
    console.log(chalk.green(`🔌 ${this.name} loaded`));

    // Register commands
    this.api.registerCommand('mycommand', this.myCommand.bind(this));
  }

  // Cleanup plugin
  async cleanup() {
    console.log(chalk.yellow(`👋 ${this.name} shutting down`));
  }

  // Custom command implementation
  async myCommand(args, context) {
    console.log('Hello from my plugin!');
    return { success: true };
  }
}

module.exports = MyPlugin;
```

## Available Hooks

Plugins can hook into AIA's lifecycle:

### Command Hooks

- **beforeCommand**: Before command execution
- **afterCommand**: After command execution

### AI Hooks

- **beforeAIQuery**: Before AI query processing
- **afterAIQuery**: After AI response

### System Hooks

- **onStartup**: AIA startup
- **onShutdown**: AIA shutdown
- **onContextChange**: Working directory change
- **onMemoryUpdate**: Memory system update
- **onError**: Error handling

### Hook Implementation

```javascript
// Hook: Before command execution
async beforeCommand(context) {
  const { command, args } = context;

  if (command === 'dangerous-command') {
    console.log(chalk.yellow('⚠️  Warning: Dangerous command detected'));
  }

  // Return modified context
  return context;
}

// Hook: After AI query
async afterAIQuery(context) {
  const { prompt, response, model } = context;

  // Log AI usage
  console.log(chalk.gray(`AI: ${model} processed query`));

  return context;
}
```

## Plugin API

The plugin API provides access to AIA functionality:

### Available Methods

```javascript
// Register custom command
api.registerCommand(name, handler);

// Access memory system
api.getMemory();
api.updateMemory(data);

// Get current context
api.getContext();

// Log messages
api.log(message, level);

// Get configuration
api.getConfig(key);
api.setConfig(key, value);
```

### API Usage Example

```javascript
async initialize(api) {
  this.api = api;

  // Register command
  this.api.registerCommand('status', async (args, context) => {
    const memory = api.getMemory();
    const currentContext = api.getContext();

    console.log(`Commands executed: ${memory.commands.length}`);
    console.log(`Current directory: ${currentContext.workingDirectory}`);

    return { success: true };
  });
}
```

## Custom Commands

Plugins can add new CLI commands:

### Command Handler

```javascript
async myCommand(args, context) {
  // args: Array of command arguments
  // context: Current AIA context

  const option = args[0];
  const value = args[1];

  switch (option) {
    case 'list':
      return await this.listItems();
    case 'add':
      return await this.addItem(value);
    default:
      console.log('Usage: aia mycommand <list|add> [value]');
      return { success: false, error: 'Invalid option' };
  }
}
```

### Command Registration

```javascript
async initialize(api) {
  // Register multiple commands
  api.registerCommand('mycommand', this.myCommand.bind(this));
  api.registerCommand('another', this.anotherCommand.bind(this));
}
```

## Configuration Management

Plugins can have user-configurable settings:

### Default Configuration

```json
{
  "config": {
    "apiEndpoint": "https://api.example.com",
    "timeout": 5000,
    "enableDebug": false
  }
}
```

### Accessing Configuration

```javascript
async initialize(api) {
  this.config = api.getConfig() || {};

  // Use configuration
  const endpoint = this.config.apiEndpoint;
  const timeout = this.config.timeout;
}

// Update configuration
updateConfig(newConfig) {
  this.config = { ...this.config, ...newConfig };
  this.api.setConfig(this.config);
}
```

## Error Handling

Implement proper error handling:

```javascript
async myCommand(args, context) {
  try {
    // Command logic
    const result = await this.processCommand(args);
    return { success: true, result };
  } catch (error) {
    console.error(chalk.red(`Error in ${this.name}:`, error.message));
    return { success: false, error: error.message };
  }
}
```

## Security Considerations

### Permissions

Plugins must declare required permissions:

```json
{
  "permissions": [
    "console", // Console output
    "memory", // Memory access
    "filesystem", // File system access
    "network", // Network requests
    "commands" // Execute commands
  ]
}
```

### Sandboxing

Plugins run in a sandboxed environment:

- Limited access to Node.js modules
- Timeout protection (30 seconds)
- Memory limits (100MB per plugin)
- Restricted file system access

## Testing Plugins

### Local Testing

```bash
# Install from local directory
aia plugin-install ./my-plugin --name my-plugin

# Test plugin commands
aia mycommand list
aia plugin-info my-plugin

# Uninstall
aia plugin-uninstall my-plugin
```

### Plugin Development Workflow

1. Create plugin directory structure
2. Implement plugin class
3. Test locally with `aia plugin-install`
4. Debug using `aia plugin-info` and `aia plugin-stats`
5. Iterate and improve
6. Document functionality
7. Publish (git repository or plugin registry)

## Example Plugins

### Productivity Plugin

```javascript
class ProductivityPlugin {
  async initialize(api) {
    api.registerCommand('pomodoro', this.pomodoroTimer.bind(this));
    api.registerCommand('todo', this.todoManager.bind(this));
  }

  async pomodoroTimer(args, context) {
    const minutes = parseInt(args[0]) || 25;
    console.log(`🍅 Starting ${minutes}-minute Pomodoro timer`);
    // Timer implementation
  }

  async todoManager(args, context) {
    const action = args[0];
    // Todo list management
  }
}
```

### Git Enhancement Plugin

```javascript
class GitEnhancementPlugin {
  async beforeCommand(context) {
    const { command } = context;

    if (command.startsWith('git push')) {
      // Automatically run tests before push
      console.log('🧪 Running tests before git push...');
    }

    return context;
  }
}
```

## Plugin Distribution

### Git Repository

1. Create git repository for plugin
2. Include proper `plugin.json` and `README.md`
3. Tag releases with version numbers
4. Install with: `aia plugin-install git+https://github.com/user/plugin.git`

### Local Distribution

1. Create plugin directory
2. Copy to share with others
3. Install with: `aia plugin-install /path/to/plugin`

## Best Practices

1. **Follow Naming Conventions**: Use descriptive, unique names
2. **Handle Errors Gracefully**: Provide meaningful error messages
3. **Document Thoroughly**: Include README and inline comments
4. **Test Extensively**: Test all commands and hooks
5. **Respect Resources**: Be mindful of performance impact
6. **Version Properly**: Use semantic versioning
7. **Validate Input**: Check command arguments and context
8. **Provide Feedback**: Use chalk for colored, informative output

## Troubleshooting

### Common Issues

1. **Plugin Not Loading**: Check `plugin.json` syntax and required fields
2. **Command Not Found**: Verify command registration in `initialize()`
3. **Hook Not Firing**: Ensure hook is listed in manifest `hooks` array
4. **Permission Denied**: Add required permissions to manifest
5. **Timeout Errors**: Optimize plugin performance or increase timeout

### Debug Mode

```javascript
// Enable debug logging
console.log(chalk.gray('DEBUG: Plugin executing command'));

// Check plugin status
aia plugin-info my-plugin
aia plugin-stats
```

## Community

- Share plugins on GitHub with `aia-plugin` topic
- Follow semantic versioning
- Contribute to plugin ecosystem
- Report issues and improvements

This guide provides the foundation for creating powerful AIA plugins. Start with the sample plugin and expand from there!
