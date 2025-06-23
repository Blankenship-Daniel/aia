import terminalKit from 'terminal-kit';
import gradient from 'gradient-string';
// @ts-ignore - chalk may not have types available
const { Chalk } = require('chalk');
// Instantiate Chalk for color methods in CommonJS context
const chalk = new Chalk({ level: 3 });

/**
 * AnimationService class
 * 
 * TODO: Add class description
 */
export class AnimationService {
  private term = terminalKit.terminal;

  /**
   * Handles sleep operation
   * 
   * @param ms - Parameter description
   * 
   * @returns Promise<void> - Return value description
   */
  private async sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Handles typeText operation
   * 
   * @param text - Parameter description
   * @param delay - Parameter description
   * 
   * @returns Promise<void> - Return value description
   */
  private async typeText(text: string, delay: number): Promise<void> {
    for (const char of text) {
      this.term(char);
      await this.sleep(delay);
    }
  }

  /**
   * Handles showAIWelcome operation
   * 
   * @returns Promise<void> - Return value description
   */
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

  /**
   * Handles pulseText operation
   * 
   * @param text - Parameter description
   * @param x - Parameter description
   * @param y - Parameter description
   * 
   * @returns Promise<void> - Return value description
   */
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
