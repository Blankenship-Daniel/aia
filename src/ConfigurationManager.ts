// Enhanced Configuration Management
// Provides flexible, secure, and user-friendly configuration handling

import fs from 'fs-extra';
import path from 'path';
import os from 'os';
import chalk from 'chalk';
import inquirer from 'inquirer';

interface AIAConfig {
  preferredModel: string;
  openaiApiKey: string | null;
  anthropicApiKey: string | null;
  autoExecuteAgentCommands: boolean;
  maxAgentIterations: number;
  enableCommandOptimization: boolean;
  commandOptimizationMode: 'auto' | 'manual' | 'disabled';
  maxOutputLength: number;
  pluginSources: string[];
  enableEncryption: boolean;
  encryptionKey: string | null;
  logLevel: 'debug' | 'info' | 'warn' | 'error';
  contextDepth: number;
  theme: string;
  autoClearMemoryOlderThan: number;
  enablePluginSandboxing: boolean;
  enableWorkflowAutomation: boolean;
  agentTemperature: number;
  agentMaxOutputTokens: number;
  saveDefaultsInTest: boolean;
  outputDirectories: {
    prompts: string;
    outputs: string;
    logs: string;
    memory: string;
    plugins: string;
  };
}

interface UserProfile {
  name: string;
  preferences: Partial<AIAConfig>;
  workingDirectories: Record<string, string>;
  customCommands: Record<string, string>;
  shortcuts: Record<string, string>;
}

interface SecurityValidator {
  encryptApiKey: (key: string) => string;
  decryptApiKey: (encryptedKey: string) => string;
  validateAnthropicApiKey: (key: string) => Promise<boolean>;
}

class ConfigurationManager {
  private configDir: string;
  private configFile: string;
  private profilesFile: string;
  private userConfigFile: string;
  private config: AIAConfig;
  private defaultConfig: AIAConfig;
  private profiles: Record<string, UserProfile>;
  private userConfig: Record<string, unknown>;
  private securityValidator: SecurityValidator | null;

  constructor(configDirOrFile?: string, isFilePath: boolean = false) {
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

    this.config = {} as AIAConfig;
    this.profiles = {};
    this.userConfig = {};
    this.securityValidator = null;

    this.defaultConfig = {
      preferredModel: 'gpt-4',
      openaiApiKey: null,
      anthropicApiKey: null,
      autoExecuteAgentCommands: false,
      maxAgentIterations: 5,
      enableCommandOptimization: true,
      commandOptimizationMode: 'auto',
      maxOutputLength: 2000,
      pluginSources: ['official-registry'],
      enableEncryption: false,
      encryptionKey: null,
      logLevel: 'info',
      contextDepth: 5,
      theme: 'default',
      autoClearMemoryOlderThan: 30,
      enablePluginSandboxing: true,
      enableWorkflowAutomation: true,
      agentTemperature: 0.7,
      agentMaxOutputTokens: 1500,
      saveDefaultsInTest: false,
      outputDirectories: {
        prompts: './prompts',
        outputs: './outputs',
        logs: './logs',
        memory: './memory',
        plugins: './plugins',
      },
    };
  }

  async initialize(
    securityValidator: SecurityValidator | null = null
  ): Promise<void> {
    this.securityValidator = securityValidator;
    await this.loadAllConfigs();
  }

  // Load all configuration files
  private async loadAllConfigs(): Promise<void> {
    await this.loadMainConfig();
    await this.loadProfiles();
    await this.loadUserConfig();
  }

  // Load main configuration
  private async loadMainConfig(): Promise<void> {
    try {
      await fs.ensureDir(this.configDir);

      if (await fs.pathExists(this.configFile)) {
        const rawConfig = await fs.readJson(this.configFile);
        this.config = { ...this.defaultConfig, ...rawConfig };
      } else {
        this.config = { ...this.defaultConfig };
        await this.saveMainConfig();
      }

      // Decrypt API keys if security validator is available and encryption is enabled
      if (this.securityValidator && this.config.enableEncryption) {
        if (this.config.openaiApiKey) {
          const decryptedOpenAIKey = this.securityValidator.decryptApiKey(
            this.config.openaiApiKey
          );
          this.config.openaiApiKey = decryptedOpenAIKey.trim();
        }

        if (this.config.anthropicApiKey) {
          const decryptedAnthropicKey = this.securityValidator.decryptApiKey(
            this.config.anthropicApiKey
          );
          this.config.anthropicApiKey = decryptedAnthropicKey.trim();
        }
      }

      this.validateConfigAndFillMissing();
    } catch (error) {
      console.error(
        chalk.red(
          'Failed to load main configuration:',
          (error as Error).message
        )
      );
      this.config = { ...this.defaultConfig };
    }
  }

  // Validate configuration and fill missing values
  private validateConfigAndFillMissing(): void {
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
  public getActiveConfigFile(): string {
    return this.configFile;
  }

  // Load user profiles
  private async loadProfiles(): Promise<void> {
    try {
      if (await fs.pathExists(this.profilesFile)) {
        this.profiles = await fs.readJson(this.profilesFile);
      } else {
        this.profiles = { default: this.getDefaultProfile() };
        await this.saveProfiles();
      }
    } catch (error) {
      console.error(
        chalk.red('Failed to load profiles:', (error as Error).message)
      );
      this.profiles = { default: this.getDefaultProfile() };
    }
  }

  // Load user-specific configuration
  private async loadUserConfig(): Promise<void> {
    try {
      if (await fs.pathExists(this.userConfigFile)) {
        this.userConfig = await fs.readJson(this.userConfigFile);
      } else {
        this.userConfig = {};
        await this.saveUserConfig();
      }
    } catch (error) {
      console.error(
        chalk.red(
          'Failed to load user configuration:',
          (error as Error).message
        )
      );
      this.userConfig = {};
    }
  }

  // Interactive configuration setup
  async setupInteractiveConfig(): Promise<void> {
    console.log(chalk.blue('\n🔧 AIA Configuration Setup'));
    console.log(chalk.gray("Let's set up your AIA CLI configuration.\n"));

    const setupType = await inquirer.prompt([
      {
        type: 'list',
        name: 'type',
        message: 'What would you like to do?',
        choices: [
          { name: '⚡ Quick Setup (API keys only)', value: 'quick' },
          { name: '🔧 Full Setup (all options)', value: 'full' },
          { name: '👤 Profile Management', value: 'profiles' },
          { name: '⚙️  Advanced Settings', value: 'advanced' },
        ],
      },
    ]);

    switch (setupType.type) {
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
  private async quickSetup(): Promise<void> {
    console.log(chalk.yellow('\n⚡ Quick Setup - API Keys'));

    const answers = await inquirer.prompt([
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
          'gpt-4',
          'gpt-3.5-turbo',
          'claude-3-sonnet',
          'claude-3-haiku',
        ],
        default: this.config.preferredModel,
      },
    ]);

    // Update configuration
    Object.assign(this.config, answers);

    // Encrypt API keys if security validator is available
    if (this.securityValidator && this.config.enableEncryption) {
      if (answers.openaiApiKey) {
        this.config.openaiApiKey = this.securityValidator.encryptApiKey(
          answers.openaiApiKey
        );
      }
      if (answers.anthropicApiKey) {
        this.config.anthropicApiKey = this.securityValidator.encryptApiKey(
          answers.anthropicApiKey
        );
      }
    }

    await this.saveMainConfig();
    console.log(chalk.green('\n✅ Quick setup completed!'));
  }

  // Full configuration setup
  private async fullSetup(): Promise<void> {
    console.log(chalk.yellow('\n🔧 Full Setup - All Configuration Options'));

    // API Keys
    const apiAnswers = await inquirer.prompt([
      {
        type: 'password',
        name: 'openaiApiKey',
        message: 'OpenAI API Key:',
        mask: '*',
        default: this.config.openaiApiKey || '',
      },
      {
        type: 'password',
        name: 'anthropicApiKey',
        message: 'Anthropic API Key:',
        mask: '*',
        default: this.config.anthropicApiKey || '',
      },
    ]);

    // General Settings
    const generalAnswers = await inquirer.prompt([
      {
        type: 'list',
        name: 'preferredModel',
        message: 'Preferred AI Model:',
        choices: [
          'gpt-4',
          'gpt-3.5-turbo',
          'claude-3-sonnet',
          'claude-3-haiku',
        ],
        default: this.config.preferredModel,
      },
      {
        type: 'confirm',
        name: 'autoExecuteAgentCommands',
        message: 'Auto-execute agent commands?',
        default: this.config.autoExecuteAgentCommands,
      },
      {
        type: 'number',
        name: 'maxAgentIterations',
        message: 'Maximum agent iterations:',
        default: this.config.maxAgentIterations,
        validate: (input: number) => input > 0 && input <= 20,
      },
      {
        type: 'confirm',
        name: 'enableCommandOptimization',
        message: 'Enable command optimization?',
        default: this.config.enableCommandOptimization,
      },
    ]);

    const fullConfig = { ...apiAnswers, ...generalAnswers };
    await this.processFullConfig(fullConfig);
  }

  // Process and save full configuration
  private async processFullConfig(
    fullConfig: Partial<AIAConfig>
  ): Promise<void> {
    // Update configuration
    Object.assign(this.config, fullConfig);

    // Encrypt API keys if security validator is available
    if (this.securityValidator && this.config.enableEncryption) {
      if (fullConfig.openaiApiKey) {
        this.config.openaiApiKey = this.securityValidator.encryptApiKey(
          fullConfig.openaiApiKey
        );
      }
      if (fullConfig.anthropicApiKey) {
        this.config.anthropicApiKey = this.securityValidator.encryptApiKey(
          fullConfig.anthropicApiKey
        );
      }
    }

    await this.saveMainConfig();
    console.log(chalk.green('\n✅ Full configuration completed!'));
  }

  // Profile management
  private async profileManagement(): Promise<void> {
    const profileNames = Object.keys(this.profiles);

    const action = await inquirer.prompt([
      {
        type: 'list',
        name: 'action',
        message: 'Profile Management:',
        choices: [
          { name: 'Create New Profile', value: 'create' },
          { name: 'Edit Existing Profile', value: 'edit' },
          { name: 'Delete Profile', value: 'delete' },
          { name: 'List Profiles', value: 'list' },
        ],
      },
    ]);

    switch (action.action) {
      case 'create':
        await this.createProfile();
        break;
      case 'edit':
        if (profileNames.length > 0) {
          await this.editProfile();
        } else {
          console.log(chalk.yellow('No profiles available to edit.'));
        }
        break;
      case 'delete':
        if (profileNames.length > 1) {
          await this.deleteProfile();
        } else {
          console.log(chalk.yellow('Cannot delete the only profile.'));
        }
        break;
      case 'list':
        this.listProfiles();
        break;
    }
  }

  // Advanced configuration
  private async advancedSetup(): Promise<void> {
    console.log(chalk.yellow('\n⚙️  Advanced Settings'));

    const answers = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'enableEncryption',
        message: 'Enable API key encryption?',
        default: this.config.enableEncryption,
      },
      {
        type: 'list',
        name: 'logLevel',
        message: 'Log Level:',
        choices: ['debug', 'info', 'warn', 'error'],
        default: this.config.logLevel,
      },
      {
        type: 'number',
        name: 'contextDepth',
        message: 'Context depth (conversation history):',
        default: this.config.contextDepth,
        validate: (input: number) => input >= 0 && input <= 50,
      },
      {
        type: 'confirm',
        name: 'enablePluginSandboxing',
        message: 'Enable plugin sandboxing?',
        default: this.config.enablePluginSandboxing,
      },
    ]);

    Object.assign(this.config, answers);
    await this.saveMainConfig();
  }

  // Output directory configuration
  private async configureOutputDirectories(): Promise<void> {
    console.log(chalk.yellow('\n📁 Output Directory Configuration'));

    const currentDirs = this.config.outputDirectories;
    const answers = await inquirer.prompt([
      {
        type: 'input',
        name: 'prompts',
        message: 'Prompts directory:',
        default: currentDirs.prompts,
      },
      {
        type: 'input',
        name: 'outputs',
        message: 'Outputs directory:',
        default: currentDirs.outputs,
      },
      {
        type: 'input',
        name: 'logs',
        message: 'Logs directory:',
        default: currentDirs.logs,
      },
      {
        type: 'input',
        name: 'memory',
        message: 'Memory directory:',
        default: currentDirs.memory,
      },
      {
        type: 'input',
        name: 'plugins',
        message: 'Plugins directory:',
        default: currentDirs.plugins,
      },
    ]);

    this.config.outputDirectories = answers;
    await this.saveMainConfig();
  }

  // Configuration validation
  private validateAndMergeConfig(rawConfig: Partial<AIAConfig>): AIAConfig {
    const merged = { ...this.defaultConfig, ...rawConfig };

    // Validate required fields
    if (!merged.preferredModel) {
      merged.preferredModel = this.defaultConfig.preferredModel;
    }

    return merged;
  }

  // Save configurations
  private async saveMainConfig(): Promise<void> {
    try {
      await fs.ensureDir(this.configDir);
      await fs.writeJson(this.configFile, this.config, { spaces: 2 });
    } catch (error) {
      console.error(
        chalk.red(
          'Failed to save main configuration:',
          (error as Error).message
        )
      );
      throw error;
    }
  }

  private async saveProfiles(): Promise<void> {
    try {
      await fs.ensureDir(this.configDir);
      await fs.writeJson(this.profilesFile, this.profiles, { spaces: 2 });
    } catch (error) {
      console.error(
        chalk.red('Failed to save profiles:', (error as Error).message)
      );
      throw error;
    }
  }

  private async saveUserConfig(): Promise<void> {
    try {
      await fs.ensureDir(this.configDir);
      await fs.writeJson(this.userConfigFile, this.userConfig, { spaces: 2 });
    } catch (error) {
      console.error(
        chalk.red(
          'Failed to save user configuration:',
          (error as Error).message
        )
      );
      throw error;
    }
  }

  // Update main configuration
  async updateMainConfig(
    newConfig: Partial<AIAConfig>,
    bypassFileWrite: boolean = false
  ): Promise<void> {
    Object.assign(this.config, newConfig);

    if (!bypassFileWrite) {
      await this.saveMainConfig();
    }
  }

  // Helper methods
  private getDefaultConfig(): AIAConfig {
    return { ...this.defaultConfig };
  }

  private getDefaultProfile(): UserProfile {
    return {
      name: 'default',
      preferences: {},
      workingDirectories: {},
      customCommands: {},
      shortcuts: {},
    };
  }

  private async createProfile(): Promise<void> {
    const answers = await inquirer.prompt([
      {
        type: 'input',
        name: 'name',
        message: 'Profile name:',
        validate: (input: string) => {
          if (!input.trim()) return 'Profile name is required';
          if (this.profiles[input]) return 'Profile already exists';
          return true;
        },
      },
    ]);

    this.profiles[answers.name] = {
      name: answers.name,
      preferences: {},
      workingDirectories: {},
      customCommands: {},
      shortcuts: {},
    };

    await this.saveProfiles();
    console.log(chalk.green(`✅ Profile '${answers.name}' created!`));
  }

  private async editProfile(): Promise<void> {
    const profileNames = Object.keys(this.profiles);

    const selection = await inquirer.prompt([
      {
        type: 'list',
        name: 'profile',
        message: 'Select profile to edit:',
        choices: profileNames,
      },
    ]);

    // Simple profile editing - in a real implementation, this would be more comprehensive
    console.log(chalk.yellow(`Editing profile: ${selection.profile}`));
    console.log(
      chalk.gray('(Profile editing functionality would be implemented here)')
    );
  }

  private async deleteProfile(): Promise<void> {
    const profileNames = Object.keys(this.profiles).filter(
      (name) => name !== 'default'
    );

    const selection = await inquirer.prompt([
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

    if (selection.confirm) {
      delete this.profiles[selection.profile];
      await this.saveProfiles();
      console.log(chalk.green(`✅ Profile '${selection.profile}' deleted!`));
    }
  }

  private listProfiles(): void {
    console.log(chalk.blue('\n📋 Available Profiles:'));
    Object.values(this.profiles).forEach((profile) => {
      console.log(chalk.cyan(`  • ${profile.name}`));
    });
  }

  // Public getters
  public getConfig(): AIAConfig {
    return { ...this.config };
  }

  public get<K extends keyof AIAConfig>(key: K): AIAConfig[K] {
    return this.config[key];
  }

  public getProfiles(): Record<string, UserProfile> {
    return { ...this.profiles };
  }

  public getUserConfig(): Record<string, unknown> {
    return { ...this.userConfig };
  }

  public setUserConfig(key: string, value: unknown): void {
    this.userConfig[key] = value;
  }

  public async saveUserConfigValue(key: string, value: unknown): Promise<void> {
    this.setUserConfig(key, value);
    await this.saveUserConfig();
  }
}

export default ConfigurationManager;
