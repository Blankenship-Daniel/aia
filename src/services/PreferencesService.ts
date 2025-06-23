import { IPreferences } from '../interfaces/IPreferences';
import { IMemoryPersistence } from '../interfaces/IMemoryPersistence';

/**
 * Preferences Service Implementation
 * SOLID SRP: Handles only user preference operations
 * SOLID DIP: Depends on IMemoryPersistence abstraction
 */
export class PreferencesService implements IPreferences {
  /**
   * Creates an instance of the class
   * 
   * @param private readonly memoryPersistence - Parameter description
   */
  constructor(private readonly memoryPersistence: IMemoryPersistence) {}

  /**
   * Get preference value with optional default
   */
  async getPreference<T>(key: string, defaultValue?: T): Promise<T> {
    try {
      const memoryData = await this.memoryPersistence.loadMemory();
      const preferences = memoryData.preferences || {};

      if (key in preferences) {
        return preferences[key] as T;
      }

      if (defaultValue !== undefined) {
        return defaultValue;
      }

      throw new Error(`Preference '${key}' not found and no default provided`);
    } catch (error) {
      if (defaultValue !== undefined) {
        return defaultValue;
      }
      throw new Error(`Failed to get preference '${key}': ${error}`);
    }
  }

  /**
   * Set preference value
   */
  async setPreference<T>(key: string, value: T): Promise<void> {
    try {
      const memoryData = await this.memoryPersistence.loadMemory();

      if (!memoryData.preferences) {
        memoryData.preferences = {};
      }

      memoryData.preferences[key] = value;
      await this.memoryPersistence.saveMemory(memoryData);
    } catch (error) {
      throw new Error(`Failed to set preference '${key}': ${error}`);
    }
  }

  /**
   * Get all preferences
   */
  async getAllPreferences(): Promise<Record<string, unknown>> {
    try {
      const memoryData = await this.memoryPersistence.loadMemory();
      return { ...(memoryData.preferences || {}) };
    } catch (error) {
      throw new Error(`Failed to get all preferences: ${error}`);
    }
  }

  /**
   * Delete a preference
   */
  async deletePreference(key: string): Promise<void> {
    try {
      const memoryData = await this.memoryPersistence.loadMemory();

      if (memoryData.preferences && key in memoryData.preferences) {
        delete memoryData.preferences[key];
        await this.memoryPersistence.saveMemory(memoryData);
      }
    } catch (error) {
      throw new Error(`Failed to delete preference '${key}': ${error}`);
    }
  }

  /**
   * Check if preference exists
   */
  async hasPreference(key: string): Promise<boolean> {
    try {
      const memoryData = await this.memoryPersistence.loadMemory();
      const preferences = memoryData.preferences || {};
      return key in preferences;
    } catch (error) {
      throw new Error(`Failed to check preference '${key}': ${error}`);
    }
  }

  /**
   * Reset all preferences to defaults
   */
  async resetPreferences(): Promise<void> {
    try {
      const memoryData = await this.memoryPersistence.loadMemory();
      memoryData.preferences = {};
      await this.memoryPersistence.saveMemory(memoryData);
    } catch (error) {
      throw new Error(`Failed to reset preferences: ${error}`);
    }
  }
}
