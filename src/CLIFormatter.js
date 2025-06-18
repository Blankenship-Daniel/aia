// CLI Formatting and Display Module
// Centralizes all output formatting, colors, and user interface elements

const chalk = require('chalk');
const ora = require('ora');

class CLIFormatter {
  constructor() {
    this.spinners = new Map();
    this.lastSpinnerId = 0;
  }

  // Enhanced success message display
  displaySuccess(message, details = null) {
    console.log(chalk.green('✅', message));
    if (details) {
      if (typeof details === 'string') {
        console.log(chalk.gray('   ', details));
      } else if (Array.isArray(details)) {
        details.forEach((detail) => {
          console.log(chalk.gray('   •', detail));
        });
      } else if (typeof details === 'object') {
        Object.entries(details).forEach(([key, value]) => {
          console.log(chalk.gray(`   ${key}:`), chalk.white(value));
        });
      }
    }
  }

  // Enhanced error display
  displayError(error, context = '') {
    const errorMessage = error.message || error;
    console.log(
      chalk.red('❌', context ? `${context}: ${errorMessage}` : errorMessage)
    );

    if (error.stack && process.env.DEBUG) {
      console.log(chalk.gray(error.stack));
    }

    // Provide helpful suggestions based on error type
    const suggestions = this.getErrorSuggestions(errorMessage);
    if (suggestions.length > 0) {
      console.log(chalk.yellow('\n💡 Suggestions:'));
      suggestions.forEach((suggestion) => {
        console.log(chalk.yellow('   •'), suggestion);
      });
    }
  }

  // Enhanced warning display
  displayWarning(message, details = null) {
    console.log(chalk.yellow('⚠️ ', message));
    if (details) {
      console.log(chalk.gray('   ', details));
    }
  }

  // Enhanced info display
  displayInfo(message, details = null) {
    console.log(chalk.blue('ℹ️ ', message));
    if (details) {
      console.log(chalk.gray('   ', details));
    }
  }

  // Enhanced command suggestion display
  displayCommandSuggestion(command, reason) {
    console.log(chalk.blue('💡 Command suggestion:'), chalk.cyan(command));
    if (reason) {
      console.log(chalk.gray('   Reason:'), reason);
    }
  }

  // Display loading message with spinner
  displayLoading(message, options = {}) {
    const spinnerId = ++this.lastSpinnerId;
    const spinner = ora({
      text: message,
      color: options.color || 'blue',
      ...options,
    }).start();

    this.spinners.set(spinnerId, spinner);
    return spinnerId;
  }

  // Update loading message
  updateLoading(spinnerId, message) {
    const spinner = this.spinners.get(spinnerId);
    if (spinner) {
      spinner.text = message;
    }
  }

  // Stop loading spinner with success
  stopLoadingSuccess(spinnerId, message) {
    const spinner = this.spinners.get(spinnerId);
    if (spinner) {
      spinner.succeed(message);
      this.spinners.delete(spinnerId);
    }
  }

  // Stop loading spinner with failure
  stopLoadingError(spinnerId, message) {
    const spinner = this.spinners.get(spinnerId);
    if (spinner) {
      spinner.fail(message);
      this.spinners.delete(spinnerId);
    }
  }

  // Stop loading spinner
  stopLoading(spinnerId) {
    const spinner = this.spinners.get(spinnerId);
    if (spinner) {
      spinner.stop();
      this.spinners.delete(spinnerId);
    }
  }

  // Display memory statistics in a formatted way
  displayMemoryStats(stats) {
    console.log(chalk.bold('\n📊 Memory Statistics'));
    console.log(chalk.white(`Conversations: ${stats.conversations || 0}`));
    console.log(chalk.white(`Commands: ${stats.commands || 0}`));
    console.log(
      chalk.white(
        `Total Size: ${((stats.totalSize || 0) / 1024).toFixed(2)} KB`
      )
    );
    console.log(
      chalk.white(`Context Links: ${stats.contextLinks || 0} directories`)
    );
    console.log(chalk.white(`Last Cleanup: ${stats.lastCleanup || 'Never'}`));

    if (stats.compressionNeeded) {
      console.log(chalk.yellow('⚠️  Memory compression recommended'));
    } else {
      console.log(chalk.green('✅ Memory size is optimal'));
    }
  }

  // Display context information
  displayContext(context) {
    console.log(chalk.bold('\n🔍 Current Context'));
    console.log(
      chalk.white(`Working Directory: ${context.workingDirectory || 'Unknown'}`)
    );
    console.log(
      chalk.white(
        `Platform: ${context.platform || 'Unknown'} (${
          context.arch || 'Unknown'
        })`
      )
    );
    console.log(chalk.white(`Node.js: ${context.nodeVersion || 'Unknown'}`));
    console.log(chalk.white(`User: ${context.user || 'Unknown'}`));
    console.log(chalk.white(`Shell: ${context.shell || 'Unknown'}`));

    if (context.projectType && context.projectType !== 'unknown') {
      console.log(chalk.white(`Project Type: ${context.projectType}`));
    }

    if (context.gitStatus) {
      console.log(chalk.white(`Git Status: ${context.gitStatus}`));
    }
  }

  // Display plugin information
  displayPluginInfo(plugins) {
    if (plugins.length === 0) {
      console.log(chalk.gray('No plugins installed'));
      return;
    }

    console.log(chalk.bold(`\n🔌 Installed Plugins (${plugins.length})`));
    plugins.forEach((plugin) => {
      console.log(chalk.white(`• ${plugin.name} v${plugin.version}`));
      if (plugin.description) {
        console.log(chalk.gray(`  ${plugin.description}`));
      }
    });
  }

  // Display workflow information
  displayWorkflowInfo(workflows) {
    if (workflows.length === 0) {
      console.log(chalk.gray('No workflows available'));
      return;
    }

    console.log(chalk.bold(`\n⚡ Available Workflows (${workflows.length})`));
    workflows.forEach((workflow) => {
      console.log(chalk.white(`• ${workflow.name}`));
      if (workflow.description) {
        console.log(chalk.gray(`  ${workflow.description}`));
      }
      if (workflow.steps) {
        console.log(chalk.gray(`  ${workflow.steps.length} steps`));
      }
    });
  }

  // Display performance metrics
  displayPerformanceMetrics(metrics) {
    console.log(chalk.bold('\n📈 Performance Metrics'));

    if (metrics.memory) {
      const memoryMB = (metrics.memory.heapUsed / 1024 / 1024).toFixed(2);
      console.log(chalk.white(`Memory Usage: ${memoryMB} MB`));
    }

    if (metrics.cache) {
      console.log(chalk.white(`Cache Size: ${metrics.cache.size} entries`));
      console.log(
        chalk.white(
          `Cache Hit Rate: ${(metrics.cache.hitRate * 100).toFixed(1)}%`
        )
      );
    }

    if (metrics.indexes) {
      console.log(chalk.white(`Active Indexes: ${metrics.indexes.count}`));
    }
  }

  // Format tables with proper alignment
  displayTable(headers, rows, options = {}) {
    const { maxWidth = 80, padding = 2 } = options;

    if (rows.length === 0) {
      console.log(chalk.gray('No data to display'));
      return;
    }

    // Calculate column widths
    const colWidths = headers.map((header, index) => {
      const maxContentWidth = Math.max(
        header.length,
        ...rows.map((row) => String(row[index] || '').length)
      );
      return Math.min(maxContentWidth + padding, maxWidth / headers.length);
    });

    // Display header
    const headerRow = headers
      .map((header, index) => chalk.bold(header.padEnd(colWidths[index])))
      .join('');
    console.log(headerRow);
    console.log(chalk.gray('-'.repeat(headerRow.length)));

    // Display rows
    rows.forEach((row) => {
      const rowStr = row
        .map((cell, index) => String(cell || '').padEnd(colWidths[index]))
        .join('');
      console.log(rowStr);
    });
  }

  // Get error-specific suggestions
  getErrorSuggestions(errorMessage) {
    const suggestions = [];
    const message = errorMessage.toLowerCase();

    if (message.includes('permission denied') || message.includes('eacces')) {
      suggestions.push('Try running with appropriate permissions');
      suggestions.push('Check file/directory ownership and permissions');
    }

    if (message.includes('command not found') || message.includes('enoent')) {
      suggestions.push('Verify the command is installed and in PATH');
      suggestions.push('Check spelling of the command');
    }

    if (message.includes('network') || message.includes('timeout')) {
      suggestions.push('Check your internet connection');
      suggestions.push('Try again in a few moments');
    }

    if (message.includes('api') || message.includes('unauthorized')) {
      suggestions.push('Check your API keys in configuration');
      suggestions.push('Run `aia config` to update credentials');
    }

    if (message.includes('memory') || message.includes('out of memory')) {
      suggestions.push('Try clearing memory with `aia clear-memory`');
      suggestions.push('Close other applications to free up memory');
    }

    return suggestions;
  }

  // Display help information
  displayHelp(sections) {
    sections.forEach((section) => {
      console.log(chalk.bold(`\n${section.title}`));
      if (section.description) {
        console.log(chalk.gray(section.description));
      }

      if (section.items) {
        section.items.forEach((item) => {
          console.log(chalk.white(`  ${item.command || item.name}`));
          if (item.description) {
            console.log(chalk.gray(`    ${item.description}`));
          }
        });
      }
    });
  }

  // Progress bar for long operations
  createProgressBar(total, label = 'Progress') {
    let current = 0;
    const width = 40;

    const update = (increment = 1) => {
      current += increment;
      const percentage = Math.floor((current / total) * 100);
      const filled = Math.floor((current / total) * width);
      const empty = width - filled;

      const bar = '█'.repeat(filled) + '░'.repeat(empty);
      process.stdout.write(`\r${chalk.blue(label)}: [${bar}] ${percentage}%`);

      if (current >= total) {
        console.log(); // New line when complete
      }
    };

    return { update };
  }

  // Clean up all active spinners (useful for graceful shutdown)
  cleanup() {
    this.spinners.forEach((spinner) => spinner.stop());
    this.spinners.clear();
  }
}

module.exports = CLIFormatter;
