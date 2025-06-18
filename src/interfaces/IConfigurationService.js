/**
 * Configuration Service Interface
 * Defines the contract for configuration management and user preferences
 */
class IConfigurationService {
  /**
   * Initialize configuration service and load settings
   * @returns {Promise<void>}
   */
  async initialize() {
    throw new Error('IConfigurationService.initialize() must be implemented');
  }

  /**
   * Load configuration from persistent storage
   * @returns {Promise<Object>} Configuration object
   */
  async loadConfiguration() {
    throw new Error(
      'IConfigurationService.loadConfiguration() must be implemented'
    );
  }

  /**
   * Save configuration to persistent storage
   * @param {Object} config - Configuration object to save
   * @returns {Promise<void>}
   */
  async saveConfiguration(config) {
    throw new Error(
      'IConfigurationService.saveConfiguration() must be implemented'
    );
  }

  /**
   * Get configuration value by key
   * @param {string} key - Configuration key (supports dot notation)
   * @param {*} [defaultValue] - Default value if key not found
   * @returns {*} Configuration value
   */
  get(key, defaultValue = null) {
    throw new Error('IConfigurationService.get() must be implemented');
  }

  /**
   * Set configuration value by key
   * @param {string} key - Configuration key (supports dot notation)
   * @param {*} value - Value to set
   * @returns {Promise<void>}
   */
  async set(key, value) {
    throw new Error('IConfigurationService.set() must be implemented');
  }

  /**
   * Check if configuration key exists
   * @param {string} key - Configuration key to check
   * @returns {boolean} True if key exists
   */
  has(key) {
    throw new Error('IConfigurationService.has() must be implemented');
  }

  /**
   * Delete configuration key
   * @param {string} key - Configuration key to delete
   * @returns {Promise<void>}
   */
  async delete(key) {
    throw new Error('IConfigurationService.delete() must be implemented');
  }

  /**
   * Get all configuration keys
   * @returns {Array<string>} Array of configuration keys
   */
  getKeys() {
    throw new Error('IConfigurationService.getKeys() must be implemented');
  }

  /**
   * Get all configuration settings
   * @returns {Object} All configuration settings
   */
  getAllSettings() {
    throw new Error(
      'IConfigurationService.getAllSettings() must be implemented'
    );
  }

  /**
   * Update multiple configuration settings
   * @param {Object} updates - Object with key-value pairs to update
   * @returns {Promise<void>}
   */
  async updateSettings(updates) {
    throw new Error(
      'IConfigurationService.updateSettings() must be implemented'
    );
  }

  /**
   * Validate configuration structure and values
   * @param {Object} config - Configuration to validate
   * @returns {Object} Validation result with errors and warnings
   */
  validate(config) {
    throw new Error('IConfigurationService.validate() must be implemented');
  }

  /**
   * Get configuration schema
   * @returns {Object} Configuration schema definition
   */
  getSchema() {
    throw new Error('IConfigurationService.getSchema() must be implemented');
  }

  /**
   * Reset configuration to defaults
   * @param {Array<string>} [keys] - Specific keys to reset, or all if not provided
   * @returns {Promise<void>}
   */
  async resetToDefaults(keys = null) {
    throw new Error(
      'IConfigurationService.resetToDefaults() must be implemented'
    );
  }

  /**
   * Create configuration backup
   * @param {string} [name] - Backup name (defaults to timestamp)
   * @returns {Promise<string>} Backup identifier
   */
  async createBackup(name = null) {
    throw new Error('IConfigurationService.createBackup() must be implemented');
  }

  /**
   * Restore configuration from backup
   * @param {string} backupId - Backup identifier
   * @returns {Promise<void>}
   */
  async restoreFromBackup(backupId) {
    throw new Error(
      'IConfigurationService.restoreFromBackup() must be implemented'
    );
  }

  /**
   * List available configuration backups
   * @returns {Promise<Array>} Array of backup information
   */
  async listBackups() {
    throw new Error('IConfigurationService.listBackups() must be implemented');
  }

  /**
   * Watch for configuration changes
   * @param {Function} callback - Callback function for changes
   * @param {Array<string>} [keys] - Specific keys to watch
   * @returns {Function} Unwatch function
   */
  watch(callback, keys = null) {
    throw new Error('IConfigurationService.watch() must be implemented');
  }
}

module.exports = IConfigurationService;
