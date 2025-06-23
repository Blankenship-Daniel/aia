import {
  ISpinnerService,
  SpinnerInstance,
  SpinnerOptions,
} from '../interfaces/SpinnerService.interface';
import { SpinnerService } from './SpinnerService';
import boxen from 'boxen';
// @ts-ignore - chalk may not have types available
const { Chalk } = require('chalk');
// Instantiate Chalk for color methods in CommonJS context
const chalk = new Chalk({ level: 3 });
import figures from 'figures';

/**
 * Interface for the UI service
 */
export interface IUIService {
  /**
   * Create and start a loading spinner
   * @param message The message to display next to the spinner
   * @param options Optional spinner configuration
   * @returns A spinner instance with control methods
   */
  createLoadingSpinner(
    message: string,
    options?: SpinnerOptions
  ): SpinnerInstance;

  /**
   * Create a progress section with visual hierarchy
   */
  createProgressSection(
    title: string,
    items: Array<{ text: string; status: 'success' | 'pending' | 'error' }>
  ): string;

  /**
   * Create a recommendations panel
   */
  createRecommendationsPanel(
    recommendations: Array<{ title: string; items: string[] }>
  ): string;

  /**
   * Create a summary box with metrics
   */
  createSummaryBox(
    goal: string,
    metrics: {
      status: string;
      iterations: number;
      steps: number;
      successRate: number;
    }
  ): string;

  /**
   * Create an interactive prompt with enhanced styling
   */
  createStyledPrompt(message: string, type: 'confirm' | 'input'): string;

  /**
   * Create a warning or error box
   */
  createAlertBox(message: string, type: 'warning' | 'error' | 'info'): string;
}

/**
 * Unified UI service that integrates all UI components
 * including the SpinnerService and EnhancedUIService
 */
export class UIService implements IUIService {
  private spinnerService: ISpinnerService;

  /**
   * Creates an instance of the class
   * 
   * @param spinnerService? - Parameter description
   */
  constructor(spinnerService?: ISpinnerService) {
    // Use dependency injection pattern or create a default instance
    this.spinnerService = spinnerService || new SpinnerService();
  }

  /**
   * Create and start a loading spinner
   */
  public createLoadingSpinner(
    message: string,
    options?: SpinnerOptions
  ): SpinnerInstance {
    return this.spinnerService.start(message, options);
  }

  /**
   * Create a progress section with visual hierarchy
   */
  public createProgressSection(
    title: string,
    items: Array<{ text: string; status: 'success' | 'pending' | 'error' }>
  ): string {
    const statusIcons = {
      success: chalk.green(figures.tick),
      pending: chalk.yellow(figures.ellipsis),
      error: chalk.red(figures.cross),
    };

    const content = items
      .map((item) => `${statusIcons[item.status]} ${item.text}`)
      .join('\n');

    return boxen(content, {
      padding: 1,
      margin: { top: 1, bottom: 1 },
      borderStyle: 'single',
      borderColor: 'gray',
      title: title,
      titleAlignment: 'left',
    });
  }

  /**
   * Create a recommendations panel
   */
  public createRecommendationsPanel(
    recommendations: Array<{ title: string; items: string[] }>
  ): string {
    let content = '';

    recommendations.forEach((section, index) => {
      if (index > 0) content += '\n';
      content += `${chalk.bold.cyan(`${index + 1}. ${section.title}`)}\n`;
      section.items.forEach((item) => {
        content += `   ${chalk.gray('•')} ${item}\n`;
      });
    });

    return boxen(content, {
      padding: 1,
      margin: { top: 1, bottom: 1 },
      borderStyle: 'round',
      borderColor: 'green',
      title: '💡 Recommendations',
      titleAlignment: 'center',
      width: this.getTerminalWidth() - 4,
    });
  }

  /**
   * Create a summary box with metrics
   */
  public createSummaryBox(
    goal: string,
    metrics: {
      status: string;
      iterations: number;
      steps: number;
      successRate: number;
    }
  ): string {
    const statusColor = metrics.status === 'completed' ? 'green' : 'yellow';
    const statusIcon =
      metrics.status === 'completed' ? figures.tick : figures.warning;

    const content =
      `${chalk[statusColor](statusIcon)} ${chalk.bold(
        metrics.status.toUpperCase()
      )}\n\n` +
      `${chalk.cyan('Goal:')} ${goal}\n` +
      `${chalk.cyan('Iterations:')} ${metrics.iterations}\n` +
      `${chalk.cyan('Steps:')} ${metrics.steps}\n` +
      `${chalk.cyan('Success Rate:')} ${metrics.successRate}%`;

    return boxen(content, {
      padding: 1,
      margin: { top: 1, bottom: 1 },
      borderStyle: 'double',
      borderColor: statusColor,
      title: '📊 Execution Summary',
      titleAlignment: 'center',
    });
  }

  /**
   * Create an interactive prompt with enhanced styling
   */
  public createStyledPrompt(
    message: string,
    type: 'confirm' | 'input' = 'confirm'
  ): string {
    const icon =
      type === 'confirm' ? figures.questionMarkPrefix : figures.pointerSmall;
    return `${chalk.yellow(icon)} ${chalk.bold(message)}`;
  }

  /**
   * Create a warning or error box
   */
  public createAlertBox(
    message: string,
    type: 'warning' | 'error' | 'info' = 'warning'
  ): string {
    const colors = {
      warning: 'yellow',
      error: 'red',
      info: 'blue',
    };

    const icons = {
      warning: figures.warning,
      error: figures.cross,
      info: figures.info,
    };

    const title = type.charAt(0).toUpperCase() + type.slice(1);

    return boxen(message, {
      padding: 1,
      margin: { top: 1, bottom: 1 },
      borderStyle: 'round',
      borderColor: colors[type],
      title: `${icons[type]} ${title}`,
      titleAlignment: 'center',
    });
  }

  /**
   * Get terminal width for responsive layouts
   * @private
   */
  private getTerminalWidth(): number {
    try {
      return process.stdout.columns || 80;
    } catch (error) {
      return 80; // Default width
    }
  }
}
