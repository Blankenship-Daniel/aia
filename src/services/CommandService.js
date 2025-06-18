/**
 * Command Service Implementation
 * Manages command execution and optimization
 */
const ICommandService = require('../interfaces/ICommandService');

class CommandService extends ICommandService {
  constructor(configurationService, contextService, memoryService) {
    super();
    this.configService = configurationService;
    this.contextService = contextService;
    this.memoryService = memoryService;
    this.initialized = false;
  }

  /**
   * Initialize command service
   * @returns {Promise<void>}
   */
  async initialize() {
    if (this.initialized) {
      return;
    }

    this.initialized = true;
    console.log('CommandService initialized');
  }

  /**
   * Execute a shell command
   * @param {string} command - Command to execute
   * @param {Object} [options] - Execution options
   * @returns {Promise<Object>} Execution result with stdout, stderr, exitCode
   */
  async executeCommand(command, options = {}) {
    const { spawn } = require('child_process');
    const startTime = Date.now();

    return new Promise((resolve, reject) => {
      // Parse command and arguments
      const parts = command.split(' ');
      const cmd = parts[0];
      const args = parts.slice(1);

      let stdout = '';
      let stderr = '';

      const child = spawn(cmd, args, {
        cwd: options.cwd || process.cwd(),
        stdio: ['inherit', 'pipe', 'pipe'],
        shell: true,
      });

      child.stdout.on('data', (data) => {
        const output = data.toString();
        stdout += output;
        process.stdout.write(output); // Show output in real-time
      });

      child.stderr.on('data', (data) => {
        const output = data.toString();
        stderr += output;
        process.stderr.write(output); // Show errors in real-time
      });

      child.on('close', async (exitCode) => {
        const duration = Date.now() - startTime;
        const result = {
          command,
          stdout: stdout.trim(),
          stderr: stderr.trim(),
          exitCode,
          duration,
          timestamp: new Date().toISOString(),
        };

        // Add to memory if memoryService is available
        if (this.memoryService) {
          const context = await this.contextService.gatherContext();
          await this.memoryService.addCommand(command, result, context);
        }

        resolve(result);
      });

      child.on('error', (error) => {
        reject(new Error(`Failed to execute command: ${error.message}`));
      });
    });
  }

  /**
   * Validate command safety
   * @param {string} command - Command to validate
   * @returns {Promise<Object>} Validation result with safety level and warnings
   */
  async validateCommandSafety(command) {
    // Placeholder implementation
    const dangerousCommands = ['rm -rf', 'format', 'del /f', 'shutdown'];
    const isDangerous = dangerousCommands.some((dangerous) =>
      command.toLowerCase().includes(dangerous)
    );

    return {
      command,
      safetyLevel: isDangerous ? 'high-risk' : 'safe',
      warnings: isDangerous ? ['Command may be destructive'] : [],
      shouldConfirm: isDangerous,
    };
  }

  /**
   * Optimize command for better performance
   * @param {string} command - Command to optimize
   * @param {Object} context - Current context for optimization
   * @returns {Promise<Object>} Optimization result with optimized command and reason
   */
  async optimizeCommand(command, context) {
    // Placeholder implementation
    let optimizedCommand = command;
    let reason = 'No optimization applied';

    // Simple optimization example
    if (command.includes('find') && !command.includes('head')) {
      optimizedCommand = `${command} | head -20`;
      reason = 'Limited output for performance';
    }

    return {
      original: command,
      optimized: optimizedCommand,
      reason,
      applied: optimizedCommand !== command,
    };
  }

  /**
   * Suggest commands based on context and history
   * @param {Object} context - Current context
   * @param {Array} [history] - Recent command history
   * @returns {Promise<Array>} Array of suggested commands
   */
  async suggestCommands(context, history = []) {
    // Placeholder implementation
    const suggestions = ['ls -la', 'git status', 'npm install', 'cd ..'];

    return suggestions.map((command) => ({
      command,
      description: `Execute ${command}`,
      confidence: 0.5,
    }));
  }

  /**
   * Parse command into components
   * @param {string} command - Command to parse
   * @returns {Object} Parsed command components
   */
  parseCommand(command) {
    const parts = command.trim().split(/\s+/);
    return {
      command: parts[0],
      arguments: parts.slice(1),
      raw: command,
      parsed: true,
    };
  }

  /**
   * Check if command supports specific shell features
   * @param {string} command - Command to check
   * @param {Array<string>} features - Features to check for (pipes, redirects, etc.)
   * @returns {Object} Feature support map
   */
  checkCommandFeatures(command, features) {
    const support = {};

    for (const feature of features) {
      switch (feature) {
        case 'pipes':
          support[feature] = command.includes('|');
          break;
        case 'redirects':
          support[feature] = command.includes('>') || command.includes('<');
          break;
        default:
          support[feature] = false;
      }
    }

    return support;
  }

  /**
   * Get command execution history
   * @param {number} [limit] - Maximum number of commands to return
   * @param {Object} [filters] - Filters to apply
   * @returns {Promise<Array>} Command history
   */
  async getCommandHistory(limit = null, filters = {}) {
    if (!this.memoryService) {
      return [];
    }

    return await this.memoryService.getRecentCommands(limit || 10);
  }

  /**
   * Add command to execution history
   * @param {string} command - Executed command
   * @param {Object} result - Execution result
   * @param {Object} context - Execution context
   * @returns {Promise<void>}
   */
  async addToHistory(command, result, context) {
    if (this.memoryService) {
      await this.memoryService.addCommand(command, result, context);
    }
  }

  /**
   * Clear command history
   * @param {Object} [filters] - Optional filters for selective clearing
   * @returns {Promise<void>}
   */
  async clearHistory(filters = {}) {
    if (this.memoryService) {
      await this.memoryService.clear({ commands: true });
    }
  }
}

module.exports = CommandService;
