import { CommandFactoryV2 } from '../src/commands/CommandFactoryV2';
import { ICommand } from '../src/interfaces/ICommand';
import { ICommandRegistrar } from '../src/interfaces/ICommandRegistrar';
import { CommandRegistrar } from '../src/services/CommandRegistrar';
import { IAIService } from '../src/interfaces/IAIService';
import { IMemoryService } from '../src/interfaces/IMemoryService';
import { IContextService } from '../src/interfaces/IContextService';
import { ICommandService } from '../src/interfaces/ICommandService';
import { IConfigurationService } from '../src/interfaces/IConfigurationService';
import { IAgentExecutionEngine } from '../src/interfaces/IAgentExecutionEngine';
import { IAgentPresenter } from '../src/interfaces/IAgentPresenter';
import { IResilienceService } from '../src/interfaces/IResilienceService';

// Mock command for testing
class MockCommand implements ICommand {
  getDefinition() {
    return {
      name: 'mock',
      description: 'Mock command for testing',
      usage: 'mock [args]',
      aliases: ['mock'],
    };
  }
  getName() {
    return 'mock';
  }
  getAliases() {
    return ['mock'];
  }
  validateArgs(args: string[]) {
    return { valid: true, errors: [] };
  }
  getHelp() {
    return 'Help for mock command';
  }
  async execute(
    context: Record<string, unknown>,
    args: string[],
    options: any
  ) {
    return { success: true };
  }
}

describe('SOLID CommandFactory Refactoring', () => {
  describe('CommandRegistrar', () => {
    let registrar: CommandRegistrar;

    beforeEach(() => {
      registrar = new CommandRegistrar();
    });

    it('should register and create commands by name', () => {
      const factory = () => new MockCommand();

      registrar.register('test', ['t'], factory);

      const command = registrar.create('test');
      expect(command).toBeInstanceOf(MockCommand);
    });

    it('should create commands by alias', () => {
      const factory = () => new MockCommand();

      registrar.register('test', ['t', 'testing'], factory);

      const command1 = registrar.create('t');
      const command2 = registrar.create('testing');

      expect(command1).toBeInstanceOf(MockCommand);
      expect(command2).toBeInstanceOf(MockCommand);
    });

    it('should return null for unknown commands', () => {
      const command = registrar.create('unknown');
      expect(command).toBeNull();
    });

    it('should throw error for duplicate command registration', () => {
      const factory = () => new MockCommand();

      registrar.register('test', [], factory);

      expect(() => {
        registrar.register('test', [], factory);
      }).toThrow("Command 'test' is already registered");
    });

    it('should throw error for conflicting aliases', () => {
      const factory1 = () => new MockCommand();
      const factory2 = () => new MockCommand();

      registrar.register('test1', ['t'], factory1);

      expect(() => {
        registrar.register('test2', ['t'], factory2);
      }).toThrow("Alias 't' conflicts with existing command or alias");
    });

    it('should handle case insensitive command names', () => {
      const factory = () => new MockCommand();

      registrar.register('TeST', ['T'], factory);

      const command1 = registrar.create('test');
      const command2 = registrar.create('t');

      expect(command1).toBeInstanceOf(MockCommand);
      expect(command2).toBeInstanceOf(MockCommand);
    });

    it('should return correct command names and aliases', () => {
      const factory = () => new MockCommand();

      registrar.register('test', ['t', 'testing'], factory);

      expect(registrar.getAllCommandNames()).toContain('test');
      expect(registrar.getAliases('test')).toEqual(['t', 'testing']);
      expect(registrar.hasCommand('test')).toBe(true);
      expect(registrar.hasCommand('t')).toBe(true);
      expect(registrar.hasCommand('nonexistent')).toBe(false);
    });

    it('should provide accurate registration statistics', () => {
      const factory = () => new MockCommand();

      registrar.register('test1', ['t1'], factory);
      registrar.register('test2', [], factory);

      const stats = registrar.getRegistrationStats();

      expect(stats.totalCommands).toBe(2);
      expect(stats.totalAliases).toBe(1);
      expect(stats.commandsWithAliases).toBe(1);
    });

    it('should support clearing all registrations', () => {
      const factory = () => new MockCommand();

      registrar.register('test', ['t'], factory);
      expect(registrar.hasCommand('test')).toBe(true);

      registrar.clear();
      expect(registrar.hasCommand('test')).toBe(false);
      expect(registrar.getAllCommandNames()).toHaveLength(0);
    });
  });

  describe('CommandFactoryV2 OCP Compliance', () => {
    let mockServices: {
      aiService: jest.Mocked<IAIService>;
      memoryService: jest.Mocked<IMemoryService>;
      contextService: jest.Mocked<IContextService>;
      commandService: jest.Mocked<ICommandService>;
      configurationService: jest.Mocked<IConfigurationService>;
      agentExecutionEngine: jest.Mocked<IAgentExecutionEngine>;
      agentPresenter: jest.Mocked<IAgentPresenter>;
      resilienceService: jest.Mocked<IResilienceService>;
      copilotService: any;
    };
    let factory: CommandFactoryV2;

    beforeEach(() => {
      mockServices = {
        aiService: {
          initialize: jest.fn(),
          queryAI: jest.fn(),
          selectModel: jest.fn(),
          getAvailableModels: jest.fn(),
          isConfigured: jest.fn(),
          validateKeys: jest.fn(),
        } as any,
        memoryService: {
          initialize: jest.fn(),
          loadMemory: jest.fn(),
          saveMemory: jest.fn(),
          // Add other IMemoryService methods as needed
        } as any,
        contextService: {
          initialize: jest.fn(),
          gatherContext: jest.fn(),
          analyzeProject: jest.fn(),
          getGitStatus: jest.fn(),
          detectProjectType: jest.fn(),
          getEnvironmentMetrics: jest.fn(),
          scoreContext: jest.fn(),
        } as any,
        commandService: {
          initialize: jest.fn(),
          executeCommand: jest.fn(),
          validateCommandSafety: jest.fn(),
          optimizeCommand: jest.fn(),
          suggestCommands: jest.fn(),
          parseCommand: jest.fn(),
          getHistory: jest.fn(),
          validateCommand: jest.fn(),
        } as any,
        configurationService: {
          initialize: jest.fn(),
          loadConfiguration: jest.fn(),
          saveConfiguration: jest.fn(),
          getConfiguration: jest.fn(),
          updateSetting: jest.fn(),
          getSetting: jest.fn(),
          setSetting: jest.fn(),
          createProfile: jest.fn(),
          switchProfile: jest.fn(),
          deleteProfile: jest.fn(),
          listProfiles: jest.fn(),
          getActiveProfile: jest.fn(),
          validateApiKeys: jest.fn(),
          getDefaultConfiguration: jest.fn(),
          resetToDefaults: jest.fn(),
          exportConfiguration: jest.fn(),
          importConfiguration: jest.fn(),
          validateConfiguration: jest.fn(),
          getAvailableModels: jest.fn(),
          isFeatureEnabled: jest.fn(),
          setFeatureEnabled: jest.fn(),
          getConfigurationPath: jest.fn(),
          watchConfiguration: jest.fn(),
          unwatchConfiguration: jest.fn(),
        } as any,
        agentExecutionEngine: {
          planExecution: jest.fn(),
          executeStep: jest.fn(),
          executePlan: jest.fn(),
          validateResult: jest.fn(),
        } as any,
        agentPresenter: {
          showPlanningPhase: jest.fn(),
          displayExecutionPlan: jest.fn(),
          showExecutionStep: jest.fn(),
          showIteration: jest.fn(),
          displayStepOutput: jest.fn(),
          displayExecutionSummary: jest.fn(),
        } as any,
        resilienceService: {
          executeWithCircuitBreaker: jest.fn(),
          executeWithTimeout: jest.fn(),
          executeWithRetry: jest.fn(),
          executeWithFallback: jest.fn(),
          isCommandBlocked: jest.fn(),
          getCircuitBreakerState: jest.fn(),
          resetCircuitBreaker: jest.fn(),
          getFailureStats: jest.fn(),
        } as any,
        copilotService: {
          explainCommand: jest.fn(),
          suggestCommand: jest.fn(),
          getAlias: jest.fn(),
        } as any,
      };

      factory = new CommandFactoryV2(
        mockServices.aiService,
        mockServices.memoryService,
        mockServices.contextService,
        mockServices.commandService,
        mockServices.configurationService,
        mockServices.agentExecutionEngine,
        mockServices.agentPresenter,
        mockServices.resilienceService,
        mockServices.copilotService
      );
    });

    it('should create all core commands', () => {
      const coreCommands = [
        'ask',
        'exec',
        'context',
        'memory',
        'config',
        'agent',
        'index',
      ];

      for (const commandName of coreCommands) {
        const command = factory.createCommand(commandName);
        expect(command).not.toBeNull();
        expect(command?.getName()).toBe(commandName);
      }
    });

    it('should support command aliases', () => {
      const aliases = [
        ['ask', 'q'],
        ['exec', 'x'],
        ['context', 'ctx'],
        ['memory', 'mem'],
        ['config', 'cfg'],
        ['agent', 'a'],
        ['index', 'idx'],
      ];

      for (const [commandName, alias] of aliases) {
        const byName = factory.createCommand(commandName);
        const byAlias = factory.createCommand(alias);

        expect(byName).not.toBeNull();
        expect(byAlias).not.toBeNull();
        expect(byName?.getName()).toBe(byAlias?.getName());
      }
    });

    it('should allow runtime command registration (OCP compliance)', () => {
      // This is THE test that proves OCP compliance
      // We can add new commands without modifying existing code

      class CustomCommand implements ICommand {
        getDefinition() {
          return {
            name: 'custom',
            description: 'Custom command added at runtime',
            usage: 'custom [options]',
            aliases: ['custom', 'cust'],
          };
        }
        getName() {
          return 'custom';
        }
        getAliases() {
          return ['custom', 'cust'];
        }
        validateArgs(args: string[]) {
          return { valid: true, errors: [] };
        }
        getHelp() {
          return 'Help for custom command';
        }
        async execute(
          context: Record<string, unknown>,
          args: string[],
          options: any
        ) {
          return { success: true };
        }
      }

      // Add new command at runtime - NO modification to CommandFactoryV2 required!
      factory.registerCommand('custom', ['cust'], () => new CustomCommand());

      const customCommand = factory.createCommand('custom');
      const customByAlias = factory.createCommand('cust');

      expect(customCommand).toBeInstanceOf(CustomCommand);
      expect(customByAlias).toBeInstanceOf(CustomCommand);
    });

    it('should check command existence', () => {
      expect(factory.hasCommand('ask')).toBe(true);
      expect(factory.hasCommand('q')).toBe(true);
      expect(factory.hasCommand('nonexistent')).toBe(false);
    });

    it('should return all command names', () => {
      const commandNames = factory.getAllCommandNames();
      const expectedCommands = [
        'ask',
        'exec',
        'context',
        'memory',
        'config',
        'agent',
        'index',
      ];

      for (const expectedCommand of expectedCommands) {
        expect(commandNames).toContain(expectedCommand);
      }
    });

    it('should return command aliases', () => {
      expect(factory.getAliases('ask')).toContain('q');
      expect(factory.getAliases('exec')).toContain('x');
      expect(factory.getAliases('nonexistent')).toEqual([]);
    });

    it('should maintain backward compatibility with static methods', () => {
      const mockRegistry = {
        commands: [] as any[],
        register(command: any) {
          this.commands.push(command);
        },
      };

      const registeredCount = CommandFactoryV2.registerCommands(
        mockRegistry,
        mockServices
      );

      expect(registeredCount).toBeGreaterThan(0);
      expect(mockRegistry.commands.length).toBe(registeredCount);
    });

    it('should create commands for testing via static method', () => {
      const commands = CommandFactoryV2.createCommands(mockServices);

      expect(commands.length).toBeGreaterThan(0);
      commands.forEach((command) => {
        expect(command).toBeDefined();
        expect(typeof command.execute).toBe('function');
      });
    });
  });

  describe('OCP Violation Elimination', () => {
    it('should demonstrate OCP compliance by adding commands without code modification', () => {
      // Mock services
      const services = {
        aiService: {} as IAIService,
        memoryService: {} as IMemoryService,
        contextService: {} as IContextService,
        commandService: {} as ICommandService,
        configurationService: {} as IConfigurationService,
        agentExecutionEngine: {} as IAgentExecutionEngine,
        agentPresenter: {} as IAgentPresenter,
        resilienceService: {} as IResilienceService,
        copilotService: {} as any,
      };

      const factory = new CommandFactoryV2(
        services.aiService,
        services.memoryService,
        services.contextService,
        services.commandService,
        services.configurationService,
        services.agentExecutionEngine,
        services.agentPresenter,
        services.resilienceService,
        services.copilotService
      );

      // Get initial command count
      const initialCount = factory.getAllCommandNames().length;

      // Add new commands - this would have required modifying the switch statement in the old factory
      class AnalyzeCommand implements ICommand {
        getDefinition() {
          return {
            name: 'analyze',
            description: 'Analyze code patterns',
            usage: 'analyze [file]',
            aliases: ['analyze', 'anal'],
          };
        }
        getName() {
          return 'analyze';
        }
        getAliases() {
          return ['analyze', 'anal'];
        }
        validateArgs(args: string[]) {
          return { valid: true, errors: [] };
        }
        getHelp() {
          return 'Help for analyze command';
        }
        async execute(
          context: Record<string, unknown>,
          args: string[],
          options: any
        ) {
          return { success: true };
        }
      }

      class RefactorCommand implements ICommand {
        getDefinition() {
          return {
            name: 'refactor',
            description: 'Refactor code following SOLID principles',
            usage: 'refactor [pattern]',
            aliases: ['refactor', 'ref', 'solid'],
          };
        }
        getName() {
          return 'refactor';
        }
        getAliases() {
          return ['refactor', 'ref', 'solid'];
        }
        validateArgs(args: string[]) {
          return { valid: true, errors: [] };
        }
        getHelp() {
          return 'Help for refactor command';
        }
        async execute(
          context: Record<string, unknown>,
          args: string[],
          options: any
        ) {
          return { success: true };
        }
      }

      // Add commands at runtime - ZERO modification to existing code!
      factory.registerCommand('analyze', ['anal'], () => new AnalyzeCommand());
      factory.registerCommand(
        'refactor',
        ['ref', 'solid'],
        () => new RefactorCommand()
      );

      // Verify new commands work
      expect(factory.createCommand('analyze')).toBeInstanceOf(AnalyzeCommand);
      expect(factory.createCommand('anal')).toBeInstanceOf(AnalyzeCommand);
      expect(factory.createCommand('refactor')).toBeInstanceOf(RefactorCommand);
      expect(factory.createCommand('ref')).toBeInstanceOf(RefactorCommand);
      expect(factory.createCommand('solid')).toBeInstanceOf(RefactorCommand);

      // Verify command count increased
      expect(factory.getAllCommandNames().length).toBe(initialCount + 2);

      // This test proves we've eliminated the OCP violation:
      // ✅ Open for extension: New commands can be added
      // ✅ Closed for modification: No existing code was changed
    });
  });
});
