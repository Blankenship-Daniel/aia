import ora, { Ora } from 'ora';
// @ts-ignore - chalk may not have types available
const { Chalk } = require('chalk');
// Instantiate Chalk for color methods in CommonJS context
const chalk = new Chalk({ level: 3 });
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
      /**
       * Handles start operation
       * 
       * @returns SpinnerInstance - Return value description
       */
      start(): SpinnerInstance {
        startTime = Date.now();
        spinner.start();
        return this;
      },

      /**
       * Handles succeed operation
       * 
       * @param message? - Parameter description
       */
      succeed(message?: string): void {
        if (message) {
          currentText = message;
        }
        spinner.succeed(this.getTextWithTimer());
      },

      /**
       * Handles fail operation
       * 
       * @param message? - Parameter description
       */
      fail(message?: string): void {
        if (message) {
          currentText = message;
        }
        spinner.fail(this.getTextWithTimer());
      },

      /**
       * Handles warn operation
       * 
       * @param message? - Parameter description
       */
      warn(message?: string): void {
        if (message) {
          currentText = message;
        }
        spinner.warn(this.getTextWithTimer());
      },

      /**
       * Handles info operation
       * 
       * @param message? - Parameter description
       */
      info(message?: string): void {
        if (message) {
          currentText = message;
        }
        spinner.info(this.getTextWithTimer());
      },

      /**
       * Handles stop operation
       */
      stop(): void {
        spinner.stop();
      },

      /**
       * Handles text operation
       * 
       * @param message - Parameter description
       * 
       * @returns SpinnerInstance - Return value description
       */
      text(message: string): SpinnerInstance {
        currentText = message;
        spinner.text = this.getTextWithTimer();
        return this;
      },

      /**
       * Gets text
       * 
       * @returns string - Return value description
       */
      getText(): string {
        return currentText;
      },

      // Helper method to add timer if enabled
      /**
       * Gets textwithtimer
       * 
       * @returns string - Return value description
       */
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
