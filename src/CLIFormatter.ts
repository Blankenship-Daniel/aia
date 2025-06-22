/**
 * CLIFormatter.ts - Centralized CLI output formatting, colors, and user interface elements.
 *
 * Responsibilities:
 * - Provides consistent formatting for success, error, warning, and info messages.
 * - Manages loading spinners and progress indicators for long-running operations.
 * - Handles structured display of memory stats, context info, and command suggestions.
 * - Centralizes all CLI styling and color schemes for maintainability.
 *
 * Exports:
 * - {@link CLIFormatter}: Main formatter class for all CLI output operations.
 *
 * @see chalk - Color and styling library for terminal output.
 * @see ora - Elegant terminal spinner library for loading indicators.
 */

// @ts-ignore - chalk may not have types available
const { Chalk } = require('chalk');
// Instantiate Chalk for color methods in CommonJS context
const chalk = new Chalk({ level: 3 });
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

/**
 * CLIFormatter - Centralized formatting and display system for consistent CLI output.
 *
 * Purpose:
 * - Provides standardized methods for displaying various types of messages and status indicators.
 * - Manages loading spinners with customizable options for long-running operations.
 * - Ensures consistent color schemes and formatting across the entire CLI application.
 * - Handles complex data structures display with proper formatting and indentation.
 *
 * Key Features:
 * - Success, error, warning, and info message formatting.
 * - Loading spinners with progress tracking.
 * - Memory statistics and context information display.
 * - Command suggestion and debugging output.
 *
 * @example
 * const formatter = new CLIFormatter();
 * formatter.displaySuccess('Operation completed successfully');
 * const loaderId = formatter.displayLoading('Processing...');
 * formatter.stopLoading(loaderId);
 */
export class CLIFormatter {
  private loadingSpinners: Map<string, LoadingSpinner>;

  /**
   * Creates an instance of the class
   */
  constructor() {
    this.loadingSpinners = new Map();
  }

  /**
   * Displays a success message with optional details.
   *
   * @param {string} message - The primary success message to display.
   * @param {unknown} [details=null] - Optional additional details to show in gray text.
   *
   * @example
   * formatter.displaySuccess('File saved', { path: '/tmp/output.json' });
   */
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

  /**
   * Displays an error message with context and optional stack trace.
   *
   * @param {Error | string} error - The error object or message to display.
   * @param {string} [context=''] - Optional context information for the error.
   *
   * @example
   * formatter.displayError(new Error('File not found'), 'Loading config');
   */
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

  /**
   * Displays a warning message with optional details.
   *
   * @param {string} message - The warning message to display.
   * @param {unknown} [details=null] - Optional additional warning details.
   *
   * @example
   * formatter.displayWarning('Deprecated API usage', { method: 'oldMethod' });
   */
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

  /**
   * Displays an informational message with optional details.
   *
   * @param {string} message - The informational message to display.
   * @param {unknown} [details=null] - Optional additional information.
   *
   * @example
   * formatter.displayInfo('Configuration loaded', { source: 'config.json' });
   */
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

  /**
   * Displays a command suggestion with reasoning.
   *
   * @param {string} command - The suggested command to display.
   * @param {string} reason - The reason for suggesting this command.
   *
   * @example
   * formatter.displayCommandSuggestion('npm install', 'Missing dependencies detected');
   */
  // Enhanced command suggestion display
  public displayCommandSuggestion(command: string, reason: string): void {
    console.log(chalk.cyan('💡 Suggestion: ' + command));
    console.log(chalk.gray('   Reason: ' + reason));
  }

  /**
   * Starts a loading spinner with customizable options.
   *
   * @param {string} message - The loading message to display.
   * @param {Object} [options={}] - Spinner customization options.
   * @param {string} [options.spinner] - Spinner style (dots, line, etc.).
   * @param {string} [options.color] - Spinner color.
   * @returns {string} Unique identifier for the spinner to stop it later.
   *
   * @example
   * const loaderId = formatter.displayLoading('Processing files...', { color: 'blue' });
   * // Later...
   * formatter.stopLoading(loaderId);
   */
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
  /**
   * Handles updateLoading operation
   * 
   * @param spinnerId - Parameter description
   * @param message - Parameter description
   */
  public updateLoading(spinnerId: string, message: string): void {
    const loadingSpinner = this.loadingSpinners.get(spinnerId);
    if (loadingSpinner) {
      loadingSpinner.spinner.text = message;
      loadingSpinner.message = message;
    }
  }

  // Stop loading spinner with success
  /**
   * Handles stopLoadingSuccess operation
   * 
   * @param spinnerId - Parameter description
   * @param message - Parameter description
   */
  public stopLoadingSuccess(spinnerId: string, message: string): void {
    const loadingSpinner = this.loadingSpinners.get(spinnerId);
    if (loadingSpinner) {
      loadingSpinner.spinner.succeed(message);
      this.loadingSpinners.delete(spinnerId);
    }
  }

  // Stop loading spinner with failure
  /**
   * Handles stopLoadingError operation
   * 
   * @param spinnerId - Parameter description
   * @param message - Parameter description
   */
  public stopLoadingError(spinnerId: string, message: string): void {
    const loadingSpinner = this.loadingSpinners.get(spinnerId);
    if (loadingSpinner) {
      loadingSpinner.spinner.fail(message);
      this.loadingSpinners.delete(spinnerId);
    }
  }

  // Stop loading spinner
  /**
   * Handles stopLoading operation
   * 
   * @param spinnerId - Parameter description
   */
  public stopLoading(spinnerId: string): void {
    const loadingSpinner = this.loadingSpinners.get(spinnerId);
    if (loadingSpinner) {
      loadingSpinner.spinner.stop();
      this.loadingSpinners.delete(spinnerId);
    }
  }

  // Display memory statistics in a formatted way
  /**
   * Handles displayMemoryStats operation
   * 
   * @param stats - Parameter description
   */
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
  /**
   * Handles displayContext operation
   * 
   * @param context - Parameter description
   */
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
  /**
   * Handles displayDivider operation
   * 
   * @param length - Parameter description
   * @param char - Parameter description
   */
  public displayDivider(length: number = 50, char: string = '─'): void {
    console.log(chalk.gray(char.repeat(length)));
  }

  // Display a header with styling
  /**
   * Handles displayHeader operation
   * 
   * @param title - Parameter description
   * @param subtitle? - Parameter description
   */
  public displayHeader(title: string, subtitle?: string): void {
    console.log(chalk.bold.blue(`\n${title}`));
    if (subtitle) {
      console.log(chalk.gray(subtitle));
    }
    this.displayDivider();
  }

  // Display a formatted table
  /**
   * Handles displayTable operation
   * 
   * @param headers - Parameter description
   * @param rows - Parameter description
   */
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
  /**
   * Formats bytes
   * 
   * @param bytes - Parameter description
   * 
   * @returns string - Return value description
   */
  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  // Generate unique spinner ID
  /**
   * Generates spinnerid
   * 
   * @returns string - Return value description
   */
  private generateSpinnerId(): string {
    return `spinner-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  // Clean up all active spinners
  /**
   * Cleans up the operation
   */
  public cleanup(): void {
    for (const [spinnerId] of this.loadingSpinners) {
      this.stopLoading(spinnerId);
    }
  }

  // Dispose method for DIContainer compatibility
  /**
   * Handles dispose operation
   */
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
  /**
   * Handles displayKeyValue operation
   * 
   * @param data - Parameter description
   * @param unknown> - Parameter description
   * @param title? - Parameter description
   */
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
