# TypeScript Migration Quick Start Templates

This document provides ready-to-use templates and code snippets for beginning the TypeScript migration of AIA.

## 🚀 Quick Setup Commands

```bash
# Install TypeScript dependencies
npm install --save-dev typescript @types/node @types/jest @types/inquirer @types/fs-extra ts-node ts-jest

# Install ESLint for TypeScript
npm install --save-dev @typescript-eslint/eslint-plugin @typescript-eslint/parser

# Create TypeScript configuration
cat > tsconfig.json << 'EOF'
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "moduleResolution": "node",
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "allowSyntheticDefaultImports": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "resolveJsonModule": true,
    "types": ["node", "jest"],
    "baseUrl": "./",
    "paths": {
      "@/*": ["src/*"],
      "@services/*": ["src/services/*"],
      "@commands/*": ["src/commands/*"],
      "@interfaces/*": ["src/interfaces/*"],
      "@utils/*": ["src/utils/*"]
    }
  },
  "include": ["src/**/*", "main.ts"],
  "exclude": ["node_modules", "dist", "tests/**/*", "examples/**/*", "*.js"]
}
EOF

# Update package.json scripts
npm pkg set scripts.build="tsc"
npm pkg set scripts.dev="ts-node --esm main.ts"
npm pkg set scripts.type-check="tsc --noEmit"
npm pkg set main="dist/main.js"
npm pkg set types="dist/main.d.ts"
```

## 📁 Initial File Structure Creation

```bash
# Create TypeScript source structure
mkdir -p src/types
mkdir -p src/interfaces
mkdir -p src/services
mkdir -p src/commands
mkdir -p src/container
mkdir -p src/cli
mkdir -p src/utils

# Create basic type definition file
cat > src/types/index.ts << 'EOF'
// Core application types
export interface AIAConfig {
  preferredModel: string;
  openaiApiKey?: string;
  anthropicApiKey?: string;
  autoExecute: boolean;
  plugins: Record<string, PluginConfig>;
  profiles: Record<string, ConfigProfile>;
}

export interface ConfigProfile {
  name: string;
  description: string;
  settings: Partial<AIAConfig>;
  active: boolean;
}

export interface PluginConfig {
  enabled: boolean;
  version: string;
  settings: Record<string, unknown>;
}

export type AIModel = 'gpt-4' | 'gpt-3.5-turbo' | 'claude-3.5-sonnet' | 'claude-3-haiku';

export interface CommandResult {
  success: boolean;
  data?: unknown;
  error?: string;
  output?: string;
}

export interface CommandOptions {
  model?: AIModel;
  context?: string;
  verbose?: boolean;
  autoExecute?: boolean;
  [key: string]: unknown;
}

export type AsyncResult<T> = Promise<{ success: boolean; data?: T; error?: string }>;
EOF
```

## 🔧 First Service Migration Template

```typescript
// src/services/ConfigurationService.ts - Example first service to migrate
import { IConfigurationService } from '@interfaces/IConfigurationService';
import { AIAConfig, ConfigProfile, AsyncResult, ServiceResult } from '@/types';
import * as fs from 'fs-extra';
import * as path from 'path';
import * as os from 'os';

export class ConfigurationService implements IConfigurationService {
  private configPath: string;
  private config: AIAConfig | null = null;

  constructor() {
    this.configPath = path.join(os.homedir(), '.aia', 'config.json');
  }

  public async loadConfig(): AsyncResult<AIAConfig> {
    try {
      if (await fs.pathExists(this.configPath)) {
        const configData = await fs.readJson(this.configPath);
        this.config = this.validateConfig(configData);
        return { success: true, data: this.config };
      }

      // Return default configuration
      this.config = this.getDefaultConfig();
      return { success: true, data: this.config };
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : 'Failed to load configuration',
      };
    }
  }

  public async saveConfig(config: AIAConfig): AsyncResult<void> {
    try {
      await fs.ensureDir(path.dirname(this.configPath));
      await fs.writeJson(this.configPath, config, { spaces: 2 });
      this.config = config;
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : 'Failed to save configuration',
      };
    }
  }

  public getConfig(): AIAConfig {
    return this.config || this.getDefaultConfig();
  }

  private validateConfig(configData: unknown): AIAConfig {
    // Type-safe configuration validation
    const config = configData as Partial<AIAConfig>;

    return {
      preferredModel: config.preferredModel || 'gpt-4',
      openaiApiKey: config.openaiApiKey,
      anthropicApiKey: config.anthropicApiKey,
      autoExecute: config.autoExecute || false,
      plugins: config.plugins || {},
      profiles: config.profiles || {},
    };
  }

  private getDefaultConfig(): AIAConfig {
    return {
      preferredModel: 'gpt-4',
      autoExecute: false,
      plugins: {},
      profiles: {},
    };
  }
}
```

## 🎯 Interface Definition Template

```typescript
// src/interfaces/IConfigurationService.ts
import { AIAConfig, ConfigProfile, AsyncResult } from '@/types';

export interface IConfigurationService {
  /**
   * Load configuration from disk
   */
  loadConfig(): AsyncResult<AIAConfig>;

  /**
   * Save configuration to disk
   */
  saveConfig(config: AIAConfig): AsyncResult<void>;

  /**
   * Get current configuration
   */
  getConfig(): AIAConfig;

  /**
   * Update specific configuration setting
   */
  updateSetting<K extends keyof AIAConfig>(
    key: K,
    value: AIAConfig[K]
  ): AsyncResult<void>;

  /**
   * Create a new configuration profile
   */
  createProfile(name: string, profile: ConfigProfile): AsyncResult<void>;

  /**
   * Switch to a different configuration profile
   */
  switchProfile(profileName: string): AsyncResult<void>;

  /**
   * Validate API keys
   */
  validateApiKeys(): AsyncResult<Record<string, boolean>>;
}
```

## 🧪 Test Template

```typescript
// tests/services/ConfigurationService.test.ts
import { ConfigurationService } from '@services/ConfigurationService';
import { AIAConfig } from '@/types';
import * as fs from 'fs-extra';
import * as path from 'path';
import * as os from 'os';

// Mock fs-extra
jest.mock('fs-extra');
const mockFs = fs as jest.Mocked<typeof fs>;

describe('ConfigurationService', () => {
  let configService: ConfigurationService;
  let mockConfigPath: string;

  beforeEach(() => {
    configService = new ConfigurationService();
    mockConfigPath = path.join(os.homedir(), '.aia', 'config.json');
    jest.clearAllMocks();
  });

  describe('loadConfig', () => {
    it('should load existing configuration successfully', async () => {
      const mockConfig: AIAConfig = {
        preferredModel: 'gpt-4',
        openaiApiKey: 'test-key',
        anthropicApiKey: 'test-key',
        autoExecute: false,
        plugins: {},
        profiles: {},
      };

      mockFs.pathExists.mockResolvedValue(true);
      mockFs.readJson.mockResolvedValue(mockConfig);

      const result = await configService.loadConfig();

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockConfig);
      expect(mockFs.pathExists).toHaveBeenCalledWith(mockConfigPath);
      expect(mockFs.readJson).toHaveBeenCalledWith(mockConfigPath);
    });

    it('should return default configuration when file does not exist', async () => {
      mockFs.pathExists.mockResolvedValue(false);

      const result = await configService.loadConfig();

      expect(result.success).toBe(true);
      expect(result.data).toEqual({
        preferredModel: 'gpt-4',
        autoExecute: false,
        plugins: {},
        profiles: {},
      });
    });

    it('should handle errors gracefully', async () => {
      mockFs.pathExists.mockRejectedValue(new Error('File system error'));

      const result = await configService.loadConfig();

      expect(result.success).toBe(false);
      expect(result.error).toBe('File system error');
    });
  });

  describe('saveConfig', () => {
    it('should save configuration successfully', async () => {
      const config: AIAConfig = {
        preferredModel: 'claude-3.5-sonnet',
        openaiApiKey: 'new-key',
        anthropicApiKey: 'new-key',
        autoExecute: true,
        plugins: {},
        profiles: {},
      };

      mockFs.ensureDir.mockResolvedValue(undefined);
      mockFs.writeJson.mockResolvedValue(undefined);

      const result = await configService.saveConfig(config);

      expect(result.success).toBe(true);
      expect(mockFs.ensureDir).toHaveBeenCalledWith(
        path.dirname(mockConfigPath)
      );
      expect(mockFs.writeJson).toHaveBeenCalledWith(mockConfigPath, config, {
        spaces: 2,
      });
    });
  });
});
```

## 🔨 Command Migration Template

```typescript
// src/commands/ConfigCommand.ts
import { ICommand } from '@interfaces/ICommand';
import { IConfigurationService } from '@interfaces/IConfigurationService';
import { CommandResult, CommandOptions, CommandOption } from '@/types';
import chalk from 'chalk';
import inquirer from 'inquirer';

export class ConfigCommand implements ICommand {
  public readonly name = 'config';
  public readonly description = 'Configuration management';
  public readonly aliases = ['cfg', 'configure'];

  constructor(private configService: IConfigurationService) {}

  public async execute(
    args: string[],
    options: CommandOptions
  ): Promise<CommandResult> {
    try {
      if (options.interactive) {
        return await this.runInteractiveConfig();
      }

      if (options.set) {
        return await this.setSetting(options.set as string);
      }

      if (options.get) {
        return await this.getSetting(options.get as string);
      }

      if (options.list) {
        return await this.listSettings();
      }

      // Default: show current configuration
      return await this.showCurrentConfig();
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : 'Configuration command failed',
      };
    }
  }

  private async runInteractiveConfig(): Promise<CommandResult> {
    const config = this.configService.getConfig();

    const answers = await inquirer.prompt([
      {
        type: 'list',
        name: 'preferredModel',
        message: 'Select preferred AI model:',
        choices: [
          'gpt-4',
          'gpt-3.5-turbo',
          'claude-3.5-sonnet',
          'claude-3-haiku',
        ],
        default: config.preferredModel,
      },
      {
        type: 'input',
        name: 'openaiApiKey',
        message: 'OpenAI API Key (optional):',
        default: config.openaiApiKey || '',
      },
      {
        type: 'input',
        name: 'anthropicApiKey',
        message: 'Anthropic API Key (optional):',
        default: config.anthropicApiKey || '',
      },
      {
        type: 'confirm',
        name: 'autoExecute',
        message: 'Enable automatic command execution?',
        default: config.autoExecute,
      },
    ]);

    const newConfig = { ...config, ...answers };
    const saveResult = await this.configService.saveConfig(newConfig);

    if (saveResult.success) {
      return {
        success: true,
        output: chalk.green('✅ Configuration saved successfully!'),
      };
    } else {
      return {
        success: false,
        error: saveResult.error || 'Failed to save configuration',
      };
    }
  }

  public getUsage(): string {
    return `${this.name} [options]`;
  }

  public getOptions(): CommandOption[] {
    return [
      {
        name: 'interactive',
        description: 'Run interactive configuration',
        type: 'boolean',
        required: false,
      },
      {
        name: 'set',
        description: 'Set configuration value (key=value)',
        type: 'string',
        required: false,
      },
      {
        name: 'get',
        description: 'Get configuration value',
        type: 'string',
        required: false,
      },
      {
        name: 'list',
        description: 'List all configuration settings',
        type: 'boolean',
        required: false,
      },
    ];
  }

  // ... additional private methods
}
```

## 📋 Migration Checklist

### Phase 1: Setup (Day 1)

- [ ] Install TypeScript dependencies
- [ ] Create `tsconfig.json`
- [ ] Create `jest.config.ts`
- [ ] Set up ESLint for TypeScript
- [ ] Create initial type definitions
- [ ] Test basic compilation

### Phase 2: Interfaces (Days 2-3)

- [ ] Convert all `src/interfaces/*.js` to TypeScript
- [ ] Add proper type annotations
- [ ] Create comprehensive type definitions
- [ ] Set up path aliases
- [ ] Validate interface contracts

### Phase 3: First Services (Days 4-7)

- [ ] Migrate ConfigurationService
- [ ] Migrate MemoryService
- [ ] Migrate ContextService
- [ ] Update dependency injection container
- [ ] Test service integration

### Phase 4: Commands (Days 8-10)

- [ ] Migrate all command implementations
- [ ] Update CLI application
- [ ] Convert main entry point
- [ ] Test CLI functionality
- [ ] Verify command registration

### Phase 5: Testing (Days 11-14)

- [ ] Convert test files to TypeScript
- [ ] Create typed test utilities
- [ ] Update Jest configuration
- [ ] Ensure 100% test coverage
- [ ] Add type-specific tests

## 🎯 Success Validation

```bash
# Validate TypeScript compilation
npm run type-check

# Run tests with TypeScript
npm test

# Build and test CLI
npm run build
node dist/main.js --help

# Test specific functionality
node dist/main.js config --list
node dist/main.js ask "test query"
```

This quick start guide provides immediate, actionable steps to begin the TypeScript migration process with proven templates and examples.
