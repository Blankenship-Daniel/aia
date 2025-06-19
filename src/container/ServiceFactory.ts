/**
 * Service Factory
 * Configures and registers all services with the DI container
 */
import { DIContainer } from './DIContainer.js';

// Note: Interfaces are now in TypeScript files and not needed for runtime
// They provide type safety for the TypeScript services

interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export class ServiceFactory {
  /**
   * Create and configure DI container with all services
   * @returns Configured container
   */
  public static createContainer(): DIContainer {
    const container = new DIContainer();

    // Register core services
    this.registerCoreServices(container);

    // Register utility services
    this.registerUtilityServices(container);

    return container;
  }

  /**
   * Register core business logic services
   * @param container - DI container
   */
  public static registerCoreServices(container: DIContainer): void {
    // Configuration Service (no dependencies - foundational)
    container.registerFactory('configuration', (container) => {
      const {
        ConfigurationService,
      } = require('../../dist/services/ConfigurationService');
      return new ConfigurationService();
    });

    // Memory Service (depends on configuration)
    container.registerFactory(
      'memory',
      (container) => {
        const { MemoryService } = require('../../dist/services/MemoryService');
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
        const {
          ContextService,
        } = require('../../dist/services/ContextService');
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
        const {
          CommandService,
        } = require('../../dist/services/CommandService');
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
        const { AIService } = require('../../dist/services/AIService');
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
        const { PluginService } = require('../../dist/services/PluginService');
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
        const {
          WorkflowService,
        } = require('../../dist/services/WorkflowService');
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
   * @param container - DI container
   */
  public static registerUtilityServices(container: DIContainer): void {
    // Error Handler
    container.registerFactory('errorHandler', (container) => {
      const ErrorHandler = require('../../dist/ErrorHandler').default;
      return new ErrorHandler();
    });

    // Security Validator
    container.registerFactory('security', (container) => {
      const SecurityValidator = require('../../dist/SecurityValidator').default;
      return new SecurityValidator();
    });

    // CLI Formatter
    container.registerFactory('formatter', (container) => {
      const { CLIFormatter } = require('../../dist/CLIFormatter');
      return new CLIFormatter();
    });

    // Performance Optimizer
    container.registerFactory('performance', (container) => {
      const {
        PerformanceOptimizer,
      } = require('../../dist/PerformanceOptimizer');
      return new PerformanceOptimizer();
    });
  }

  /**
   * Create configured container for testing
   * @param mockServices - Mock services to override
   * @returns Test container
   */
  public static createTestContainer(
    mockServices: Record<string, unknown> = {}
  ): DIContainer {
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
   * @param container - Container to validate
   * @returns Validation result
   */
  public static validateContainer(container: DIContainer): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

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
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      if (errorMessage.includes('Circular dependency')) {
        errors.push(errorMessage);
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }
}
