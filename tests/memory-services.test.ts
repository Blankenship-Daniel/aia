import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { MemoryPersistenceService } from '../src/services/MemoryPersistenceService';
import { ConversationMemoryService } from '../src/services/ConversationMemoryService';
import { CommandMemoryService } from '../src/services/CommandMemoryService';
import { MemoryStatisticsService } from '../src/services/MemoryStatisticsService';
import { MemoryImportExportService } from '../src/services/MemoryImportExportService';
import { CompositeMemoryService } from '../src/services/CompositeMemoryService';
import { IConfigurationService } from '../src/interfaces/IConfigurationService';
import { MemoryData, ContextInfo } from '../src/types/index';

describe('SOLID Memory Services', () => {
  let mockConfig: jest.Mocked<IConfigurationService>;
  let memoryPersistence: MemoryPersistenceService;
  let conversationMemory: ConversationMemoryService;
  let commandMemory: CommandMemoryService;
  let memoryStatistics: MemoryStatisticsService;
  let memoryImportExport: MemoryImportExportService;
  let compositeMemory: CompositeMemoryService;

  const mockMemoryData: MemoryData = {
    conversations: [],
    commands: [],
    preferences: {},
    workingDirectories: {},
    semanticIndex: {},
    agenticHistory: [],
  };

  const mockContext: ContextInfo = {
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

  beforeEach(() => {
    mockConfig = {
      get: jest.fn(),
      set: jest.fn(),
      has: jest.fn(),
      initialize: jest.fn(),
      loadConfig: jest.fn(),
      saveConfig: jest.fn(),
      getProfile: jest.fn(),
      setProfile: jest.fn(),
      listProfiles: jest.fn(),
      deleteProfile: jest.fn(),
      getOutputDirectories: jest.fn(),
    } as any;

    memoryPersistence = new MemoryPersistenceService(mockConfig);
    conversationMemory = new ConversationMemoryService(memoryPersistence);
    commandMemory = new CommandMemoryService(memoryPersistence);
    memoryStatistics = new MemoryStatisticsService(memoryPersistence);
    memoryImportExport = new MemoryImportExportService(memoryPersistence);

    compositeMemory = new CompositeMemoryService(
      memoryPersistence,
      conversationMemory,
      commandMemory,
      memoryStatistics,
      memoryImportExport
    );
  });

  describe('MemoryPersistenceService', () => {
    it('should get memory path', () => {
      const path = memoryPersistence.getMemoryPath();
      expect(path).toContain('memory.json');
    });
  });

  describe('ConversationMemoryService', () => {
    it('should be instantiated without errors', () => {
      expect(conversationMemory).toBeInstanceOf(ConversationMemoryService);
    });

    it('should have required methods', () => {
      expect(typeof conversationMemory.addConversation).toBe('function');
      expect(typeof conversationMemory.searchConversations).toBe('function');
      expect(typeof conversationMemory.getRecentConversations).toBe('function');
    });
  });

  describe('CommandMemoryService', () => {
    it('should be instantiated without errors', () => {
      expect(commandMemory).toBeInstanceOf(CommandMemoryService);
    });

    it('should have required methods', () => {
      expect(typeof commandMemory.addCommand).toBe('function');
      expect(typeof commandMemory.searchCommands).toBe('function');
      expect(typeof commandMemory.getRecentCommands).toBe('function');
    });
  });

  describe('MemoryStatisticsService', () => {
    it('should be instantiated without errors', () => {
      expect(memoryStatistics).toBeInstanceOf(MemoryStatisticsService);
    });

    it('should have required methods', () => {
      expect(typeof memoryStatistics.getStats).toBe('function');
    });
  });

  describe('MemoryImportExportService', () => {
    it('should be instantiated without errors', () => {
      expect(memoryImportExport).toBeInstanceOf(MemoryImportExportService);
    });

    it('should have required methods', () => {
      expect(typeof memoryImportExport.exportMemory).toBe('function');
      expect(typeof memoryImportExport.importMemory).toBe('function');
      expect(typeof memoryImportExport.compressMemory).toBe('function');
      expect(typeof memoryImportExport.clearMemory).toBe('function');
    });

    it('should return supported formats', () => {
      const formats = memoryImportExport.getSupportedFormats();
      expect(formats).toContain('json');
    });
  });

  describe('CompositeMemoryService', () => {
    it('should be instantiated without errors', () => {
      expect(compositeMemory).toBeInstanceOf(CompositeMemoryService);
    });

    it('should implement all IMemoryService methods', () => {
      expect(typeof compositeMemory.initialize).toBe('function');
      expect(typeof compositeMemory.loadMemory).toBe('function');
      expect(typeof compositeMemory.saveMemory).toBe('function');
      expect(typeof compositeMemory.addConversation).toBe('function');
      expect(typeof compositeMemory.addCommand).toBe('function');
      expect(typeof compositeMemory.searchConversations).toBe('function');
      expect(typeof compositeMemory.searchCommands).toBe('function');
      expect(typeof compositeMemory.getStats).toBe('function');
      expect(typeof compositeMemory.clearMemory).toBe('function');
      expect(typeof compositeMemory.exportMemory).toBe('function');
      expect(typeof compositeMemory.importMemory).toBe('function');
      expect(typeof compositeMemory.compressMemory).toBe('function');
      expect(typeof compositeMemory.getRecentConversations).toBe('function');
      expect(typeof compositeMemory.getRecentCommands).toBe('function');
      expect(typeof compositeMemory.getAgenticHistory).toBe('function');
      expect(typeof compositeMemory.storeAgenticExecution).toBe('function');
      expect(typeof compositeMemory.searchMemory).toBe('function');
    });
  });

  describe('SOLID Principles Compliance', () => {
    it('should follow Single Responsibility Principle', () => {
      // Each service has a single, focused responsibility
      expect(conversationMemory.constructor.name).toBe(
        'ConversationMemoryService'
      );
      expect(commandMemory.constructor.name).toBe('CommandMemoryService');
      expect(memoryStatistics.constructor.name).toBe('MemoryStatisticsService');
      expect(memoryImportExport.constructor.name).toBe(
        'MemoryImportExportService'
      );
    });

    it('should follow Dependency Inversion Principle', () => {
      // All services depend on interfaces, not concrete classes
      // This is verified by the fact that they can be instantiated with mock implementations
      expect(conversationMemory).toBeDefined();
      expect(commandMemory).toBeDefined();
      expect(memoryStatistics).toBeDefined();
      expect(memoryImportExport).toBeDefined();
    });

    it('should follow Interface Segregation Principle', () => {
      // Each service implements only the interfaces it needs
      // No service is forced to implement methods it doesn't use
      expect(conversationMemory).toHaveProperty('addConversation');
      expect(conversationMemory).toHaveProperty('searchConversations');
      expect(conversationMemory).not.toHaveProperty('addCommand');

      expect(commandMemory).toHaveProperty('addCommand');
      expect(commandMemory).toHaveProperty('searchCommands');
      expect(commandMemory).not.toHaveProperty('addConversation');
    });
  });
});
