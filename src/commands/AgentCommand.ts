/**
 * AgentCommand.ts - Advanced agentic reasoning command for complex goal execution.
 *
 * Responsibilities:
 * - Orchestrates agentic reasoning workflows for user-defined goals.
 * - Manages command lifecycle with timeout handling and resilience patterns.
 * - Integrates execution engine, presentation layer, and memory services.
 * - Provides enhanced error handling and user interaction management.
 *
 * Architecture:
 * - Implements single responsibility principle with specialized service delegation.
 * - Uses timeout management and resilience patterns for robust execution.
 * - Integrates with context service for environment awareness.
 *
 * Exports:
 * - {@link AgentCommand}: Command implementation for agentic reasoning.
 *
 * @see IAgentExecutionEngine - Core agentic execution logic.
 * @see IAgentPresenter - Presentation and user interaction.
 * @see IResilienceService - Timeout and error resilience.
 * @see IContextService - Environment context management.
 */

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
import inquirer from 'inquirer';

/**
 * AgentCommand - Advanced agentic reasoning command for complex goal achievement.
 *
 * Purpose:
 * - Orchestrates multi-step agentic reasoning workflows for user-defined goals.
 * - Integrates execution engine, presentation layer, resilience, and memory services.
 * - Manages command lifecycle with robust timeout handling and error recovery.
 * - Provides enhanced user interaction with detailed progress reporting.
 *
 * Architecture:
 * - Single Responsibility: Command orchestration and user interaction.
 * - Delegates execution, presentation, and resilience to specialized services.
 * - Uses timeout management and resilience patterns for robust operations.
 *
 * Dependencies:
 * @see IAgentExecutionEngine - Core agentic execution and planning logic.
 * @see IAgentPresenter - User interface and progress presentation.
 * @see IResilienceService - Timeout management and error resilience.
 * @see IContextService - Environment and context awareness.
 * @see IMemoryService - Memory management for execution history.
 *
 * @example
 * const agentCmd = new AgentCommand(engine, presenter, resilience, context, memory);
 * await agentCmd.execute({}, ['create a React component'], {});
 */
export class AgentCommand implements ICommand {
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
    let goal = args.join(' ').trim();

    if (!goal) {
      this.presenter.displayEnhancedErrorFromCommandExecution(
        new Error('Please provide a goal to achieve'),
        'agent',
        args,
        { phase: 'validation', context: 'goal-required' }
      );
      return {
        success: false,
        error: 'Please provide a goal to achieve',
      };
    }

    let lastResult: CommandResult = {
      success: false,
      error: 'No execution performed',
    };
    // Loop for interactive conversation until user types 'exit'
    while (true) {
      try {
        const result = await this.resilienceService.executeWithTimeout(
          () => this.executeGoal(goal, options),
          this.EXECUTION_TIMEOUT_MS,
          'Execution timed out'
        );
        // Display the formatted summary to the user
        const summary =
          result.output ||
          this.presenter.formatExecutionSummary(result.data as any);
        console.log(summary);
        lastResult = result;
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : 'Agentic execution failed';
        this.presenter.displayEnhancedErrorFromCommandExecution(
          error instanceof Error
            ? error
            : new Error('Agentic execution failed'),
          'agent',
          args,
          { phase: 'execution', context: 'interactive-loop' }
        );
        return { success: false, error: errorMessage };
      }
      // Prompt for next input or exit
      const { nextInput } = await inquirer.prompt([
        {
          type: 'input',
          name: 'nextInput',
          message: "Continue conversation (type 'exit' to quit):",
        },
      ]);
      if (nextInput.trim().toLowerCase() === 'exit') {
        this.presenter.displaySuccess('Exiting conversation');
        break;
      }
      goal = nextInput.trim();
    }
    return lastResult;
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
        {
          name: 'verbose',
          description:
            'Show detailed output including planning, execution steps, and performance metrics',
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
  --verbose         Show detailed output including planning, execution steps, and performance metrics

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
    const verbose = Boolean(options.verbose);

    // 1. Gather context and history
    const { contextInfo, previousExecutions } =
      await this.gatherExecutionContext(goal);

    // 2. Plan
    this.presenter.showPlanningPhase(goal, verbose);
    const planResult = (await this.executeWithEnhancedPlanGeneration(
      () =>
        this.executionEngine.planExecution(
          goal,
          contextInfo,
          previousExecutions
        ),
      'plan-generation'
    )) as { success: boolean; plan?: ExecutionStep[]; error?: string };

    if (!planResult.success || !planResult.plan) {
      this.presenter.displayEnhancedErrorFromCommandExecution(
        new Error(planResult.error || 'Failed to generate execution plan'),
        'agent',
        [goal],
        { phase: 'planning', context: 'plan-generation' }
      );
      return {
        success: false,
        error: planResult.error || 'Failed to generate execution plan',
      };
    }

    // 3. Prepare execution object
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

    // 4. Show plan and confirm
    this.presenter.displayExecutionPlan(planResult.plan, verbose);
    const autoExecute = Boolean(
      options.autoExecute || options['auto-execute'] || options.auto
    );
    const proceed = await this.confirmExecution(autoExecute);
    if (!proceed) {
      this.presenter.displayWarning('Execution cancelled by user');
      return {
        success: true,
        output: 'Execution cancelled by user',
      };
    }

    // 5. Execute plan
    const executionOptions = {
      autoExecute,
      maxIterations: (options.maxIterations ||
        options['max-iterations'] ||
        5) as number,
      noIteration: Boolean(options.noIteration || options['no-iteration']),
      verbose,
    };
    const executionResult = await this.executeWithEnhancedResilience(
      () => this.executePlanWithProgress(execution, executionOptions),
      () => this.fallbackExecution(execution),
      {
        maxRetries: 2,
        timeoutMs: this.EXECUTION_TIMEOUT_MS,
        continueOnFailure: true,
        gracefulDegradation: true,
        allowFallbackExecution: true,
      },
      'plan-execution'
    );

    // 6. Update and store execution
    execution.success = executionResult.success;
    execution.status = executionResult.success ? 'completed' : 'failed';
    execution.endTime = new Date().toISOString();
    await this.storeExecutionHistory(execution);

    // 7. Show summary
    await this.handleExecutionResult(execution, executionResult, verbose);
    const output = this.presenter.formatExecutionSummary(execution);
    return {
      success: execution.success || false,
      data: execution,
      output,
    };
  }

  // --- Extracted helpers ---
  private async gatherExecutionContext(
    goal: string
  ): Promise<{ contextInfo: any; previousExecutions: any[] }> {
    const contextInfo = await this.contextService.gatherContext();
    const historyResult = await this.memoryService.getAgenticHistory(goal);
    const previousExecutions = Array.isArray(historyResult)
      ? historyResult
      : [];
    return { contextInfo, previousExecutions };
  }

  private async confirmExecution(autoExecute: boolean): Promise<boolean> {
    if (autoExecute) return true;
    return this.presenter.askConfirmation('Proceed with execution?');
  }

  private async storeExecutionHistory(
    execution: AgenticExecution
  ): Promise<void> {
    try {
      await this.memoryService.storeAgenticExecution(execution);
    } catch (error) {
      this.presenter.displayWarning(
        `Failed to store execution history: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`
      );
    }
  }

  private async handleExecutionResult(
    execution: AgenticExecution,
    executionResult: any,
    verbose: boolean
  ): Promise<void> {
    await this.presenter.displayExecutionSummary(execution, verbose);
  }

  private convertToAgenticSteps(
    executionSteps: ExecutionStep[]
  ): AgenticStep[] {
    return executionSteps.map((step) => ({
      id: step.id, // Preserve the step ID from the template
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
      verbose: boolean;
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
    let iteration = 0;
    let allStepsSuccessful = false;
    const results: unknown[] = [];
    const learnings: string[] = [];
    let currentPlan = [...execution.plan];

    while (iteration < options.maxIterations && !allStepsSuccessful) {
      iteration++;
      allStepsSuccessful = true;

      // 1. Refine plan if needed
      currentPlan = await this.maybeRefinePlan(
        iteration,
        execution,
        learnings,
        currentPlan,
        options
      );
      execution.plan = currentPlan;

      // 2. Execute steps
      for (let i = 0; i < currentPlan.length; i++) {
        const step = currentPlan[i];
        const stepResult = await this.executeStepWithPresentation(
          step,
          execution,
          iteration,
          options,
          learnings
        );
        results.push(stepResult.resultForResultsArray);
        execution.executionResults.push(stepResult.executionResult);
        if (!stepResult.success) {
          allStepsSuccessful = false;
        }
      }

      // 3. Update execution status
      this.updateExecutionStatus(execution, iteration, allStepsSuccessful);

      // 4. Show iteration summary if needed
      this.handleIterationSummary(
        iteration,
        allStepsSuccessful,
        options,
        learnings
      );

      if (options.noIteration) break;
    }

    return { success: allStepsSuccessful, results, learnings };
  }

  private async maybeRefinePlan(
    iteration: number,
    execution: AgenticExecution,
    learnings: string[],
    currentPlan: AgenticStep[],
    options: { maxIterations: number; verbose: boolean }
  ): Promise<AgenticStep[]> {
    if (iteration === 1) return currentPlan;
    this.presenter.showIteration(iteration, options.maxIterations);
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
      this.displayRefinedPlan(refinedPlan.plan, learnings);
      return this.convertToAgenticSteps(refinedPlan.plan);
    } else {
      console.log(
        chalk.yellow(
          '⚠️  Using original plan - failed to generate refined plan'
        )
      );
      return currentPlan;
    }
  }

  private async executeStepWithPresentation(
    step: AgenticStep,
    execution: AgenticExecution,
    iteration: number,
    options: { autoExecute: boolean; verbose: boolean; noIteration: boolean },
    learnings: string[]
  ): Promise<{
    success: boolean;
    resultForResultsArray: unknown;
    executionResult: any;
  }> {
    const stepPresentation = this.presenter.showExecutionStep(
      step,
      options.verbose
    );
    try {
      const result = await this.executionEngine.executeStep(
        step,
        options.autoExecute
      );
      const executionResult = {
        step,
        success: result.success,
        output: result.output || '',
        error: result.error,
        confidence: result.success ? 0.9 : 0.1,
        timestamp: new Date().toISOString(),
        iteration,
      };
      if (result.success) {
        stepPresentation.succeed();
        if (result.output) {
          this.presenter.displayStepOutput(result.output, options.verbose);
        }
      } else {
        stepPresentation.fail();
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
      return {
        success: result.success,
        resultForResultsArray: result,
        executionResult,
      };
    } catch (error) {
      stepPresentation.fail();
      const detailedLearning = this.analyzeStepError(step, error, iteration);
      learnings.push(detailedLearning);
      execution.learnings.push(detailedLearning);
      const executionResult = {
        step,
        success: false,
        output: '',
        error: error instanceof Error ? error.message : 'Unknown error',
        confidence: 0,
        timestamp: new Date().toISOString(),
        iteration,
      };
      return {
        success: false,
        resultForResultsArray: {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        },
        executionResult,
      };
    }
  }

  private updateExecutionStatus(
    execution: AgenticExecution,
    iteration: number,
    allStepsSuccessful: boolean
  ) {
    execution.iterations = iteration;
    execution.success = allStepsSuccessful;
    execution.status = allStepsSuccessful ? 'completed' : 'failed';
  }

  private handleIterationSummary(
    iteration: number,
    allStepsSuccessful: boolean,
    options: { maxIterations: number; noIteration: boolean },
    learnings: string[]
  ) {
    if (
      !allStepsSuccessful &&
      iteration < options.maxIterations &&
      !options.noIteration
    ) {
      this.displayIterationSummary(iteration, learnings, options.maxIterations);
    }
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
    prompt += `- Implement proper error handling and recovery\n`;
    prompt += `- For script generation: use 'cat > file << EOF' instead of complex echo commands\n`;
    prompt += `- For code analysis: use built-in Node.js tools instead of external packages\n`;
    prompt += `- For multiline scripts: create separate .js files instead of inline echo\n\n`;

    prompt += `Please generate a completely new step-by-step execution plan in JSON format:\n`;
    prompt += `[{"id": "step-1", "description": "Step description", "command": "command to execute", "expectedOutcome": "Expected result", "reasoning": "Why this approach is better", "risks": ["potential issues"], "dependencies": ["required tools/files"], "timeout": 30000}]\n\n`;

    prompt += `IMPORTANT: Your new plan should be fundamentally different from what failed before. Be creative and think of alternative approaches to achieve the same goal.`;

    return prompt;
  }

  /**
   * Analyze why a specific command failed and suggest alternatives
   */
  private analyzeCommandFailure(command: string, error: string): string {
    // Echo/script generation errors
    if (
      error.includes('SyntaxError') ||
      error.includes('Invalid or unexpected token')
    ) {
      return `Script generation error - use proper escaping or file creation instead of complex echo commands`;
    }

    // NPM package not found errors
    if (error.includes('404') && error.includes('npm')) {
      const packageMatch = command.match(/npx\s+([^\s]+)/);
      const packageName = packageMatch ? packageMatch[1] : 'unknown';
      return `NPM package '${packageName}' not found - use verified alternatives like eslint, jshint, or native Node.js tools`;
    }

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

    // Syntax errors in generated scripts
    if (error.includes('syntax') || error.includes('invalid')) {
      return `Command syntax issue - verify command format and use proper shell escaping`;
    }

    // Multiline echo issues
    if (command.includes('echo') && command.length > 100) {
      return `Complex echo command failed - use file creation with cat or Node.js fs instead`;
    }

    return `Command execution failed - use simpler, more reliable alternatives`;
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

    // 1. Generate fallback plan (currently just uses execution.plan)
    const plan = this.generateFallbackPlan(execution);

    // 2. Execute fallback steps
    const { results, learnings, overallSuccess } =
      await this.executeFallbackSteps(plan);

    // 3. Handle fallback summary (optional, can be expanded)
    this.handleFallbackSummary(results, learnings, overallSuccess);

    return {
      success: overallSuccess,
      results,
      learnings,
    };
  }

  // --- Extracted fallback helpers ---
  private generateFallbackPlan(execution: AgenticExecution): AgenticStep[] {
    // For now, fallback just uses the current plan
    return execution.plan;
  }

  private async executeFallbackSteps(plan: AgenticStep[]): Promise<{
    results: unknown[];
    learnings: string[];
    overallSuccess: boolean;
  }> {
    const results: unknown[] = [];
    const learnings: string[] = [
      'Fallback execution used due to primary execution failure',
    ];
    let overallSuccess = true;
    const totalSteps = plan.length;
    console.log(
      `\n${chalk.blue(
        '🚀'
      )} Starting fallback execution of ${totalSteps} steps...`
    );
    for (let i = 0; i < plan.length; i++) {
      const step = plan[i];
      const stepPresentation = this.presenter.showExecutionStep(
        step,
        false // concise mode
      );
      try {
        const result = await this.executionEngine.executeStep(step, true);
        results.push(result);
        if (result.success) {
          stepPresentation.succeed();
          if (result.output) {
            this.presenter.displayStepOutput(result.output, false);
          }
        } else {
          stepPresentation.fail();
          overallSuccess = false;
          learnings.push(
            `Fallback step failed: ${step.description} - ${result.error}`
          );
        }
      } catch (error) {
        stepPresentation.fail();
        overallSuccess = false;
        learnings.push(
          `Fallback step error: ${step.description} - ${
            error instanceof Error ? error.message : 'Unknown error'
          }`
        );
        results.push({
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }
    return { results, learnings, overallSuccess };
  }

  private handleFallbackSummary(
    results: unknown[],
    learnings: string[],
    overallSuccess: boolean
  ): void {
    // Optionally expand: log summary, display to user, etc.
    // For now, fallback is concise and does not display extra summary.
  }

  /**
   * Execute with enhanced resilience patterns including fallback strategies.
   *
   * @param primaryExecution - The primary execution function to attempt.
   * @param fallbackExecution - The fallback execution function if primary fails.
   * @param options - Resilience options including retries, timeouts, and graceful degradation.
   * @param operationName - Name of the operation for logging and error reporting.
   * @returns Promise resolving to execution result with success status and data.
   */
  private async executeWithEnhancedResilience<T>(
    primaryExecution: () => Promise<T>,
    fallbackExecution: () => Promise<T>,
    options: {
      maxRetries?: number;
      timeoutMs?: number;
      continueOnFailure?: boolean;
      gracefulDegradation?: boolean;
      allowFallbackExecution?: boolean;
    },
    operationName: string
  ): Promise<T> {
    return this.resilienceService.executeWithFallback(
      primaryExecution,
      fallbackExecution,
      options
    );
  }

  /**
   * Execute with enhanced plan generation including retry logic.
   *
   * @param planGeneration - The plan generation function to execute.
   * @param operationName - Name of the operation for logging.
   * @returns Promise resolving to plan generation result.
   */
  private async executeWithEnhancedPlanGeneration<T>(
    planGeneration: () => Promise<T>,
    operationName: string
  ): Promise<T> {
    return this.resilienceService.executeWithRetry(
      planGeneration,
      3 // maxRetries
    );
  }
}
