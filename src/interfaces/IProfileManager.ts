/**
 * Profile Manager Interface
 * SOLID SRP: Handles only profile management operations
 * SOLID OCP: Can be extended with new profile features
 * SOLID LSP: All implementations must be substitutable
 * SOLID ISP: Focused only on profile operations
 * SOLID DIP: ConfigurationService depends on this abstraction
 */

export interface IProfileManager {
  /**
   * Create a new profile
   * @param name Profile name
   * @param config Optional initial configuration
   * @returns Created profile
   */
  create(name: string, config?: Partial<Profile>): Profile;

  /**
   * Switch to a different profile
   * @param name Profile name to switch to
   */
  switch(name: string): void;

  /**
   * List all available profiles
   * @returns Array of all profiles
   */
  list(): Profile[];

  /**
   * Get the currently active profile
   * @returns Active profile
   */
  getActive(): Profile;

  /**
   * Delete a profile
   * @param name Profile name to delete
   */
  delete(name: string): void;

  /**
   * Check if a profile exists
   * @param name Profile name to check
   * @returns True if profile exists
   */
  exists(name: string): boolean;

  /**
   * Export profile to file
   * @param name Profile name to export
   * @param filePath Destination file path
   */
  export(name: string, filePath: string): Promise<void>;

  /**
   * Import profile from file
   * @param filePath Source file path
   * @returns Imported profile
   */
  import(filePath: string): Promise<Profile>;
}

export interface Profile {
  name: string;
  created: Date;
  lastModified?: Date;
  config: Record<string, any>;
  description?: string;
  tags?: string[];
}
