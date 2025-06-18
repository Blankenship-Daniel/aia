/**
 * Command Factory
 * Creates and configures command instances with their dependencies
 */
const AskCommand = require('./AskCommand');
const ExecuteCommand = require('./ExecuteCommand');
const ContextCommand = require('./ContextCommand');
const MemoryCommand = require('./MemoryCommand');
const ConfigCommand = require('./ConfigCommand');
const AgentCommand = require('./AgentCommand');

class CommandFactory {
  /**
   * Create all commands with their dependencies
   * @param {Object} services - Service dependencies
   * @returns {Array<ICommand>} Array of command instances
   */
  static createCommands(services) {
    const {
      aiService,
      memoryService,
      contextService,
      commandService,
      configurationService,
      logger,
    } = services;

    const commands = [];

    // Ask Command
    if (aiService && memoryService && contextService) {
      commands.push(
        new AskCommand(aiService, memoryService, contextService, logger)
      );
    }

    // Execute Command
    if (commandService && memoryService && contextService) {
      commands.push(
        new ExecuteCommand(
          commandService,
          memoryService,
          contextService,
          logger
        )
      );
    }

    // Context Command
    if (contextService) {
      commands.push(new ContextCommand(contextService, logger));
    }

    // Memory Command
    if (memoryService) {
      commands.push(new MemoryCommand(memoryService, logger));
    }

    // Config Command
    if (configurationService) {
      commands.push(new ConfigCommand(configurationService, logger));
    }

    // Agent Command
    if (aiService && memoryService && contextService && commandService) {
      commands.push(
        new AgentCommand(
          aiService,
          memoryService,
          contextService,
          commandService,
          configurationService,
          logger
        )
      );
    }

    return commands;
  }

  /**
   * Register commands with a command registry
   * @param {ICommandRegistry} registry - Command registry
   * @param {Object} services - Service dependencies
   * @returns {number} Number of commands registered
   */
  static registerCommands(registry, services) {
    const commands = this.createCommands(services);

    let registeredCount = 0;
    commands.forEach((command) => {
      try {
        registry.register(command);
        registeredCount++;
      } catch (error) {
        if (services.logger) {
          services.logger.error(
            `Failed to register command ${command.getName()}:`,
            error
          );
        }
      }
    });

    return registeredCount;
  }

  /**
   * Create a specific command by name
   * @param {string} commandName - Name of command to create
   * @param {Object} services - Service dependencies
   * @returns {ICommand|null} Command instance or null if not found
   */
  static createCommand(commandName, services) {
    const commands = this.createCommands(services);
    return commands.find((cmd) => cmd.getName() === commandName) || null;
  }

  /**
   * Get command creation requirements
   * @returns {Object} Map of command names to required services
   */
  static getCommandRequirements() {
    return {
      ask: ['aiService', 'memoryService', 'contextService'],
      exec: ['commandService', 'memoryService', 'contextService'],
      context: ['contextService'],
      memory: ['memoryService'],
      config: ['configurationService'],
    };
  }

  /**
   * Validate service dependencies for command creation
   * @param {Object} services - Service dependencies
   * @returns {Object} Validation result
   */
  static validateServices(services) {
    const requirements = this.getCommandRequirements();
    const results = {};
    const missing = [];

    Object.entries(requirements).forEach(([commandName, requiredServices]) => {
      const commandMissing = requiredServices.filter(
        (service) => !services[service] || typeof services[service] !== 'object'
      );

      results[commandName] = {
        canCreate: commandMissing.length === 0,
        missing: commandMissing,
      };

      if (commandMissing.length > 0) {
        missing.push({ command: commandName, services: commandMissing });
      }
    });

    return {
      valid: missing.length === 0,
      results,
      missing,
    };
  }
}

module.exports = CommandFactory;
