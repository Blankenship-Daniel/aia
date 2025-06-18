import { AIAConfig, ConfigProfile, AsyncResult } from '../types/index';

/**
 * Configuration Service Interface
 * Defines the contract for configuration management and user preferences
 */
export interface IConfigurationService {
  /**
   * Initialize configuration service and load settings
   */
  initialize(): Promise<void>;

  /**
   * Load configuration from persistent storage
   */
  loadConfiguration(): Promise<AIAConfig>;

  /**
   * Save configuration to persistent storage
   */
  saveConfiguration(config: AIAConfig): Promise<void>;

  /**
   * Get current active configuration
   */
  getConfiguration(): AIAConfig;

  /**
   * Update a specific configuration setting
   */
  updateSetting<K extends keyof AIAConfig>(
    key: K,
    value: AIAConfig[K]
  ): Promise<void>;

  /**
   * Get configuration value by key with type safety
   */
  getSetting<K extends keyof AIAConfig>(key: K): AIAConfig[K];

  /**
   * Set configuration value by key with type safety
   */
  setSetting<K extends keyof AIAConfig>(
    key: K,
    value: AIAConfig[K]
  ): Promise<void>;

  /**
   * Create a new configuration profile
   */
  createProfile(name: string, profile: ConfigProfile): Promise<void>;

  /**
   * Switch to a different configuration profile
   */
  switchProfile(profileName: string): Promise<void>;

  /**
   * Delete a configuration profile
   */
  deleteProfile(profileName: string): Promise<void>;

  /**
   * List all available profiles
   */
  listProfiles(): Promise<ConfigProfile[]>;

  /**
   * Get active profile name
   */
  getActiveProfile(): string | null;

  /**
   * Validate API keys and return status
   */
  validateApiKeys(): Promise<Record<string, boolean>>;

  /**
   * Get default configuration values
   */
  getDefaultConfiguration(): AIAConfig;

  /**
   * Reset configuration to defaults
   */
  resetToDefaults(): Promise<void>;

  /**
   * Export configuration for backup
   */
  exportConfiguration(): Promise<string>;

  /**
   * Import configuration from backup
   */
  importConfiguration(configData: string): Promise<void>;

  /**
   * Validate configuration structure and values
   */
  validateConfiguration(config: unknown): Promise<AsyncResult<AIAConfig>>;

  /**
   * Get available AI models
   */
  getAvailableModels(): string[];

  /**
   * Check if a specific feature is enabled
   */
  isFeatureEnabled(featureName: string): boolean;

  /**
   * Enable or disable a specific feature
   */
  setFeatureEnabled(featureName: string, enabled: boolean): Promise<void>;

  /**
   * Get configuration file path
   */
  getConfigurationPath(): string;

  /**
   * Watch for configuration changes
   */
  watchConfiguration(callback: (config: AIAConfig) => void): void;

  /**
   * Stop watching configuration changes
   */
  unwatchConfiguration(): void;
}
