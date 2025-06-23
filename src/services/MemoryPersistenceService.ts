import { IMemoryPersistence } from '../interfaces/IMemoryPersistence';
import { IConfigurationService } from '../interfaces/IConfigurationService';
import { MemoryData } from '../types/index';
import * as fs from 'fs-extra';
import * as path from 'path';
import * as os from 'os';

/**
 * Memory Persistence Service Implementation
 * SOLID SRP: Handles only memory persistence operations (loading/saving)
 * SOLID DIP: Depends on IConfigurationService abstraction
 */
export class MemoryPersistenceService implements IMemoryPersistence {
  private memoryPath: string;

  /**
   * Creates an instance of the class
   * 
   * @param private configService - Parameter description
   */
  constructor(private configService: IConfigurationService) {
    this.memoryPath = path.join(os.homedir(), '.aia', 'memory.json');
  }

  /**
   * Handles loadMemory operation
   * 
   * @returns Promise<MemoryData> - Return value description
   */
  async loadMemory(): Promise<MemoryData> {
    try {
      if (await this.exists()) {
        const data = await fs.readJson(this.memoryPath);
        return this.validateAndMergeWithDefaults(data);
      }
      return this.getDefaultMemory();
    } catch (error) {
      // Handle corrupted memory file gracefully
      return this.handleCorruptedMemoryFile(error as Error);
    }
  }

  /**
   * Handle corrupted memory files by creating backup and returning defaults
   */
  private async handleCorruptedMemoryFile(error: Error): Promise<MemoryData> {
    try {
      // Create a backup of the corrupted file
      const backupPath = `${this.memoryPath}.corrupted.${Date.now()}`;
      if (await this.exists()) {
        await fs.copy(this.memoryPath, backupPath);
      }

      // Remove the corrupted file and return defaults
      await fs.remove(this.memoryPath);
      return this.getDefaultMemory();
    } catch (backupError) {
      // If even backup fails, just return defaults silently
      return this.getDefaultMemory();
    }
  }

  /**
   * Handles saveMemory operation
   * 
   * @param data - Parameter description
   * 
   * @returns Promise<void> - Return value description
   */
  async saveMemory(data: MemoryData): Promise<void> {
    try {
      await fs.ensureDir(path.dirname(this.memoryPath));
      await fs.writeJson(this.memoryPath, data, { spaces: 2 });
    } catch (error) {
      throw new Error(`Failed to save memory: ${(error as Error).message}`);
    }
  }

  /**
   * Handles exists operation
   * 
   * @returns Promise<boolean> - Return value description
   */
  async exists(): Promise<boolean> {
    return fs.pathExists(this.memoryPath);
  }

  /**
   * Gets memorypath
   * 
   * @returns string - Return value description
   */
  getMemoryPath(): string {
    return this.memoryPath;
  }

  /**
   * Gets defaultmemory
   * 
   * @returns MemoryData - Return value description
   */
  private getDefaultMemory(): MemoryData {
    return {
      conversations: [],
      commands: [],
      preferences: {},
      workingDirectories: {},
      semanticIndex: {},
      agenticHistory: [],
    };
  }

  /**
   * Validates andmergewithdefaults
   * 
   * @param data - Parameter description
   * 
   * @returns MemoryData - Return value description
   */
  private validateAndMergeWithDefaults(data: any): MemoryData {
    const defaultMemory = this.getDefaultMemory();
    return {
      conversations: Array.isArray(data.conversations)
        ? data.conversations
        : defaultMemory.conversations,
      commands: Array.isArray(data.commands)
        ? data.commands
        : defaultMemory.commands,
      preferences:
        data.preferences && typeof data.preferences === 'object'
          ? data.preferences
          : defaultMemory.preferences,
      workingDirectories:
        data.workingDirectories && typeof data.workingDirectories === 'object'
          ? data.workingDirectories
          : defaultMemory.workingDirectories,
      semanticIndex:
        data.semanticIndex && typeof data.semanticIndex === 'object'
          ? data.semanticIndex
          : defaultMemory.semanticIndex,
      agenticHistory: Array.isArray(data.agenticHistory)
        ? data.agenticHistory
        : defaultMemory.agenticHistory,
    };
  }
}
