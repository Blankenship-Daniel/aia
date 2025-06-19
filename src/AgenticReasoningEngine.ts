import chalk from 'chalk';
import inquirer from 'inquirer';
import AgenticSearchEngine from './AgenticSearchEngine.js';
import NLPEngine from './NLPEngine.js';
import { ConversationContextManager } from './ConversationContextManager.js';
import { ResponseGenerator } from './ResponseGenerator.js';
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
 * Enhanced Agentic Reasoning System with Advanced NLP
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

  constructor(aia: any) {
    this.aia = aia;
    this.maxIterations = 5;
    this.currentGoal = null;
    this.executionHistory = [];
    this.searchEngine = new AgenticSearchEngine(aia);
    this.nlpEngine = new NLPEngine(aia);
    this.conversationManager = new ConversationContextManager(aia);
    this.responseGenerator = new ResponseGenerator(aia);
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

    for (const [index, step] of plan.steps.entries()) {
      console.log(chalk.blue(`\n   Step ${index + 1}: ${step.description}`));

      try {
        const stepResult = await this.executeStep(step, context);
        executionResult.steps!.push(stepResult);

        if (!stepResult.success && step.critical) {
          console.log(
            chalk.red(`❌ Critical step failed: ${step.description}`)
          );
          executionResult.success = false;
          executionResult.error = stepResult.error;
          break;
        }

        console.log(chalk.green(`   ✅ Step completed`));
      } catch (error: any) {
        console.log(chalk.red(`   ❌ Step failed: ${error.message}`));
        const errorResult = {
          stepId: step.id,
          success: false,
          error: error.message,
          output: '',
          timestamp: new Date().toISOString(),
        };
        executionResult.steps!.push(errorResult);

        if (step.critical) {
          executionResult.success = false;
          executionResult.error = error.message;
          break;
        }
      }
    }

    if (!executionResult.error) {
      executionResult.success = true;
    }

    this.executionHistory.push(executionResult);
    return executionResult;
  }

  async executeStep(step: any, context: AgenticExecutionContext): Promise<any> {
    const stepPrompt = this.buildStepPrompt(step, context);

    try {
      let result: CommandResult;

      if (step.type === 'SEARCH') {
        result = await this.searchEngine.performSearch(
          step.query || step.description
        );
      } else if (step.type === 'COMMAND') {
        if (context.autoExecute) {
          result = await this.executeSafeCommand(step.command);
        } else {
          const shouldExecute = await this.promptForExecution(step.command);
          if (shouldExecute) {
            result = await this.executeSafeCommand(step.command);
          } else {
            result = { success: false, error: 'User declined execution' };
          }
        }
      } else {
        // Generic AI-assisted step
        const aiResponse = await this.aia.queryAI(stepPrompt);
        result = { success: true, output: aiResponse };
      }

      return {
        stepId: step.id,
        success: result.success,
        output: result.output || result.data,
        error: result.error,
        timestamp: new Date().toISOString(),
      };
    } catch (error: any) {
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
}
