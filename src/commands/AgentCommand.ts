import { ICommand, CommandDefinition } from '../interfaces/ICommand';
import { IAIService } from '../interfaces/IAIService';
import { IContextService } from '../interfaces/IContextService';
import { ICommandService } from '../interfaces/ICommandService';
import { IMemoryService } from '../interfaces/IMemoryService';
import {
  CommandResult,
  CommandOptions,
  CommandOption,
  AgenticExecution,
  AgenticStep,
  ExecutionStep,
} from '../types/index.js';
import chalk from 'chalk';
import ora from 'ora';
import inquirer from 'inquirer';

export class AgentCommand implements ICommand {
  public readonly name = 'agent';
  public readonly description = 'Execute agentic reasoning for complex goals';
  public readonly aliases = ['a', 'agentic'];

  constructor(
    private aiService: IAIService,
    private contextService: IContextService,
    private commandService: ICommandService,
    private memoryService: IMemoryService
  ) {}

  // Enhanced execution options for better error handling
  private enhancedExecutionOptions = {
    continueOnFailure: true,
    gracefulDegradation: true,
    allowFallbackExecution: true,
    skipNonCritical: true,
    maxRetries: 2,
    suggestAlternatives: true,
  };

  // Command failure tracking for circuit breaker pattern
  private commandFailures = new Map<
    string,
    {
      command: string;
      failureCount: number;
      lastFailure: string;
      consecutiveFailures: number;
      isBlocked: boolean;
      blockUntil: number;
      alternativeSuggested?: string;
    }
  >();

  private circuitBreakerThreshold = 3;
  private circuitBreakerResetTimeMs = 30000; // 30 seconds

  // Timeout configuration
  private readonly AI_CALL_TIMEOUT_MS = 30000; // 30 seconds for AI calls
  private readonly EXECUTION_TIMEOUT_MS = 300000; // 5 minutes for full execution
  private readonly STEP_TIMEOUT_MS = 60000; // 1 minute per step

  // Timeout utility function
  private async withTimeout<T>(
    promise: Promise<T>,
    timeoutMs: number,
    timeoutMessage: string = 'Operation timed out'
  ): Promise<T> {
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => {
        reject(new Error(`${timeoutMessage} after ${timeoutMs}ms`));
      }, timeoutMs);
    });

    return Promise.race([promise, timeoutPromise]);
  }

  public async execute(
    context: Record<string, unknown>,
    args: string[],
    options: CommandOptions
  ): Promise<CommandResult> {
    try {
      const goal = args.join(' ').trim();

      if (!goal) {
        return {
          success: false,
          error: 'Please provide a goal to achieve',
        };
      }

      console.log(chalk.cyan(`🎯 Goal: ${goal}`));

      // Wrap the entire execution in a timeout
      return await this.withTimeout(
        this.executeWithTimeout(context, goal, options),
        this.EXECUTION_TIMEOUT_MS,
        'Execution timed out'
      );
    } catch (error) {
      if (error instanceof Error && error.message.includes('timed out')) {
        console.log(chalk.red(`⏰ ${error.message}`));
        return {
          success: false,
          error: error.message,
        };
      }
      return {
        success: false,
        error:
          error instanceof Error ? error.message : 'Agentic execution failed',
      };
    }
  }

  private async executeWithTimeout(
    context: Record<string, unknown>,
    goal: string,
    options: CommandOptions
  ): Promise<CommandResult> {
    try {
      // Gather context
      const context = await this.contextService.gatherContext();

      // Analyze previous executions for similar goals
      const historyResult = await this.memoryService.getAgenticHistory(goal);
      const previousExecutions = Array.isArray(historyResult)
        ? historyResult
        : [];

      // Generate execution plan
      const spinner = ora(
        'Analyzing goal and creating execution plan...'
      ).start();

      const planResult = await this.generateExecutionPlan(
        goal,
        context,
        previousExecutions
      );

      spinner.stop();

      if (!planResult.success || !planResult.data) {
        return {
          success: false,
          error: planResult.error || 'Failed to generate execution plan',
        };
      }

      const execution: AgenticExecution = {
        id: `exec-${Date.now()}`,
        goal,
        plan: planResult.data.map(
          (step: ExecutionStep): AgenticStep => ({
            description: step.description,
            command: step.command,
            expectedOutcome: step.expectedOutcome,
            reasoning: step.reasoning || '',
            risks: step.risks || [],
            dependencies: step.dependencies || [],
          })
        ),
        results: [],
        executionResults: [], // Alias for compatibility
        status: 'pending',
        iterations: 0,
        startTime: new Date().toISOString(),
        learnings: [],
        context,
        timestamp: new Date().toISOString(),
        confidence: 0,
        success: false,
      };

      // Show plan and get confirmation
      this.displayExecutionPlan(execution.plan);

      if (!options.autoExecute && !options['auto-execute']) {
        const { proceed } = await inquirer.prompt([
          {
            type: 'confirm',
            name: 'proceed',
            message: 'Proceed with execution?',
            default: true,
          },
        ]);

        if (!proceed) {
          return {
            success: true,
            output: chalk.yellow('Execution cancelled by user'),
          };
        }
      }

      // Execute plan
      const maxIterations =
        options.maxIterations || options['max-iterations'] || 5;
      const noIteration =
        options.noIteration || options['no-iteration'] || false;

      const executionResult = await this.executePlan(execution, {
        autoExecute: Boolean(options.autoExecute || options['auto-execute']),
        maxIterations: maxIterations as number,
        noIteration: noIteration as boolean,
      });

      // Store execution history
      await this.memoryService.storeAgenticExecution(execution);

      // Format output
      const output = this.formatExecutionSummary(execution);

      return {
        success: Boolean(execution.success),
        data: execution,
        output,
      };
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error ? error.message : 'Agentic execution failed',
      };
    }
  }

  private async generateExecutionPlan(
    goal: string,
    context: any,
    previousExecutions: AgenticExecution[]
  ): Promise<{ success: boolean; data?: ExecutionStep[]; error?: string }> {
    try {
      // Build prompt with context and history
      const prompt = this.buildPlanningPrompt(
        goal,
        context,
        previousExecutions
      );

      // Add timeout to AI query
      const response = await this.withTimeout(
        this.aiService.queryAI(prompt, context),
        this.AI_CALL_TIMEOUT_MS,
        'AI plan generation timed out'
      );

      if (!response || !response.content) {
        return {
          success: false,
          error: 'Failed to generate plan',
        };
      }

      // Parse plan from AI response
      const plan = this.parsePlanFromResponse(response.content);

      return {
        success: true,
        data: plan,
      };
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error ? error.message : 'Plan generation failed',
      };
    }
  }

  private buildPlanningPrompt(
    goal: string,
    context: any,
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
        prompt += `  Learnings: ${exec.learnings.join(', ')}\n`;
      });
    }

    prompt += `\nGenerate a step-by-step execution plan in JSON format with the following structure:\n`;
    prompt += `[{"id": "step-1", "description": "Step description", "command": "command to execute", "expectedOutcome": "Expected result", "dependencies": [], "timeout": 30000}]`;

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
      // Fallback to simple parsing
      return [
        {
          id: 'step-1',
          description: 'Execute goal',
          command: '',
          expectedOutcome: 'Goal achieved',
          reasoning: '',
          risks: [],
          dependencies: [],
          timeout: 30000,
        },
      ];
    }
  }

  private displayExecutionPlan(plan: ExecutionStep[]): void {
    console.log(chalk.blue('\n📋 Execution Plan:'));
    plan.forEach((step, index) => {
      console.log(chalk.dim(`${index + 1}. ${step.description}`));
      if (step.command) {
        console.log(chalk.gray(`   Command: ${step.command}`));
      }
      console.log(chalk.gray(`   Expected: ${step.expectedOutcome}`));
    });
    console.log();
  }

  private async executePlan(
    execution: AgenticExecution,
    options: {
      autoExecute: boolean;
      maxIterations: number;
      noIteration: boolean;
    }
  ): Promise<void> {
    let iteration = 0;
    let allStepsSuccessful = false;

    while (iteration < options.maxIterations && !allStepsSuccessful) {
      iteration++;

      if (iteration > 1) {
        console.log(
          chalk.yellow(`\n🔄 Iteration ${iteration}/${options.maxIterations}`)
        );
      }

      allStepsSuccessful = true;

      for (const step of execution.plan) {
        const spinner = ora(`Executing: ${step.description}`).start();

        try {
          const result = await this.withTimeout(
            this.executeStep(step, options.autoExecute),
            this.STEP_TIMEOUT_MS,
            `Step execution timed out: ${step.description}`
          );

          execution.executionResults.push(result);

          if (result.success) {
            spinner.succeed(chalk.green(`✓ ${step.description}`));
            // Display command output if available
            if (result.output && result.output.trim()) {
              console.log(chalk.dim('Output:'));
              const lines = result.output.trim().split('\n');
              lines.forEach((line: string) => {
                console.log(chalk.dim(`  ${line}`));
              });
              console.log(); // Add spacing
            }
          } else {
            spinner.fail(chalk.red(`✗ ${step.description}`));
            allStepsSuccessful = false;

            if (!options.noIteration) {
              // Learn from failure and potentially adjust plan
              const learning = `Step "${step.description}" failed: ${result.error}`;
              execution.learnings.push(learning);
            }
          }
        } catch (error) {
          spinner.fail(chalk.red(`✗ ${step.description}: ${error}`));
          allStepsSuccessful = false;
        }
      }

      if (
        !allStepsSuccessful &&
        !options.noIteration &&
        iteration < options.maxIterations
      ) {
        // Refine plan based on failures
        await this.refinePlan(execution);
      }
    }

    execution.success = allStepsSuccessful;
    execution.confidence = this.calculateConfidence(execution);
  }

  private async executeStep(
    step: ExecutionStep,
    autoExecute: boolean
  ): Promise<any> {
    try {
      if (!step.command) {
        return {
          stepId: step.id,
          success: true,
          output: 'No command to execute',
          duration: 0,
          timestamp: new Date().toISOString(),
        };
      }

      // Check if command is blocked by circuit breaker
      if (this.isCommandBlocked(step.command)) {
        const blockedInfo = this.commandFailures.get(
          step.command.trim().split(' ')[0]
        );
        console.log(
          chalk.red(
            `🚫 Command blocked due to repeated failures: ${step.command}`
          )
        );
        console.log(chalk.yellow(`Last failure: ${blockedInfo?.lastFailure}`));

        // Try alternative if available
        const alternative = this.suggestCommandAlternative(
          step.command,
          blockedInfo?.lastFailure || ''
        );
        if (alternative && this.enhancedExecutionOptions.suggestAlternatives) {
          console.log(chalk.blue(`💡 Trying alternative: ${alternative}`));
          return await this.executeStepWithCommand(
            step,
            alternative,
            autoExecute
          );
        }

        return {
          stepId: step.id,
          success: false,
          output: '',
          error: `Command blocked due to repeated failures. Last failure: ${blockedInfo?.lastFailure}`,
          duration: 0,
          timestamp: new Date().toISOString(),
          recoveryAttempted: true,
          fallbackStrategy: 'Circuit breaker protection',
        };
      }

      // Execute with the original command
      return await this.executeStepWithCommand(step, step.command, autoExecute);
    } catch (error) {
      console.log(
        chalk.red(
          `💥 Unexpected error in step execution: ${
            error instanceof Error ? error.message : 'Unknown error'
          }`
        )
      );

      // Try graceful degradation for non-critical steps
      if (
        !this.isStepCritical(step) &&
        this.enhancedExecutionOptions.gracefulDegradation
      ) {
        console.log(
          chalk.blue(`🔄 Applying graceful degradation for non-critical step`)
        );
        return {
          stepId: step.id,
          success: false,
          output: '',
          error:
            error instanceof Error ? error.message : 'Step execution failed',
          duration: 0,
          timestamp: new Date().toISOString(),
          recoveryAttempted: true,
          fallbackStrategy:
            'Graceful degradation - step marked as non-critical',
          continueWorkflow: true,
        };
      }

      return {
        stepId: step.id,
        success: false,
        output: '',
        error: error instanceof Error ? error.message : 'Step execution failed',
        duration: 0,
        timestamp: new Date().toISOString(),
      };
    }
  }

  /**
   * Execute a step with a specific command (for original command or alternatives)
   */
  private async executeStepWithCommand(
    step: ExecutionStep,
    command: string,
    autoExecute: boolean
  ): Promise<any> {
    try {
      // Validate command
      const validationResult = await this.commandService.validateCommand(
        command
      );

      if (!validationResult.valid) {
        // If command is invalid, try to suggest alternatives
        if (
          validationResult.suggestions &&
          validationResult.suggestions.length > 0 &&
          this.enhancedExecutionOptions.suggestAlternatives
        ) {
          console.log(
            chalk.yellow(
              `⚠️  Command validation failed: ${validationResult.warnings.join(
                ', '
              )}`
            )
          );
          console.log(
            chalk.blue(
              `💡 Suggested alternatives: ${validationResult.suggestions.join(
                ', '
              )}`
            )
          );

          if (!autoExecute) {
            const { useAlternative } = await inquirer.prompt([
              {
                type: 'list',
                name: 'useAlternative',
                message: 'Choose an alternative or skip:',
                choices: [
                  ...validationResult.suggestions,
                  'Skip this step',
                  'Proceed with original command anyway',
                ],
              },
            ]);

            if (useAlternative === 'Skip this step') {
              return {
                stepId: step.id,
                success: false,
                output: 'Step skipped by user',
                error: 'Command validation failed, step skipped',
                duration: 0,
                timestamp: new Date().toISOString(),
                recoveryAttempted: true,
                fallbackStrategy: 'User chose to skip step',
              };
            } else if (
              useAlternative !== 'Proceed with original command anyway'
            ) {
              // Use the selected alternative
              command = useAlternative;
            }
          } else {
            // In auto mode, try the first suggestion
            const firstSuggestion = validationResult.suggestions[0];
            console.log(
              chalk.blue(`🔄 Auto-trying alternative: ${firstSuggestion}`)
            );
            command = firstSuggestion;
          }
        } else if (!autoExecute) {
          const warningMessage =
            validationResult.warnings.length > 0
              ? validationResult.warnings.join(', ')
              : 'Command validation failed';

          const { proceed } = await inquirer.prompt([
            {
              type: 'confirm',
              name: 'proceed',
              message: `Command validation warning: ${warningMessage}. Proceed anyway?`,
              default: false,
            },
          ]);

          if (!proceed) {
            throw new Error('Command rejected by user');
          }
        } else {
          // Auto mode with validation failure - skip for safety
          return {
            stepId: step.id,
            success: false,
            output: '',
            error: `Auto-skipped: Command validation failed - ${validationResult.warnings.join(
              ', '
            )}`,
            duration: 0,
            timestamp: new Date().toISOString(),
            recoveryAttempted: true,
            fallbackStrategy: 'Auto-skipped unsafe command',
          };
        }
      }

      // Execute command with retry logic
      let lastError: any;
      let attempt = 1;
      const maxRetries = this.enhancedExecutionOptions.maxRetries;

      while (attempt <= maxRetries) {
        try {
          const startTime = Date.now();

          // Add timeout to command execution
          const commandResult = await this.withTimeout(
            this.commandService.executeCommand(command, { timeout: 30000 }),
            this.STEP_TIMEOUT_MS,
            `Command execution timed out: ${command}`
          );

          const duration = Date.now() - startTime;

          const result = {
            stepId: step.id,
            success: commandResult.exitCode === 0,
            output: commandResult.stdout || '',
            error: commandResult.stderr || '',
            duration,
            timestamp: new Date().toISOString(),
          };

          // Track command success/failure for circuit breaker
          this.trackCommandResult(command, {
            success: result.success,
            error: result.error,
          });

          if (result.success) {
            if (attempt > 1) {
              console.log(
                chalk.green(`✅ Command succeeded on attempt ${attempt}`)
              );
            }
            return result;
          } else if (attempt === maxRetries) {
            // Final attempt failed
            console.log(
              chalk.red(`❌ Command failed after ${maxRetries} attempts`)
            );

            // Try alternative if available
            const alternative = this.suggestCommandAlternative(
              command,
              result.error
            );
            if (
              alternative &&
              this.enhancedExecutionOptions.suggestAlternatives
            ) {
              console.log(
                chalk.blue(`💡 Trying alternative command: ${alternative}`)
              );
              try {
                const altResult = await this.executeStepWithCommand(
                  step,
                  alternative,
                  autoExecute
                );
                if (altResult.success) {
                  console.log(chalk.green(`✅ Alternative command succeeded`));
                  return {
                    ...altResult,
                    alternativeUsed: alternative,
                    recoveryAttempted: true,
                    fallbackStrategy: `Alternative command: ${alternative}`,
                  };
                }
              } catch (altError: any) {
                console.log(
                  chalk.yellow(
                    `⚠️  Alternative command also failed: ${altError.message}`
                  )
                );
              }
            }

            return result;
          } else {
            lastError = new Error(result.error || 'Command execution failed');
            console.log(
              chalk.yellow(
                `⚠️  Attempt ${attempt} failed, retrying... (${result.error})`
              )
            );
            attempt++;

            // Wait before retry with exponential backoff
            const delay = Math.min(1000 * Math.pow(2, attempt - 2), 5000);
            await new Promise((resolve) => setTimeout(resolve, delay));
          }
        } catch (execError: any) {
          lastError = execError;

          // Special handling for timeout errors
          if (execError.message && execError.message.includes('timed out')) {
            console.log(
              chalk.red(
                `⏰ Command timed out on attempt ${attempt}: ${command}`
              )
            );

            // For timeout errors, don't retry as aggressively
            if (attempt === maxRetries || attempt >= 2) {
              console.log(
                chalk.red(
                  `❌ Command execution timed out after ${attempt} attempts: ${execError.message}`
                )
              );

              // Track timeout failure for circuit breaker
              this.trackCommandResult(command, {
                success: false,
                error: `Timeout: ${execError.message}`,
                output: '',
              });

              // Return timeout result instead of throwing to allow graceful degradation
              return {
                stepId: step.id,
                success: false,
                output: '',
                error: `Command timed out: ${execError.message}`,
                duration: this.STEP_TIMEOUT_MS,
                timestamp: new Date().toISOString(),
                timeoutOccurred: true,
                recoveryAttempted: true,
                fallbackStrategy:
                  'Timeout - continuing with degraded functionality',
                continueWorkflow: !this.isStepCritical(step),
              };
            }
          }

          if (attempt === maxRetries) {
            console.log(
              chalk.red(
                `❌ Command execution failed after ${maxRetries} attempts: ${execError.message}`
              )
            );

            // Track failure for circuit breaker
            this.trackCommandResult(command, {
              success: false,
              error: execError.message,
              output: '',
            });

            throw execError;
          } else {
            console.log(
              chalk.yellow(
                `⚠️  Attempt ${attempt} failed, retrying... (${execError.message})`
              )
            );
            attempt++;

            // Wait before retry
            const delay = Math.min(1000 * Math.pow(2, attempt - 2), 5000);
            await new Promise((resolve) => setTimeout(resolve, delay));
          }
        }
      }

      throw lastError || new Error('Command execution failed');
    } catch (error: any) {
      return {
        stepId: step.id,
        success: false,
        output: '',
        error: error.message || 'Command execution failed',
        duration: 0,
        timestamp: new Date().toISOString(),
      };
    }
  }

  /**
   * Determine if a step is critical to the overall workflow
   */
  private isStepCritical(step: ExecutionStep): boolean {
    const criticalKeywords = [
      'delete',
      'remove',
      'rm ',
      'format',
      'destroy',
      'truncate',
      'drop',
      'purge',
    ];

    const command = step.command?.toLowerCase() || '';
    const description = step.description?.toLowerCase() || '';

    // Check if command or description contains critical keywords
    const isCritical = criticalKeywords.some(
      (keyword) => command.includes(keyword) || description.includes(keyword)
    );

    // Also check if step has explicit priority/criticality markers
    const hasHighPriority =
      description.includes('critical') ||
      description.includes('required') ||
      description.includes('essential');

    return isCritical || hasHighPriority;
  }

  /**
   * Check if a command is blocked by circuit breaker
   */
  private isCommandBlocked(command: string): boolean {
    const baseCommand = command.trim().split(' ')[0];
    const failure = this.commandFailures.get(baseCommand);

    if (!failure || !failure.isBlocked) {
      return false;
    }

    if (Date.now() > failure.blockUntil) {
      failure.isBlocked = false;
      return false;
    }

    return true;
  }

  /**
   * Track command execution results for circuit breaker pattern
   */
  private trackCommandResult(command: string, result: any): void {
    const baseCommand = command.trim().split(' ')[0];

    if (!this.commandFailures.has(baseCommand)) {
      this.commandFailures.set(baseCommand, {
        command: baseCommand,
        failureCount: 0,
        lastFailure: '',
        consecutiveFailures: 0,
        isBlocked: false,
        blockUntil: 0,
      });
    }

    const failure = this.commandFailures.get(baseCommand)!;

    if (result.success) {
      // Reset consecutive failures on success
      failure.consecutiveFailures = 0;
      if (failure.isBlocked) {
        failure.isBlocked = false;
        console.log(chalk.green(`✅ Command working again: ${baseCommand}`));
      }
    } else {
      failure.failureCount++;
      failure.consecutiveFailures++;
      failure.lastFailure = result.error || 'Unknown error';

      // Trigger circuit breaker if threshold reached
      if (failure.consecutiveFailures >= this.circuitBreakerThreshold) {
        failure.isBlocked = true;
        failure.blockUntil = Date.now() + this.circuitBreakerResetTimeMs;
        console.log(
          chalk.red(`🚫 Circuit breaker triggered for command: ${baseCommand}`)
        );
        console.log(
          chalk.yellow(
            `⏱️  Will retry after ${this.circuitBreakerResetTimeMs / 1000}s`
          )
        );
      }
    }
  }

  /**
   * Suggest alternative commands for common failures
   */
  private suggestCommandAlternative(
    command: string,
    errorMessage: string
  ): string | null {
    const baseCommand = command.trim().split(' ')[0];
    const lowerError = errorMessage.toLowerCase();

    // Common command alternatives
    const alternatives: Record<string, string[]> = {
      npm: ['yarn', 'pnpm'],
      yarn: ['npm', 'pnpm'],
      depcheck: ['npm-check-unused-deps', 'npm ls --depth=0'],
      eslint: ['jshint', 'tslint', 'prettier'],
      'sonarqube-scanner': ['eslint', 'jshint'],
      njsscan: ['eslint --ext .js,.ts .'],
      git: ['git --version || echo "Git not available"'],
      tsc: ['npx tsc', 'node_modules/.bin/tsc'],
      node: ['npx node', 'which node'],
    };

    if (alternatives[baseCommand]) {
      return alternatives[baseCommand][0];
    }

    // Pattern-based suggestions
    if (
      lowerError.includes('not found') ||
      lowerError.includes('command not found')
    ) {
      if (baseCommand.includes('npm')) {
        return 'yarn';
      }
      if (baseCommand.includes('check') || baseCommand.includes('audit')) {
        return 'npm audit --audit-level moderate';
      }
      if (baseCommand.includes('test')) {
        return 'npm test';
      }
    }

    return null;
  }

  public validate(args: string[], options: CommandOptions): string | null {
    if (args.length === 0) {
      return 'Goal is required';
    }

    if (options.maxIterations || options['max-iterations']) {
      const iterations = options.maxIterations || options['max-iterations'];
      if (typeof iterations !== 'number' || iterations < 1 || iterations > 10) {
        return 'Max iterations must be between 1 and 10';
      }
    }

    return null;
  }

  public getUsage(): string {
    return `${this.name} <goal> [options]`;
  }

  public getOptions(): CommandOption[] {
    return [
      {
        name: 'auto-execute',
        description: 'Execute commands without confirmation',
        type: 'boolean',
        required: false,
        default: false,
      },
      {
        name: 'max-iterations',
        description: 'Maximum number of refinement iterations (1-10)',
        type: 'number',
        required: false,
        default: 5,
      },
      {
        name: 'no-iteration',
        description: 'Disable iterative refinement',
        type: 'boolean',
        required: false,
        default: false,
      },
    ];
  }

  public getExamples(): string[] {
    return [
      'aia agent "optimize this Node.js project for production"',
      'aia agent "set up automated testing" --auto-execute',
      'aia a "debug the failing tests" --max-iterations 3',
    ];
  }

  // ICommand interface methods
  public getDefinition(): CommandDefinition {
    return {
      name: this.name,
      description: this.description,
      usage: 'agent <goal> [options]',
      aliases: this.aliases,
      examples: this.getExamples(),
      options: this.getOptions().map((opt) => ({
        name: opt.name,
        description: opt.description,
        type: opt.type,
        required: opt.required,
        default: opt.default,
      })),
    };
  }

  public getName(): string {
    return this.name;
  }

  public getAliases(): string[] {
    return this.aliases;
  }

  public validateArgs(args: string[]): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (args.length === 0) {
      errors.push('Goal is required');
    }

    const goal = args.join(' ').trim();
    if (!goal) {
      errors.push('Goal cannot be empty');
    }

    if (goal.length > 500) {
      errors.push('Goal must be less than 500 characters');
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  public getHelp(): string {
    const definition = this.getDefinition();
    let help = `${definition.name} - ${definition.description}\n\n`;
    help += `Usage: ${definition.usage}\n\n`;

    if (definition.aliases && definition.aliases.length > 0) {
      help += `Aliases: ${definition.aliases.join(', ')}\n\n`;
    }

    if (definition.options && definition.options.length > 0) {
      help += 'Options:\n';
      definition.options.forEach((opt) => {
        const required = opt.required ? ' (required)' : '';
        const defaultValue =
          opt.default !== undefined ? ` (default: ${opt.default})` : '';
        help += `  --${opt.name}: ${opt.description}${required}${defaultValue}\n`;
      });
      help += '\n';
    }

    if (definition.examples && definition.examples.length > 0) {
      help += 'Examples:\n';
      definition.examples.forEach((example) => {
        help += `  ${example}\n`;
      });
    }

    return help;
  }

  private async refinePlan(execution: AgenticExecution): Promise<void> {
    // Use AI to refine plan based on failures
    const failedSteps = execution.executionResults.filter((r) => !r.success);

    if (failedSteps.length === 0) return;

    console.log(chalk.yellow('\n🔧 Refining plan based on failures...'));

    // This is a simplified version - in production, you'd use AI to analyze failures
    // and generate an improved plan
  }

  private calculateConfidence(execution: AgenticExecution): number {
    const totalSteps = execution.plan.length;
    const successfulSteps = execution.executionResults.filter(
      (r) => r.success
    ).length;

    if (totalSteps === 0) return 0;

    return Math.round((successfulSteps / totalSteps) * 100);
  }

  private formatExecutionSummary(execution: AgenticExecution): string {
    let output = '\n' + chalk.bold('Execution Summary:\n');
    output += chalk.dim('─'.repeat(50)) + '\n';

    output += chalk.cyan(`Goal: ${execution.goal}\n`);
    output += chalk.dim(`Timestamp: ${execution.timestamp}\n`);
    output += chalk.dim(`Confidence: ${execution.confidence}%\n`);
    output += chalk[execution.success ? 'green' : 'red'](
      `Status: ${execution.success ? 'Success' : 'Failed'}\n`
    );

    output += '\nSteps Executed:\n';
    execution.executionResults.forEach((result, index) => {
      const step = execution.plan[index];
      const icon = result.success ? '✓' : '✗';
      const color = result.success ? 'green' : 'red';
      output += chalk[color](
        `  ${icon} ${step?.description || 'Unknown step'}\n`
      );
      if (result.error) {
        output += chalk.red(`     Error: ${result.error}\n`);
      }
      if (result.success && result.output && result.output.trim()) {
        output += chalk.dim(`     Output:\n`);
        const lines = result.output.trim().split('\n');
        lines.forEach((line: string) => {
          output += chalk.dim(`       ${line}\n`);
        });
      }
    });

    if (execution.learnings.length > 0) {
      output += '\nLearnings:\n';
      execution.learnings.forEach((learning) => {
        output += chalk.yellow(`  • ${learning}\n`);
      });
    }

    // Add graceful error handling summary
    const failedSteps = execution.executionResults.filter((r) => !r.success);
    const recoveredSteps = execution.executionResults.filter(
      (r) => (r as any).recoveryAttempted
    );
    const fallbackSteps = execution.executionResults.filter(
      (r) => (r as any).fallbackStrategy
    );
    const timeoutSteps = execution.executionResults.filter(
      (r) => (r as any).timeoutOccurred
    );

    if (failedSteps.length > 0) {
      output += '\nGraceful Error Handling Summary:\n';
      output += chalk.yellow(`  • Failed steps: ${failedSteps.length}\n`);
      if (timeoutSteps.length > 0) {
        output += chalk.red(`  • Timeout failures: ${timeoutSteps.length}\n`);
      }
      if (recoveredSteps.length > 0) {
        output += chalk.blue(
          `  • Recovery attempts: ${recoveredSteps.length}\n`
        );
      }
      if (fallbackSteps.length > 0) {
        output += chalk.green(
          `  • Fallback strategies applied: ${fallbackSteps.length}\n`
        );
      }

      // Show specific recovery/fallback information
      execution.executionResults.forEach((result, index) => {
        const resultAny = result as any;
        if (resultAny.timeoutOccurred) {
          output += chalk.red(
            `  • Step ${index + 1}: ⏰ Timeout - ${
              resultAny.fallbackStrategy ||
              'Continued with degraded functionality'
            }\n`
          );
        } else if (resultAny.fallbackStrategy) {
          output += chalk.blue(
            `  • Step ${index + 1}: ${resultAny.fallbackStrategy}\n`
          );
        }
      });
    }

    return output;
  }
}
