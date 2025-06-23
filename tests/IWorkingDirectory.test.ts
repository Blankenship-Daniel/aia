Here's how you can create comprehensive Jest tests for your `IWorkingDirectory` interface, inspired by the structure and requirements detailed in your project context. We'll assume there's an implementation class (e.g., `WorkingDirectoryService`) that follows this interface, and we'll focus on testing this class using the project's mock utilities and Jest mocks.

We'll start by creating a file named `WorkingDirectoryService.test.ts` inside your test directory and set up the basic test structure:

```typescript
import { WorkingDirectoryService } from '../services/WorkingDirectoryService';
import { mockRecordDirectoryAccess, mockGetRecentDirectories, mockGetDirectoryStats, mockGetAllDirectories, mockCleanupOldDirectories, mockClearDirectoryHistory } from '../tests/__mocks__/mockWorkingDirectory';
import { IWorkingDirectory } from '../interfaces/IWorkingDirectory';

jest.mock('../services/WorkingDirectoryService', () => {
  return {
    recordDirectoryAccess: jest.fn(),
    getRecentDirectories: jest.fn(),
    getDirectoryStats: jest.fn(),
    getAllDirectories: jest.fn(),
    cleanupOldDirectories: jest.fn(),
    clearDirectoryHistory: jest.fn(),
  };
});

describe('WorkingDirectoryService', () => {
  let service: IWorkingDirectory;

  beforeEach(() => {
    service = new WorkingDirectoryService();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('recordDirectoryAccess', () => {
    it('should record directory access successfully', async () => {
      const path = '/test/path';
      await service.recordDirectoryAccess(path);
      expect(mockRecordDirectoryAccess).toHaveBeenCalledWith(path, undefined);
    });

    it('should handle errors when recording directory access', async () => {
      const path = '/invalid/path';
      mockRecordDirectoryAccess.mockRejectedValue(new Error('Access Error'));
      await expect(service.recordDirectoryAccess(path)).rejects.toThrow('Access Error');
    });
  });

  describe('getRecentDirectories', () => {
    it('should return recent directories with a default limit', async () => {
      mockGetRecentDirectories.mockResolvedValue(['/path/1', '/path/2']);
      const result = await service.getRecentDirectories();
      expect(result).toEqual(['/path/1', '/path/2']);
      expect(mockGetRecentDirectories).toHaveBeenCalledWith(undefined);
    });

    it('should return recent directories with a custom limit', async () => {
      const limit = 5;
      mockGetRecentDirectories.mockResolvedValue(['/path/1']);
      const result = await service.getRecentDirectories(limit);
      expect(result).toEqual(['/path/1']);
      expect(mockGetRecentDirectories).toHaveBeenCalledWith(limit);
    });

    it('should handle errors in fetching recent directories', async () => {
      mockGetRecentDirectories.mockRejectedValue(new Error('Fetch Error'));
      await expect(service.getRecentDirectories()).rejects.toThrow('Fetch Error');
    });
  });

  describe('getDirectoryStats', () => {
    it('should return directory stats', async () => {
      const path = '/test/path';
      const stats = {
        accessCount: 10,
        firstAccess: '2023-01-01',
        lastAccess: '2023-01-10',
        metadata: { key: 'value' }
      };
      mockGetDirectoryStats.mockResolvedValue(stats);
      const result = await service.getDirectoryStats(path);
      expect(result).toEqual(stats);
      expect(mockGetDirectoryStats).toHaveBeenCalledWith(path);
    });

    it('should handle errors in fetching directory stats', async () => {
      mockGetDirectoryStats.mockRejectedValue(new Error('Stats Error'));
      await expect(service.getDirectoryStats('/invalid/path')).rejects.toThrow('Stats Error');
    });
  });

  describe('getAllDirectories', () => {
    it('should return all directories with statistics', async () => {
