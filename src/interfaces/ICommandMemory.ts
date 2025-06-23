import { CommandHistoryEntry } from '../types/index';

/**
 * Command Memory Interface
 * SOLID SRP: Focused solely on command history operations
 * SOLID ISP: Small, focused interface for command-specific operations
 */
export interface ICommandMemory {
  /**
   * Add a command to memory
   */
  addCommand(
    command: string,
    workingDirectory: string,
    exitCode: number,
    duration: number
  ): Promise<void>;

  /**
   * Search command history
   */
  searchCommands(query: string, limit?: number): Promise<CommandHistoryEntry[]>;

  /**
   * Get recent commands
   */
  getRecentCommands(limit?: number): Promise<CommandHistoryEntry[]>;
}
