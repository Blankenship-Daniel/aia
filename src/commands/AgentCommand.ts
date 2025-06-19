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

      const response = await this.aiService.queryAI(prompt, context);

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
          const result = await this.executeStep(step, options.autoExecute);

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

      // Validate command
      const validationResult = await this.commandService.validateCommand(
        step.command
      );
      if (!validationResult.valid && !autoExecute) {
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
      }

      // Execute command
      const startTime = Date.now();
      const commandResult = await this.commandService.executeCommand(
        step.command
      );
      const duration = Date.now() - startTime;

      return {
        stepId: step.id,
        success: commandResult.exitCode === 0,
        output: commandResult.stdout || '',
        error: commandResult.stderr || '',
        duration,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
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

    return output;
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
}
