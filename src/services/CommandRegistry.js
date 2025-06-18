/**
 * Command Registry Implementation
 * Manages command registration and resolution
 */
const ICommandRegistry = require('../interfaces/ICommandRegistry');

class CommandRegistry extends ICommandRegistry {
  constructor() {
    super();
    this.commands = new Map();
    this.aliases = new Map();
  }

  /**
   * Register a command
   * @param {ICommand} command - Command instance to register
   * @returns {void}
   */
  register(command) {
    if (!command || typeof command.execute !== 'function') {
      throw new Error('Invalid command: must implement execute method');
    }

    if (!command.getDefinition || typeof command.getDefinition !== 'function') {
      throw new Error('Invalid command: must implement getDefinition method');
    }

    const definition = command.getDefinition();
    if (!definition.name) {
      throw new Error('Invalid command: definition must have a name');
    }

    // Check for duplicate registration
    if (this.commands.has(definition.name)) {
      throw new Error(`Command '${definition.name}' is already registered`);
    }

    // Register command
    this.commands.set(definition.name, command);

    // Register aliases if any
    if (definition.aliases && Array.isArray(definition.aliases)) {
      definition.aliases.forEach((alias) => {
        if (this.aliases.has(alias)) {
          throw new Error(`Alias '${alias}' is already registered`);
        }
        this.aliases.set(alias, definition.name);
      });
    }
  }

  /**
   * Unregister a command
   * @param {string} name - Command name to unregister
   * @returns {boolean} True if command was unregistered
   */
  unregister(name) {
    if (!this.commands.has(name)) {
      return false;
    }

    const command = this.commands.get(name);
    const definition = command.getDefinition();

    // Remove aliases
    if (definition.aliases && Array.isArray(definition.aliases)) {
      definition.aliases.forEach((alias) => {
        this.aliases.delete(alias);
      });
    }

    // Remove command
    this.commands.delete(name);
    return true;
  }

  /**
   * Get a command by name or alias
   * @param {string} name - Command name or alias
   * @returns {ICommand|null} Command instance or null if not found
   */
  getCommand(name) {
    // First check direct command name
    if (this.commands.has(name)) {
      return this.commands.get(name);
    }

    // Then check aliases
    if (this.aliases.has(name)) {
      const commandName = this.aliases.get(name);
      return this.commands.get(commandName);
    }

    return null;
  }

  /**
   * Get all registered commands
   * @returns {Map<string, ICommand>} Map of command name to command instance
   */
  getAllCommands() {
    return new Map(this.commands);
  }

  /**
   * Check if a command is registered
   * @param {string} name - Command name or alias
   * @returns {boolean} True if command is registered
   */
  hasCommand(name) {
    return this.commands.has(name) || this.aliases.has(name);
  }

  /**
   * Get command names
   * @returns {Array<string>} Array of command names
   */
  getCommandNames() {
    return Array.from(this.commands.keys());
  }

  /**
   * Get all aliases
   * @returns {Map<string, string>} Map of alias to command name
   */
  getAliases() {
    return new Map(this.aliases);
  }

  /**
   * Get command count
   * @returns {number} Number of registered commands
   */
  getCommandCount() {
    return this.commands.size;
  }

  /**
   * Clear all commands
   * @returns {void}
   */
  clear() {
    this.commands.clear();
    this.aliases.clear();
  }
}

module.exports = CommandRegistry;
