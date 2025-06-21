/**
 * Enhanced Agent Presenter Implementation
 * Provides rich, transparent user experience for agent operations
 */
import {
  IAgentPresenter,
  RetryAttemptInfo,
  PerformanceComparison,
} from '../interfaces/IAgentPresenter';
import {
  ExecutionStep,
  AgenticExecution,
  CommandResult,
  ContextInfo,
} from '../types/index';
import {
  CircuitBreakerState,
  IResilienceService,
} from '../interfaces/IResilienceService';
import {
  IPerformanceMonitor,
  MethodMetrics,
  PerformanceAlert,
} from '../interfaces/IPerformanceMonitor';
import { IAIService } from '../interfaces/IAIService';
import chalk from 'chalk';
import ora, { Ora } from 'ora';
import inquirer from 'inquirer';
import os from 'os';

export class AgentPresenter implements IAgentPresenter {
  private activeSpinner: Ora | null = null;
  private startTime: number = Date.now();
  private stepStartTime: number = Date.now();
  private resourceMonitor: NodeJS.Timeout | null = null;
  private initialMemory: number = 0;

  // Service dependencies for Phase 1 enhancements
  private resilienceService?: IResilienceService;
  private performanceMonitor?: IPerformanceMonitor;
  private aiService?: IAIService;
  private executionHistory: AgenticExecution[] = [];

  // Enhanced performance tracking
  private performance = {
    peakMemoryMB: 0,
    avgCpuPercent: 0,
    cpuSamples: [] as number[],
    networkRequests: 0,
    filesProcessed: 0,
  };

  constructor(
    resilienceService?: IResilienceService,
    performanceMonitor?: IPerformanceMonitor,
    aiService?: IAIService
  ) {
    this.resilienceService = resilienceService;
    this.performanceMonitor = performanceMonitor;
    this.aiService = aiService;
  }

  showPlanningPhase(goal: string): void {
    console.log(chalk.blue('🤖 AIA Agent - Intelligent Task Execution'));
    console.log(chalk.gray('━'.repeat(60)));
    console.log(chalk.cyan(`🎯 Goal: ${goal}`));

    // ========== Phase Separation Enhancement ==========
    console.log(
      chalk.magenta(
        '\n📋 Planning Phase - Analyzing goal and creating execution plan...'
      )
    );
    console.log(chalk.gray('━'.repeat(60)));

    // ========== Real-time Progress Indicators ==========
    this.startResourceMonitoring();
    this.startTime = Date.now();
    this.initialMemory = process.memoryUsage().heapUsed / 1024 / 1024;

    // Show initial system state
    console.log(
      chalk.dim(
        `🔧 System: Node.js ${
          process.version
        } | Memory: ${this.initialMemory.toFixed(1)}MB`
      )
    );
    console.log(
      chalk.dim(`📂 Working Directory: ${process.cwd().split('/').pop()}`)
    );
  }

  displayExecutionPlan(plan: ExecutionStep[]): void {
    const planningTime = Date.now() - this.startTime;
    const currentMemory = process.memoryUsage().heapUsed / 1024 / 1024;

    // ========== Timing Display Enhancement ==========
    console.log(chalk.green(`✓ Planning completed in ${planningTime}ms`));
    console.log(
      chalk.dim(
        `💾 Memory usage: ${currentMemory.toFixed(1)}MB (+${(
          currentMemory - this.initialMemory
        ).toFixed(1)}MB)`
      )
    );

    // ========== Enhanced Phase Separation ==========
    console.log(chalk.blue('\n📋 Execution Plan:'));
    console.log(chalk.gray('━'.repeat(60)));

    // Plan summary with enhanced metrics
    const totalSteps = plan.length;
    const estimatedTime = plan.reduce(
      (sum, step) => sum + (step.timeout || 30000),
      0
    );
    const estimatedMinutes = Math.ceil(estimatedTime / 60000);

    console.log(chalk.cyan(`📊 Plan Overview:`));
    console.log(
      `   Steps: ${chalk.yellow(totalSteps)} | Est. Time: ${chalk.yellow(
        `~${estimatedMinutes}min`
      )} | Timeout: ${chalk.yellow('5min')}`
    );
    console.log(chalk.dim(`   Planned at: ${new Date().toLocaleTimeString()}`));
    console.log();

    // Group steps by phase for better visualization
    const phases = this.groupStepsByPhase(plan);

    phases.forEach((phase, phaseIndex) => {
      console.log(chalk.magenta(`📂 Phase ${phaseIndex + 1}: ${phase.name}`));
      console.log(chalk.gray(`   ${phase.steps.length} steps`));

      phase.steps.forEach((step, stepIndex) => {
        const overallStepNum = plan.indexOf(step) + 1;
        const stepNumber = chalk.cyan(`[${overallStepNum}/${totalSteps}]`);

        // Risk indicator
        const riskLevel = this.getRiskLevel(step);
        const riskIcon =
          riskLevel === 'high'
            ? chalk.red('⚠️')
            : riskLevel === 'medium'
            ? chalk.yellow('⚡')
            : chalk.green('✨');

        console.log(
          `${stepNumber} ${riskIcon} ${chalk.bold(step.description)}`
        );

        if (step.command) {
          console.log(
            `   ${chalk.gray('Command:')} ${chalk.yellow(step.command)}`
          );
        }

        console.log(`   ${chalk.gray('Expected:')} ${step.expectedOutcome}`);

        if (step.risks && step.risks.length > 0) {
          console.log(`   ${chalk.red('⚠️  Risks:')} ${step.risks.join(', ')}`);
        }

        const timeoutSec = (step.timeout || 30000) / 1000;
        console.log(`   ${chalk.gray('Timeout:')} ${timeoutSec}s`);
        console.log();
      });
    });

    console.log(chalk.gray('━'.repeat(60)));
  }

  showExecutionStep(step: ExecutionStep): {
    succeed: (message?: string) => void;
    fail: (message?: string) => void;
    stop: () => void;
    updateProgress: (elapsed: number, details?: string) => void;
  } {
    this.stepStartTime = Date.now();

    // ========== Enhanced Phase Separation ==========
    console.log(chalk.blue('\n🔄 Execution Phase'));
    console.log(chalk.gray('━'.repeat(60)));
    console.log(
      `${chalk.blue('⚡')} Executing: ${chalk.bold(step.description)}`
    );
    console.log(`${chalk.gray('   Command:')} ${chalk.yellow(step.command)}`);
    console.log(`${chalk.gray('   Expected:')} ${step.expectedOutcome}`);

    const timeoutSec = (step.timeout || 30000) / 1000;
    console.log(`${chalk.gray('   Timeout:')} ${timeoutSec}s`);

    // ========== Enhanced Memory Usage Display ==========
    const stepStartMemory = process.memoryUsage().heapUsed / 1024 / 1024;
    console.log(
      chalk.dim(`   Starting Memory: ${stepStartMemory.toFixed(1)}MB`)
    );

    // ========== Enhanced Progress Indicators ==========
    const progressBarLength = 30;
    const spinnerText = `${chalk.blue('⚡')} Executing...`;
    this.activeSpinner = ora(spinnerText).start();

    // Real-time progress tracking with enhanced metrics
    const progressInterval = setInterval(() => {
      if (this.activeSpinner) {
        const elapsed = Date.now() - this.stepStartTime;
        const elapsedSec = Math.floor(elapsed / 1000);
        const timeoutMs = step.timeout || 30000;
        const progress = Math.min(elapsed / timeoutMs, 1);

        // ========== Enhanced Visual Progress Bar ==========
        const filled = Math.floor(progress * progressBarLength);
        const remaining = progressBarLength - filled;
        const bar = '█'.repeat(filled) + '░'.repeat(remaining);

        // ========== Real-time Resource Monitoring ==========
        const currentMemory = process.memoryUsage().heapUsed / 1024 / 1024;
        const memoryDelta = currentMemory - stepStartMemory;
        this.performance.peakMemoryMB = Math.max(
          this.performance.peakMemoryMB,
          currentMemory
        );

        // Enhanced progress display with memory delta
        const memoryDisplay =
          memoryDelta > 0
            ? `${currentMemory.toFixed(1)}MB (+${memoryDelta.toFixed(1)}MB)`
            : `${currentMemory.toFixed(1)}MB`;

        const progressText = `${chalk.blue('⚡')} [${chalk.cyan(
          bar
        )}] ${chalk.gray(`${elapsedSec}s/${timeoutSec}s | ${memoryDisplay}`)}`;
        this.activeSpinner.text = progressText;
      }
    }, 500);

    return {
      updateProgress: (elapsed: number, details?: string) => {
        if (this.activeSpinner) {
          const elapsedSec = Math.floor(elapsed / 1000);
          const timeoutMs = step.timeout || 30000;
          const timeoutSec = Math.floor(timeoutMs / 1000);
          const progress = Math.min(elapsed / timeoutMs, 1);

          // ========== Enhanced Visual Progress Bar ==========
          const filled = Math.floor(progress * progressBarLength);
          const bar =
            '█'.repeat(filled) + '░'.repeat(progressBarLength - filled);

          // ========== Real-time Memory Tracking ==========
          const currentMemory = process.memoryUsage().heapUsed / 1024 / 1024;
          const progressText = details
            ? `${chalk.blue('⚡')} [${chalk.cyan(bar)}] ${details} ${chalk.gray(
                `${elapsedSec}s | ${currentMemory.toFixed(1)}MB`
              )}`
            : `${chalk.blue('⚡')} [${chalk.cyan(
                bar
              )}] Executing... ${chalk.gray(
                `${elapsedSec}s/${timeoutSec}s | ${currentMemory.toFixed(1)}MB`
              )}`;
          this.activeSpinner.text = progressText;
        }
      },
      succeed: (message?: string) => {
        clearInterval(progressInterval);
        if (this.activeSpinner) {
          const duration = Date.now() - this.stepStartTime;
          const durationSec = (duration / 1000).toFixed(2);

          // ========== Enhanced Memory Usage Reporting ==========
          const currentMemory = process.memoryUsage().heapUsed / 1024 / 1024;
          const memoryDelta = currentMemory - stepStartMemory;

          const successMessage = message || step.description;

          // ========== Enhanced Timing and Performance Display ==========
          const performanceRating =
            duration < 1000 ? 'Fast' : duration < 5000 ? 'Good' : 'Slow';
          const memoryDisplay =
            memoryDelta > 0
              ? `+${memoryDelta.toFixed(1)}MB`
              : memoryDelta < -0.1
              ? `${memoryDelta.toFixed(1)}MB`
              : 'stable';

          this.activeSpinner.succeed(
            `${chalk.green('✓')} ${successMessage} ${chalk.gray(
              `(${durationSec}s | ${currentMemory.toFixed(
                1
              )}MB ${memoryDisplay}) - ${performanceRating}`
            )}`
          );
          this.activeSpinner = null;

          // Track performance
          this.performance.filesProcessed++;
        }
      },
      fail: (message?: string) => {
        clearInterval(progressInterval);
        if (this.activeSpinner) {
          const duration = Date.now() - this.stepStartTime;
          const durationSec = (duration / 1000).toFixed(2);

          // ========== Enhanced Memory Usage Reporting ==========
          const currentMemory = process.memoryUsage().heapUsed / 1024 / 1024;
          const memoryDelta = currentMemory - stepStartMemory;

          const errorMessage = message || `${step.description} failed`;

          // ========== Enhanced Error Timing Display ==========
          const memoryDisplay =
            memoryDelta > 0
              ? `+${memoryDelta.toFixed(1)}MB`
              : memoryDelta < -0.1
              ? `${memoryDelta.toFixed(1)}MB`
              : 'stable';

          this.activeSpinner.fail(
            `${chalk.red('✗')} ${errorMessage} ${chalk.gray(
              `(${durationSec}s | ${currentMemory.toFixed(
                1
              )}MB ${memoryDisplay})`
            )}`
          );
          this.activeSpinner = null;
        }
      },
      stop: () => {
        clearInterval(progressInterval);
        if (this.activeSpinner) {
          this.activeSpinner.stop();
          this.activeSpinner = null;
        }
      },
    };
  }

  showIteration(current: number, max: number): void {
    console.log(chalk.yellow(`\n🔄 Iteration ${current}/${max}`));
  }

  displayStepOutput(output: string): void {
    if (output && output.trim()) {
      console.log(chalk.dim('Output:'));
      const lines = output.trim().split('\n');

      // Check if this looks like a key result
      const keyResult = this.identifyKeyResult(output);

      lines.forEach((line: string) => {
        // Highlight potential key results
        if (keyResult && line.trim() === keyResult.trim()) {
          console.log(chalk.green.bold(`  🎯 ${line}`));
        } else {
          console.log(chalk.dim(`  ${line}`));
        }
      });

      // Show inline result hint if we found something important
      if (keyResult) {
        console.log(chalk.cyan.dim('    ↳ Key result detected'));
      }

      console.log(); // Add spacing
    }
  }

  async displayExecutionSummary(execution: AgenticExecution): Promise<void> {
    if (this.isSimpleAnalysisExecution(execution)) {
      await this.displaySimplifiedAnalysisSummary(execution);
      return;
    }

    // Original complex summary for non-analysis tasks
    // Stop resource monitoring
    this.stopResourceMonitoring();

    const totalTime = Date.now() - this.startTime;

    // Add current execution to history for performance comparison
    this.addToExecutionHistory(execution);

    // ========== Enhanced Phase Separation ==========
    console.log(chalk.blue('\n📊 Execution Summary'));
    console.log(chalk.gray('━'.repeat(60)));

    // Goal and status
    console.log(`🎯 ${chalk.cyan('Goal:')} ${execution.goal}`);

    // Status with visual indicator
    const statusIcon = execution.success ? chalk.green('✅') : chalk.red('❌');
    const statusText = execution.success
      ? chalk.green('Completed')
      : chalk.red('Failed');
    console.log(`${statusIcon} ${chalk.cyan('Status:')} ${statusText}`);

    // ========== Enhanced Timing Display ==========
    const totalTimeSec = (totalTime / 1000).toFixed(2);
    const timeRating = this.getPerformanceRating(totalTime);
    console.log(
      `⏱️  ${chalk.cyan('Total Time:')} ${chalk.yellow(
        totalTimeSec
      )}s (${timeRating})`
    );

    // Add execution timestamp
    const completedAt = new Date().toLocaleTimeString();
    console.log(chalk.dim(`   Completed at: ${completedAt}`));

    // Step statistics
    const successfulSteps = execution.executionResults.filter(
      (r) => r.success
    ).length;
    const totalSteps = execution.plan.length;
    const successRate =
      totalSteps > 0 ? ((successfulSteps / totalSteps) * 100).toFixed(1) : '0';

    console.log(
      `🔢 ${chalk.cyan('Steps:')} ${chalk.yellow(
        successfulSteps
      )}/${chalk.yellow(totalSteps)} (${chalk.green(successRate)}% success)`
    );

    // Iteration information
    if (execution.iterations > 1) {
      console.log(
        `🔄 ${chalk.cyan('Iterations:')} ${chalk.yellow(
          execution.iterations
        )} (intelligent retry enabled)`
      );
    }

    // ========== Enhanced Memory Usage Display ==========
    const finalMemory = process.memoryUsage().heapUsed / 1024 / 1024;
    const memoryGrowth = finalMemory - this.initialMemory;
    const memoryUsage =
      memoryGrowth > 0
        ? `${finalMemory.toFixed(1)}MB (+${memoryGrowth.toFixed(1)}MB growth)`
        : `${finalMemory.toFixed(1)}MB (stable)`;

    console.log(`💾 ${chalk.cyan('Memory:')} ${chalk.yellow(memoryUsage)}`);

    if (this.performance.peakMemoryMB > finalMemory) {
      console.log(
        chalk.dim(
          `   Peak Usage: ${this.performance.peakMemoryMB.toFixed(1)}MB`
        )
      );
    }

    // Performance insights
    if (this.performance.filesProcessed > 0) {
      console.log(
        `📁 ${chalk.cyan('Files Processed:')} ${chalk.yellow(
          this.performance.filesProcessed
        )}`
      );
    }

    // ========== Phase 1 Enhancements ==========

    // Show resilience service status
    if (this.resilienceService) {
      const failureStats = this.resilienceService.getFailureStats();
      if (Object.keys(failureStats).length > 0) {
        this.displayResilienceStatus(failureStats);
      }
    }

    // Show performance comparison if we have previous data
    const performanceComparison = this.getExecutionComparison(execution);
    if (performanceComparison && this.performanceMonitor) {
      // Get additional performance data
      this.performanceMonitor
        .getPerformanceReport()
        .then((report) => {
          this.displayPerformanceComparison(
            performanceComparison,
            report.topSlowMethods.slice(0, 3),
            report.recentAlerts.slice(0, 3)
          );
        })
        .catch((err) => {
          // Fallback to basic performance comparison
          this.displayPerformanceComparison(performanceComparison);
        });
    }

    console.log(chalk.gray('━'.repeat(60)));

    // Detailed results breakdown if there were failures
    if (!execution.success && execution.executionResults.length > 0) {
      console.log(chalk.yellow('\n⚠️  Issues Encountered:'));

      execution.executionResults
        .filter((result) => !result.success)
        .forEach((result, index) => {
          console.log(chalk.red(`${index + 1}. ${result.step.description}`));
          if (result.error) {
            console.log(chalk.gray(`   Error: ${result.error}`));
          }

          // Suggest potential solutions
          const suggestions = this.generateSuggestions(result);
          if (suggestions.length > 0) {
            console.log(chalk.blue(`   💡 Suggestions:`));
            suggestions.forEach((suggestion: string) => {
              console.log(chalk.gray(`   • ${suggestion}`));
            });
          }
          console.log();
        });
    }

    // Key learnings if available
    if (execution.learnings && execution.learnings.length > 0) {
      console.log(chalk.blue('\n📚 Key Learnings:'));
      execution.learnings.slice(0, 3).forEach((learning, index) => {
        console.log(`${index + 1}. ${learning}`);
      });

      if (execution.learnings.length > 3) {
        console.log(
          chalk.gray(
            `   ... and ${execution.learnings.length - 3} more learnings stored`
          )
        );
      }
    }

    // Next steps recommendations
    if (execution.success) {
      console.log(chalk.green('\n🎉 Execution completed successfully!'));

      // Generate contextual next steps
      const nextSteps = this.generateNextSteps(execution);
      if (nextSteps.length > 0) {
        console.log(chalk.blue('\n💡 Suggested Next Steps:'));
        nextSteps.forEach((step: string, index: number) => {
          console.log(`${index + 1}. ${step}`);
        });
      }
    } else {
      console.log(chalk.red('\n❌ Execution encountered issues'));
      console.log(
        chalk.yellow('💡 You can retry with: ') +
          chalk.cyan(`aia agent "${execution.goal}"`)
      );
      console.log(
        chalk.gray(
          '   The agent will learn from this attempt and try a different approach.'
        )
      );
    }

    // ========== FINAL RESULT HIGHLIGHT ==========
    const finalResult = await this.extractFinalResult(execution);
    if (finalResult) {
      console.log(chalk.bgGreen.black.bold('\n🎯 FINAL RESULT '));
      console.log(chalk.green('━'.repeat(60)));
      console.log(chalk.green.bold(`📋 ${execution.goal}`));
      console.log(chalk.white.bold(`💡 Answer: ${finalResult}`));
      console.log(chalk.green('━'.repeat(60)));
    }

    console.log(chalk.gray('━'.repeat(60)));
  }

  displayError(error: string, context?: Record<string, unknown>): void {
    console.log(chalk.red(`❌ Error: ${error}`));
    if (context && Object.keys(context).length > 0) {
      console.log(chalk.dim('Context:'));
      Object.entries(context).forEach(([key, value]) => {
        console.log(chalk.dim(`  ${key}: ${JSON.stringify(value)}`));
      });
    }
  }

  displayWarning(message: string): void {
    console.log(chalk.yellow(`⚠️  Warning: ${message}`));
  }

  displaySuccess(message: string): void {
    console.log(chalk.green(`✅ ${message}`));
  }

  async askConfirmation(
    message: string,
    defaultValue: boolean = true
  ): Promise<boolean> {
    const { confirmed } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'confirmed',
        message,
        default: defaultValue,
      },
    ]);
    return confirmed;
  }

  formatExecutionSummary(execution: AgenticExecution): string {
    if (this.isSimpleAnalysisExecution(execution)) {
      const result = this.extractAnalysisAnswer(execution);
      if (result) {
        return result;
      }
      return execution.success
        ? 'Analysis completed successfully'
        : 'Analysis failed - please try refining your query';
    }

    // Original formatting for complex tasks
    const lines = [];
    lines.push(`Goal: ${execution.goal}`);
    lines.push(`Status: ${execution.status}`);
    lines.push(`Iterations: ${execution.iterations}`);
    lines.push(`Steps: ${execution.plan.length}`);

    const successfulSteps = execution.executionResults.filter(
      (r) => r.success
    ).length;
    const successRate =
      execution.plan.length > 0
        ? ((successfulSteps / execution.plan.length) * 100).toFixed(1)
        : '0';
    lines.push(`Success Rate: ${successRate}%`);

    if (execution.learnings.length > 0) {
      lines.push('\nLearnings:');
      execution.learnings.forEach((learning, index) => {
        lines.push(`${index + 1}. ${learning}`);
      });
    }

    if (execution.executionResults.length > 0) {
      lines.push('\nStep Results:');
      execution.executionResults.forEach((result, index) => {
        const status = result.success ? '✓' : '✗';
        lines.push(`${status} ${result.step.description}`);
        if (result.error) {
          lines.push(`  Error: ${result.error}`);
        }
      });
    }

    return lines.join('\n');
  }

  // ========== Phase 1 Enhancement Methods ==========

  displayCircuitBreakerStatus(
    commandName: string,
    state: CircuitBreakerState
  ): void {
    if (state.isBlocked) {
      const timeUntilReset = Math.max(
        0,
        Math.ceil((state.blockUntil - Date.now()) / 1000)
      );
      console.log(chalk.red('🚫 Circuit Breaker Status'));
      console.log(chalk.gray('━'.repeat(50)));
      console.log(chalk.red(`Command: ${commandName}`));
      console.log(chalk.red(`Status: BLOCKED`));
      console.log(
        chalk.yellow(`Consecutive Failures: ${state.consecutiveFailures}`)
      );
      console.log(chalk.yellow(`Time until reset: ${timeUntilReset}s`));
      console.log(chalk.gray(`Last Failure: ${state.lastFailure}`));

      if (state.alternativeSuggested) {
        console.log(
          chalk.blue(`💡 Alternative: ${state.alternativeSuggested}`)
        );
      }
    } else if (state.consecutiveFailures > 0) {
      console.log(chalk.yellow('⚠️  Circuit Breaker Warning'));
      console.log(chalk.gray('━'.repeat(50)));
      console.log(chalk.yellow(`Command: ${commandName}`));
      console.log(
        chalk.yellow(`Consecutive Failures: ${state.consecutiveFailures}/3`)
      );
      console.log(chalk.gray('Will be blocked after 3 consecutive failures'));
    }
  }

  displayRetryAttempt(retryInfo: RetryAttemptInfo): void {
    console.log(chalk.yellow('\n🔄 Retry Attempt'));
    console.log(chalk.gray('━'.repeat(40)));
    console.log(
      chalk.yellow(`Attempt: ${retryInfo.attempt}/${retryInfo.maxRetries}`)
    );
    console.log(
      chalk.yellow(
        `Backoff Delay: ${(retryInfo.backoffDelay / 1000).toFixed(1)}s`
      )
    );
    console.log(
      chalk.gray(`Previous Error: ${retryInfo.error.substring(0, 80)}...`)
    );

    // Visual progress for backoff delay
    if (retryInfo.backoffDelay > 1000) {
      const steps = Math.min(10, Math.floor(retryInfo.backoffDelay / 1000));
      const delayPerStep = retryInfo.backoffDelay / steps;

      console.log(chalk.cyan('⏱️  Waiting: '), { newline: false });
      for (let i = 0; i < steps; i++) {
        setTimeout(() => {
          process.stdout.write(chalk.cyan('▓'));
        }, i * delayPerStep);
      }
      setTimeout(() => {
        process.stdout.write(chalk.green(' Ready!\n'));
      }, retryInfo.backoffDelay);
    }
  }

  displayTimeoutWarning(remainingSeconds: number, operation: string): void {
    if (remainingSeconds <= 30) {
      const urgency = remainingSeconds <= 10 ? chalk.red : chalk.yellow;
      console.log(urgency(`⏰ Timeout Warning: ${operation}`));
      console.log(urgency(`${remainingSeconds}s remaining...`));

      if (remainingSeconds <= 10) {
        console.log(chalk.red('⚠️  Operation will be terminated soon!'));
      }
    }
  }

  displayEnhancedError(
    error: Error,
    context: {
      commandName?: string;
      circuitBreakerState?: CircuitBreakerState;
      recoveryActions?: string[];
      errorType?: string;
      severity?: string;
      recoverable?: boolean;
    }
  ): void {
    console.log(chalk.red('\n❌ Enhanced Error Analysis'));
    console.log(chalk.gray('━'.repeat(60)));

    // Error classification
    if (context.errorType || context.severity) {
      console.log(chalk.red(`Error Type: ${context.errorType || 'Unknown'}`));
      console.log(chalk.red(`Severity: ${context.severity || 'Unknown'}`));
      console.log(
        chalk.cyan(`Recoverable: ${context.recoverable ? 'Yes' : 'No'}`)
      );
      console.log();
    }

    // Main error message
    console.log(chalk.red(`Message: ${error.message}`));

    if (context.commandName) {
      console.log(chalk.gray(`Command: ${context.commandName}`));
    }

    // Circuit breaker information
    if (context.circuitBreakerState) {
      console.log(chalk.yellow(`\n🔄 Resilience Status:`));
      console.log(
        chalk.yellow(
          `  Failures: ${context.circuitBreakerState.consecutiveFailures}/3`
        )
      );

      if (context.circuitBreakerState.isBlocked) {
        const timeUntilReset = Math.max(
          0,
          Math.ceil(
            (context.circuitBreakerState.blockUntil - Date.now()) / 1000
          )
        );
        console.log(
          chalk.red(
            `  Status: Circuit breaker active (${timeUntilReset}s remaining)`
          )
        );
      }
    }

    // Recovery suggestions
    if (context.recoveryActions && context.recoveryActions.length > 0) {
      console.log(chalk.blue('\n💡 Suggested Recovery Actions:'));
      context.recoveryActions.forEach((action, index) => {
        console.log(chalk.blue(`  ${index + 1}. ${action}`));
      });
    }

    console.log(chalk.gray('━'.repeat(60)));
  }

  displayPerformanceComparison(
    comparison: PerformanceComparison,
    methodMetrics?: MethodMetrics[],
    alerts?: PerformanceAlert[]
  ): void {
    console.log(chalk.blue('\n📊 Performance Analysis'));
    console.log(chalk.gray('━'.repeat(60)));

    // Current vs Previous comparison
    console.log(chalk.cyan('⚡ Execution Comparison:'));

    const durationChange = comparison.improvement.durationPercent;
    const durationIcon =
      durationChange < 0
        ? chalk.green('↓')
        : durationChange > 0
        ? chalk.red('↑')
        : chalk.gray('→');
    const durationColor =
      durationChange < 0
        ? chalk.green
        : durationChange > 0
        ? chalk.red
        : chalk.gray;

    console.log(
      `  Duration: ${(comparison.currentExecution.duration / 1000).toFixed(
        2
      )}s ${durationIcon} ${durationColor(
        Math.abs(durationChange).toFixed(1) + '%'
      )}`
    );
    console.log(
      `  Memory Peak: ${comparison.currentExecution.memoryPeak.toFixed(1)}MB`
    );
    console.log(
      `  Success Rate: ${comparison.currentExecution.successRate.toFixed(1)}%`
    );

    // Performance rating
    const overallRating = this.calculatePerformanceRating(comparison);
    console.log(`  Overall: ${overallRating}`);

    // Method performance insights
    if (methodMetrics && methodMetrics.length > 0) {
      console.log(chalk.cyan('\n🔍 Method Performance (Top 3 Slowest):'));
      methodMetrics.slice(0, 3).forEach((metric, index) => {
        const errorRate =
          metric.executionCount > 0
            ? (metric.errorCount / metric.executionCount) * 100
            : 0;
        console.log(`  ${index + 1}. ${metric.className}.${metric.methodName}`);
        console.log(
          `     Avg: ${metric.averageExecutionTime.toFixed(
            1
          )}ms | Errors: ${errorRate.toFixed(1)}%`
        );
      });
    }

    // Performance alerts
    if (alerts && alerts.length > 0) {
      console.log(chalk.yellow('\n⚠️  Performance Alerts:'));
      alerts.slice(0, 3).forEach((alert, index) => {
        const alertColor = alert.level === 'error' ? chalk.red : chalk.yellow;
        console.log(alertColor(`  ${index + 1}. ${alert.message}`));
      });
    }

    console.log(chalk.gray('━'.repeat(60)));
  }

  displayResilienceStatus(stats: Record<string, CircuitBreakerState>): void {
    const blockedCommands = Object.entries(stats).filter(
      ([_, state]) => state.isBlocked
    );
    const warningCommands = Object.entries(stats).filter(
      ([_, state]) => !state.isBlocked && state.consecutiveFailures > 0
    );

    if (blockedCommands.length === 0 && warningCommands.length === 0) {
      return; // No resilience issues to display
    }

    console.log(chalk.blue('\n🛡️  Resilience Status'));
    console.log(chalk.gray('━'.repeat(50)));

    if (blockedCommands.length > 0) {
      console.log(chalk.red('🚫 Blocked Commands:'));
      blockedCommands.forEach(([command, state]) => {
        const timeUntilReset = Math.max(
          0,
          Math.ceil((state.blockUntil - Date.now()) / 1000)
        );
        console.log(chalk.red(`  • ${command} (resets in ${timeUntilReset}s)`));
      });
    }

    if (warningCommands.length > 0) {
      console.log(chalk.yellow('\n⚠️  Commands with Failures:'));
      warningCommands.forEach(([command, state]) => {
        console.log(
          chalk.yellow(
            `  • ${command} (${state.consecutiveFailures}/3 failures)`
          )
        );
      });
    }

    console.log(chalk.gray('━'.repeat(50)));
  }

  private calculatePerformanceRating(
    comparison: PerformanceComparison
  ): string {
    const durationImprovement = comparison.improvement.durationPercent;
    const memoryImprovement = comparison.improvement.memoryPercent;
    const successImprovement = comparison.improvement.successRatePercent;

    const averageImprovement =
      (durationImprovement + memoryImprovement + successImprovement) / 3;

    if (averageImprovement < -20) {
      return chalk.green('🚀 Excellent');
    } else if (averageImprovement < -10) {
      return chalk.green('✅ Good');
    } else if (averageImprovement < 10) {
      return chalk.yellow('➖ Similar');
    } else if (averageImprovement < 20) {
      return chalk.red('⚠️  Slower');
    } else {
      return chalk.red('❌ Much Slower');
    }
  }

  private getExecutionComparison(
    currentExecution: AgenticExecution
  ): PerformanceComparison | null {
    if (this.executionHistory.length === 0) {
      return null; // No previous data to compare
    }

    // Calculate averages from previous executions
    const previousExecutions = this.executionHistory.slice(-5); // Last 5 executions
    const avgDuration =
      previousExecutions.reduce((sum, exec) => {
        const start = new Date(exec.startTime).getTime();
        const end = exec.endTime ? new Date(exec.endTime).getTime() : start;
        return sum + (end - start);
      }, 0) / previousExecutions.length;

    const avgMemory = this.performance.peakMemoryMB; // Use current session peak as baseline
    const avgSuccessRate =
      previousExecutions.reduce((sum, exec) => {
        const successfulSteps = exec.executionResults.filter(
          (r) => r.success
        ).length;
        return sum + (successfulSteps / exec.plan.length) * 100;
      }, 0) / previousExecutions.length;

    const currentStart = new Date(currentExecution.startTime).getTime();
    const currentEnd = currentExecution.endTime
      ? new Date(currentExecution.endTime).getTime()
      : Date.now();
    const currentDuration = currentEnd - currentStart;
    const currentMemory = this.performance.peakMemoryMB;
    const currentSuccessRate =
      (currentExecution.executionResults.filter((r) => r.success).length /
        currentExecution.plan.length) *
      100;

    return {
      currentExecution: {
        duration: currentDuration,
        memoryPeak: currentMemory,
        successRate: currentSuccessRate,
      },
      previousAverage: {
        duration: avgDuration,
        memoryPeak: avgMemory,
        successRate: avgSuccessRate,
      },
      improvement: {
        durationPercent:
          avgDuration > 0
            ? ((currentDuration - avgDuration) / avgDuration) * 100
            : 0,
        memoryPercent:
          avgMemory > 0 ? ((currentMemory - avgMemory) / avgMemory) * 100 : 0,
        successRatePercent:
          avgSuccessRate > 0
            ? ((currentSuccessRate - avgSuccessRate) / avgSuccessRate) * 100
            : 0,
      },
    };
  }

  private addToExecutionHistory(execution: AgenticExecution): void {
    this.executionHistory.push(execution);

    // Keep only the last 10 executions to prevent memory growth
    if (this.executionHistory.length > 10) {
      this.executionHistory = this.executionHistory.slice(-10);
    }
  }

  // ========== Original Helper Methods ==========

  private startResourceMonitoring(): void {
    this.initialMemory = process.memoryUsage().heapUsed / 1024 / 1024;
    this.performance.peakMemoryMB = this.initialMemory;

    this.resourceMonitor = setInterval(() => {
      const memoryMB = process.memoryUsage().heapUsed / 1024 / 1024;
      this.performance.peakMemoryMB = Math.max(
        this.performance.peakMemoryMB,
        memoryMB
      );

      // Sample CPU usage (simplified)
      const cpus = os.cpus();
      if (cpus.length > 0) {
        const avgUsage =
          cpus.reduce((sum, cpu) => {
            let totalTick = 0;
            let idleTick = 0;
            for (const type in cpu.times) {
              totalTick += cpu.times[type as keyof typeof cpu.times];
              if (type === 'idle')
                idleTick += cpu.times[type as keyof typeof cpu.times];
            }
            return sum + (totalTick > 0 ? (1 - idleTick / totalTick) * 100 : 0);
          }, 0) / cpus.length;

        this.performance.cpuSamples.push(avgUsage);
        this.performance.avgCpuPercent =
          this.performance.cpuSamples.reduce((a, b) => a + b, 0) /
          this.performance.cpuSamples.length;
      }
    }, 2000);
  }

  private stopResourceMonitoring(): void {
    if (this.resourceMonitor) {
      clearInterval(this.resourceMonitor);
      this.resourceMonitor = null;
    }
  }

  private groupStepsByPhase(
    steps: ExecutionStep[]
  ): Array<{ name: string; steps: ExecutionStep[] }> {
    const phases = new Map<string, ExecutionStep[]>();

    steps.forEach((step) => {
      const phaseName = (step as any).phase || 'Default';
      if (!phases.has(phaseName)) {
        phases.set(phaseName, []);
      }
      phases.get(phaseName)!.push(step);
    });

    return Array.from(phases.entries()).map(([name, steps]) => ({
      name,
      steps,
    }));
  }

  private getRiskLevel(step: ExecutionStep): 'low' | 'medium' | 'high' {
    if (!step.risks || step.risks.length === 0) return 'low';

    const riskKeywords = {
      high: ['delete', 'remove', 'drop', 'truncate', 'format', 'destroy'],
      medium: ['modify', 'update', 'change', 'alter', 'install', 'uninstall'],
    };

    const stepText = `${step.description} ${step.command || ''}`.toLowerCase();

    if (riskKeywords.high.some((keyword) => stepText.includes(keyword)))
      return 'high';
    if (riskKeywords.medium.some((keyword) => stepText.includes(keyword)))
      return 'medium';

    return 'low';
  }

  private getPerformanceRating(totalTimeMs: number): string {
    const timeRating =
      totalTimeMs < 30000
        ? 'Excellent'
        : totalTimeMs < 60000
        ? 'Good'
        : totalTimeMs < 120000
        ? 'Fair'
        : 'Slow';

    const memoryRating =
      this.performance.peakMemoryMB < 100
        ? 'Efficient'
        : this.performance.peakMemoryMB < 200
        ? 'Moderate'
        : 'Heavy';

    return `${timeRating} (${memoryRating} memory usage)`;
  }

  private generateSuggestions(result: any): string[] {
    const suggestions: string[] = [];
    const error = result.error?.toLowerCase() || '';
    const command = result.step?.command?.toLowerCase() || '';

    // Common error pattern suggestions
    if (error.includes('command not found') || error.includes('not found')) {
      if (command.includes('git')) {
        suggestions.push('Install Git: https://git-scm.com/downloads');
      } else if (command.includes('node') || command.includes('npm')) {
        suggestions.push('Install Node.js: https://nodejs.org/');
      } else if (command.includes('docker')) {
        suggestions.push('Install Docker: https://docs.docker.com/get-docker/');
      } else {
        suggestions.push('Check if the required tool is installed and in PATH');
      }
    }

    if (
      error.includes('permission denied') ||
      error.includes('access denied')
    ) {
      suggestions.push('Try running with elevated permissions (sudo/admin)');
      suggestions.push('Check file/directory permissions');
    }

    if (error.includes('timeout') || error.includes('timed out')) {
      suggestions.push('Increase timeout setting with --timeout option');
      suggestions.push('Check network connectivity if applicable');
    }

    if (error.includes('no such file') || error.includes('cannot find')) {
      suggestions.push('Verify the file path exists');
      suggestions.push('Check current working directory');
    }

    if (error.includes('port') && error.includes('in use')) {
      suggestions.push(
        'Use a different port or kill the process using the port'
      );
    }

    return suggestions;
  }

  private generateNextSteps(execution: AgenticExecution): string[] {
    const nextSteps: string[] = [];
    const goal = execution.goal.toLowerCase();

    // Context-aware next step suggestions
    if (goal.includes('test') || goal.includes('testing')) {
      nextSteps.push('Run the test suite to verify functionality');
      nextSteps.push('Consider adding more test cases for edge cases');
    }

    if (
      goal.includes('create') ||
      goal.includes('implement') ||
      goal.includes('add')
    ) {
      nextSteps.push('Review the implementation for best practices');
      nextSteps.push('Update documentation to reflect changes');
      nextSteps.push('Consider performance implications and optimization');
    }

    if (goal.includes('refactor') || goal.includes('optimize')) {
      nextSteps.push('Measure performance improvements');
      nextSteps.push('Update tests to cover refactored code');
    }

    if (goal.includes('security') || goal.includes('audit')) {
      nextSteps.push('Review security recommendations');
      nextSteps.push('Update dependencies to latest secure versions');
    }

    if (goal.includes('setup') || goal.includes('configure')) {
      nextSteps.push('Test the configuration in different environments');
      nextSteps.push('Document the setup process for team members');
    }

    // Always suggest general good practices
    if (nextSteps.length > 0) {
      nextSteps.push('Commit changes with descriptive commit messages');
    } else {
      nextSteps.push('Review the changes and test in a staging environment');
      nextSteps.push('Consider documenting the process for future reference');
    }

    return nextSteps.slice(0, 3); // Limit to 3 suggestions
  }

  // ========== Phase 1 Enhanced Error Handling Integration ==========

  /**
   * Enhanced error display that integrates with resilience service and error analysis
   * This method should be used instead of displayError for better user experience
   */
  displayEnhancedErrorFromCommandExecution(
    error: Error,
    commandName?: string,
    stepContext?: any
  ): void {
    // Get resilience service information if available
    let circuitBreakerState: CircuitBreakerState | undefined;
    if (this.resilienceService && commandName) {
      circuitBreakerState =
        this.resilienceService.getCircuitBreakerState(commandName) || undefined;
    }

    // Analyze error for type and recovery suggestions
    const errorMessage = error.message.toLowerCase();
    let errorType = 'unknown';
    let severity = 'medium';
    let recoverable = true;
    const recoveryActions: string[] = [];

    // Basic error classification
    if (
      errorMessage.includes('timeout') ||
      errorMessage.includes('timed out')
    ) {
      errorType = 'timeout';
      severity = 'high';
      recoveryActions.push('Increase timeout duration');
      recoveryActions.push('Check system performance and network connectivity');
    } else if (
      errorMessage.includes('permission') ||
      errorMessage.includes('access denied')
    ) {
      errorType = 'permission';
      severity = 'high';
      recoverable = false;
      recoveryActions.push('Check file/directory permissions');
      recoveryActions.push('Run with elevated privileges if necessary');
    } else if (
      errorMessage.includes('not found') ||
      errorMessage.includes('command not found')
    ) {
      errorType = 'missing_dependency';
      severity = 'high';
      recoveryActions.push('Install the required tool or dependency');
      recoveryActions.push('Check system PATH configuration');
    } else if (
      errorMessage.includes('api') ||
      errorMessage.includes('unauthorized')
    ) {
      errorType = 'api_error';
      severity = 'high';
      recoverable = false;
      recoveryActions.push('Check API credentials and configuration');
      recoveryActions.push('Verify API rate limits and quotas');
    } else if (
      errorMessage.includes('network') ||
      errorMessage.includes('connection')
    ) {
      errorType = 'network';
      severity = 'medium';
      recoveryActions.push('Check internet connectivity');
      recoveryActions.push('Retry the operation');
    }

    // Display the enhanced error
    this.displayEnhancedError(error, {
      commandName,
      circuitBreakerState,
      recoveryActions,
      errorType,
      severity,
      recoverable,
    });

    // Show circuit breaker status if relevant
    if (circuitBreakerState && commandName) {
      this.displayCircuitBreakerStatus(commandName, circuitBreakerState);
    }
  }

  /**
   * Display retry attempt information when retries are happening
   */
  displayRetryInProgress(
    attemptNumber: number,
    maxAttempts: number,
    operation: string,
    lastError: Error
  ): void {
    this.displayRetryAttempt({
      attempt: attemptNumber,
      maxRetries: maxAttempts,
      backoffDelay: 1000 * Math.pow(2, attemptNumber - 1), // Calculate backoff based on attempt
      error: lastError.message,
    });
  }

  /**
   * Display timeout warning when operation is approaching timeout
   */
  displayTimeoutWarningForOperation(
    operation: string,
    timeoutMs: number,
    currentDuration: number
  ): void {
    const remainingMs = timeoutMs - currentDuration;
    const remainingSeconds = Math.ceil(remainingMs / 1000);
    this.displayTimeoutWarning(remainingSeconds, operation);
  }

  /**
   * Check if this is a simple analysis execution
   */
  private isSimpleAnalysisExecution(execution: AgenticExecution): boolean {
    // Check if the goal or plan indicates this is an analysis task
    const goalLower = execution.goal.toLowerCase();
    const isAnalysisGoal =
      goalLower.includes('what is') ||
      goalLower.includes('what are') ||
      goalLower.includes('how many') ||
      goalLower.includes('which') ||
      goalLower.includes('find') ||
      goalLower.includes('show') ||
      goalLower.includes('list') ||
      goalLower.includes('largest') ||
      goalLower.includes('smallest') ||
      goalLower.includes('analyze') ||
      goalLower.includes('analysis');

    // Also check if there's only one step and it's an analysis step
    const singleAnalysisStep =
      execution.plan.length === 1 &&
      execution.plan[0].id === 'perform_analysis';

    return isAnalysisGoal && singleAnalysisStep;
  }

  /**
   * Display simplified summary for analysis tasks
   */
  private async displaySimplifiedAnalysisSummary(
    execution: AgenticExecution
  ): Promise<void> {
    console.log(chalk.gray('━'.repeat(60)));

    if (execution.success) {
      console.log(chalk.green('✅ Analysis Complete'));

      // Try to generate a human-readable summary using AI
      const humanReadableSummary = await this.generateHumanReadableSummary(
        execution
      );
      if (humanReadableSummary) {
        console.log('\n' + humanReadableSummary);
      } else {
        // Fallback to the original answer extraction
        const result = this.extractAnalysisAnswer(execution);
        if (result) {
          console.log('\n' + result);
        }
      }
    } else {
      console.log(chalk.red('❌ Analysis Failed'));
      console.log(
        chalk.yellow(
          'Please try refining your query or check the codebase status.'
        )
      );
    }

    console.log(chalk.gray('━'.repeat(60)));
  }

  /**
   * Extract the main answer from analysis execution results
   */
  private extractAnalysisAnswer(execution: AgenticExecution): string | null {
    // Look through execution results for content with the answer marker
    for (const result of execution.executionResults || []) {
      if (typeof result === 'object' && result !== null) {
        const resultObj = result as any;
        if (resultObj.output && typeof resultObj.output === 'string') {
          const output = resultObj.output;

          // Look for the 🎯 ANSWER: marker
          const answerMatch = output.match(/🎯 ANSWER:(.*?)(?=\n\n|\n$|$)/s);
          if (answerMatch) {
            return chalk.cyan('🎯 ') + chalk.white(answerMatch[1].trim());
          }

          // Fallback: look for command output that might contain the answer
          const lines = output.split('\n');
          for (const line of lines) {
            const trimmed = line.trim();
            if (
              trimmed &&
              !trimmed.startsWith('$') &&
              !trimmed.startsWith('#') &&
              !trimmed.includes('━')
            ) {
              return chalk.cyan('📊 ') + chalk.white(trimmed);
            }
          }
        }
      }
    }

    return null;
  }

  /**
   * Generate a human-readable summary using AI based on the execution results
   */
  private async generateHumanReadableSummary(
    execution: AgenticExecution
  ): Promise<string | null> {
    if (!this.aiService) {
      return null; // No AI service available, fallback to original extraction
    }

    try {
      // Extract the raw output from execution results
      const rawOutput = this.extractRawOutput(execution);
      if (!rawOutput) {
        return null;
      }

      // Create a prompt for the AI to generate a human-readable summary
      const prompt = `You are an AI assistant helping to summarize technical command output for a user. 

The user asked: "${execution.goal}"

The command output was:
${rawOutput}

Please provide a clear, concise, human-readable summary that directly answers the user's question. Focus on the key information and present it in natural language. Avoid technical jargon when possible and make it conversational like you would normally respond.

Guidelines:
- Be direct and answer the specific question asked
- Use natural language, not technical command output format
- Include specific numbers/details when relevant
- Keep it concise but informative
- If there are multiple results, summarize the most important ones

Response:`;

      // Create minimal context for the AI query
      const context: ContextInfo = {
        workingDirectory: process.cwd(),
        platform: process.platform,
        arch: process.arch,
        nodeVersion: process.version,
        user: process.env.USER || 'unknown',
        shell: process.env.SHELL || 'unknown',
        timestamp: new Date().toISOString(),
        projectType: 'analysis',
        projectInfo: {},
        gitStatus: '',
        environmentScore: 1.0,
      };

      const response = await this.aiService.queryAI(prompt, context);

      // Format the AI response with nice styling
      return chalk.cyan('🤖 ') + chalk.white(response.content.trim());
    } catch (error) {
      // If AI service fails, return null to fallback to original method
      // Don't log the error to keep output clean - the fallback provides good UX
      return null;
    }
  }

  /**
   * Extract raw output from execution results for AI processing
   */
  private extractRawOutput(execution: AgenticExecution): string | null {
    // Look through execution results for the raw command output
    for (const result of execution.executionResults || []) {
      if (typeof result === 'object' && result !== null) {
        const resultObj = result as any;
        if (resultObj.output && typeof resultObj.output === 'string') {
          return resultObj.output;
        }
      }
    }
    return null;
  }

  /**
   * Generates an AI-powered final summary based on all execution step outputs
   */
  private async generateAIFinalSummary(
    execution: AgenticExecution
  ): Promise<string | null> {
    try {
      // Aggregate all meaningful outputs from execution steps
      const aggregatedFindings = this.aggregateExecutionFindings(execution);

      if (!aggregatedFindings || aggregatedFindings.trim().length === 0) {
        return null;
      }

      // Create a comprehensive prompt for AI to generate a holistic summary
      const prompt = `You are an AI assistant analyzing the results of executing multiple commands to answer a user's question.

**User's Original Question:** "${execution.goal}"

**All Command Outputs and Findings:**
${aggregatedFindings}

**Your Task:**
Based on all the command outputs above, provide a comprehensive, human-readable summary that directly answers the user's question. This should be a natural, conversational response that synthesizes all the information gathered.

**Guidelines:**
- Provide a holistic analysis, not just a dump of command output
- Answer the user's specific question directly and naturally
- Highlight the most important information discovered
- Use natural language, avoid technical jargon where possible
- If multiple pieces of information were gathered, explain how they relate to each other
- Be specific and include relevant details (numbers, names, versions, etc.)
- Keep it concise but comprehensive
- Write as if you're having a conversation with the user

**Response Format:**
Write your response as a natural, flowing explanation that directly addresses "${execution.goal}". Start your response immediately without prefacing it with "Based on the commands" or similar phrases.`;

      // Create context for the AI query
      const context: ContextInfo = {
        workingDirectory: process.cwd(),
        platform: process.platform,
        arch: process.arch,
        nodeVersion: process.version,
        user: process.env.USER || 'unknown',
        shell: process.env.SHELL || 'unknown',
        timestamp: new Date().toISOString(),
        projectType: 'repository-analysis',
        projectInfo: { goal: execution.goal },
        gitStatus: '',
        environmentScore: 1.0,
      };

      // Get AI response
      const response = await this.aiService!.queryAI(prompt, context);

      if (response && response.content) {
        return response.content.trim();
      }

      return null;
    } catch (error) {
      // Silently fail and return null to fall back to original extraction
      return null;
    }
  }

  /**
   * Aggregates all meaningful outputs from execution steps for AI analysis
   */
  private aggregateExecutionFindings(execution: AgenticExecution): string {
    const findings: string[] = [];

    for (const [index, result] of execution.executionResults.entries()) {
      if (result.success && result.output) {
        const output = result.output.toString().trim();

        // Skip validation steps and empty outputs
        if (output.includes('Validating') || output.length < 5) {
          continue;
        }

        // Add step information for context
        const stepInfo = result.step
          ? result.step.description
          : `Step ${index + 1}`;
        const command = result.step?.command || 'Unknown command';

        findings.push(`**${stepInfo}**`);
        findings.push(`Command: \`${command}\``);
        findings.push(`Output:`);
        findings.push('```');
        findings.push(output);
        findings.push('```');
        findings.push(''); // Empty line for separation
      }
    }

    return findings.join('\n');
  }

  // ========== Phase 1 UX Enhancements - Implementation Priority Matrix ==========

  /**
   * Shows phase transition with enhanced visual separators
   */
  showPhaseTransition(fromPhase: string, toPhase: string): void {
    const transitionTime = Date.now() - this.stepStartTime;
    console.log(chalk.gray('\n' + '━'.repeat(60)));
    console.log(
      chalk.magenta(`📍 Phase Transition: ${fromPhase} → ${toPhase}`)
    );
    console.log(chalk.dim(`⏱️  Transition completed in ${transitionTime}ms`));
    console.log(chalk.gray('━'.repeat(60)));
  }

  /**
   * Shows enhanced planning progress with real-time feedback
   */
  showPlanningProgress(step: string, progress: number): void {
    const elapsed = Date.now() - this.startTime;
    const elapsedSec = (elapsed / 1000).toFixed(1);
    const currentMemory = process.memoryUsage().heapUsed / 1024 / 1024;
    const memoryDelta = currentMemory - this.initialMemory;

    // Progress bar for planning phase
    const barLength = 20;
    const filled = Math.floor(progress * barLength);
    const bar = '█'.repeat(filled) + '░'.repeat(barLength - filled);

    const memoryDisplay =
      memoryDelta > 0.1 ? `+${memoryDelta.toFixed(1)}MB` : 'stable';

    console.log(chalk.cyan(`🔍 ${step}`));
    console.log(
      chalk.dim(
        `   [${chalk.cyan(bar)}] ${(progress * 100).toFixed(
          0
        )}% | ${elapsedSec}s | ${currentMemory.toFixed(1)}MB (${memoryDisplay})`
      )
    );
  }

  /**
   * Shows verification phase with enhanced metrics
   */
  showVerificationPhase(results: any): void {
    console.log(chalk.green('\n✅ Verification Phase'));
    console.log(chalk.gray('━'.repeat(60)));

    const verificationTime = Date.now() - this.stepStartTime;
    const currentMemory = process.memoryUsage().heapUsed / 1024 / 1024;

    console.log(chalk.cyan(`🔍 Verifying execution results...`));
    console.log(
      chalk.dim(
        `⏱️  Verification time: ${(verificationTime / 1000).toFixed(1)}s`
      )
    );
    console.log(chalk.dim(`💾 Memory usage: ${currentMemory.toFixed(1)}MB`));

    if (results) {
      // Show verification details
      console.log(chalk.green(`✓ Verification completed successfully`));
    }
  }

  /**
   * Extracts the most relevant final result from the execution
   * Generates an AI-powered summary of all findings instead of just showing command output
   */
  private async extractFinalResult(
    execution: AgenticExecution
  ): Promise<string | null> {
    if (!execution.success || !execution.executionResults.length) {
      return null;
    }

    // First priority: Try to generate an AI-powered summary of all findings
    if (this.aiService && this.aiService.isConfigured()) {
      const aiSummary = await this.generateAIFinalSummary(execution);
      if (aiSummary) {
        return aiSummary;
      }
    }

    // Fallback: Look for existing AI responses in the output
    for (const result of execution.executionResults) {
      if (result.success && result.output) {
        const output = result.output.toString().trim();

        // Look for AI responses - these usually contain 🎯 ANSWER: or are longer explanatory text
        if (output.includes('🎯 ANSWER:')) {
          // Extract everything after the ANSWER marker
          const answerMatch = output.match(/🎯 ANSWER:(.*?)(?=\n\n|\n$|$)/s);
          if (answerMatch) {
            return answerMatch[1].trim();
          }
        }

        // Look for analysis step output (likely AI generated content)
        if (
          result.step &&
          result.step.id === 'perform_analysis' &&
          output.length > 50
        ) {
          // Return the full AI response without parsing
          return output;
        }

        // Look for longer, explanatory responses that are likely from AI
        if (
          output.length > 100 &&
          !output.includes('Validating') &&
          !this.looksLikeCommandOutput(output)
        ) {
          return output;
        }
      }
    }

    // Second priority: Look for longer, meaningful responses that appear to be AI-generated
    // This catches cases where the AI response isn't in the analysis step
    for (const result of execution.executionResults) {
      if (result.success && result.output) {
        const output = result.output.toString().trim();

        // Skip validation steps and very short outputs
        if (output.includes('Validating') || output.length < 20) {
          continue;
        }

        // Look for outputs that seem like explanations or analyses (likely from AI)
        if (this.looksLikeAIResponse(output)) {
          return output;
        }
      }
    }

    // Fallback to custom parsing for simple command outputs
    return this.extractSimpleCommandResult(execution);
  }

  /**
   * Checks if output looks like an AI response vs simple command output
   */
  private looksLikeAIResponse(output: string): boolean {
    // AI responses typically have certain characteristics
    const aiIndicators = [
      'Based on',
      'This project',
      'The main',
      'According to',
      'Analysis shows',
      'I can see',
      'This appears to be',
      'From the information',
      'Looking at',
      'The purpose',
      'This is a',
      'Important files include',
      'Key components',
      'The project structure',
      'In this project',
      'The most important',
    ];

    const lowerOutput = output.toLowerCase();

    // Check for AI-like language patterns
    const hasAILanguage = aiIndicators.some((indicator) =>
      lowerOutput.includes(indicator.toLowerCase())
    );

    // AI responses are usually longer and more explanatory
    const hasExplanatoryLength = output.length > 100;

    // AI responses often have multiple sentences
    const hasMultipleSentences = (output.match(/\./g) || []).length > 1;

    return hasAILanguage || (hasExplanatoryLength && hasMultipleSentences);
  }

  /**
   * Checks if output looks like raw command output vs AI response
   */
  private looksLikeCommandOutput(output: string): boolean {
    const lines = output.split('\n');

    // Command outputs are usually short, have file listings, or are simple numbers
    if (lines.length === 1 && /^\s*\d+\s*$/.test(output)) return true; // Just a number
    if (lines.length === 1 && /^v?\d+\.\d+/.test(output)) return true; // Version number
    if (output.includes('total ') && output.includes('drwx')) return true; // ls -la output
    if (lines.every((line) => line.length < 100)) return true; // Short lines (likely file names)

    return false;
  }

  /**
   * Fallback method for simple command results when no AI response is found
   */
  private extractSimpleCommandResult(
    execution: AgenticExecution
  ): string | null {
    // For counting tasks (like "count files")
    if (execution.goal.toLowerCase().includes('count')) {
      return this.extractCountResult(execution);
    }

    // For version or info queries
    if (
      execution.goal.toLowerCase().includes('version') ||
      execution.goal.toLowerCase().includes('info')
    ) {
      return this.extractVersionResult(execution);
    }

    // For listing tasks - show a few items
    if (
      execution.goal.toLowerCase().includes('list') ||
      execution.goal.toLowerCase().includes('show')
    ) {
      return this.extractListResult(execution);
    }

    // Generic result extraction - look for meaningful outputs
    return this.extractGenericResult(execution);
  }

  /**
   * Extracts count results from execution steps
   */
  private extractCountResult(execution: AgenticExecution): string | null {
    // Look for numeric outputs that represent counts
    for (const result of execution.executionResults) {
      if (result.success && result.output) {
        const output = result.output.toString().trim();

        // Look for a simple number (likely a count)
        const numberMatch = output.match(/^\s*(\d+)\s*$/);
        if (numberMatch) {
          const count = parseInt(numberMatch[1]);
          if (execution.goal.toLowerCase().includes('file')) {
            return `${count} files`;
          } else if (execution.goal.toLowerCase().includes('director')) {
            return `${count} directories`;
          } else {
            return `${count} items`;
          }
        }

        // Look for more complex count outputs
        const countMatch = output.match(
          /(\d+)\s*(files?|directories?|items?)/i
        );
        if (countMatch) {
          return `${countMatch[1]} ${countMatch[2].toLowerCase()}`;
        }
      }
    }
    return null;
  }

  /**
   * Extracts list results from execution steps
   */
  private extractListResult(execution: AgenticExecution): string | null {
    // For list commands, show a summary of what was found
    for (const result of execution.executionResults) {
      if (result.success && result.output) {
        const output = result.output.toString().trim();
        const lines = output.split('\n').filter((line) => line.trim());

        if (lines.length > 0) {
          if (lines.length <= 3) {
            return lines.join(', ');
          } else {
            return `${lines.length} items found (${lines
              .slice(0, 2)
              .join(', ')}, ...)`;
          }
        }
      }
    }
    return null;
  }

  /**
   * Extracts version information from execution steps
   */
  private extractVersionResult(execution: AgenticExecution): string | null {
    for (const result of execution.executionResults) {
      if (result.success && result.output) {
        const output = result.output.toString().trim();

        // Look for version patterns
        const versionMatch = output.match(/v?\d+\.\d+(\.\d+)?/);
        if (versionMatch) {
          return versionMatch[0];
        }

        // Return first meaningful line if it looks like version info
        const firstLine = output.split('\n')[0].trim();
        if (firstLine && firstLine.length < 50) {
          return firstLine;
        }
      }
    }
    return null;
  }

  /**
   * Generic result extraction for other types of tasks
   */
  private extractGenericResult(execution: AgenticExecution): string | null {
    // Look for the last successful step with meaningful output
    const successfulResults = execution.executionResults
      .filter((r) => r.success && r.output)
      .reverse(); // Start from the end

    for (const result of successfulResults) {
      const output = result.output.toString().trim();

      // Skip validation steps
      if (output.includes('Validating')) {
        continue;
      }

      // Look for concise, meaningful output
      const lines = output.split('\n').filter((line) => line.trim());
      const meaningfulLines = lines.filter(
        (line) =>
          !line.includes('echo') &&
          !line.includes('exit') &&
          line.length > 0 &&
          line.length < 200
      );

      if (meaningfulLines.length > 0) {
        // Return the first meaningful line or a summary
        if (meaningfulLines.length === 1) {
          return meaningfulLines[0];
        } else if (meaningfulLines.length <= 3) {
          return meaningfulLines.join(' | ');
        } else {
          return `${meaningfulLines[0]} (and ${
            meaningfulLines.length - 1
          } more results)`;
        }
      }
    }

    return null;
  }

  /**
   * Identifies if a step output contains a key result that should be highlighted
   */
  private identifyKeyResult(output: string): string | null {
    const trimmed = output.trim();

    // Look for simple numeric results (likely counts)
    const simpleNumberMatch = trimmed.match(/^\s*(\d+)\s*$/);
    if (simpleNumberMatch) {
      return simpleNumberMatch[1];
    }

    // Look for version numbers
    const versionMatch = trimmed.match(/^(v?\d+\.\d+(?:\.\d+)?)\s*$/);
    if (versionMatch) {
      return versionMatch[1];
    }

    // Look for short, meaningful single lines (likely results)
    const lines = trimmed.split('\n').filter((line) => line.trim());
    if (
      lines.length === 1 &&
      lines[0].length < 100 &&
      !lines[0].includes('Validating')
    ) {
      return lines[0];
    }

    // Look for "Valid count" or similar confirmation messages
    if (trimmed.includes('Valid count') || trimmed.includes('confirmed')) {
      return trimmed;
    }

    return null;
  }
}
