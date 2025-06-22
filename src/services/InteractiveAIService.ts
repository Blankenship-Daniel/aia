import prompts from 'prompts';
import logUpdate from 'log-update';
import cliSpinners from 'cli-spinners';
import chalk from 'chalk';
import gradient from 'gradient-string';
import boxen from 'boxen';

// Dummy AI service for demonstration
const aiService = {
  async process(prompt: string): Promise<string> {
    await new Promise((resolve) => setTimeout(resolve, 2000));
    return `This is a simulated AI response to your prompt: "${prompt}". It demonstrates the typewriter effect.`;
  },
};

export class InteractiveAIService {
  async getAIResponse(prompt: string): Promise<void> {
    const spinner = cliSpinners.dots12;
    let i = 0;

    const interval = setInterval(() => {
      const frame = spinner.frames[i++ % spinner.frames.length];
      logUpdate(
        `${chalk.cyan(frame)} ${gradient.cristal('AI is thinking...')}\n` +
          `${chalk.gray('Processing: ')}${prompt.slice(0, 50)}...`
      );
    }, spinner.interval);

    const response = await aiService.process(prompt);

    clearInterval(interval);
    logUpdate.clear();

    await this.typewriterEffect(response);
  }

  private async typewriterEffect(text: string, delay = 20): Promise<void> {
    const words = text.split(' ');
    let output = '';

    for (const word of words) {
      output += word + ' ';
      logUpdate(
        boxen(output, {
          padding: 1,
          borderStyle: 'round',
          borderColor: 'cyan',
          dimBorder: true,
        })
      );
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
    logUpdate.done();
  }
}
