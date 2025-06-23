/**
 * Workflow Service Implementation
 * Manages workflow automation and macro operations
 */
import {
  IWorkflowService,
  WorkflowStep,
  WorkflowData,
  WorkflowExecutionOptions,
  WorkflowExecutionResult,
  WorkflowExecutionStepResult,
  WorkflowInfo,
  WorkflowListFilters,
  WorkflowSchedule,
  WorkflowExecutionHistoryEntry,
} from '../interfaces/IWorkflowService';
import { IConfigurationService } from '../interfaces/IConfigurationService';
import { ICommandService } from '../interfaces/ICommandService';
import { IMemoryService } from '../interfaces/IMemoryService';
import { AsyncResult } from '../types';

/**
 * WorkflowService class
 * 
 * TODO: Add class description
 */
export class WorkflowService implements IWorkflowService {
  private configService: IConfigurationService;
  private commandService: ICommandService;
  private memoryService: IMemoryService;
  private workflows: Map<string, WorkflowData>;
  private currentRecording: WorkflowData | null;
  private initialized: boolean;
  private executionHistory: WorkflowExecutionHistoryEntry[];
  private schedules: Map<string, WorkflowSchedule>;

  constructor(
    configurationService: IConfigurationService,
    commandService: ICommandService,
    memoryService: IMemoryService
  ) {
    this.configService = configurationService;
    this.commandService = commandService;
    this.memoryService = memoryService;
    this.workflows = new Map();
    this.currentRecording = null;
    this.initialized = false;
    this.executionHistory = [];
    this.schedules = new Map();
  }

  /**
   * Initialize workflow service
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    this.initialized = true;
  }

  /**
   * Start recording a new workflow
   */
  async startRecording(
    workflowName: string,
    options: Record<string, unknown> = {}
  ): Promise<string> {
    this.currentRecording = {
      id: this.generateId(),
      name: workflowName,
      steps: [],
      started: new Date().toISOString(),
      options,
    };

    console.log(`Started recording workflow: ${workflowName}`);
    return this.currentRecording.id;
  }

  /**
   * Stop recording current workflow
   */
  async stopRecording(): Promise<AsyncResult<WorkflowData>> {
    try {
      if (!this.currentRecording) {
        return {
          success: false,
          error: 'No active recording to stop',
        };
      }

      const workflow: WorkflowData = {
        ...this.currentRecording,
        completed: new Date().toISOString(),
      };

      this.workflows.set(workflow.name, workflow);
      this.currentRecording = null;

      console.log(`Stopped recording workflow: ${workflow.name}`);

      return {
        success: true,
        data: workflow,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Execute a saved workflow with enhanced error handling
   */
  async executeWorkflow(
    workflowName: string,
    options: WorkflowExecutionOptions = {}
  ): Promise<AsyncResult<WorkflowExecutionResult>> {
    try {
      const workflow = this.workflows.get(workflowName);
      if (!workflow) {
        return {
          success: false,
          error: `Workflow '${workflowName}' not found`,
        };
      }

      const startTime = new Date().toISOString();
      const results: WorkflowExecutionStepResult[] = [];

      console.log(`Executing workflow: ${workflowName}`);

      // Enhanced execution with better error handling
      for (const [index, step] of workflow.steps.entries()) {
        console.log(
          `Executing step ${index + 1}/${workflow.steps.length}: ${
            step.description || step.command
          }`
        );

        try {
          // Execute step with retry and timeout
          const result = await this.executeStepWithRetry(step, options);
          results.push({ step, result, success: true });

          console.log(`✅ Step ${index + 1} completed successfully`);
        } catch (error) {
          const errorMessage =
            error instanceof Error ? error.message : 'Unknown error';
          console.log(`❌ Step ${index + 1} failed: ${errorMessage}`);

          results.push({ step, error: errorMessage, success: false });

          // Enhanced error handling decision
          if (!options.continueOnError) {
            // Check if this is a recoverable error
            const isRecoverable = this.isRecoverableError(errorMessage);
            if (!isRecoverable) {
              console.log(
                `🛑 Non-recoverable error, stopping workflow execution`
              );
              break;
            } else {
              console.log(`⚠️  Recoverable error, attempting to continue...`);
            }
          }
        }
      }

      const endTime = new Date().toISOString();
      const duration =
        new Date(endTime).getTime() - new Date(startTime).getTime();

      const executionResult: WorkflowExecutionResult = {
        workflow: workflowName,
        success: this.calculateWorkflowSuccess(results),
        steps: results,
        duration,
        startTime,
        endTime,
      };

      // Add to execution history
      this.executionHistory.push({
        workflowName,
        executionId: this.generateId(),
        startTime,
        endTime,
        success: executionResult.success,
        stepCount: workflow.steps.length,
        failedSteps: results.filter((r) => !r.success).length,
      });

      // Log execution summary
      this.logExecutionSummary(executionResult);

      return {
        success: true,
        data: executionResult,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Save a workflow
   */
  async saveWorkflow(
    workflowName: string,
    workflowData: WorkflowData
  ): Promise<AsyncResult<void>> {
    try {
      this.workflows.set(workflowName, workflowData);
      console.log(`Workflow '${workflowName}' saved`);

      return {
        success: true,
        data: undefined,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Load a workflow
   */
  async loadWorkflow(workflowName: string): Promise<AsyncResult<WorkflowData>> {
    try {
      const workflow = this.workflows.get(workflowName);
      if (!workflow) {
        return {
          success: false,
          error: `Workflow '${workflowName}' not found`,
        };
      }

      return {
        success: true,
        data: workflow,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Delete a workflow
   */
  async deleteWorkflow(workflowName: string): Promise<AsyncResult<void>> {
    try {
      if (!this.workflows.has(workflowName)) {
        return {
          success: false,
          error: `Workflow '${workflowName}' not found`,
        };
      }

      this.workflows.delete(workflowName);
      console.log(`Workflow '${workflowName}' deleted`);

      return {
        success: true,
        data: undefined,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * List all workflows
   */
  async listWorkflows(
    filters: WorkflowListFilters = {}
  ): Promise<AsyncResult<WorkflowInfo[]>> {
    try {
      const workflowInfos: WorkflowInfo[] = Array.from(
        this.workflows.values()
      ).map((workflow) => {
        const executions = this.executionHistory.filter(
          (h) => h.workflowName === workflow.name
        );
        return {
          name: workflow.name,
          description:
            (workflow.options.description as string) || 'No description',
          stepCount: workflow.steps.length,
          created: workflow.started,
          lastExecuted:
            executions.length > 0
              ? executions[executions.length - 1].endTime
              : undefined,
          executionCount: executions.length,
        };
      });

      return {
        success: true,
        data: workflowInfos,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Get workflow information
   */
  async getWorkflowInfo(
    workflowName: string
  ): Promise<AsyncResult<WorkflowInfo>> {
    try {
      const workflow = this.workflows.get(workflowName);
      if (!workflow) {
        return {
          success: false,
          error: `Workflow '${workflowName}' not found`,
        };
      }

      const executions = this.executionHistory.filter(
        (h) => h.workflowName === workflowName
      );
      const workflowInfo: WorkflowInfo = {
        name: workflow.name,
        description:
          (workflow.options.description as string) || 'No description',
        stepCount: workflow.steps.length,
        created: workflow.started,
        lastExecuted:
          executions.length > 0
            ? executions[executions.length - 1].endTime
            : undefined,
        executionCount: executions.length,
      };

      return {
        success: true,
        data: workflowInfo,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Export workflow to file
   */
  async exportWorkflow(
    workflowName: string,
    filePath: string,
    format: string = 'json'
  ): Promise<AsyncResult<void>> {
    try {
      const workflow = this.workflows.get(workflowName);
      if (!workflow) {
        return {
          success: false,
          error: `Workflow '${workflowName}' not found`,
        };
      }

      // Placeholder implementation
      console.log(
        `Exporting workflow '${workflowName}' to ${filePath} in ${format} format`
      );

      return {
        success: true,
        data: undefined,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Import workflow from file
   */
  async importWorkflow(
    filePath: string,
    options: Record<string, unknown> = {}
  ): Promise<AsyncResult<WorkflowData>> {
    try {
      // Placeholder implementation
      const mockWorkflow: WorkflowData = {
        id: this.generateId(),
        name: 'imported-workflow',
        steps: [],
        started: new Date().toISOString(),
        options,
      };

      this.workflows.set(mockWorkflow.name, mockWorkflow);
      console.log(`Imported workflow from ${filePath}`);

      return {
        success: true,
        data: mockWorkflow,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Schedule workflow execution
   */
  async scheduleWorkflow(
    workflowName: string,
    schedule: string
  ): Promise<AsyncResult<WorkflowSchedule>> {
    try {
      if (!this.workflows.has(workflowName)) {
        return {
          success: false,
          error: `Workflow '${workflowName}' not found`,
        };
      }

      const scheduleData: WorkflowSchedule = {
        id: this.generateId(),
        workflowName,
        schedule,
        enabled: true,
        nextExecution: new Date(Date.now() + 60000).toISOString(), // Mock next execution in 1 minute
      };

      this.schedules.set(scheduleData.id, scheduleData);
      console.log(
        `Scheduled workflow '${workflowName}' with cron: ${schedule}`
      );

      return {
        success: true,
        data: scheduleData,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Unschedule workflow execution
   */
  async unscheduleWorkflow(scheduleId: string): Promise<AsyncResult<void>> {
    try {
      if (!this.schedules.has(scheduleId)) {
        return {
          success: false,
          error: `Schedule '${scheduleId}' not found`,
        };
      }

      this.schedules.delete(scheduleId);
      console.log(`Unscheduled workflow with ID: ${scheduleId}`);

      return {
        success: true,
        data: undefined,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Get execution history
   */
  async getExecutionHistory(
    workflowName?: string,
    filters: Record<string, unknown> = {}
  ): Promise<AsyncResult<WorkflowExecutionHistoryEntry[]>> {
    try {
      let history = this.executionHistory;

      if (workflowName) {
        history = history.filter((h) => h.workflowName === workflowName);
      }

      return {
        success: true,
        data: history,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Add step to current recording
   */
  async addStep(step: WorkflowStep): Promise<AsyncResult<void>> {
    try {
      if (!this.currentRecording) {
        return {
          success: false,
          error: 'No active recording to add step to',
        };
      }

      this.currentRecording.steps.push(step);
      console.log(`Added step to recording: ${step.command}`);

      return {
        success: true,
        data: undefined,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Generate unique ID
   */
  private generateId(): string {
    return `workflow_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Execute a workflow step with retry logic
   */
  private async executeStepWithRetry(
    step: WorkflowStep,
    options: WorkflowExecutionOptions
  ): Promise<unknown> {
    const maxRetries = 3;
    let lastError: Error;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        // Execute step using command service
        const result = await this.commandService.executeCommand(
          step.command,
          step.options || {}
        );
        return result;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        // Don't retry certain types of errors
        if (this.shouldNotRetry(lastError.message)) {
          throw lastError;
        }

        if (attempt === maxRetries) {
          throw lastError;
        }

        // Wait before retry with exponential backoff
        const delay = Math.min(1000 * Math.pow(2, attempt - 1), 5000);
        console.log(
          `⏳ Step failed, retrying in ${delay}ms (attempt ${attempt}/${maxRetries})`
        );
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }

    throw lastError!;
  }

  /**
   * Determine if an error should not be retried
   */
  private shouldNotRetry(errorMessage: string): boolean {
    const nonRetryableErrors = [
      'command not found',
      'permission denied',
      'user declined',
      'file not found',
      'directory not found',
      'syntax error',
      'invalid argument',
    ];

    return nonRetryableErrors.some((error) =>
      errorMessage.toLowerCase().includes(error)
    );
  }

  /**
   * Determine if an error is recoverable
   */
  private isRecoverableError(errorMessage: string): boolean {
    const recoverableErrors = [
      'timeout',
      'network',
      'connection',
      'temporary',
      'busy',
      'locked',
    ];

    return recoverableErrors.some((error) =>
      errorMessage.toLowerCase().includes(error)
    );
  }

  /**
   * Calculate overall workflow success based on step results
   */
  private calculateWorkflowSuccess(
    results: WorkflowExecutionStepResult[]
  ): boolean {
    if (results.length === 0) return false;

    const successfulSteps = results.filter((r) => r.success).length;
    const successRate = successfulSteps / results.length;

    // Consider workflow successful if at least 70% of steps succeed
    // and no critical failures occurred
    return successRate >= 0.7 && !this.hasCriticalFailures(results);
  }

  /**
   * Check if there are critical failures in the results
   */
  private hasCriticalFailures(results: WorkflowExecutionStepResult[]): boolean {
    return results.some(
      (r) => !r.success && this.isCriticalFailure(r.error || '')
    );
  }

  /**
   * Determine if a failure is critical
   */
  private isCriticalFailure(errorMessage: string): boolean {
    const criticalErrors = [
      'permission denied',
      'access denied',
      'authentication failed',
      'authorization failed',
      'security violation',
    ];

    return criticalErrors.some((error) =>
      errorMessage.toLowerCase().includes(error)
    );
  }

  /**
   * Log execution summary with enhanced details
   */
  private logExecutionSummary(result: WorkflowExecutionResult): void {
    const { workflow, success, steps, duration } = result;
    const successfulSteps = steps.filter((s) => s.success).length;
    const successRate = Math.round((successfulSteps / steps.length) * 100);

    console.log('\n📊 Workflow Execution Summary:');
    console.log(`   Workflow: ${workflow}`);
    console.log(`   Overall Status: ${success ? '✅ Success' : '❌ Failed'}`);
    console.log(
      `   Steps Completed: ${successfulSteps}/${steps.length} (${successRate}%)`
    );
    console.log(`   Duration: ${duration}ms`);

    if (!success) {
      const failedSteps = steps.filter((s) => !s.success);
      console.log(`   Failed Steps: ${failedSteps.length}`);
      failedSteps.forEach((step, index) => {
        console.log(`     ${index + 1}. ${step.step.command}: ${step.error}`);
      });
    }
  }
}
