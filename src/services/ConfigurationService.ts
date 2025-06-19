import { IConfigurationService } from '../interfaces/IConfigurationService';
import { AIAConfig, ConfigProfile, AsyncResult } from '../types/index';
import * as fs from 'fs-extra';
import * as path from 'path';
import * as os from 'os';

/**
 * Configuration Service Implementation
 * Manages application configuration and user preferences
 */
export class ConfigurationService implements IConfigurationService {
  private config: AIAConfig;
  private configPath: string;
  private backupPath: string;
  private watchers: Array<(config: AIAConfig) => void>;
  private schema: Record<string, unknown>;
  private readonly notFound = Symbol('not-found');

  constructor() {
    this.config = this.getDefaultConfiguration();
    this.configPath = path.join(os.homedir(), '.aia', 'config.json');
    this.backupPath = path.join(os.homedir(), '.aia', 'backups');
    this.watchers = [];
    this.schema = this.getSchema();
  }

  /**
   * Initialize configuration service and load settings
   */
  async initialize(): Promise<void> {
    try {
      await fs.ensureDir(path.dirname(this.configPath));
      await fs.ensureDir(this.backupPath);
      this.config = await this.loadConfiguration();
    } catch (error) {
      console.error(
        'Failed to initialize configuration:',
        (error as Error).message
      );
      this.config = this.getDefaultConfiguration();
    }
  }

  /**
   * Load configuration from persistent storage
   */
  async loadConfiguration(): Promise<AIAConfig> {
    try {
      let config = this.getDefaultConfiguration();

      if (await fs.pathExists(this.configPath)) {
        const configData = await fs.readJson(this.configPath);
        config = { ...config, ...configData };
      }

      // Environment variables take precedence over config file
      if (process.env.OPENAI_API_KEY) {
        config.openaiApiKey = process.env.OPENAI_API_KEY;
      }
      if (process.env.ANTHROPIC_API_KEY) {
        config.anthropicApiKey = process.env.ANTHROPIC_API_KEY;
      }

      return config;
    } catch (error) {
      console.warn(
        'Failed to load configuration, using defaults:',
        (error as Error).message
      );
      return this.getDefaultConfiguration();
    }
  }

  /**
   * Save configuration to persistent storage
   */
  async saveConfiguration(config: AIAConfig): Promise<void> {
    try {
      // Create backup before saving
      await this.createBackup();

      // Validate configuration before saving
      const validatedConfig = await this.validateConfiguration(config);
      if (!validatedConfig.success) {
        throw new Error(
          `Configuration validation failed: ${validatedConfig.error}`
        );
      }

      await fs.writeJson(this.configPath, config, { spaces: 2 });
      this.config = config;

      // Notify watchers
      this.notifyWatchers(config);
    } catch (error) {
      throw new Error(
        `Failed to save configuration: ${(error as Error).message}`
      );
    }
  }

  /**
   * Get current active configuration
   */
  getConfiguration(): AIAConfig {
    return { ...this.config };
  }

  /**
   * Update a specific configuration setting
   */
  async updateSetting<K extends keyof AIAConfig>(
    key: K,
    value: AIAConfig[K]
  ): Promise<void> {
    const updatedConfig = { ...this.config, [key]: value };
    await this.saveConfiguration(updatedConfig);
  }

  /**
   * Get configuration value by key with type safety
   */
  getSetting<K extends keyof AIAConfig>(key: K): AIAConfig[K] {
    return this.config[key];
  }

  /**
   * Set configuration value by key with type safety
   */
  async setSetting<K extends keyof AIAConfig>(
    key: K,
    value: AIAConfig[K]
  ): Promise<void> {
    await this.updateSetting(key, value);
  }

  /**
   * Create a new configuration profile
   */
  async createProfile(name: string, profile: ConfigProfile): Promise<void> {
    const updatedConfig = {
      ...this.config,
      profiles: {
        ...this.config.profiles,
        [name]: profile,
      },
    };
    await this.saveConfiguration(updatedConfig);
  }

  /**
   * Switch to a different configuration profile
   */
  async switchProfile(profileName: string): Promise<void> {
    const profile = this.config.profiles[profileName];
    if (!profile) {
      throw new Error(`Profile '${profileName}' not found`);
    }

    const updatedConfig = {
      ...this.config,
      ...profile.settings,
    };
    await this.saveConfiguration(updatedConfig);
  }

  /**
   * Delete a configuration profile
   */
  async deleteProfile(profileName: string): Promise<void> {
    if (!this.config.profiles[profileName]) {
      throw new Error(`Profile '${profileName}' not found`);
    }

    const { [profileName]: removed, ...remainingProfiles } =
      this.config.profiles;
    const updatedConfig = {
      ...this.config,
      profiles: remainingProfiles,
    };
    await this.saveConfiguration(updatedConfig);
  }

  /**
   * List all available profiles
   */
  async listProfiles(): Promise<ConfigProfile[]> {
    return Object.values(this.config.profiles);
  }

  /**
   * Get active profile name
   */
  getActiveProfile(): string | null {
    const activeProfile = Object.entries(this.config.profiles).find(
      ([, profile]) => profile.active
    );
    return activeProfile ? activeProfile[0] : null;
  }

  /**
   * Validate API keys and return status
   */
  async validateApiKeys(): Promise<Record<string, boolean>> {
    const results: Record<string, boolean> = {};

    // Basic validation - check if keys are present and have reasonable format
    if (this.config.openaiApiKey) {
      results.openai =
        this.config.openaiApiKey.startsWith('sk-') &&
        this.config.openaiApiKey.length > 20;
    } else {
      results.openai = false;
    }

    if (this.config.anthropicApiKey) {
      results.anthropic =
        this.config.anthropicApiKey.startsWith('sk-ant-') &&
        this.config.anthropicApiKey.length > 20;
    } else {
      results.anthropic = false;
    }

    return results;
  }

  /**
   * Get default configuration values
   */
  getDefaultConfiguration(): AIAConfig {
    return {
      preferredModel: 'claude-3-5-sonnet-20241022', // Use Claude 3.5 Sonnet as default
      // Check environment variables for API keys
      openaiApiKey: process.env.OPENAI_API_KEY,
      anthropicApiKey: process.env.ANTHROPIC_API_KEY,
      autoExecute: false,
      plugins: {},
      profiles: {},
      outputDirectories: {
        prompts: './prompts',
        copilotInstructions: './copilot-instructions',
        context: './context',
        architecture: './architecture',
        comprehensive: './comprehensive',
        minimal: './minimal',
        developer: './developer',
      },
    };
  }

  /**
   * Reset configuration to defaults
   */
  async resetToDefaults(): Promise<void> {
    const defaultConfig = this.getDefaultConfiguration();
    await this.saveConfiguration(defaultConfig);
  }

  /**
   * Export configuration for backup
   */
  async exportConfiguration(): Promise<string> {
    return JSON.stringify(this.config, null, 2);
  }

  /**
   * Import configuration from backup
   */
  async importConfiguration(configData: string): Promise<void> {
    try {
      const importedConfig = JSON.parse(configData);
      const validatedConfig = await this.validateConfiguration(importedConfig);

      if (!validatedConfig.success) {
        throw new Error(`Invalid configuration: ${validatedConfig.error}`);
      }

      await this.saveConfiguration(validatedConfig.data!);
    } catch (error) {
      throw new Error(
        `Failed to import configuration: ${(error as Error).message}`
      );
    }
  }

  /**
   * Validate configuration structure and values
   */
  async validateConfiguration(
    config: unknown
  ): Promise<AsyncResult<AIAConfig>> {
    try {
      if (!config || typeof config !== 'object') {
        return { success: false, error: 'Configuration must be an object' };
      }

      const cfg = config as Partial<AIAConfig>;

      // Validate required fields and types
      if (cfg.preferredModel && typeof cfg.preferredModel !== 'string') {
        return { success: false, error: 'preferredModel must be a string' };
      }

      if (
        cfg.autoExecute !== undefined &&
        typeof cfg.autoExecute !== 'boolean'
      ) {
        return { success: false, error: 'autoExecute must be a boolean' };
      }

      if (cfg.plugins && typeof cfg.plugins !== 'object') {
        return { success: false, error: 'plugins must be an object' };
      }

      if (cfg.profiles && typeof cfg.profiles !== 'object') {
        return { success: false, error: 'profiles must be an object' };
      }

      if (cfg.outputDirectories && typeof cfg.outputDirectories !== 'object') {
        return { success: false, error: 'outputDirectories must be an object' };
      }

      // Build validated configuration with defaults
      const validatedConfig: AIAConfig = {
        preferredModel: cfg.preferredModel || 'gpt-4',
        openaiApiKey: cfg.openaiApiKey,
        anthropicApiKey: cfg.anthropicApiKey,
        autoExecute: cfg.autoExecute || false,
        plugins: cfg.plugins || {},
        profiles: cfg.profiles || {},
        outputDirectories:
          cfg.outputDirectories ||
          this.getDefaultConfiguration().outputDirectories,
      };

      return { success: true, data: validatedConfig };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  }

  /**
   * Get available AI models
   */
  getAvailableModels(): string[] {
    return [
      // OpenAI models
      'gpt-4',
      'gpt-3.5-turbo',
      // Claude 4 series (latest)
      'claude-opus-4-20250514',
      'claude-sonnet-4-20250514',
      // Claude 3.5 series
      'claude-3-5-sonnet-20241022',
      'claude-3-5-haiku-20241022',
      // Claude 3 series (legacy)
      'claude-3-opus-20240229',
      'claude-3-haiku-20240307',
    ];
  }

  /**
   * Check if a specific feature is enabled
   */
  isFeatureEnabled(featureName: string): boolean {
    // For now, return true for all features since we don't have feature flags yet
    return true;
  }

  /**
   * Enable or disable a specific feature
   */
  async setFeatureEnabled(
    featureName: string,
    enabled: boolean
  ): Promise<void> {
    // TODO: Implement feature flags system
    console.log(`Feature ${featureName} ${enabled ? 'enabled' : 'disabled'}`);
  }

  /**
   * Get configuration file path
   */
  getConfigurationPath(): string {
    return this.configPath;
  }

  /**
   * Watch for configuration changes
   */
  watchConfiguration(callback: (config: AIAConfig) => void): void {
    this.watchers.push(callback);
  }

  /**
   * Stop watching configuration changes
   */
  unwatchConfiguration(): void {
    this.watchers = [];
  }

  /**
   * Create backup of current configuration
   */
  private async createBackup(): Promise<void> {
    try {
      if (await fs.pathExists(this.configPath)) {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const backupFile = path.join(
          this.backupPath,
          `config-${timestamp}.json`
        );
        await fs.copy(this.configPath, backupFile);
      }
    } catch (error) {
      console.warn(
        'Failed to create configuration backup:',
        (error as Error).message
      );
    }
  }

  /**
   * Notify watchers of configuration changes
   */
  private notifyWatchers(config: AIAConfig): void {
    this.watchers.forEach((callback) => {
      try {
        callback(config);
      } catch (error) {
        console.error(
          'Error in configuration watcher:',
          (error as Error).message
        );
      }
    });
  }

  /**
   * Get configuration schema for validation
   */
  private getSchema(): Record<string, unknown> {
    return {
      preferredModel: { type: 'string', enum: this.getAvailableModels() },
      openaiApiKey: { type: 'string', optional: true },
      anthropicApiKey: { type: 'string', optional: true },
      autoExecute: { type: 'boolean' },
      plugins: { type: 'object' },
      profiles: { type: 'object' },
    };
  }
}
