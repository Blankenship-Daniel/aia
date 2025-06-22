import terminalKit from 'terminal-kit';
import gradient from 'gradient-string';
import chalk from 'chalk';

export class AnimationService {
  private term = terminalKit.terminal;

  private async sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private async typeText(text: string, delay: number): Promise<void> {
    for (const char of text) {
      this.term(char);
      await this.sleep(delay);
    }
  }

  async showAIWelcome(): Promise<void> {
    this.term.clear();

    const aiLogo = [
      '    ╔═══╗    ',
      '   ╔╝ ▲ ╚╗   ',
      '  ╔╝ ╔═╗ ╚╗  ',
      ' ╔╝  ║ ║  ╚╗ ',
      '╔╝   ╚═╝   ╚╗',
      '╚═══════════╝',
    ];

    for (let i = 0; i < aiLogo.length; i++) {
      this.term.moveTo(1, i + 5);
      await this.typeText(gradient.passion(aiLogo[i]), 10);
    }

    await this.pulseText('AI Assistant Ready', 10, 12);
    await this.sleep(1000);
    this.term.clear();
  }

  private async pulseText(text: string, x: number, y: number): Promise<void> {
    for (let i = 0; i < 3; i++) {
      this.term.moveTo(x, y);
      this.term(gradient.fruit(text));
      await this.sleep(300);
      this.term.moveTo(x, y);
      this.term(' '.repeat(text.length)); // Clear previous text
      this.term.moveTo(x, y);
      this.term(chalk.dim(text));
      await this.sleep(300);
    }
    this.term.moveTo(x, y);
    this.term(' '.repeat(text.length));
    this.term.moveTo(x, y, text);
  }
}
