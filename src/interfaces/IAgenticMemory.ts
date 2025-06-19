import { AgenticGoal, AgenticExecution } from '../types/index';

/**
 * Agentic Memory Interface
 * SOLID SRP: Focused solely on agentic execution history operations
 * SOLID ISP: Small, focused interface for agentic-specific operations
 */
export interface IAgenticMemory {
  /**
   * Store agentic execution result
   */
  storeAgenticExecution(execution: AgenticExecution): Promise<void>;

  /**
   * Get agentic execution history
   */
  getAgenticHistory(goal?: string): Promise<AgenticGoal[]>;

  /**
   * Search agentic history by query
   */
  searchAgenticHistory(query: string, limit?: number): Promise<AgenticGoal[]>;

  /**
   * Clear all agentic history
   */
  clearAgenticHistory(): Promise<void>;

  /**
   * Get agentic statistics
   */
  getAgenticStats(): Promise<{
    totalGoals: number;
    completedGoals: number;
    failedGoals: number;
    averageStepsPerGoal: number;
  }>;
}
