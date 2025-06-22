/**
 * Agent Presenter Interface
 * Handles all user interface and presentation concerns for agent operations
 */
import { ExecutionStep, AgenticExecution, CommandResult } from '../types/index';
import { CircuitBreakerState } from './IResilienceService';
import { MethodMetrics, PerformanceAlert } from './IPerformanceMonitor';

// Additional types for enhanced UX
export interface RetryAttemptInfo {
  attempt: number;
  maxRetries: number;
  backoffDelay: number;
  error: string;
}

export interface PerformanceComparison {
  currentExecution: {
    duration: number;
    memoryPeak: number;
    successRate: number;
  };
  previousAverage: {
    duration: number;
    memoryPeak: number;
    successRate: number;
  };
  improvement: {
    durationPercent: number;
    memoryPercent: number;
    successRatePercent: number;
  };
}

export interface IAgentPresenter {
  /**
   * Display the planning phase to the user
   */
  showPlanningPhase(goal: string, verbose?: boolean): void;

  /**
   * Update planning progress indicators
   */
  updatePlanningProgress(
    phase: 'classification' | 'generation' | 'ready'
  ): void;

  /**
   * Display the generated execution plan
   */
  displayExecutionPlan(plan: ExecutionStep[], verbose?: boolean): void;

  /**
   * Show execution progress for a step
   */
  showExecutionStep(
    step: ExecutionStep,
    verbose?: boolean
  ): {
    succeed: (message?: string) => void;
    fail: (message?: string) => void;
    stop: () => void;
    updateProgress: (elapsed: number, details?: string) => void;
  };

  /**
   * Show iteration progress
   */
  showIteration(current: number, max: number, verbose?: boolean): void;

  /**
   * Display step output
   */
  displayStepOutput(output: string, verbose?: boolean): void;

  /**
   * Show execution summary
   */
  displayExecutionSummary(
    execution: AgenticExecution,
    verbose?: boolean
  ): Promise<void>;

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

  // ========== Phase 1 Enhancements ==========

  /**
   * Display circuit breaker status to user
   */
  displayCircuitBreakerStatus(
    commandName: string,
    state: CircuitBreakerState
  ): void;

  /**
   * Show retry attempt with backoff information
   */
  displayRetryAttempt(retryInfo: RetryAttemptInfo): void;

  /**
   * Display timeout warning with countdown
   */
  displayTimeoutWarning(remainingSeconds: number, operation: string): void;

  /**
   * Display enhanced error with context and recovery suggestions
   */
  displayEnhancedError(
    error: Error,
    context: {
      commandName?: string;
      circuitBreakerState?: CircuitBreakerState;
      recoveryActions?: string[];
      errorType?: string;
      severity?: string;
      recoverable?: boolean;
    }
  ): void;

  /**
   * Utility method to display enhanced error from command execution
   */
  displayEnhancedErrorFromCommandExecution(
    error: Error,
    commandName: string,
    args: string[],
    context: {
      phase?: string;
      context?: string;
      step?: string;
      operation?: string;
    }
  ): void;

  /**
   * Display retry attempt feedback
   */
  displayRetryInProgress(
    attemptNumber: number,
    maxAttempts: number,
    operation: string,
    lastError: Error
  ): void;

  /**
   * Display timeout warning for an operation
   */
  displayTimeoutWarningForOperation(
    operation: string,
    timeoutMs: number,
    currentDuration: number
  ): void;

  /**
   * Display performance comparison with previous runs
   */
  displayPerformanceComparison(
    comparison: PerformanceComparison,
    methodMetrics?: MethodMetrics[],
    alerts?: PerformanceAlert[]
  ): void;

  /**
   * Display resilience service status (circuit breakers, retries, etc.)
   */
  displayResilienceStatus(stats: Record<string, CircuitBreakerState>): void;
}
