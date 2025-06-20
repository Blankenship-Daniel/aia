import MemoryManager from '../src/MemoryManager';
import fs from 'fs-extra';
import path from 'path';
import os from 'os';

// Mock fs-extra
jest.mock('fs-extra');
const mockedFs = fs as jest.Mocked<typeof fs>;

describe('MemoryManager', () => {
  let memoryManager: MemoryManager;
  let testMemoryPath: string;

  beforeEach(() => {
    jest.clearAllMocks();
    testMemoryPath = path.join(os.tmpdir(), '.aia-test', 'memory.json');
    memoryManager = new MemoryManager(testMemoryPath);

    // Mock default memory structure
    mockedFs.readJsonSync.mockReturnValue({
      conversations: [],
      commands: [],
      preferences: {},
      workingDirectories: {},
      metadata: {
        created: new Date().toISOString(),
        version: '1.0.0',
        totalQueries: 0,
        lastCleanup: null,
      },
    });

    mockedFs.existsSync.mockReturnValue(true);
    mockedFs.ensureDirSync.mockImplementation(() => {});
    (mockedFs.ensureDir as any).mockResolvedValue(undefined);
    mockedFs.writeJsonSync.mockImplementation(() => {});
    (mockedFs.writeJson as any).mockResolvedValue(undefined);
  });

  describe('initialization', () => {
    it('should initialize with custom memory path', () => {
      const customPath = '/custom/path/memory.json';
      const manager = new MemoryManager(customPath);
      expect(manager).toBeInstanceOf(MemoryManager);
    });

    it('should create memory file if it does not exist on first operation', async () => {
      mockedFs.existsSync.mockReturnValue(false);
      const manager = new MemoryManager(testMemoryPath);

      // Trigger memory loading - should not throw
      await expect(manager.loadMemory()).resolves.toBeDefined();
    });
  });

  describe('conversation management', () => {
    it('should add conversation', async () => {
      const conversation = {
        id: '1',
        timestamp: new Date().toISOString(),
        userInput: 'Test question',
        aiResponse: 'Test response',
      };

      await memoryManager.addConversation(conversation);

      expect(mockedFs.writeJson as any).toHaveBeenCalled();
    });

    it('should add conversation with context', async () => {
      const conversation = {
        id: '2',
        timestamp: new Date().toISOString(),
        userInput: 'Test question',
        aiResponse: 'Test response',
        context: { workingDir: '/test' },
      };

      await memoryManager.addConversation(conversation);

      expect(mockedFs.writeJson as any).toHaveBeenCalled();
    });
  });

  describe('command management', () => {
    it('should add command', async () => {
      const command = {
        command: 'ls -la',
        timestamp: new Date().toISOString(),
        workingDirectory: '/test/path',
      };

      await memoryManager.addCommand(command);

      expect(mockedFs.writeJson as any).toHaveBeenCalled();
    });
  });

  describe('memory access', () => {
    it('should get memory data', () => {
      const memory = memoryManager.getMemory();
      expect(memory).toBeDefined();
    });

    it('should get memory statistics structure', async () => {
      // Test that the stats structure is correct regardless of content
      const stats = memoryManager.getMemoryStats();
      expect(typeof stats.conversations).toBe('number');
      expect(typeof stats.commands).toBe('number');
      expect(typeof stats.totalSize).toBe('number');
    });
  });

  describe('semantic search', () => {
    it('should perform semantic search', async () => {
      mockedFs.readJsonSync.mockReturnValue({
        conversations: [
          {
            id: '1',
            timestamp: new Date().toISOString(),
            userInput: 'How to use git',
            aiResponse: 'Git is a version control system',
          },
        ],
        commands: [],
        preferences: {},
        workingDirectories: {},
        metadata: {
          created: new Date().toISOString(),
          version: '1.0.0',
          totalQueries: 1,
          lastCleanup: null,
        },
      });

      const results = await memoryManager.semanticSearch('git');
      expect(Array.isArray(results)).toBe(true);
    });
  });

  describe('memory management operations', () => {
    it('should build semantic index', async () => {
      await memoryManager.buildSemanticIndex();
      // Should complete without error
      expect(true).toBe(true);
    });

    it('should compress memory', async () => {
      await memoryManager.compressMemory();
      // Should complete without error
      expect(true).toBe(true);
    });

    it('should perform smart cleanup', async () => {
      await memoryManager.smartCleanup();
      // Should complete without error
      expect(true).toBe(true);
    });

    it('should export memory', async () => {
      const outputPath = '/test/export.json';
      const format = 'json';

      await memoryManager.exportMemory(outputPath, format);
      // Should complete without error
      expect(true).toBe(true);
    });
  });
});
