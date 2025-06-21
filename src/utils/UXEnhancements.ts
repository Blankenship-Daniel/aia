import gradient from 'gradient-string';
import figures from 'figures';
import terminalSize from 'terminal-size';
import notifier from 'node-notifier';
import chalk from 'chalk';
import boxen from 'boxen';

/**
 * Phase 2 UX Enhancement Utilities
 * Advanced branding, cross-platform symbols, responsive layouts, and notifications
 */

export class UXEnhancements {
  /**
   * Get terminal dimensions for responsive layout
   */
  public static getTerminalSize() {
    try {
      return terminalSize();
    } catch (error) {
      // Fallback for environments where terminal size can't be detected
      return { columns: 80, rows: 24 };
    }
  }

  /**
   * Create gradient headers for branding
   */
  public static createGradientHeader(
    text: string,
    theme: 'primary' | 'success' | 'warning' | 'error' = 'primary'
  ): string {
    const gradients = {
      primary: gradient(['#667eea', '#764ba2']),
      success: gradient(['#11998e', '#38ef7d']),
      warning: gradient(['#ffd89b', '#19547b']),
      error: gradient(['#ff9a9e', '#fecfef']),
    };

    const selectedGradient = gradients[theme];
    return selectedGradient(text);
  }

  /**
   * Get cross-platform symbols using figures
   */
  public static getSymbol(
    type:
      | 'success'
      | 'error'
      | 'warning'
      | 'info'
      | 'loading'
      | 'pointer'
      | 'bullet'
      | 'heart'
      | 'star'
      | 'play'
      | 'stop'
  ): string {
    const symbols = {
      success: figures.tick,
      error: figures.cross,
      warning: figures.warning,
      info: figures.info,
      loading: figures.ellipsis,
      pointer: figures.pointer,
      bullet: figures.bullet,
      heart: figures.heart,
      star: figures.star,
      play: figures.play,
      stop: figures.square,
    };

    return symbols[type] || figures.bullet;
  }

  /**
   * Create responsive boxed content based on terminal width
   */
  public static createResponsiveBox(
    content: string,
    title?: string,
    options: any = {}
  ): string {
    const { columns } = this.getTerminalSize();
    const maxWidth = Math.min(columns - 4, 120); // Leave some margin

    const boxOptions = {
      padding: 1,
      margin: 1,
      borderStyle: 'round',
      borderColor: 'cyan',
      width: maxWidth,
      ...options,
    };

    if (title) {
      boxOptions.title = title;
      boxOptions.titleAlignment = 'center';
    }

    return boxen(content, boxOptions);
  }

  /**
   * Create branded header with gradient and symbols
   */
  public static createBrandedHeader(
    text: string,
    theme: 'primary' | 'success' | 'warning' | 'error' = 'primary'
  ): string {
    const symbol = this.getSymbol(theme === 'primary' ? 'star' : theme);
    const gradientText = this.createGradientHeader(
      ` ${symbol} ${text} ${symbol} `,
      theme
    );

    return this.createResponsiveBox(gradientText, undefined, {
      textAlignment: 'center',
      borderColor: theme === 'primary' ? 'magenta' : theme,
      borderStyle: 'double',
    });
  }

  /**
   * Show desktop notification for long-running operations
   */
  public static showNotification(
    title: string,
    message: string,
    type: 'info' | 'success' | 'fail' | 'warn' = 'info',
    timeout: number = 5000
  ): void {
    try {
      notifier.notify({
        title,
        message,
      });
    } catch (error) {
      // Silently fail if notifications aren't supported
      console.log(chalk.dim(`[Notification] ${title}: ${message}`));
    }
  }

  /**
   * Get appropriate notification icon path
   */
  private static getNotificationIcon(type: string): string | undefined {
    // Return undefined to use system defaults
    // In a production app, you might want to include custom icons
    return undefined;
  }

  /**
   * Create status indicator with symbol and color
   */
  public static createStatusIndicator(
    status: 'success' | 'error' | 'warning' | 'info' | 'loading',
    text: string
  ): string {
    const symbol = this.getSymbol(status);
    const colors = {
      success: chalk.green,
      error: chalk.red,
      warning: chalk.yellow,
      info: chalk.blue,
      loading: chalk.cyan,
    };

    const colorFn = colors[status];
    return `${colorFn(symbol)} ${text}`;
  }

  /**
   * Create progress indicator with symbols
   */
  public static createProgressIndicator(
    current: number,
    total: number,
    label?: string
  ): string {
    const percentage = Math.round((current / total) * 100);
    const filledBars = Math.round((current / total) * 20);
    const emptyBars = 20 - filledBars;

    const filled = this.getSymbol('bullet').repeat(filledBars);
    const empty = figures.line.repeat(emptyBars);
    const progressBar = `${filled}${empty}`;

    const percentageText = `${percentage}%`;
    const statusText = label ? ` ${label}` : '';

    return `${chalk.cyan(progressBar)} ${chalk.bold(
      percentageText
    )}${statusText}`;
  }

  /**
   * Create multi-column layout for responsive display
   */
  public static createMultiColumnLayout(
    items: string[],
    columns?: number
  ): string {
    const { columns: terminalColumns } = this.getTerminalSize();
    const actualColumns =
      columns || Math.max(1, Math.floor(terminalColumns / 25));

    const rows: string[][] = [];
    for (let i = 0; i < items.length; i += actualColumns) {
      rows.push(items.slice(i, i + actualColumns));
    }

    return rows
      .map((row) => row.map((item) => item.padEnd(20)).join('  '))
      .join('\n');
  }

  /**
   * Create timing display with appropriate symbols
   */
  public static createTimingDisplay(milliseconds: number): string {
    const symbol = this.getSymbol('info');
    let timeText: string;

    if (milliseconds < 1000) {
      timeText = `${milliseconds}ms`;
    } else if (milliseconds < 60000) {
      timeText = `${(milliseconds / 1000).toFixed(1)}s`;
    } else {
      const minutes = Math.floor(milliseconds / 60000);
      const seconds = Math.floor((milliseconds % 60000) / 1000);
      timeText = `${minutes}m ${seconds}s`;
    }

    return `${chalk.dim(symbol)} ${chalk.dim(timeText)}`;
  }

  /**
   * Create feature announcement with gradient styling
   */
  public static createFeatureAnnouncement(
    feature: string,
    description: string
  ): string {
    const title = this.createGradientHeader(`✨ NEW: ${feature}`);
    const content = `${this.getSymbol('info')} ${description}`;

    return this.createResponsiveBox(`${title}\n\n${content}`, undefined, {
      borderColor: 'magenta',
      borderStyle: 'double',
    });
  }
}
