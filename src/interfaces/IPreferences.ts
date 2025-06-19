/**
 * Preferences Interface
 * SOLID SRP: Focused solely on user preference operations
 * SOLID ISP: Small, focused interface for preference-specific operations
 */
export interface IPreferences {
  /**
   * Get preference value with optional default
   */
  getPreference<T>(key: string, defaultValue?: T): Promise<T>;

  /**
   * Set preference value
   */
  setPreference<T>(key: string, value: T): Promise<void>;

  /**
   * Get all preferences
   */
  getAllPreferences(): Promise<Record<string, unknown>>;

  /**
   * Delete a preference
   */
  deletePreference(key: string): Promise<void>;

  /**
   * Check if preference exists
   */
  hasPreference(key: string): Promise<boolean>;

  /**
   * Reset all preferences to defaults
   */
  resetPreferences(): Promise<void>;
}
