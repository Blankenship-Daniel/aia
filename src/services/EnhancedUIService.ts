/**
 * Enhanced UI Service for better terminal presentation
 * Uses available packages: boxen, chalk, gradient-string, cli-table3, figures
 * Integrates with CodeHighlightService for syntax highlighting
 */
import boxen from 'boxen';
import chalk from 'chalk';
import gradient from 'gradient-string';
import Table from 'cli-table3';
import figures from 'figures';
import terminalSize from 'terminal-size';
import { ICodeHighlightService } from '../interfaces/ICodeHighlightService';

export class EnhancedUIService {
  private readonly terminalWidth: number;
  private codeHighlightService?: ICodeHighlightService;

  private gradients = {
    success: gradient(['#00ff00', '#00cc00']),
    error: gradient(['#ff0000', '#cc0000']),
    info: gradient(['#00aaff', '#0088cc']),
    ai: gradient(['#ff00ff', '#00ffff']), // AI-themed gradient
  };

  constructor(codeHighlightService?: ICodeHighlightService) {
    const size = terminalSize();
    this.terminalWidth = Math.min(size.columns || 80, 120);
    this.codeHighlightService = codeHighlightService;
  }

  /**
   * Create an enhanced header with gradient and border
   */
  createHeader(title: string, subtitle?: string): string {
    const gradientTitle = gradient('cyan', 'blue')(title);
    const content = subtitle
      ? `${gradientTitle}\n${chalk.gray(subtitle)}`
      : gradientTitle;

    return boxen(content, {
      padding: { top: 1, bottom: 1, left: 2, right: 2 },
      margin: { top: 1, bottom: 1 },
      borderStyle: 'double',
      borderColor: 'cyan',
      width: Math.min(this.terminalWidth - 4, 80),
      textAlignment: 'center',
    });
  }

  /**
   * Create a planning phase box
   */
  createPlanningBox(goal: string, stepCount: number): string {
    const content =
      `${figures.star} ${chalk.bold('AI-Powered Planning')}\n\n` +
      `${chalk.cyan('Goal:')} ${goal}\n` +
      `${chalk.cyan('Steps:')} ${stepCount} planned actions\n` +
      `${chalk.cyan('Strategy:')} AI-first approach`;

    return boxen(content, {
      padding: 1,
      margin: { top: 1, bottom: 1 },
      borderStyle: 'round',
      borderColor: 'blue',
      title: '🎯 Planning Phase',
      titleAlignment: 'center',
    });
  }

  /**
   * Create an execution plan table
   */
  createExecutionPlanTable(
    steps: Array<{ id: string; description: string; type?: string }>
  ): string {
    const table = new Table({
      head: [chalk.cyan('Step'), chalk.cyan('Action'), chalk.cyan('Type')],
      style: {
        head: [],
        border: ['cyan'],
      },
      colWidths: [6, Math.floor(this.terminalWidth * 0.6), 15],
      wordWrap: true,
    });

    steps.forEach((step, index) => {
      table.push([
        chalk.white(`${index + 1}`),
        step.description,
        step.type || 'action',
      ]);
    });

    return table.toString();
  }

  /**
   * Create a progress section with better visual hierarchy
   */
  createProgressSection(
    title: string,
    items: Array<{ text: string; status: 'success' | 'pending' | 'error' }>
  ): string {
    const statusIcons = {
      success: chalk.green(figures.tick),
      pending: chalk.yellow(figures.ellipsis),
      error: chalk.red(figures.cross),
    };

    const content = items
      .map((item) => `${statusIcons[item.status]} ${item.text}`)
      .join('\n');

    return boxen(content, {
      padding: 1,
      margin: { top: 1, bottom: 1 },
      borderStyle: 'single',
      borderColor: 'gray',
      title: title,
      titleAlignment: 'left',
    });
  }

  /**
   * Create a recommendations panel
   */
  createRecommendationsPanel(
    recommendations: Array<{ title: string; items: string[] }>
  ): string {
    let content = '';

    recommendations.forEach((section, index) => {
      if (index > 0) content += '\n';
      content += `${chalk.bold.cyan(`${index + 1}. ${section.title}`)}\n`;
      section.items.forEach((item) => {
        content += `   ${chalk.gray('•')} ${item}\n`;
      });
    });

    return boxen(content, {
      padding: 1,
      margin: { top: 1, bottom: 1 },
      borderStyle: 'round',
      borderColor: 'green',
      title: '💡 Recommendations',
      titleAlignment: 'center',
      width: this.terminalWidth - 4,
    });
  }

  /**
   * Create a summary box with metrics
   */
  createSummaryBox(
    goal: string,
    metrics: {
      status: string;
      iterations: number;
      steps: number;
      successRate: number;
    }
  ): string {
    const statusColor = metrics.status === 'completed' ? 'green' : 'yellow';
    const statusIcon =
      metrics.status === 'completed' ? figures.tick : figures.warning;

    const content =
      `${chalk[statusColor](statusIcon)} ${chalk.bold(
        metrics.status.toUpperCase()
      )}\n\n` +
      `${chalk.cyan('Goal:')} ${goal}\n` +
      `${chalk.cyan('Iterations:')} ${metrics.iterations}\n` +
      `${chalk.cyan('Steps:')} ${metrics.steps}\n` +
      `${chalk.cyan('Success Rate:')} ${metrics.successRate}%`;

    return boxen(content, {
      padding: 1,
      margin: { top: 1, bottom: 1 },
      borderStyle: 'double',
      borderColor: statusColor,
      title: '📊 Execution Summary',
      titleAlignment: 'center',
    });
  }

  /**
   * Create an interactive prompt with enhanced styling
   */
  createStyledPrompt(
    message: string,
    type: 'confirm' | 'input' = 'confirm'
  ): string {
    const icon =
      type === 'confirm' ? figures.questionMarkPrefix : figures.pointerSmall;
    return `${chalk.yellow(icon)} ${chalk.bold(message)}`;
  }

  /**
   * Create a warning or error box
   */
  createAlertBox(
    message: string,
    type: 'warning' | 'error' | 'info' = 'warning'
  ): string {
    const colors = {
      warning: 'yellow',
      error: 'red',
      info: 'blue',
    };

    const icons = {
      warning: figures.warning,
      error: figures.cross,
      info: figures.info,
    };

    const content = `${(chalk as any)[colors[type]](icons[type])} ${message}`;

    return boxen(content, {
      padding: 1,
      margin: { top: 1, bottom: 1 },
      borderStyle: 'single',
      borderColor: colors[type],
      width: Math.min(this.terminalWidth - 4, 80),
    });
  }

  /**
   * Create a code block with syntax highlighting using CodeHighlightService
   */
  createCodeBlock(code: string, language: string = 'typescript'): string {
    try {
      let highlightedCode: string;

      if (this.codeHighlightService) {
        // Use the existing CodeHighlightService for proper highlighting
        highlightedCode = this.codeHighlightService.highlightCode(
          code,
          language
        );
      } else {
        // Fallback: just return the code with basic formatting
        highlightedCode = code;
      }

      return boxen(highlightedCode, {
        padding: 1,
        margin: { top: 1, bottom: 1 },
        borderStyle: 'single',
        borderColor: 'gray',
        title: `💻 ${language}`,
        titleAlignment: 'left',
      });
    } catch (error) {
      // Fallback if highlighting fails
      return boxen(code, {
        padding: 1,
        margin: { top: 1, bottom: 1 },
        borderStyle: 'single',
        borderColor: 'gray',
        title: '💻 Code',
        titleAlignment: 'left',
      });
    }
  }

  /**
   * Create a file tree visualization
   */
  createFileTree(
    files: Array<{ path: string; type: 'file' | 'directory' }>
  ): string {
    const content = files
      .map((file) => {
        const icon = file.type === 'directory' ? figures.square : figures.dot;
        return `${chalk.gray(icon)} ${file.path}`;
      })
      .join('\n');

    return boxen(content, {
      padding: 1,
      margin: { top: 1, bottom: 1 },
      borderStyle: 'single',
      borderColor: 'cyan',
      title: '📁 File Structure',
      titleAlignment: 'left',
    });
  }

  /**
   * Create loading spinner with message
   */
  createLoadingSpinner(message: string): {
    start: () => void;
    updateText: (newMessage: string) => void;
    succeed: (finalMessage?: string) => void;
    fail: (errorMessage?: string) => void;
    stop: () => void;
  } {
    const ora = require('ora');
    const spinner = ora({
      text: chalk.cyan(message),
      color: 'cyan',
      spinner: 'dots2',
    });

    return {
      start: () => spinner.start(),
      updateText: (newMessage: string) => {
        spinner.text = chalk.cyan(newMessage);
      },
      succeed: (finalMessage?: string) => {
        spinner.succeed(chalk.green(finalMessage || message));
      },
      fail: (errorMessage?: string) => {
        spinner.fail(chalk.red(errorMessage || `Failed: ${message}`));
      },
      stop: () => spinner.stop(),
    };
  }

  /**
   * Create a progress indicator for phases
   */
  createPhaseProgress(
    phases: Array<{
      name: string;
      status: 'pending' | 'active' | 'complete' | 'error';
    }>
  ): string {
    const statusIcons = {
      pending: chalk.gray(figures.circle),
      active: chalk.yellow(figures.play),
      complete: chalk.green(figures.tick),
      error: chalk.red(figures.cross),
    };

    const phaseDisplay = phases
      .map((phase, index) => {
        const icon = statusIcons[phase.status];
        const connector = index < phases.length - 1 ? chalk.gray(' → ') : '';
        return `${icon} ${phase.name}${connector}`;
      })
      .join('');

    return boxen(phaseDisplay, {
      padding: { top: 0, bottom: 0, left: 1, right: 1 },
      borderStyle: 'round',
      borderColor: 'gray',
      title: '📋 Progress',
      titleAlignment: 'left',
    });
  }

  /**
   * Create a loading state for summary preparation
   */
  createSummaryLoadingBox(): string {
    const content =
      `${chalk.yellow(figures.ellipsis)} ${chalk.bold(
        'Preparing Summary'
      )}\n\n` +
      `${chalk.cyan('Analyzing:')} Execution results\n` +
      `${chalk.cyan('Computing:')} Performance metrics\n` +
      `${chalk.cyan('Formatting:')} Final report`;

    return boxen(content, {
      padding: 1,
      margin: { top: 1, bottom: 1 },
      borderStyle: 'round',
      borderColor: 'yellow',
      title: '⏳ Processing',
      titleAlignment: 'center',
    });
  }

  /**
   * Create an inline code snippet with syntax highlighting
   */
  createInlineCode(code: string, language?: string): string {
    if (this.codeHighlightService) {
      return this.codeHighlightService.highlightInline(code, language);
    } else {
      return chalk.gray('`') + code + chalk.gray('`');
    }
  }

  /**
   * Create a formatted error display with code highlighting
   */
  createErrorCodeBlock(
    error: string,
    code?: string,
    language?: string
  ): string {
    let content =
      this.codeHighlightService?.formatError(error) ||
      chalk.red('Error: ') + error;

    if (code && this.codeHighlightService) {
      content +=
        '\n\n' +
        this.codeHighlightService.createThemedSnippet(code, language, 'error');
    }

    return boxen(content, {
      padding: 1,
      margin: { top: 1, bottom: 1 },
      borderStyle: 'single',
      borderColor: 'red',
      title: '❌ Error',
      titleAlignment: 'left',
    });
  }

  /**
   * Create a code diff display
   */
  createCodeDiff(oldCode: string, newCode: string, language?: string): string {
    if (this.codeHighlightService) {
      // Create a simple diff using the highlighting service
      const oldHighlighted = this.codeHighlightService.highlightCode(
        oldCode,
        language
      );
      const newHighlighted = this.codeHighlightService.highlightCode(
        newCode,
        language
      );
      const diffContent = `${chalk.red(
        '- Old:'
      )}\n${oldHighlighted}\n\n${chalk.green('+ New:')}\n${newHighlighted}`;

      return boxen(diffContent, {
        padding: 1,
        margin: { top: 1, bottom: 1 },
        borderStyle: 'single',
        borderColor: 'yellow',
        title: '🔄 Code Changes',
        titleAlignment: 'left',
      });
    } else {
      return boxen(
        `${chalk.red('- Old:')}\n${oldCode}\n\n${chalk.green(
          '+ New:'
        )}\n${newCode}`,
        {
          padding: 1,
          margin: { top: 1, bottom: 1 },
          borderStyle: 'single',
          borderColor: 'yellow',
          title: '🔄 Code Changes',
          titleAlignment: 'left',
        }
      );
    }
  }

  /**
   * Word wrap text to terminal width
   */
  wrapText(text: string, indent: number = 0): string {
    const maxWidth = this.terminalWidth - indent - 4; // Account for borders
    const words = text.split(' ');
    const lines: string[] = [];
    let currentLine = '';

    words.forEach((word) => {
      if ((currentLine + word).length > maxWidth) {
        if (currentLine) lines.push(currentLine.trim());
        currentLine = word + ' ';
      } else {
        currentLine += word + ' ';
      }
    });

    if (currentLine) lines.push(currentLine.trim());

    return lines.map((line) => ' '.repeat(indent) + line).join('\n');
  }

  /**
   * Create a rich AI-themed header.
   */
  createAIHeader(title: string): string {
    const width = this.terminalWidth;
    // Ensure padding is not negative
    const paddingWidth = Math.max(
      0,
      Math.floor((width - title.length - 4) / 2)
    );
    const padding = '═'.repeat(paddingWidth);
    return this.gradients.ai(` ${padding} ${title} ${padding} `);
  }

  /**
   * Create an enhanced step display with a progress bar.
   */
  createStepDisplay(step: number, total: number, description: string): string {
    const progress = `[${step}/${total}]`;
    const progressBar = this.createProgressBar(step / total);
    return `${chalk.cyan(progress)} ${progressBar} ${description}`;
  }

  private createProgressBar(percentage: number, length: number = 20): string {
    const filledLength = Math.round(length * percentage);
    const emptyLength = length - filledLength;
    const filled = '█'.repeat(filledLength);
    const empty = '░'.repeat(emptyLength);
    return `[${this.gradients.success(filled)}${chalk.gray(empty)}]`;
  }

  showEnhancedPlanSummary(plan: {
    goal: string;
    strategy: string;
    steps: { description: string }[];
  }): void {
    const planBox = boxen(
      `${gradient.rainbow('🤖 AI Execution Plan')}\n\n` +
        `${chalk.bold('Goal:')} ${plan.goal}\n` +
        `${chalk.bold('Strategy:')} ${plan.strategy}\n` +
        `${chalk.bold('Steps:')} ${plan.steps.length} planned actions`,
      {
        padding: 1,
        margin: 1,
        borderStyle: 'double',
        borderColor: 'cyan',
        backgroundColor: '#1a1a1a',
      }
    );

    console.log(planBox);

    const table = new Table({
      head: [chalk.cyan('Step'), chalk.cyan('Action'), chalk.cyan('Status')],
      style: {
        head: [],
        border: ['grey'],
        'padding-left': 2,
        'padding-right': 2,
      },
    });

    plan.steps.forEach((step, i) => {
      table.push([chalk.white(i + 1), step.description, chalk.gray('Pending')]);
    });

    console.log(table.toString());
  }
}
