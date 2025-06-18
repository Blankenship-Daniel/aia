const chalk = require('chalk');
const inquirer = require('inquirer');
const AgenticSearchEngine = require('./AgenticSearchEngine');
const NLPEngine = require('./NLPEngine');
const ConversationContextManager = require('./ConversationContextManager');
const ResponseGenerator = require('./ResponseGenerator');
const {
  parseAgenticPlan,
  parseEvaluationResult,
  parseStepVerification,
  parseRecoveryAnalysis,
  parseRecoveryPlan,
  parseStepValidation,
} = require('./utils/RobustJSONParser');

// Enhanced Agentic Reasoning System with Advanced NLP
class AgenticReasoningEngine {
  constructor(aia) {
    this.aia = aia;
    this.maxIterations = 5;
    this.currentGoal = null;
    this.executionHistory = [];
    this.searchEngine = new AgenticSearchEngine(aia);
    this.nlpEngine = new NLPEngine(aia);
    this.conversationManager = new ConversationContextManager();
    this.responseGenerator = new ResponseGenerator(aia);
  }

  async executeAgenticQuery(userGoal, options = {}) {
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
    this.conversationManager.addUserInput(userGoal, nlpAnalysis);

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
      nlpAnalysis.suggestedRefinements.forEach((suggestion) => {
        console.log(chalk.yellow(`   • ${suggestion}`));
      });
    }

    const context = {
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
      } catch (responseError) {
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
    } catch (error) {
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
        } catch (fallbackError) {
          console.log(
            chalk.red(`❌ Fallback also failed: ${fallbackError.message}`)
          );
        }
      }

      // If no fallback worked, return the error
      throw new Error(`Agentic execution failed: ${error.message}`);
    }
  }

  async reasoningLoop(context) {
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
      } catch (error) {
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
      chalk.yellow(`⚠️ Reached maximum iterations (${context.maxIterations})`)
    );
    return { goalAchieved: false, reason: 'Max iterations reached' };
  }

  async generatePlan(context) {
    console.log(chalk.blue('🔍 Gathering enhanced context for planning...'));

    // Step 1: Use CLI to gather dynamic information about the current state
    const dynamicContext = await this.gatherDynamicContext(context.goal);

    // Step 2: Use the search engine to gather relevant context from memory/files
    const enhancedContext = await this.searchEngine.gatherRelevantContext(
      context.goal,
      context
    );

    // Step 3: Extract insights from historical patterns
    const historicalInsights = this.analyzeHistoricalPatterns(context.goal);

    // Step 4: Use conversation context for better plan generation
    const conversationContext = this.conversationManager.getRelevantContext(
      context.goal
    );

    // Step 5: Convert NLP analysis to structured query for better planning
    const structuredQuery = context.nlpAnalysis
      ? await this.nlpEngine.convertToStructuredQuery(context.nlpAnalysis)
      : null;

    const planningPrompt = `
You are an AI agent tasked with achieving this goal: "${
      context.enhancedGoal || context.goal
    }"

NLP Analysis Insights:
${
  context.nlpAnalysis
    ? JSON.stringify(
        {
          intent: context.nlpAnalysis.intent,
          entities: context.nlpAnalysis.entities,
          goalType: context.nlpAnalysis.goalType,
          confidence: context.nlpAnalysis.confidence,
          contextualInsights: context.nlpAnalysis.contextualInsights,
        },
        null,
        2
      )
    : 'No NLP analysis available'
}

Structured Query (derived from NLP):
${
  structuredQuery
    ? JSON.stringify(structuredQuery, null, 2)
    : 'No structured query available'
}

Conversation Context:
${JSON.stringify(conversationContext, null, 2)}

Dynamic Context (gathered by executing CLI commands):
${JSON.stringify(dynamicContext, null, 2)}

Enhanced Context:
${JSON.stringify(enhancedContext, null, 2)}

Previous execution history (last 3 attempts):
${JSON.stringify(this.executionHistory.slice(-3), null, 2)}

Historical Insights:
${JSON.stringify(historicalInsights, null, 2)}

Current iteration: ${context.iterations}
Max iterations allowed: ${context.maxIterations}

Based on the enhanced context above, create a step-by-step plan. Consider:
- NLP insights about user intent, entities, and goal complexity
- Structured query recommendations for execution strategy
- Dynamic information gathered from current system state
- Relevant past conversations and commands from memory
- Current project structure and dependencies  
- Available tools and system capabilities
- Historical success/failure patterns and recovery strategies
- Environmental context and platform-specific commands
- Previous iteration failures and what was learned
- Conversation context and reference resolution

${
  context.iterations > 1
    ? `
IMPORTANT: This is iteration ${
        context.iterations
      } - learn from previous failures:
${
  this.executionHistory.slice(-1)[0]?.learnings
    ? JSON.stringify(this.executionHistory.slice(-1)[0].learnings, null, 2)
    : 'No specific learnings from last iteration'
}

Adapt your plan based on what didn't work before.
`
    : ''
}

CRITICAL: You MUST respond with ONLY valid JSON. No explanatory text, no markdown, no additional content.
Return EXACTLY this JSON structure with no other text:

{
  "steps": [
    {
      "action": "command",
      "description": "Find all JavaScript files in the project",
      "command": "find . -name '*.js' -type f",
      "expectedOutcome": "List of all .js files",
      "verificationMethod": "Check if files are listed"
    }
  ],
  "successCriteria": "How to know the overall goal is achieved",
  "riskAssessment": "Potential issues and mitigation",
  "contextInsights": "Key insights from the enhanced context that influenced this plan"
}

Start your response with { and end with }. No other text before or after.
Generate actual commands to achieve the goal. Use only valid shell commands appropriate for the current environment.
`;

    try {
      const response = await this.aia.queryAI(planningPrompt);

      // Check if response is valid - add comprehensive type and content validation
      if (
        !response ||
        typeof response !== 'string' ||
        response.trim().length === 0
      ) {
        console.log(
          chalk.yellow(
            '⚠️ AI response is empty or invalid, using fallback plan'
          )
        );
        throw new Error('AI response is empty or invalid');
      }

      // Additional validation for response content
      if (
        response.trim().toLowerCase() === 'no response' ||
        response.trim().toLowerCase() === 'error' ||
        response.includes('I cannot') ||
        response.includes("I'm unable")
      ) {
        console.log(
          chalk.yellow(
            '⚠️ AI declined to provide response, using fallback plan'
          )
        );
        throw new Error('AI declined to provide valid response');
      }

      // Use robust JSON parser to extract plan
      console.log(chalk.blue('🔍 Parsing AI plan response...'));
      const plan = parseAgenticPlan(response, true);

      if (!plan) {
        console.log(chalk.red('❌ Failed to parse plan from AI response'));
        console.log(
          chalk.gray(
            `Response preview: ${String(response).substring(0, 200)}...`
          )
        );
        throw new Error('Unable to parse valid plan from AI response');
      }

      // Validate that the plan has the required structure
      if (
        !plan.steps ||
        !Array.isArray(plan.steps) ||
        plan.steps.length === 0
      ) {
        console.log(
          chalk.yellow('⚠️ Plan missing valid steps array, attempting fallback')
        );
        throw new Error('Invalid plan structure: missing or empty steps array');
      }

      console.log(chalk.blue('📋 Generated Plan:'));
      plan.steps.forEach((step, i) => {
        console.log(chalk.gray(`  ${i + 1}. ${step.description}`));
        if (step.command) {
          console.log(chalk.yellow(`     Command: ${step.command}`));
        }
      });

      if (plan.contextInsights) {
        console.log(chalk.blue('💡 Context Insights:'));
        console.log(chalk.gray(`    ${plan.contextInsights}`));
      }

      return plan;
    } catch (error) {
      console.log(chalk.red(`❌ Failed to parse plan: ${error.message}`));
      console.log(
        chalk.gray(`Parse error details: ${error.stack || error.message}`)
      );

      // Safe way to log response details with enhanced debugging
      try {
        if (response && typeof response === 'string') {
          const responseStr = String(response);
          console.log(
            chalk.gray(`Response length: ${responseStr.length} chars`)
          );
          console.log(
            chalk.gray(`Response preview: ${responseStr.substring(0, 200)}...`)
          );

          // Log if response contains common failure indicators
          if (
            responseStr.toLowerCase().includes('cannot') ||
            responseStr.toLowerCase().includes('unable') ||
            responseStr.toLowerCase().includes('sorry')
          ) {
            console.log(
              chalk.yellow('⚠️ AI response contains refusal indicators')
            );
          }

          // Check if response looks like JSON
          const hasJsonStart = responseStr.trim().startsWith('{');
          const hasJsonEnd = responseStr.trim().endsWith('}');
          console.log(
            chalk.gray(
              `JSON indicators: starts with '{': ${hasJsonStart}, ends with '}': ${hasJsonEnd}`
            )
          );
        } else {
          console.log(
            chalk.gray(`Response type: ${typeof response}, value: ${response}`)
          );
        }
      } catch (logError) {
        console.log(chalk.gray('Could not display response details'));
      }
    }

    // Fallback plan - create a meaningful command-based plan
    console.log(chalk.yellow('Using intelligent fallback plan generation...'));

    // Generate a comprehensive plan based on the goal and context
    const goalLower = context.goal.toLowerCase();
    const steps = [];

    // Analyze the goal to create meaningful steps
    if (goalLower.includes('analyze') && goalLower.includes('async')) {
      // Complex async analysis goal
      steps.push(
        {
          action: 'command',
          description: 'Find all JavaScript files in the project',
          command: "find . -name '*.js' -type f -not -path './node_modules/*'",
          expectedOutcome: 'List of JavaScript files to analyze',
          verificationMethod: 'Check for .js file paths in output',
        },
        {
          action: 'command',
          description: 'Search for async functions and await keywords',
          command:
            "grep -rn --include='*.js' -E '(async function|async \\(|async [a-zA-Z]|await )' . --exclude-dir=node_modules | head -20",
          expectedOutcome:
            'Lines containing async/await patterns with file locations',
          verificationMethod:
            'Check for async/await occurrences with line numbers',
        },
        {
          action: 'command',
          description: 'Count async operations per file',
          command:
            "for file in $(find . -name '*.js' -not -path './node_modules/*'); do echo \"$file: $(grep -c -E '(async function|async \\(|async [a-zA-Z]|await )' \"$file\" 2>/dev/null || echo 0)\"; done | sort -t: -k2 -nr | head -10",
          expectedOutcome: 'Files ranked by number of async operations',
          verificationMethod:
            'Check for file:count format with descending order',
        },
        {
          action: 'command',
          description: 'Create analysis report file',
          command:
            "echo '# Async/Await Analysis Report' > async_analysis_report.md && echo '## Files with Most Async Operations' >> async_analysis_report.md && for file in $(find . -name '*.js' -not -path './node_modules/*'); do count=$(grep -c -E '(async function|async \\(|async [a-zA-Z]|await )' \"$file\" 2>/dev/null || echo 0); if [ $count -gt 0 ]; then echo \"- $file: $count async operations\" >> async_analysis_report.md; fi; done",
          expectedOutcome:
            'Generated async_analysis_report.md file with analysis results',
          verificationMethod:
            'Check if async_analysis_report.md file exists and contains data',
        }
      );
    } else if (goalLower.includes('count') && goalLower.includes('files')) {
      if (goalLower.includes('javascript') || goalLower.includes('js')) {
        if (goalLower.includes('async')) {
          steps.push({
            action: 'command',
            description: 'Count JavaScript files containing async/await',
            command:
              "grep -l -r --include='*.js' -E '(async|await)' . --exclude-dir=node_modules | wc -l",
            expectedOutcome: 'Number of JavaScript files with async/await',
            verificationMethod: 'Check for numeric count output',
          });
        } else {
          steps.push({
            action: 'command',
            description: 'Count JavaScript files in project',
            command:
              "find . -name '*.js' -type f -not -path './node_modules/*' | wc -l",
            expectedOutcome: 'Total count of JavaScript files',
            verificationMethod: 'Check for numeric count output',
          });
        }
      } else {
        steps.push({
          action: 'command',
          description: 'Count all files in project',
          command:
            "find . -type f -not -path './node_modules/*' -not -path './.git/*' | wc -l",
          expectedOutcome: 'Total file count excluding node_modules and .git',
          verificationMethod: 'Check for numeric count output',
        });
      }
    } else if (goalLower.includes('find') || goalLower.includes('list')) {
      if (goalLower.includes('javascript') || goalLower.includes('js')) {
        steps.push({
          action: 'command',
          description: 'List JavaScript files with details',
          command:
            "find . -name '*.js' -type f -not -path './node_modules/*' -exec ls -la {} \\;",
          expectedOutcome: 'Detailed listing of JavaScript files',
          verificationMethod: 'Check for file paths with size and permissions',
        });
      } else if (goalLower.includes('package.json')) {
        steps.push({
          action: 'command',
          description: 'Find package.json files and show dependencies',
          command:
            "find . -name 'package.json' -not -path './node_modules/*' -exec echo 'File: {}' \\; -exec jq -r '.dependencies // {} | keys[]' {} \\; 2>/dev/null || find . -name 'package.json' -not -path './node_modules/*'",
          expectedOutcome: 'Package.json files with their dependencies',
          verificationMethod:
            'Check for package.json paths and dependency lists',
        });
      }
    } else if (
      goalLower.includes('dependencies') ||
      goalLower.includes('packages')
    ) {
      steps.push({
        action: 'command',
        description: 'Analyze project dependencies',
        command:
          "if [ -f package.json ]; then echo '=== Dependencies ===' && jq -r '.dependencies // {} | to_entries[] | \"\\(.key): \\(.value)\"' package.json && echo '=== Dev Dependencies ===' && jq -r '.devDependencies // {} | to_entries[] | \"\\(.key): \\(.value)\"' package.json; else echo 'No package.json found'; fi",
        expectedOutcome: 'List of project dependencies with versions',
        verificationMethod:
          'Check for dependency names and version information',
      });
    }

    // If no specific steps were generated, create a generic analysis step
    if (steps.length === 0) {
      steps.push({
        action: 'command',
        description: `Analyze project structure for: ${context.goal}`,
        command:
          "echo 'Project Analysis:' && ls -la && echo '\\nFile types:' && find . -type f -not -path './node_modules/*' -not -path './.git/*' | grep -E '\\.[a-zA-Z]+$' | sed 's/.*\\.//' | sort | uniq -c | sort -nr | head -10",
        expectedOutcome:
          'Project structure analysis and file type distribution',
        verificationMethod: 'Check for directory listing and file type counts',
      });
    }

    return {
      steps: steps,
      successCriteria: 'Goal achieved through intelligent command sequence',
      riskAssessment: 'Low risk - primarily read-only analysis operations',
      contextInsights:
        'Intelligent fallback plan generated based on goal analysis and context',
    };
  }

  async executePlan(plan, context) {
    const stepResults = [];

    for (let i = 0; i < plan.steps.length; i++) {
      const step = plan.steps[i];
      console.log(
        chalk.yellow(`\n⚡ Executing Step ${i + 1}: ${step.description}`)
      );

      let result;

      try {
        if (step.action === 'command' && step.command) {
          // Execute command - pass as complete string to handle pipes, redirects, etc.
          if (context.autoExecute) {
            console.log(chalk.cyan(`🚀 Auto-executing: ${step.command}`));
            result = await this.aia.executeCommand(step.command);
          } else {
            // Ask for confirmation
            const { shouldExecute } = await inquirer.prompt([
              {
                type: 'confirm',
                name: 'shouldExecute',
                message: `Execute command: ${step.command}?`,
                default: true,
              },
            ]);

            if (shouldExecute) {
              result = await this.aia.executeCommand(step.command);
            } else {
              result = { cancelled: true, reason: 'User cancelled execution' };
            }
          }
        } else if (step.action === 'query') {
          // AI query
          result = await this.aia.queryAI(step.description);
        } else if (step.action === 'verification') {
          // Verification step
          result = await this.verifyStep(step, stepResults);
        }

        // Verify the step succeeded
        const verification = await this.verifyStepSuccess(step, result);

        stepResults.push({
          step: step,
          result: result,
          verification: verification,
          success: verification.success, // Add explicit success flag for easier checking
          error: verification.success ? null : verification.reason,
          timestamp: new Date().toISOString(),
        });

        // Display result output if available
        if (result?.stdout && result.stdout.trim()) {
          console.log(chalk.gray('📋 Output:'));
          console.log(chalk.gray(result.stdout.trim()));
        }

        if (!verification.success) {
          console.log(chalk.red(`❌ Step failed: ${verification.reason}`));
          if (result?.stderr && result.stderr.trim()) {
            console.log(chalk.red('Error output:'), result.stderr.trim());
          }
          // Don't continue with remaining steps if this one failed critically
          if (verification.critical) {
            console.log(
              chalk.red('🛑 Critical failure detected. Stopping execution.')
            );
            break;
          }
        } else {
          console.log(chalk.green(`✅ Step completed successfully`));
        }
      } catch (error) {
        console.log(chalk.red(`❌ Step execution failed: ${error.message}`));
        stepResults.push({
          step: step,
          result: null,
          error: error.message,
          success: false, // Explicitly mark as failed
          verification: {
            success: false,
            confidence: 1.0,
            reason: `Step execution threw error: ${error.message}`,
            critical: true,
          },
          timestamp: new Date().toISOString(),
        });

        // Break on critical execution errors
        break;
      }
    }

    return {
      plan: plan,
      stepResults: stepResults || [],
      results: stepResults || [], // Add alias for compatibility
      timestamp: new Date().toISOString(),
    };
  }

  async verifyStepSuccess(step, result) {
    // First, do basic verification based on the result structure
    let basicSuccess = false;
    let basicReason = 'Unknown result format';

    console.log(chalk.gray(`🔍 Verifying step: ${step.description}`));
    console.log(
      chalk.gray(
        `Result type: ${typeof result}, has properties: ${
          result ? Object.keys(result).join(', ') : 'none'
        }`
      )
    );

    if (result?.cancelled) {
      return {
        success: false,
        confidence: 1.0,
        reason: 'Step was cancelled by user',
        critical: false,
      };
    }

    if (result?.error) {
      return {
        success: false,
        confidence: 1.0,
        reason: `Step failed with error: ${result.error}`,
        critical: true,
      };
    }

    // Check if it's a command execution result
    if (typeof result?.success === 'boolean') {
      basicSuccess = result.success;
      if (!basicSuccess) {
        return {
          success: false,
          confidence: 1.0,
          reason: `Command failed with exit code ${
            result.code || 'unknown'
          }. STDERR: ${result.stderr || 'none'}`,
          critical: true,
        };
      }

      // For successful commands, check if we actually got meaningful output
      if (
        step.expectedOutcome &&
        step.expectedOutcome !== 'Command executed successfully'
      ) {
        // Check if stdout is empty or minimal for commands that should produce output
        if (!result.stdout || result.stdout.trim().length === 0) {
          basicSuccess = false;
          basicReason =
            'Command succeeded but produced no output when output was expected';
        } else if (
          result.stdout.trim().length < 5 &&
          step.description.toLowerCase().includes('list')
        ) {
          // Commands that list things should produce substantial output
          basicSuccess = false;
          basicReason =
            'Command succeeded but produced minimal output for a listing operation';
        } else {
          basicReason = `Command executed successfully with output (${
            result.stdout.trim().length
          } chars)`;
        }
      } else {
        basicReason = `Command executed successfully (exit code ${
          result.code || 0
        })`;
      }
    } else if (typeof result === 'string' && result.length > 0) {
      // AI query result
      basicSuccess = true;
      basicReason = 'AI query returned response';
    } else if (result && typeof result === 'object') {
      // Other structured result - be more careful here
      if (result.stdout && result.stdout.trim().length > 0) {
        basicSuccess = true;
        basicReason = 'Step returned structured result with output';
      } else if (result.stderr && result.stderr.trim().length > 0) {
        basicSuccess = false;
        basicReason = 'Step returned structured result but only error output';
      } else {
        basicSuccess = false;
        basicReason =
          'Step returned structured result but no meaningful output';
      }
    }

    // If we have expected outcome defined and basic verification passed, use AI to verify the content
    if (
      basicSuccess &&
      step.expectedOutcome &&
      step.expectedOutcome !== 'Command executed successfully' &&
      (result?.stdout || (typeof result === 'string' && result.length > 0))
    ) {
      try {
        const actualOutput =
          result?.stdout ||
          (typeof result === 'string'
            ? result
            : JSON.stringify(result, null, 2));

        const verificationPrompt = `
You are evaluating if a step in an automated plan achieved its EXPECTED OUTCOME based on the actual command output.

STEP DETAILS:
Description: ${step.description}
Command: ${step.command || 'N/A'}
Expected Outcome: ${step.expectedOutcome}
Verification Method: ${
          step.verificationMethod || 'Check if outcome matches expectation'
        }

ACTUAL OUTPUT:
${actualOutput}

STRICT ANALYSIS REQUIRED:
1. Does the actual output contain the information described in "Expected Outcome"?
2. Is the output format and content what would be expected from the described step?
3. Is there sufficient detail in the output to fulfill the step's purpose?

IMPORTANT: Only mark as successful if the output clearly shows the expected outcome was achieved.
Empty output, error messages, or irrelevant content should be marked as failure.

You must respond with ONLY a valid JSON object in this exact format:
{
  "success": true,
  "confidence": 0.95,
  "reason": "The output shows exactly what was expected: a list of 3 JavaScript files with their paths",
  "critical": false
}

No additional text or explanations outside the JSON.`;

        const response = await this.aia.queryAI(verificationPrompt, 'gpt-4');

        // Use robust JSON parser for step verification
        const verification = parseStepVerification(response, true);

        if (verification) {
          console.log(
            chalk.blue(
              `🔍 AI Verification: ${verification.success ? '✅' : '❌'} ${
                verification.reason
              }`
            )
          );

          // If AI verification fails, override basic success
          if (!verification.success) {
            return {
              ...verification,
              critical: verification.critical !== false, // Default to critical if not specified
            };
          }

          return verification;
        }

        console.log(
          chalk.yellow(
            '⚠️  AI verification response could not be parsed, using basic verification'
          )
        );
      } catch (error) {
        console.log(
          chalk.yellow(`⚠️  AI verification failed: ${error.message}`)
        );
      }
    }

    // Return basic verification result
    const verification = {
      success: basicSuccess,
      confidence: basicSuccess ? 0.8 : 0.9,
      reason: basicReason,
      critical: !basicSuccess && step.action === 'command',
    };

    console.log(
      chalk.blue(
        `🔍 Basic Verification: ${verification.success ? '✅' : '❌'} ${
          verification.reason
        }`
      )
    );
    return verification;
  }

  async evaluateResult(executionResult, context) {
    // First, do basic evaluation based on step results
    const stepResults =
      executionResult.stepResults || executionResult.results || [];
    const totalSteps = stepResults.length;
    const successfulSteps = stepResults.filter(
      (s) => s.success === true
    ).length;
    const failedSteps = stepResults.filter((s) => s.success === false).length;
    const successRate = totalSteps > 0 ? successfulSteps / totalSteps : 0;

    console.log(chalk.blue(`\n📊 Basic Evaluation:`));
    console.log(
      chalk.gray(
        `Total steps: ${totalSteps}, Successful: ${successfulSteps}, Failed: ${failedSteps}`
      )
    );
    console.log(chalk.gray(`Success rate: ${Math.round(successRate * 100)}%`));

    // Basic heuristics for goal achievement
    let basicGoalAchieved = false;
    let basicProgressMade = successfulSteps > 0;
    let basicProgressScore = successRate;
    let basicShouldContinue =
      successRate < 0.8 && context.iterations < context.maxIterations;

    // If we have high success rate (80%+), likely achieved the goal
    if (successRate >= 0.8 && totalSteps >= 2) {
      basicGoalAchieved = true;
      basicShouldContinue = false;
    }

    // If most steps failed, we definitely haven't achieved the goal
    if (successRate < 0.3) {
      basicGoalAchieved = false;
      basicShouldContinue = true;
    }

    // Use AI evaluation for more nuanced analysis only if we have meaningful results
    if (totalSteps > 0 && successfulSteps > 0) {
      const evaluationPrompt = `
Evaluate progress toward this goal: "${context.goal}"

STEP-BY-STEP ANALYSIS:
Total steps executed: ${totalSteps}
Successful steps: ${successfulSteps}
Failed steps: ${failedSteps}
Success rate: ${Math.round(successRate * 100)}%

DETAILED STEP RESULTS:
${stepResults
  .map(
    (s, i) => `
Step ${i + 1}: ${s.step?.description || 'Unknown'}
Command: ${s.step?.command || 'N/A'}
Success: ${s.success ? '✅' : '❌'}
${
  s.success
    ? s.result?.stdout
      ? `Output: ${s.result.stdout.slice(0, 200)}...`
      : 'No output'
    : `Error: ${s.error || 'Unknown error'}`
}
`
  )
  .join('')}

GOAL ANALYSIS:
Original goal: "${context.goal}"
Current iteration: ${context.iterations}/${context.maxIterations}

IMPORTANT: Base your evaluation on whether the executed steps actually achieved meaningful progress toward the stated goal.
Look at the actual output and errors to determine if the goal is satisfied.

Respond with JSON:
{
  "goalAchieved": true/false,
  "progressMade": true/false,
  "progressScore": 0-1,
  "shouldContinue": true/false,
  "nextStepSuggestion": "what to try next if continuing",
  "reasoningExplanation": "detailed explanation based on actual step results"
}`;

      try {
        const response = await this.aia.queryAI(evaluationPrompt, 'gpt-4');

        // Check if response is valid with robust validation
        if (
          !response ||
          typeof response !== 'string' ||
          response.trim().length === 0
        ) {
          console.log(
            chalk.yellow(
              '⚠️ AI evaluation response is empty or invalid, using basic evaluation'
            )
          );
          console.log(
            chalk.gray(
              `Response type: ${typeof response}, length: ${
                response?.length || 0
              }`
            )
          );
          throw new Error('Empty or invalid AI response');
        }

        // Additional validation for response content
        const responseLower = response.trim().toLowerCase();
        if (
          responseLower === 'no response' ||
          responseLower === 'error' ||
          response.includes('I cannot') ||
          response.includes("I'm unable") ||
          response.includes('I apologize') ||
          response.includes('Sorry, I') ||
          responseLower.includes('unable to') ||
          responseLower.includes('cannot provide')
        ) {
          console.log(
            chalk.yellow(
              '⚠️ AI declined to provide evaluation, using basic evaluation'
            )
          );
          console.log(
            chalk.gray(`AI response: ${response.substring(0, 100)}...`)
          );
          throw new Error('AI declined to provide valid evaluation');
        }

        // Ensure response is a string before processing
        const responseStr = String(response).trim();
        if (responseStr.length === 0) {
          console.log(
            chalk.yellow(
              '⚠️ AI evaluation response is empty after conversion, using basic evaluation'
            )
          );
          throw new Error('Empty response after string conversion');
        }

        // Use robust JSON parser for evaluation response
        console.log(chalk.blue('🔍 Parsing AI evaluation response...'));
        const evaluation = parseEvaluationResult(responseStr, true);

        if (evaluation) {
          console.log(chalk.blue('\n📊 AI Evaluation Results:'));
          console.log(
            chalk.gray(
              `Goal Achieved: ${evaluation.goalAchieved ? '✅' : '❌'}`
            )
          );
          console.log(
            chalk.gray(
              `Progress Score: ${Math.round(
                (evaluation.progressScore || 0) * 100
              )}%`
            )
          );
          console.log(
            chalk.gray(
              `Should Continue: ${evaluation.shouldContinue ? '✅' : '❌'}`
            )
          );
          console.log(
            chalk.gray(
              `Reasoning: ${
                evaluation.reasoningExplanation || 'No explanation provided'
              }`
            )
          );

          return evaluation;
        } else {
          console.log(
            chalk.yellow(
              '⚠️ Failed to parse AI evaluation response, using basic evaluation'
            )
          );
          throw new Error(
            'Failed to parse evaluation response with robust parser'
          );
        }
      } catch (error) {
        console.log(chalk.yellow(`⚠️ AI evaluation failed: ${error.message}`));
        console.log(
          chalk.gray(`AI response: ${response?.substring(0, 100) || 'N/A'}...`)
        );
        // Fall through to basic evaluation
      }
    }

    // Return basic evaluation result
    const evaluation = {
      goalAchieved: basicGoalAchieved,
      progressMade: basicProgressMade,
      progressScore: basicProgressScore,
      shouldContinue: basicShouldContinue,
      reasoningExplanation: `Basic evaluation: ${successfulSteps}/${totalSteps} steps successful (${Math.round(
        successRate * 100
      )}% success rate)`,
    };

    console.log(chalk.blue('\n📊 Basic Evaluation Results:'));
    console.log(
      chalk.gray(`Goal Achieved: ${evaluation.goalAchieved ? '✅' : '❌'}`)
    );
    console.log(
      chalk.gray(
        `Progress Score: ${Math.round((evaluation.progressScore || 0) * 100)}%`
      )
    );
    console.log(
      chalk.gray(`Should Continue: ${evaluation.shouldContinue ? '✅' : '❌'}`)
    );
    console.log(
      chalk.gray(
        `Reasoning: ${
          evaluation.reasoningExplanation || 'No explanation provided'
        }`
      )
    );

    return evaluation;
  }

  async learnFromExecution(executionResult, evaluation, context) {
    // Store execution history for learning
    this.executionHistory.push({
      iteration: context.iterations,
      executionResult: executionResult,
      evaluation: evaluation,
      timestamp: new Date().toISOString(),
      nlpAnalysis: context.nlpAnalysis, // Include NLP insights
    });

    // Update conversation context with execution results
    if (context.nlpAnalysis) {
      this.conversationManager.addExecutionResult(
        context.goal,
        executionResult,
        evaluation,
        context.nlpAnalysis
      );
    }

    // Generate learning insights with NLP context
    const learningPrompt = `
Analyze the execution history and identify patterns, what worked, what didn't:

Goal: "${context.goal}"
Enhanced Goal: "${context.enhancedGoal || context.goal}"
NLP Analysis: ${
      context.nlpAnalysis
        ? JSON.stringify(
            {
              intent: context.nlpAnalysis.intent,
              entities: context.nlpAnalysis.entities,
              goalType: context.nlpAnalysis.goalType,
              confidence: context.nlpAnalysis.confidence,
            },
            null,
            2
          )
        : 'No NLP analysis available'
    }

Current iteration: ${context.iterations}
Latest execution: ${JSON.stringify(executionResult, null, 2)}
Latest evaluation: ${JSON.stringify(evaluation, null, 2)}

Consider the NLP analysis when generating insights:
- Did the execution align with the detected intent?
- Were the identified entities relevant to the execution?
- Did the goal type classification influence success/failure?
- Should the goal be refined based on execution results?

Generate insights for the next iteration:
1. What approach should be changed?
2. What commands or steps should be avoided?
3. What new approach should be tried?
4. Any patterns in failures or successes?
5. How can NLP understanding be improved for similar goals?

Provide practical recommendations for iteration ${context.iterations + 1}.
`;

    const insights = await this.aia.queryAI(learningPrompt);

    console.log(chalk.magenta('\n🧠 Learning Insights:'));
    console.log(chalk.gray(insights.substring(0, 200) + '...'));

    // Store insights for next iteration
    context.learningInsights = insights;

    // Learn from this execution for future NLP improvements
    if (context.nlpAnalysis) {
      // Normalize the executionResult structure for NLP analysis
      const normalizedExecutionResult = {
        ...executionResult,
        results: executionResult.stepResults || executionResult.results || [],
      };

      await this.nlpEngine.learnFromExecution(
        context.nlpAnalysis,
        normalizedExecutionResult,
        evaluation
      );
    }
  }

  async attemptRecovery(error, context) {
    const recoveryPrompt = `
An error occurred during agentic execution:
Error: ${error.message}
Goal: "${context.goal}"
Iteration: ${context.iterations}

Can this error be recovered from? Suggest a recovery strategy:
{
  "canRecover": true/false,
  "recoveryStrategy": "what to do next",
  "modifiedApproach": "how to adjust the approach"
}
`;

    try {
      const response = await this.aia.queryAI(recoveryPrompt);

      // Use robust JSON parser for recovery analysis
      const recovery = parseRecoveryAnalysis(response, true);

      if (recovery && recovery.canRecover) {
        console.log(
          chalk.yellow(`🔧 Recovery strategy: ${recovery.recoveryStrategy}`)
        );
        return recovery;
      }

      if (recovery) {
        return recovery;
      }
    } catch (recoveryError) {
      console.log(chalk.red('Recovery analysis failed'));
    }

    return { canRecover: false };
  }

  // Enhanced error recovery system
  async attemptErrorRecovery(step, errorResult, context) {
    console.log(chalk.yellow('\n🔧 Attempting error recovery...'));

    // Analyze the error type and context
    const recoveryPrompt = `
Analyze this execution error and suggest recovery actions:

Failed Step: ${step.description}
Command: ${step.command || 'N/A'}
Error: ${errorResult.error}
Expected Outcome: ${step.expectedOutcome}

Context:
- Goal: ${context.goal}
- Iteration: ${context.iterations}
- Previous steps in this plan: ${JSON.stringify(
      this.executionHistory
        .slice(-1)[0]
        ?.plan?.steps?.slice(
          0,
          this.executionHistory.slice(-1)[0]?.plan?.steps?.indexOf(step)
        ) || []
    )}

Historical patterns from memory:
${JSON.stringify(this.extractErrorPatterns(), null, 2)}

Provide recovery suggestions in JSON format:
{
  "canRecover": true/false,
  "critical": true/false,
  "recoveryActions": [
    {
      "type": "command|modification|alternative",
      "description": "What to do",
      "command": "alternative command if applicable",
      "reasoning": "Why this should work"
    }
  ],
  "learnings": "What we learned from this failure"
}
`;

    try {
      const response = await this.aia.queryAI(recoveryPrompt);

      // Use robust JSON parser for recovery plan
      const recoveryPlan = parseRecoveryPlan(response, true);

      if (
        recoveryPlan &&
        recoveryPlan.canRecover &&
        recoveryPlan.recoveryActions?.length > 0
      ) {
        console.log(
          chalk.blue(
            `💡 Recovery suggestions found: ${recoveryPlan.recoveryActions.length} options`
          )
        );

        // Try the first recovery action
        const primaryRecovery = recoveryPlan.recoveryActions[0];

        if (primaryRecovery.type === 'command' && primaryRecovery.command) {
          try {
            console.log(
              chalk.cyan(`🔄 Trying recovery: ${primaryRecovery.command}`)
            );

            const recoveryResult = await this.aia.executeCommand(
              primaryRecovery.command
            );

            // Validate recovery success
            const validationResult = await this.validateStepOutput(
              step,
              recoveryResult
            );

            if (validationResult.valid) {
              return {
                recovered: true,
                critical: false,
                message: primaryRecovery.description,
                method: primaryRecovery.command,
                learnings: recoveryPlan.learnings,
              };
            }
          } catch (recoveryError) {
            console.log(
              chalk.red(`🚫 Recovery attempt failed: ${recoveryError.message}`)
            );
          }
        }

        return {
          recovered: false,
          critical: recoveryPlan.critical || false,
          message: `No viable recovery found: ${recoveryPlan.learnings}`,
          learnings: recoveryPlan.learnings,
        };
      }
    } catch (error) {
      console.log(
        chalk.red(`❌ Error during recovery analysis: ${error.message}`)
      );
    }

    // Default fallback
    return {
      recovered: false,
      critical: false,
      message: 'No recovery options available',
      learnings: 'Need better error handling for this scenario',
    };
  }

  // Validate step output against expected outcomes
  async validateStepOutput(step, result) {
    if (!step.verificationMethod || !result) {
      return { valid: true, message: 'No verification method specified' };
    }

    const validationPrompt = `
Validate if this command output meets the expected outcome:

Step: ${step.description}
Expected Outcome: ${step.expectedOutcome}
Verification Method: ${step.verificationMethod}

Actual Output:
${typeof result === 'string' ? result : JSON.stringify(result, null, 2)}

Respond with JSON:
{
  "valid": true/false,
  "confidence": 0-1,
  "message": "explanation of validation result",
  "suggestions": "suggestions if validation failed"
}
`;

    try {
      const response = await this.aia.queryAI(validationPrompt);

      // Use robust JSON parser for step validation
      const validation = parseStepValidation(response, true);

      if (validation) {
        return validation;
      }
    } catch (error) {
      console.log(chalk.yellow(`⚠️  Validation error: ${error.message}`));
    }

    return { valid: true, message: 'Validation unavailable' };
  }

  // Extract learnings from execution results
  extractLearnings(executionResults) {
    const learnings = {
      successPatterns: [],
      failurePatterns: [],
      commands: [],
      insights: [],
    };

    // Ensure executionResults is an array
    if (!Array.isArray(executionResults)) {
      console.warn(
        chalk.yellow(
          '⚠️ Expected array for executionResults, got:',
          typeof executionResults
        )
      );
      return learnings;
    }

    executionResults.forEach((result) => {
      if (result.success) {
        learnings.successPatterns.push({
          step: result.step?.description,
          command: result.step?.command,
          context: 'successful execution',
        });

        if (result.step?.command) {
          learnings.commands.push({
            command: result.step.command,
            outcome: 'success',
            context: result.step.description,
          });
        }
      } else {
        learnings.failurePatterns.push({
          step: result.step?.description,
          command: result.step?.command,
          error: result.error,
          recovery: result.recovery,
        });
      }

      if (result.validationWarning) {
        learnings.insights.push({
          type: 'validation_warning',
          message: result.validationWarning,
          step: result.step?.description,
        });
      }
    });

    return learnings;
  }

  // Extract error patterns from execution history
  extractErrorPatterns() {
    const patterns = {
      commonErrors: {},
      successfulRecoveries: [],
      criticalFailures: [],
    };

    this.executionHistory.forEach((record) => {
      record.results?.forEach((result) => {
        if (!result.success && result.error) {
          // Count common error types
          const errorType = this.categorizeError(result.error);
          patterns.commonErrors[errorType] =
            (patterns.commonErrors[errorType] || 0) + 1;

          // Track successful recoveries
          if (result.recovery?.recovered) {
            patterns.successfulRecoveries.push({
              error: result.error,
              recovery: result.recovery.method,
              context: result.step?.description,
            });
          }

          // Track critical failures
          if (result.recovery?.critical) {
            patterns.criticalFailures.push({
              error: result.error,
              step: result.step?.description,
              goal: record.goal,
            });
          }
        }
      });
    });

    return patterns;
  }

  // Categorize errors for pattern recognition
  categorizeError(errorMessage) {
    const message = errorMessage.toLowerCase();

    if (
      message.includes('command not found') ||
      message.includes('not found')
    ) {
      return 'command_not_found';
    } else if (
      message.includes('permission denied') ||
      message.includes('access denied')
    ) {
      return 'permission_error';
    } else if (
      message.includes('no such file') ||
      message.includes('file not found')
    ) {
      return 'file_not_found';
    } else if (message.includes('network') || message.includes('connection')) {
      return 'network_error';
    } else if (
      message.includes('syntax error') ||
      message.includes('invalid syntax')
    ) {
      return 'syntax_error';
    } else {
      return 'unknown_error';
    }
  }

  // Analyze historical patterns for better learning and plan generation
  analyzeHistoricalPatterns(currentGoal) {
    const insights = {
      similarGoals: [],
      successfulStrategies: [],
      commonPitfalls: [],
      recommendedCommands: [],
      environmentalFactors: [],
    };

    // Look for similar goals in execution history
    this.executionHistory.forEach((record) => {
      const similarity = this.calculateGoalSimilarity(currentGoal, record.goal);

      if (similarity > 0.3) {
        // 30% similarity threshold
        insights.similarGoals.push({
          goal: record.goal,
          similarity: similarity,
          success: record.overallSuccess,
          timestamp: record.timestamp,
        });

        // Extract successful strategies
        if (record.overallSuccess && record.learnings?.successPatterns) {
          record.learnings.successPatterns.forEach((pattern) => {
            insights.successfulStrategies.push({
              strategy: pattern.step,
              command: pattern.command,
              fromGoal: record.goal,
              similarity: similarity,
            });
          });
        }

        // Extract pitfalls
        if (record.learnings?.failurePatterns) {
          record.learnings.failurePatterns.forEach((pattern) => {
            insights.commonPitfalls.push({
              pitfall: pattern.error,
              step: pattern.step,
              recovery: pattern.recovery,
              fromGoal: record.goal,
              similarity: similarity,
            });
          });
        }

        // Extract recommended commands
        if (record.learnings?.commands) {
          record.learnings.commands.forEach((cmdInfo) => {
            if (cmdInfo.outcome === 'success') {
              insights.recommendedCommands.push({
                command: cmdInfo.command,
                context: cmdInfo.context,
                fromGoal: record.goal,
                similarity: similarity,
              });
            }
          });
        }
      }
    });

    // Sort by similarity/relevance
    insights.similarGoals.sort((a, b) => b.similarity - a.similarity);
    insights.successfulStrategies.sort((a, b) => b.similarity - a.similarity);
    insights.commonPitfalls.sort((a, b) => b.similarity - a.similarity);
    insights.recommendedCommands.sort((a, b) => b.similarity - a.similarity);

    // Environmental factors from current context
    insights.environmentalFactors = this.getEnvironmentalFactors();

    return insights;
  }

  // Calculate similarity between two goals using simple keyword matching
  calculateGoalSimilarity(goal1, goal2) {
    if (!goal1 || !goal2) return 0;

    const words1 = goal1.toLowerCase().split(/\s+/);
    const words2 = goal2.toLowerCase().split(/\s+/);

    const commonWords = words1.filter(
      (word) => words2.includes(word) && word.length > 2 // Ignore small words
    );

    const totalWords = new Set([...words1, ...words2]).size;
    return commonWords.length / totalWords;
  }

  // Get environmental factors that might affect execution
  getEnvironmentalFactors() {
    const factors = [];

    // Check if we're in a Node.js project
    if (this.aia.context?.projectType === 'node') {
      factors.push('node_project');
    }

    // Check if we're in a Git repository
    if (
      this.aia.context?.gitStatus &&
      this.aia.context.gitStatus !== 'Not a git repository'
    ) {
      factors.push('git_repository');
    }

    // Platform-specific factors
    if (this.aia.context?.platform) {
      factors.push(`platform_${this.aia.context.platform}`);
    }

    return factors;
  }

  /**
   * Dynamically gather context by executing CLI commands based on the goal
   * This leverages the CLI's own capabilities to discover information
   */
  async gatherDynamicContext(goal) {
    console.log(chalk.gray('🔧 Executing discovery commands...'));

    const dynamicContext = {
      fileSystem: {},
      projectStructure: {},
      systemInfo: {},
      gitInfo: {},
      dependencies: {},
      processes: {},
      diskUsage: {},
      networkInfo: {},
      errorLogs: {},
    };

    try {
      // Determine what information to gather based on the goal
      const discoveryCommands = this.generateDiscoveryCommands(goal);

      // Execute discovery commands with timeouts and error handling
      for (const cmd of discoveryCommands) {
        try {
          console.log(chalk.gray(`  → ${cmd.description}`));

          const result = await this.executeSafeCommand(cmd.command, {
            timeout: cmd.timeout || 5000,
            maxOutputSize: cmd.maxOutputSize || 10000,
          });

          if (result.success) {
            dynamicContext[cmd.category][cmd.key] = {
              command: cmd.command,
              output: result.output,
              timestamp: new Date().toISOString(),
              description: cmd.description,
            };
          } else {
            dynamicContext[cmd.category][cmd.key] = {
              command: cmd.command,
              error: result.error,
              timestamp: new Date().toISOString(),
              description: cmd.description,
            };
          }
        } catch (error) {
          console.log(chalk.gray(`    ⚠️ Failed: ${error.message}`));
          dynamicContext[cmd.category][cmd.key] = {
            command: cmd.command,
            error: error.message,
            timestamp: new Date().toISOString(),
            description: cmd.description,
          };
        }
      }
    } catch (error) {
      console.log(
        chalk.yellow(`⚠️ Dynamic context gathering error: ${error.message}`)
      );
    }

    return dynamicContext;
  }

  /**
   * Generate discovery commands based on the goal type
   */
  generateDiscoveryCommands(goal) {
    const goalLower = goal.toLowerCase();
    const commands = [];

    // Always gather basic project structure
    commands.push(
      {
        category: 'fileSystem',
        key: 'projectFiles',
        command:
          'find . -maxdepth 2 -type f -name "*.json" -o -name "*.md" -o -name "*.js" -o -name "*.py" -o -name "*.yaml" -o -name "*.yml" | head -20',
        description: 'Project structure overview',
        timeout: 3000,
      },
      {
        category: 'fileSystem',
        key: 'workingDirectory',
        command: 'pwd && ls -la',
        description: 'Current working directory',
        timeout: 2000,
      }
    );

    // Git-related discoveries
    if (
      goalLower.includes('git') ||
      goalLower.includes('commit') ||
      goalLower.includes('branch') ||
      goalLower.includes('repository')
    ) {
      commands.push(
        {
          category: 'gitInfo',
          key: 'status',
          command:
            'git status --porcelain 2>/dev/null || echo "Not a git repository"',
          description: 'Git repository status',
          timeout: 3000,
        },
        {
          category: 'gitInfo',
          key: 'branches',
          command:
            'git branch -a 2>/dev/null | head -10 || echo "No git branches"',
          description: 'Git branches',
          timeout: 3000,
        },
        {
          category: 'gitInfo',
          key: 'recentCommits',
          command: 'git log --oneline -5 2>/dev/null || echo "No git history"',
          description: 'Recent commits',
          timeout: 3000,
        }
      );
    }

    // Node.js/JavaScript project discoveries
    if (
      goalLower.includes('node') ||
      goalLower.includes('npm') ||
      goalLower.includes('javascript') ||
      goalLower.includes('js')
    ) {
      commands.push(
        {
          category: 'dependencies',
          key: 'packageJson',
          command:
            'cat package.json 2>/dev/null | jq -r ".dependencies, .devDependencies" 2>/dev/null || cat package.json 2>/dev/null || echo "No package.json"',
          description: 'Node.js dependencies',
          timeout: 2000,
          maxOutputSize: 5000,
        },
        {
          category: 'dependencies',
          key: 'nodeModules',
          command: 'ls node_modules 2>/dev/null | wc -l || echo "0"',
          description: 'Node modules count',
          timeout: 2000,
        }
      );
    }

    // Python project discoveries
    if (
      goalLower.includes('python') ||
      goalLower.includes('pip') ||
      goalLower.includes('requirements')
    ) {
      commands.push(
        {
          category: 'dependencies',
          key: 'requirements',
          command:
            'cat requirements.txt 2>/dev/null || echo "No requirements.txt"',
          description: 'Python requirements',
          timeout: 2000,
        },
        {
          category: 'dependencies',
          key: 'pipList',
          command:
            'pip list 2>/dev/null | head -10 || echo "Pip not available"',
          description: 'Installed Python packages',
          timeout: 3000,
        }
      );
    }

    // Docker-related discoveries
    if (goalLower.includes('docker') || goalLower.includes('container')) {
      commands.push(
        {
          category: 'systemInfo',
          key: 'dockerContainers',
          command: 'docker ps -a 2>/dev/null || echo "Docker not available"',
          description: 'Docker containers',
          timeout: 3000,
        },
        {
          category: 'fileSystem',
          key: 'dockerfile',
          command:
            'find . -name "Dockerfile" -o -name "docker-compose.yml" -o -name "docker-compose.yaml" 2>/dev/null || echo "No Docker files"',
          description: 'Docker configuration files',
          timeout: 2000,
        }
      );
    }

    // Database-related discoveries
    if (
      goalLower.includes('database') ||
      goalLower.includes('db') ||
      goalLower.includes('sql')
    ) {
      commands.push({
        category: 'processes',
        key: 'databases',
        command:
          'ps aux | grep -E "(postgres|mysql|mongodb|redis)" | grep -v grep || echo "No database processes found"',
        description: 'Running database processes',
        timeout: 2000,
      });
    }

    // Performance/optimization discoveries
    if (
      goalLower.includes('performance') ||
      goalLower.includes('optimize') ||
      goalLower.includes('speed') ||
      goalLower.includes('memory')
    ) {
      commands.push(
        {
          category: 'systemInfo',
          key: 'memoryUsage',
          command: 'free -h 2>/dev/null || vm_stat | head -5',
          description: 'System memory usage',
          timeout: 2000,
        },
        {
          category: 'diskUsage',
          key: 'diskSpace',
          command: 'df -h . 2>/dev/null | tail -1',
          description: 'Disk space usage',
          timeout: 2000,
        }
      );
    }

    // Security/analysis discoveries
    if (
      goalLower.includes('security') ||
      goalLower.includes('vulnerability') ||
      goalLower.includes('audit')
    ) {
      commands.push({
        category: 'dependencies',
        key: 'auditCheck',
        command:
          'npm audit --audit-level moderate 2>/dev/null | head -20 || echo "No npm audit available"',
        description: 'Security audit',
        timeout: 5000,
      });
    }

    // Testing discoveries
    if (
      goalLower.includes('test') ||
      goalLower.includes('spec') ||
      goalLower.includes('junit')
    ) {
      commands.push({
        category: 'fileSystem',
        key: 'testFiles',
        command: 'find . -name "*test*" -o -name "*spec*" -type f | head -10',
        description: 'Test files',
        timeout: 2000,
      });
    }

    // Log file discoveries
    if (
      goalLower.includes('log') ||
      goalLower.includes('error') ||
      goalLower.includes('debug')
    ) {
      commands.push({
        category: 'errorLogs',
        key: 'recentErrors',
        command:
          'find . -name "*.log" -type f -exec tail -5 {} \\; 2>/dev/null | head -20 || echo "No log files found"',
        description: 'Recent log entries',
        timeout: 3000,
      });
    }

    return commands;
  }

  /**
   * Execute a command safely with timeout and output limits
   */
  async executeSafeCommand(command, options = {}) {
    const { timeout = 5000, maxOutputSize = 10000 } = options;

    try {
      const result = await Promise.race([
        this.aia.executeCommand(command),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Command timeout')), timeout)
        ),
      ]);

      let output = result.stdout || '';
      if (output.length > maxOutputSize) {
        output = output.substring(0, maxOutputSize) + '... (truncated)';
      }

      return {
        success: result.code === 0,
        output: output,
        error: result.stderr || null,
      };
    } catch (error) {
      return {
        success: false,
        output: null,
        error: error.message,
      };
    }
  }

  displayExecutionSummary(nlpAnalysis = null) {
    console.log(chalk.blue('\n📋 Execution Summary:'));
    console.log(chalk.gray('─'.repeat(60)));
    console.log(chalk.gray(`🎯 Goal: ${this.currentGoal}`));

    // Display NLP insights if available
    if (nlpAnalysis) {
      console.log(chalk.blue('\n🧠 NLP Analysis Summary:'));
      console.log(
        chalk.gray(
          `  Intent: ${nlpAnalysis.intent.intent} (${Math.round(
            nlpAnalysis.intent.confidence * 100
          )}% confidence)`
        )
      );
      if (nlpAnalysis.intent.subType) {
        console.log(chalk.gray(`  Sub-intent: ${nlpAnalysis.intent.subType}`));
      }
      console.log(chalk.gray(`  Goal type: ${nlpAnalysis.goalType}`));
      console.log(
        chalk.gray(
          `  Final confidence: ${Math.round(nlpAnalysis.confidence * 100)}%`
        )
      );

      // Show detected entities
      const detectedEntities = Object.keys(nlpAnalysis.entities).filter(
        (k) => nlpAnalysis.entities[k].length > 0
      );
      if (detectedEntities.length > 0) {
        console.log(
          chalk.gray(`  Detected entities: ${detectedEntities.join(', ')}`)
        );
        detectedEntities.forEach((entityType) => {
          if (nlpAnalysis.entities[entityType].length > 0) {
            console.log(
              chalk.gray(
                `    ${entityType}: ${nlpAnalysis.entities[entityType].join(
                  ', '
                )}`
              )
            );
          }
        });
      }

      // Show contextual insights
      if (
        nlpAnalysis.contextualInsights &&
        nlpAnalysis.contextualInsights.length > 0
      ) {
        console.log(chalk.gray('  Contextual insights:'));
        nlpAnalysis.contextualInsights.forEach((insight) => {
          console.log(chalk.gray(`    • ${insight}`));
        });
      }
    }

    console.log(
      chalk.gray(`🔄 Total iterations: ${this.executionHistory.length}`)
    );

    let totalSteps = 0;
    let successfulSteps = 0;
    let totalRecoveries = 0;
    const commandsUsed = new Set();
    const learnings = [];

    this.executionHistory.forEach((record, i) => {
      const success = record.overallSuccess;
      const status = success ? '✅' : record.criticalFailure ? '🚫' : '⚠️';

      console.log(
        chalk.gray(
          `  Iteration ${i + 1}: ${status} ${
            success
              ? 'Success'
              : record.criticalFailure
              ? 'Critical Failure'
              : 'Partial Success'
          }`
        )
      );

      if (record.results) {
        record.results.forEach((result) => {
          totalSteps++;
          if (result.success) successfulSteps++;
          if (result.recovery?.recovered) totalRecoveries++;
          if (result.step?.command) commandsUsed.add(result.step.command);
        });
      }

      if (record.learnings) {
        learnings.push(record.learnings);
      }
    });

    // Display statistics
    console.log(chalk.blue('\n� Statistics:'));
    console.log(chalk.gray(`  Steps executed: ${totalSteps}`));
    console.log(
      chalk.gray(
        `  Success rate: ${
          totalSteps > 0 ? Math.round((successfulSteps / totalSteps) * 100) : 0
        }%`
      )
    );
    console.log(chalk.gray(`  Recoveries performed: ${totalRecoveries}`));
    console.log(chalk.gray(`  Unique commands used: ${commandsUsed.size}`));

    // Display key learnings
    if (learnings.length > 0) {
      console.log(chalk.blue('\n🧠 Key Learnings:'));

      const allSuccessPatterns = learnings.flatMap(
        (l) => l.successPatterns || []
      );
      const allFailurePatterns = learnings.flatMap(
        (l) => l.failurePatterns || []
      );
      const allInsights = learnings.flatMap((l) => l.insights || []);

      if (allSuccessPatterns.length > 0) {
        console.log(
          chalk.green(`  ✅ Successful patterns: ${allSuccessPatterns.length}`)
        );
        allSuccessPatterns.slice(0, 3).forEach((pattern) => {
          console.log(chalk.gray(`    - ${pattern.step}: ${pattern.command}`));
        });
      }

      if (allFailurePatterns.length > 0) {
        console.log(
          chalk.red(`  ❌ Common failures: ${allFailurePatterns.length}`)
        );
        allFailurePatterns.slice(0, 3).forEach((pattern) => {
          console.log(chalk.gray(`    - ${pattern.step}: ${pattern.error}`));
          if (pattern.recovery?.recovered) {
            console.log(
              chalk.yellow(
                `      🔄 Recovered with: ${pattern.recovery.method}`
              )
            );
          }
        });
      }

      if (allInsights.length > 0) {
        console.log(chalk.cyan(`  💡 Insights: ${allInsights.length}`));
        allInsights.slice(0, 3).forEach((insight) => {
          console.log(chalk.gray(`    - ${insight.type}: ${insight.message}`));
        });
      }
    }

    // Display recommendations for future
    console.log(chalk.blue('\n🔮 Recommendations:'));
    const errorPatterns = this.extractErrorPatterns();
    if (Object.keys(errorPatterns.commonErrors).length > 0) {
      const mostCommonError = Object.entries(errorPatterns.commonErrors).sort(
        (a, b) => b[1] - a[1]
      )[0];
      console.log(
        chalk.yellow(
          `  ⚠️  Watch out for: ${mostCommonError[0]} (occurred ${mostCommonError[1]} times)`
        )
      );
    }

    if (errorPatterns.successfulRecoveries.length > 0) {
      console.log(
        chalk.green(
          `  🔧 Recovery strategies available: ${errorPatterns.successfulRecoveries.length}`
        )
      );
    }

    if (commandsUsed.size > 0) {
      console.log(
        chalk.cyan(
          `  🛠️  Most used commands: ${Array.from(commandsUsed)
            .slice(0, 3)
            .join(', ')}`
        )
      );
    }

    console.log(chalk.gray('─'.repeat(60)));
  }

  // Simple fallback for common goals when AI is not available
  async executeSimpleFallback(userGoal, options = {}) {
    console.log(chalk.yellow('🔄 Using simple command fallback...'));

    const goalLower = userGoal.toLowerCase();
    let command = null;
    let description = null;

    // Simple pattern matching for common goals
    if (goalLower.includes('list') && goalLower.includes('javascript')) {
      command =
        "find . -name '*.js' -type f -not -path './node_modules/*' | head -20";
      description = 'List JavaScript files in project';
    } else if (goalLower.includes('list') && goalLower.includes('files')) {
      command =
        "find . -type f -not -path './node_modules/*' -not -path './.git/*' | head -20";
      description = 'List project files';
    } else if (goalLower.includes('package.json')) {
      command = "cat package.json 2>/dev/null || echo 'No package.json found'";
      description = 'Show package.json contents';
    } else if (goalLower.includes('analyze') && goalLower.includes('project')) {
      command =
        "echo 'Project Structure:' && ls -la && echo '\nFile types:' && find . -type f | grep -E '\\.[a-zA-Z]+$' | sed 's/.*\\.//' | sort | uniq -c | sort -nr | head -10";
      description = 'Analyze project structure';
    } else if (goalLower.includes('git') && goalLower.includes('status')) {
      command = "git status 2>/dev/null || echo 'Not a git repository'";
      description = 'Show git status';
    } else {
      // Generic fallback
      command = 'ls -la';
      description = 'List current directory contents';
    }

    if (command) {
      console.log(chalk.cyan(`🚀 Executing: ${description}`));
      console.log(chalk.gray(`Command: ${command}`));

      if (!options.autoExecute) {
        const { shouldExecute } = await inquirer.prompt([
          {
            type: 'confirm',
            name: 'shouldExecute',
            message: `Execute command: ${command}?`,
            default: true,
          },
        ]);

        if (!shouldExecute) {
          console.log(chalk.yellow('Execution cancelled by user'));
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
      } catch (error) {
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

  /**
   * Execute a command safely with timeout and output limits
   */
  async executeSafeCommand(command, options = {}) {
    try {
      return await this.aia.executeCommand(command, [], {
        timeout: options.timeout || 5000,
        maxOutputSize: options.maxOutputSize || 10000,
      });
    } catch (error) {
      return {
        success: false,
        error: error.message,
        output: '',
      };
    }
  }
}

module.exports = AgenticReasoningEngine;
