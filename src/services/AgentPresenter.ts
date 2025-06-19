/**
 * Agent Presenter Implementation
 * Handles all user interface and presentation concerns for agent operations
 */
import { IAgentPresenter } from '../interfaces/IAgentPresenter';
import { ExecutionStep, AgenticExecution, CommandResult } from '../types/index';
import chalk from 'chalk';
import ora, { Ora } from 'ora';
import inquirer from 'inquirer';

export class AgentPresenter implements IAgentPresenter {
  private activeSpinner: Ora | null = null;

  showPlanningPhase(goal: string): void {
    console.log(chalk.cyan(`🎯 Goal: ${goal}`));
    console.log(chalk.blue('📋 Analyzing goal and creating execution plan...'));
  }

  displayExecutionPlan(plan: ExecutionStep[]): void {
    console.log(chalk.blue('\n📋 Execution Plan:'));
    plan.forEach((step, index) => {
      console.log(chalk.dim(`${index + 1}. ${step.description}`));
      if (step.command) {
        console.log(chalk.gray(`   Command: ${step.command}`));
      }
      console.log(chalk.gray(`   Expected: ${step.expectedOutcome}`));
      if (step.risks && step.risks.length > 0) {
        console.log(chalk.yellow(`   Risks: ${step.risks.join(', ')}`));
      }
    });
    console.log();
  }

  showExecutionStep(step: ExecutionStep): {
    succeed: (message?: string) => void;
    fail: (message?: string) => void;
    stop: () => void;
  } {
    this.activeSpinner = ora(`Executing: ${step.description}`).start();

    return {
      succeed: (message?: string) => {
        if (this.activeSpinner) {
          this.activeSpinner.succeed(
            chalk.green(`✓ ${message || step.description}`)
          );
          this.activeSpinner = null;
        }
      },
      fail: (message?: string) => {
        if (this.activeSpinner) {
          this.activeSpinner.fail(
            chalk.red(`✗ ${message || step.description}`)
          );
          this.activeSpinner = null;
        }
      },
      stop: () => {
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
