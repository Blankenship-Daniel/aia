/**
 * Interface for the spinner service
 * Provides a consistent API for loading spinners across the application
 */
export interface ISpinnerService {
  /**
   * Create and start a loading spinner with the given message
   * @param message The message to display next to the spinner
   * @param options Optional configuration for the spinner
   * @returns An object with control methods for the spinner
   */
  start(message: string, options?: SpinnerOptions): SpinnerInstance;

  /**
   * Create a spinner instance without starting it
   * @param message The message to display next to the spinner
   * @param options Optional configuration for the spinner
   * @returns An unstarted spinner instance
   */
  create(message: string, options?: SpinnerOptions): SpinnerInstance;
}

/**
 * Represents a running spinner instance with control methods
 */
export interface SpinnerInstance {
  /**
   * Start the spinner if not already started
   * @returns The spinner instance
   */
  start(): SpinnerInstance;

  /**
   * Stop the spinner and show a success message
   * @param message Optional success message to display
   */
  succeed(message?: string): void;

  /**
   * Stop the spinner and show a failure message
   * @param message Optional failure message to display
   */
  fail(message?: string): void;

  /**
   * Stop the spinner and show a warning message
   * @param message Optional warning message to display
   */
  warn(message?: string): void;

  /**
   * Stop the spinner and show an info message
   * @param message Optional info message to display
   */
  info(message?: string): void;

  /**
   * Stop the spinner without showing any completion state
   */
  stop(): void;

  /**
   * Update the spinner text
   * @param message The new message to display
   * @returns The spinner instance
   */
  text(message: string): SpinnerInstance;

  /**
   * Get the current text of the spinner
   * @returns The current spinner text
   */
  getText(): string;

  /**
   * Get the text with timer if timer is enabled
   * @internal
   * @returns The text with timer
   */
  getTextWithTimer(): string;
}

/**
 * Configuration options for a spinner
 */
export interface SpinnerOptions {
  /**
   * The spinner style to use (e.g., 'dots', 'line', 'dots12')
   * Uses the styles from cli-spinners
   */
  spinner?: string;

  /**
   * The color for the spinner text
   * Uses chalk color names
   */
  color?: string;

  /**
   * Whether to show the elapsed time next to the spinner
   */
  showTimer?: boolean;
}
