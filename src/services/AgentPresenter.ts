/**
 * Enhanced Agent Presenter Implementation
 * Provides rich, transparent user experience for agent operations
 */
import { IAgentPresenter } from '../interfaces/IAgentPresenter';
import { ExecutionStep, AgenticExecution, CommandResult } from '../types/index';
import chalk from 'chalk';
import ora, { Ora } from 'ora';
import inquirer from 'inquirer';

export class AgentPresenter implements IAgentPresenter {
  private activeSpinner: Ora | null = null;
  private startTime: number = Date.now();
  private stepStartTime: number = Date.now();

  showPlanningPhase(goal: string): void {
    console.log(chalk.blue('🤖 AIA Agent - Intelligent Task Execution'));
    console.log(chalk.gray('━'.repeat(60)));
    console.log(chalk.cyan(`🎯 Goal: ${goal}`));
    console.log(
      chalk.blue(
        '📋 Planning Phase - Analyzing goal and creating execution plan...'
      )
    );
    this.startTime = Date.now();
  }

  displayExecutionPlan(plan: ExecutionStep[]): void {
    const planningTime = Date.now() - this.startTime;
    console.log(chalk.green(`✓ Planning completed in ${planningTime}ms`));
    console.log(chalk.blue('\n📋 Execution Plan:'));
    console.log(chalk.gray('━'.repeat(60)));

    plan.forEach((step, index) => {
      const stepNumber = chalk.cyan(`[${index + 1}/${plan.length}]`);
      console.log(`${stepNumber} ${chalk.bold(step.description)}`);

      if (step.command) {
        console.log(
          `   ${chalk.gray('Command:')} ${chalk.yellow(step.command)}`
        );
      }

      console.log(`   ${chalk.gray('Expected:')} ${step.expectedOutcome}`);

      if (step.risks && step.risks.length > 0) {
        console.log(`   ${chalk.red('⚠️  Risks:')} ${step.risks.join(', ')}`);
      }

      if (step.timeout) {
        console.log(`   ${chalk.gray('Timeout:')} ${step.timeout}ms`);
      }

      console.log(); // Add spacing between steps
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

    // Enhanced initial display with command details
    console.log(
      `\n${chalk.blue('🔄')} Executing Step: ${chalk.bold(step.description)}`
    );
    console.log(`${chalk.gray('   Command:')} ${chalk.yellow(step.command)}`);
    console.log(`${chalk.gray('   Expected:')} ${step.expectedOutcome}`);
    console.log(
      `${chalk.gray('   Timeout:')} ${(step.timeout || 30000) / 1000}s`
    );

    const spinnerText = `${chalk.blue('⚡')} Running command...`;
    this.activeSpinner = ora(spinnerText).start();

    // Update spinner text periodically with elapsed time
    const progressInterval = setInterval(() => {
      if (this.activeSpinner) {
        const elapsed = Math.floor((Date.now() - this.stepStartTime) / 1000);
        this.activeSpinner.text = `${chalk.blue(
          '⚡'
        )} Running command... ${chalk.gray(`${elapsed}s elapsed`)}`;
      }
    }, 1000);

    return {
      updateProgress: (elapsed: number, details?: string) => {
        if (this.activeSpinner) {
          const elapsedSec = Math.floor(elapsed / 1000);
          const progressText = details
            ? `${chalk.blue('⚡')} ${details} ${chalk.gray(`${elapsedSec}s`)}`
            : `${chalk.blue('⚡')} Running command... ${chalk.gray(
                `${elapsedSec}s elapsed`
              )}`;
          this.activeSpinner.text = progressText;
        }
      },
      succeed: (message?: string) => {
        clearInterval(progressInterval);
        if (this.activeSpinner) {
          const duration = Date.now() - this.stepStartTime;
          const successMessage = message || step.description;
          this.activeSpinner.succeed(
            `${chalk.green('✓')} ${successMessage} ${chalk.gray(
              `(${Math.floor(duration / 1000)}s)`
            )}`
          );
          this.activeSpinner = null;
        }
      },
      fail: (message?: string) => {
        clearInterval(progressInterval);
        if (this.activeSpinner) {
          const duration = Date.now() - this.stepStartTime;
          const errorMessage = message || `${step.description} failed`;
          this.activeSpinner.fail(
            `${chalk.red('✗')} ${errorMessage} ${chalk.gray(
              `(${Math.floor(duration / 1000)}s)`
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
      lines.forEach((line: string) => {
        console.log(chalk.dim(`  ${line}`));
      });
      console.log(); // Add spacing
    }
  }

  displayExecutionSummary(execution: AgenticExecution): void {
    console.log(chalk.blue('\n📊 Execution Summary:'));
    console.log(chalk.dim(`Goal: ${execution.goal}`));
    console.log(chalk.dim(`Status: ${execution.status}`));
    console.log(chalk.dim(`Iterations: ${execution.iterations}`));
    console.log(chalk.dim(`Steps: ${execution.plan.length}`));

    const successfulSteps = execution.executionResults.filter(
      (r) => r.success
    ).length;
    const successRate =
      execution.plan.length > 0
        ? ((successfulSteps / execution.plan.length) * 100).toFixed(1)
        : '0';

    if (execution.success) {
      console.log(chalk.green(`✅ Success Rate: ${successRate}%`));
    } else {
      console.log(chalk.red(`❌ Success Rate: ${successRate}%`));
    }

    if (execution.learnings.length > 0) {
      console.log(chalk.blue('\n📚 Learnings:'));
      execution.learnings.forEach((learning, index) => {
        console.log(chalk.dim(`${index + 1}. ${learning}`));
      });
    }
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
}
