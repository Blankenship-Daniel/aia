import { IWorkingDirectory } from '../interfaces/IWorkingDirectory';
import { IMemoryPersistence } from '../interfaces/IMemoryPersistence';

/**
 * Working Directory Service Implementation
 * SOLID SRP: Handles only working directory tracking operations
 * SOLID DIP: Depends on IMemoryPersistence abstraction
 */
export class WorkingDirectoryService implements IWorkingDirectory {
  /**
   * Creates an instance of the class
   * 
   * @param private readonly memoryPersistence - Parameter description
   */
  constructor(private readonly memoryPersistence: IMemoryPersistence) {}

  /**
   * Record directory access
   */
  async recordDirectoryAccess(
    path: string,
    metadata?: Record<string, unknown>
  ): Promise<void> {
    try {
      const memoryData = await this.memoryPersistence.loadMemory();

      if (!memoryData.workingDirectories) {
        memoryData.workingDirectories = {};
      }

      const now = new Date().toISOString();

      if (memoryData.workingDirectories[path]) {
        // Update existing directory record
        memoryData.workingDirectories[path].accessCount =
          ((memoryData.workingDirectories[path].accessCount as number) || 0) +
          1;
        memoryData.workingDirectories[path].lastAccess = now;
        if (metadata) {
          memoryData.workingDirectories[path].metadata = {
            ...((memoryData.workingDirectories[path].metadata as Record<
              string,
              unknown
            >) || {}),
            ...metadata,
          };
        }
      } else {
        // Create new directory record
        memoryData.workingDirectories[path] = {
          accessCount: 1,
          firstAccess: now,
          lastAccess: now,
          ...(metadata && { metadata }),
        };
      }

      await this.memoryPersistence.saveMemory(memoryData);
    } catch (error) {
      throw new Error(
        `Failed to record directory access for '${path}': ${error}`
      );
    }
  }

  /**
   * Get recent directories
   */
  async getRecentDirectories(limit?: number): Promise<string[]> {
    try {
      const memoryData = await this.memoryPersistence.loadMemory();
      const directories = memoryData.workingDirectories || {};

      // Sort by last access time
      const sortedPaths = Object.keys(directories).sort((a, b) => {
        const aLastAccess =
          (directories[a].lastAccess as string) || '1970-01-01T00:00:00Z';
        const bLastAccess =
          (directories[b].lastAccess as string) || '1970-01-01T00:00:00Z';
        return (
          new Date(bLastAccess).getTime() - new Date(aLastAccess).getTime()
        );
      });

      return limit ? sortedPaths.slice(0, limit) : sortedPaths;
    } catch (error) {
      throw new Error(`Failed to get recent directories: ${error}`);
    }
  }

  /**
   * Get directory statistics
   */
  async getDirectoryStats(path: string): Promise<{
    accessCount: number;
    firstAccess: string;
    lastAccess: string;
    metadata?: Record<string, unknown>;
  }> {
    try {
      const memoryData = await this.memoryPersistence.loadMemory();
      const directories = memoryData.workingDirectories || {};

      if (!directories[path]) {
        throw new Error(`No statistics found for directory '${path}'`);
      }

      const stats = directories[path];
      return {
        accessCount: (stats.accessCount as number) || 0,
        firstAccess: (stats.firstAccess as string) || 'N/A',
        lastAccess: (stats.lastAccess as string) || 'N/A',
        metadata: stats.metadata as Record<string, unknown> | undefined,
      };
    } catch (error) {
      throw new Error(`Failed to get directory stats for '${path}': ${error}`);
    }
  }

  /**
   * Get all tracked directories with stats
   */
  async getAllDirectories(): Promise<
    Record<
      string,
      {
        accessCount: number;
        firstAccess: string;
        lastAccess: string;
        metadata?: Record<string, unknown>;
      }
    >
  > {
    try {
      const memoryData = await this.memoryPersistence.loadMemory();
      const directories = memoryData.workingDirectories || {};

      const result: Record<
        string,
        {
          accessCount: number;
          firstAccess: string;
          lastAccess: string;
          metadata?: Record<string, unknown>;
        }
      > = {};

      for (const [path, stats] of Object.entries(directories)) {
        result[path] = {
          accessCount: (stats.accessCount as number) || 0,
          firstAccess: (stats.firstAccess as string) || 'N/A',
          lastAccess: (stats.lastAccess as string) || 'N/A',
          metadata: stats.metadata as Record<string, unknown> | undefined,
        };
      }

      return result;
    } catch (error) {
      throw new Error(`Failed to get all directories: ${error}`);
    }
  }

  /**
   * Clean up old directory records
   */
  async cleanupOldDirectories(olderThanDays: number = 30): Promise<void> {
    try {
      const memoryData = await this.memoryPersistence.loadMemory();
      const directories = memoryData.workingDirectories || {};

      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

      for (const [path, stats] of Object.entries(directories)) {
        const lastAccess = new Date(
          (stats.lastAccess as string) || '1970-01-01T00:00:00Z'
        );
        if (lastAccess < cutoffDate) {
          delete directories[path];
        }
      }

      await this.memoryPersistence.saveMemory(memoryData);
    } catch (error) {
      throw new Error(`Failed to cleanup old directories: ${error}`);
    }
  }

  /**
   * Clear all directory history
   */
  async clearDirectoryHistory(): Promise<void> {
    try {
      const memoryData = await this.memoryPersistence.loadMemory();
      memoryData.workingDirectories = {};
      await this.memoryPersistence.saveMemory(memoryData);
    } catch (error) {
      throw new Error(`Failed to clear directory history: ${error}`);
    }
  }
}
