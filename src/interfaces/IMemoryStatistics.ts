/**
 * Memory Statistics Interface
 * SOLID SRP: Focused solely on memory statistics operations
 * SOLID ISP: Small, focused interface for statistics-specific operations
 */
export interface IMemoryStatistics {
  /**
   * Get memory statistics
   */
  getStats(): Promise<{
    totalConversations: number;
    totalCommands: number;
    memorySize: number;
    oldestEntry: string;
    newestEntry: string;
  }>;
}
