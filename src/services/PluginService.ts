/**
 * Plugin Service Implementation
 * Manages plugin installation, loading, and execution
 */
import * as fs from 'fs-extra';
import * as path from 'path';

import {
  IPluginService,
  PluginInfo,
  PluginHookType,
  PluginContext,
  PluginManifest,
  PluginInstallOptions,
  PluginUninstallOptions,
  PluginLoadResult,
  PluginUnloadResult,
  PluginStats,
  PluginSearchResult,
  PluginDiscoveryResult,
  PluginListFilters,
  PluginSearchOptions,
} from '../interfaces/IPluginService';

import { IConfigurationService } from '../interfaces/IConfigurationService';
import { ICommandService } from '../interfaces/ICommandService';
import { IMemoryService } from '../interfaces/IMemoryService';

export class PluginService implements IPluginService {
  private configService: IConfigurationService;
  private commandService: ICommandService;
  private memoryService: IMemoryService;
  private plugins: Map<string, PluginInfo>;
  private hooks: Map<
    PluginHookType,
    ((context: PluginContext) => Promise<any>)[]
  >;
  private initialized: boolean;
  private pluginDirectory: string;

  constructor(
    configService: IConfigurationService,
    commandService: ICommandService,
    memoryService: IMemoryService
  ) {
    this.configService = configService;
    this.commandService = commandService;
    this.memoryService = memoryService;
    this.plugins = new Map();
    this.hooks = new Map();
    this.initialized = false;
    this.pluginDirectory = '';
  }

  /**
   * Initialize plugin service
   */
  async initialize(): Promise<void> {
    try {
      const config = await this.configService.getConfiguration();
      const homeDir = process.env.HOME || process.env.USERPROFILE || '';
      this.pluginDirectory = path.join(homeDir, '.aia', 'plugins');

      // Ensure plugin directory exists
      await fs.ensureDir(this.pluginDirectory);
      await this.loadInstalledPlugins();

      this.initialized = true;
    } catch (error) {
      console.error('Failed to initialize plugin service:', error);
      throw error;
    }
  }

  /**
   * Install a plugin from various sources
   */
  async installPlugin(
    source: string,
    options?: PluginInstallOptions
  ): Promise<{ success: boolean; plugin?: PluginManifest; error?: string }> {
    try {
      if (!this.initialized) {
        await this.initialize();
      }

      let manifest: PluginManifest;
      if (source.startsWith('http://') || source.startsWith('https://')) {
        manifest = await this.installFromUrl(source, options);
      } else if (source.includes('/') && !path.isAbsolute(source)) {
        manifest = await this.installFromGit(source, options);
      } else if (
        path.isAbsolute(source) ||
        source.startsWith('./') ||
        source.startsWith('../')
      ) {
        manifest = await this.installFromLocal(source, options);
      } else {
        manifest = await this.installFromNpm(source, options);
      }

      return {
        success: true,
        plugin: manifest,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Uninstall a plugin
   */
  async uninstallPlugin(
    pluginName: string,
    options?: PluginUninstallOptions
  ): Promise<void> {
    try {
      if (!this.plugins.has(pluginName)) {
        throw new Error(`Plugin '${pluginName}' not found`);
      }

      const pluginPath = path.join(this.pluginDirectory, pluginName);
      await fs.remove(pluginPath);

      this.plugins.delete(pluginName);
      console.log(`Plugin '${pluginName}' uninstalled successfully`);
    } catch (error) {
      throw error;
    }
  }

  /**
   * Load a plugin
   */
  async loadPlugin(pluginName: string): Promise<PluginLoadResult> {
    try {
      const pluginPath = path.join(this.pluginDirectory, pluginName);
      const manifestPath = path.join(pluginPath, 'plugin.json');

      // Enhanced error handling and logging
      if (!(await fs.pathExists(manifestPath))) {
        console.warn(`Plugin manifest not found for '${pluginName}'`);
        return {
          success: false,
          error: `Plugin manifest not found for '${pluginName}'`,
        };
      }

      const manifest: PluginManifest = await fs.readJson(manifestPath);

      // Added manifest validation
      try {
        await this.validatePluginManifest(manifest);
      } catch (validationError) {
        console.error(
          `Plugin manifest validation failed for '${pluginName}':`,
          validationError
        );
        return {
          success: false,
          error: `Invalid plugin manifest: ${
            validationError instanceof Error
              ? validationError.message
              : 'Unknown validation error'
          }`,
        };
      }

      const pluginMainPath = path.join(pluginPath, manifest.main || 'index.js');

      if (!(await fs.pathExists(pluginMainPath))) {
        console.warn(`Plugin main file not found for '${pluginName}'`);
        return {
          success: false,
          error: `Plugin main file not found for '${pluginName}'`,
        };
      }

      // Load plugin module with advanced error handling
      try {
        delete require.cache[require.resolve(pluginMainPath)];
        const pluginModule = require(pluginMainPath);

        // Optional: validate plugin module structure
        if (typeof pluginModule.initialize !== 'function') {
          // Silently skip plugins without initialize method
        }
      } catch (loadError) {
        console.error(
          `Failed to load plugin module '${pluginName}':`,
          loadError
        );
        return {
          success: false,
          error: `Failed to load plugin module: ${
            loadError instanceof Error
              ? loadError.message
              : 'Unknown load error'
          }`,
        };
      }

      const pluginInfo: PluginInfo = {
        name: manifest.name,
        version: manifest.version,
        description: manifest.description || '',
        author: manifest.author || 'Unknown',
        dependencies: manifest.dependencies || {},
        commands: manifest.commands || [],
        permissions: manifest.permissions || [],
        loaded: true,
        enabled: true,
        manifest: manifest,
      };

      this.plugins.set(pluginName, pluginInfo);

      return {
        success: true,
        plugin: pluginInfo,
      };
    } catch (error) {
      console.error(`Unexpected error loading plugin '${pluginName}':`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Unload a plugin
   */
  async unloadPlugin(pluginName: string): Promise<PluginUnloadResult> {
    try {
      const plugin = this.plugins.get(pluginName);
      if (!plugin) {
        return {
          success: false,
          error: `Plugin '${pluginName}' not found`,
        };
      }

      // Remove hooks associated with this plugin
      const hookEntries = Array.from(this.hooks.entries());
      for (const [hookType, handlers] of hookEntries) {
        this.hooks.set(
          hookType,
          handlers.filter((handler) => {
            // Note: This is a simplified method. In a real-world scenario,
            // you might need a more robust way to identify plugin-specific hooks
            return true;
          })
        );
      }

      this.plugins.delete(pluginName);

      return {
        success: true,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Enable a plugin
   */
  async enablePlugin(pluginName: string): Promise<void> {
    const plugin = this.plugins.get(pluginName);
    if (!plugin) {
      throw new Error(`Plugin '${pluginName}' not found`);
    }
    plugin.enabled = true;
  }

  /**
   * Disable a plugin
   */
  async disablePlugin(pluginName: string): Promise<void> {
    const plugin = this.plugins.get(pluginName);
    if (!plugin) {
      throw new Error(`Plugin '${pluginName}' not found`);
    }
    plugin.enabled = false;
  }

  /**
   * List all plugins
   */
  async listPlugins(filters?: PluginListFilters): Promise<PluginInfo[]> {
    const plugins = Array.from(this.plugins.values());

    if (!filters) return plugins;

    return plugins.filter((plugin) => {
      // Since 'enabledOnly' was causing a type error, we use enabled directly
      if (filters.enabled && !plugin.enabled) return false;
      if (filters.author && plugin.author !== filters.author) return false;
      return true;
    });
  }

  /**
   * Get plugin information
   */
  async getPluginInfo(name: string): Promise<PluginInfo | null> {
    return this.plugins.get(name) || null;
  }

  /**
   * Execute plugin hook
   */
  async executeHook(
    hookName: string,
    context: PluginContext
  ): Promise<Record<string, unknown>> {
    const handlers = this.hooks.get(hookName as PluginHookType) || [];
    const results: Record<string, unknown> = {};

    const handlersArray = Array.from(handlers.entries());
    for (const [index, handler] of handlersArray) {
      try {
        results[`hook_${index}`] = await handler(context);
      } catch (error) {
        results[`hook_${index}_error`] =
          error instanceof Error ? error.message : 'Unknown error';
      }
    }

    return results;
  }

  /**
   * Register a hook handler
   */
  registerHook(
    hookType: PluginHookType,
    handler: (context: PluginContext) => Promise<any>
  ): void {
    if (!this.hooks.has(hookType)) {
      this.hooks.set(hookType, []);
    }
    this.hooks.get(hookType)!.push(handler);
  }

  /**
   * Get plugin statistics
   */
  async getPluginStats(): Promise<PluginStats> {
    const plugins = Array.from(this.plugins.values());
    const totalHooks = Array.from(this.hooks.values()).reduce(
      (sum, handlers) => sum + handlers.length,
      0
    );
    const pluginsByAuthor = this.groupPluginsByAuthor(plugins);

    return {
      totalPlugins: plugins.length,
      enabledPlugins: plugins.filter((p) => p.enabled).length,
      loadedPlugins: plugins.filter((p) => p.loaded).length,
      totalHooks,
      pluginsByAuthor,
    };
  }

  /**
   * Search for plugins
   */
  async searchPlugins(
    query: string,
    options?: PluginSearchOptions
  ): Promise<PluginSearchResult[]> {
    const plugins = Array.from(this.plugins.values());
    const results: PluginSearchResult[] = plugins
      .map((plugin) => {
        const score = this.calculateSearchScore(plugin, query);
        return score > 0
          ? {
              plugin,
              score,
              matchedFields: this.getMatchedFields(plugin, query),
            }
          : null;
      })
      .filter((result): result is PluginSearchResult => result !== null)
      .sort((a, b) => b.score - a.score);

    return results;
  }

  /**
   * Discover plugins from various sources
   */
  async discoverPlugins(): Promise<PluginDiscoveryResult[]> {
    // This is a placeholder. In a real implementation, this would integrate
    // with plugin registries, npm, or other discovery mechanisms.
    return [];
  }

  /**
   * Create a new plugin from a template
   */
  async createPluginTemplate(
    name: string,
    template: string = 'default',
    targetDirectory: string
  ): Promise<void> {
    try {
      const pluginPath = path.join(targetDirectory, name);

      if (await fs.pathExists(pluginPath)) {
        throw new Error(`Plugin directory '${name}' already exists`);
      }

      await fs.ensureDir(pluginPath);

      // Enhanced plugin manifest with more flexible options
      const manifest: PluginManifest = {
        name,
        version: '1.0.0',
        description: `${name} plugin`,
        author: 'Unknown',
        main: 'index.js',
        commands: [],
        hooks: ['initialize', 'cleanup'],
        dependencies: {},
        permissions: [],
        aia: {
          version: '1.1.0', // Match current AIA version
        },
      };

      await fs.writeJson(path.join(pluginPath, 'plugin.json'), manifest, {
        spaces: 2,
      });

      const indexContent = this.generatePluginTemplate(name, template);
      await fs.writeFile(path.join(pluginPath, 'index.js'), indexContent);
    } catch (error) {
      console.error('Error creating plugin template:', error);
      throw error;
    }
  }

  // Private helper methods
  private async loadInstalledPlugins(): Promise<void> {
    try {
      const entries = await fs.readdir(this.pluginDirectory);

      for (const entry of entries) {
        const pluginPath = path.join(this.pluginDirectory, entry);
        const stat = await fs.stat(pluginPath);

        if (stat.isDirectory()) {
          const loadResult = await this.loadPlugin(entry);
          if (!loadResult.success) {
            console.warn(`Failed to load plugin '${entry}':`, loadResult.error);
          }
        }
      }
    } catch (error) {
      console.warn('Failed to load plugins:', error);
    }
  }

  private groupPluginsByAuthor(plugins: PluginInfo[]): Record<string, number> {
    const groups: Record<string, number> = {};

    for (const plugin of plugins) {
      const author = plugin.author || 'Unknown';
      groups[author] = (groups[author] || 0) + 1;
    }

    return groups;
  }

  private calculateSearchScore(plugin: PluginInfo, query: string): number {
    const lowerQuery = query.toLowerCase();
    let score = 0;

    if (plugin.name.toLowerCase().includes(lowerQuery)) score += 10;
    if (plugin.description.toLowerCase().includes(lowerQuery)) score += 5;
    if (plugin.author.toLowerCase().includes(lowerQuery)) score += 3;

    return score;
  }

  private getMatchedFields(plugin: PluginInfo, query: string): string[] {
    const lowerQuery = query.toLowerCase();
    const matchedFields: string[] = [];

    if (plugin.name.toLowerCase().includes(lowerQuery)) {
      matchedFields.push('name');
    }
    if (plugin.description.toLowerCase().includes(lowerQuery)) {
      matchedFields.push('description');
    }
    if (plugin.author.toLowerCase().includes(lowerQuery)) {
      matchedFields.push('author');
    }

    return matchedFields;
  }

  private generatePluginTemplate(
    name: string,
    template: string = 'default'
  ): string {
    switch (template) {
      case 'advanced':
        return `/**
 * ${name} Advanced Plugin
 * Demonstrates advanced plugin capabilities
 */
module.exports = {
  async initialize(context) {
    console.log('${name} plugin initializing');
    // Perform setup tasks, validate configuration, etc.
    return {
      status: 'initialized',
      timestamp: new Date().toISOString()
    };
  },

  async beforeCommand(context) {
    console.log('Before command hook for ${name} plugin');
    // Intercepting and potentially modifying command execution
    return context;
  },

  async afterCommand(context) {
    console.log('After command hook for ${name} plugin');
    // Perform logging, analysis, or additional processing
    return context;
  },

  async cleanup(context) {
    console.log('${name} plugin cleaning up');
    // Perform cleanup tasks, release resources
    return {
      status: 'cleaned',
      timestamp: new Date().toISOString()
    };
  },

  getMetadata() {
    return {
      name: '${name}',
      version: '1.0.0',
      description: 'Advanced ${name} plugin with multiple hooks',
      capabilities: ['command-interception', 'logging']
    };
  }
};`;

      case 'basic':
      default:
        return `/**
 * ${name} Plugin
 */
module.exports = {
  async initialize(context) {
    console.log('${name} plugin initialized');
    return { success: true };
  },

  async cleanup(context) {
    console.log('${name} plugin cleaned up');
    return { success: true };
  },

  getMetadata() {
    return {
      name: '${name}',
      version: '1.0.0',
      description: '${name} plugin description'
    };
  }
};`;
    }
  }

  // Add robust plugin type checking and validation
  private async validatePluginManifest(
    manifest: PluginManifest
  ): Promise<void> {
    const requiredFields: (keyof PluginManifest)[] = [
      'name',
      'version',
      'description',
      'author',
      'main',
    ];

    for (const field of requiredFields) {
      if (!manifest[field]) {
        throw new Error(
          `Invalid plugin manifest: missing required field '${field}'`
        );
      }
    }

    // Additional validation rules
    if (manifest.version && !/^\d+\.\d+\.\d+/.test(manifest.version)) {
      throw new Error(
        'Invalid version format. Use semantic versioning (x.y.z)'
      );
    }

    // Optional but recommended field checks
    if (manifest.hooks && !Array.isArray(manifest.hooks)) {
      throw new Error('Hooks must be an array of strings');
    }

    if (manifest.commands && !Array.isArray(manifest.commands)) {
      throw new Error('Commands must be an array of PluginCommand');
    }

    if (manifest.dependencies && typeof manifest.dependencies !== 'object') {
      throw new Error('Dependencies must be a key-value record');
    }
  }

  // Plugin installation helper methods
  private async installFromUrl(
    url: string,
    options?: PluginInstallOptions
  ): Promise<PluginManifest> {
    try {
      // Create temporary directory for download
      const tempDir = path.join(
        require('os').tmpdir(),
        `aia-plugin-url-${Date.now()}`
      );
      await fs.ensureDir(tempDir);

      try {
        const https = require('https');
        const http = require('http');
        const { URL } = require('url');

        const parsedUrl = new URL(url);
        const client = parsedUrl.protocol === 'https:' ? https : http;

        // Determine file name from URL
        const fileName = path.basename(parsedUrl.pathname) || 'plugin.zip';
        const filePath = path.join(tempDir, fileName);

        // Download the file
        await new Promise<void>((resolve, reject) => {
          const file = fs.createWriteStream(filePath);

          client
            .get(url, (response: any) => {
              if (response.statusCode !== 200) {
                reject(
                  new Error(
                    `HTTP ${response.statusCode}: ${response.statusMessage}`
                  )
                );
                return;
              }

              response.pipe(file);

              file.on('finish', () => {
                file.close();
                resolve();
              });

              file.on('error', reject);
            })
            .on('error', reject);
        });

        let sourceDir = tempDir;

        // If it's a zip file, extract it
        if (fileName.endsWith('.zip')) {
          const extractDir = path.join(tempDir, 'extracted');
          await fs.ensureDir(extractDir);

          // Simple zip extraction (could be enhanced with a proper zip library)
          const { spawn } = require('child_process');
          await new Promise<void>((resolve, reject) => {
            const unzip = spawn('unzip', ['-q', filePath, '-d', extractDir]);

            unzip.on('close', (code: number | null) => {
              if (code === 0) {
                resolve();
              } else {
                reject(new Error(`Unzip failed with code ${code}`));
              }
            });

            unzip.on('error', reject);
          });

          // Find the extracted directory (assume single top-level directory)
          const extractedContents = await fs.readdir(extractDir);
          if (extractedContents.length === 1) {
            const extractedPath = path.join(extractDir, extractedContents[0]);
            const stat = await fs.stat(extractedPath);
            if (stat.isDirectory()) {
              sourceDir = extractedPath;
            }
          } else {
            sourceDir = extractDir;
          }
        }

        // Install from the source directory
        const manifest = await this.installFromLocal(sourceDir, options);

        // Cleanup temporary directory
        await fs.remove(tempDir);

        return manifest;
      } catch (error) {
        // Cleanup on error
        if (await fs.pathExists(tempDir)) {
          await fs.remove(tempDir);
        }
        throw error;
      }
    } catch (error) {
      throw new Error(
        `Failed to install plugin from URL: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`
      );
    }
  }

  private async installFromGit(
    gitSource: string,
    options?: PluginInstallOptions
  ): Promise<PluginManifest> {
    try {
      // Parse git source format: owner/repo[@branch]
      const [repoPath, branch = 'main'] = gitSource.split('@');
      const gitUrl = `https://github.com/${repoPath}.git`;

      // Create temporary directory for cloning
      const tempDir = path.join(
        require('os').tmpdir(),
        `aia-plugin-${Date.now()}`
      );

      try {
        // Clone the repository
        const { spawn } = require('child_process');
        await new Promise<void>((resolve, reject) => {
          const gitClone = spawn(
            'git',
            ['clone', '-b', branch, '--depth', '1', gitUrl, tempDir],
            {
              stdio: 'pipe',
            }
          );

          gitClone.on('close', (code: number | null) => {
            if (code === 0) {
              resolve();
            } else {
              reject(new Error(`Git clone failed with code ${code}`));
            }
          });

          gitClone.on('error', reject);
        });

        // Install from the cloned directory
        const manifest = await this.installFromLocal(tempDir, options);

        // Cleanup temporary directory
        await fs.remove(tempDir);

        return manifest;
      } catch (error) {
        // Cleanup on error
        if (await fs.pathExists(tempDir)) {
          await fs.remove(tempDir);
        }
        throw error;
      }
    } catch (error) {
      throw new Error(
        `Failed to install plugin from Git: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`
      );
    }
  }

  private async installFromLocal(
    localPath: string,
    options?: PluginInstallOptions
  ): Promise<PluginManifest> {
    try {
      const sourcePath = path.resolve(localPath);
      if (!(await fs.pathExists(sourcePath))) {
        throw new Error(`Plugin source path '${sourcePath}' does not exist`);
      }

      const manifestPath = path.join(sourcePath, 'plugin.json');
      if (!(await fs.pathExists(manifestPath))) {
        throw new Error(`Plugin manifest not found at '${manifestPath}'`);
      }

      const manifest: PluginManifest = await fs.readJson(manifestPath);
      await this.validatePluginManifest(manifest);

      // Copy plugin to plugins directory
      const targetPath = path.join(this.pluginDirectory, manifest.name);

      // Check if plugin already exists
      if (await fs.pathExists(targetPath)) {
        if (!options?.force) {
          throw new Error(
            `Plugin '${manifest.name}' already exists. Use --force to overwrite.`
          );
        }
        await fs.remove(targetPath);
      }

      await fs.copy(sourcePath, targetPath);

      // Load the plugin
      const loadResult = await this.loadPlugin(manifest.name);
      if (!loadResult.success) {
        throw new Error(
          `Failed to load plugin after installation: ${loadResult.error}`
        );
      }

      return manifest;
    } catch (error) {
      throw new Error(
        `Failed to install plugin from local path: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`
      );
    }
  }

  private async installFromNpm(
    packageName: string,
    options?: PluginInstallOptions
  ): Promise<PluginManifest> {
    try {
      // Create temporary directory for npm installation
      const tempDir = path.join(
        require('os').tmpdir(),
        `aia-plugin-npm-${Date.now()}`
      );
      await fs.ensureDir(tempDir);

      try {
        // Install npm package
        const { spawn } = require('child_process');
        await new Promise<void>((resolve, reject) => {
          const npmInstall = spawn(
            'npm',
            ['install', packageName, '--no-save'],
            {
              cwd: tempDir,
              stdio: 'pipe',
            }
          );

          npmInstall.on('close', (code: number | null) => {
            if (code === 0) {
              resolve();
            } else {
              reject(new Error(`NPM install failed with code ${code}`));
            }
          });

          npmInstall.on('error', reject);
        });

        // Find the installed package directory
        const nodeModulesPath = path.join(tempDir, 'node_modules', packageName);
        if (!(await fs.pathExists(nodeModulesPath))) {
          throw new Error(
            `Package '${packageName}' not found after installation`
          );
        }

        // Install from the npm package directory
        const manifest = await this.installFromLocal(nodeModulesPath, options);

        // Cleanup temporary directory
        await fs.remove(tempDir);

        return manifest;
      } catch (error) {
        // Cleanup on error
        if (await fs.pathExists(tempDir)) {
          await fs.remove(tempDir);
        }
        throw error;
      }
    } catch (error) {
      throw new Error(
        `Failed to install plugin from NPM: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`
      );
    }
  }
}
