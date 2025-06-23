/**
 * Interface for interactive execution control during agent operations
 */
export interface IExecutionController {
  /**
   * Pause execution and wait for user input
   */
  pause(reason?: string): Promise<void>;

  /**
   * Resume paused execution
   */
  resume(): void;

  /**
   * Stop execution gracefully
   */
  stop(reason?: string): void;

  /**
   * Ask user for step-by-step confirmation
   */
  enableStepMode(): void;

  /**
   * Disable step-by-step mode
   */
  disableStepMode(): void;

  /**
   * Check if execution is paused
   */
  isPaused(): boolean;

  /**
   * Check if execution should stop
   */
  shouldStop(): boolean;

  /**
   * Check if in step-by-step mode
   */
  isStepMode(): boolean;

  /**
   * Get current execution state
   */
  getState(): {
    paused: boolean;
    stopped: boolean;
    stepMode: boolean;
    reason?: string;
  };
}
