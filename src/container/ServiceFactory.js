/**
 * Service Factory
 * Configures and registers all services with the DI container
 */
const DIContainer = require('./DIContainer');

// Import service interfaces (for type checking)
const IAIService = require('../interfaces/IAIService');
const IMemoryService = require('../interfaces/IMemoryService');
const IContextService = require('../interfaces/IContextService');
const ICommandService = require('../interfaces/ICommandService');
const IConfigurationService = require('../interfaces/IConfigurationService');
const IPluginService = require('../interfaces/IPluginService');
const IWorkflowService = require('../interfaces/IWorkflowService');

class ServiceFactory {
  /**
   * Create and configure DI container with all services
   * @returns {DIContainer} Configured container
   */
  static createContainer() {
    const container = new DIContainer();

    // Register core services
    this.registerCoreServices(container);

    // Register utility services
    this.registerUtilityServices(container);

    return container;
  }

  /**
   * Register core business logic services
   * @param {DIContainer} container - DI container
   */
  static registerCoreServices(container) {
    // Configuration Service (no dependencies - foundational)
    container.registerFactory('configuration', (container) => {
      const ConfigurationService = require('../services/ConfigurationService');
      return new ConfigurationService();
    });

    // Memory Service (depends on configuration)
    container.registerFactory(
      'memory',
      (container) => {
        const MemoryService = require('../services/MemoryService');
        const config = container.resolve('configuration');
        return new MemoryService(config);
      },
      {
        dependencies: ['configuration'],
      }
    );

    // Context Service (depends on configuration)
    container.registerFactory(
      'context',
      (container) => {
        const ContextService = require('../services/ContextService');
        const config = container.resolve('configuration');
        return new ContextService(config);
      },
      {
        dependencies: ['configuration'],
      }
    );

    // Command Service (depends on configuration and context)
    container.registerFactory(
      'command',
      (container) => {
        const CommandService = require('../services/CommandService');
        const config = container.resolve('configuration');
        const context = container.resolve('context');
        const memory = container.resolve('memory');
        return new CommandService(config, context, memory);
      },
      {
        dependencies: ['configuration', 'context', 'memory'],
      }
    );

    // AI Service (depends on configuration and memory)
    container.registerFactory(
      'ai',
      (container) => {
        const AIService = require('../services/AIService');
        const config = container.resolve('configuration');
        const memory = container.resolve('memory');
        return new AIService(config, memory);
      },
      {
        dependencies: ['configuration', 'memory'],
      }
    );

    // Plugin Service (depends on configuration and other services)
    container.registerFactory(
      'plugin',
      (container) => {
        const PluginService = require('../services/PluginService');
        const config = container.resolve('configuration');
        return new PluginService(config, container);
      },
      {
        dependencies: ['configuration'],
      }
    );

    // Workflow Service (depends on configuration, command, and memory)
    container.registerFactory(
      'workflow',
      (container) => {
        const WorkflowService = require('../services/WorkflowService');
        const config = container.resolve('configuration');
        const command = container.resolve('command');
        const memory = container.resolve('memory');
        return new WorkflowService(config, command, memory);
      },
      {
        dependencies: ['configuration', 'command', 'memory'],
      }
    );
  }

  /**
   * Register utility and helper services
   * @param {DIContainer} container - DI container
   */
  static registerUtilityServices(container) {
    // Error Handler
    container.registerFactory('errorHandler', (container) => {
      const ErrorHandler = require('../ErrorHandler');
      return new ErrorHandler();
    });

    // Security Validator
    container.registerFactory('security', (container) => {
      const SecurityValidator = require('../SecurityValidator');
      return new SecurityValidator();
    });

    // CLI Formatter
    container.registerFactory('formatter', (container) => {
      const CLIFormatter = require('../CLIFormatter');
      return new CLIFormatter();
    });

    // Performance Optimizer
    container.registerFactory('performance', (container) => {
      const PerformanceOptimizer = require('../PerformanceOptimizer');
      return new PerformanceOptimizer();
    });
  }

  /**
   * Create configured container for testing
   * @param {Object} mockServices - Mock services to override
   * @returns {DIContainer} Test container
   */
  static createTestContainer(mockServices = {}) {
    const container = new DIContainer();

    // Register mock services first
    for (const [name, mock] of Object.entries(mockServices)) {
      container.registerInstance(name, mock);
    }

    // Register remaining services
    this.registerCoreServices(container);
    this.registerUtilityServices(container);

    return container;
  }

  /**
   * Validate container configuration
   * @param {DIContainer} container - Container to validate
   * @returns {Object} Validation result
   */
  static validateContainer(container) {
    const errors = [];
    const warnings = [];

    const requiredServices = [
      'configuration',
      'memory',
      'context',
      'command',
      'ai',
      'plugin',
      'workflow',
    ];

    // Check required services are registered
    for (const serviceName of requiredServices) {
      if (!container.has(serviceName)) {
        errors.push(`Required service '${serviceName}' is not registered`);
      }
    }

    // Check for circular dependencies
    try {
      container.getInitializationOrder();
    } catch (error) {
      if (error.message.includes('Circular dependency')) {
        errors.push(error.message);
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }
}

module.exports = ServiceFactory;
