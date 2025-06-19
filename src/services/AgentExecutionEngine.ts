/**
 * Agent Execution Engine Implementation
 * Core logic for planning and executing agentic workflows
 */
import { IAgentExecutionEngine } from '../interfaces/IAgentExecutionEngine';
import { IAIService } from '../interfaces/IAIService';
import { IContextService } from '../interfaces/IContextService';
import { ICommandService } from '../interfaces/ICommandService';
import {
  ContextInfo,
  AgenticExecution,
  ExecutionStep,
  CommandResult,
} from '../types/index';

export class AgentExecutionEngine implements IAgentExecutionEngine {
  private readonly AI_CALL_TIMEOUT_MS = 30000;
  private readonly STEP_TIMEOUT_MS = 60000;

  constructor(
    private aiService: IAIService,
    private contextService: IContextService,
    private commandService: ICommandService
  ) {}

  async planExecution(
    goal: string,
    context: ContextInfo,
    previousExecutions: AgenticExecution[] = []
  ): Promise<{
    success: boolean;
    plan?: ExecutionStep[];
    error?: string;
  }> {
    try {
      const prompt = this.buildPlanningPrompt(
        goal,
        context,
        previousExecutions
      );

      const response = await this.aiService.queryAI(prompt, context);

      if (!response || !response.content) {
        return {
          success: false,
          error: 'Failed to generate plan - no response from AI service',
        };
      }

      const plan = this.parsePlanFromResponse(response.content);

      return {
        success: true,
        plan,
      };
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error ? error.message : 'Plan generation failed',
      };
    }
  }

  async executeStep(
    step: ExecutionStep,
    autoExecute: boolean
  ): Promise<{
    success: boolean;
    output?: string;
    error?: string;
    metadata?: Record<string, unknown>;
  }> {
    try {
      if (!step.command || step.command.trim() === '') {
        return {
          success: true,
          output: `Step completed: ${step.description}`,
          metadata: { skipped: true, reason: 'No command to execute' },
        };
      }

      // Execute the command
      const result = await this.commandService.executeCommand(step.command, {
        workingDirectory: process.cwd(),
        timeout: step.timeout || this.STEP_TIMEOUT_MS,
        safe: true,
      });

      const success = result.exitCode === 0;
      const output = result.stdout || result.stderr;

      return {
        success,
        output,
        error: success ? undefined : result.stderr || 'Command failed',
        metadata: {
          command: step.command,
          exitCode: result.exitCode,
          duration: result.duration,
          optimized: result.optimized,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Step execution failed',
        metadata: { command: step.command },
      };
    }
  }

  async executePlan(
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
  }> {
    let iteration = 0;
    let allStepsSuccessful = false;
    const results: unknown[] = [];
    const learnings: string[] = [];

    while (iteration < options.maxIterations && !allStepsSuccessful) {
      iteration++;
      allStepsSuccessful = true;

      for (const step of execution.plan) {
        try {
          const result = await this.executeStep(step, options.autoExecute);
          results.push(result);

          // Convert to AgenticExecutionResult format for storage
          const executionResult = {
            step,
            success: result.success,
            output: result.output || '',
            error: result.error,
            confidence: result.success ? 0.9 : 0.1,
            timestamp: new Date().toISOString(),
          };

          execution.executionResults.push(executionResult);

          if (!result.success) {
            allStepsSuccessful = false;

            if (!options.noIteration) {
              const learning = `Step "${step.description}" failed: ${result.error}`;
              learnings.push(learning);
              execution.learnings.push(learning);
            }
          }
        } catch (error) {
          allStepsSuccessful = false;
          const learning = `Step "${step.description}" threw error: ${
            error instanceof Error ? error.message : 'Unknown error'
          }`;
          learnings.push(learning);
          execution.learnings.push(learning);

          // Convert error to AgenticExecutionResult format
          const executionResult = {
            step,
            success: false,
            output: '',
            error: error instanceof Error ? error.message : 'Unknown error',
            confidence: 0,
            timestamp: new Date().toISOString(),
          };

          execution.executionResults.push(executionResult);

          results.push({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
          });
        }
      }

      // Update execution status
      execution.iterations = iteration;
      execution.success = allStepsSuccessful;
      execution.status = allStepsSuccessful ? 'completed' : 'failed';

      if (options.noIteration) {
        break; // Don't iterate if disabled
      }
    }

    return {
      success: allStepsSuccessful,
      results,
      learnings,
    };
  }

  async validateResult(
    step: ExecutionStep,
    result: unknown
  ): Promise<{
    valid: boolean;
    confidence: number;
    suggestions?: string[];
  }> {
    try {
      // Basic validation logic
      if (!result || typeof result !== 'object') {
        return {
          valid: false,
          confidence: 0,
          suggestions: ['Result should be a valid object'],
        };
      }

      const resultObj = result as { success?: boolean; error?: string };

      if (resultObj.success === false) {
        return {
          valid: false,
          confidence: 0.8,
          suggestions: [
            'Check command syntax and parameters',
            'Verify required dependencies are available',
            'Consider running with elevated permissions',
          ],
        };
      }

      return {
        valid: true,
        confidence: 0.9,
      };
    } catch (error) {
      return {
        valid: false,
        confidence: 0,
        suggestions: ['Unable to validate result due to error'],
      };
    }
  }

  private buildPlanningPrompt(
    goal: string,
    context: ContextInfo,
    previousExecutions: AgenticExecution[]
  ): string {
    let prompt = `Goal: ${goal}\n\n`;
    prompt += `Current Context:\n`;
    prompt += `- Working Directory: ${
      context?.workingDirectory || 'unknown'
    }\n`;
    prompt += `- Project Type: ${context?.projectType || 'unknown'}\n`;
    prompt += `- Platform: ${context?.platform || 'unknown'}\n`;

    if (previousExecutions.length > 0) {
      prompt += `\nPrevious similar executions:\n`;
      previousExecutions.forEach((exec) => {
        prompt += `- Goal: ${exec.goal}\n`;
        prompt += `  Success: ${exec.success}\n`;
        if (exec.learnings.length > 0) {
          prompt += `  Learnings: ${exec.learnings.join(', ')}\n`;
        }
      });
    }

    prompt += `\nGenerate a step-by-step execution plan in JSON format with the following structure:\n`;
    prompt += `[{"id": "step-1", "description": "Step description", "command": "command to execute", "expectedOutcome": "Expected result", "dependencies": [], "timeout": 30000}]`;
    prompt += `\nEnsure commands are safe and appropriate for the ${
      context?.platform || 'current'
    } platform.`;

    return prompt;
  }

  private parsePlanFromResponse(content: string): ExecutionStep[] {
    try {
      // Extract JSON from response
      const jsonMatch = content.match(/\[[\s\S]*\]/);
      if (!jsonMatch) {
        throw new Error('No JSON plan found in response');
      }

      const planData = JSON.parse(jsonMatch[0]);

      return planData.map((step: any, index: number) => ({
        id: step.id || `step-${index + 1}`,
        description: step.description || 'Unnamed step',
        command: step.command || '',
        expectedOutcome: step.expectedOutcome || '',
        reasoning: step.reasoning || '',
        risks: step.risks || [],
        dependencies: step.dependencies || [],
        timeout: step.timeout || 30000,
      }));
    } catch (error) {
      // Fallback to simple parsing if JSON extraction fails
      console.warn('Failed to parse JSON plan, using fallback:', error);

      return [
        {
          id: 'step-1',
          description: 'Execute goal using available commands',
          command: '',
          expectedOutcome: 'Goal achieved',
          reasoning: 'Fallback step when plan parsing fails',
          risks: ['May not be optimal'],
          dependencies: [],
          timeout: 30000,
        },
      ];
    }
  }
}
