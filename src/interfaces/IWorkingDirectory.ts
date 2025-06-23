/**
 * Working Directory Interface
 * SOLID SRP: Focused solely on working directory tracking operations
 * SOLID ISP: Small, focused interface for directory-specific operations
 */
export interface IWorkingDirectory {
  /**
   * Record directory access
   */
  recordDirectoryAccess(
    path: string,
    metadata?: Record<string, unknown>
  ): Promise<void>;

  /**
   * Get recent directories
   */
  getRecentDirectories(limit?: number): Promise<string[]>;

  /**
   * Get directory statistics
   */
  getDirectoryStats(path: string): Promise<{
    accessCount: number;
    firstAccess: string;
    lastAccess: string;
    metadata?: Record<string, unknown>;
  }>;

  /**
   * Get all tracked directories with stats
   */
  getAllDirectories(): Promise<
    Record<
      string,
      {
        accessCount: number;
        firstAccess: string;
        lastAccess: string;
        metadata?: Record<string, unknown>;
      }
    >
  >;

  /**
   * Clean up old directory records
   */
  cleanupOldDirectories(olderThanDays?: number): Promise<void>;

  /**
   * Clear all directory history
   */
  clearDirectoryHistory(): Promise<void>;
}
