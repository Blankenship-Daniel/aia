// Enhanced Configuration Management
// Provides flexible, secure, and user-friendly configuration handling

const fs = require('fs-extra');
const path = require('path');
const os = require('os');
const chalk = require('chalk');
const inquirer = require('inquirer');

class ConfigurationManager {
  constructor(configDirOrFile, isFilePath = false) {
    if (isFilePath && configDirOrFile) {
      this.configFile = configDirOrFile;
      this.configDir = path.dirname(configDirOrFile);
    } else {
      this.configDir = configDirOrFile || path.join(os.homedir(), '.aia');
      this.configFile = path.join(this.configDir, 'config.json');
    }

    // Initialize additional config file paths
    this.profilesFile = path.join(this.configDir, 'profiles.json');
    this.userConfigFile = path.join(this.configDir, 'user.json');

    this.config = {};
    this.defaultConfig = {
      preferredModel: 'gpt-4',
      openaiApiKey: null,
      anthropicApiKey: null,
      autoExecuteAgentCommands: false,
      maxAgentIterations: 5,
      enableCommandOptimization: true,
      commandOptimizationMode: 'auto', // 'auto', 'manual', 'disabled'
      maxOutputLength: 2000, // For command optimization
      pluginSources: ['official-registry'], // Future use for plugin discovery
      enableEncryption: false, // Default to false for simplicity
      encryptionKey: null, // Store securely if used
      logLevel: 'info', // 'debug', 'info', 'warn', 'error'
      contextDepth: 5, // Number of past conversation turns to include in context
      theme: 'default', // For CLI theming
      autoClearMemoryOlderThan: 30, // Days, 0 to disable
      enablePluginSandboxing: true,
      enableWorkflowAutomation: true,
      agentTemperature: 0.7,
      agentMaxOutputTokens: 1500,
      // Default to not automatically updating config file during tests
      // This can be overridden by specific test needs if file persistence is tested
      saveDefaultsInTest: false,
      // Output directory settings for prompt generation
      outputDirectories: {
        prompts: './prompts',
        customInstructions: './custom-instructions',
        context: './context',
        architecture: './architecture',
        comprehensive: './comprehensive',
        minimal: './minimal',
        developer: './developer',
      },
    };
    this.securityValidator = null; // Will be set by AIA if available
  }

  async initialize(securityValidator = null) {
    this.securityValidator = securityValidator;
    await fs.ensureDir(this.configDir);
    await this.loadAllConfigs();
  }

  // Load all configuration files
  async loadAllConfigs() {
    await Promise.all([
      this.loadMainConfig(),
      this.loadProfiles(),
      this.loadUserConfig(),
    ]);
  }

  // Load main configuration
  async loadMainConfig() {
    try {
      const configData = await fs.readJson(this.configFile);
      // Deep merge configuration to handle nested objects like outputDirectories
      this.config = this.deepMerge(this.defaultConfig, configData);
    } catch (error) {
      console.error(
        `Error loading config file ${this.configFile}: ${error.message}. Using defaults.`
      );
      this.config = { ...this.defaultConfig };
    }

    // Decrypt API keys if security validator is available
    if (this.securityValidator) {
      if (this.config.openaiApiKey) {
        const decryptedOpenAIKey = this.securityValidator.decryptApiKey(
          this.config.openaiApiKey
        );
        console.log(`Decrypted OpenAI API Key: ${decryptedOpenAIKey}`); // Debug log
        this.config.openaiApiKey = decryptedOpenAIKey.trim();
      }
      if (this.config.anthropicApiKey) {
        const decryptedAnthropicKey = this.securityValidator.decryptApiKey(
          this.config.anthropicApiKey
        );
        console.log(`Decrypted Anthropic API Key: ${decryptedAnthropicKey}`); // Debug log
        this.config.anthropicApiKey = decryptedAnthropicKey.trim();
      }
    }

    this.validateConfigAndFillMissing();
  }

  // Validate configuration and fill missing values
  validateConfigAndFillMissing() {
    // Ensure all required configuration keys exist with defaults
    const defaults = this.getDefaultConfig();

    // Merge defaults with current config
    this.config = {
      ...defaults,
      ...this.config,
    };

    // Validate API keys format (basic validation)
    if (
      this.config.openaiApiKey &&
      !this.config.openaiApiKey.startsWith('sk-')
    ) {
      console.warn(chalk.yellow('⚠️  OpenAI API key format may be invalid'));
    }

    if (
      this.config.anthropicApiKey &&
      !this.config.anthropicApiKey.startsWith('sk-ant-')
    ) {
      console.warn(chalk.yellow('⚠️  Anthropic API key format may be invalid'));
    }
  }

  // Method to get the current config file path, useful for debugging or tests
  getActiveConfigFile() {
    return this.configFile;
  }

  // Load user profiles
  async loadProfiles() {
    try {
      if (await fs.pathExists(this.profilesFile)) {
        this.profiles = await fs.readJson(this.profilesFile);
      } else {
        this.profiles = { default: this.getDefaultProfile() };
        await this.saveProfiles();
      }
    } catch (error) {
      console.warn(
        chalk.yellow(`⚠️  Profiles loading failed: ${error.message}`)
      );
      this.profiles = { default: this.getDefaultProfile() };
    }
  }

  // Load user-specific configuration
  async loadUserConfig() {
    try {
      if (await fs.pathExists(this.userConfigFile)) {
        this.userConfig = await fs.readJson(this.userConfigFile);
      } else {
        this.userConfig = this.getDefaultUserConfig();
        await this.saveUserConfig();
      }
    } catch (error) {
      console.warn(
        chalk.yellow(`⚠️  User config loading failed: ${error.message}`)
      );
      this.userConfig = this.getDefaultUserConfig();
    }
  }

  // Interactive configuration setup
  async setupInteractiveConfig() {
    console.log(chalk.blue('🔧 AIA Configuration Setup'));
    console.log(chalk.gray('═'.repeat(50)));

    const answers = await inquirer.prompt([
      {
        type: 'list',
        name: 'setupType',
        message: 'What would you like to configure?',
        choices: [
          { name: 'Quick Setup (API Keys)', value: 'quick' },
          { name: 'Full Configuration', value: 'full' },
          { name: 'Profile Management', value: 'profiles' },
          { name: 'Advanced Settings', value: 'advanced' },
        ],
      },
    ]);

    switch (answers.setupType) {
      case 'quick':
        await this.quickSetup();
        break;
      case 'full':
        await this.fullSetup();
        break;
      case 'profiles':
        await this.profileManagement();
        break;
      case 'advanced':
        await this.advancedSetup();
        break;
    }
  }

  // Quick setup for API keys
  async quickSetup() {
    console.log(chalk.blue('\n⚡ Quick Setup - API Keys'));

    const apiConfig = await inquirer.prompt([
      {
        type: 'password',
        name: 'openaiApiKey',
        message: 'OpenAI API Key (optional):',
        mask: '*',
        default: this.config.openaiApiKey || '',
      },
      {
        type: 'password',
        name: 'anthropicApiKey',
        message: 'Anthropic API Key (optional):',
        mask: '*',
        default: this.config.anthropicApiKey || '',
      },
      {
        type: 'list',
        name: 'preferredModel',
        message: 'Preferred AI Model:',
        choices: [
          { name: 'GPT-4 (Most capable)', value: 'gpt-4' },
          { name: 'GPT-3.5 Turbo (Faster)', value: 'gpt-3.5-turbo' },
          {
            name: 'Claude-3.5 Sonnet (Good balance)',
            value: 'claude-3-5-sonnet-20241022',
          },
          {
            name: 'Claude-3 Haiku (Fastest)',
            value: 'claude-3-haiku-20240307',
          },
        ],
        default: this.config.preferredModel,
      },
    ]);

    // Encrypt API keys if security validator is available
    if (this.securityValidator) {
      if (apiConfig.openaiApiKey) {
        apiConfig.openaiApiKey = this.securityValidator.encryptApiKey(
          apiConfig.openaiApiKey.trim()
        );
      }
      if (apiConfig.anthropicApiKey) {
        apiConfig.anthropicApiKey = this.securityValidator.encryptApiKey(
          apiConfig.anthropicApiKey.trim()
        );
      }
    }

    Object.assign(this.config, apiConfig);
    await this.saveMainConfig();

    console.log(chalk.green('✅ Configuration saved successfully!'));
  }

  // Full configuration setup
  async fullSetup() {
    console.log(chalk.blue('\n🔧 Full Configuration Setup'));

    const fullConfig = await inquirer.prompt([
      {
        type: 'password',
        name: 'openaiApiKey',
        message: 'OpenAI API Key:',
        mask: '*',
      },
      {
        type: 'password',
        name: 'anthropicApiKey',
        message: 'Anthropic API Key:',
        mask: '*',
      },
      {
        type: 'list',
        name: 'preferredModel',
        message: 'Preferred AI Model:',
        choices: this.getAvailableModels(),
      },
      {
        type: 'confirm',
        name: 'autoExecute',
        message: 'Enable auto-execution of safe commands?',
        default: false,
      },
      {
        type: 'number',
        name: 'maxMemorySize',
        message: 'Maximum memory size (MB):',
        default: 50,
        validate: (value) => value > 0 && value <= 1000,
      },
      {
        type: 'list',
        name: 'logLevel',
        message: 'Logging level:',
        choices: ['error', 'warn', 'info', 'debug'],
        default: 'info',
      },
      {
        type: 'confirm',
        name: 'enableTelemetry',
        message: 'Enable anonymous usage telemetry?',
        default: false,
      },
    ]);

    // Process and save configuration
    await this.processFullConfig(fullConfig);
  }

  // Process and save full configuration
  async processFullConfig(fullConfig) {
    // Encrypt API keys if security validator is available
    if (this.securityValidator) {
      if (fullConfig.openaiApiKey) {
        fullConfig.openaiApiKey = this.securityValidator.encryptApiKey(
          fullConfig.openaiApiKey.trim()
        );
      }
      if (fullConfig.anthropicApiKey) {
        fullConfig.anthropicApiKey = this.securityValidator.encryptApiKey(
          fullConfig.anthropicApiKey.trim()
        );
      }
    }

    // Update the main configuration with all provided settings
    Object.assign(this.config, fullConfig);

    // Save the configuration
    await this.saveMainConfig();

    console.log(chalk.green('✅ Full configuration saved successfully!'));
  }

  // Profile management
  async profileManagement() {
    const action = await inquirer.prompt([
      {
        type: 'list',
        name: 'action',
        message: 'Profile Management:',
        choices: [
          { name: 'Switch Profile', value: 'switch' },
          { name: 'Create Profile', value: 'create' },
          { name: 'Delete Profile', value: 'delete' },
          { name: 'List Profiles', value: 'list' },
        ],
      },
    ]);

    switch (action.action) {
      case 'switch':
        await this.switchProfile();
        break;
      case 'create':
        await this.createProfile();
        break;
      case 'delete':
        await this.deleteProfile();
        break;
      case 'list':
        this.listProfiles();
        break;
    }
  }

  // Advanced configuration
  async advancedSetup() {
    console.log(chalk.blue('\n⚙️  Advanced Configuration'));

    const advancedConfig = await inquirer.prompt([
      {
        type: 'number',
        name: 'commandTimeout',
        message: 'Command execution timeout (seconds):',
        default: this.config.advanced?.commandTimeout || 300,
        validate: (value) => value > 0 && value <= 3600,
      },
      {
        type: 'number',
        name: 'maxRetries',
        message: 'Maximum API retries:',
        default: this.config.advanced?.maxRetries || 3,
        validate: (value) => value >= 0 && value <= 10,
      },
      {
        type: 'confirm',
        name: 'enablePlugins',
        message: 'Enable plugin system?',
        default: this.config.advanced?.enablePlugins !== false,
      },
      {
        type: 'confirm',
        name: 'enableWorkflows',
        message: 'Enable workflow automation?',
        default: this.config.advanced?.enableWorkflows !== false,
      },
      {
        type: 'input',
        name: 'customPromptTemplate',
        message: 'Custom prompt template (optional):',
        default: this.config.advanced?.customPromptTemplate || '',
      },
      {
        type: 'checkbox',
        name: 'enabledFeatures',
        message: 'Enable experimental features:',
        choices: [
          { name: 'Enhanced NLP Processing', value: 'nlp' },
          { name: 'Advanced Context Analysis', value: 'contextAnalysis' },
          { name: 'Semantic Search', value: 'semanticSearch' },
          { name: 'Auto-optimization', value: 'autoOptimization' },
        ],
        default: this.config.advanced?.enabledFeatures || [],
      },
      {
        type: 'confirm',
        name: 'configureOutputDirectories',
        message: 'Configure output directories for AI prompt files?',
        default: false,
      },
    ]);

    // Handle output directory configuration
    if (advancedConfig.configureOutputDirectories) {
      const outputDirQuestions = [
        {
          type: 'input',
          name: 'prompts',
          message: 'Directory for general prompt files:',
          default: this.config.outputDirectories?.prompts || './prompts',
        },
        {
          type: 'input',
          name: 'customInstructions',
          message: 'Directory for custom instruction files:',
          default:
            this.config.outputDirectories?.customInstructions ||
            './custom-instructions',
        },
        {
          type: 'input',
          name: 'context',
          message: 'Directory for context files:',
          default: this.config.outputDirectories?.context || './context',
        },
        {
          type: 'input',
          name: 'architecture',
          message: 'Directory for architecture analysis files:',
          default:
            this.config.outputDirectories?.architecture || './architecture',
        },
        {
          type: 'input',
          name: 'comprehensive',
          message: 'Directory for comprehensive analysis files:',
          default:
            this.config.outputDirectories?.comprehensive || './comprehensive',
        },
        {
          type: 'input',
          name: 'minimal',
          message: 'Directory for minimal context files:',
          default: this.config.outputDirectories?.minimal || './minimal',
        },
        {
          type: 'input',
          name: 'developer',
          message: 'Directory for developer reference files:',
          default: this.config.outputDirectories?.developer || './developer',
        },
      ];

      const outputDirectories = await inquirer.prompt(outputDirQuestions);
      this.config.outputDirectories = outputDirectories;
    }

    // Remove the configuration flag before saving
    delete advancedConfig.configureOutputDirectories;

    this.config.advanced = { ...this.config.advanced, ...advancedConfig };
    await this.saveMainConfig();

    console.log(chalk.green('✅ Advanced configuration saved!'));
  }

  // Output directory configuration
  async configureOutputDirectories() {
    console.log(chalk.blue('\n📁 Configure Output Directories for AI Prompts'));

    const outputDirQuestions = [
      {
        type: 'input',
        name: 'prompts',
        message: 'Directory for general prompt files:',
        default: this.config.outputDirectories?.prompts || './prompts',
      },
      {
        type: 'input',
        name: 'customInstructions',
        message: 'Directory for custom instruction files:',
        default:
          this.config.outputDirectories?.customInstructions ||
          './custom-instructions',
      },
      {
        type: 'input',
        name: 'context',
        message: 'Directory for context files:',
        default: this.config.outputDirectories?.context || './context',
      },
      {
        type: 'input',
        name: 'architecture',
        message: 'Directory for architecture analysis files:',
        default:
          this.config.outputDirectories?.architecture || './architecture',
      },
      {
        type: 'input',
        name: 'comprehensive',
        message: 'Directory for comprehensive analysis files:',
        default:
          this.config.outputDirectories?.comprehensive || './comprehensive',
      },
      {
        type: 'input',
        name: 'minimal',
        message: 'Directory for minimal context files:',
        default: this.config.outputDirectories?.minimal || './minimal',
      },
      {
        type: 'input',
        name: 'developer',
        message: 'Directory for developer reference files:',
        default: this.config.outputDirectories?.developer || './developer',
      },
    ];

    const outputDirectories = await inquirer.prompt(outputDirQuestions);
    this.config.outputDirectories = outputDirectories;
    await this.saveMainConfig();

    console.log(chalk.green('✅ Output directories configured successfully!'));
    console.log(chalk.gray('\nConfigured directories:'));
    Object.entries(outputDirectories).forEach(([type, dir]) => {
      console.log(chalk.gray(`   ${type}: ${dir}`));
    });
  }

  // Configuration validation
  validateAndMergeConfig(rawConfig) {
    const config = {};
    const schemaDefaults = this.getDefaultConfig(); // Get all defaults defined in getDefaultConfig

    // Apply schema defaults first from getDefaultConfig()
    for (const key in schemaDefaults) {
      if (schemaDefaults.hasOwnProperty(key)) {
        config[key] = schemaDefaults[key];
      }
    }

    // Override with rawConfig values if they exist, are valid (basic check), and defined in schema
    if (rawConfig) {
      for (const key in this.schema) {
        if (
          this.schema.hasOwnProperty(key) &&
          rawConfig.hasOwnProperty(key) &&
          rawConfig[key] !== undefined
        ) {
          const schemaEntry = this.schema[key];
          // Basic type check, can be expanded
          if (
            typeof rawConfig[key] === schemaEntry.type ||
            schemaEntry.type === 'any'
          ) {
            config[key] = rawConfig[key];
          } else {
            // console.warn(`Type mismatch for ${key}: expected ${schemaEntry.type}, got ${typeof rawConfig[key]}. Using default value: ${config[key]}`);
            // Default is already set from schemaDefaults, so if type is wrong, the default remains.
          }
        }
      }
    }
    return config;
  }

  // Save configurations
  async saveMainConfig() {
    try {
      // Prioritize this.configFile if explicitly set (e.g., for testing)
      const filePath =
        this.configFile || path.join(this.configDir, 'config.json');
      await fs.writeJson(filePath, this.config, { spaces: 2 });
    } catch (error) {
      console.warn(
        chalk.yellow(
          `⚠️  Config saving to ${
            this.configFile || path.join(this.configDir, 'config.json')
          } failed: ${error.message}`
        )
      );
    }
  }

  async saveProfiles() {
    await fs.writeJson(this.profilesFile, this.profiles, { spaces: 2 });
  }

  async saveUserConfig() {
    await fs.writeJson(this.userConfigFile, this.userConfig, { spaces: 2 });
  }

  // Update main configuration
  async updateMainConfig(newConfig, bypassFileWrite = false) {
    this.config = { ...this.config, ...newConfig };
    if (!bypassFileWrite) {
      await this.saveMainConfig();
    }
  }

  // Update user profiles
  async updateProfiles(newProfiles) {
    this.profiles = { ...this.profiles, ...newProfiles };
    await this.saveProfiles();
  }

  // Update user configuration
  async updateUserConfig(newUserConfig) {
    this.userConfig = { ...this.userConfig, ...newUserConfig };
    await this.saveUserConfig();
  }

  // Update general configuration (main, profiles, or user)
  async updateConfig(newConfig, isTestEnvironment = false) {
    this.config = { ...this.config, ...newConfig };
    if (!isTestEnvironment) {
      await this.saveMainConfig();
    } else {
      // In a test environment, we typically don't want to write to the user's actual config file.
      // If this.configFile points to a test-specific file, writing might be desired.
      // The current logic defers to saveMainConfig's discretion or explicit test setup.
      // console.log(`Test environment: In-memory config updated. File saving skipped by isTestEnvironment flag or handled by saveMainConfig if applicable for ${this.configFile}`);
    }
    return this.config;
  }

  // Get current configuration (merged from main, profile, and user)
  async getConfig() {
    // Assuming initialize() has been called and this.config is populated.
    // If this.config is empty, it means initialization didn't happen or failed.
    if (Object.keys(this.config).length === 0) {
      // This case should ideally not be hit if init() is always called.
      // console.warn("getConfig() called on uninitialized or empty config. Attempting to load or use defaults.");
      if (await fs.pathExists(this.configFile)) {
        await this.loadMainConfig(); // Attempt to load if empty
      } else {
        this.config = { ...this.defaultConfig }; // Fallback to defaults
      }
    }
    return this.config;
  }

  // Get a specific configuration value
  get(key) {
    return this.config[key];
  }

  // Set a specific configuration value
  set(key, value) {
    this.config[key] = value;
  }

  // Profile operations
  async switchProfile() {
    const profileNames = Object.keys(this.profiles);

    const answer = await inquirer.prompt([
      {
        type: 'list',
        name: 'profile',
        message: 'Select profile:',
        choices: profileNames,
      },
    ]);

    this.currentProfile = answer.profile;
    console.log(chalk.green(`✅ Switched to profile: ${answer.profile}`));
  }

  async createProfile() {
    const answer = await inquirer.prompt([
      {
        type: 'input',
        name: 'name',
        message: 'Profile name:',
        validate: (input) => {
          if (!input.trim()) return 'Profile name is required';
          if (this.config.profiles && this.config.profiles[input.trim()]) {
            return 'Profile with this name already exists.';
          }
          return true;
        },
      },
    ]);

    const profileName = answer.name.trim();
    const newProfile = this.getDefaultProfile();

    this.profiles[profileName] = newProfile;
    await this.saveProfiles();

    console.log(
      chalk.green(`✅ Profile '${profileName}' created successfully!`)
    );
  }

  async deleteProfile() {
    const profileNames = Object.keys(this.profiles);

    if (profileNames.length === 0) {
      return console.log(chalk.yellow('⚠️  No profiles available to delete.'));
    }

    const answer = await inquirer.prompt([
      {
        type: 'list',
        name: 'profile',
        message: 'Select profile to delete:',
        choices: profileNames,
      },
      {
        type: 'confirm',
        name: 'confirm',
        message: 'Are you sure you want to delete this profile?',
        default: false,
      },
    ]);

    if (answer.confirm) {
      delete this.profiles[answer.profile];
      await this.saveProfiles();
      console.log(chalk.green('✅ Profile deleted successfully.'));
    } else {
      console.log(chalk.yellow('⚠️  Profile deletion canceled.'));
    }
  }

  listProfiles() {
    const profileNames = Object.keys(this.profiles);

    if (profileNames.length === 0) {
      console.log(chalk.yellow('⚠️  No profiles found.'));
    } else {
      console.log(chalk.blue('\n👤 User Profiles:'));
      profileNames.forEach((name) => {
        console.log(
          ` - ${name}${name === this.currentProfile ? ' (current)' : ''}`
        );
      });
    }
  }

  // Default configuration values
  getDefaultConfig() {
    return {
      openaiApiKey: '',
      anthropicApiKey: '',
      preferredModel: 'gpt-3.5-turbo',
      autoExecute: false,
      maxMemorySize: 50,
      logLevel: 'info',
      enableTelemetry: false,
      advanced: this.getDefaultAdvancedConfig(),
    };
  }

  getDefaultAdvancedConfig() {
    return {
      commandTimeout: 300,
      maxRetries: 3,
      enablePlugins: true,
      enableWorkflows: true,
      customPromptTemplate: '',
      enabledFeatures: [],
    };
  }

  // Default profile values
  getDefaultProfile() {
    return {
      ...this.getDefaultConfig(),
      // Profile-specific defaults can be added here
    };
  }

  // Default user configuration values
  getDefaultUserConfig() {
    return {
      // User-specific configuration defaults
    };
  }

  // Config schema definition
  defineConfigSchema() {
    return {
      openaiApiKey: { type: 'string' },
      anthropicApiKey: { type: 'string' },
      preferredModel: {
        type: 'string',
        enum: [
          'gpt-4',
          'gpt-3.5-turbo',
          'claude-3-5-sonnet-20241022',
          'claude-3-haiku-20240307',
        ],
      },
      autoExecute: { type: 'boolean' },
      maxMemorySize: { type: 'number', min: 1, max: 1000 },
      logLevel: {
        type: 'string',
        enum: ['error', 'warn', 'info', 'debug'],
      },
      enableTelemetry: { type: 'boolean' },
      advanced: {
        type: 'object',
        properties: {
          commandTimeout: { type: 'number', min: 1, max: 3600 },
          maxRetries: { type: 'number', min: 0, max: 10 },
          enablePlugins: { type: 'boolean' },
          enableWorkflows: { type: 'boolean' },
          customPromptTemplate: { type: 'string' },
          enabledFeatures: {
            type: 'array',
            items: { type: 'string' },
          },
        },
      },
    };
  }

  // Get available models for selection
  getAvailableModels() {
    return [
      { name: 'GPT-4 (Most capable)', value: 'gpt-4' },
      { name: 'GPT-3.5 Turbo (Faster)', value: 'gpt-3.5-turbo' },
      {
        name: 'Claude-3.5 Sonnet (Good balance)',
        value: 'claude-3-5-sonnet-20241022',
      },
      { name: 'Claude-3 Haiku (Fastest)', value: 'claude-3-haiku-20240307' },
    ];
  }

  getApiKey(provider) {
    if (provider === 'openai') {
      return this.config.openaiApiKey;
    } else if (provider === 'anthropic') {
      return this.config.anthropicApiKey;
    } else {
      console.error(`Unknown provider: ${provider}`);
      return null;
    }
  }

  // Helper method for deep merging configuration objects
  deepMerge(target, source) {
    const result = { ...target };

    for (const key in source) {
      if (
        source[key] &&
        typeof source[key] === 'object' &&
        !Array.isArray(source[key])
      ) {
        result[key] = this.deepMerge(target[key] || {}, source[key]);
      } else {
        result[key] = source[key];
      }
    }

    return result;
  }
}

module.exports = ConfigurationManager;
