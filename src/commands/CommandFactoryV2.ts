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
import { ICopilotService } from '../interfaces/ICopilotService';
import { ICopilotDependencyService } from '../interfaces/ICopilotDependencyService';
import { ICodeHighlightService } from '../interfaces/ICodeHighlightService';
import { ICodeIndexService } from '../interfaces/ICodeIndexService';
import { ISymbolIndex } from '../interfaces/ISymbolIndex';
import { ICodebaseSummarizer } from '../interfaces/ICodebaseSummarizer';
import { ISemanticCodeAnalyzer } from '../interfaces/ISemanticCodeAnalyzer';
import { CommandRegistrar } from '../services/CommandRegistrar';

// Command Imports
import { AskCommand } from './AskCommand';
import { ExecuteCommand } from './ExecuteCommand';
import { ContextCommand } from './ContextCommand';
import { MemoryCommand } from './MemoryCommand';
import { ConfigCommand } from './ConfigCommand';
import { AgentCommand } from './AgentCommand';
import { IndexCommand } from './IndexCommand';
import { InitCommand } from './InitCommand';
import { InstallVSCodeCommand } from './InstallVSCodeCommand';
import { CacheCommand } from './CacheCommand';
import { AnalyticsCommand } from './AnalyticsCommand';
import { ExplainCommand } from './ExplainCommand';
import { SuggestCommand } from './SuggestCommand';
import { LearnCommand } from './LearnCommand';
import { CopilotCheckCommand } from './CopilotCheckCommand';

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
    private readonly copilotService: ICopilotService,
    private readonly copilotDependencyService: ICopilotDependencyService,
    private readonly codeHighlightService: ICodeHighlightService,
    private readonly codeIndexService: ICodeIndexService,
    private readonly symbolIndexService: ISymbolIndex,
    private readonly codebaseSummarizer: ICodebaseSummarizer,
    private readonly semanticCodeAnalyzer: ISemanticCodeAnalyzer,
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
        new AskCommand(
          this.aiService,
          this.contextService,
          this.memoryService,
          this.codeHighlightService
        )
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
        new AgentCommand(
          this.agentExecutionEngine,
          this.agentPresenter,
          this.resilienceService,
          this.contextService,
          this.memoryService,
          this.codeHighlightService
        )
    );

    // Index Command - Codebase indexing with AI-powered prompt generation
    this.registrar.register(
      'index',
      ['idx', 'build'],
      () =>
        new IndexCommand(
          this.codeIndexService,
          this.symbolIndexService,
          this.codebaseSummarizer,
          this.semanticCodeAnalyzer,
          this.aiService
        )
    );

    // Init Command - Project initialization
    this.registrar.register('init', ['i'], () => new InitCommand());

    // Install VSCode Extension Command - Install AIA VSCode extension in existing projects
    this.registrar.register(
      'install-vscode-extension',
      ['install-ext', 'vscode'],
      () => new InstallVSCodeCommand()
    );

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

    // Explain Command - Explain code and concepts (new Copilot command)
    this.registrar.register(
      'explain',
      ['explainCode', 'describe'],
      () => new ExplainCommand(this.copilotService, this.memoryService)
    );

    // Suggest Command - Suggest code completions and improvements (new Copilot command)
    this.registrar.register(
      'suggest',
      ['suggestCode', 'recommend'],
      () => new SuggestCommand(this.copilotService, this.contextService)
    );

    // Learn Command - Learn from user feedback and adapt (new Copilot command)
    this.registrar.register(
      'learn',
      ['feedback', 'train'],
      () =>
        new LearnCommand(
          this.copilotService,
          this.aiService,
          this.contextService
        )
    );

    // Copilot Check Command - Diagnostic command for GitHub Copilot CLI setup
    this.registrar.register(
      'copilot-check',
      ['copilot-status', 'check-copilot'],
      () => new CopilotCheckCommand(this.copilotDependencyService)
    );
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
    const copilotDependencyService = services.copilotDependencyService || {};
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
      services.copilotService,
      copilotDependencyService,
      services.codeHighlightService,
      services.codeIndexService,
      services.symbolIndexService,
      services.codebaseSummarizer,
      services.semanticCodeAnalyzer,
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
    const copilotDependencyService = services.copilotDependencyService || {};
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
      services.copilotService,
      copilotDependencyService,
      services.codeHighlightService,
      services.codeIndexService,
      services.symbolIndexService,
      services.codebaseSummarizer,
      services.semanticCodeAnalyzer,
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
