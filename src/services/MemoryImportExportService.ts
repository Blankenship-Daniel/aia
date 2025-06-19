import { IMemoryImportExport } from '../interfaces/IMemoryImportExport.js';
import { IMemoryPersistence } from '../interfaces/IMemoryPersistence.js';
import { MemoryData, AgenticGoal } from '../types/index.js';
import * as fs from 'fs-extra';
import * as path from 'path';

/**
 * Service responsible for importing and exporting memory data
 * Implements Single Responsibility Principle
 */
export class MemoryImportExportService implements IMemoryImportExport {
  constructor(private readonly memoryPersistence: IMemoryPersistence) {}

  /**
   * Export memory data to a file
   */
  async exportMemory(filePath: string): Promise<void> {
    try {
      const memoryData = await this.memoryPersistence.loadMemory();
      await fs.ensureDir(path.dirname(filePath));
      await fs.writeJson(filePath, memoryData, { spaces: 2 });
    } catch (error) {
      throw new Error(`Failed to export memory to ${filePath}: ${error}`);
    }
  }

  /**
   * Import memory data from a file
   */
  async importMemory(filePath: string): Promise<void> {
    try {
      if (!(await fs.pathExists(filePath))) {
        throw new Error(`Import file does not exist: ${filePath}`);
      }

      const importedData: MemoryData = await fs.readJson(filePath);

      // Validate imported data structure
      this.validateMemoryData(importedData);

      await this.memoryPersistence.saveMemory(importedData);
    } catch (error) {
      throw new Error(`Failed to import memory from ${filePath}: ${error}`);
    }
  }

  /**
   * Compress memory by removing old entries
   */
  async compressMemory(): Promise<void> {
    try {
      const memoryData = await this.memoryPersistence.loadMemory();

      // Keep only recent conversations (last 100)
      const sortedConversations = memoryData.conversations
        .sort(
          (a, b) =>
            new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
        )
        .slice(0, 100);

      // Keep only recent commands (last 200)
      const sortedCommands = memoryData.commands
        .sort(
          (a, b) =>
            new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
        )
        .slice(0, 200);

      const compressedData: MemoryData = {
        ...memoryData,
        conversations: sortedConversations,
        commands: sortedCommands,
      };

      await this.memoryPersistence.saveMemory(compressedData);
    } catch (error) {
      throw new Error(`Failed to compress memory: ${error}`);
    }
  }

  /**
   * Clear all memory
   */
  async clearMemory(): Promise<void> {
    try {
      const emptyMemoryData: MemoryData = {
        conversations: [],
        commands: [],
        preferences: {},
        workingDirectories: {},
        semanticIndex: {},
        agenticHistory: [],
      };

      await this.memoryPersistence.saveMemory(emptyMemoryData);
    } catch (error) {
      throw new Error(`Failed to clear memory: ${error}`);
    }
  }

  /**
   * Get export formats supported
   */
  getSupportedFormats(): string[] {
    return ['json'];
  }

  /**
   * Validate the structure of imported memory data
   * @private
   */
  private validateMemoryData(data: any): void {
    if (!data || typeof data !== 'object') {
      throw new Error('Invalid memory data format: must be an object');
    }

    if (!Array.isArray(data.conversations)) {
      throw new Error(
        'Invalid memory data format: conversations must be an array'
      );
    }

    if (!Array.isArray(data.commands)) {
      throw new Error('Invalid memory data format: commands must be an array');
    }

    // Validate conversations structure
    for (const conversation of data.conversations) {
      if (
        !conversation.query ||
        !conversation.response ||
        !conversation.timestamp
      ) {
        throw new Error('Invalid conversation format: missing required fields');
      }
    }

    // Validate commands structure
    for (const command of data.commands) {
      if (
        typeof command.command !== 'string' ||
        typeof command.timestamp !== 'string'
      ) {
        throw new Error('Invalid command format: missing required fields');
      }
    }
  }
}
