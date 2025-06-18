/**
 * Workflow Service Interface
 * Defines contract for workflow automation and macro operations
 */
import { AsyncResult } from '../types';

export interface WorkflowStep {
  command: string;
  options?: Record<string, unknown>;
  description?: string;
  timeout?: number;
}

export interface WorkflowData {
  id: string;
  name: string;
  steps: WorkflowStep[];
  started: string;
  completed?: string;
  options: Record<string, unknown>;
}

export interface WorkflowExecutionOptions {
  continueOnError?: boolean;
  timeout?: number;
  variables?: Record<string, unknown>;
}

export interface WorkflowExecutionStepResult {
  step: WorkflowStep;
  result?: unknown;
  error?: string;
  success: boolean;
}

export interface WorkflowExecutionResult {
  workflow: string;
  success: boolean;
  steps: WorkflowExecutionStepResult[];
  duration: number;
  startTime: string;
  endTime: string;
}

export interface WorkflowInfo {
  name: string;
  description?: string;
  stepCount: number;
  created: string;
  lastExecuted?: string;
  executionCount: number;
}

export interface WorkflowListFilters {
  category?: string;
  tag?: string;
  author?: string;
}

export interface WorkflowSchedule {
  id: string;
  workflowName: string;
  schedule: string; // cron expression
  enabled: boolean;
  nextExecution?: string;
}

export interface WorkflowExecutionHistoryEntry {
  workflowName: string;
  executionId: string;
  startTime: string;
  endTime: string;
  success: boolean;
  stepCount: number;
  failedSteps: number;
}

export interface IWorkflowService {
  /**
   * Initialize workflow service
   */
  initialize(): Promise<void>;

  /**
   * Start recording a new workflow
   */
  startRecording(
    workflowName: string,
    options?: Record<string, unknown>
  ): Promise<string>;

  /**
   * Stop recording current workflow
   */
  stopRecording(): Promise<AsyncResult<WorkflowData>>;

  /**
   * Execute a saved workflow
   */
  executeWorkflow(
    workflowName: string,
    options?: WorkflowExecutionOptions
  ): Promise<AsyncResult<WorkflowExecutionResult>>;

  /**
   * Save a workflow
   */
  saveWorkflow(
    workflowName: string,
    workflowData: WorkflowData
  ): Promise<AsyncResult<void>>;

  /**
   * Load a workflow
   */
  loadWorkflow(workflowName: string): Promise<AsyncResult<WorkflowData>>;

  /**
   * Delete a workflow
   */
  deleteWorkflow(workflowName: string): Promise<AsyncResult<void>>;

  /**
   * List all workflows
   */
  listWorkflows(
    filters?: WorkflowListFilters
  ): Promise<AsyncResult<WorkflowInfo[]>>;

  /**
   * Get workflow information
   */
  getWorkflowInfo(workflowName: string): Promise<AsyncResult<WorkflowInfo>>;

  /**
   * Export workflow to file
   */
  exportWorkflow(
    workflowName: string,
    filePath: string,
    format?: string
  ): Promise<AsyncResult<void>>;

  /**
   * Import workflow from file
   */
  importWorkflow(
    filePath: string,
    options?: Record<string, unknown>
  ): Promise<AsyncResult<WorkflowData>>;

  /**
   * Schedule workflow execution
   */
  scheduleWorkflow(
    workflowName: string,
    schedule: string
  ): Promise<AsyncResult<WorkflowSchedule>>;

  /**
   * Unschedule workflow execution
   */
  unscheduleWorkflow(scheduleId: string): Promise<AsyncResult<void>>;

  /**
   * Get execution history
   */
  getExecutionHistory(
    workflowName?: string,
    filters?: Record<string, unknown>
  ): Promise<AsyncResult<WorkflowExecutionHistoryEntry[]>>;

  /**
   * Add step to current recording
   */
  addStep(step: WorkflowStep): Promise<AsyncResult<void>>;
}
