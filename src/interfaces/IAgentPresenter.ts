/**
 * Agent Presenter Interface
 * Handles all user interface and presentation concerns for agent operations
 */
import { ExecutionStep, AgenticExecution, CommandResult } from '../types/index';

export interface IAgentPresenter {
  /**
   * Display the planning phase to the user
   */
  showPlanningPhase(goal: string): void;

  /**
   * Display the generated execution plan
   */
  displayExecutionPlan(plan: ExecutionStep[]): void;

  /**
   * Show execution progress for a step
   */
  showExecutionStep(step: ExecutionStep): {
    succeed: (message?: string) => void;
    fail: (message?: string) => void;
    stop: () => void;
    updateProgress: (elapsed: number, details?: string) => void;
  };

  /**
   * Show iteration progress
   */
  showIteration(current: number, max: number): void;

  /**
   * Display step output
   */
  displayStepOutput(output: string): void;

  /**
   * Show execution summary
   */
  displayExecutionSummary(execution: AgenticExecution): void;

  /**
   * Display error messages
   */
  displayError(error: string, context?: Record<string, unknown>): void;

  /**
   * Display warnings
   */
  displayWarning(message: string): void;

  /**
   * Display success messages
   */
  displaySuccess(message: string): void;

  /**
   * Ask for user confirmation
   */
  askConfirmation(message: string, defaultValue?: boolean): Promise<boolean>;

  /**
   * Format execution summary for output
   */
  formatExecutionSummary(execution: AgenticExecution): string;
}
