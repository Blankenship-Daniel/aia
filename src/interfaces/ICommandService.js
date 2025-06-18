/**
 * Command Service Interface
 * Defines the contract for command execution and management
 */
class ICommandService {
  /**
   * Initialize command service
   * @returns {Promise<void>}
   */
  async initialize() {
    throw new Error('ICommandService.initialize() must be implemented');
  }

  /**
   * Execute a shell command
   * @param {string} command - Command to execute
   * @param {Object} [options] - Execution options
   * @param {boolean} [options.optimize] - Whether to apply optimizations
   * @param {boolean} [options.safe] - Whether to apply safety checks
   * @param {string} [options.workingDirectory] - Working directory for command
   * @returns {Promise<Object>} Execution result with stdout, stderr, exitCode
   */
  async executeCommand(command, options = {}) {
    throw new Error('ICommandService.executeCommand() must be implemented');
  }

  /**
   * Validate command safety
   * @param {string} command - Command to validate
   * @returns {Promise<Object>} Validation result with safety level and warnings
   */
  async validateCommandSafety(command) {
    throw new Error(
      'ICommandService.validateCommandSafety() must be implemented'
    );
  }

  /**
   * Optimize command for better performance
   * @param {string} command - Command to optimize
   * @param {Object} context - Current context for optimization
   * @returns {Promise<Object>} Optimization result with optimized command and reason
   */
  async optimizeCommand(command, context) {
    throw new Error('ICommandService.optimizeCommand() must be implemented');
  }

  /**
   * Suggest next likely commands based on history
   * @param {Object} context - Current context
   * @param {Array} [history] - Recent command history
   * @returns {Promise<Array>} Array of suggested commands
   */
  async suggestCommands(context, history = []) {
    throw new Error('ICommandService.suggestCommands() must be implemented');
  }

  /**
   * Parse command into components
   * @param {string} command - Command to parse
   * @returns {Object} Parsed command components
   */
  parseCommand(command) {
    throw new Error('ICommandService.parseCommand() must be implemented');
  }

  /**
   * Check if command supports specific shell features
   * @param {string} command - Command to check
   * @param {Array<string>} features - Features to check for (pipes, redirects, etc.)
   * @returns {Object} Feature support map
   */
  checkCommandFeatures(command, features) {
    throw new Error(
      'ICommandService.checkCommandFeatures() must be implemented'
    );
  }

  /**
   * Get command execution history
   * @param {number} [limit] - Maximum number of commands to return
   * @param {Object} [filters] - Filters to apply
   * @returns {Promise<Array>} Command history
   */
  async getCommandHistory(limit = null, filters = {}) {
    throw new Error('ICommandService.getCommandHistory() must be implemented');
  }

  /**
   * Add command to execution history
   * @param {string} command - Executed command
   * @param {Object} result - Execution result
   * @param {Object} context - Execution context
   * @returns {Promise<void>}
   */
  async addToHistory(command, result, context) {
    throw new Error('ICommandService.addToHistory() must be implemented');
  }

  /**
   * Clear command history
   * @param {Object} [filters] - Optional filters for selective clearing
   * @returns {Promise<void>}
   */
  async clearHistory(filters = {}) {
    throw new Error('ICommandService.clearHistory() must be implemented');
  }
}

module.exports = ICommandService;
