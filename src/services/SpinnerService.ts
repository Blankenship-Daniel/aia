import ora, { Ora } from 'ora';
import chalk from 'chalk';
import cliSpinners from 'cli-spinners';
import figures from 'figures';
import {
  ISpinnerService,
  SpinnerInstance,
  SpinnerOptions,
} from '../interfaces/SpinnerService.interface';

// Type to ensure typesafety when accessing spinner types
type SpinnerType = keyof typeof cliSpinners;

/**
 * Implementation of the SpinnerService
 * Provides a consistent way to create loading spinners across the application
 */
export class SpinnerService implements ISpinnerService {
  /**
   * Create and start a loading spinner with the given message
   * @param message The message to display next to the spinner
   * @param options Optional configuration for the spinner
   * @returns A SpinnerInstance with control methods
   */
  public start(message: string, options?: SpinnerOptions): SpinnerInstance {
    const spinner = this.create(message, options);
    return spinner.start();
  }

  /**
   * Create a spinner instance without starting it
   * @param message The message to display next to the spinner
   * @param options Optional configuration for the spinner
   * @returns An unstarted SpinnerInstance
   */
  public create(message: string, options?: SpinnerOptions): SpinnerInstance {
    const spinnerType = options?.spinner || 'dots';
    const color = options?.color || 'cyan';
    const showTimer = options?.showTimer || false;

    // Use ora with selected spinner type from cli-spinners
    const spinner = ora({
      text: message,
      spinner: cliSpinners[spinnerType as SpinnerType] || cliSpinners.dots,
      color: color as any,
    });

    let startTime: number | null = null;
    let currentText = message;

    // Return our wrapper around ora that implements SpinnerInstance
    return {
      start(): SpinnerInstance {
        startTime = Date.now();
        spinner.start();
        return this;
      },

      succeed(message?: string): void {
        if (message) {
          currentText = message;
        }
        spinner.succeed(this.getTextWithTimer());
      },

      fail(message?: string): void {
        if (message) {
          currentText = message;
        }
        spinner.fail(this.getTextWithTimer());
      },

      warn(message?: string): void {
        if (message) {
          currentText = message;
        }
        spinner.warn(this.getTextWithTimer());
      },

      info(message?: string): void {
        if (message) {
          currentText = message;
        }
        spinner.info(this.getTextWithTimer());
      },

      stop(): void {
        spinner.stop();
      },

      text(message: string): SpinnerInstance {
        currentText = message;
        spinner.text = this.getTextWithTimer();
        return this;
      },

      getText(): string {
        return currentText;
      },

      // Helper method to add timer if enabled
      getTextWithTimer(): string {
        if (!showTimer || !startTime) return currentText;

        const elapsed = Date.now() - startTime;
        let timeText: string;

        if (elapsed < 1000) {
          timeText = `${elapsed}ms`;
        } else if (elapsed < 60000) {
          timeText = `${(elapsed / 1000).toFixed(1)}s`;
        } else {
          const minutes = Math.floor(elapsed / 60000);
          const seconds = Math.floor((elapsed % 60000) / 1000);
          timeText = `${minutes}m ${seconds}s`;
        }

        return `${currentText} ${chalk.dim(`(${timeText})`)}`;
      },
    };
  }
}
