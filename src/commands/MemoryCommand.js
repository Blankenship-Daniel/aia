/**
 * Memory Command Implementation
 * Shows memory statistics and manages memory operations
 */
const ICommand = require('../interfaces/ICommand');

class MemoryCommand extends ICommand {
  constructor(memoryService, logger) {
    super();
    this.memoryService = memoryService;
    this.logger = logger;
  }

  /**
   * Get command definition
   * @returns {Object} Command definition
   */
  getDefinition() {
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
    };
  }

  /**
   * Execute the memory command
   * @param {Object} context - Execution context
   * @param {Array} args - Command arguments
   * @param {Object} options - Command options
   * @returns {Promise<Object>} Memory information or operation result
   */
  async execute(context, args, options) {
    try {
      this.logger?.info('Processing memory command');

      // Handle clear operation
      if (options.clear) {
        return await this.handleClear(options);
      }

      // Handle export operation
      if (options.export) {
        return await this.handleExport(options.export);
      }

      // Handle search operation
      if (options.search) {
        return await this.handleSearch(options.search);
      }

      // Default: show memory statistics
      return await this.showMemoryStats();
    } catch (error) {
      this.logger?.error('Memory command failed:', error);
      throw error;
    }
  }

  /**
   * Show memory statistics
   * @returns {Promise<Object>} Memory statistics
   */
  async showMemoryStats() {
    const stats = await this.memoryService.getSummary();
    const summary = await this.memoryService.getSummary();

    this.displayMemoryStats(stats, summary);
    return { stats, summary };
  }

  /**
   * Handle memory search
   * @param {string} query - Search query
   * @returns {Promise<Object>} Search results
   */
  async handleSearch(query) {
    const results = await this.memoryService.search(query, 10);
    this.displaySearchResults(query, results);
    return results;
  }

  /**
   * Handle memory clear
   * @param {Object} options - Clear options
   * @returns {Promise<Object>} Clear result
   */
  async handleClear(options) {
    const chalk = require('chalk');
    const inquirer = require('inquirer');

    // Confirm before clearing
    if (!options.force) {
      const answer = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'confirm',
          message:
            'Are you sure you want to clear all memory? This cannot be undone.',
          default: false,
        },
      ]);

      if (!answer.confirm) {
        console.log(chalk.yellow('Memory clear cancelled.'));
        return { cleared: false, reason: 'User cancelled' };
      }
    }

    await this.memoryService.clear();
    console.log(chalk.green('✅ Memory cleared successfully.'));
    return { cleared: true };
  }

  /**
   * Handle memory export
   * @param {string} filename - Export filename
   * @returns {Promise<Object>} Export result
   */
  async handleExport(filename) {
    const chalk = require('chalk');
    const path = require('path');
    const fs = require('fs-extra');

    try {
      const memory = await this.memoryService.getMemory();
      const fullPath = path.resolve(filename);

      await fs.writeJson(fullPath, memory, { spaces: 2 });
      console.log(chalk.green('✅ Memory exported to:'), fullPath);

      return { exported: true, file: fullPath };
    } catch (error) {
      console.log(chalk.red('❌ Export failed:'), error.message);
      throw error;
    }
  }

  /**
   * Display memory statistics
   * @param {Object} stats - Memory statistics
   * @param {Object} summary - Memory summary
   */
  displayMemoryStats(stats, summary) {
    const chalk = require('chalk');

    console.log(chalk.blue.bold('🧠 Memory Statistics'));
    console.log(chalk.gray('─'.repeat(50)));

    // Basic stats
    console.log(chalk.green('💬 Conversations:'), stats.conversations || 0);
    console.log(chalk.green('⚡ Commands:'), stats.commands || 0);
    console.log(
      chalk.green('📦 Total Size:'),
      this.formatBytes(stats.totalSize || 0)
    );
    console.log(chalk.green('📅 Last Updated:'), stats.lastUpdated || 'Never');

    // Memory summary
    if (summary && Object.keys(summary).length > 0) {
      console.log(chalk.gray('─'.repeat(50)));
      console.log(chalk.blue.bold('📋 Summary'));

      Object.entries(summary).forEach(([key, value]) => {
        if (Array.isArray(value)) {
          console.log(chalk.green(key + ':'));
          value.slice(0, 3).forEach((item) => {
            console.log(
              '  • ' + (typeof item === 'string' ? item : JSON.stringify(item))
            );
          });
          if (value.length > 3) {
            console.log(
              '  ' + chalk.gray('... and ' + (value.length - 3) + ' more')
            );
          }
        } else {
          console.log(chalk.green(key + ':'), value);
        }
      });
    }

    console.log(chalk.gray('─'.repeat(50)));
  }

  /**
   * Display search results
   * @param {string} query - Search query
   * @param {Array} results - Search results
   */
  displaySearchResults(query, results) {
    const chalk = require('chalk');

    console.log(chalk.blue.bold('🔍 Search Results for:'), chalk.yellow(query));
    console.log(chalk.gray('─'.repeat(50)));

    if (!results || results.length === 0) {
      console.log(chalk.yellow('No results found.'));
      return;
    }

    results.forEach((result, index) => {
      console.log(
        chalk.green(index + 1 + '.'),
        result.type === 'conversation' ? '💬' : '⚡'
      );

      if (result.type === 'conversation') {
        console.log('   Query:', chalk.cyan(result.query));
        console.log('   Response:', result.response.substring(0, 100) + '...');
      } else {
        console.log('   Command:', chalk.cyan(result.command));
        console.log('   Exit Code:', result.result?.exitCode || 'Unknown');
      }

      console.log('   Time:', chalk.gray(result.timestamp));
      console.log('   Score:', chalk.yellow(result.score?.toFixed(2) || 'N/A'));
      console.log('');
    });

    console.log(chalk.gray('─'.repeat(50)));
  }

  /**
   * Format bytes to human readable string
   * @param {number} bytes - Bytes to format
   * @returns {string} Formatted string
   */
  formatBytes(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
}

module.exports = MemoryCommand;
