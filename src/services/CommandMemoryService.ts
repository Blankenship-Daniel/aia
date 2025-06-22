import { ICommandMemory } from '../interfaces/ICommandMemory';
import { IMemoryPersistence } from '../interfaces/IMemoryPersistence';
import { CommandHistoryEntry } from '../types/index';

/**
 * Command Memory Service Implementation
 * SOLID SRP: Handles only command memory operations
 * SOLID DIP: Depends on IMemoryPersistence abstraction
 */
export class CommandMemoryService implements ICommandMemory {
  /**
   * Creates an instance of the class
   * 
   * @param private persistence - Parameter description
   */
  constructor(private persistence: IMemoryPersistence) {}

  async addCommand(
    command: string,
    workingDirectory: string,
    exitCode: number,
    duration: number
  ): Promise<void> {
    const memory = await this.persistence.loadMemory();

    const entry: CommandHistoryEntry = {
      command,
      timestamp: new Date().toISOString(),
      workingDirectory,
      exitCode,
      duration,
      optimized: false,
    };

    memory.commands.push(entry);

    // Keep only recent commands
    const maxCommands = 500;
    if (memory.commands.length > maxCommands) {
      memory.commands = memory.commands.slice(-maxCommands);
    }

    await this.persistence.saveMemory(memory);
  }

  async searchCommands(
    query: string,
    limit: number = 10
  ): Promise<CommandHistoryEntry[]> {
    const memory = await this.persistence.loadMemory();
    const queryLower = query.toLowerCase();
    const results: Array<{ entry: CommandHistoryEntry; score: number }> = [];

    for (const command of memory.commands) {
      let score = 0;

      // Exact match gets highest score
      if (command.command.toLowerCase().includes(queryLower)) {
        score = 1.0;
      } else {
        // Partial word matches
        const commandWords = command.command.toLowerCase().split(/\s+/);
        const matchedWords = commandWords.filter((word) =>
          word.includes(queryLower)
        ).length;
        score = matchedWords / commandWords.length;
      }

      if (score > 0) {
        results.push({ entry: command, score });
      }
    }

    // Sort by relevance score
    results.sort((a, b) => b.score - a.score);
    return results.slice(0, limit).map((result) => result.entry);
  }

  /**
   * Gets recentcommands
   * 
   * @param limit - Parameter description
   * 
   * @returns Promise<CommandHistoryEntry[]> - Return value description
   */
  async getRecentCommands(limit: number = 10): Promise<CommandHistoryEntry[]> {
    const memory = await this.persistence.loadMemory();
    return memory.commands.slice(-limit);
  }
}
