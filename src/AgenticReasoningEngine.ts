import chalk from 'chalk';
import inquirer from 'inquirer';
import AgenticSearchEngine from './AgenticSearchEngine.js';
import NLPEngine from './NLPEngine.js';
import { ConversationContextManager } from './ConversationContextManager.js';
import { ResponseGenerator } from './ResponseGenerator.js';
import ErrorHandler from './ErrorHandler.js';
import {
  parseAgenticPlan,
  parseEvaluationResult,
  parseStepVerification,
  parseRecoveryAnalysis,
  parseRecoveryPlan,
  parseStepValidation,
} from './utils/RobustJSONParser.js';
import {
  AgenticPlan,
  AgenticContext,
  AgenticExecutionResult,
  EvaluationResult,
  RecoveryResult,
  NLPAnalysis,
  AgenticGoal,
  CommandResult,
  StepResult,
} from './types/index.js';

/**
 * Command failure tracking for circuit breaker pattern
 */
interface CommandFailureInfo {
  command: string;
  failureCount: number;
  lastFailure: string;
  consecutiveFailures: number;
  isBlocked: boolean;
  blockUntil: number;
  alternativeSuggested?: string;
}

/**
 * Enhanced execution options for better error handling
 */
interface EnhancedExecutionOptions {
  maxRetries?: number;
  failureThreshold?: number;
  skipNonCritical?: boolean;
  suggestAlternatives?: boolean;
  timeoutMs?: number;
  continueOnFailure?: boolean;
  gracefulDegradation?: boolean;
  allowFallbackExecution?: boolean;
}

/**
 * Workflow recovery strategy
 */
interface WorkflowRecoveryStrategy {
  skipFailedStep: boolean;
  useAlternativeCommand: boolean;
  continueWithLimitedCapabilities: boolean;
  suggestManualIntervention: boolean;
  provideFallbackSolution: boolean;
}

/**
 * Enhanced step result with recovery information
 */
interface EnhancedStepResult extends StepResult {
  recoveryAttempted?: boolean;
  alternativeUsed?: string;
  fallbackStrategy?: string;
  skipReason?: string;
  continueWorkflow?: boolean;
}

/**
 * Execution context for agentic reasoning
 */
interface AgenticExecutionContext {
  goal: string;
  enhancedGoal: string;
  nlpAnalysis: any; // Use any for now to avoid type conflicts with NLPEngine
  iterations: number;
  maxIterations: number;
  autoExecute: boolean;
  allowIteration: boolean;
}

/**
 * Result of agentic query execution
 */
interface AgenticQueryResult {
  goalAchieved: boolean;
  result?: unknown;
  reason?: string;
  nlpAnalysis?: any;
  enhancedResponse?: any; // More flexible type to handle different response formats
  fallbackUsed?: boolean;
}

/**
 * Options for agentic query execution
 */
interface AgenticQueryOptions {
  maxIterations?: number;
  autoExecute?: boolean;
  allowIteration?: boolean;
}

/**
 * Enhanced Agentic Reasoning System with Advanced NLP and Error Handling
 */
export class AgenticReasoningEngine {
  private aia: any;
  private maxIterations: number;
  private currentGoal: string | null;
  private executionHistory: AgenticExecutionResult[];
  private searchEngine: AgenticSearchEngine;
  private nlpEngine: any; // NLPEngine
  private conversationManager: ConversationContextManager;
  private responseGenerator: ResponseGenerator;
  private errorHandler: ErrorHandler;
  private commandFailures: Map<string, CommandFailureInfo>;
  private circuitBreakerThreshold: number;
  private circuitBreakerResetTimeMs: number;

  constructor(aia: any) {
    this.aia = aia;
    this.maxIterations = 5;
    this.currentGoal = null;
    this.executionHistory = [];
    this.searchEngine = new AgenticSearchEngine(aia);
    this.nlpEngine = new NLPEngine(aia);
    this.conversationManager = new ConversationContextManager(aia);
    this.responseGenerator = new ResponseGenerator(aia);
    this.errorHandler = new ErrorHandler();
    this.commandFailures = new Map();
    this.circuitBreakerThreshold = 3; // Block after 3 consecutive failures
    this.circuitBreakerResetTimeMs = 300000; // Reset after 5 minutes
  }

  async executeAgenticQuery(
    userGoal: string,
    options: AgenticQueryOptions = {}
  ): Promise<AgenticQueryResult> {
    this.currentGoal = userGoal;
    this.executionHistory = [];

    console.log(chalk.blue('\n🧠 Enhancing natural language understanding...'));

    // Step 0: Advanced NLP analysis to understand the goal better
    const currentContext = await this.aia.gatherContext();
    const nlpAnalysis = await this.nlpEngine.enhanceGoalUnderstanding(
      userGoal,
      currentContext
    );

    // Update conversation context
    this.conversationManager.addExchange('default', userGoal, 'Processing...', {
      nlpAnalysis,
    });

    // Display NLP insights
    console.log(
      chalk.gray(
        `Intent: ${nlpAnalysis.intent.intent} (${Math.round(
          nlpAnalysis.intent.confidence * 100
        )}% confidence)`
      )
    );
    if (nlpAnalysis.intent.subType) {
      console.log(chalk.gray(`Sub-intent: ${nlpAnalysis.intent.subType}`));
    }
    console.log(chalk.gray(`Goal type: ${nlpAnalysis.goalType}`));
    console.log(
      chalk.gray(
        `Detected entities: ${Object.keys(nlpAnalysis.entities)
          .filter((k) => nlpAnalysis.entities[k].length > 0)
          .join(', ')}`
      )
    );

    // Show refinement suggestions if confidence is low
    if (
      nlpAnalysis.confidence < 0.7 &&
      nlpAnalysis.suggestedRefinements.length > 0
    ) {
      console.log(chalk.yellow('\n💡 Suggestions to improve goal clarity:'));
      nlpAnalysis.suggestedRefinements.forEach((suggestion: string) => {
        console.log(chalk.yellow(`   • ${suggestion}`));
      });
    }

    const context: AgenticExecutionContext = {
      goal: userGoal,
      enhancedGoal: nlpAnalysis.enhancedGoal,
      nlpAnalysis,
      iterations: 0,
      maxIterations: options.maxIterations || this.maxIterations,
      autoExecute: options.autoExecute || false,
      allowIteration: options.allowIteration !== false,
    };

    console.log(chalk.blue('\n🤖 Starting Agentic Reasoning Process...'));
    console.log(chalk.gray(`Original Goal: ${userGoal}`));
    if (nlpAnalysis.enhancedGoal !== userGoal) {
      console.log(chalk.gray(`Enhanced Goal: ${nlpAnalysis.enhancedGoal}`));
    }
    console.log(chalk.gray('─'.repeat(60)));

    try {
      let result = await this.reasoningLoop(context);

      // Generate enhanced response using ResponseGenerator
      let enhancedResponse = null;
      try {
        enhancedResponse =
          await this.responseGenerator.generateEnhancedResponse(
            context.goal,
            currentContext,
            nlpAnalysis
          );
      } catch (responseError: any) {
        console.log(
          chalk.yellow(
            `⚠️ Enhanced response generation failed: ${responseError.message}`
          )
        );
        enhancedResponse = {
          response: 'Goal processing completed with basic response generation.',
          confidence: 0.5,
          sources: [],
          suggestions: [],
        };
      }

      // Final summary with NLP insights
      this.displayExecutionSummary(nlpAnalysis);

      return { ...result, nlpAnalysis, enhancedResponse };
    } catch (error: any) {
      console.log(chalk.red(`❌ Agentic reasoning failed: ${error.message}`));

      // Check if this is a simple goal that can be handled with fallback
      if (
        nlpAnalysis.goalType === 'SIMPLE' ||
        error.message.includes('401') ||
        error.message.includes('API key')
      ) {
        console.log(chalk.yellow('🔄 Attempting simple fallback execution...'));
        try {
          const fallbackResult = await this.executeSimpleFallback(
            userGoal,
            options
          );
          return { ...fallbackResult, nlpAnalysis, fallbackUsed: true };
        } catch (fallbackError: any) {
          console.log(
            chalk.red(`❌ Fallback also failed: ${fallbackError.message}`)
          );
        }
      }

      // If no fallback worked, return the error
      throw new Error(`Agentic execution failed: ${error.message}`);
    }
  }

  async reasoningLoop(
    context: AgenticExecutionContext
  ): Promise<EvaluationResult> {
    while (context.iterations < context.maxIterations) {
      context.iterations++;

      console.log(chalk.cyan(`\n🔄 Iteration ${context.iterations}:`));

      try {
        // Step 1: Plan the approach
        const plan = await this.generatePlan(context);

        // Step 2: Execute the plan
        const executionResult = await this.executePlan(plan, context);

        // Step 3: Evaluate the result
        const evaluation = await this.evaluateResult(executionResult, context);

        // Step 4: Decide if we need to iterate
        if (evaluation.goalAchieved) {
          console.log(chalk.green('✅ Goal achieved successfully!'));
          return evaluation;
        }

        if (!context.allowIteration) {
          return evaluation;
        }

        // Step 5: Learn and adjust for next iteration
        await this.learnFromExecution(executionResult, evaluation, context);

        if (evaluation.shouldContinue === false) {
          console.log(
            chalk.yellow('🛑 Stopping iteration based on evaluation')
          );
          break;
        }
      } catch (error: any) {
        console.log(
          chalk.red(
            `❌ Error in iteration ${context.iterations}: ${error.message}`
          )
        );

        // Attempt to recover
        const recovery = await this.attemptRecovery(error, context);
        if (!recovery.canRecover) {
          break;
        }
      }
    }

    console.log(
      chalk.yellow(`⏱️ Max iterations (${context.maxIterations}) reached`)
    );
    return {
      goalAchieved: false,
      confidence: 0.0,
      reason: 'Maximum iterations reached without achieving goal',
      result: this.executionHistory[this.executionHistory.length - 1],
      shouldContinue: false,
    };
  }

  async generatePlan(context: AgenticExecutionContext): Promise<AgenticPlan> {
    console.log(chalk.blue('📋 Generating execution plan...'));

    const planPrompt = this.buildPlanPrompt(context);

    try {
      const aiResponse = await this.aia.queryAI(planPrompt);
      const plan = parseAgenticPlan(aiResponse) as AgenticPlan;

      console.log(
        chalk.green(`📋 Plan generated with ${plan.steps.length} steps`)
      );
      plan.steps.forEach((step: any, index: number) => {
        console.log(chalk.gray(`   ${index + 1}. ${step.description}`));
      });

      return plan;
    } catch (error: any) {
      console.log(chalk.red(`❌ Plan generation failed: ${error.message}`));
      throw new Error(`Failed to generate execution plan: ${error.message}`);
    }
  }

  async executePlan(
    plan: AgenticPlan,
    context: AgenticExecutionContext
  ): Promise<AgenticExecutionResult> {
    console.log(chalk.blue('⚡ Executing plan...'));

    const executionResult: AgenticExecutionResult = {
      step: {} as any, // Will be populated from plan execution
      success: false,
      output: '',
      confidence: 0,
      timestamp: new Date().toISOString(),
      planId: plan.id,
      steps: [],
    };

    let criticalStepsFailed = 0;
    let totalSteps = plan.steps.length;
    let successfulSteps = 0;

    for (const [index, step] of plan.steps.entries()) {
      console.log(
        chalk.blue(`\n   Step ${index + 1}/${totalSteps}: ${step.description}`)
      );

      try {
        const stepResult = await this.executeStep(step, context);
        executionResult.steps!.push(stepResult);

        if (stepResult.success) {
          successfulSteps++;
          console.log(chalk.green(`   ✅ Step completed successfully`));
        } else {
          console.log(chalk.red(`   ❌ Step failed: ${stepResult.error}`));

          if (step.critical) {
            criticalStepsFailed++;
            console.log(
              chalk.red(`⚠️  Critical step failed: ${step.description}`)
            );

            // Try to suggest recovery for critical steps
            const recovery = await this.suggestStepRecovery(
              step,
              stepResult.error
            );
            if (recovery && recovery.canRecover) {
              console.log(
                chalk.blue(`🔄 Attempting recovery: ${recovery.strategy}`)
              );
              // Could implement recovery execution here
            } else {
              // Stop execution for critical failures unless context allows continuation
              if (criticalStepsFailed >= 2) {
                console.log(
                  chalk.red(
                    `🛑 Too many critical step failures, stopping execution`
                  )
                );
                executionResult.success = false;
                executionResult.error = `Critical step failed: ${stepResult.error}`;
                break;
              }
            }
          } else {
            console.log(
              chalk.yellow(`⚠️  Non-critical step failed, continuing...`)
            );
          }
        }
      } catch (error: any) {
        console.log(chalk.red(`   💥 Step execution error: ${error.message}`));
        const errorResult = {
          stepId: step.id,
          success: false,
          error: error.message,
          output: '',
          timestamp: new Date().toISOString(),
        };
        executionResult.steps!.push(errorResult);

        if (step.critical) {
          criticalStepsFailed++;
          if (criticalStepsFailed >= 2) {
            executionResult.success = false;
            executionResult.error = error.message;
            break;
          }
        }
      }
    }

    // Determine overall success based on step results
    const successRate = successfulSteps / totalSteps;
    if (criticalStepsFailed === 0 && successRate >= 0.7) {
      executionResult.success = true;
      executionResult.confidence = successRate;
      console.log(
        chalk.green(
          `✅ Plan execution completed with ${Math.round(
            successRate * 100
          )}% success rate`
        )
      );
    } else if (successRate >= 0.5) {
      executionResult.success = false; // Partial success but not enough
      executionResult.error = `Partial execution: ${successfulSteps}/${totalSteps} steps successful`;
      console.log(
        chalk.yellow(
          `⚠️  Plan partially executed: ${Math.round(
            successRate * 100
          )}% success rate`
        )
      );
    } else {
      executionResult.success = false;
      if (!executionResult.error) {
        executionResult.error = `Low success rate: ${successfulSteps}/${totalSteps} steps successful`;
      }
      console.log(
        chalk.red(
          `❌ Plan execution failed: ${Math.round(
            successRate * 100
          )}% success rate`
        )
      );
    }

    this.executionHistory.push(executionResult);
    return executionResult;
  }

  async executeStep(step: any, context: AgenticExecutionContext): Promise<any> {
    const stepPrompt = this.buildStepPrompt(step, context);

    try {
      let result: CommandResult;

      if (step.type === 'SEARCH') {
        result = await this.performSearchWithRetry(
          step.query || step.description
        );
      } else if (step.type === 'COMMAND') {
        // Check circuit breaker before executing command
        if (this.isCommandBlocked(step.command)) {
          const blockedInfo = this.commandFailures.get(step.command);
          console.log(
            chalk.yellow(
              `⚠️  Command blocked due to repeated failures: ${step.command}`
            )
          );
          if (blockedInfo?.alternativeSuggested) {
            console.log(
              chalk.blue(
                `💡 Suggested alternative: ${blockedInfo.alternativeSuggested}`
              )
            );
          }

          result = {
            success: false,
            error: `Command blocked due to repeated failures. Last failure: ${blockedInfo?.lastFailure}`,
            output: '',
          };
        } else {
          result = await this.executeCommandWithEnhancedHandling(
            step.command,
            context
          );
        }
      } else {
        // Generic AI-assisted step with retry
        result = await this.executeAIStepWithRetry(stepPrompt);
      }

      // Track command success/failure
      if (step.type === 'COMMAND') {
        this.trackCommandResult(step.command, result);
      }

      return {
        stepId: step.id,
        success: result.success,
        output: result.output || result.data,
        error: result.error,
        timestamp: new Date().toISOString(),
      };
    } catch (error: any) {
      // Track command failure if it was a command step
      if (step.type === 'COMMAND') {
        this.trackCommandResult(step.command, {
          success: false,
          error: error.message,
          output: '',
        });
      }

      throw new Error(`Step execution failed: ${error.message}`);
    }
  }

  async evaluateResult(
    executionResult: AgenticExecutionResult,
    context: AgenticExecutionContext
  ): Promise<EvaluationResult> {
    console.log(chalk.blue('🔍 Evaluating execution result...'));

    const evaluationPrompt = this.buildEvaluationPrompt(
      executionResult,
      context
    );

    try {
      const aiResponse = await this.aia.queryAI(evaluationPrompt);
      const evaluation = parseEvaluationResult(aiResponse) as EvaluationResult;

      console.log(
        chalk[evaluation.goalAchieved ? 'green' : 'yellow'](
          `📊 Goal achieved: ${evaluation.goalAchieved}`
        )
      );
      console.log(
        chalk.gray(`Confidence: ${Math.round(evaluation.confidence * 100)}%`)
      );
      console.log(chalk.gray(`Reason: ${evaluation.reason}`));

      return evaluation;
    } catch (error: any) {
      console.log(chalk.red(`❌ Evaluation failed: ${error.message}`));
      return {
        goalAchieved: false,
        confidence: 0,
        reason: `Evaluation failed: ${error.message}`,
        shouldContinue: false,
        result: executionResult,
      };
    }
  }

  async learnFromExecution(
    executionResult: AgenticExecutionResult,
    evaluation: EvaluationResult,
    context: AgenticExecutionContext
  ): Promise<void> {
    console.log(chalk.blue('🧠 Learning from execution...'));

    // Update conversation context with results
    this.conversationManager.addExchange(
      'default',
      `Execution completed for: ${context.goal}`,
      `Result: ${evaluation.goalAchieved ? 'Success' : 'Failed'} - ${
        evaluation.reason
      }`,
      { executionResult, evaluation }
    );

    // Store the execution in memory for future reference
    const memoryEntry = {
      goal: context.goal,
      plan: executionResult.planId,
      result: executionResult,
      evaluation,
      timestamp: new Date().toISOString(),
      iteration: context.iterations,
    };

    try {
      await this.aia.memoryManager?.storeAgenticHistory(memoryEntry);
    } catch (error: any) {
      console.log(
        chalk.yellow(`⚠️ Failed to store execution history: ${error.message}`)
      );
    }
  }

  async attemptRecovery(
    error: Error,
    context: AgenticExecutionContext
  ): Promise<RecoveryResult> {
    console.log(chalk.yellow('🔄 Attempting recovery...'));

    const recoveryPrompt = this.buildRecoveryPrompt(error, context);

    try {
      const aiResponse = await this.aia.queryAI(recoveryPrompt);
      const recovery = parseRecoveryAnalysis(aiResponse) as RecoveryResult;

      if (recovery.canRecover) {
        console.log(chalk.yellow(`🔄 Recovery strategy: ${recovery.strategy}`));
        console.log(chalk.gray(`Steps: ${recovery.steps.join(', ')}`));
      } else {
        console.log(chalk.red('❌ No recovery strategy available'));
      }

      return recovery;
    } catch (recoveryError: any) {
      console.log(
        chalk.red(`❌ Recovery attempt failed: ${recoveryError.message}`)
      );
      return {
        canRecover: false,
        strategy: 'No recovery possible',
        steps: [],
        reason: `Recovery analysis failed: ${recoveryError.message}`,
      };
    }
  }

  buildPlanPrompt(context: AgenticExecutionContext): string {
    const { goal, enhancedGoal, nlpAnalysis, iterations } = context;

    let prompt = `You are an expert AI assistant helping to achieve the following goal through systematic planning.

GOAL: ${goal}
${enhancedGoal !== goal ? `ENHANCED GOAL: ${enhancedGoal}` : ''}

CONTEXT ANALYSIS:
- Intent: ${nlpAnalysis.intent.intent} (${Math.round(
      nlpAnalysis.intent.confidence * 100
    )}% confidence)
- Goal Type: ${nlpAnalysis.goalType}
- Complexity: ${nlpAnalysis.complexity}
- Entities: ${Object.keys(nlpAnalysis.entities)
      .filter((k) => nlpAnalysis.entities[k].length > 0)
      .join(', ')}

`;

    if (iterations > 0) {
      prompt += `PREVIOUS ATTEMPTS: This is iteration ${
        iterations + 1
      }. Previous attempts did not fully achieve the goal.
Learning from previous iterations:
${this.executionHistory
  .map(
    (h) =>
      `- ${h.success ? 'Partial success' : 'Failed'}: ${
        h.error || 'See execution details'
      }`
  )
  .join('\n')}

`;
    }

    prompt += `Please create a detailed execution plan with the following JSON structure:

{
  "id": "unique_plan_id",
  "description": "Brief description of the plan",
  "confidence": 0.0-1.0,
  "steps": [
    {
      "id": "step_1",
      "description": "What this step accomplishes",
      "type": "SEARCH|COMMAND|ANALYSIS|OTHER",
      "command": "specific command if type is COMMAND",
      "query": "search query if type is SEARCH",
      "critical": true/false,
      "expectedOutput": "what we expect from this step"
    }
  ],
  "reasoning": "Why this plan should work",
  "fallbackOptions": ["alternative approach 1", "alternative approach 2"]
}

Focus on:
1. Breaking down the goal into actionable steps
2. Using available commands and tools effectively
3. Handling potential failure points
4. Being specific and executable`;

    return prompt;
  }

  buildStepPrompt(step: any, context: AgenticExecutionContext): string {
    return `Execute the following step as part of achieving the goal: "${
      context.goal
    }"

STEP: ${step.description}
TYPE: ${step.type}
EXPECTED OUTPUT: ${step.expectedOutput}

${step.command ? `COMMAND: ${step.command}` : ''}
${step.query ? `QUERY: ${step.query}` : ''}

Current context and previous results should be considered.
Provide a clear, actionable response that accomplishes this step.`;
  }

  buildEvaluationPrompt(
    executionResult: AgenticExecutionResult,
    context: AgenticExecutionContext
  ): string {
    const stepsCount = executionResult.steps?.length || 0;
    const successfulSteps =
      executionResult.steps?.filter((s: any) => s.success).length || 0;

    return `Evaluate whether the following execution achieved the stated goal.

ORIGINAL GOAL: ${context.goal}
ENHANCED GOAL: ${context.enhancedGoal}

EXECUTION SUMMARY:
- Total steps: ${stepsCount}
- Successful steps: ${successfulSteps}
- Overall success: ${executionResult.success}
${executionResult.error ? `- Error: ${executionResult.error}` : ''}

STEP DETAILS:
${(executionResult.steps || [])
  .map(
    (step: any, i: number) =>
      `${i + 1}. ${step.success ? '✅' : '❌'} ${step.stepId}: ${
        step.output ? step.output.substring(0, 100) + '...' : step.error
      }`
  )
  .join('\n')}

Please provide evaluation in this JSON format:
{
  "goalAchieved": true/false,
  "confidence": 0.0-1.0,
  "reason": "detailed explanation",
  "shouldContinue": true/false,
  "suggestedImprovements": ["improvement 1", "improvement 2"],
  "partialSuccess": true/false,
  "nextSteps": ["potential next step 1", "potential next step 2"]
}`;
  }

  buildRecoveryPrompt(error: Error, context: AgenticExecutionContext): string {
    return `Analyze the following error and determine if recovery is possible for goal: "${
      context.goal
    }"

ERROR: ${error.message}
ITERATION: ${context.iterations}
MAX ITERATIONS: ${context.maxIterations}

EXECUTION HISTORY:
${this.executionHistory
  .map(
    (h) => `- ${h.success ? 'Success' : 'Failed'}: ${h.error || 'Completed'}`
  )
  .join('\n')}

Provide recovery analysis in this JSON format:
{
  "canRecover": true/false,
  "strategy": "recovery strategy description",
  "steps": ["recovery step 1", "recovery step 2"],
  "reason": "why this recovery approach should work or why recovery is not possible",
  "adjustedGoal": "modified goal if needed",
  "timeoutRecommendation": "suggest if we should continue or stop"
}`;
  }

  async promptForExecution(command: string): Promise<boolean> {
    const answer = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'execute',
        message: `Execute command: ${command}?`,
        default: false,
      },
    ]);
    return answer.execute;
  }

  displayExecutionSummary(nlpAnalysis: NLPAnalysis): void {
    console.log(chalk.blue('\n📊 Execution Summary:'));
    console.log(chalk.gray('─'.repeat(60)));
    console.log(chalk.gray(`Goal Understanding: ${nlpAnalysis.goalType}`));
    console.log(
      chalk.gray(`Confidence: ${Math.round(nlpAnalysis.confidence * 100)}%`)
    );
    console.log(chalk.gray(`Iterations: ${this.executionHistory.length}`));
    console.log(
      chalk.gray(
        `Success Rate: ${Math.round(
          (this.executionHistory.filter((h) => h.success).length /
            this.executionHistory.length) *
            100
        )}%`
      )
    );

    if (nlpAnalysis.suggestedRefinements.length > 0) {
      console.log(chalk.yellow('\n💡 Suggestions for future queries:'));
      nlpAnalysis.suggestedRefinements.forEach((suggestion) => {
        console.log(chalk.yellow(`   • ${suggestion}`));
      });
    }
  }

  async executeSimpleFallback(
    userGoal: string,
    options: AgenticQueryOptions = {}
  ): Promise<AgenticQueryResult> {
    console.log(chalk.yellow('🔄 Executing simple fallback approach...'));

    // Try to extract a simple command from the goal
    const fallbackCommands = this.extractFallbackCommands(userGoal);

    for (const command of fallbackCommands) {
      console.log(chalk.gray(`Trying: ${command}`));

      if (!options.autoExecute) {
        const shouldExecute = await this.promptForExecution(command);
        if (!shouldExecute) {
          console.log(chalk.yellow('❌ Command execution declined by user'));
          return { goalAchieved: false, reason: 'Cancelled by user' };
        }
      }

      try {
        const result = await this.aia.executeCommand(command);
        if (result.success) {
          console.log(chalk.green('✅ Command executed successfully'));
          return { goalAchieved: true, result, fallbackUsed: true };
        } else {
          console.log(chalk.red(`❌ Command failed: ${result.error}`));
          return {
            goalAchieved: false,
            reason: result.error,
            fallbackUsed: true,
          };
        }
      } catch (error: any) {
        console.log(chalk.red(`❌ Execution error: ${error.message}`));
        console.log(
          chalk.yellow(`⚠️  Error executing command: ${error.message}`)
        );
        return {
          goalAchieved: false,
          reason: error.message,
          fallbackUsed: true,
        };
      }
    }

    return {
      goalAchieved: false,
      reason: 'No suitable fallback found',
      fallbackUsed: true,
    };
  }

  private extractFallbackCommands(goal: string): string[] {
    const commands: string[] = [];
    const lowerGoal = goal.toLowerCase();

    // Extract common patterns
    if (lowerGoal.includes('list') || lowerGoal.includes('show')) {
      commands.push('ls -la');
    }
    if (lowerGoal.includes('find') || lowerGoal.includes('search')) {
      const match = goal.match(
        /find\s+["']([^"']+)["']|search\s+for\s+["']([^"']+)["']/i
      );
      if (match) {
        const searchTerm = match[1] || match[2];
        commands.push(`find . -name "*${searchTerm}*" -type f`);
      }
    }
    if (lowerGoal.includes('git status') || lowerGoal.includes('status')) {
      commands.push('git status');
    }
    if (lowerGoal.includes('git log') || lowerGoal.includes('log')) {
      commands.push('git log --oneline -10');
    }

    return commands.length > 0 ? commands : ['ls -la']; // Default fallback
  }

  /**
   * Execute a command safely with timeout and output limits
   */
  async executeSafeCommand(
    command: string,
    options: { timeout?: number; maxOutputSize?: number } = {}
  ): Promise<CommandResult> {
    try {
      return await this.aia.executeCommand(command, [], {
        timeout: options.timeout || 5000,
        maxOutputSize: options.maxOutputSize || 10000,
      });
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
        output: '',
      };
    }
  }

  /**
   * Enhanced command execution with smart error handling
   */
  async executeCommandWithEnhancedHandling(
    command: string,
    context: AgenticExecutionContext
  ): Promise<CommandResult> {
    try {
      // Pre-validate command exists
      const validationResult = await this.validateCommand(command);
      if (!validationResult.valid) {
        return {
          success: false,
          error: `Command validation failed: ${validationResult.reason}`,
          output: '',
        };
      }

      // Check if user approval needed
      if (!context.autoExecute) {
        const shouldExecute = await this.promptForExecution(command);
        if (!shouldExecute) {
          return {
            success: false,
            error: 'User declined execution',
            output: '',
          };
        }
      }

      // Execute with retry logic
      return await this.errorHandler.withRetry(
        () => this.executeSafeCommand(command),
        {
          maxRetries: 2,
          baseDelay: 1000,
          retryCondition: (error: Error) => {
            // Don't retry certain types of errors
            const nonRetryableErrors = [
              'command not found',
              'permission denied',
              'no such file',
              'user declined',
            ];
            return !nonRetryableErrors.some((err) =>
              error.message.toLowerCase().includes(err)
            );
          },
        }
      );
    } catch (error: any) {
      console.log(chalk.red(`❌ Command execution failed: ${error.message}`));

      // Suggest alternatives for common failures
      const alternative = this.suggestCommandAlternative(
        command,
        error.message
      );
      if (alternative) {
        console.log(chalk.blue(`💡 Suggested alternative: ${alternative}`));
        this.setCommandAlternative(command, alternative);
      }

      return {
        success: false,
        error: error.message,
        output: '',
      };
    }
  }

  /**
   * Validate if a command exists and is safe to execute
   */
  async validateCommand(
    command: string
  ): Promise<{ valid: boolean; reason?: string }> {
    try {
      // Extract base command (first word)
      const baseCommand = command.trim().split(' ')[0];

      // Check if command exists using 'which' (Unix-like systems)
      const whichResult = await this.aia.executeCommand(
        'which',
        [baseCommand],
        {
          timeout: 2000,
          captureOutput: true,
        }
      );

      if (!whichResult.success) {
        return {
          valid: false,
          reason: `Command '${baseCommand}' not found in PATH`,
        };
      }

      return { valid: true };
    } catch (error: any) {
      return {
        valid: false,
        reason: `Command validation error: ${error.message}`,
      };
    }
  }

  /**
   * Search with retry capability
   */
  async performSearchWithRetry(query: string): Promise<CommandResult> {
    try {
      return await this.errorHandler.withRetry(
        () => this.searchEngine.performSearch(query),
        { maxRetries: 2, baseDelay: 500 }
      );
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
        output: '',
      };
    }
  }

  /**
   * AI step execution with retry
   */
  async executeAIStepWithRetry(stepPrompt: string): Promise<CommandResult> {
    try {
      return await this.errorHandler.withRetry(
        async () => {
          const aiResponse = await this.aia.queryAI(stepPrompt);
          return { success: true, output: aiResponse, error: undefined };
        },
        { maxRetries: 2, baseDelay: 1000 }
      );
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
        output: '',
      };
    }
  }

  /**
   * Check if a command is blocked by circuit breaker
   */
  isCommandBlocked(command: string): boolean {
    const failure = this.commandFailures.get(command);
    if (!failure) return false;

    if (failure.isBlocked && Date.now() > failure.blockUntil) {
      // Reset the circuit breaker
      failure.isBlocked = false;
      failure.consecutiveFailures = 0;
      console.log(
        chalk.green(`🔄 Circuit breaker reset for command: ${command}`)
      );
    }

    return failure.isBlocked;
  }

  /**
   * Track command execution results for circuit breaker pattern
   */
  trackCommandResult(command: string, result: CommandResult): void {
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
  suggestCommandAlternative(
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
    }

    return null;
  }

  /**
   * Set alternative command for a failed command
   */
  setCommandAlternative(command: string, alternative: string): void {
    const baseCommand = command.trim().split(' ')[0];
    const failure = this.commandFailures.get(baseCommand);
    if (failure) {
      failure.alternativeSuggested = alternative;
    }
  }

  /**
   * Suggest recovery strategies for failed steps
   */
  async suggestStepRecovery(
    step: any,
    errorMessage: string
  ): Promise<RecoveryResult | null> {
    try {
      const lowerError = errorMessage.toLowerCase();

      // Quick recovery suggestions based on common error patterns
      if (lowerError.includes('command not found')) {
        const alternative = this.suggestCommandAlternative(
          step.command,
          errorMessage
        );
        if (alternative) {
          return {
            canRecover: true,
            strategy: `Use alternative command: ${alternative}`,
            steps: [`Execute: ${alternative}`],
            reason: 'Original command not available, trying alternative',
          };
        }
      }

      if (lowerError.includes('permission denied')) {
        return {
          canRecover: true,
          strategy: 'Request elevated permissions',
          steps: [
            'Try with sudo/administrator privileges',
            'Check file permissions',
          ],
          reason: 'Permission issue detected',
        };
      }

      if (lowerError.includes('timeout') || lowerError.includes('timed out')) {
        return {
          canRecover: true,
          strategy: 'Retry with longer timeout',
          steps: ['Increase timeout duration', 'Check network connectivity'],
          reason: 'Operation timed out, may need more time',
        };
      }

      if (
        lowerError.includes('no such file') ||
        lowerError.includes('file not found')
      ) {
        return {
          canRecover: true,
          strategy: 'Verify file paths and existence',
          steps: [
            'Check if file exists',
            'Verify correct path',
            'Create missing directories',
          ],
          reason: 'File path issue detected',
        };
      }

      // For non-command steps or unrecognized errors
      return {
        canRecover: false,
        strategy: 'Manual intervention required',
        steps: [
          'Review error message',
          'Check step requirements',
          'Consider alternative approach',
        ],
        reason: 'Error type requires human review',
      };
    } catch (error: any) {
      console.warn(
        chalk.yellow(
          `Warning: Could not generate recovery suggestion: ${error.message}`
        )
      );
      return null;
    }
  }

  /**
   * Enhanced plan execution with graceful failure handling
   */
  async executePlanWithGracefulHandling(
    plan: AgenticPlan,
    context: AgenticExecutionContext,
    options: EnhancedExecutionOptions = {}
  ): Promise<AgenticExecutionResult> {
    const {
      continueOnFailure = true,
      gracefulDegradation = true,
      allowFallbackExecution = true,
      skipNonCritical = true,
    } = options;

    console.log(
      chalk.blue(
        '🚀 Starting enhanced execution with graceful failure handling...'
      )
    );

    const executionResult: AgenticExecutionResult = {
      step: {
        command: 'workflow',
        description: plan.description || 'Execute workflow',
        expectedOutcome: 'Complete workflow execution',
        reasoning:
          plan.reasoning || 'Executing plan with graceful failure handling',
        risks: plan.fallbackOptions?.map((f) => `Fallback: ${f}`) || [],
        dependencies: [],
      },
      success: false,
      output: '',
      confidence: 0,
      timestamp: new Date().toISOString(),
      steps: [],
      error: undefined,
    };

    let successfulSteps = 0;
    let criticalStepsFailed = 0;
    let totalSteps = plan.steps?.length || 0;
    let workflowShouldContinue = true;

    for (let i = 0; i < totalSteps && workflowShouldContinue; i++) {
      const step = plan.steps![i];
      const stepNumber = i + 1;

      console.log(
        chalk.cyan(`📋 Step ${stepNumber}/${totalSteps}: ${step.description}`)
      );

      try {
        // Execute step with enhanced error handling
        const stepResult = await this.executeStepWithRecovery(
          step,
          context,
          options
        );
        executionResult.steps!.push(stepResult);

        if (stepResult.success) {
          successfulSteps++;
          console.log(
            chalk.green(`   ✅ Step ${stepNumber} completed successfully`)
          );
        } else {
          console.log(
            chalk.yellow(
              `   ⚠️  Step ${stepNumber} failed: ${stepResult.error}`
            )
          );

          // Determine recovery strategy
          const recoveryStrategy = await this.determineRecoveryStrategy(
            step,
            stepResult,
            context
          );

          if (step.critical && !stepResult.recoveryAttempted) {
            criticalStepsFailed++;
            console.log(
              chalk.red(`❌ Critical step failed: ${step.description}`)
            );

            // For critical steps, try harder recovery
            if (allowFallbackExecution) {
              const fallbackResult = await this.attemptStepFallback(
                step,
                stepResult,
                context
              );
              if (fallbackResult.success) {
                successfulSteps++;
                console.log(
                  chalk.green(
                    `✅ Fallback execution successful for critical step`
                  )
                );
                continue;
              }
            }

            // Decide whether to continue after critical failure
            if (criticalStepsFailed >= 2 && !continueOnFailure) {
              console.log(
                chalk.red(`🛑 Multiple critical failures, stopping execution`)
              );
              workflowShouldContinue = false;
              executionResult.error = `Critical step failed: ${stepResult.error}`;
              break;
            }
          } else if (!step.critical && skipNonCritical) {
            console.log(
              chalk.yellow(
                `⏭️  Skipping non-critical step failure, continuing workflow`
              )
            );
          }

          // Apply graceful degradation if enabled
          if (gracefulDegradation) {
            const degradedResult = await this.applyGracefulDegradation(
              step,
              stepResult,
              context
            );
            if (degradedResult) {
              console.log(
                chalk.blue(
                  `🔄 Applied graceful degradation: ${degradedResult.fallbackStrategy}`
                )
              );
              executionResult.steps![executionResult.steps!.length - 1] =
                degradedResult;
              if (degradedResult.continueWorkflow) {
                continue;
              }
            }
          }
        }
      } catch (error: any) {
        console.log(
          chalk.red(
            `💥 Unexpected error in step ${stepNumber}: ${error.message}`
          )
        );

        // Handle unexpected errors gracefully
        const errorResult: EnhancedStepResult = {
          stepId: step.id,
          success: false,
          output: '',
          error: error.message,
          timestamp: new Date().toISOString(),
          recoveryAttempted: false,
          continueWorkflow: continueOnFailure && !step.critical,
        };

        executionResult.steps!.push(errorResult);

        if (step.critical) {
          criticalStepsFailed++;
          if (!continueOnFailure) {
            workflowShouldContinue = false;
            executionResult.error = `Critical step error: ${error.message}`;
            break;
          }
        }
      }
    }

    // Calculate final success based on graceful failure handling
    const successRate = totalSteps > 0 ? successfulSteps / totalSteps : 0;

    if (successRate >= 0.8 || (gracefulDegradation && successRate >= 0.6)) {
      executionResult.success = true;
      console.log(
        chalk.green(
          `✅ Workflow completed with ${Math.round(
            successRate * 100
          )}% success rate`
        )
      );
    } else if (successRate >= 0.4 && continueOnFailure) {
      executionResult.success = false;
      executionResult.error = `Partial success: ${successfulSteps}/${totalSteps} steps completed`;
      console.log(
        chalk.yellow(
          `⚠️  Workflow partially completed: ${Math.round(
            successRate * 100
          )}% success rate`
        )
      );
    } else {
      executionResult.success = false;
      if (!executionResult.error) {
        executionResult.error = `Low success rate: ${successfulSteps}/${totalSteps} steps completed`;
      }
      console.log(
        chalk.red(
          `❌ Workflow failed: ${Math.round(successRate * 100)}% success rate`
        )
      );
    }

    // Provide summary with actionable recommendations
    this.provideSummaryWithRecommendations(executionResult, context);

    this.executionHistory.push(executionResult);
    return executionResult;
  }

  /**
   * Execute a step with enhanced recovery mechanisms
   */
  async executeStepWithRecovery(
    step: any,
    context: AgenticExecutionContext,
    options: EnhancedExecutionOptions = {}
  ): Promise<EnhancedStepResult> {
    const baseResult: EnhancedStepResult = {
      stepId: step.id,
      success: false,
      output: '',
      error: '',
      timestamp: new Date().toISOString(),
      recoveryAttempted: false,
      continueWorkflow: true,
    };

    try {
      // First attempt - normal execution
      const result = await this.executeStep(step, context);

      if (result.success) {
        return { ...baseResult, ...result, success: true };
      }

      // Step failed, attempt recovery
      console.log(
        chalk.yellow(
          `🔧 Attempting recovery for failed step: ${step.description}`
        )
      );
      baseResult.recoveryAttempted = true;
      baseResult.error = result.error;

      // Try alternative command if available
      if (step.type === 'COMMAND' && options.suggestAlternatives !== false) {
        const alternative = this.suggestCommandAlternative(
          step.command,
          result.error
        );
        if (alternative) {
          console.log(
            chalk.blue(`💡 Trying alternative command: ${alternative}`)
          );

          try {
            const altResult = await this.executeCommandWithEnhancedHandling(
              alternative,
              context
            );

            if (altResult.success) {
              console.log(chalk.green(`✅ Alternative command succeeded`));
              return {
                ...baseResult,
                success: true,
                output: altResult.output || '',
                alternativeUsed: alternative,
                error: undefined,
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
      }

      // Try step-specific recovery strategies
      const recoveryResult = await this.suggestStepRecovery(step, result.error);
      if (recoveryResult?.canRecover) {
        console.log(
          chalk.blue(
            `🔄 Applying recovery strategy: ${recoveryResult.strategy}`
          )
        );

        // Execute recovery steps
        for (const recoveryStep of recoveryResult.steps) {
          try {
            const recoveryStepResult = await this.executeSafeCommand(
              recoveryStep
            );
            if (recoveryStepResult.success) {
              console.log(
                chalk.green(`✅ Recovery step succeeded: ${recoveryStep}`)
              );

              // Retry original step after recovery
              const retryResult = await this.executeStep(step, context);
              if (retryResult.success) {
                return {
                  ...baseResult,
                  success: true,
                  output: retryResult.output,
                  fallbackStrategy: recoveryResult.strategy,
                  error: undefined,
                };
              }
            }
          } catch (recoveryError) {
            console.log(
              chalk.yellow(`⚠️  Recovery step failed: ${recoveryStep}`)
            );
          }
        }
      }

      // If all recovery attempts failed, determine if workflow should continue
      const shouldContinue =
        !step.critical || options.continueOnFailure === true;

      return {
        ...baseResult,
        success: false,
        continueWorkflow: shouldContinue,
        skipReason: shouldContinue
          ? 'Non-critical step failure, continuing workflow'
          : undefined,
      };
    } catch (error: any) {
      return {
        ...baseResult,
        success: false,
        error: error.message,
        continueWorkflow: !step.critical || options.continueOnFailure === true,
      };
    }
  }

  /**
   * Determine appropriate recovery strategy for a failed step
   */
  async determineRecoveryStrategy(
    step: any,
    stepResult: EnhancedStepResult,
    context: AgenticExecutionContext
  ): Promise<WorkflowRecoveryStrategy> {
    const errorMessage = stepResult.error?.toLowerCase() || '';

    return {
      skipFailedStep:
        !step.critical &&
        (errorMessage.includes('command not found') ||
          errorMessage.includes('permission denied')),
      useAlternativeCommand:
        errorMessage.includes('command not found') ||
        errorMessage.includes('not installed'),
      continueWithLimitedCapabilities:
        !step.critical &&
        (errorMessage.includes('timeout') || errorMessage.includes('network')),
      suggestManualIntervention:
        step.critical &&
        (errorMessage.includes('permission denied') ||
          errorMessage.includes('authentication')),
      provideFallbackSolution:
        errorMessage.includes('not available') ||
        errorMessage.includes('not supported'),
    };
  }

  /**
   * Attempt fallback execution for critical steps
   */
  async attemptStepFallback(
    step: any,
    failedResult: EnhancedStepResult,
    context: AgenticExecutionContext
  ): Promise<EnhancedStepResult> {
    console.log(
      chalk.blue(`🔄 Attempting fallback execution for: ${step.description}`)
    );

    // Extract goal-related commands as fallback
    const fallbackCommands = this.extractFallbackCommands(step.description);

    for (const fallbackCommand of fallbackCommands) {
      try {
        console.log(chalk.gray(`Trying fallback: ${fallbackCommand}`));
        const result = await this.executeSafeCommand(fallbackCommand);

        if (result.success) {
          return {
            stepId: step.id,
            success: true,
            output: result.output || 'Fallback execution completed',
            error: undefined,
            timestamp: new Date().toISOString(),
            recoveryAttempted: true,
            fallbackStrategy: `Fallback command: ${fallbackCommand}`,
            continueWorkflow: true,
          };
        }
      } catch (error) {
        continue; // Try next fallback
      }
    }

    return failedResult;
  }

  /**
   * Apply graceful degradation when steps fail
   */
  async applyGracefulDegradation(
    step: any,
    failedResult: EnhancedStepResult,
    context: AgenticExecutionContext
  ): Promise<EnhancedStepResult | null> {
    if (step.critical) {
      return null; // Don't degrade critical steps
    }

    const errorMessage = failedResult.error?.toLowerCase() || '';

    // Different degradation strategies based on error type
    if (errorMessage.includes('timeout')) {
      return {
        ...failedResult,
        success: false,
        fallbackStrategy: 'Timeout - continuing with partial results',
        continueWorkflow: true,
        skipReason: 'Operation timed out, but non-critical for workflow',
      };
    }

    if (errorMessage.includes('command not found')) {
      return {
        ...failedResult,
        success: false,
        fallbackStrategy: 'Tool not available - workflow adapted',
        continueWorkflow: true,
        skipReason: 'Required tool not installed, but workflow can continue',
      };
    }

    if (errorMessage.includes('permission denied')) {
      return {
        ...failedResult,
        success: false,
        fallbackStrategy:
          'Permission issue - continuing with available operations',
        continueWorkflow: true,
        skipReason:
          'Insufficient permissions, but other operations can proceed',
      };
    }

    // Default graceful degradation
    return {
      ...failedResult,
      success: false,
      fallbackStrategy: 'Step failed but marked as non-critical',
      continueWorkflow: true,
      skipReason:
        'Non-critical step failure, continuing with reduced functionality',
    };
  }

  /**
   * Provide comprehensive summary with actionable recommendations
   */
  provideSummaryWithRecommendations(
    result: AgenticExecutionResult,
    context: AgenticExecutionContext
  ): void {
    console.log(chalk.bold('\n📊 Execution Summary with Recommendations:'));
    console.log(chalk.dim('─'.repeat(60)));

    const totalSteps = result.steps?.length || 0;
    const successfulSteps = result.steps?.filter((s) => s.success).length || 0;
    const failedSteps = result.steps?.filter((s) => !s.success) || [];
    const recoveredSteps =
      result.steps?.filter(
        (s) => (s as EnhancedStepResult).recoveryAttempted && s.success
      ).length || 0;

    console.log(chalk.cyan(`📋 Total Steps: ${totalSteps}`));
    console.log(chalk.green(`✅ Successful: ${successfulSteps}`));
    console.log(chalk.red(`❌ Failed: ${failedSteps.length}`));
    console.log(chalk.blue(`🔄 Recovered: ${recoveredSteps}`));
    console.log(
      chalk.yellow(
        `📈 Success Rate: ${Math.round((successfulSteps / totalSteps) * 100)}%`
      )
    );

    if (failedSteps.length > 0) {
      console.log(chalk.yellow('\n💡 Recommendations for Failed Steps:'));

      failedSteps.forEach((step, index) => {
        const enhancedStep = step as EnhancedStepResult;
        console.log(chalk.dim(`\n${index + 1}. Step: ${step.stepId}`));
        console.log(chalk.red(`   Error: ${step.error}`));

        if (enhancedStep.alternativeUsed) {
          console.log(
            chalk.blue(`   Alternative used: ${enhancedStep.alternativeUsed}`)
          );
        }

        if (enhancedStep.fallbackStrategy) {
          console.log(
            chalk.blue(`   Fallback applied: ${enhancedStep.fallbackStrategy}`)
          );
        }

        if (enhancedStep.skipReason) {
          console.log(
            chalk.yellow(
              `   Reason for continuation: ${enhancedStep.skipReason}`
            )
          );
        }

        // Provide specific recommendations
        this.provideStepRecommendations(step);
      });
    }

    if (result.success) {
      console.log(
        chalk.green(
          '\n🎉 Workflow completed successfully with graceful error handling!'
        )
      );
    } else {
      console.log(
        chalk.yellow(
          '\n⚠️  Workflow completed with some limitations. Check recommendations above.'
        )
      );
    }

    console.log(chalk.dim('─'.repeat(60)));
  }

  /**
   * Provide specific recommendations for failed steps
   */
  provideStepRecommendations(step: StepResult): void {
    const errorMessage = step.error?.toLowerCase() || '';

    if (errorMessage.includes('command not found')) {
      console.log(
        chalk.blue(`   💡 Install the missing tool or use alternative commands`)
      );
    } else if (errorMessage.includes('permission denied')) {
      console.log(
        chalk.blue(
          `   💡 Check file permissions or run with appropriate privileges`
        )
      );
    } else if (errorMessage.includes('timeout')) {
      console.log(
        chalk.blue(`   💡 Increase timeout or check network connectivity`)
      );
    } else if (errorMessage.includes('not installed')) {
      console.log(
        chalk.blue(
          `   💡 Install required dependencies: npm install / yarn install`
        )
      );
    } else if (
      errorMessage.includes('api key') ||
      errorMessage.includes('unauthorized')
    ) {
      console.log(chalk.blue(`   💡 Check API credentials and configuration`));
    } else {
      console.log(
        chalk.blue(
          `   💡 Review error details and try manual execution if needed`
        )
      );
    }
  }
}
