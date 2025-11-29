To create Jest tests for the `WorkingDirectoryService` class, we need to follow the project's existing testing patterns, especially making use of mocks and dependency injection. The tests will cover both success and error scenarios. I'll provide tests for several key methods, with mock implementations for the `IMemoryPersistence` dependency. Here's how the test suite could be structured:

```typescript
// src/services/__tests__/WorkingDirectoryService.test.ts
import { WorkingDirectoryService } from '../WorkingDirectoryService';
import { IMemoryPersistence } from '../../interfaces/IMemoryPersistence';
import { mocked } from 'ts-jest/utils';

// Import mock implementations if available
// Assume we have them available in a mocks directory
import { MemoryPersistenceMock } from '../../__mocks__/MemoryPersistenceMock';

jest.mock('../../__mocks__/MemoryPersistenceMock');

describe('WorkingDirectoryService', () => {
  let memoryPersistenceMock: jest.Mocked<IMemoryPersistence>;
  let service: WorkingDirectoryService;

  beforeEach(() => {
    memoryPersistenceMock = new MemoryPersistenceMock();
    service = new WorkingDirectoryService(memoryPersistenceMock);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('#recordDirectoryAccess', () => {
    it('should record directory access with new entry', async () => {
      memoryPersistenceMock.loadMemory.mockResolvedValue({ workingDirectories: {} });

      await service.recordDirectoryAccess('/new/path');

      expect(memoryPersistenceMock.saveMemory).toHaveBeenCalledTimes(1);
      const savedMemory = memoryPersistenceMock.saveMemory.mock.calls[0][0];
      expect(savedMemory.workingDirectories['/new/path'].accessCount).toBe(1);
      expect(savedMemory.workingDirectories['/new/path'].firstAccess).toBeDefined();
      expect(savedMemory.workingDirectories['/new/path'].lastAccess).toBeDefined();
    });

    it('should update accessCount for an existing directory', async () => {
      const existingTime = new Date().toISOString();
      memoryPersistenceMock.loadMemory.mockResolvedValue({
        workingDirectories: {
          '/existing/path': {
            accessCount: 1,
            firstAccess: existingTime,
            lastAccess: existingTime,
          },
        },
      });

      await service.recordDirectoryAccess('/existing/path');

      expect(memoryPersistenceMock.saveMemory).toHaveBeenCalledTimes(1);
      const savedMemory = memoryPersistenceMock.saveMemory.mock.calls[0][0];
      expect(savedMemory.workingDirectories['/existing/path'].accessCount).toBe(2);
    });

    it('should throw an error when failing to record directory access', async () => {
      memoryPersistenceMock.loadMemory.mockRejectedValue(new Error('Failed to load'));

      await expect(service.recordDirectoryAccess('/path')).rejects.toThrow(
        "Failed to record directory access for '/path': Error: Failed to load"
      );
    });
  });

  describe('#getRecentDirectories', () => {
    it('should return sorted recent directories by last access time', async () => {
      const directoryData = {
        '/path/one': { lastAccess: '2023-01-01T00:00:00Z' },
        '/path/two': { lastAccess: '2023-01-02T00:00:00Z' },
      };
      memoryPersistenceMock.loadMemory.mockResolvedValue({ workingDirectories: directoryData });

      const recentDirectories = await service.getRecentDirectories(1);

      expect(recentDirectories).toEqual(['/path/two']);
    });

    it('should handle loading errors gracefully', async () => {
      memoryPersistenceMock.loadMemory.mockRejectedValue(new Error('Load error'));

      await expect(service.getRecentDirectories()).rejects.toThrow(
        'Failed to get recent directories: Error: Load error'
      );
    });
  });

  // Additional tests for other methods would follow the same structure

 