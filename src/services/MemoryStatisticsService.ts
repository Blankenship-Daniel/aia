import { IMemoryStatistics } from '../interfaces/IMemoryStatistics';
import { IMemoryPersistence } from '../interfaces/IMemoryPersistence';

/**
 * Memory Statistics Service Implementation
 * SOLID SRP: Handles only memory statistics operations
 * SOLID DIP: Depends on IMemoryPersistence abstraction
 */
export class MemoryStatisticsService implements IMemoryStatistics {
  /**
   * Creates an instance of the class
   * 
   * @param private persistence - Parameter description
   */
  constructor(private persistence: IMemoryPersistence) {}

  /**
   * Gets stats
   * 
   * @returns Promise< - Return value description
   */
  async getStats(): Promise<{
    totalConversations: number;
    totalCommands: number;
    memorySize: number;
    oldestEntry: string;
    newestEntry: string;
  }> {
    const memory = await this.persistence.loadMemory();

    const allTimestamps = [
      ...memory.conversations.map((c) => c.timestamp),
      ...memory.commands.map((c) => c.timestamp),
    ].sort();

    const memoryStr = JSON.stringify(memory);
    const memorySize = Buffer.byteLength(memoryStr, 'utf8');

    return {
      totalConversations: memory.conversations.length,
      totalCommands: memory.commands.length,
      memorySize,
      oldestEntry: allTimestamps[0] || 'N/A',
      newestEntry: allTimestamps[allTimestamps.length - 1] || 'N/A',
    };
  }
}
