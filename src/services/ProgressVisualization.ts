import cliProgress from 'cli-progress';
// @ts-ignore - chalk may not have types available
const { Chalk } = require('chalk');
// Instantiate Chalk for color methods in CommonJS context
const chalk = new Chalk({ level: 3 });

/**
 * ProgressVisualization class
 * 
 * TODO: Add class description
 */
export class ProgressVisualization {
  /**
   * Handles showAIProcessing operation
   * 
   * @param steps - Parameter description
   */
  showAIProcessing(steps: string[]): void {
    console.log(chalk.blue('🤖 AI Processing...'));

    const multiBar = new cliProgress.MultiBar(
      {
        clearOnComplete: false,
        hideCursor: true,
        format: ` {bar} | ${chalk.cyan('{task}')} | {value}/{total}`,
      },
      cliProgress.Presets.shades_classic
    );

    const progressData = steps.map((step) => ({
      task: step,
      value: 0,
      bar: multiBar.create(100, 0, { task: step }),
    }));

    const timer = setInterval(() => {
      progressData.forEach((data) => {
        if (data.value < 100) {
          data.value += Math.random() * 10;
          if (data.value > 100) {
            data.value = 100;
          }
          data.bar.update(data.value);
        }

        if (data.value >= 100) {
          data.bar.update(100, { task: `${data.task} ${chalk.green('✓')}` });
        }
      });

      if (progressData.every((data) => data.value >= 100)) {
        clearInterval(timer);
        multiBar.stop();
      }
    }, 100);
  }
}
