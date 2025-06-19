import {
  PluginManifest,
  PluginInfo,
  PluginInstallOptions,
  PluginHook,
  Plugin,
  PluginCommand,
  PluginPermission,
  PluginListFilters,
  PluginSearchOptions,
  PluginUninstallOptions,
} from '../types/index';

export type {
  PluginManifest,
  PluginInfo,
  PluginInstallOptions,
  PluginHook,
  Plugin,
  PluginCommand,
  PluginPermission,
  PluginListFilters,
  PluginSearchOptions,
  PluginUninstallOptions,
};

// Add additional types specific to IPluginService that aren't in types/index.ts
export type PluginHookType = string;
export type PluginContext = Record<string, unknown>;
export type PluginExecutionResult = {
  success: boolean;
  result?: any;
  error?: string;
};
export type PluginStats = {
  totalPlugins: number;
  enabledPlugins: number;
  loadedPlugins: number;
  totalHooks: number;
  pluginsByAuthor: Record<string, number>;
};
export type PluginSearchResult = {
  plugin: PluginInfo;
  score: number;
  matchedFields: string[];
};
export type PluginDiscoveryResult = {
  name: string;
  description: string;
  author: string;
  tags: string[];
  source: string;
};
export type PluginTemplateOptions = {
  description?: string;
  author?: string;
  hooks?: string[];
  commands?: PluginCommand[];
  permissions?: PluginPermission[];
};
export type PluginValidationResult = {
  valid: boolean;
  error?: string;
};
export type PluginLoadResult = {
  success: boolean;
  plugin?: PluginInfo;
  error?: string;
};
export type PluginUnloadResult = {
  success: boolean;
  error?: string;
};

// Add additional result types for more robust type safety
export type PluginInstallResult = {
  success: boolean;
  plugin?: PluginManifest;
  error?: string;
  installPath?: string;
  warnings?: string[];
};

export type PluginUpdateResult = {
  success: boolean;
  oldVersion: string;
  newVersion: string;
  changes?: string[];
  error?: string;
};

export type PluginHealthCheck = {
  pluginName: string;
  healthy: boolean;
  issues: string[];
  lastChecked: string;
};

export type PluginDependencyInfo = {
  name: string;
  version: string;
  required: boolean;
  installed: boolean;
  compatible: boolean;
};

// Enhanced plugin template types
export type PluginTemplateType =
  | 'basic'
  | 'advanced'
  | 'command'
  | 'hook'
  | 'custom';

export type PluginTemplateConfig = {
  type: PluginTemplateType;
  description?: string;
  author?: string;
  version?: string;
  hooks?: string[];
  commands?: PluginCommand[];
  permissions?: string[];
  dependencies?: Record<string, string>;
  includeExamples?: boolean;
  includeTests?: boolean;
};

// Additional hook types for better type safety
export type PluginHookHandler = (context: PluginContext) => Promise<any>;
export type PluginHookRegistry = Map<PluginHookType, PluginHookHandler[]>;

// Plugin lifecycle events
export type PluginLifecycleEvent =
  | 'beforeInstall'
  | 'afterInstall'
  | 'beforeLoad'
  | 'afterLoad'
  | 'beforeUnload'
  | 'afterUnload'
  | 'beforeUninstall'
  | 'afterUninstall';

/**
 * Plugin Service Interface
 * Defines the contract for plugin management and lifecycle operations
 */
export interface IPluginService {
  /**
   * Initialize plugin service and load installed plugins
   */
  initialize(): Promise<void>;

  /**
   * Install a plugin from various sources
   */
  installPlugin(
    source: string,
    options?: PluginInstallOptions
  ): Promise<{
    success: boolean;
    plugin?: PluginManifest;
    error?: string;
  }>;

  /**
   * Uninstall a plugin
   */
  uninstallPlugin(
    pluginName: string,
    options?: PluginUninstallOptions
  ): Promise<void>;

  /**
   * Load a plugin into the runtime
   */
  loadPlugin(pluginName: string): Promise<PluginLoadResult>;

  /**
   * Unload a plugin from the runtime
   */
  unloadPlugin(pluginName: string): Promise<PluginUnloadResult>;

  /**
   * Enable a plugin
   */
  enablePlugin(pluginName: string): Promise<void>;

  /**
   * Disable a plugin
   */
  disablePlugin(pluginName: string): Promise<void>;

  /**
   * List all installed plugins
   */
  listPlugins(filters?: PluginListFilters): Promise<PluginInfo[]>;

  /**
   * Get information about a specific plugin
   */
  getPluginInfo(name: string): Promise<PluginInfo | null>;

  /**
   * Execute a specific plugin hook
   */
  executeHook(
    hookName: string,
    context: PluginContext
  ): Promise<Record<string, unknown>>;

  /**
   * Register a hook handler
   */
  registerHook(
    hookType: PluginHookType,
    handler: (context: PluginContext) => Promise<any>
  ): void;

  /**
   * Get plugin system statistics
   */
  getPluginStats(): Promise<PluginStats>;

  /**
   * Search for plugins
   */
  searchPlugins(
    query: string,
    options?: PluginSearchOptions
  ): Promise<PluginSearchResult[]>;

  /**
   * Discover available plugins
   */
  discoverPlugins(): Promise<PluginDiscoveryResult[]>;

  /**
   * Create a new plugin template
   */
  createPluginTemplate(
    name: string,
    template: string,
    targetDirectory: string
  ): Promise<void>;
}
