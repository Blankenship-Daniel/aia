import { ICommand, CommandDefinition } from '../interfaces/ICommand';
import { IConfigurationService } from '../interfaces/IConfigurationService';
import { CommandResult, CommandOptions, AIAConfig } from '../types/index';
import chalk from 'chalk';
import inquirer from 'inquirer';

export class ConfigCommand implements ICommand {
  public readonly name = 'config';
  public readonly description =
    'Manage AIA configuration settings and API keys';
  public readonly aliases = ['cfg', 'configure'];

  constructor(private configurationService: IConfigurationService) {}

  public async execute(
    context: Record<string, unknown>,
    args: string[],
    options: CommandOptions
  ): Promise<CommandResult> {
    try {
      // Handle set operation
      if (options.set) {
        return await this.handleSet(options.set as string);
      }

      // Handle get operation
      if (options.get) {
        return await this.handleGet(options.get as string);
      }

      // Handle list operation
      if (options.list) {
        return await this.handleList();
      }

      // Default to interactive mode
      return await this.handleInteractive();
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Configuration failed',
      };
    }
  }

  private async handleSet(keyValue: string): Promise<CommandResult> {
    const [key, value] = keyValue.split('=');

    if (!key || value === undefined) {
      return {
        success: false,
        error: 'Invalid format. Use: --set key=value',
      };
    }
    try {
      // Use the correct interface method
      await this.configurationService.setSetting(
        key.trim() as keyof AIAConfig,
        value.trim()
      );

      return {
        success: true,
        output: chalk.green(`✓ Set ${key} = ${value}`),
      };
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : 'Failed to set configuration',
      };
    }
  }

  private async handleGet(key: string): Promise<CommandResult> {
    try {
      const value = this.configurationService.getSetting(
        key as keyof AIAConfig
      );

      if (value === undefined) {
        return {
          success: false,
          error: `Configuration key '${key}' not found`,
        };
      }

      return {
        success: true,
        output: chalk.cyan(`${key}: ${value}`),
      };
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : 'Failed to get configuration',
      };
    }
  }

  private async handleList(): Promise<CommandResult> {
    try {
      const config = this.configurationService.getConfiguration();

      let output = chalk.cyan('Current Configuration:\n');

      for (const [key, value] of Object.entries(config)) {
        // Hide sensitive values
        const displayValue = key.toLowerCase().includes('key')
          ? '*'.repeat(8)
          : String(value);
        output += `  ${key}: ${displayValue}\n`;
      }

      return {
        success: true,
        output,
      };
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : 'Failed to list configuration',
      };
    }
  }

  private async handleInteractive(): Promise<CommandResult> {
    try {
      console.log(chalk.cyan('🔧 AIA Configuration Setup'));
      console.log(chalk.gray('Configure your AI API keys and preferences\n'));

      const questions = [
        {
          type: 'list',
          name: 'preferredModel',
          message: 'Select your preferred AI model:',
          choices: [
            {
              name: 'GPT-4 (OpenAI) - Best for code and complex tasks',
              value: 'gpt-4',
            },
            {
              name: 'GPT-3.5 Turbo (OpenAI) - Fast and efficient',
              value: 'gpt-3.5-turbo',
            },
            {
              name: 'Claude-3.5 Sonnet (Anthropic) - Great for analysis',
              value: 'claude-3.5-sonnet',
            },
            {
              name: 'Claude-3 Haiku (Anthropic) - Fast responses',
              value: 'claude-3-haiku',
            },
          ],
          default: 'gpt-4',
        },
        {
          type: 'input',
          name: 'openaiApiKey',
          message: 'Enter your OpenAI API key (optional):',
          validate: (input: string) => {
            if (!input.trim()) return true; // Optional
            if (input.startsWith('sk-') && input.length > 20) return true;
            return 'Please enter a valid OpenAI API key (starts with sk-) or leave empty';
          },
        },
        {
          type: 'input',
          name: 'anthropicApiKey',
          message: 'Enter your Anthropic API key (optional):',
          validate: (input: string) => {
            if (!input.trim()) return true; // Optional
            if (input.startsWith('sk-ant-') && input.length > 20) return true;
            return 'Please enter a valid Anthropic API key (starts with sk-ant-) or leave empty';
          },
        },
        {
          type: 'confirm',
          name: 'autoExecute',
          message:
            'Enable automatic command execution (no confirmation prompts)?',
          default: false,
        },
      ];

      const answers = await inquirer.prompt(questions);

      // Save configuration
      for (const [key, value] of Object.entries(answers)) {
        if (value !== '' && value !== undefined && value !== null) {
          await this.configurationService.setSetting(
            key as keyof AIAConfig,
            value as any
          );
        }
      }

      console.log(chalk.green('\n✓ Configuration saved successfully!'));

      // Show summary
      const hasOpenAI = Boolean(answers.openaiApiKey);
      const hasAnthropic = Boolean(answers.anthropicApiKey);

      console.log(chalk.cyan('\nConfiguration Summary:'));
      console.log(`  Preferred Model: ${answers.preferredModel}`);
      console.log(
        `  OpenAI API: ${hasOpenAI ? '✓ Configured' : '✗ Not configured'}`
      );
      console.log(
        `  Anthropic API: ${hasAnthropic ? '✓ Configured' : '✗ Not configured'}`
      );
      console.log(
        `  Auto Execute: ${answers.autoExecute ? 'Enabled' : 'Disabled'}`
      );

      if (!hasOpenAI && !hasAnthropic) {
        console.log(
          chalk.yellow(
            '\n⚠️  No API keys configured. AI features will not work.'
          )
        );
        console.log(
          chalk.gray(
            'You can add them later with: aia config --set openaiApiKey=<key>'
          )
        );
      }

      return {
        success: true,
        output: 'Configuration completed successfully',
      };
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : 'Interactive configuration failed',
      };
    }
  }

  // ICommand interface methods
  public getDefinition(): CommandDefinition {
    return {
      name: this.name,
      description: this.description,
      usage:
        'config [--set <key=value>] [--get <key>] [--list] [--interactive]',
      aliases: this.aliases,
      examples: [
        'aia config --interactive',
        'aia config --list',
        'aia config --get preferredModel',
        'aia config --set preferredModel=gpt-4',
      ],
      options: [
        {
          name: 'set',
          description: 'Set a configuration value (key=value)',
          type: 'string',
          required: false,
        },
        {
          name: 'get',
          description: 'Get a configuration value',
          type: 'string',
          required: false,
        },
        {
          name: 'list',
          description: 'List all configuration values',
          type: 'boolean',
          required: false,
        },
        {
          name: 'interactive',
          description: 'Interactive configuration setup',
          type: 'boolean',
          required: false,
        },
      ],
    };
  }

  public getName(): string {
    return this.name;
  }

  public getAliases(): string[] {
    return this.aliases;
  }

  public validateArgs(args: string[]): { valid: boolean; errors: string[] } {
    // Config command doesn't require specific arguments
    return {
      valid: true,
      errors: [],
    };
  }

  public getHelp(): string {
    const definition = this.getDefinition();
    let help = `${definition.name} - ${definition.description}\n\n`;
    help += `Usage: ${definition.usage}\n\n`;

    if (definition.aliases && definition.aliases.length > 0) {
      help += `Aliases: ${definition.aliases.join(', ')}\n\n`;
    }

    if (definition.options && definition.options.length > 0) {
      help += 'Options:\n';
      definition.options.forEach((opt) => {
        const required = opt.required ? ' (required)' : '';
        const defaultValue =
          opt.default !== undefined ? ` (default: ${opt.default})` : '';
        help += `  --${opt.name}: ${opt.description}${required}${defaultValue}\n`;
      });
      help += '\n';
    }

    if (definition.examples && definition.examples.length > 0) {
      help += 'Examples:\n';
      definition.examples.forEach((example) => {
        help += `  ${example}\n`;
      });
    }

    return help;
  }
}
