/**
 * Command Registry Interface
 * Manages registration and resolution of commands
 */
class ICommandRegistry {
  /**
   * Register a command
   * @param {ICommand} command - Command instance to register
   * @returns {void}
   */
  register(command) {
    throw new Error('CommandRegistry register method not implemented');
  }

  /**
   * Unregister a command
   * @param {string} name - Command name to unregister
   * @returns {boolean} True if command was unregistered
   */
  unregister(name) {
    throw new Error('CommandRegistry unregister method not implemented');
  }

  /**
   * Get a command by name
   * @param {string} name - Command name
   * @returns {ICommand|null} Command instance or null if not found
   */
  getCommand(name) {
    throw new Error('CommandRegistry getCommand method not implemented');
  }

  /**
   * Get all registered commands
   * @returns {Map<string, ICommand>} Map of command name to command instance
   */
  getAllCommands() {
    throw new Error('CommandRegistry getAllCommands method not implemented');
  }

  /**
   * Check if a command is registered
   * @param {string} name - Command name
   * @returns {boolean} True if command is registered
   */
  hasCommand(name) {
    throw new Error('CommandRegistry hasCommand method not implemented');
  }

  /**
   * Get command names
   * @returns {Array<string>} Array of command names
   */
  getCommandNames() {
    throw new Error('CommandRegistry getCommandNames method not implemented');
  }
}

module.exports = ICommandRegistry;
