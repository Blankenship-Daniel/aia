import { Listr, ListrTask } from 'listr2';
import { Observable } from 'rxjs';
// @ts-ignore - chalk may not have types available
const { Chalk } = require('chalk');
// Instantiate Chalk for color methods in CommonJS context
const chalk = new Chalk({ level: 3 });

// A placeholder for the real execution step type
interface ExecutionStep {
  description: string;
  execute: () => Promise<{ success: boolean; error?: string; output?: string }>;
}

/**
 * TaskListPresenter class
 * 
 * TODO: Add class description
 */
export class TaskListPresenter {
  /**
   * Executes withtasklist
   * 
   * @param steps - Parameter description
   * 
   * @returns Promise<void> - Return value description
   */
  async executeWithTaskList(steps: ExecutionStep[]): Promise<void> {
    const tasks: ListrTask[] = steps.map((step) => ({
      title: step.description,
      task: (ctx, task): Observable<any> => this.createStepTask(step, task),
    }));

    const listr = new Listr(tasks, {
      concurrent: false,
      rendererOptions: {
        showSubtasks: true,
        collapse: false,
        collapseSkips: false,
        showTimer: true,
        clearOutput: false,
        formatOutput: 'wrap',
        showErrorMessage: true,
      },
    });

    try {
      await listr.run();
    } catch (e) {
      console.error(chalk.red('A task failed.'));
    }
  }

  /**
   * Creates steptask
   * 
   * @param step - Parameter description
   * @param task - Parameter description
   * 
   * @returns Observable<any> - Return value description
   */
  private createStepTask(step: ExecutionStep, task: any): Observable<any> {
    return new Observable((subscriber) => {
      task.title = `${step.description} ${chalk.gray('(Starting...)')}`;

      step
        .execute()
        .then((result) => {
          if (result.success) {
            task.title = `${step.description} ${chalk.green('✓')}`;
            if (result.output) {
              task.output = result.output;
            }
            subscriber.complete();
          } else {
            throw new Error(result.error || 'Unknown error');
          }
        })
        .catch((error) => {
          subscriber.error(error);
        });
    });
  }
}
