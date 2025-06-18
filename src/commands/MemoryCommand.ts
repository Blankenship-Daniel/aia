/**
 * Memory Command Implementation
 * Shows memory statistics and manages memory operations
 */
import { ICommand, CommandDefinition } from '../interfaces/ICommand';
import { IMemoryService } from '../interfaces/IMemoryService';
import { CommandResult, CommandOptions } from '../types/index';

export class MemoryCommand implements ICommand {
  private memoryService: IMemoryService;
  private logger?: any;

  constructor(memoryService: IMemoryService, logger?: any) {
    this.memoryService = memoryService;
    this.logger = logger;
  }

  /**
   * Get command definition
   */
  getDefinition(): CommandDefinition {
    return {
      name: 'memory',
      description: 'Show memory statistics and manage stored data',
      aliases: ['mem', 'stats'],
      usage: 'memory [--search <query>] [--clear] [--export <file>]',
      examples: [
        'memory',
        'memory --search "git commands"',
        'memory --clear',
        'memory --export backup.json',
      ],
      options: [
        {
          name: 'search',
          description: 'Search memory for specific content',
          type: 'string',
        },
        {
          name: 'clear',
          description: 'Clear all memory data',
          type: 'boolean',
          default: false,
        },
        {
          name: 'export',
          description: 'Export memory data to file',
          type: 'string',
        },
        {
          name: 'limit',
          description: 'Limit number of search results',
          type: 'number',
          default: 10,
        },
      ],
    };
  }

  /**
   * Get command name
   */
  getName(): string {
    return 'memory';
  }

  /**
   * Get command aliases
   */
  getAliases(): string[] {
    return ['mem', 'stats'];
  }

  /**
   * Validate command arguments
   */
  validateArgs(args: string[]): { valid: boolean; errors: string[] } {
    // Memory command doesn't require specific arguments
    return { valid: true, errors: [] };
  }

  /**
   * Get command help text
   */
  getHelp(): string {
    return `
Usage: memory [--search <query>] [--clear] [--export <file>]

Show memory statistics and manage stored data.

Options:
  --search <query>     Search memory for specific content
  --clear              Clear all memory data (requires confirmation)
  --export <file>      Export memory data to specified file
  --limit <number>     Limit number of search results (default: 10)

Examples:
  memory                           Show memory statistics
  memory --search "git commands"   Search for git-related entries
  memory --clear                   Clear all stored memory
  memory --export backup.json      Export memory to backup.json
    `.trim();
  }

  /**
   * Execute the memory command
   */
  async execute(
    context: Record<string, unknown>,
    args: string[],
    options: CommandOptions
  ): Promise<CommandResult> {
    try {
      this.logger?.info('Processing memory command');

      // Handle clear operation
      if (options.clear) {
        return await this.handleClear(options);
      }

      // Handle export operation
      if (options.export) {
        return await this.handleExport(options.export as string);
      }

      // Handle search operation
      if (options.search) {
        return await this.handleSearch(
          options.search as string,
          options.limit as number
        );
      }

      // Default: show memory statistics
      return await this.showMemoryStats();
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger?.error('Memory command failed:', errorMessage);

      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  /**
   * Show memory statistics
   */
  private async showMemoryStats(): Promise<CommandResult> {
    try {
      const stats = await this.memoryService.getStats();
      const chalk = require('chalk');

      console.log(chalk.cyan.bold('🧠 Memory Statistics'));
      console.log('');

      console.log(chalk.yellow('Conversations:'), stats.totalConversations);
      console.log(chalk.yellow('Commands:'), stats.totalCommands);
      console.log(
        chalk.yellow('Total Memory Size:'),
        this.formatBytes(stats.memorySize)
      );
      console.log(
        chalk.yellow('Oldest Entry:'),
        stats.oldestEntry
          ? new Date(stats.oldestEntry).toLocaleString()
          : 'None'
      );
      console.log(
        chalk.yellow('Newest Entry:'),
        stats.newestEntry
          ? new Date(stats.newestEntry).toLocaleString()
          : 'None'
      );

      return {
        success: true,
        data: stats,
      };
    } catch (error) {
      throw new Error(
        `Failed to retrieve memory stats: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`
      );
    }
  }

  /**
   * Handle memory search
   */
  private async handleSearch(
    query: string,
    limit: number = 10
  ): Promise<CommandResult> {
    try {
      const [conversations, commands] = await Promise.all([
        this.memoryService.searchConversations(query, limit),
        this.memoryService.searchCommands(query, limit),
      ]);

      const chalk = require('chalk');

      console.log(chalk.cyan.bold(`🔍 Search Results for "${query}"`));
      console.log('');

      const totalResults = conversations.length + commands.length;
      if (totalResults === 0) {
        console.log(chalk.yellow('No results found.'));
        return {
          success: true,
          data: { query, conversations: [], commands: [] },
        };
      }

      if (conversations.length > 0) {
        console.log(chalk.green.bold('Conversations:'));
        conversations.forEach((conv, index) => {
          console.log(
            `  ${index + 1}. ${new Date(conv.timestamp).toLocaleString()}`
          );
          console.log(
            `     Query: ${
              conv.query.length > 60
                ? conv.query.substring(0, 60) + '...'
                : conv.query
            }`
          );
          console.log('');
        });
      }

      if (commands.length > 0) {
        console.log(chalk.blue.bold('Commands:'));
        commands.forEach((cmd, index) => {
          console.log(
            `  ${index + 1}. ${new Date(cmd.timestamp).toLocaleString()}`
          );
          console.log(`     Command: ${cmd.command}`);
          console.log(`     Directory: ${cmd.workingDirectory}`);
          console.log('');
        });
      }

      return {
        success: true,
        data: { query, conversations, commands },
      };
    } catch (error) {
      throw new Error(
        `Search failed: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`
      );
    }
  }

  /**
   * Handle memory clear
   */
  private async handleClear(options: CommandOptions): Promise<CommandResult> {
    try {
      const chalk = require('chalk');

      // Ask for confirmation unless forced
      if (!options.force) {
        const inquirer = require('inquirer');
        const { confirmed } = await inquirer.prompt([
          {
            type: 'confirm',
            name: 'confirmed',
            message:
              'Are you sure you want to clear all memory data? This cannot be undone.',
            default: false,
          },
        ]);

        if (!confirmed) {
          console.log(chalk.yellow('Operation cancelled.'));
          return {
            success: true,
            data: { cleared: false, reason: 'User cancelled' },
          };
        }
      }

      await this.memoryService.clearMemory();
      console.log(chalk.green('✅ Memory cleared successfully.'));

      return {
        success: true,
        data: { cleared: true },
      };
    } catch (error) {
      throw new Error(
        `Failed to clear memory: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`
      );
    }
  }

  /**
   * Handle memory export
   */
  private async handleExport(filePath: string): Promise<CommandResult> {
    try {
      await this.memoryService.exportMemory(filePath);
      const fs = require('fs-extra');
      const chalk = require('chalk');

      // Get file size for display
      const stats = await fs.stat(filePath);
      const fileSize = stats.size;

      console.log(chalk.green(`✅ Memory exported to ${filePath}`));
      console.log(chalk.yellow('Export size:'), this.formatBytes(fileSize));

      return {
        success: true,
        data: {
          exported: true,
          filePath,
          size: fileSize,
        },
      };
    } catch (error) {
      throw new Error(
        `Export failed: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`
      );
    }
  }

  /**
   * Format bytes to human readable format
   */
  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
}
