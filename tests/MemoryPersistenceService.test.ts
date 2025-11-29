Below is a comprehensive Jest test suite for the `MemoryPersistenceService` class in TypeScript. It follows the patterns and context you've provided, including dependency injection, mock utilities, and covers both success and error scenarios.

```typescript
import { MemoryPersistenceService } from '../src/services/MemoryPersistenceService';
import { IConfigurationService } from '../src/interfaces/IConfigurationService';
import { MemoryData } from '../src/types';
import * as fs from 'fs-extra';
import * as path from 'path';
import * as os from 'os';
import { mocked } from 'ts-jest/utils';

jest.mock('fs-extra');
jest.mock('path');
jest.mock('os');

describe('MemoryPersistenceService', () => {
  let service: MemoryPersistenceService;
  let mockConfigService: IConfigurationService;

  beforeEach(() => {
    mockConfigService = {
      // Mock any necessary methods from IConfigurationService
    } as IConfigurationService;

    service = new MemoryPersistenceService(mockConfigService);
    mocked(path.join).mockReturnValue('/mocked/path/.aia/memory.json');
    mocked(os.homedir).mockReturnValue('/mocked/home');
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('loadMemory', () => {
    it('should return default memory if memory file does not exist', async () => {
      mocked(fs.pathExists).mockResolvedValue(false);

      const memory = await service.loadMemory();

      expect(memory).toEqual(service.getDefaultMemory());
      expect(fs.pathExists).toHaveBeenCalledWith('/mocked/path/.aia/memory.json');
    });

    it('should load and validate memory from file', async () => {
      mocked(fs.pathExists).mockResolvedValue(true);
      const mockData = { conversations: [], commands: [], preferences: {}, workingDirectories: {}, semanticIndex: {}, agenticHistory: [] };
      mocked(fs.readJson).mockResolvedValue(mockData);

      const memory = await service.loadMemory();

      expect(memory).toEqual(service.validateAndMergeWithDefaults(mockData));
      expect(fs.readJson).toHaveBeenCalledWith('/mocked/path/.aia/memory.json');
    });

    it('should handle corrupted memory file gracefully by backing it up and returning default memory', async () => {
      mocked(fs.pathExists).mockResolvedValue(true);
      mocked(fs.readJson).mockRejectedValue(new Error('Corruption Error'));
      
      const memory = await service.loadMemory();

      expect(memory).toEqual(service.getDefaultMemory());
      expect(fs.copy).toHaveBeenCalled();
      expect(fs.remove).toHaveBeenCalledWith('/mocked/path/.aia/memory.json');
    });
  });

  describe('saveMemory', () => {
    const mockData: MemoryData = {
      conversations: [],
      commands: [],
      preferences: {},
      workingDirectories: {},
      semanticIndex: {},
      agenticHistory: []
    };

    it('should save memory data to file', async () => {
      await service.saveMemory(mockData);

      expect(fs.ensureDir).toHaveBeenCalledWith(path.dirname('/mocked/path/.aia/memory.json'));
      expect(fs.writeJson).toHaveBeenCalledWith('/mocked/path/.aia/memory.json', mockData, { spaces: 2 });
    });

    it('should throw an error if saving fails', async () => {
      mocked(fs.writeJson).mockRejectedValue(new Error('Write Error'));

      await expect(service.saveMemory(mockData)).rejects.toThrow('Failed to save memory: Write Error');
    });
  });

  describe('exists', () => {
    it('should return true if the memory path exists', async () => {
      mocked(fs.pathExists).mockResolvedValue(true);

      const exists = await service.exists();

      expect(exists).toBe(true);
    });

    it('should return false if the memory path