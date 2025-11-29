Below is an example of Jest tests for the `MemoryManager` class based on the project context you've provided. These tests ensure that the main functionalities are covered, including error handling and type safety, while utilizing existing mock patterns and external dependencies.

```typescript
import { mocked } from 'jest-mock';
import fs from 'fs-extra';
import path from 'path';
import MemoryManager from '../src/MemoryManager';
import { MemoryData } from '../src/MemoryManager';

// Mock external dependencies
jest.mock('fs-extra');

// Default structures and mock implementations
const defaultMemoryData: MemoryData = {
  conversations: [],
  commands: [],
  preferences: {},
  workingDirectories: {},
  metadata: {
    created: new Date().toISOString(),
    version: '2.0.0',
    totalQueries: 0,
    lastCleanup: null,
  },
};

const memoryPath = './path/to/memory.json';

// Test suite for MemoryManager
describe('MemoryManager', () => {
  let memoryManager: MemoryManager;

  beforeEach(() => {
    memoryManager = new MemoryManager(memoryPath);
    mocked(fs.pathExists).mockResolvedValue(true);
    mocked(fs.readJson).mockResolvedValue(defaultMemoryData);
    mocked(fs.ensureDir).mockResolvedValue();
    mocked(fs.writeJson).mockResolvedValue();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('loadMemory', () => {
    it('should load memory successfully from the given path', async () => {
      const memory = await memoryManager.loadMemory();
      expect(memory).toEqual(defaultMemoryData);
      expect(fs.pathExists).toHaveBeenCalledWith(memoryPath);
      expect(fs.readJson).toHaveBeenCalledWith(memoryPath);
    });

    it('should create default memory and return it when memory file does not exist', async () => {
      mocked(fs.pathExists).mockResolvedValue(false);
      const memory = await memoryManager.loadMemory();
      
      expect(memory).toEqual(expect.objectContaining({
        conversations: [],
        commands: [],
        metadata: expect.objectContaining({
          version: '2.0.0',
        }),
      }));
    });

    it('should handle errors during loading and return default memory', async () => {
      mocked(fs.readJson).mockRejectedValue(new Error('Read error'));
      
      const memory = await memoryManager.loadMemory();
      
      expect(memory).toEqual(expect.objectContaining({
        conversations: [],
        commands: [],
        metadata: expect.objectContaining({
          version: '2.0.0',
        }),
      }));
      expect(global.console.warn).toHaveBeenCalledWith(
        'Memory loading failed:', 'Read error'
      );
    });
  });

  describe('saveMemory', () => {
    it('should save memory data to the specified path', async () => {
      await memoryManager.loadMemory();
      await memoryManager.saveMemory();

      expect(fs.ensureDir).toHaveBeenCalledWith(expect.stringContaining('memory.json'));
      expect(fs.writeJson).toHaveBeenCalledWith(memoryPath, expect.anything(), { spaces: 2 });
    });

    it('should handle errors during saving', async () => {
      mocked(fs.writeJson).mockRejectedValue(new Error('Write error'));

      await expect(memoryManager.saveMemory()).rejects.toThrow('Write error');
      expect(global.console.error).toHaveBeenCalledWith(
        'Memory saving failed:', 'Write error'
      );
    });
  });

  describe('semanticSearch', () => {
    it('should perform search with the default options', async () => {
      await memoryManager.loadMemory();
      const query = 'search term';
      const results = await memoryManager.semanticSearch(query);

      expect(results).toBeInstanceOf(Array);
      expect(results.length).toBeLessThanOrEqual(10);
    });

    it('should return an empty array on error', async ()