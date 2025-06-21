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
        const {
          CompositeMemoryService,
        } = require('../../dist/services/CompositeMemoryService');
        const memoryPersistence = container.resolve('memoryPersistence');
        const conversationMemory = container.resolve('conversationMemory');
        const commandMemory = container.resolve('commandMemory');
        const memoryStatistics = container.resolve('memoryStatistics');
        const memoryImportExport = container.resolve('memoryImportExport');
        return new CompositeMemoryService(
          memoryPersistence,
          conversationMemory,
          commandMemory,
          memoryStatistics,
          memoryImportExport
        );
      },
      {
        dependencies: [
          'memoryPersistence',
          'conversationMemory',
          'commandMemory',
          'memoryStatistics',
          'memoryImportExport',
        ],
      }
    );

    // Memory Persistence Service (depends on configuration)
    container.registerFactory(
      'memoryPersistence',
      (container) => {
        const {
          MemoryPersistenceService,
        } = require('../../dist/services/MemoryPersistenceService');
        const config = container.resolve('configuration');
        return new MemoryPersistenceService(config);
      },
      {
        dependencies: ['configuration'],
      }
    );

    // Conversation Memory Service (depends on memoryPersistence and caching)
    container.registerFactory(
      'conversationMemory',
      (container) => {
        const {
          ConversationMemoryService,
        } = require('../../dist/services/ConversationMemoryService');
        const memoryPersistence = container.resolve('memoryPersistence');
        const caching = container.resolve('caching');
        return new ConversationMemoryService(memoryPersistence, caching);
      },
      {
        dependencies: ['memoryPersistence', 'caching'],
      }
    );

    // Command Memory Service (depends on memoryPersistence)
    container.registerFactory(
      'commandMemory',
      (container) => {
        const {
          CommandMemoryService,
        } = require('../../dist/services/CommandMemoryService');
        const memoryPersistence = container.resolve('memoryPersistence');
        return new CommandMemoryService(memoryPersistence);
      },
      {
        dependencies: ['memoryPersistence'],
      }
    );

    // Memory Statistics Service (depends on memoryPersistence)
    container.registerFactory(
      'memoryStatistics',
      (container) => {
        const {
          MemoryStatisticsService,
        } = require('../../dist/services/MemoryStatisticsService');
        const memoryPersistence = container.resolve('memoryPersistence');
        return new MemoryStatisticsService(memoryPersistence);
      },
      {
        dependencies: ['memoryPersistence'],
      }
    );

    // Memory Import/Export Service (depends on memoryPersistence)
    container.registerFactory(
      'memoryImportExport',
      (container) => {
        const {
          MemoryImportExportService,
        } = require('../../dist/services/MemoryImportExportService');
        const memoryPersistence = container.resolve('memoryPersistence');
        return new MemoryImportExportService(memoryPersistence);
      },
      {
        dependencies: ['memoryPersistence'],
      }
    );

    // Caching Service (no dependencies - foundational)
    container.registerFactory('caching', (container) => {
      const {
        MemoryCacheService,
      } = require('../../dist/services/MemoryCacheService');
      return new MemoryCacheService({
        defaultTTL: 300000, // 5 minutes
        maxItems: 1000,
        cleanupIntervalMs: 60000, // 1 minute
      });
    });

    // Enhanced Caching Service (depends on caching and configuration)
    container.registerFactory(
      'enhancedCaching',
      (container) => {
        const {
          EnhancedCachingService,
        } = require('../../dist/services/EnhancedCachingService');
        const caching = container.resolve('caching');
        const config = container.resolve('configuration');
        return new EnhancedCachingService(caching, config);
      },
      {
        dependencies: ['caching', 'configuration'],
      }
    );

    // Performance Monitor Service (no dependencies - foundational)
    container.registerFactory('performanceMonitor', (container) => {
      const {
        PerformanceMonitorService,
      } = require('../../dist/services/PerformanceMonitorService');
      return new PerformanceMonitorService();
    });

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

    // Command Service (depends on configuration, context, and commandMemory)
    container.registerFactory(
      'command',
      (container) => {
        const {
          CommandService,
        } = require('../../dist/services/CommandService');
        const config = container.resolve('configuration');
        const context = container.resolve('context');
        const commandMemory = container.resolve('commandMemory');
        return new CommandService(config, context, commandMemory);
      },
      {
        dependencies: ['configuration', 'context', 'commandMemory'],
      }
    );

    // AI Service (depends on configuration and conversationMemory)
    container.registerFactory(
      'ai',
      (container) => {
        const { AIService } = require('../../dist/services/AIService');
        const config = container.resolve('configuration');
        const conversationMemory = container.resolve('conversationMemory');
        return new AIService(config, conversationMemory);
      },
      {
        dependencies: ['configuration', 'conversationMemory'],
      }
    );

    // AI Model Recommendation Service (depends on ai and context)
    container.registerFactory(
      'modelRecommendation',
      (container) => {
        const {
          AIModelRecommendationService,
        } = require('../../dist/services/AIModelRecommendationService');
        const ai = container.resolve('ai');
        const context = container.resolve('context');
        return new AIModelRecommendationService(ai, context);
      },
      {
        dependencies: ['ai', 'context'],
      }
    );

    // AI Security Analyzer Service (depends on ai and context)
    container.registerFactory(
      'aiSecurityAnalyzer',
      (container) => {
        const {
          AISecurityAnalyzer,
        } = require('../../dist/services/AISecurityAnalyzer');
        const ai = container.resolve('ai');
        const context = container.resolve('context');
        return new AISecurityAnalyzer(ai, context);
      },
      {
        dependencies: ['ai', 'context'],
      }
    );

    // AI Coreference Resolution Service (depends on ai and conversationMemory)
    container.registerFactory(
      'coreferenceResolution',
      (container) => {
        const {
          AICoreferenceResolutionService,
        } = require('../../dist/services/AICoreferenceResolutionService');
        const ai = container.resolve('ai');
        const conversationMemory = container.resolve('conversationMemory');
        return new AICoreferenceResolutionService(ai, conversationMemory);
      },
      {
        dependencies: ['ai', 'conversationMemory'],
      }
    );

    // Conversation Context Manager (depends on ai and coreferenceResolution)
    container.registerFactory(
      'conversationContextManager',
      (container) => {
        const {
          ConversationContextManager,
        } = require('../../dist/ConversationContextManager');
        const ai = container.resolve('ai');
        const coreferenceResolution = container.resolve(
          'coreferenceResolution'
        );
        return new ConversationContextManager(ai, coreferenceResolution);
      },
      {
        dependencies: ['ai', 'coreferenceResolution'],
      }
    );

    // AI Error Diagnostic Service (depends on ai, context, conversationMemory)
    container.registerFactory(
      'errorDiagnostic',
      (container) => {
        const {
          AIErrorDiagnosticService,
        } = require('../../dist/services/AIErrorDiagnosticService');
        const ai = container.resolve('ai');
        const context = container.resolve('context');
        const conversationMemory = container.resolve('conversationMemory');
        return new AIErrorDiagnosticService(ai, context, conversationMemory);
      },
      {
        dependencies: ['ai', 'context', 'conversationMemory'],
      }
    );

    // Error Analysis Service (depends on errorDiagnostic)
    container.registerFactory(
      'errorAnalysis',
      (container) => {
        const {
          ErrorAnalysisService,
        } = require('../../dist/services/ErrorAnalysisService');
        const errorDiagnostic = container.resolve('errorDiagnostic');
        return new ErrorAnalysisService(errorDiagnostic);
      },
      {
        dependencies: ['errorDiagnostic'],
      }
    );

    // Agentic Reasoning Engine (depends on ai and conversationContextManager)
    container.registerFactory(
      'agenticReasoningEngine',
      (container) => {
        const {
          AgenticReasoningEngine,
        } = require('../../dist/AgenticReasoningEngine');
        const ai = container.resolve('ai');
        const conversationContextManager = container.resolve(
          'conversationContextManager'
        );
        return new AgenticReasoningEngine(ai, conversationContextManager);
      },
      {
        dependencies: ['ai', 'conversationContextManager'],
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

    // GitHub Copilot Dependency Service (no dependencies - foundational)
    container.registerFactory('copilotDependency', (container) => {
      const {
        CopilotDependencyService,
      } = require('../../dist/services/CopilotDependencyService');
      return new CopilotDependencyService();
    });

    // GitHub Copilot Service (depends on configuration, caching, ai, and copilotDependency)
    container.registerFactory(
      'copilot',
      (container) => {
        const {
          CopilotService,
        } = require('../../dist/services/CopilotService');
        const config = container.resolve('configuration');
        const caching = container.resolve('caching');
        const ai = container.resolve('ai');
        const copilotDependency = container.resolve('copilotDependency');
        return new CopilotService(config, caching, ai, copilotDependency);
      },
      {
        dependencies: ['configuration', 'caching', 'ai', 'copilotDependency'],
      }
    );

    // Security Validator Service (depends on aiSecurityAnalyzer - optional dependency)
    container.registerFactory(
      'securityValidator',
      (container) => {
        const { SecurityValidator } = require('../../dist/SecurityValidator');
        try {
          const aiSecurityAnalyzer = container.resolve('aiSecurityAnalyzer');
          return new SecurityValidator(aiSecurityAnalyzer);
        } catch (error) {
          console.log(
            '⚠️  AI Security Analyzer not available, using regex-only validation'
          );
          return new SecurityValidator();
        }
      },
      {
        dependencies: [], // Optional dependency on aiSecurityAnalyzer
      }
    );

    // Command Registrar Service (no dependencies - utility service)
    container.registerFactory('commandRegistrar', (container) => {
      const {
        CommandRegistrar,
      } = require('../../dist/services/CommandRegistrar');
      return new CommandRegistrar();
    });

    // Command Registry Service (no dependencies - utility service)
    container.registerFactory('commandRegistry', (container) => {
      const {
        CommandRegistry,
      } = require('../../dist/services/CommandRegistry');
      return new CommandRegistry();
    });

    // Command Intelligence Service (depends on commandRegistry, context, memory, configuration)
    container.registerFactory(
      'commandIntelligence',
      (container) => {
        const {
          CommandIntelligenceService,
        } = require('../../dist/services/CommandIntelligenceService');
        const commandRegistry = container.resolve('commandRegistry');
        const context = container.resolve('context');
        const memory = container.resolve('memory');
        const config = container.resolve('configuration');
        return new CommandIntelligenceService(
          commandRegistry,
          context,
          memory,
          config
        );
      },
      {
        dependencies: ['commandRegistry', 'context', 'memory', 'configuration'],
      }
    );

    // Interactive CLI Service (depends on commandIntelligence, context, command, configuration, commandRegistry)
    container.registerFactory(
      'interactiveCLI',
      (container) => {
        const {
          InteractiveCLIService,
        } = require('../../dist/services/InteractiveCLIService');
        const commandIntelligence = container.resolve('commandIntelligence');
        const context = container.resolve('context');
        const command = container.resolve('command');
        const config = container.resolve('configuration');
        const commandRegistry = container.resolve('commandRegistry');
        return new InteractiveCLIService(
          commandIntelligence,
          context,
          command,
          config,
          commandRegistry
        );
      },
      {
        dependencies: [
          'commandIntelligence',
          'context',
          'command',
          'configuration',
          'commandRegistry',
        ],
      }
    );

    // Analytics Service (depends on memory, performanceMonitor, and optionally enhancedCaching)
    container.registerFactory(
      'analytics',
      (container) => {
        const {
          AnalyticsService,
        } = require('../../dist/services/AnalyticsService');
        const memory = container.resolve('memory');
        const performanceMonitor = container.resolve('performanceMonitor');
        const enhancedCaching = container.resolve('enhancedCaching');
        return new AnalyticsService(
          memory,
          performanceMonitor,
          enhancedCaching
        );
      },
      {
        dependencies: ['memory', 'performanceMonitor', 'enhancedCaching'],
      }
    );

    // Command Factory V2 (depends on all service interfaces)
    container.registerFactory(
      'commandFactory',
      (container) => {
        const {
          CommandFactoryV2,
        } = require('../../dist/commands/CommandFactoryV2');
        const ai = container.resolve('ai');
        const memory = container.resolve('memory');
        const context = container.resolve('context');
        const command = container.resolve('command');
        const config = container.resolve('configuration');
        const agentExecutionEngine = container.resolve('agentExecutionEngine');
        const agentPresenter = container.resolve('agentPresenter');
        const resilienceService = container.resolve('resilienceService');
        const copilot = container.resolve('copilot');
        const copilotDependency = container.resolve('copilotDependency');
        const codeHighlight = container.resolve('codeHighlight');
        const codeIndex = container.resolve('codeIndex');
        const symbolIndex = container.resolve('symbolIndex');
        const codebaseSummarizer = container.resolve('codebaseSummarizer');
        const semanticCodeAnalyzer = container.resolve('semanticCodeAnalyzer');
        const enhancedCaching = container.resolve('enhancedCaching');
        const analytics = container.resolve('analytics');
        return new CommandFactoryV2(
          ai,
          memory,
          context,
          command,
          config,
          agentExecutionEngine,
          agentPresenter,
          resilienceService,
          copilot,
          copilotDependency,
          codeHighlight,
          codeIndex,
          symbolIndex,
          codebaseSummarizer,
          semanticCodeAnalyzer,
          enhancedCaching,
          analytics
        );
      },
      {
        dependencies: [
          'ai',
          'memory',
          'context',
          'command',
          'configuration',
          'agentExecutionEngine',
          'agentPresenter',
          'resilienceService',
          'copilot',
          'copilotDependency',
          'codeHighlight',
          'codeIndex',
          'symbolIndex',
          'codebaseSummarizer',
          'semanticCodeAnalyzer',
          'enhancedCaching',
          'analytics',
        ],
      }
    );

    // Agentic Memory Service (depends on memoryPersistence)
    container.registerFactory(
      'agenticMemory',
      (container) => {
        const {
          AgenticMemoryService,
        } = require('../../dist/services/AgenticMemoryService');
        const memoryPersistence = container.resolve('memoryPersistence');
        return new AgenticMemoryService(memoryPersistence);
      },
      {
        dependencies: ['memoryPersistence'],
      }
    );

    // Preferences Service (depends on memoryPersistence)
    container.registerFactory(
      'preferences',
      (container) => {
        const {
          PreferencesService,
        } = require('../../dist/services/PreferencesService');
        const memoryPersistence = container.resolve('memoryPersistence');
        return new PreferencesService(memoryPersistence);
      },
      {
        dependencies: ['memoryPersistence'],
      }
    );

    // Working Directory Service (depends on memoryPersistence)
    container.registerFactory(
      'workingDirectory',
      (container) => {
        const {
          WorkingDirectoryService,
        } = require('../../dist/services/WorkingDirectoryService');
        const memoryPersistence = container.resolve('memoryPersistence');
        return new WorkingDirectoryService(memoryPersistence);
      },
      {
        dependencies: ['memoryPersistence'],
      }
    );

    // Agent Execution Engine (depends on ai, context, command)
    container.registerFactory(
      'agentExecutionEngine',
      (container) => {
        const {
          AgentExecutionEngine,
        } = require('../../dist/services/AgentExecutionEngine');
        const aiService = container.resolve('ai');
        const contextService = container.resolve('context');
        const commandService = container.resolve('command');
        return new AgentExecutionEngine(
          aiService,
          contextService,
          commandService
        );
      },
      {
        dependencies: ['ai', 'context', 'command'],
      }
    );

    // Agent Presenter (Phase 1 enhancement: inject resilience and performance services)
    container.registerFactory('agentPresenter', (container) => {
      const { AgentPresenter } = require('../../dist/services/AgentPresenter');
      const resilienceService = container.resolve('resilienceService');
      const performanceMonitor = container.resolve('performanceMonitor');
      const aiService = container.resolve('ai');
      const codeHighlight = container.resolve('codeHighlight');
      return new AgentPresenter(
        resilienceService,
        performanceMonitor,
        aiService,
        codeHighlight
      );
    });

    // Resilience Service (no dependencies - utility service)
    container.registerFactory('resilienceService', (container) => {
      const {
        ResilienceService,
      } = require('../../dist/services/ResilienceService');
      return new ResilienceService();
    });

    // Configuration Validator Service (no dependencies - utility service)
    container.registerFactory('configurationValidator', (container) => {
      const {
        ConfigurationValidator,
      } = require('../../dist/services/ConfigurationValidator');
      return new ConfigurationValidator();
    });

    // Profile Manager Service (depends on memoryPersistence)
    container.registerFactory(
      'profileManager',
      (container) => {
        const {
          ProfileManager,
        } = require('../../dist/services/ProfileManager');
        const memoryPersistence = container.resolve('memoryPersistence');
        return new ProfileManager(memoryPersistence);
      },
      {
        dependencies: ['memoryPersistence'],
      }
    );

    // Code Index Service (for codebase indexing and analysis)
    container.registerFactory('codeIndex', (container) => {
      const {
        CodeIndexService,
      } = require('../../dist/services/CodeIndexService');
      return new CodeIndexService();
    });

    // Codebase Summarizer (for AI-powered codebase analysis)
    container.registerFactory('codebaseSummarizer', (container) => {
      const {
        default: CodebaseSummarizer,
      } = require('../../dist/CodebaseSummarizer');
      return new CodebaseSummarizer();
    });

    // Semantic Code Analyzer (for pattern detection and quality analysis)
    container.registerFactory('semanticCodeAnalyzer', (container) => {
      const {
        default: SemanticCodeAnalyzer,
      } = require('../../dist/SemanticCodeAnalyzer');
      return new SemanticCodeAnalyzer();
    });

    // Symbol Index Service (Phase 2: AI-Enhanced with optional dependencies)
    container.registerFactory(
      'symbolIndex',
      (container) => {
        const {
          SymbolIndexService,
        } = require('../../dist/services/SymbolIndexService');
        const caching = container.resolve('caching');

        // Optional dependencies for AI enhancement
        let aiService, codeIndexService, semanticAnalyzer;
        try {
          aiService = container.resolve('ai');
          codeIndexService = container.resolve('codeIndex');
          semanticAnalyzer = container.resolve('semanticCodeAnalyzer');
        } catch (error) {
          // Services not available, continue with basic functionality
          console.log(
            'ℹ️ AI services not available, using basic symbol indexing'
          );
        }

        return new SymbolIndexService(
          caching,
          aiService,
          codeIndexService,
          semanticAnalyzer
        );
      },
      {
        dependencies: ['caching'],
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

    // Code Highlight Service
    container.registerFactory('codeHighlight', (container) => {
      const {
        CodeHighlightService,
      } = require('../../dist/services/CodeHighlightService');
      return new CodeHighlightService();
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
      'commandRegistrar',
      'commandFactory',
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
