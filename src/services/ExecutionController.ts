/**
 * Interactive Execution Controller
 * Provides user control over agent execution flow
 */
import { IExecutionController } from '../interfaces/IExecutionController';
// @ts-ignore - chalk may not have types available
const { Chalk } = require('chalk');
// Instantiate Chalk for color methods in CommonJS context
const chalk = new Chalk({ level: 3 });
import inquirer from 'inquirer';

/**
 * ExecutionController class
 * 
 * TODO: Add class description
 */
export class ExecutionController implements IExecutionController {
  private paused = false;
  private stopped = false;
  private stepMode = false;
  private pauseReason?: string;
  private stopReason?: string;

  private pausePromise?: Promise<void>;
  private pauseResolve?: () => void;

  /**
   * Handles pause operation
   * 
   * @param reason? - Parameter description
   * 
   * @returns Promise<void> - Return value description
   */
  async pause(reason?: string): Promise<void> {
    if (this.paused) return;

    this.paused = true;
    this.pauseReason = reason;

    console.log(
      chalk.yellow(`\n⏸️  Execution paused${reason ? `: ${reason}` : ''}`)
    );
    console.log(chalk.gray('Commands: (r)esume, (s)top, (d)ebug, (h)elp'));

    // Create a promise that resolves when resume is called
    this.pausePromise = new Promise<void>((resolve) => {
      this.pauseResolve = resolve;
    });

    // Show interactive prompt
    await this.showPauseMenu();

    return this.pausePromise;
  }

  /**
   * Handles resume operation
   */
  resume(): void {
    if (!this.paused) return;

    this.paused = false;
    this.pauseReason = undefined;

    console.log(chalk.green('▶️  Execution resumed'));

    if (this.pauseResolve) {
      this.pauseResolve();
      this.pauseResolve = undefined;
      this.pausePromise = undefined;
    }
  }

  /**
   * Handles stop operation
   * 
   * @param reason? - Parameter description
   */
  stop(reason?: string): void {
    this.stopped = true;
    this.stopReason = reason;

    console.log(
      chalk.red(`\n⏹️  Execution stopped${reason ? `: ${reason}` : ''}`)
    );

    // If paused, also resume to unblock the pause promise
    if (this.paused) {
      this.resume();
    }
  }

  /**
   * Handles enableStepMode operation
   */
  enableStepMode(): void {
    this.stepMode = true;
    console.log(chalk.blue('🔍 Step-by-step mode enabled'));
  }

  /**
   * Handles disableStepMode operation
   */
  disableStepMode(): void {
    this.stepMode = false;
    console.log(chalk.blue('🏃 Step-by-step mode disabled'));
  }

  /**
   * Handles isPaused operation
   * 
   * @returns boolean - Return value description
   */
  isPaused(): boolean {
    return this.paused;
  }

  /**
   * Handles shouldStop operation
   * 
   * @returns boolean - Return value description
   */
  shouldStop(): boolean {
    return this.stopped;
  }

  /**
   * Handles isStepMode operation
   * 
   * @returns boolean - Return value description
   */
  isStepMode(): boolean {
    return this.stepMode;
  }

  /**
   * Gets state
   */
  getState() {
    return {
      paused: this.paused,
      stopped: this.stopped,
      stepMode: this.stepMode,
      reason: this.pauseReason || this.stopReason,
    };
  }

  /**
   * Ask for confirmation before executing the next step
   */
  async confirmNextStep(stepDescription: string): Promise<boolean> {
    if (!this.stepMode) return true;

    const { action } = await inquirer.prompt([
      {
        type: 'list',
        name: 'action',
        message: `Next step: ${stepDescription}`,
        choices: [
          { name: 'Execute this step', value: 'execute' },
          { name: 'Skip this step', value: 'skip' },
          { name: 'Stop execution', value: 'stop' },
          { name: 'Disable step mode', value: 'disable' },
        ],
      },
    ]);

    switch (action) {
      case 'execute':
        return true;
      case 'skip':
        console.log(chalk.yellow('⏭️  Step skipped'));
        return false;
      case 'stop':
        this.stop('User requested stop in step mode');
        return false;
      case 'disable':
        this.disableStepMode();
        return true;
      default:
        return true;
    }
  }

  /**
   * Handles showPauseMenu operation
   * 
   * @returns Promise<void> - Return value description
   */
  private async showPauseMenu(): Promise<void> {
    while (this.paused && !this.stopped) {
      const { action } = await inquirer.prompt([
        {
          type: 'list',
          name: 'action',
          message: 'Execution is paused. What would you like to do?',
          choices: [
            { name: 'Resume execution', value: 'resume' },
            { name: 'Stop execution', value: 'stop' },
            { name: 'Enable step-by-step mode', value: 'step' },
            { name: 'Show current state', value: 'debug' },
            { name: 'Show help', value: 'help' },
          ],
        },
      ]);

      switch (action) {
        case 'resume':
          this.resume();
          break;
        case 'stop':
          this.stop('User requested stop');
          break;
        case 'step':
          this.enableStepMode();
          this.resume();
          break;
        case 'debug':
          this.showDebugInfo();
          break;
        case 'help':
          this.showHelp();
          break;
      }
    }
  }

  /**
   * Handles showDebugInfo operation
   */
  private showDebugInfo(): void {
    console.log(chalk.blue('\n🔍 Debug Information:'));
    console.log(`State: ${chalk.cyan(this.paused ? 'Paused' : 'Running')}`);
    console.log(
      `Step Mode: ${chalk.cyan(this.stepMode ? 'Enabled' : 'Disabled')}`
    );
    console.log(
      `Memory Usage: ${chalk.cyan(Math.round(process.memoryUsage().heapUsed / 1024 / 1024))}MB`
    );
    console.log(`Uptime: ${chalk.cyan(process.uptime().toFixed(1))}s`);
    if (this.pauseReason) {
      console.log(`Pause Reason: ${chalk.yellow(this.pauseReason)}`);
    }
  }

  /**
   * Handles showHelp operation
   */
  private showHelp(): void {
    console.log(chalk.blue('\n📋 Interactive Execution Help:'));
    console.log('  Resume   - Continue execution from where it was paused');
    console.log('  Stop     - Terminate execution completely');
    console.log('  Step     - Enable step-by-step confirmation mode');
    console.log('  Debug    - Show current execution state and system info');
    console.log('  Help     - Show this help message');
    console.log();
    console.log(chalk.gray('Keyboard shortcuts during execution:'));
    console.log(chalk.gray('  Ctrl+C   - Pause execution (if supported)'));
    console.log(chalk.gray('  Ctrl+Z   - Suspend process (system level)'));
  }
}
