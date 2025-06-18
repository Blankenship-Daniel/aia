/**
 * Execute Command Implementation
 * Handles command execution with AI assistance
 */
const ICommand = require('../interfaces/ICommand');

class ExecuteCommand extends ICommand {
  constructor(commandService, memoryService, contextService, logger) {
    super();
    this.commandService = commandService;
    this.memoryService = memoryService;
    this.contextService = contextService;
    this.logger = logger;
  }

  /**
   * Get command definition
   * @returns {Object} Command definition
   */
  getDefinition() {
    return {
      name: 'exec',
      description:
        'Execute terminal commands with optimization and safety checks',
      aliases: ['x', 'run'],
      usage: 'exec <command> [args...]',
      examples: [
        'exec ls -la',
        'exec git status',
        'exec npm install',
        'exec "find . -name *.js | head -10"',
      ],
    };
  }

  /**
   * Validate command arguments
   * @param {Array} args - Command arguments
   * @param {Object} options - Command options
   * @returns {boolean} True if valid
   */
  validate(args, options) {
    if (!args || args.length === 0) {
      throw new Error('Please provide a command to execute');
    }

    const command = args.join(' ').trim();
    if (!command) {
      throw new Error('Command cannot be empty');
    }

    return true;
  }

  /**
   * Execute the command
   * @param {Object} context - Execution context
   * @param {Array} args - Command arguments
   * @param {Object} options - Command options
   * @returns {Promise<Object>} Command execution result
   */
  async execute(context, args, options) {
    try {
      // Validate arguments
      this.validate(args, options);

      const command = args.join(' ').trim();
      console.log(`Executing command: ${command}`);

      // Get current context
      const currentContext = await this.contextService.gatherContext();

      // Validate command safety
      const validation = await this.commandService.validateCommandSafety(
        command,
        currentContext
      );
      if (validation.safetyLevel === 'high-risk' && !options.force) {
        throw new Error(
          `Unsafe command detected: ${validation.warnings.join(
            ', '
          )}. Use --force to override.`
        );
      }

      // Optimize command if possible
      let optimizedCommand = command;
      if (!options.noOptimize) {
        const optimization = await this.commandService.optimizeCommand(
          command,
          currentContext
        );
        if (optimization.applied) {
          optimizedCommand = optimization.optimized;
          this.logger?.info(`Command optimized: ${optimizedCommand}`);
          if (
            optimization.reason &&
            optimization.reason !== 'No optimization applied'
          ) {
            console.log(`💡 Optimization applied: ${optimization.reason}`);
          }
        }
      }

      // Execute the command
      const result = await this.commandService.executeCommand(
        optimizedCommand,
        {
          cwd: currentContext.workingDirectory,
          ...options,
        }
      );

      // Store command in memory
      const commandEntry = {
        id: this.generateId(),
        command: optimizedCommand,
        originalCommand: command !== optimizedCommand ? command : null,
        result: {
          exitCode: result.exitCode,
          stdout: result.stdout,
          stderr: result.stderr,
          duration: result.duration,
        },
        timestamp: new Date().toISOString(),
        context: {
          workingDirectory: currentContext.workingDirectory,
          projectType: currentContext.projectType,
        },
      };

      await this.memoryService.addCommand(
        commandEntry.command,
        commandEntry.result,
        commandEntry.context
      );

      return result;
    } catch (error) {
      this.logger?.error('Execute command failed:', error);
      throw error;
    }
  }

  /**
   * Generate unique command ID
   * @returns {string} Unique ID
   */
  generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }
}

module.exports = ExecuteCommand;
