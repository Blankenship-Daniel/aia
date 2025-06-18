/**
 * Plugin Service Interface
 * Defines the contract for plugin management and lifecycle operations
 */
class IPluginService {
  /**
   * Initialize plugin service and load installed plugins
   * @returns {Promise<void>}
   */
  async initialize() {
    throw new Error('IPluginService.initialize() must be implemented');
  }

  /**
   * Install a plugin from various sources
   * @param {string} source - Plugin source (local path, git repo, npm package, etc.)
   * @param {Object} [options] - Installation options
   * @returns {Promise<Object>} Installation result
   */
  async installPlugin(source, options = {}) {
    throw new Error('IPluginService.installPlugin() must be implemented');
  }

  /**
   * Uninstall a plugin
   * @param {string} pluginName - Name of plugin to uninstall
   * @param {Object} [options] - Uninstallation options
   * @returns {Promise<void>}
   */
  async uninstallPlugin(pluginName, options = {}) {
    throw new Error('IPluginService.uninstallPlugin() must be implemented');
  }

  /**
   * Load a plugin into the runtime
   * @param {string} pluginName - Name of plugin to load
   * @returns {Promise<Object>} Loaded plugin instance
   */
  async loadPlugin(pluginName) {
    throw new Error('IPluginService.loadPlugin() must be implemented');
  }

  /**
   * Unload a plugin from the runtime
   * @param {string} pluginName - Name of plugin to unload
   * @returns {Promise<void>}
   */
  async unloadPlugin(pluginName) {
    throw new Error('IPluginService.unloadPlugin() must be implemented');
  }

  /**
   * Enable a plugin
   * @param {string} pluginName - Name of plugin to enable
   * @returns {Promise<void>}
   */
  async enablePlugin(pluginName) {
    throw new Error('IPluginService.enablePlugin() must be implemented');
  }

  /**
   * Disable a plugin
   * @param {string} pluginName - Name of plugin to disable
   * @returns {Promise<void>}
   */
  async disablePlugin(pluginName) {
    throw new Error('IPluginService.disablePlugin() must be implemented');
  }

  /**
   * Get list of installed plugins
   * @param {Object} [filters] - Optional filters for plugin list
   * @returns {Promise<Array>} Array of plugin information
   */
  async getInstalledPlugins(filters = {}) {
    throw new Error('IPluginService.getInstalledPlugins() must be implemented');
  }

  /**
   * Get plugin information and metadata
   * @param {string} pluginName - Name of plugin
   * @returns {Promise<Object>} Plugin information
   */
  async getPluginInfo(pluginName) {
    throw new Error('IPluginService.getPluginInfo() must be implemented');
  }

  /**
   * Execute plugin hook
   * @param {string} hookName - Name of hook to execute
   * @param {Object} context - Hook execution context
   * @returns {Promise<Array>} Array of hook results from all plugins
   */
  async executeHook(hookName, context) {
    throw new Error('IPluginService.executeHook() must be implemented');
  }

  /**
   * Register a plugin hook
   * @param {string} pluginName - Name of plugin registering the hook
   * @param {string} hookName - Name of hook to register
   * @param {Function} handler - Hook handler function
   * @returns {void}
   */
  registerHook(pluginName, hookName, handler) {
    throw new Error('IPluginService.registerHook() must be implemented');
  }

  /**
   * Unregister a plugin hook
   * @param {string} pluginName - Name of plugin
   * @param {string} hookName - Name of hook to unregister
   * @returns {void}
   */
  unregisterHook(pluginName, hookName) {
    throw new Error('IPluginService.unregisterHook() must be implemented');
  }

  /**
   * Validate plugin structure and manifest
   * @param {string} pluginPath - Path to plugin directory
   * @returns {Promise<Object>} Validation result
   */
  async validatePlugin(pluginPath) {
    throw new Error('IPluginService.validatePlugin() must be implemented');
  }

  /**
   * Search for plugins in registry
   * @param {string} query - Search query
   * @param {Object} [options] - Search options
   * @returns {Promise<Array>} Array of plugin search results
   */
  async searchPlugins(query, options = {}) {
    throw new Error('IPluginService.searchPlugins() must be implemented');
  }

  /**
   * Create plugin template
   * @param {string} pluginName - Name of new plugin
   * @param {string} template - Template type
   * @param {string} targetPath - Target directory path
   * @returns {Promise<void>}
   */
  async createPluginTemplate(pluginName, template, targetPath) {
    throw new Error(
      'IPluginService.createPluginTemplate() must be implemented'
    );
  }

  /**
   * Get plugin statistics and usage metrics
   * @param {string} [pluginName] - Specific plugin name, or all if not provided
   * @returns {Promise<Object>} Plugin statistics
   */
  async getPluginStats(pluginName = null) {
    throw new Error('IPluginService.getPluginStats() must be implemented');
  }

  /**
   * Execute plugin command
   * @param {string} pluginName - Name of plugin
   * @param {string} command - Command to execute
   * @param {Array} args - Command arguments
   * @returns {Promise<*>} Command result
   */
  async executePluginCommand(pluginName, command, args) {
    throw new Error(
      'IPluginService.executePluginCommand() must be implemented'
    );
  }
}

module.exports = IPluginService;
