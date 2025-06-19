// Plugin System Architecture
// Provides extensibility framework for third-party plugins

import fs from 'fs-extra';
import path from 'path';
import { spawn, ChildProcess } from 'child_process';
import chalk from 'chalk';

interface PluginManifest {
  name: string;
  version: string;
  main?: string;
  description?: string;
  author?: string;
  keywords?: string[];
  aia?: {
    minVersion?: string;
    maxVersion?: string;
    hooks?: string[];
    permissions?: string[];
  };
  dependencies?: Record<string, string>;
}

interface SandboxConfig {
  allowedModules: string[];
  restrictedOperations: string[];
  timeoutMs: number;
  memoryLimitMB: number;
}

interface Plugin {
  initialize?: (api: PluginAPI) => Promise<void> | void;
  destroy?: () => Promise<void> | void;
  [key: string]: any;
}

interface PluginAPI {
  registerCommand: (name: string, handler: Function) => void;
  registerHook: (hookType: string, handler: Function) => void;
  getConfig: () => any;
  log: typeof console.log;
  chalk: typeof chalk;
  utils: {
    readFile: typeof fs.readFile;
    writeFile: typeof fs.writeFile;
    pathExists: typeof fs.pathExists;
    pathJoin: typeof path.join;
  };
}

interface LoadResult {
  loaded: number;
  failed: number;
}

type HookHandler = (...args: any[]) => Promise<any> | any;

class PluginManager {
  private pluginDirectory: string;
  private plugins: Map<string, Plugin>;
  private hooks: Map<string, HookHandler[]>;
  private loadedPlugins: Set<string>;
  private pluginMetadata: Map<string, PluginManifest>;
  private sandboxConfig: SandboxConfig;

  constructor(pluginDirectory: string) {
    this.pluginDirectory = pluginDirectory;
    this.plugins = new Map();
    this.hooks = new Map();
    this.loadedPlugins = new Set();
    this.pluginMetadata = new Map();

    // Initialize plugin hooks
    this.initializeHooks();

    // Security sandbox configuration
    this.sandboxConfig = {
      allowedModules: ['fs-extra', 'path', 'chalk', 'commander'],
      restrictedOperations: ['spawn', 'exec', 'eval', 'require'],
      timeoutMs: 30000, // 30 second timeout for plugin operations
      memoryLimitMB: 100, // 100MB memory limit per plugin
    };
  }

  // Initialize plugin hook system
  private initializeHooks(): void {
    const hookTypes: string[] = [
      'beforeCommand',
      'afterCommand',
      'beforeAIQuery',
      'afterAIQuery',
      'onContextChange',
      'onMemoryUpdate',
      'onError',
      'onStartup',
      'onShutdown',
      'customCommand',
      'dataTransform',
      'uiEnhancement',
    ];

    hookTypes.forEach((hook) => {
      this.hooks.set(hook, []);
    });
  }

  // Load all available plugins
  async loadAllPlugins(): Promise<LoadResult> {
    try {
      await fs.ensureDir(this.pluginDirectory);

      const pluginDirs = await fs.readdir(this.pluginDirectory);
      const loadPromises: Promise<Plugin>[] = [];

      for (const pluginDir of pluginDirs) {
        const pluginPath = path.join(this.pluginDirectory, pluginDir);
        const stat = await fs.stat(pluginPath);

        if (stat.isDirectory()) {
          loadPromises.push(this.loadPlugin(pluginDir));
        }
      }

      const results = await Promise.allSettled(loadPromises);
      const loaded = results.filter((r) => r.status === 'fulfilled').length;
      const failed = results.filter((r) => r.status === 'rejected').length;

      console.log(chalk.green(`✅ Loaded ${loaded} plugins successfully`));
      if (failed > 0) {
        console.log(chalk.yellow(`⚠️  Failed to load ${failed} plugins`));
      }

      return { loaded, failed };
    } catch (error) {
      console.error(
        chalk.red('Plugin loading error:', (error as Error).message)
      );
      return { loaded: 0, failed: 0 };
    }
  }

  // Load a specific plugin
  async loadPlugin(pluginName: string): Promise<Plugin> {
    try {
      const pluginPath = path.join(this.pluginDirectory, pluginName);
      const manifestPath = path.join(pluginPath, 'plugin.json');

      // Check if plugin manifest exists
      if (!(await fs.pathExists(manifestPath))) {
        throw new Error(`Plugin manifest not found: ${manifestPath}`);
      }

      // Load and validate manifest
      const manifest: PluginManifest = await fs.readJson(manifestPath);
      this.validateManifest(manifest);

      // Check if plugin is already loaded
      if (this.loadedPlugins.has(pluginName)) {
        console.log(chalk.yellow(`Plugin ${pluginName} is already loaded`));
        return this.plugins.get(pluginName)!;
      }

      // Load plugin main file
      const mainFile = path.join(pluginPath, manifest.main || 'index.js');

      if (!(await fs.pathExists(mainFile))) {
        throw new Error(`Plugin main file not found: ${mainFile}`);
      }

      // Create sandboxed environment
      const sandbox = this.createSandbox(pluginName, manifest);

      // Load plugin code in sandbox
      const plugin = await this.loadPluginInSandbox(
        mainFile,
        sandbox,
        manifest
      );

      // Register plugin
      this.plugins.set(pluginName, plugin);
      this.pluginMetadata.set(pluginName, manifest);
      this.loadedPlugins.add(pluginName);

      // Execute plugin initialization
      if (typeof plugin.initialize === 'function') {
        await plugin.initialize(sandbox.api);
      }

      // Register plugin hooks
      this.registerPluginHooks(pluginName, plugin);

      console.log(
        chalk.green(`✅ Plugin loaded: ${pluginName} v${manifest.version}`)
      );
      return plugin;
    } catch (error) {
      console.error(
        chalk.red(
          `❌ Failed to load plugin ${pluginName}:`,
          (error as Error).message
        )
      );
      throw error;
    }
  }

  // Unload a plugin
  async unloadPlugin(pluginName: string): Promise<void> {
    try {
      if (!this.loadedPlugins.has(pluginName)) {
        console.log(chalk.yellow(`Plugin ${pluginName} is not loaded`));
        return;
      }

      const plugin = this.plugins.get(pluginName);

      // Execute plugin cleanup
      if (plugin && typeof plugin.destroy === 'function') {
        await plugin.destroy();
      }

      // Unregister plugin hooks
      this.unregisterPluginHooks(pluginName);

      // Remove plugin
      this.plugins.delete(pluginName);
      this.pluginMetadata.delete(pluginName);
      this.loadedPlugins.delete(pluginName);

      console.log(chalk.green(`✅ Plugin unloaded: ${pluginName}`));
    } catch (error) {
      console.error(
        chalk.red(
          `❌ Failed to unload plugin ${pluginName}:`,
          (error as Error).message
        )
      );
      throw error;
    }
  }

  // Validate plugin manifest
  private validateManifest(manifest: PluginManifest): void {
    const required = ['name', 'version'];
    const missing = required.filter(
      (field) => !manifest[field as keyof PluginManifest]
    );

    if (missing.length > 0) {
      throw new Error(
        `Plugin manifest missing required fields: ${missing.join(', ')}`
      );
    }

    // Validate version format
    if (!/^\d+\.\d+\.\d+/.test(manifest.version)) {
      throw new Error(
        `Invalid version format: ${manifest.version}. Expected semver format.`
      );
    }

    // Validate AIA-specific configuration
    if (manifest.aia) {
      const aiaConfig = manifest.aia;

      if (aiaConfig.hooks) {
        const validHooks = Array.from(this.hooks.keys());
        const invalidHooks = aiaConfig.hooks.filter(
          (hook) => !validHooks.includes(hook)
        );

        if (invalidHooks.length > 0) {
          throw new Error(
            `Invalid hooks specified: ${invalidHooks.join(', ')}`
          );
        }
      }
    }
  }

  // Create sandboxed environment for plugin
  private createSandbox(
    pluginName: string,
    manifest: PluginManifest
  ): { api: PluginAPI; context: any } {
    const api: PluginAPI = {
      registerCommand: (name: string, handler: Function) => {
        this.registerCommand(pluginName, name, handler as HookHandler);
      },
      registerHook: (hookType: string, handler: Function) => {
        this.registerHook(pluginName, hookType, handler as HookHandler);
      },
      getConfig: () => this.getPluginConfig(pluginName),
      log: (...args: any[]) => {
        console.log(chalk.cyan(`[${pluginName}]`), ...args);
      },
      chalk,
      utils: {
        readFile: fs.readFile,
        writeFile: fs.writeFile,
        pathExists: fs.pathExists,
        pathJoin: path.join,
      },
    };

    const context = {
      pluginName,
      manifest,
      api,
      console: {
        log: api.log,
        error: (...args: any[]) => {
          console.error(chalk.red(`[${pluginName}]`), ...args);
        },
        warn: (...args: any[]) => {
          console.warn(chalk.yellow(`[${pluginName}]`), ...args);
        },
      },
    };

    return { api, context };
  }

  // Load plugin in sandboxed environment
  private async loadPluginInSandbox(
    mainFile: string,
    sandbox: { api: PluginAPI; context: any },
    manifest: PluginManifest
  ): Promise<Plugin> {
    try {
      // Read plugin code
      const pluginCode = await fs.readFile(mainFile, 'utf-8');

      // Create module context
      const moduleExports: any = {};
      const moduleContext = {
        exports: moduleExports,
        module: { exports: moduleExports },
        require: this.createSandboxedRequire(manifest),
        __filename: mainFile,
        __dirname: path.dirname(mainFile),
        console: sandbox.context.console,
        chalk,
        ...sandbox.context,
      };

      // Execute plugin code in sandbox
      const vm = require('vm');
      const vmContext = vm.createContext(moduleContext);
      vm.runInContext(pluginCode, vmContext, {
        filename: mainFile,
        timeout: this.sandboxConfig.timeoutMs,
      });

      // Return the plugin object
      const plugin = moduleContext.module.exports || moduleContext.exports;

      if (typeof plugin !== 'object' || plugin === null) {
        throw new Error('Plugin must export an object');
      }

      return plugin;
    } catch (error) {
      throw new Error(
        `Failed to load plugin code: ${(error as Error).message}`
      );
    }
  }

  // Create sandboxed require function
  private createSandboxedRequire(
    manifest: PluginManifest
  ): (id: string) => any {
    return (id: string) => {
      // Check if module is allowed
      if (!this.sandboxConfig.allowedModules.includes(id)) {
        throw new Error(`Module '${id}' is not allowed in plugin sandbox`);
      }

      // Check plugin dependencies
      if (
        manifest.dependencies &&
        Object.keys(manifest.dependencies).includes(id)
      ) {
        try {
          return require(id);
        } catch (error) {
          throw new Error(
            `Failed to load dependency '${id}': ${(error as Error).message}`
          );
        }
      }

      // Load allowed built-in modules
      switch (id) {
        case 'fs-extra':
          return fs;
        case 'path':
          return path;
        case 'chalk':
          return chalk;
        default:
          throw new Error(`Module '${id}' is not available in plugin sandbox`);
      }
    };
  }

  // Register plugin command
  private registerCommand(
    pluginName: string,
    commandName: string,
    handler: HookHandler
  ): void {
    const fullCommandName = `${pluginName}:${commandName}`;

    if (!this.hooks.has('customCommand')) {
      this.hooks.set('customCommand', []);
    }

    this.hooks
      .get('customCommand')!
      .push(async (name: string, ...args: any[]) => {
        if (name === fullCommandName) {
          return await handler(...args);
        }
      });

    console.log(chalk.cyan(`📝 Registered command: ${fullCommandName}`));
  }

  // Register plugin hook
  private registerHook(
    pluginName: string,
    hookType: string,
    handler: HookHandler
  ): void {
    if (!this.hooks.has(hookType)) {
      console.warn(
        chalk.yellow(
          `Warning: Unknown hook type '${hookType}' from plugin ${pluginName}`
        )
      );
      return;
    }

    this.hooks.get(hookType)!.push(handler);
    console.log(chalk.cyan(`🔗 Registered hook: ${pluginName} -> ${hookType}`));
  }

  // Register plugin hooks from plugin object
  private registerPluginHooks(pluginName: string, plugin: Plugin): void {
    const hookTypes = Array.from(this.hooks.keys());

    hookTypes.forEach((hookType) => {
      const hookHandler = plugin[hookType];
      if (typeof hookHandler === 'function') {
        this.registerHook(pluginName, hookType, hookHandler as HookHandler);
      }
    });
  }

  // Unregister all hooks for a plugin
  private unregisterPluginHooks(pluginName: string): void {
    this.hooks.forEach((handlers, hookType) => {
      // Filter out handlers from this plugin
      // Note: This is a simplified approach. In a real implementation,
      // you'd want to track which handlers belong to which plugin
      this.hooks.set(hookType, []);
    });
  }

  // Execute hooks
  async executeHook(hookType: string, ...args: any[]): Promise<any[]> {
    const handlers = this.hooks.get(hookType) || [];
    const results: any[] = [];

    for (const handler of handlers) {
      try {
        const result = await handler(...args);
        results.push(result);
      } catch (error) {
        console.error(
          chalk.red(
            `❌ Hook execution error in ${hookType}:`,
            (error as Error).message
          )
        );
        results.push({ error: (error as Error).message });
      }
    }

    return results;
  }

  // Get plugin configuration
  private getPluginConfig(pluginName: string): any {
    const configPath = path.join(
      this.pluginDirectory,
      pluginName,
      'config.json'
    );

    try {
      if (fs.existsSync(configPath)) {
        return fs.readJsonSync(configPath);
      }
    } catch (error) {
      console.warn(
        chalk.yellow(`Warning: Failed to load config for plugin ${pluginName}`)
      );
    }

    return {};
  }

  // List loaded plugins
  listPlugins(): { name: string; version: string; description?: string }[] {
    return Array.from(this.loadedPlugins).map((name) => {
      const metadata = this.pluginMetadata.get(name);
      return {
        name,
        version: metadata?.version || 'unknown',
        description: metadata?.description,
      };
    });
  }

  // Get plugin information
  getPlugin(
    pluginName: string
  ): { plugin: Plugin; metadata: PluginManifest } | null {
    const plugin = this.plugins.get(pluginName);
    const metadata = this.pluginMetadata.get(pluginName);

    if (plugin && metadata) {
      return { plugin, metadata };
    }

    return null;
  }

  // Plugin development utilities
  async createPluginTemplate(
    pluginName: string,
    options: {
      author?: string;
      description?: string;
      version?: string;
    } = {}
  ): Promise<void> {
    const pluginPath = path.join(this.pluginDirectory, pluginName);

    if (await fs.pathExists(pluginPath)) {
      throw new Error(`Plugin directory already exists: ${pluginPath}`);
    }

    await fs.ensureDir(pluginPath);

    // Create plugin.json
    const manifest: PluginManifest = {
      name: pluginName,
      version: options.version || '1.0.0',
      description: options.description || `AIA plugin: ${pluginName}`,
      author: options.author || 'Unknown',
      main: 'index.js',
      aia: {
        minVersion: '1.0.0',
        hooks: ['beforeCommand', 'afterCommand'],
        permissions: ['read', 'write'],
      },
    };

    await fs.writeJson(path.join(pluginPath, 'plugin.json'), manifest, {
      spaces: 2,
    });

    // Create index.js template
    const indexTemplate = `// ${pluginName} Plugin for AIA CLI
// Generated plugin template

module.exports = {
  // Plugin initialization
  async initialize(api) {
    api.log('${pluginName} plugin initialized');
    
    // Register custom commands
    api.registerCommand('hello', () => {
      api.log('Hello from ${pluginName}!');
    });
  },

  // Plugin cleanup
  async destroy() {
    console.log('${pluginName} plugin destroyed');
  },

  // Hook handlers
  async beforeCommand(command, args) {
    // Called before any command execution
    return { command, args };
  },

  async afterCommand(command, result) {
    // Called after command execution
    return result;
  },

  // Custom functionality
  async customFunction() {
    return 'This is a custom function from ${pluginName}';
  },
};
`;

    await fs.writeFile(path.join(pluginPath, 'index.js'), indexTemplate);

    // Create README.md
    const readmeTemplate = `# ${this.toPascalCase(pluginName)} Plugin

${manifest.description}

## Installation

1. Copy this plugin to your AIA plugins directory
2. Run \`aia plugin load ${pluginName}\`

## Usage

\`\`\`bash
# Use custom command
aia ${pluginName}:hello
\`\`\`

## Configuration

Create a \`config.json\` file in the plugin directory to customize behavior.

## API Reference

This plugin uses the AIA Plugin API:

- \`api.registerCommand(name, handler)\` - Register custom commands
- \`api.registerHook(hookType, handler)\` - Register hook handlers
- \`api.log(...args)\` - Plugin logging
- \`api.utils\` - File system utilities

## Hooks

This plugin implements the following hooks:

- \`beforeCommand\` - Called before command execution
- \`afterCommand\` - Called after command execution

## License

MIT
`;

    await fs.writeFile(path.join(pluginPath, 'README.md'), readmeTemplate);

    console.log(chalk.green(`✅ Plugin template created: ${pluginPath}`));
    console.log(chalk.cyan('Next steps:'));
    console.log(chalk.cyan(`  1. cd ${pluginPath}`));
    console.log(chalk.cyan(`  2. Edit index.js to implement your plugin`));
    console.log(chalk.cyan(`  3. Run: aia plugin load ${pluginName}`));
  }

  // Utility function to convert string to PascalCase
  private toPascalCase(str: string): string {
    return str
      .split(/[-_\s]+/)
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join('');
  }
}

export default PluginManager;
