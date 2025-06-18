/**
 * Command Interface
 * Base interface for all AIA commands
 */
class ICommand {
  /**
   * Execute the command
   * @param {Object} context - Execution context
   * @param {Array} args - Command arguments
   * @param {Object} options - Command options
   * @returns {Promise<any>} Command result
   */
  async execute(context, args, options) {
    throw new Error('Command execute method not implemented');
  }

  /**
   * Get command definition
   * @returns {Object} Command definition with name, description, etc.
   */
  getDefinition() {
    throw new Error('Command getDefinition method not implemented');
  }

  /**
   * Get command name
   * @returns {string} Command name
   */
  getName() {
    return this.getDefinition().name;
  }

  /**
   * Get command description
   * @returns {string} Command description
   */
  getDescription() {
    return this.getDefinition().description || '';
  }

  /**
   * Validate command arguments
   * @param {Array} args - Command arguments
   * @param {Object} options - Command options
   * @returns {boolean} True if valid
   */
  validate(args, options) {
    return true; // Default implementation
  }

  /**
   * Get command help text
   * @returns {string} Help text
   */
  getHelp() {
    const def = this.getDefinition();
    let help = `${def.name} - ${def.description}\n`;

    if (def.usage) {
      help += `Usage: ${def.usage}\n`;
    }

    if (def.examples && def.examples.length > 0) {
      help += 'Examples:\n';
      def.examples.forEach((example) => {
        help += `  ${example}\n`;
      });
    }

    return help;
  }
}

module.exports = ICommand;
