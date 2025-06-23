/**
 * Agent Execution Engine Interface
 * Handles the core logic of planning and executing agentic workflows
 */
import {
  ContextInfo,
  AgenticExecution,
  ExecutionStep,
  CommandResult,
} from '../types/index';

export interface IAgentExecutionEngine {
  /**
   * Generate an execution plan for a given goal
   */
  planExecution(
    goal: string,
    context: ContextInfo,
    previousExecutions?: AgenticExecution[]
  ): Promise<{
    success: boolean;
    plan?: ExecutionStep[];
    error?: string;
  }>;

  /**
   * Execute a single step in the plan
   */
  executeStep(
    step: ExecutionStep,
    autoExecute: boolean
  ): Promise<{
    success: boolean;
    output?: string;
    error?: string;
    metadata?: Record<string, unknown>;
  }>;

  /**
   * Execute a complete plan with iteration support
   */
  executePlan(
    execution: AgenticExecution,
    options: {
      autoExecute: boolean;
      maxIterations: number;
      noIteration: boolean;
    }
  ): Promise<{
    success: boolean;
    results: unknown[];
    learnings: string[];
  }>;

  /**
   * Validate and verify execution results
   */
  validateResult(
    step: ExecutionStep,
    result: unknown
  ): Promise<{
    valid: boolean;
    confidence: number;
    suggestions?: string[];
  }>;
}
