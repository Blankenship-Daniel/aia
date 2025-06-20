/**
 * Refactored Agent Command Implementation
 * Single Responsibility: Command orchestration and user interaction
 * Delegates execution, presentation, and resilience to specialized services
 */
import chalk from 'chalk';
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

    const autoExecute = Boolean(
      options.autoExecute || options['auto-execute'] || options.auto
    );
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
      () => this.executePlanWithProgress(execution, executionOptions),
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

  /**
   * Execute plan with enhanced progress feedback and intelligent iteration
   */
  private async executePlanWithProgress(
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
    const totalSteps = execution.plan.length;
    console.log(
      `\n${chalk.blue('🚀')} Starting execution of ${totalSteps} steps...`
    );
    console.log(chalk.gray('━'.repeat(60)));

    let iteration = 0;
    let allStepsSuccessful = false;
    const results: unknown[] = [];
    const learnings: string[] = [];
    let currentPlan = [...execution.plan]; // Work with a copy

    while (iteration < options.maxIterations && !allStepsSuccessful) {
      iteration++;
      allStepsSuccessful = true;

      if (iteration > 1) {
        this.presenter.showIteration(iteration, options.maxIterations);

        // Generate a refined plan based on previous failures
        const refinedPlan = await this.generateRefinedPlan(
          execution.goal,
          execution.context,
          learnings,
          execution.executionResults,
          iteration
        );

        if (refinedPlan.success && refinedPlan.plan) {
          console.log(
            chalk.blue(
              '🔄 Refined execution plan generated based on previous failures'
            )
          );
          console.log(chalk.gray('━'.repeat(60)));

          // Display the refined plan
          this.displayRefinedPlan(refinedPlan.plan, learnings);

          // Update the current plan
          currentPlan = this.convertToAgenticSteps(refinedPlan.plan);
          execution.plan = currentPlan; // Update the main execution plan
        } else {
          console.log(
            chalk.yellow(
              '⚠️  Using original plan - failed to generate refined plan'
            )
          );
        }
      }

      // Execute the current plan (original or refined)
      for (let i = 0; i < currentPlan.length; i++) {
        const step = currentPlan[i];
        const stepNumber = i + 1;

        console.log(
          `\n${chalk.cyan(
            `[${stepNumber}/${currentPlan.length}]`
          )} ${chalk.bold(step.description)}`
        );

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
            options.autoExecute
          );

          results.push(result);

          // Convert to AgenticExecutionResult format for storage
          const executionResult = {
            step,
            success: result.success,
            output: result.output || '',
            error: result.error,
            confidence: result.success ? 0.9 : 0.1,
            timestamp: new Date().toISOString(),
            iteration, // Track which iteration this result belongs to
          };

          execution.executionResults.push(executionResult);

          if (result.success) {
            stepPresentation.succeed();
            if (result.output) {
              this.presenter.displayStepOutput(result.output);
            }
          } else {
            stepPresentation.fail();
            allStepsSuccessful = false;

            if (!options.noIteration) {
              const detailedLearning = this.analyzeStepFailure(
                step,
                result,
                iteration
              );
              learnings.push(detailedLearning);
              execution.learnings.push(detailedLearning);
            }
          }
        } catch (error) {
          stepPresentation.fail();
          allStepsSuccessful = false;
          const detailedLearning = this.analyzeStepError(
            step,
            error,
            iteration
          );
          learnings.push(detailedLearning);
          execution.learnings.push(detailedLearning);

          // Convert error to AgenticExecutionResult format
          const executionResult = {
            step,
            success: false,
            output: '',
            error: error instanceof Error ? error.message : 'Unknown error',
            confidence: 0,
            timestamp: new Date().toISOString(),
            iteration, // Track which iteration this result belongs to
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

      // Show iteration summary if not successful and not the last iteration
      if (
        !allStepsSuccessful &&
        iteration < options.maxIterations &&
        !options.noIteration
      ) {
        this.displayIterationSummary(
          iteration,
          learnings,
          options.maxIterations
        );
      }

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

  /**
   * Generate a refined execution plan based on previous failures
   */
  private async generateRefinedPlan(
    goal: string,
    context: any,
    learnings: string[],
    previousResults: any[],
    iteration: number
  ): Promise<{
    success: boolean;
    plan?: ExecutionStep[];
    error?: string;
  }> {
    try {
      // Build a detailed prompt that includes failure analysis
      const refinedPrompt = this.buildRefinedPlanningPrompt(
        goal,
        context,
        learnings,
        previousResults,
        iteration
      );

      // Get a new plan from the AI service
      const contextInfo = await this.contextService.gatherContext();
      const response = await this.executionEngine.planExecution(
        refinedPrompt,
        contextInfo,
        [] // Don't pass previous executions as we're handling that in the refined prompt
      );

      return response;
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : 'Failed to generate refined plan',
      };
    }
  }

  /**
   * Build a refined planning prompt that incorporates failure analysis
   */
  private buildRefinedPlanningPrompt(
    goal: string,
    context: any,
    learnings: string[],
    previousResults: any[],
    iteration: number
  ): string {
    let prompt = `REFINED EXECUTION PLAN - Iteration ${iteration}\n\n`;
    prompt += `Original Goal: ${goal}\n\n`;

    prompt += `CRITICAL: Previous execution attempts have failed. You must analyze the failures and create a completely different approach.\n\n`;

    prompt += `=== FAILURE ANALYSIS ===\n`;
    if (learnings.length > 0) {
      prompt += `Identified Issues:\n`;
      learnings.forEach((learning, index) => {
        prompt += `${index + 1}. ${learning}\n`;
      });
    }

    prompt += `\n=== FAILED COMMANDS ANALYSIS ===\n`;
    const failedCommands = previousResults
      .filter((result) => !result.success)
      .map((result) => ({
        command: result.step?.command,
        error: result.error,
        description: result.step?.description,
      }));

    if (failedCommands.length > 0) {
      prompt += `Commands that failed:\n`;
      failedCommands.forEach((cmd, index) => {
        prompt += `${index + 1}. Command: "${cmd.command}"\n`;
        prompt += `   Description: ${cmd.description}\n`;
        prompt += `   Error: ${cmd.error}\n`;
        prompt += `   Analysis: ${this.analyzeCommandFailure(
          cmd.command,
          cmd.error
        )}\n\n`;
      });
    }

    prompt += `=== CONSTRAINTS FOR NEW PLAN ===\n`;
    prompt += `1. DO NOT repeat any command that has already failed\n`;
    prompt += `2. Use alternative approaches and tools\n`;
    prompt += `3. Add proper error checking and validation steps\n`;
    prompt += `4. Consider system dependencies and prerequisites\n`;
    prompt += `5. Break complex steps into smaller, more reliable steps\n`;
    prompt += `6. Include fallback strategies for critical steps\n\n`;

    prompt += `=== SYSTEM CONTEXT ===\n`;
    prompt += `Platform: ${context?.platform || process.platform}\n`;
    prompt += `Working Directory: ${
      context?.workingDirectory || process.cwd()
    }\n`;
    prompt += `Node Version: ${process.version}\n`;
    prompt += `Available Memory: ${Math.round(
      (process.memoryUsage().heapUsed / 1024 / 1024) | 0
    )}MB used\n\n`;

    prompt += `=== ALTERNATIVE STRATEGIES TO CONSIDER ===\n`;
    prompt += `- Use native Node.js APIs instead of shell commands\n`;
    prompt += `- Use npm packages instead of system tools\n`;
    prompt += `- Implement progressive enhancement (try advanced first, fallback to basic)\n`;
    prompt += `- Add explicit dependency checking steps\n`;
    prompt += `- Use cross-platform compatible commands\n`;
    prompt += `- Implement proper error handling and recovery\n\n`;

    prompt += `Please generate a completely new step-by-step execution plan in JSON format:\n`;
    prompt += `[{"id": "step-1", "description": "Step description", "command": "command to execute", "expectedOutcome": "Expected result", "reasoning": "Why this approach is better", "risks": ["potential issues"], "dependencies": ["required tools/files"], "timeout": 30000}]\n\n`;

    prompt += `IMPORTANT: Your new plan should be fundamentally different from what failed before. Be creative and think of alternative approaches to achieve the same goal.`;

    return prompt;
  }

  /**
   * Analyze why a specific command failed and suggest alternatives
   */
  private analyzeCommandFailure(command: string, error: string): string {
    // Command not found errors
    if (
      error.includes('command not found') ||
      error.includes('not recognized')
    ) {
      return `Missing tool - consider using npm package alternative or installing prerequisite`;
    }

    // Permission errors
    if (error.includes('permission denied') || error.includes('EACCES')) {
      return `Permission issue - try alternative approach without elevated permissions`;
    }

    // File not found errors
    if (error.includes('No such file') || error.includes('ENOENT')) {
      return `Missing file/directory - add prerequisite check or create missing resources`;
    }

    // Network/timeout errors
    if (
      error.includes('timeout') ||
      error.includes('network') ||
      error.includes('ETIMEDOUT')
    ) {
      return `Network/timeout issue - use local alternatives or increase timeout`;
    }

    // Configuration errors
    if (error.includes('config') || error.includes('configuration')) {
      return `Configuration issue - add setup steps or use different tool`;
    }

    // Syntax errors
    if (error.includes('syntax') || error.includes('invalid')) {
      return `Command syntax issue - verify command format and parameters`;
    }

    return `Unknown error - consider completely different approach`;
  }

  /**
   * Analyze step failure with more detail
   */
  private analyzeStepFailure(
    step: any,
    result: any,
    iteration: number
  ): string {
    const baseFailure = `[Iteration ${iteration}] Step "${step.description}" failed: ${result.error}`;
    const analysis = this.analyzeCommandFailure(
      step.command,
      result.error || ''
    );
    return `${baseFailure} | Analysis: ${analysis}`;
  }

  /**
   * Analyze step error with more detail
   */
  private analyzeStepError(step: any, error: any, iteration: number): string {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    const baseError = `[Iteration ${iteration}] Step "${step.description}" threw error: ${errorMsg}`;
    const analysis = this.analyzeCommandFailure(step.command, errorMsg);
    return `${baseError} | Analysis: ${analysis}`;
  }

  /**
   * Display refined plan with context about what changed
   */
  private displayRefinedPlan(plan: ExecutionStep[], learnings: string[]): void {
    console.log(`\n${chalk.blue('📋 Refined Execution Plan:')}`);
    console.log(chalk.gray('━'.repeat(60)));

    plan.forEach((step, index) => {
      console.log(
        `${chalk.cyan(`[${index + 1}/${plan.length}]`)} ${chalk.bold(
          step.description
        )}`
      );
      console.log(`   ${chalk.yellow('Command:')} ${step.command}`);
      console.log(`   ${chalk.green('Expected:')} ${step.expectedOutcome}`);
      if (step.reasoning) {
        console.log(`   ${chalk.blue('Reasoning:')} ${step.reasoning}`);
      }
      if (step.risks && step.risks.length > 0) {
        console.log(`   ${chalk.red('Risks:')} ${step.risks.join(', ')}`);
      }
      console.log(`   ${chalk.gray(`Timeout: ${step.timeout || 30000}ms`)}`);
      console.log('');
    });

    console.log(chalk.gray('━'.repeat(60)));
  }

  /**
   * Display iteration summary with failure analysis
   */
  private displayIterationSummary(
    iteration: number,
    learnings: string[],
    maxIterations: number
  ): void {
    console.log(`\n${chalk.yellow('⚠️  Iteration Summary')}`);
    console.log(chalk.gray('━'.repeat(50)));
    console.log(`${chalk.cyan('Iteration:')} ${iteration}/${maxIterations}`);
    console.log(
      `${chalk.red('Failures:')} ${learnings.length} issues identified`
    );

    if (learnings.length > 0) {
      console.log(`\n${chalk.blue('🔍 Failure Analysis:')}`);
      learnings.slice(-3).forEach((learning, index) => {
        console.log(`${index + 1}. ${learning}`);
      });
    }

    console.log(
      `\n${chalk.blue('🔄 Generating refined plan for next iteration...')}`
    );
    console.log(chalk.gray('━'.repeat(50)));
  }

  /**
   * Fallback execution strategy when primary execution fails
   */
  private async fallbackExecution(execution: AgenticExecution): Promise<{
    success: boolean;
    results: unknown[];
    learnings: string[];
  }> {
    this.presenter.displayWarning('Using fallback execution strategy');

    // Simple fallback: execute each step individually without iteration
    const results: unknown[] = [];
    const learnings: string[] = [
      'Fallback execution used due to primary execution failure',
    ];
    let overallSuccess = true;
    const totalSteps = execution.plan.length;

    console.log(
      `\n${chalk.blue(
        '🚀'
      )} Starting fallback execution of ${totalSteps} steps...`
    );
    console.log(chalk.gray('━'.repeat(60)));

    for (let i = 0; i < execution.plan.length; i++) {
      const step = execution.plan[i];
      const stepNumber = i + 1;

      console.log(
        `\n${chalk.cyan(`[${stepNumber}/${totalSteps}]`)} ${chalk.bold(
          step.description
        )}`
      );

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
