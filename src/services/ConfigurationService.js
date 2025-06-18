/**
 * Configuration Service Implementation
 * Manages application configuration and user preferences
 */
const fs = require('fs-extra');
const path = require('path');
const os = require('os');
const IConfigurationService = require('../interfaces/IConfigurationService');

class ConfigurationService extends IConfigurationService {
  constructor() {
    super();
    this.config = {};
    this.configPath = path.join(os.homedir(), '.aia', 'config.json');
    this.backupPath = path.join(os.homedir(), '.aia', 'backups');
    this.watchers = [];
    this.schema = this.getSchema();
    this.notFound = Symbol('not-found'); // Use consistent symbol
  }

  /**
   * Initialize configuration service and load settings
   * @returns {Promise<void>}
   */
  async initialize() {
    try {
      await fs.ensureDir(path.dirname(this.configPath));
      await fs.ensureDir(this.backupPath);
      this.config = await this.loadConfiguration();
    } catch (error) {
      console.error('Failed to initialize configuration:', error.message);
      this.config = this.getDefaultConfiguration();
    }
  }

  /**
   * Load configuration from persistent storage
   * @returns {Promise<Object>} Configuration object
   */
  async loadConfiguration() {
    try {
      if (await fs.pathExists(this.configPath)) {
        const configData = await fs.readJson(this.configPath);
        return { ...this.getDefaultConfiguration(), ...configData };
      }
      return this.getDefaultConfiguration();
    } catch (error) {
      console.warn(
        'Failed to load configuration, using defaults:',
        error.message
      );
      return this.getDefaultConfiguration();
    }
  }

  /**
   * Save configuration to persistent storage
   * @param {Object} config - Configuration object to save
   * @returns {Promise<void>}
   */
  async saveConfiguration(config = null) {
    try {
      const configToSave = config || this.config;
      await fs.writeJson(this.configPath, configToSave, { spaces: 2 });
      this.notifyWatchers(configToSave);
    } catch (error) {
      throw new Error(`Failed to save configuration: ${error.message}`);
    }
  }

  /**
   * Get configuration value by key
   * @param {string} key - Configuration key (supports dot notation)
   * @param {*} [defaultValue] - Default value if key not found
   * @returns {*} Configuration value
   */
  get(key, defaultValue = null) {
    return this.getNestedValue(this.config, key, defaultValue);
  }

  /**
   * Set configuration value by key
   * @param {string} key - Configuration key (supports dot notation)
   * @param {*} value - Value to set
   * @returns {Promise<void>}
   */
  async set(key, value) {
    this.setNestedValue(this.config, key, value);
    await this.saveConfiguration();
  }

  /**
   * Check if configuration key exists
   * @param {string} key - Configuration key to check
   * @returns {boolean} True if key exists
   */
  has(key) {
    return (
      this.getNestedValue(this.config, key, this.notFound) !== this.notFound
    );
  }

  /**
   * Delete configuration key
   * @param {string} key - Configuration key to delete
   * @returns {Promise<void>}
   */
  async delete(key) {
    this.deleteNestedValue(this.config, key);
    await this.saveConfiguration();
  }

  /**
   * Get all configuration keys
   * @returns {Array<string>} Array of configuration keys
   */
  getKeys() {
    return this.getAllKeys(this.config, '');
  }

  /**
   * Get all configuration settings
   * @returns {Object} All configuration settings
   */
  getAllSettings() {
    return { ...this.config };
  }

  /**
   * Update multiple configuration settings
   * @param {Object} updates - Object with key-value pairs to update
   * @returns {Promise<void>}
   */
  async updateSettings(updates) {
    if (!updates || typeof updates !== 'object') {
      throw new Error('Updates must be an object');
    }

    for (const [key, value] of Object.entries(updates)) {
      await this.set(key, value);
    }
  }

  /**
   * Validate configuration structure and values
   * @param {Object} config - Configuration to validate
   * @returns {Object} Validation result with errors and warnings
   */
  validate(config) {
    const errors = [];
    const warnings = [];

    try {
      // Validate against schema
      this.validateAgainstSchema(config, this.schema, '', errors, warnings);

      // Custom validation rules
      if (config.openaiApiKey && !config.openaiApiKey.startsWith('sk-')) {
        warnings.push('OpenAI API key should start with "sk-"');
      }

      if (
        config.anthropicApiKey &&
        !config.anthropicApiKey.startsWith('sk-ant-')
      ) {
        warnings.push('Anthropic API key should start with "sk-ant-"');
      }
    } catch (error) {
      errors.push(`Validation error: ${error.message}`);
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Get configuration schema
   * @returns {Object} Configuration schema definition
   */
  getSchema() {
    return {
      type: 'object',
      properties: {
        preferredModel: {
          type: 'string',
          enum: [
            'gpt-4',
            'gpt-3.5-turbo',
            'claude-3-5-sonnet-20241022',
            'claude-3-haiku-20240307',
          ],
          default: 'gpt-4',
        },
        openaiApiKey: {
          type: 'string',
          default: '',
        },
        anthropicApiKey: {
          type: 'string',
          default: '',
        },
        autoOptimize: {
          type: 'boolean',
          default: true,
        },
        maxMemorySize: {
          type: 'number',
          minimum: 1000,
          maximum: 100000,
          default: 10000,
        },
        debug: {
          type: 'boolean',
          default: false,
        },
        plugins: {
          type: 'object',
          default: {},
        },
        workflows: {
          type: 'object',
          default: {},
        },
      },
    };
  }

  /**
   * Reset configuration to defaults
   * @param {Array<string>} [keys] - Specific keys to reset, or all if not provided
   * @returns {Promise<void>}
   */
  async resetToDefaults(keys = null) {
    const defaults = this.getDefaultConfiguration();

    if (keys) {
      for (const key of keys) {
        if (this.getNestedValue(defaults, key) !== undefined) {
          this.setNestedValue(
            this.config,
            key,
            this.getNestedValue(defaults, key)
          );
        }
      }
    } else {
      this.config = defaults;
    }

    await this.saveConfiguration();
  }

  /**
   * Create configuration backup
   * @param {string} [name] - Backup name (defaults to timestamp)
   * @returns {Promise<string>} Backup identifier
   */
  async createBackup(name = null) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupName = name || `config-${timestamp}`;
    const backupFile = path.join(this.backupPath, `${backupName}.json`);

    try {
      await fs.writeJson(backupFile, this.config, { spaces: 2 });
      return backupName;
    } catch (error) {
      throw new Error(`Failed to create backup: ${error.message}`);
    }
  }

  /**
   * Restore configuration from backup
   * @param {string} backupId - Backup identifier
   * @returns {Promise<void>}
   */
  async restoreFromBackup(backupId) {
    const backupFile = path.join(this.backupPath, `${backupId}.json`);

    try {
      if (!(await fs.pathExists(backupFile))) {
        throw new Error(`Backup '${backupId}' not found`);
      }

      const backupConfig = await fs.readJson(backupFile);
      this.config = backupConfig;
      await this.saveConfiguration();
    } catch (error) {
      throw new Error(`Failed to restore from backup: ${error.message}`);
    }
  }

  /**
   * List available configuration backups
   * @returns {Promise<Array>} Array of backup information
   */
  async listBackups() {
    try {
      const files = await fs.readdir(this.backupPath);
      const backups = [];

      for (const file of files) {
        if (file.endsWith('.json')) {
          const filePath = path.join(this.backupPath, file);
          const stats = await fs.stat(filePath);
          const backupName = path.basename(file, '.json');

          backups.push({
            name: backupName,
            created: stats.mtime,
            size: stats.size,
          });
        }
      }

      return backups.sort((a, b) => b.created - a.created);
    } catch (error) {
      console.warn('Failed to list backups:', error.message);
      return [];
    }
  }

  /**
   * Watch for configuration changes
   * @param {Function} callback - Callback function for changes
   * @param {Array<string>} [keys] - Specific keys to watch
   * @returns {Function} Unwatch function
   */
  watch(callback, keys = null) {
    const watcher = { callback, keys };
    this.watchers.push(watcher);

    // Return unwatch function
    return () => {
      const index = this.watchers.indexOf(watcher);
      if (index > -1) {
        this.watchers.splice(index, 1);
      }
    };
  }

  // Private helper methods

  /**
   * Get default configuration
   * @returns {Object} Default configuration object
   */
  getDefaultConfiguration() {
    return {
      preferredModel: 'gpt-4',
      openaiApiKey: '',
      anthropicApiKey: '',
      autoOptimize: true,
      autoExecute: false,
      maxMemorySize: 10000,
      debug: false,
      plugins: {},
      workflows: {},
    };
  }

  /**
   * Get nested value using dot notation
   * @param {Object} obj - Object to search
   * @param {string} key - Dot notation key
   * @param {*} defaultValue - Default value
   * @returns {*} Value or default
   */
  getNestedValue(obj, key, defaultValue = null) {
    const keys = key.split('.');
    let value = obj;

    for (const k of keys) {
      if (value && typeof value === 'object' && k in value) {
        value = value[k];
      } else {
        return defaultValue;
      }
    }

    return value;
  }

  /**
   * Set nested value using dot notation
   * @param {Object} obj - Object to modify
   * @param {string} key - Dot notation key
   * @param {*} value - Value to set
   */
  setNestedValue(obj, key, value) {
    const keys = key.split('.');
    const lastKey = keys.pop();
    let current = obj;

    for (const k of keys) {
      if (!(k in current) || typeof current[k] !== 'object') {
        current[k] = {};
      }
      current = current[k];
    }

    current[lastKey] = value;
  }
  /**
   * Delete nested value using dot notation
   * @param {Object} obj - Object to modify
   * @param {string} key - Dot notation key
   */
  deleteNestedValue(obj, key) {
    const keys = key.split('.');
    const lastKey = keys.pop();
    let current = obj;

    for (const k of keys) {
      if (!(k in current) || typeof current[k] !== 'object') {
        return; // Path doesn't exist
      }
      current = current[k];
    }

    if (current && typeof current === 'object') {
      delete current[lastKey];
    }
  }

  /**
   * Get all keys from configuration object
   * @param {Object} obj - Object to process
   * @param {string} prefix - Key prefix
   * @returns {Array<string>} Array of keys
   */
  getAllKeys(obj, prefix) {
    const keys = [];

    for (const [key, value] of Object.entries(obj)) {
      const fullKey = prefix ? `${prefix}.${key}` : key;
      keys.push(fullKey);

      if (value && typeof value === 'object' && !Array.isArray(value)) {
        keys.push(...this.getAllKeys(value, fullKey));
      }
    }

    return keys;
  }

  /**
   * Validate configuration against schema
   * @param {Object} config - Configuration to validate
   * @param {Object} schema - Schema to validate against
   * @param {string} path - Current path for error reporting
   * @param {Array} errors - Errors array
   * @param {Array} warnings - Warnings array
   */
  validateAgainstSchema(config, schema, path, errors, warnings) {
    if (schema.properties) {
      for (const [key, propSchema] of Object.entries(schema.properties)) {
        const fullPath = path ? `${path}.${key}` : key;
        const value = config[key];

        if (value !== undefined) {
          this.validateValue(value, propSchema, fullPath, errors, warnings);
        }
      }
    }
  }

  /**
   * Validate individual value against schema
   * @param {*} value - Value to validate
   * @param {Object} schema - Schema for the value
   * @param {string} path - Path for error reporting
   * @param {Array} errors - Errors array
   * @param {Array} warnings - Warnings array
   */
  validateValue(value, schema, path, errors, warnings) {
    // Type validation
    if (schema.type && typeof value !== schema.type) {
      errors.push(`${path}: Expected ${schema.type}, got ${typeof value}`);
      return;
    }

    // Enum validation
    if (schema.enum && !schema.enum.includes(value)) {
      errors.push(`${path}: Value must be one of ${schema.enum.join(', ')}`);
    }

    // Range validation for numbers
    if (schema.type === 'number') {
      if (schema.minimum !== undefined && value < schema.minimum) {
        errors.push(`${path}: Value must be >= ${schema.minimum}`);
      }
      if (schema.maximum !== undefined && value > schema.maximum) {
        errors.push(`${path}: Value must be <= ${schema.maximum}`);
      }
    }
  }

  /**
   * Notify watchers of configuration changes
   * @param {Object} config - Updated configuration
   */
  notifyWatchers(config) {
    for (const watcher of this.watchers) {
      try {
        if (watcher.keys) {
          // Check if any watched keys changed
          const changedKeys = watcher.keys.filter(
            (key) =>
              this.getNestedValue(config, key) !==
              this.getNestedValue(this.config, key)
          );
          if (changedKeys.length > 0) {
            watcher.callback(config, changedKeys);
          }
        } else {
          watcher.callback(config);
        }
      } catch (error) {
        console.warn('Configuration watcher error:', error.message);
      }
    }
  }
}

module.exports = ConfigurationService;
