import { IAgenticMemory } from '../interfaces/IAgenticMemory';
import { IMemoryPersistence } from '../interfaces/IMemoryPersistence';
import { AgenticGoal, AgenticExecution } from '../types/index';

/**
 * Agentic Memory Service Implementation
 * SOLID SRP: Handles only agentic execution history operations
 * SOLID DIP: Depends on IMemoryPersistence abstraction
 */
export class AgenticMemoryService implements IAgenticMemory {
  constructor(private readonly memoryPersistence: IMemoryPersistence) {}

  /**
   * Store agentic execution result
   */
  async storeAgenticExecution(execution: AgenticExecution): Promise<void> {
    try {
      const memoryData = await this.memoryPersistence.loadMemory();

      if (!memoryData.agenticHistory) {
        memoryData.agenticHistory = [];
      }

      // Find existing goal or create new one
      const existingGoalIndex = memoryData.agenticHistory.findIndex(
        (goal: AgenticGoal) => goal.goal === execution.goal
      );

      if (existingGoalIndex >= 0) {
        // Update existing goal with new execution results
        memoryData.agenticHistory[existingGoalIndex].executionResults.push(
          ...execution.executionResults
        );
        memoryData.agenticHistory[existingGoalIndex].learnings.push(
          ...execution.learnings
        );
        memoryData.agenticHistory[existingGoalIndex].timestamp =
          new Date().toISOString();
      } else {
        // Create new goal
        const newGoal: AgenticGoal = {
          goal: execution.goal,
          plan: execution.plan,
          executionResults: execution.executionResults,
          learnings: execution.learnings,
          timestamp: new Date().toISOString(),
        };
        memoryData.agenticHistory.push(newGoal);
      }

      await this.memoryPersistence.saveMemory(memoryData);
    } catch (error) {
      throw new Error(`Failed to store agentic execution: ${error}`);
    }
  }

  /**
   * Get agentic execution history
   */
  async getAgenticHistory(goal?: string): Promise<AgenticGoal[]> {
    try {
      const memoryData = await this.memoryPersistence.loadMemory();
      let history = memoryData.agenticHistory || [];

      if (goal) {
        history = history.filter((entry: AgenticGoal) =>
          entry.goal.toLowerCase().includes(goal.toLowerCase())
        );
      }

      return history.sort(
        (a, b) =>
          new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );
    } catch (error) {
      throw new Error(`Failed to get agentic history: ${error}`);
    }
  }

  /**
   * Search agentic history by query
   */
  async searchAgenticHistory(
    query: string,
    limit?: number
  ): Promise<AgenticGoal[]> {
    try {
      const memoryData = await this.memoryPersistence.loadMemory();
      const history = memoryData.agenticHistory || [];

      const lowerQuery = query.toLowerCase();
      const results = history.filter(
        (goal: AgenticGoal) =>
          goal.goal.toLowerCase().includes(lowerQuery) ||
          goal.learnings.some((learning) =>
            learning.toLowerCase().includes(lowerQuery)
          ) ||
          goal.executionResults.some(
            (result) =>
              result.output?.toLowerCase().includes(lowerQuery) ||
              result.error?.toLowerCase().includes(lowerQuery)
          )
      );

      // Sort by relevance (timestamp for now)
      results.sort(
        (a, b) =>
          new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );

      return limit ? results.slice(0, limit) : results;
    } catch (error) {
      throw new Error(`Failed to search agentic history: ${error}`);
    }
  }

  /**
   * Clear all agentic history
   */
  async clearAgenticHistory(): Promise<void> {
    try {
      const memoryData = await this.memoryPersistence.loadMemory();
      memoryData.agenticHistory = [];
      await this.memoryPersistence.saveMemory(memoryData);
    } catch (error) {
      throw new Error(`Failed to clear agentic history: ${error}`);
    }
  }

  /**
   * Get agentic statistics
   */
  async getAgenticStats(): Promise<{
    totalGoals: number;
    completedGoals: number;
    failedGoals: number;
    averageStepsPerGoal: number;
  }> {
    try {
      const memoryData = await this.memoryPersistence.loadMemory();
      const history = memoryData.agenticHistory || [];

      const totalGoals = history.length;
      let completedGoals = 0;
      let failedGoals = 0;
      let totalSteps = 0;

      history.forEach((goal: AgenticGoal) => {
        const hasSuccess = goal.executionResults.some(
          (result) => result.success
        );
        const hasFailure = goal.executionResults.some(
          (result) => !result.success
        );

        if (hasSuccess) completedGoals++;
        if (hasFailure && !hasSuccess) failedGoals++;

        totalSteps += goal.plan.length;
      });

      const averageStepsPerGoal = totalGoals > 0 ? totalSteps / totalGoals : 0;

      return {
        totalGoals,
        completedGoals,
        failedGoals,
        averageStepsPerGoal,
      };
    } catch (error) {
      throw new Error(`Failed to get agentic statistics: ${error}`);
    }
  }
}
