// Plugin System Architecture
// Provides extensibility framework for third-party plugins

const fs = require('fs-extra');
const path = require('path');
const { spawn } = require('child_process');
const chalk = require('chalk');

class PluginManager {
  constructor(pluginDirectory) {
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
  initializeHooks() {
    const hookTypes = [
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
  async loadAllPlugins() {
    try {
      await fs.ensureDir(this.pluginDirectory);

      const pluginDirs = await fs.readdir(this.pluginDirectory);
      const loadPromises = [];

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
      console.error(chalk.red('Plugin loading error:', error.message));
      return { loaded: 0, failed: 0 };
    }
  }

  // Load a specific plugin
  async loadPlugin(pluginName) {
    try {
      const pluginPath = path.join(this.pluginDirectory, pluginName);
      const manifestPath = path.join(pluginPath, 'plugin.json');

      // Check if plugin manifest exists
      if (!(await fs.pathExists(manifestPath))) {
        throw new Error(`Plugin manifest not found: ${manifestPath}`);
      }

      // Load and validate manifest
      const manifest = await fs.readJson(manifestPath);
      this.validateManifest(manifest);

      // Check if plugin is already loaded
      if (this.loadedPlugins.has(pluginName)) {
        console.log(chalk.yellow(`Plugin ${pluginName} is already loaded`));
        return;
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
        chalk.red(`❌ Failed to load plugin ${pluginName}:`, error.message)
      );
      throw error;
    }
  }

  // Unload a plugin
  async unloadPlugin(pluginName) {
    try {
      if (!this.loadedPlugins.has(pluginName)) {
        console.log(chalk.yellow(`Plugin ${pluginName} is not loaded`));
        return;
      }

      const plugin = this.plugins.get(pluginName);

      // Execute plugin cleanup
      if (typeof plugin.cleanup === 'function') {
        await plugin.cleanup();
      }

      // Unregister hooks
      this.unregisterPluginHooks(pluginName);

      // Remove from collections
      this.plugins.delete(pluginName);
      this.pluginMetadata.delete(pluginName);
      this.loadedPlugins.delete(pluginName);

      console.log(chalk.green(`✅ Plugin unloaded: ${pluginName}`));
    } catch (error) {
      console.error(
        chalk.red(`❌ Failed to unload plugin ${pluginName}:`, error.message)
      );
      throw error;
    }
  }

  // Execute hooks for a specific event
  async executeHooks(hookType, context = {}) {
    const hooks = this.hooks.get(hookType) || [];
    const results = [];

    for (const hook of hooks) {
      try {
        const result = await this.executeHookWithTimeout(hook, context);
        results.push({ plugin: hook.pluginName, result });
      } catch (error) {
        console.error(
          chalk.red(
            `Hook execution failed for ${hook.pluginName}:`,
            error.message
          )
        );
        results.push({ plugin: hook.pluginName, error: error.message });
      }
    }

    return results;
  }

  // Create sandboxed environment for plugin
  createSandbox(pluginName, manifest) {
    const sandbox = {
      pluginName,
      manifest,
      api: {
        registerCommand: (name, handler) =>
          this.registerCommand(pluginName, { name, handler }),
        log: (message, level) => this.log(message, level),
        getConfig: () => manifest.config || {},
        setConfig: (config) => {
          manifest.config = config;
          // In production, persist this to disk
        },
      },
      console: {
        log: (...args) => console.log(chalk.gray(`[${pluginName}]`), ...args),
        error: (...args) =>
          console.error(chalk.red(`[${pluginName}]`), ...args),
        warn: (...args) =>
          console.warn(chalk.yellow(`[${pluginName}]`), ...args),
      },
    };

    return sandbox;
  } // Load plugin in sandboxed environment
  async loadPluginInSandbox(mainFile, sandbox, manifest) {
    try {
      // Clear require cache for hot reloading
      delete require.cache[require.resolve(mainFile)];

      const PluginClass = require(mainFile);
      const plugin = new PluginClass();

      // Bind sandbox context
      plugin.sandbox = sandbox;

      return plugin;
    } catch (error) {
      throw new Error(`Failed to load plugin code: ${error.message}`);
    }
  }

  // Create safe require function for plugins
  createSafeRequire() {
    const allowedModules = this.sandboxConfig.allowedModules;

    return (moduleName) => {
      if (allowedModules.includes(moduleName)) {
        return require(moduleName);
      } else {
        // For now, allow all core Node.js modules and npm packages
        // In production, you'd want stricter controls
        try {
          return require(moduleName);
        } catch (error) {
          throw new Error(
            `Module '${moduleName}' is not available or not installed`
          );
        }
      }
    };
  }

  // Register plugin hooks
  registerPluginHooks(pluginName, plugin) {
    const manifest = this.pluginMetadata.get(pluginName);
    const hookTypes = manifest.hooks || [];

    for (const hookType of hookTypes) {
      if (this.hooks.has(hookType) && typeof plugin[hookType] === 'function') {
        this.hooks.get(hookType).push({
          pluginName,
          handler: plugin[hookType].bind(plugin),
        });
        console.log(
          chalk.gray(`🪝 Registered ${hookType} hook for ${pluginName}`)
        );
      }
    }
  }

  // Unregister plugin hooks
  unregisterPluginHooks(pluginName) {
    for (const [hookType, hooks] of this.hooks.entries()) {
      const filtered = hooks.filter((hook) => hook.pluginName !== pluginName);
      this.hooks.set(hookType, filtered);
    }
  }

  // Execute hook with timeout protection
  async executeHookWithTimeout(hook, context) {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(
          new Error(
            `Hook execution timeout (${this.sandboxConfig.timeoutMs}ms)`
          )
        );
      }, this.sandboxConfig.timeoutMs);

      try {
        const result = hook.handler(context);

        if (result && typeof result.then === 'function') {
          result
            .then((res) => {
              clearTimeout(timeout);
              resolve(res);
            })
            .catch((err) => {
              clearTimeout(timeout);
              reject(err);
            });
        } else {
          clearTimeout(timeout);
          resolve(result);
        }
      } catch (error) {
        clearTimeout(timeout);
        reject(error);
      }
    });
  }

  // Get list of all plugins
  getPluginList() {
    const plugins = [];

    for (const [name, metadata] of this.pluginMetadata) {
      const plugin = this.plugins.get(name);
      plugins.push({
        name,
        version: metadata.version,
        description: metadata.description,
        author: metadata.author,
        loaded: this.loadedPlugins.has(name),
        commands: metadata.commands || [],
        hooks: metadata.hooks || [],
        dependencies: metadata.dependencies || {},
        homepage: metadata.homepage,
      });
    }

    return plugins.sort((a, b) => a.name.localeCompare(b.name));
  }

  // Get detailed information about a specific plugin
  getPluginInfo(pluginName) {
    const metadata = this.pluginMetadata.get(pluginName);
    if (!metadata) {
      return null;
    }

    return {
      name: pluginName,
      version: metadata.version,
      description: metadata.description,
      author: metadata.author,
      loaded: this.loadedPlugins.has(pluginName),
      commands: metadata.commands || [],
      hooks: metadata.hooks || [],
      dependencies: metadata.dependencies || {},
      homepage: metadata.homepage,
      main: metadata.main,
      aia_version: metadata.aia_version,
      permissions: metadata.permissions || [],
    };
  }

  // Install plugin from various sources
  async installPlugin(source, name = null) {
    try {
      const installResult = { success: false, error: null, name: null };

      // Determine source type and install accordingly
      if (source.startsWith('http://') || source.startsWith('https://')) {
        return await this.installFromUrl(source, name);
      } else if (
        source.startsWith('git+') ||
        source.includes('github.com') ||
        source.includes('gitlab.com')
      ) {
        return await this.installFromGit(source, name);
      } else if (fs.existsSync(source)) {
        return await this.installFromLocalPath(source, name);
      } else {
        // Try to install from npm registry or plugin registry
        return await this.installFromRegistry(source, name);
      }
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // Install from Git repository
  async installFromGit(gitUrl, name = null) {
    try {
      const tempDir = path.join(
        this.pluginDirectory,
        '.temp',
        Date.now().toString()
      );
      await fs.ensureDir(tempDir);

      // Clone repository
      await this.execCommand(`git clone ${gitUrl} ${tempDir}`);

      // Load manifest to get plugin name
      const manifestPath = path.join(tempDir, 'plugin.json');
      if (!(await fs.pathExists(manifestPath))) {
        throw new Error(
          'Plugin manifest (plugin.json) not found in repository'
        );
      }

      const manifest = await fs.readJson(manifestPath);
      const pluginName = name || manifest.name;

      if (!pluginName) {
        throw new Error('Plugin name not specified and not found in manifest');
      }

      // Check if plugin already exists
      const pluginPath = path.join(this.pluginDirectory, pluginName);
      if (await fs.pathExists(pluginPath)) {
        throw new Error(`Plugin ${pluginName} already exists`);
      }

      // Move to plugin directory
      await fs.move(tempDir, pluginPath);

      // Install dependencies if package.json exists
      const packageJsonPath = path.join(pluginPath, 'package.json');
      if (await fs.pathExists(packageJsonPath)) {
        await this.execCommand('npm install', { cwd: pluginPath });
      }

      // Load the plugin
      await this.loadPlugin(pluginName);

      return {
        success: true,
        name: pluginName,
        version: manifest.version,
        description: manifest.description,
        commands: manifest.commands || [],
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // Install from local path
  async installFromLocalPath(sourcePath, name = null) {
    try {
      const manifestPath = path.join(sourcePath, 'plugin.json');
      if (!(await fs.pathExists(manifestPath))) {
        throw new Error('Plugin manifest (plugin.json) not found');
      }

      const manifest = await fs.readJson(manifestPath);
      const pluginName = name || manifest.name;

      if (!pluginName) {
        throw new Error('Plugin name not specified and not found in manifest');
      }

      const pluginPath = path.join(this.pluginDirectory, pluginName);
      if (await fs.pathExists(pluginPath)) {
        throw new Error(`Plugin ${pluginName} already exists`);
      }

      // Copy plugin files
      await fs.copy(sourcePath, pluginPath);

      // Install dependencies if package.json exists
      const packageJsonPath = path.join(pluginPath, 'package.json');
      if (await fs.pathExists(packageJsonPath)) {
        await this.execCommand('npm install', { cwd: pluginPath });
      }

      // Load the plugin
      await this.loadPlugin(pluginName);

      return {
        success: true,
        name: pluginName,
        version: manifest.version,
        description: manifest.description,
        commands: manifest.commands || [],
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // Install from URL (zip file)
  async installFromUrl(url, name = null) {
    try {
      const tempDir = path.join(
        this.pluginDirectory,
        '.temp',
        Date.now().toString()
      );
      await fs.ensureDir(tempDir);

      // Download file
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(
          `Failed to download from ${url}: ${response.statusText}`
        );
      }

      const buffer = await response.arrayBuffer();
      const tempFile = path.join(tempDir, 'plugin.zip');
      await fs.writeFile(tempFile, Buffer.from(buffer));

      // Extract zip file
      const extractDir = path.join(tempDir, 'extracted');
      await this.extractZip(tempFile, extractDir);

      // Find plugin.json in extracted files
      const manifestPath = await this.findPluginManifest(extractDir);
      if (!manifestPath) {
        throw new Error(
          'Plugin manifest (plugin.json) not found in downloaded archive'
        );
      }

      const manifest = await fs.readJson(manifestPath);
      const pluginName = name || manifest.name;

      if (!pluginName) {
        throw new Error('Plugin name not specified and not found in manifest');
      }

      // Check if plugin already exists
      const pluginPath = path.join(this.pluginDirectory, pluginName);
      if (await fs.pathExists(pluginPath)) {
        throw new Error(`Plugin ${pluginName} already exists`);
      }

      // Copy plugin files from manifest directory
      const pluginSourceDir = path.dirname(manifestPath);
      await fs.copy(pluginSourceDir, pluginPath);

      // Install dependencies if package.json exists
      const packageJsonPath = path.join(pluginPath, 'package.json');
      if (await fs.pathExists(packageJsonPath)) {
        await this.execCommand('npm install', { cwd: pluginPath });
      }

      // Clean up temp directory
      await fs.remove(tempDir);

      // Load the plugin
      await this.loadPlugin(pluginName);

      return {
        success: true,
        name: pluginName,
        version: manifest.version,
        description: manifest.description,
        commands: manifest.commands || [],
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // Install from registry (npm or plugin registry)
  async installFromRegistry(packageName, name = null) {
    try {
      // Try npm registry first
      if (await this.isNpmPackage(packageName)) {
        return await this.installFromNpm(packageName, name);
      }

      // Try AIA plugin registry (future feature)
      return await this.installFromAIARegistry(packageName, name);
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // Install from NPM package
  async installFromNpm(packageName, name = null) {
    try {
      const tempDir = path.join(
        this.pluginDirectory,
        '.temp',
        Date.now().toString()
      );
      await fs.ensureDir(tempDir);

      // Install npm package to temp directory
      console.log(chalk.blue(`📦 Installing npm package: ${packageName}`));
      await this.execCommand(`npm install ${packageName}`, { cwd: tempDir });

      // Find the installed package
      const nodeModulesPath = path.join(tempDir, 'node_modules', packageName);
      if (!(await fs.pathExists(nodeModulesPath))) {
        throw new Error(`Failed to install npm package: ${packageName}`);
      }

      // Look for plugin.json in the package
      const manifestPath = path.join(nodeModulesPath, 'plugin.json');
      if (!(await fs.pathExists(manifestPath))) {
        throw new Error(
          `Package ${packageName} is not a valid AIA plugin (missing plugin.json)`
        );
      }

      const manifest = await fs.readJson(manifestPath);
      const pluginName = name || manifest.name || packageName;

      // Check if plugin already exists
      const pluginPath = path.join(this.pluginDirectory, pluginName);
      if (await fs.pathExists(pluginPath)) {
        throw new Error(`Plugin ${pluginName} already exists`);
      }

      // Copy plugin files
      await fs.copy(nodeModulesPath, pluginPath);

      // Clean up temp directory
      await fs.remove(tempDir);

      // Load the plugin
      await this.loadPlugin(pluginName);

      return {
        success: true,
        name: pluginName,
        version: manifest.version,
        description: manifest.description,
        commands: manifest.commands || [],
        source: 'npm',
        package: packageName,
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // Install from AIA Plugin Registry (future feature)
  async installFromAIARegistry(pluginName, name = null) {
    try {
      // This will connect to AIA Plugin Registry in the future
      // For now, provide helpful error message
      throw new Error(
        `Plugin "${pluginName}" not found. Available sources:\n` +
          '  - Local path: aia plugin-install ./my-plugin\n' +
          '  - Git repository: aia plugin-install git+https://github.com/user/plugin.git\n' +
          '  - NPM package: aia plugin-install npm-package-name\n' +
          '  - Direct URL: aia plugin-install https://example.com/plugin.zip'
      );
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // Uninstall a plugin
  async uninstallPlugin(pluginName) {
    try {
      // First unload the plugin if it's loaded
      if (this.loadedPlugins.has(pluginName)) {
        await this.unloadPlugin(pluginName);
      }

      // Remove plugin directory
      const pluginPath = path.join(this.pluginDirectory, pluginName);
      if (await fs.pathExists(pluginPath)) {
        await fs.remove(pluginPath);
      }

      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // Register custom commands from plugins
  registerCommand(pluginName, commandDef) {
    // Store the command for later integration with Commander.js
    if (!this.pluginCommands) {
      this.pluginCommands = new Map();
    }

    this.pluginCommands.set(commandDef.name, {
      pluginName,
      handler: commandDef.handler,
      description:
        commandDef.description || `Command from ${pluginName} plugin`,
    });

    console.log(
      chalk.blue(
        `📝 Registered command '${commandDef.name}' from ${pluginName}`
      )
    );
  }

  // Plugin logging
  log(message, level = 'info') {
    const levels = {
      info: chalk.blue,
      warn: chalk.yellow,
      error: chalk.red,
      success: chalk.green,
    };

    const colorFn = levels[level] || chalk.white;
    console.log(colorFn(`🔌 ${message}`));
  }

  // Execute command with options
  async execCommand(command, options = {}) {
    return new Promise((resolve, reject) => {
      const child = spawn('sh', ['-c', command], {
        cwd: options.cwd || process.cwd(),
        stdio: 'pipe',
      });

      let stdout = '';
      let stderr = '';

      child.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      child.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      child.on('close', (code) => {
        if (code === 0) {
          resolve(stdout);
        } else {
          reject(new Error(`Command failed: ${stderr || stdout}`));
        }
      });

      child.on('error', (error) => {
        reject(error);
      });
    });
  }

  // Get plugin system statistics
  getPluginStats() {
    const total = this.pluginMetadata.size;
    const loaded = this.loadedPlugins.size;
    const failed = total - loaded;

    let totalHooks = 0;
    let totalCommands = 0;

    for (const metadata of this.pluginMetadata.values()) {
      totalHooks += (metadata.hooks || []).length;
      totalCommands += (metadata.commands || []).length;
    }

    return {
      total,
      loaded,
      failed,
      totalHooks,
      totalCommands,
      loadTime: this.loadTime || null,
      memoryUsage: this.getMemoryUsage(),
      hookExecutions: this.hookExecutions || 0,
    };
  }

  // Get memory usage (approximate)
  getMemoryUsage() {
    // This is a simplified memory usage calculation
    // In a production system, you'd want more accurate memory tracking
    try {
      const usage = process.memoryUsage();
      return usage.heapUsed;
    } catch (error) {
      return 0;
    }
  }

  // Hot reload a plugin
  async reloadPlugin(pluginName) {
    console.log(chalk.blue(`🔄 Reloading plugin: ${pluginName}`));

    try {
      await this.unloadPlugin(pluginName);
      await this.loadPlugin(pluginName);
      console.log(chalk.green(`✅ Plugin ${pluginName} reloaded successfully`));
    } catch (error) {
      console.error(
        chalk.red(`❌ Failed to reload plugin ${pluginName}:`, error.message)
      );
      throw error;
    }
  }

  // Validate plugin manifest
  validateManifest(manifest) {
    const requiredFields = ['name', 'version', 'description'];
    const errors = [];

    // Check required fields
    for (const field of requiredFields) {
      if (!manifest[field]) {
        errors.push(`Missing required field: ${field}`);
      }
    }

    // Validate version format (basic semver check)
    if (manifest.version && !/^\d+\.\d+\.\d+/.test(manifest.version)) {
      errors.push('Invalid version format (expected semver: x.y.z)');
    }

    // Validate name format
    if (manifest.name && !/^[a-z0-9-_]+$/.test(manifest.name)) {
      errors.push(
        'Invalid name format (use lowercase letters, numbers, hyphens, underscores)'
      );
    }

    // Validate hooks array
    if (manifest.hooks && !Array.isArray(manifest.hooks)) {
      errors.push('Hooks must be an array');
    }

    // Validate commands array
    if (manifest.commands && !Array.isArray(manifest.commands)) {
      errors.push('Commands must be an array');
    }

    // Validate permissions array
    if (manifest.permissions && !Array.isArray(manifest.permissions)) {
      errors.push('Permissions must be an array');
    }

    // Check AIA version compatibility
    if (manifest.aia_version) {
      // Basic version check - in production, you'd use semver library
      const aiaVersion = '1.0.0';
      if (
        manifest.aia_version.includes('^') ||
        manifest.aia_version.includes('~')
      ) {
        // Allow semver ranges for now
      } else if (manifest.aia_version !== aiaVersion) {
        console.warn(
          chalk.yellow(
            `Warning: Plugin requires AIA ${manifest.aia_version}, current version is ${aiaVersion}`
          )
        );
      }
    }

    if (errors.length > 0) {
      throw new Error(
        `Plugin manifest validation failed:\n${errors.join('\n')}`
      );
    }

    return true;
  }

  // Create a new plugin template
  async createPluginTemplate(name, options = {}) {
    const { directory = '.', template = 'basic' } = options;

    try {
      // Validate plugin name
      if (!/^[a-z0-9-]+$/.test(name)) {
        throw new Error(
          'Plugin name must contain only lowercase letters, numbers, and hyphens'
        );
      }

      const pluginPath = path.join(directory, name);

      // Check if directory already exists
      if (await fs.pathExists(pluginPath)) {
        throw new Error(`Directory ${pluginPath} already exists`);
      }

      // Create plugin directory
      await fs.ensureDir(pluginPath);

      // Create plugin files based on template
      if (template === 'basic') {
        await this.createBasicPluginTemplate(pluginPath, name);
      } else if (template === 'advanced') {
        await this.createAdvancedPluginTemplate(pluginPath, name);
      } else {
        throw new Error(`Unknown template type: ${template}`);
      }

      return {
        success: true,
        path: pluginPath,
        name,
        template,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  // Create basic plugin template
  async createBasicPluginTemplate(pluginPath, name) {
    // Create plugin.json
    const manifest = {
      name,
      version: '1.0.0',
      description: `A plugin for AIA - ${name}`,
      main: 'index.js',
      author: 'Your Name',
      license: 'MIT',
      keywords: ['aia', 'plugin'],
      commands: ['hello'],
      hooks: ['beforeCommand'],
    };

    await fs.writeJson(path.join(pluginPath, 'plugin.json'), manifest, {
      spaces: 2,
    });

    // Create index.js
    const pluginCode = `// ${name} - AIA Plugin
// Generated by AIA plugin template

const chalk = require('chalk');

class ${this.toPascalCase(name)} {
  constructor() {
    this.name = '${name}';
    this.version = '1.0.0';
    this.commands = ['hello'];
    this.hooks = ['beforeCommand'];
  }

  // Plugin initialization
  async initialize(api) {
    this.api = api;
    console.log(chalk.green(\`🔌 \${this.name} v\${this.version} initialized\`));

    // Register custom commands
    this.api.registerCommand('hello', this.helloCommand.bind(this));
  }

  // Plugin cleanup
  async cleanup() {
    console.log(chalk.yellow(\`👋 \${this.name} shutting down\`));
  }

  // Hook: Before command execution
  async beforeCommand(context) {
    // Add your before command logic here
    console.log(chalk.gray(\`[\${this.name}] Command: \${context.command}\`));
    return context;
  }

  // Custom command: hello
  async helloCommand(callContext) {
    const { args = [], options = {} } = callContext || {};
    const commandArgs = options.args || args.filter(arg => typeof arg === 'string');
    
    const message = commandArgs.length > 0 
      ? \`Hello, \${commandArgs.join(' ')}!\` 
      : \`Hello from \${this.name}!\`;

    console.log(chalk.green(\`🎉 \${message}\`));
    console.log(chalk.gray(\`   Plugin: \${this.name} v\${this.version}\`));

    return { success: true, message };
  }

  // Plugin configuration
  getConfig() {
    return {
      greeting: 'Hello from plugin!',
      showTimestamp: true,
    };
  }

  // Update plugin configuration
  updateConfig(newConfig) {
    this.config = { ...this.config, ...newConfig };
    console.log(chalk.blue(\`⚙️  \${this.name} configuration updated\`));
  }
}

// Export plugin class
module.exports = ${this.toPascalCase(name)};
`;

    await fs.writeFile(path.join(pluginPath, 'index.js'), pluginCode);

    // Create README.md
    const readme = `# ${name}

A plugin for AIA (AI Agentic Assistant).

## Description

${manifest.description}

## Commands

- \`aia hello\` - Say hello from the plugin

## Installation

\`\`\`bash
aia plugin-install ${pluginPath}
\`\`\`

## Development

1. Edit \`index.js\` to implement your plugin functionality
2. Update \`plugin.json\` with your plugin details
3. Test your plugin with \`aia plugin-install ${pluginPath}\`

## Plugin Structure

- \`plugin.json\` - Plugin manifest and metadata
- \`index.js\` - Main plugin implementation
- \`README.md\` - Plugin documentation

## API Reference

Your plugin has access to the AIA API through the \`api\` parameter in the \`initialize\` method:

- \`api.registerCommand(name, handler)\` - Register a custom command
- \`api.registerHook(type, handler)\` - Register a lifecycle hook

## License

${manifest.license}
`;

    await fs.writeFile(path.join(pluginPath, 'README.md'), readme);

    // Create package.json for npm dependencies
    const packageJson = {
      name: `aia-plugin-${name}`,
      version: '1.0.0',
      description: manifest.description,
      main: 'index.js',
      keywords: ['aia', 'plugin', 'cli'],
      author: manifest.author,
      license: manifest.license,
      peerDependencies: {
        chalk: '^4.1.2',
      },
    };

    await fs.writeJson(path.join(pluginPath, 'package.json'), packageJson, {
      spaces: 2,
    });
  }

  // Create advanced plugin template (future feature)
  async createAdvancedPluginTemplate(pluginPath, name) {
    // For now, use basic template
    // In the future, this would include more advanced features like:
    // - Configuration UI
    // - Database integration
    // - External API calls
    // - Complex command structures
    await this.createBasicPluginTemplate(pluginPath, name);
  }

  // Helper to convert kebab-case to PascalCase
  toPascalCase(str) {
    return str
      .split('-')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join('');
  }
}

module.exports = PluginManager;
