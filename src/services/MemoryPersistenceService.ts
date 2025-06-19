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

  constructor(private configService: IConfigurationService) {
    this.memoryPath = path.join(os.homedir(), '.aia', 'memory.json');
  }

  async loadMemory(): Promise<MemoryData> {
    try {
      if (await this.exists()) {
        const data = await fs.readJson(this.memoryPath);
        return this.validateAndMergeWithDefaults(data);
      }
      return this.getDefaultMemory();
    } catch (error) {
      console.warn(
        'Failed to load memory, using defaults:',
        (error as Error).message
      );
      return this.getDefaultMemory();
    }
  }

  async saveMemory(data: MemoryData): Promise<void> {
    try {
      await fs.ensureDir(path.dirname(this.memoryPath));
      await fs.writeJson(this.memoryPath, data, { spaces: 2 });
    } catch (error) {
      throw new Error(`Failed to save memory: ${(error as Error).message}`);
    }
  }

  async exists(): Promise<boolean> {
    return fs.pathExists(this.memoryPath);
  }

  getMemoryPath(): string {
    return this.memoryPath;
  }

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
