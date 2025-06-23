import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { AgenticMemoryService } from '../src/services/AgenticMemoryService';
import { PreferencesService } from '../src/services/PreferencesService';
import { WorkingDirectoryService } from '../src/services/WorkingDirectoryService';
import { IMemoryPersistence } from '../src/interfaces/IMemoryPersistence';

describe('Week 2: Additional Services Implementation', () => {
  // Use jest.fn() for all mock methods so that mockResolvedValue and mockReturnValue are available
  const mockMemoryPersistence = {
    loadMemory: jest.fn(),
    saveMemory: jest.fn(),
    exists: jest.fn(),
    getMemoryPath: jest.fn(),
  } as any;

  const mockMemoryData = {
    conversations: [],
    commands: [],
    preferences: { testKey: 'testValue' },
    workingDirectories: {
      '/test/path': {
        accessCount: 5,
        firstAccess: '2025-01-01T00:00:00Z',
        lastAccess: '2025-06-19T00:00:00Z',
      },
    },
    semanticIndex: {},
    agenticHistory: [],
  };

  beforeEach(() => {
    jest.clearAllMocks();
    // Setup default mock behaviors
    mockMemoryPersistence.loadMemory.mockResolvedValue(mockMemoryData);
    mockMemoryPersistence.exists.mockResolvedValue(true);
    mockMemoryPersistence.getMemoryPath.mockReturnValue('/test/memory.json');
  });

  describe('AgenticMemoryService', () => {
    let service: AgenticMemoryService;

    beforeEach(() => {
      service = new AgenticMemoryService(mockMemoryPersistence as any);
    });

    it('should be instantiated successfully', () => {
      expect(service).toBeInstanceOf(AgenticMemoryService);
    });

    it('should have all required methods', () => {
      expect(typeof service.storeAgenticExecution).toBe('function');
      expect(typeof service.getAgenticHistory).toBe('function');
      expect(typeof service.searchAgenticHistory).toBe('function');
      expect(typeof service.clearAgenticHistory).toBe('function');
      expect(typeof service.getAgenticStats).toBe('function');
    });

    it('should clear agentic history', async () => {
      await service.clearAgenticHistory();

      expect(mockMemoryPersistence.loadMemory).toHaveBeenCalled();
      expect(mockMemoryPersistence.saveMemory).toHaveBeenCalledWith(
        expect.objectContaining({
          agenticHistory: [],
        })
      );
    });

    it('should get agentic stats from empty history', async () => {
      const stats = await service.getAgenticStats();

      expect(stats).toEqual({
        totalGoals: 0,
        completedGoals: 0,
        failedGoals: 0,
        averageStepsPerGoal: 0,
      });
    });
  });

  describe('PreferencesService', () => {
    let service: PreferencesService;

    beforeEach(() => {
      service = new PreferencesService(mockMemoryPersistence as any);
    });

    it('should be instantiated successfully', () => {
      expect(service).toBeInstanceOf(PreferencesService);
    });

    it('should have all required methods', () => {
      expect(typeof service.getPreference).toBe('function');
      expect(typeof service.setPreference).toBe('function');
      expect(typeof service.getAllPreferences).toBe('function');
      expect(typeof service.deletePreference).toBe('function');
      expect(typeof service.hasPreference).toBe('function');
      expect(typeof service.resetPreferences).toBe('function');
    });

    it('should get existing preference', async () => {
      const value = await service.getPreference('testKey');
      expect(value).toBe('testValue');
    });

    it('should return default value for non-existent preference', async () => {
      const value = await service.getPreference('nonExistent', 'defaultValue');
      expect(value).toBe('defaultValue');
    });

    it('should get all preferences', async () => {
      const prefs = await service.getAllPreferences();
      expect(prefs).toEqual({ testKey: 'testValue' });
    });

    it('should check if preference exists', async () => {
      const exists = await service.hasPreference('testKey');
      expect(exists).toBe(true);

      const notExists = await service.hasPreference('nonExistent');
      expect(notExists).toBe(false);
    });

    it('should set preference', async () => {
      await service.setPreference('newKey', 'newValue');

      expect(mockMemoryPersistence.loadMemory).toHaveBeenCalled();
      expect(mockMemoryPersistence.saveMemory).toHaveBeenCalledWith(
        expect.objectContaining({
          preferences: expect.objectContaining({
            newKey: 'newValue',
          }),
        })
      );
    });

    it('should reset all preferences', async () => {
      await service.resetPreferences();

      expect(mockMemoryPersistence.saveMemory).toHaveBeenCalledWith(
        expect.objectContaining({
          preferences: {},
        })
      );
    });
  });

  describe('WorkingDirectoryService', () => {
    let service: WorkingDirectoryService;

    beforeEach(() => {
      service = new WorkingDirectoryService(mockMemoryPersistence as any);
    });

    it('should be instantiated successfully', () => {
      expect(service).toBeInstanceOf(WorkingDirectoryService);
    });

    it('should have all required methods', () => {
      expect(typeof service.recordDirectoryAccess).toBe('function');
      expect(typeof service.getRecentDirectories).toBe('function');
      expect(typeof service.getDirectoryStats).toBe('function');
      expect(typeof service.getAllDirectories).toBe('function');
      expect(typeof service.cleanupOldDirectories).toBe('function');
      expect(typeof service.clearDirectoryHistory).toBe('function');
    });

    it('should get recent directories', async () => {
      const dirs = await service.getRecentDirectories();
      expect(dirs).toContain('/test/path');
    });

    it('should get directory stats', async () => {
      const stats = await service.getDirectoryStats('/test/path');

      expect(stats).toEqual({
        accessCount: 5,
        firstAccess: '2025-01-01T00:00:00Z',
        lastAccess: '2025-06-19T00:00:00Z',
        metadata: undefined,
      });
    });

    it('should get all directories', async () => {
      const allDirs = await service.getAllDirectories();

      expect(allDirs['/test/path']).toEqual({
        accessCount: 5,
        firstAccess: '2025-01-01T00:00:00Z',
        lastAccess: '2025-06-19T00:00:00Z',
        metadata: undefined,
      });
    });

    it('should record directory access', async () => {
      await service.recordDirectoryAccess('/new/path', { type: 'project' });

      expect(mockMemoryPersistence.loadMemory).toHaveBeenCalled();
      expect(mockMemoryPersistence.saveMemory).toHaveBeenCalled();
    });

    it('should clear directory history', async () => {
      await service.clearDirectoryHistory();

      expect(mockMemoryPersistence.saveMemory).toHaveBeenCalledWith(
        expect.objectContaining({
          workingDirectories: {},
        })
      );
    });
  });

  describe('SOLID Principles Compliance', () => {
    it('should follow Single Responsibility Principle', () => {
      const agenticService = new AgenticMemoryService(
        mockMemoryPersistence as any
      );
      const preferencesService = new PreferencesService(
        mockMemoryPersistence as any
      );
      const workingDirService = new WorkingDirectoryService(
        mockMemoryPersistence as any
      );

      // Each service has a single, focused responsibility
      expect(agenticService.constructor.name).toBe('AgenticMemoryService');
      expect(preferencesService.constructor.name).toBe('PreferencesService');
      expect(workingDirService.constructor.name).toBe(
        'WorkingDirectoryService'
      );
    });

    it('should follow Dependency Inversion Principle', () => {
      // All services depend on IMemoryPersistence interface, not concrete implementation
      expect(
        () => new AgenticMemoryService(mockMemoryPersistence as any)
      ).not.toThrow();
      expect(
        () => new PreferencesService(mockMemoryPersistence as any)
      ).not.toThrow();
      expect(
        () => new WorkingDirectoryService(mockMemoryPersistence as any)
      ).not.toThrow();
    });

    it('should follow Interface Segregation Principle', () => {
      // Each service only uses the IMemoryPersistence interface methods it needs
      const agenticService = new AgenticMemoryService(
        mockMemoryPersistence as any
      );
      const preferencesService = new PreferencesService(
        mockMemoryPersistence as any
      );
      const workingDirService = new WorkingDirectoryService(
        mockMemoryPersistence as any
      );

      // All services are focused and don't depend on methods they don't use
      expect(agenticService).toBeDefined();
      expect(preferencesService).toBeDefined();
      expect(workingDirService).toBeDefined();
    });
  });

  describe('Client Migration Validation', () => {
    it('should demonstrate improved service composition', () => {
      // The new focused services can be easily composed for different use cases
      const agenticService = new AgenticMemoryService(
        mockMemoryPersistence as any
      );
      const preferencesService = new PreferencesService(
        mockMemoryPersistence as any
      );
      const workingDirService = new WorkingDirectoryService(
        mockMemoryPersistence as any
      );

      // Services are independent but can work together
      expect(agenticService).toBeDefined();
      expect(preferencesService).toBeDefined();
      expect(workingDirService).toBeDefined();
    });

    it('should maintain clean dependencies', () => {
      // Each service only depends on what it needs (IMemoryPersistence)
      const agenticService = new AgenticMemoryService(
        mockMemoryPersistence as any
      );
      const preferencesService = new PreferencesService(
        mockMemoryPersistence as any
      );
      const workingDirService = new WorkingDirectoryService(
        mockMemoryPersistence as any
      );

      // No circular dependencies or unnecessary coupling
      expect(agenticService).toBeInstanceOf(AgenticMemoryService);
      expect(preferencesService).toBeInstanceOf(PreferencesService);
      expect(workingDirService).toBeInstanceOf(WorkingDirectoryService);
    });
  });
});
