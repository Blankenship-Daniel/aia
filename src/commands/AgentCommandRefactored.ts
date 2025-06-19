/**
 * Refactored Agent Command Implementation
 * Single Responsibility: Command orchestration and user interaction
 * Delegates execution, presentation, and resilience to specialized services
 */
import { ICommand, CommandDefinition } from '../interfaces/ICommand';
import { IAgentExecutionEngine } from '../interfaces/IAgentExecutionEngine';
import { IAgentPresenter } from '../interfaces/IAgentPresenter';
import { IResilienceService } from '../interfaces/IResilienceService';
import { IContextService } from '../interfaces/IContextService';
import { IMemoryService } from '../interfaces/IMemoryService';
import {
  CommandResult,
  CommandOptions,
  AgenticExecution,
  AgenticStep,
  ExecutionStep,
} from '../types/index.js';

export class AgentCommandRefactored implements ICommand {
  public readonly name = 'agent';
  public readonly description = 'Execute agentic reasoning for complex goals';
  public readonly aliases = ['a', 'agentic'];

  // Timeout configuration
  private readonly EXECUTION_TIMEOUT_MS = 300000; // 5 minutes for full execution

  constructor(
    private executionEngine: IAgentExecutionEngine,
    private presenter: IAgentPresenter,
    private resilienceService: IResilienceService,
    private contextService: IContextService,
    private memoryService: IMemoryService
  ) {}

  public async execute(
    context: Record<string, unknown>,
    args: string[],
    options: CommandOptions
  ): Promise<CommandResult> {
    const goal = args.join(' ').trim();

    if (!goal) {
      this.presenter.displayError('Please provide a goal to achieve');
      return {
        success: false,
        error: 'Please provide a goal to achieve',
      };
    }

    try {
      // Wrap the entire execution in timeout and resilience patterns
      return await this.resilienceService.executeWithTimeout(
        () => this.executeGoal(goal, options),
        this.EXECUTION_TIMEOUT_MS,
        'Execution timed out'
      );
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Agentic execution failed';
      this.presenter.displayError(errorMessage);

      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  public getDefinition(): CommandDefinition {
    return {
      name: this.name,
      description: this.description,
      usage: 'agent <goal>',
      examples: [
        'agent "create a new React component"',
        'agent "optimize database queries"',
        'agent "set up testing framework"',
      ],
      aliases: this.aliases,
      options: [
        {
          name: 'autoExecute',
          description: 'Execute without confirmation prompts',
          type: 'boolean',
          required: false,
          default: false,
        },
        {
          name: 'maxIterations',
          description: 'Maximum number of iterations',
          type: 'number',
          required: false,
          default: 5,
        },
        {
          name: 'noIteration',
          description: 'Disable iteration on failures',
          type: 'boolean',
          required: false,
          default: false,
        },
      ],
    };
  }

  public getName(): string {
    return this.name;
  }

  public getAliases(): string[] {
    return this.aliases;
  }

  public validateArgs(args: string[]): {
    valid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    if (args.length === 0) {
      errors.push('Goal is required');
    }

    const goal = args.join(' ').trim();
    if (goal.length === 0) {
      errors.push('Goal cannot be empty');
    }

    if (goal.length > 500) {
      errors.push('Goal is too long (maximum 500 characters)');
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  public getHelp(): string {
    return `
${this.description}

Usage: ${this.name} <goal>

The agent command uses AI to analyze your goal and create a step-by-step execution plan.
It can iterate on failures and learn from previous attempts.

Examples:
  ${this.name} "create a new React component"
  ${this.name} "optimize database queries"
  ${this.name} "set up testing framework"

Options:
  --auto-execute    Execute without confirmation prompts
  --max-iterations  Maximum number of iterations (default: 5)
  --no-iteration    Disable iteration on failures

The agent will:
1. Analyze your goal and current context
2. Generate a step-by-step execution plan
3. Show you the plan and ask for confirmation (unless --auto-execute)
4. Execute each step with resilience patterns
5. Learn from failures and iterate if needed
6. Store results for future reference
    `.trim();
  }

  private async executeGoal(
    goal: string,
    options: CommandOptions
  ): Promise<CommandResult> {
    // Show planning phase
    this.presenter.showPlanningPhase(goal);

    // Gather context
    const contextInfo = await this.contextService.gatherContext();

    // Get previous executions for learning
    const historyResult = await this.memoryService.getAgenticHistory(goal);
    const previousExecutions = Array.isArray(historyResult)
      ? historyResult
      : [];

    // Generate execution plan using the execution engine
    const planResult = await this.resilienceService.executeWithCircuitBreaker(
      () =>
        this.executionEngine.planExecution(
          goal,
          contextInfo,
          previousExecutions
        ),
      'plan-generation'
    );

    if (!planResult.success || !planResult.plan) {
      this.presenter.displayError(
        planResult.error || 'Failed to generate execution plan'
      );
      return {
        success: false,
        error: planResult.error || 'Failed to generate execution plan',
      };
    }

    // Create execution object
    const execution: AgenticExecution = {
      id: `exec-${Date.now()}`,
      goal,
      plan: this.convertToAgenticSteps(planResult.plan),
      results: [],
      executionResults: [],
      status: 'pending',
      iterations: 0,
      startTime: new Date().toISOString(),
      learnings: [],
      context: contextInfo,
      timestamp: new Date().toISOString(),
      confidence: 0,
      success: false,
    };

    // Display plan and get confirmation
    this.presenter.displayExecutionPlan(planResult.plan);

    const autoExecute = Boolean(options.autoExecute || options['auto-execute']);
    if (!autoExecute) {
      const proceed = await this.presenter.askConfirmation(
        'Proceed with execution?'
      );
      if (!proceed) {
        this.presenter.displayWarning('Execution cancelled by user');
        return {
          success: true,
          output: 'Execution cancelled by user',
        };
      }
    }

    // Execute plan with resilience
    const executionOptions = {
      autoExecute,
      maxIterations: (options.maxIterations ||
        options['max-iterations'] ||
        5) as number,
      noIteration: Boolean(options.noIteration || options['no-iteration']),
    };

    const executionResult = await this.resilienceService.executeWithFallback(
      () => this.executionEngine.executePlan(execution, executionOptions),
      () => this.fallbackExecution(execution),
      {
        maxRetries: 2,
        timeoutMs: this.EXECUTION_TIMEOUT_MS,
        continueOnFailure: true,
        gracefulDegradation: true,
        allowFallbackExecution: true,
      }
    );

    // Update execution status
    execution.success = executionResult.success;
    execution.status = executionResult.success ? 'completed' : 'failed';
    execution.endTime = new Date().toISOString();

    // Store execution history
    try {
      await this.memoryService.storeAgenticExecution(execution);
    } catch (error) {
      this.presenter.displayWarning(
        `Failed to store execution history: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`
      );
    }

    // Show summary
    this.presenter.displayExecutionSummary(execution);

    // Format output
    const output = this.presenter.formatExecutionSummary(execution);

    return {
      success: execution.success || false,
      data: execution,
      output,
    };
  }

  private convertToAgenticSteps(
    executionSteps: ExecutionStep[]
  ): AgenticStep[] {
    return executionSteps.map((step) => ({
      description: step.description,
      command: step.command,
      expectedOutcome: step.expectedOutcome,
      reasoning: step.reasoning || '',
      risks: step.risks || [],
      dependencies: step.dependencies || [],
    }));
  }

  private async fallbackExecution(execution: AgenticExecution): Promise<{
    success: boolean;
    results: unknown[];
    learnings: string[];
  }> {
    this.presenter.displayWarning('Using fallback execution strategy');

    // Simple fallback: execute each step individually without iteration
    const results: unknown[] = [];
    const learnings: string[] = [];
    let overallSuccess = true;

    for (const step of execution.plan) {
      const stepPresentation = this.presenter.showExecutionStep({
        id: step.description,
        command: step.command,
        description: step.description,
        expectedOutcome: step.expectedOutcome,
        reasoning: step.reasoning,
        risks: step.risks,
        dependencies: step.dependencies,
      });

      try {
        const result = await this.executionEngine.executeStep(
          {
            id: step.description,
            command: step.command,
            description: step.description,
            expectedOutcome: step.expectedOutcome,
            reasoning: step.reasoning,
            risks: step.risks,
            dependencies: step.dependencies,
          },
          true
        );

        results.push(result);

        if (result.success) {
          stepPresentation.succeed();
          if (result.output) {
            this.presenter.displayStepOutput(result.output);
          }
        } else {
          stepPresentation.fail();
          overallSuccess = false;
          learnings.push(
            `Fallback execution failed at step: ${step.description}`
          );
        }
      } catch (error) {
        stepPresentation.fail();
        overallSuccess = false;
        const errorMsg =
          error instanceof Error ? error.message : 'Unknown error';
        learnings.push(
          `Fallback execution error at step: ${step.description} - ${errorMsg}`
        );
        results.push({ success: false, error: errorMsg });
      }
    }

    return {
      success: overallSuccess,
      results,
      learnings,
    };
  }
}
