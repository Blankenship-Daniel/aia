import { MemoryData } from '../types/index';

/**
 * Memory Persistence Interface
 * SOLID SRP: Focused solely on memory persistence operations
 */
export interface IMemoryPersistence {
  /**
   * Load memory data from persistent storage
   */
  loadMemory(): Promise<MemoryData>;

  /**
   * Save memory data to persistent storage
   */
  saveMemory(data: MemoryData): Promise<void>;

  /**
   * Check if memory file exists
   */
  exists(): Promise<boolean>;

  /**
   * Get memory file path
   */
  getMemoryPath(): string;
}
