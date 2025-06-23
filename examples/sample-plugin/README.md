# Hello Plugin for AIA

A simple example plugin that demonstrates the AIA plugin system capabilities.

## Features

- Custom commands: `hello` and `greet`
- Command hooks for enhanced functionality
- Configuration management
- Demonstration of plugin lifecycle

## Installation

```bash
# Install from local directory
aia plugin-install /path/to/sample-plugin --name hello-plugin

# Or copy to ~/.aia/plugins/hello-plugin/
```

## Usage

```bash
# List plugins
aia plugin-list

# Use custom commands
aia hello
aia hello John Doe
aia greet
aia greet everyone

# Plugin information
aia plugin-info hello-plugin

# Plugin statistics
aia plugin-stats
```

## Commands

### `hello [name...]`

Displays a hello message with optional name.

### `greet [name...]`

Displays a random greeting with optional name.

## Hooks

- **beforeCommand**: Triggered before command execution
- **afterAIQuery**: Triggered after AI query processing

## Configuration

The plugin supports configuration through the `plugin.json` file:

```json
{
  "config": {
    "greeting": "Hello from AIA Plugin!",
    "showTimestamp": true
  }
}
```

## Development

This plugin serves as a template for developing AIA plugins. Key features:

1. **Plugin Class**: Main plugin functionality
2. **Initialization**: Setup and registration
3. **Cleanup**: Proper shutdown handling
4. **Custom Commands**: Additional CLI functionality
5. **Hooks**: Integration with AIA lifecycle
6. **Configuration**: User-customizable settings

## License

ISC
