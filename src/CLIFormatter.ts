// CLI Formatting and Display Module
// Centralizes all output formatting, colors, and user interface elements

import chalk from 'chalk';
import ora, { Ora } from 'ora';

interface LoadingSpinner {
  spinner: Ora;
  message: string;
}

interface MemoryStats {
  conversations: number;
  commands: number;
  totalSize: number;
  semanticIndexSize: number;
  contextLinks: number;
  lastCleanup?: string;
  compressionNeeded: boolean;
}

interface ContextInfo {
  workingDirectory: string;
  projectType?: string;
  gitStatus?: string;
  dependencies?: string[];
  [key: string]: unknown;
}

export class CLIFormatter {
  private loadingSpinners: Map<string, LoadingSpinner>;

  constructor() {
    this.loadingSpinners = new Map();
  }

  // Enhanced success message display
  public displaySuccess(message: string, details: unknown = null): void {
    console.log(chalk.green('✅ ' + message));
    if (details) {
      if (typeof details === 'string') {
        console.log(chalk.gray('   ' + details));
      } else {
        console.log(chalk.gray('   ' + JSON.stringify(details, null, 2)));
      }
    }
  }

  // Enhanced error display
  public displayError(error: Error | string, context: string = ''): void {
    const errorMessage = error instanceof Error ? error.message : error;

    console.log(chalk.red('❌ Error: ' + errorMessage));

    if (context) {
      console.log(chalk.gray('   Context: ' + context));
    }

    // Display stack trace in debug mode
    if (error instanceof Error && error.stack && process.env.DEBUG) {
      console.log(chalk.red('   Stack trace:'));
      console.log(chalk.gray(error.stack));
    }
  }

  // Enhanced warning display
  public displayWarning(message: string, details: unknown = null): void {
    console.log(chalk.yellow('⚠️  ' + message));
    if (details) {
      if (typeof details === 'string') {
        console.log(chalk.gray('   ' + details));
      } else {
        console.log(chalk.gray('   ' + JSON.stringify(details, null, 2)));
      }
    }
  }

  // Enhanced info display
  public displayInfo(message: string, details: unknown = null): void {
    console.log(chalk.blue('ℹ️  ' + message));
    if (details) {
      if (typeof details === 'string') {
        console.log(chalk.gray('   ' + details));
      } else {
        console.log(chalk.gray('   ' + JSON.stringify(details, null, 2)));
      }
    }
  }

  // Enhanced command suggestion display
  public displayCommandSuggestion(command: string, reason: string): void {
    console.log(chalk.cyan('💡 Suggestion: ' + command));
    console.log(chalk.gray('   Reason: ' + reason));
  }

  // Display loading message with spinner
  public displayLoading(
    message: string,
    options: { spinner?: string; color?: string } = {}
  ): string {
    const spinnerId = this.generateSpinnerId();
    const spinner = ora({
      text: message,
      spinner: (options.spinner as any) || 'dots',
      color: (options.color as any) || 'blue',
    }).start();

    this.loadingSpinners.set(spinnerId, {
      spinner,
      message,
    });

    return spinnerId;
  }

  // Update loading message
  public updateLoading(spinnerId: string, message: string): void {
    const loadingSpinner = this.loadingSpinners.get(spinnerId);
    if (loadingSpinner) {
      loadingSpinner.spinner.text = message;
      loadingSpinner.message = message;
    }
  }

  // Stop loading spinner with success
  public stopLoadingSuccess(spinnerId: string, message: string): void {
    const loadingSpinner = this.loadingSpinners.get(spinnerId);
    if (loadingSpinner) {
      loadingSpinner.spinner.succeed(message);
      this.loadingSpinners.delete(spinnerId);
    }
  }

  // Stop loading spinner with failure
  public stopLoadingError(spinnerId: string, message: string): void {
    const loadingSpinner = this.loadingSpinners.get(spinnerId);
    if (loadingSpinner) {
      loadingSpinner.spinner.fail(message);
      this.loadingSpinners.delete(spinnerId);
    }
  }

  // Stop loading spinner
  public stopLoading(spinnerId: string): void {
    const loadingSpinner = this.loadingSpinners.get(spinnerId);
    if (loadingSpinner) {
      loadingSpinner.spinner.stop();
      this.loadingSpinners.delete(spinnerId);
    }
  }

  // Display memory statistics in a formatted way
  public displayMemoryStats(stats: MemoryStats): void {
    console.log(chalk.blue('\n📊 Memory Statistics'));
    console.log(chalk.gray('─'.repeat(40)));
    console.log(
      chalk.white(
        `Conversations: ${chalk.cyan(stats.conversations.toString())}`
      )
    );
    console.log(
      chalk.white(`Commands: ${chalk.cyan(stats.commands.toString())}`)
    );
    console.log(
      chalk.white(
        `Total Size: ${chalk.cyan(this.formatBytes(stats.totalSize))}`
      )
    );
    console.log(
      chalk.white(
        `Semantic Index: ${chalk.cyan(
          stats.semanticIndexSize.toString()
        )} entries`
      )
    );
    console.log(
      chalk.white(`Context Links: ${chalk.cyan(stats.contextLinks.toString())}`)
    );

    if (stats.lastCleanup) {
      console.log(
        chalk.white(
          `Last Cleanup: ${chalk.cyan(
            new Date(stats.lastCleanup).toLocaleString()
          )}`
        )
      );
    }

    if (stats.compressionNeeded) {
      console.log(chalk.yellow('⚠️  Memory compression recommended'));
    }
  }

  // Display context information
  public displayContext(context: ContextInfo): void {
    console.log(chalk.blue('\n🔍 Current Context'));
    console.log(chalk.gray('─'.repeat(40)));
    console.log(
      chalk.white(`Working Directory: ${chalk.cyan(context.workingDirectory)}`)
    );

    if (context.projectType) {
      console.log(
        chalk.white(`Project Type: ${chalk.cyan(context.projectType)}`)
      );
    }

    if (context.gitStatus) {
      console.log(chalk.white(`Git Status: ${chalk.cyan(context.gitStatus)}`));
    }

    if (context.dependencies && context.dependencies.length > 0) {
      console.log(
        chalk.white(
          `Dependencies: ${chalk.cyan(
            context.dependencies.slice(0, 5).join(', ')
          )}${context.dependencies.length > 5 ? '...' : ''}`
        )
      );
    }
  }

  // Display a divider line
  public displayDivider(length: number = 50, char: string = '─'): void {
    console.log(chalk.gray(char.repeat(length)));
  }

  // Display a header with styling
  public displayHeader(title: string, subtitle?: string): void {
    console.log(chalk.bold.blue(`\n${title}`));
    if (subtitle) {
      console.log(chalk.gray(subtitle));
    }
    this.displayDivider();
  }

  // Display a formatted table
  public displayTable(headers: string[], rows: string[][]): void {
    if (rows.length === 0) {
      console.log(chalk.gray('No data to display'));
      return;
    }

    // Calculate column widths
    const colWidths = headers.map((header, i) => {
      const maxRowWidth = Math.max(...rows.map((row) => (row[i] || '').length));
      return Math.max(header.length, maxRowWidth);
    });

    // Display headers
    const headerRow = headers
      .map((header, i) => chalk.bold.blue(header.padEnd(colWidths[i])))
      .join(' | ');
    console.log(headerRow);

    // Display separator
    const separator = colWidths.map((width) => '─'.repeat(width)).join('─┼─');
    console.log(chalk.gray(separator));

    // Display rows
    rows.forEach((row) => {
      const formattedRow = row
        .map((cell, i) => (cell || '').padEnd(colWidths[i]))
        .join(' | ');
      console.log(formattedRow);
    });
  }

  // Format bytes to human readable format
  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  // Generate unique spinner ID
  private generateSpinnerId(): string {
    return `spinner-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  // Clean up all active spinners
  public cleanup(): void {
    for (const [spinnerId] of this.loadingSpinners) {
      this.stopLoading(spinnerId);
    }
  }

  // Dispose method for DIContainer compatibility
  public dispose(): void {
    this.cleanup();
  }

  // Display progress bar
  public displayProgress(
    current: number,
    total: number,
    message: string = ''
  ): void {
    const percentage = Math.round((current / total) * 100);
    const barLength = 30;
    const filledLength = Math.round((current / total) * barLength);
    const bar = '█'.repeat(filledLength) + '░'.repeat(barLength - filledLength);

    const progressText = `${chalk.blue(bar)} ${chalk.cyan(
      percentage + '%'
    )} (${current}/${total})`;

    if (message) {
      console.log(`${progressText} ${chalk.gray(message)}`);
    } else {
      console.log(progressText);
    }
  }

  // Display key-value pairs in a formatted way
  public displayKeyValue(data: Record<string, unknown>, title?: string): void {
    if (title) {
      this.displayHeader(title);
    }

    Object.entries(data).forEach(([key, value]) => {
      const formattedKey = chalk.white(key + ':');
      let formattedValue: string;

      if (value === null || value === undefined) {
        formattedValue = chalk.gray('(not set)');
      } else if (typeof value === 'boolean') {
        formattedValue = chalk.cyan(value.toString());
      } else if (typeof value === 'number') {
        formattedValue = chalk.cyan(value.toString());
      } else if (Array.isArray(value)) {
        formattedValue = chalk.cyan(`[${value.length} items]`);
      } else if (typeof value === 'object') {
        formattedValue = chalk.cyan(JSON.stringify(value, null, 2));
      } else {
        formattedValue = chalk.cyan(value.toString());
      }

      console.log(`  ${formattedKey} ${formattedValue}`);
    });
  }
}
