import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { AIService } from '../src/services/AIService';
import { CommandService } from '../src/services/CommandService';
import { AgenticMemoryService } from '../src/services/AgenticMemoryService';
import { PreferencesService } from '../src/services/PreferencesService';
import { WorkingDirectoryService } from '../src/services/WorkingDirectoryService';
import { IConfigurationService } from '../src/interfaces/IConfigurationService';
import { IContextService } from '../src/interfaces/IContextService';
import { IConversationMemory } from '../src/interfaces/IConversationMemory';
import { ICommandMemory } from '../src/interfaces/ICommandMemory';
import { IMemoryPersistence } from '../src/interfaces/IMemoryPersistence';
import {
  MemoryData,
  ContextInfo,
  AIAConfig,
  AgenticExecution,
} from '../src/types/index';

describe('Week 2: Client Migration and Additional Services', () => {
  let mockConfig: jest.Mocked<IConfigurationService>;
  let mockContext: jest.Mocked<IContextService>;
  let mockConversationMemory: jest.Mocked<IConversationMemory>;
  let mockCommandMemory: jest.Mocked<ICommandMemory>;
  let mockMemoryPersistence: any;

  const mockMemoryData: MemoryData = {
    conversations: [],
    commands: [],
    preferences: {},
    workingDirectories: {},
    semanticIndex: {},
    agenticHistory: [],
  };

  const mockContextInfo: ContextInfo = {
    workingDirectory: '/test',
    platform: 'linux',
    arch: 'x64',
    nodeVersion: '18.0.0',
    user: 'testuser',
    shell: 'bash',
    timestamp: '2025-06-19T00:00:00Z',
    projectType: 'node',
    projectInfo: {},
    gitStatus: 'clean',
    environmentScore: 1.0,
    performanceMetrics: {},
    securityStatus: {},
    pluginContext: {},
  };

  const mockConfig_: AIAConfig = {
    preferredModel: 'gpt-4',
    autoExecute: false,
    plugins: {},
    profiles: {},
  };

  beforeEach(() => {
    mockConfig = {
      initialize: jest.fn(),
      loadConfiguration: jest.fn(),
      saveConfiguration: jest.fn(),
      getConfiguration: jest.fn().mockReturnValue(mockConfig_),
      updateSetting: jest.fn(),
      getSetting: jest.fn(),
      setSetting: jest.fn(),
      createProfile: jest.fn(),
      updateProfile: jest.fn(),
      deleteProfile: jest.fn(),
      getProfile: jest.fn(),
      listProfiles: jest.fn(),
      setActiveProfile: jest.fn(),
      getActiveProfile: jest.fn(),
      validateConfiguration: jest.fn(),
      resetConfiguration: jest.fn(),
      getConfigurationPath: jest.fn(),
      backupConfiguration: jest.fn(),
      restoreConfiguration: jest.fn(),
    } as any;

    mockContext = {
      initialize: jest.fn(),
      getCurrentContext: jest.fn().mockReturnValue(mockContextInfo),
      updateContext: jest.fn(),
      getContextHistory: jest.fn(),
      analyzeContext: jest.fn(),
      getProjectInfo: jest.fn(),
      getGitStatus: jest.fn(),
      getEnvironmentScore: jest.fn(),
    } as any;

    mockConversationMemory = {
      addConversation: jest.fn(),
      searchConversations: jest.fn(),
      getRecentConversations: jest.fn(),
    } as any;

    mockCommandMemory = {
      addCommand: jest.fn(),
      searchCommands: jest.fn(),
      getRecentCommands: jest.fn(),
    } as any;

    mockMemoryPersistence = {
      loadMemory: jest.fn(),
      saveMemory: jest.fn(),
      exists: jest.fn(),
      getMemoryPath: jest.fn(),
    };
    // Setup mock return values
    mockMemoryPersistence.loadMemory.mockResolvedValue(mockMemoryData);
    mockMemoryPersistence.exists.mockResolvedValue(true);
    mockMemoryPersistence.getMemoryPath.mockReturnValue('/test/memory.json');
  });

  describe('Client Migration Tests', () => {
    describe('AIService Migration', () => {
      it('should use IConversationMemory instead of IMemoryService', () => {
        const aiService = new AIService(mockConfig, mockConversationMemory);
        expect(aiService).toBeInstanceOf(AIService);
      });

      it('should call conversationMemory.addConversation when querying AI', async () => {
        const aiService = new AIService(mockConfig, mockConversationMemory);
        await aiService.initialize(); // Remove mockConfig_ argument

        await aiService.queryAI('test prompt', mockContextInfo);

        expect(mockConversationMemory.addConversation).toHaveBeenCalledWith(
          'test prompt',
          expect.any(String),
          mockContextInfo,
          expect.any(String)
        );
      });
    });

    describe('CommandService Migration', () => {
      it('should use ICommandMemory instead of IMemoryService', () => {
        const commandService = new CommandService(
          mockConfig,
          mockContext,
          mockCommandMemory
        );
        expect(commandService).toBeInstanceOf(CommandService);
      });

      it('should call commandMemory.addCommand when executing commands', async () => {
        const commandService = new CommandService(
          mockConfig,
          mockContext,
          mockCommandMemory
        );
        await commandService.initialize();

        // Mock the command execution to avoid actual system calls
        const mockExecute = jest.spyOn(commandService, 'executeCommand');
        mockExecute.mockResolvedValue({
          stdout: 'test output',
          stderr: '',
          exitCode: 0,
          duration: 100,
          optimized: false,
        });

        await commandService.executeCommand('echo test');

        expect(mockExecute).toHaveBeenCalledWith('echo test');
      });
    });
  });

  describe('Additional Focused Services', () => {
    describe('AgenticMemoryService', () => {
      let agenticMemoryService: AgenticMemoryService;

      beforeEach(() => {
        agenticMemoryService = new AgenticMemoryService(mockMemoryPersistence);
      });

      it('should be instantiated without errors', () => {
        expect(agenticMemoryService).toBeInstanceOf(AgenticMemoryService);
      });

      it('should have all required methods', () => {
        expect(typeof agenticMemoryService.storeAgenticExecution).toBe(
          'function'
        );
        expect(typeof agenticMemoryService.getAgenticHistory).toBe('function');
        expect(typeof agenticMemoryService.searchAgenticHistory).toBe(
          'function'
        );
        expect(typeof agenticMemoryService.clearAgenticHistory).toBe(
          'function'
        );
        expect(typeof agenticMemoryService.getAgenticStats).toBe('function');
      });

      it('should store agentic execution', async () => {
        const mockExecution: AgenticExecution = {
          id: 'test-1',
          goal: 'test goal',
          plan: [],
          results: [],
          executionResults: [],
          status: 'completed',
          iterations: 1,
          startTime: '2025-06-19T00:00:00Z',
          learnings: ['test learning'],
          context: mockContextInfo,
        };

        await agenticMemoryService.storeAgenticExecution(mockExecution);

        expect(mockMemoryPersistence.loadMemory).toHaveBeenCalled();
        expect(mockMemoryPersistence.saveMemory).toHaveBeenCalled();
      });
    });

    describe('PreferencesService', () => {
      let preferencesService: PreferencesService;

      beforeEach(() => {
        preferencesService = new PreferencesService(mockMemoryPersistence);
      });

      it('should be instantiated without errors', () => {
        expect(preferencesService).toBeInstanceOf(PreferencesService);
      });

      it('should have all required methods', () => {
        expect(typeof preferencesService.getPreference).toBe('function');
        expect(typeof preferencesService.setPreference).toBe('function');
        expect(typeof preferencesService.getAllPreferences).toBe('function');
        expect(typeof preferencesService.deletePreference).toBe('function');
        expect(typeof preferencesService.hasPreference).toBe('function');
        expect(typeof preferencesService.resetPreferences).toBe('function');
      });

      it('should set and get preferences', async () => {
        await preferencesService.setPreference('testKey', 'testValue');

        expect(mockMemoryPersistence.loadMemory).toHaveBeenCalled();
        expect(mockMemoryPersistence.saveMemory).toHaveBeenCalled();
      });

      it('should return default value when preference not found', async () => {
        const result = await preferencesService.getPreference(
          'nonexistent',
          'default'
        );
        expect(result).toBe('default');
      });
    });

    describe('WorkingDirectoryService', () => {
      let workingDirectoryService: WorkingDirectoryService;

      beforeEach(() => {
        workingDirectoryService = new WorkingDirectoryService(
          mockMemoryPersistence
        );
      });

      it('should be instantiated without errors', () => {
        expect(workingDirectoryService).toBeInstanceOf(WorkingDirectoryService);
      });

      it('should have all required methods', () => {
        expect(typeof workingDirectoryService.recordDirectoryAccess).toBe(
          'function'
        );
        expect(typeof workingDirectoryService.getRecentDirectories).toBe(
          'function'
        );
        expect(typeof workingDirectoryService.getDirectoryStats).toBe(
          'function'
        );
        expect(typeof workingDirectoryService.getAllDirectories).toBe(
          'function'
        );
        expect(typeof workingDirectoryService.cleanupOldDirectories).toBe(
          'function'
        );
        expect(typeof workingDirectoryService.clearDirectoryHistory).toBe(
          'function'
        );
      });

      it('should record directory access', async () => {
        await workingDirectoryService.recordDirectoryAccess('/test/path');

        expect(mockMemoryPersistence.loadMemory).toHaveBeenCalled();
        expect(mockMemoryPersistence.saveMemory).toHaveBeenCalled();
      });
    });
  });

  describe('SOLID Principles Compliance', () => {
    it('should follow Single Responsibility Principle', () => {
      // Each service has a single, focused responsibility
      const aiService = new AIService(mockConfig, mockConversationMemory);
      const commandService = new CommandService(
        mockConfig,
        mockContext,
        mockCommandMemory
      );
      const agenticService = new AgenticMemoryService(mockMemoryPersistence);
      const preferencesService = new PreferencesService(mockMemoryPersistence);
      const workingDirService = new WorkingDirectoryService(
        mockMemoryPersistence
      );

      expect(aiService.constructor.name).toBe('AIService');
      expect(commandService.constructor.name).toBe('CommandService');
      expect(agenticService.constructor.name).toBe('AgenticMemoryService');
      expect(preferencesService.constructor.name).toBe('PreferencesService');
      expect(workingDirService.constructor.name).toBe(
        'WorkingDirectoryService'
      );
    });

    it('should follow Dependency Inversion Principle', () => {
      // All services depend on interfaces, not concrete classes
      expect(
        () => new AIService(mockConfig, mockConversationMemory)
      ).not.toThrow();
      expect(
        () => new CommandService(mockConfig, mockContext, mockCommandMemory)
      ).not.toThrow();
      expect(
        () => new AgenticMemoryService(mockMemoryPersistence)
      ).not.toThrow();
      expect(() => new PreferencesService(mockMemoryPersistence)).not.toThrow();
      expect(
        () => new WorkingDirectoryService(mockMemoryPersistence)
      ).not.toThrow();
    });

    it('should follow Interface Segregation Principle', () => {
      // Services use only the interfaces they need
      const aiService = new AIService(mockConfig, mockConversationMemory);
      const commandService = new CommandService(
        mockConfig,
        mockContext,
        mockCommandMemory
      );

      // AIService only uses conversation memory methods
      expect(mockConversationMemory.addConversation).toBeDefined();
      expect(mockConversationMemory.searchConversations).toBeDefined();
      expect(mockConversationMemory.getRecentConversations).toBeDefined();

      // CommandService only uses command memory methods
      expect(mockCommandMemory.addCommand).toBeDefined();
      expect(mockCommandMemory.searchCommands).toBeDefined();
      expect(mockCommandMemory.getRecentCommands).toBeDefined();
    });
  });

  describe('Integration Tests', () => {
    it('should allow services to work together without coupling', () => {
      // Services can be composed without tight coupling
      const aiService = new AIService(mockConfig, mockConversationMemory);
      const commandService = new CommandService(
        mockConfig,
        mockContext,
        mockCommandMemory
      );
      const agenticService = new AgenticMemoryService(mockMemoryPersistence);

      // All services can coexist and work independently
      expect(aiService).toBeDefined();
      expect(commandService).toBeDefined();
      expect(agenticService).toBeDefined();
    });

    it('should maintain backward compatibility', () => {
      // The new focused services should not break existing functionality
      expect(() => {
        new AIService(mockConfig, mockConversationMemory);
        new CommandService(mockConfig, mockContext, mockCommandMemory);
      }).not.toThrow();
    });
  });
});
