import { ICommand } from '../interfaces/ICommand';
import { ICommandRegistrar } from '../interfaces/ICommandRegistrar';
import { IAIService } from '../interfaces/IAIService';
import { IMemoryService } from '../interfaces/IMemoryService';
import { IContextService } from '../interfaces/IContextService';
import { ICommandService } from '../interfaces/ICommandService';
import { IConfigurationService } from '../interfaces/IConfigurationService';
import { IAgentExecutionEngine } from '../interfaces/IAgentExecutionEngine';
import { IAgentPresenter } from '../interfaces/IAgentPresenter';
import { IResilienceService } from '../interfaces/IResilienceService';
import { IAnalyticsService } from '../interfaces/IAnalyticsService';
import { IEnhancedCachingService } from '../interfaces/IEnhancedCachingService';
import { CommandRegistrar } from '../services/CommandRegistrar';

// Command Imports
import { AskCommand } from './AskCommand';
import { ExecuteCommand } from './ExecuteCommand';
import { ContextCommand } from './ContextCommand';
import { MemoryCommand } from './MemoryCommand';
import { ConfigCommand } from './ConfigCommand';
import { AgentCommandRefactored } from './AgentCommandRefactored';
import { IndexCommand } from './IndexCommand';
import { InitCommand } from './InitCommand';
import { CacheCommand } from './CacheCommand';
import { AnalyticsCommand } from './AnalyticsCommand';

/**
 * CommandFactoryV2 - SOLID-Compliant Command Factory
 *
 * Purpose: Replaces the OCP-violating switch statement with extensible registry pattern.
 *
 * SOLID Principles Applied:
 * - Single Responsibility: Only handles command factory setup and delegation
 * - Open/Closed: Adding new commands requires NO modification to existing code
 * - Interface Segregation: Uses focused interfaces for each service dependency
 * - Dependency Inversion: Depends on interfaces, not concrete classes
 *
 * Benefits Over Original CommandFactory:
 * ✅ OCP Compliant: New commands can be added without modifying existing code
 * ✅ Extensible: Plugin system can register new commands at runtime
 * ✅ Maintainable: Clear separation between registration and creation logic
 * ✅ Testable: Registry can be mocked and tested independently
 * ✅ Performance: Commands created on-demand, not eagerly
 *
 * Migration Path:
 * 1. Replace CommandFactory with CommandFactoryV2 in DI container
 * 2. All existing functionality maintained (backward compatible)
 * 3. New commands can be added via registerCommand() or plugins
 */
export class CommandFactoryV2 {
  private readonly registrar: ICommandRegistrar;

  constructor(
    private readonly aiService: IAIService,
    private readonly memoryService: IMemoryService,
    private readonly contextService: IContextService,
    private readonly commandService: ICommandService,
    private readonly configurationService: IConfigurationService,
    private readonly agentExecutionEngine: IAgentExecutionEngine,
    private readonly agentPresenter: IAgentPresenter,
    private readonly resilienceService: IResilienceService,
    private readonly enhancedCachingService?: IEnhancedCachingService, // Optional for backward compatibility
    private readonly analyticsService?: IAnalyticsService // Optional for Phase 2 features
  ) {
    this.registrar = new CommandRegistrar();
    this.setupCoreCommands();
  }

  /**
   * Setup core commands - called once during initialization
   * This replaces the switch statement with extensible registration
   */
  private setupCoreCommands(): void {
    // Ask Command - AI queries and conversation
    this.registrar.register(
      'ask',
      ['q', 'query'],
      () =>
        new AskCommand(this.aiService, this.contextService, this.memoryService)
    );

    // Execute Command - Shell command execution
    this.registrar.register(
      'exec',
      ['x', 'execute'],
      () =>
        new ExecuteCommand(
          this.commandService,
          this.contextService,
          this.memoryService
        )
    );

    // Context Command - Context management and info
    this.registrar.register(
      'context',
      ['ctx', 'info'],
      () => new ContextCommand(this.contextService)
    );

    // Memory Command - Memory operations and statistics
    this.registrar.register(
      'memory',
      ['mem', 'stats'],
      () => new MemoryCommand(this.memoryService)
    );

    // Config Command - Configuration management
    this.registrar.register(
      'config',
      ['cfg', 'configure'],
      () => new ConfigCommand(this.configurationService)
    );

    // Agent Command - Agentic reasoning and workflows (SOLID-compliant refactored version)
    this.registrar.register(
      'agent',
      ['a', 'agentic'],
      () =>
        new AgentCommandRefactored(
          this.agentExecutionEngine,
          this.agentPresenter,
          this.resilienceService,
          this.contextService,
          this.memoryService
        )
    );

    // Index Command - Codebase indexing
    this.registrar.register(
      'index',
      ['idx', 'build'],
      () => new IndexCommand()
    );

    // Init Command - Project initialization
    this.registrar.register('init', ['i'], () => new InitCommand());

    // Cache Command - Advanced cache management (only if service is available)
    if (this.enhancedCachingService) {
      this.registrar.register(
        'cache',
        ['caching'],
        () =>
          new CacheCommand(this.enhancedCachingService!, this.contextService)
      );
    }

    // Analytics Command - Usage analytics and insights (only if service is available)
    if (this.analyticsService) {
      this.registrar.register(
        'analytics',
        ['insights', 'metrics'],
        () => new AnalyticsCommand(this.analyticsService!, this.contextService)
      );
    }
  }

  /**
   * Create a command by name or alias
   * Delegates to registry - OCP compliant
   */
  public createCommand(name: string): ICommand | null {
    return this.registrar.create(name);
  }

  /**
   * Get all available commands
   * Delegates to registry
   */
  public getAllCommands(): Map<string, ICommand> {
    return this.registrar.getAllCommands();
  }

  /**
   * Get command by alias (backward compatibility)
   */
  public getCommandByAlias(alias: string): ICommand | null {
    return this.registrar.create(alias);
  }

  /**
   * Register a new command at runtime - EXTENSIBILITY FEATURE
   * This enables plugins and dynamic command registration
   *
   * @param name - Primary command name
   * @param aliases - Command aliases
   * @param factory - Factory function to create command
   */
  public registerCommand(
    name: string,
    aliases: string[],
    factory: () => ICommand
  ): void {
    this.registrar.register(name, aliases, factory);
  }

  /**
   * Check if a command exists
   */
  public hasCommand(name: string): boolean {
    return this.registrar.hasCommand(name);
  }

  /**
   * Get all command names
   */
  public getAllCommandNames(): string[] {
    return this.registrar.getAllCommandNames();
  }

  /**
   * Get aliases for a command
   */
  public getAliases(name: string): string[] {
    return this.registrar.getAliases(name);
  }

  /**
   * Static method to register commands with external registry
   * Maintains backward compatibility with existing CLI integration
   */
  public static registerCommands(
    commandRegistry: any, // ICommandRegistry
    services: any
  ): number {
    // Provide default mock implementations for new services if not provided
    const agentExecutionEngine = services.agentExecutionEngine || {};
    const agentPresenter = services.agentPresenter || {};
    const resilienceService = services.resilienceService || {};
    const enhancedCachingService = services.enhancedCachingService;

    const factory = new CommandFactoryV2(
      services.aiService,
      services.memoryService,
      services.contextService,
      services.commandService,
      services.configurationService,
      agentExecutionEngine,
      agentPresenter,
      resilienceService,
      enhancedCachingService
    );

    let registeredCount = 0;
    const commandNames = factory.getAllCommandNames();

    for (const commandName of commandNames) {
      const command = factory.createCommand(commandName);
      if (command) {
        commandRegistry.register(command);
        registeredCount++;
      }
    }

    return registeredCount;
  }

  /**
   * Static method to create all commands
   * Maintains backward compatibility with tests
   */
  public static createCommands(services: any): any[] {
    // Provide default mock implementations for new services if not provided
    const agentExecutionEngine = services.agentExecutionEngine || {};
    const agentPresenter = services.agentPresenter || {};
    const resilienceService = services.resilienceService || {};
    const enhancedCachingService = services.enhancedCachingService;

    const factory = new CommandFactoryV2(
      services.aiService,
      services.memoryService,
      services.contextService,
      services.commandService,
      services.configurationService,
      agentExecutionEngine,
      agentPresenter,
      resilienceService,
      enhancedCachingService
    );

    const commands = [];
    const commandNames = factory.getAllCommandNames();

    for (const commandName of commandNames) {
      const command = factory.createCommand(commandName);
      if (command) {
        commands.push(command);
      }
    }

    return commands;
  }
}
