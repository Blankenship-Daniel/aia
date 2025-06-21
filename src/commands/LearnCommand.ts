/**
 * LearnCommand.ts - Interactive learning mode combining Copilot and AI insights.
 *
 * Responsibilities:
 * - Provides interactive learning sessions combining GitHub Copilot with AI analysis.
 * - Offers topic-based learning with context-aware suggestions.
 * - Integrates best practices and tips from multiple AI sources.
 * - Supports automatic topic detection based on project context.
 *
 * Architecture:
 * - Implements ICommand interface following AIA's command patterns.
 * - Uses dependency injection for Copilot, AI, and context services.
 * - Provides structured learning content with examples and explanations.
 * - Integrates with existing AIA memory system for learning tracking.
 *
 * @see ICopilotService - Service for GitHub Copilot CLI integration.
 * @see IAIService - Service for AI-powered insights and analysis.
 * @see IContextService - Service for environment and project context.
 * @see ICommand - Base command interface.
 */

import { ICommand, CommandDefinition } from '../interfaces/ICommand';
import { ICopilotService } from '../interfaces/ICopilotService';
import { IAIService } from '../interfaces/IAIService';
import { IContextService } from '../interfaces/IContextService';
import { CommandResult, CommandOptions } from '../types/index';
import chalk from 'chalk';
import ora from 'ora';
import inquirer from 'inquirer';
import Table from 'cli-table3';
import boxen from 'boxen';
import * as cliProgress from 'cli-progress';
import { UXEnhancements } from '../utils/UXEnhancements';

export class LearnCommand implements ICommand {
  constructor(
    private copilotService: ICopilotService,
    private aiService: IAIService,
    private contextService: IContextService
  ) {}

  /**
   * Executes the learn command with integrated AI and Copilot insights.
   */
  async execute(
    context: Record<string, unknown>,
    args: string[],
    options: CommandOptions
  ): Promise<CommandResult> {
    try {
      let topic = args[0];

      // Auto-detect topic if not provided
      if (!topic) {
        console.log(
          boxen(chalk.blue.bold('🔍 Topic Detection'), {
            padding: 1,
            margin: 1,
            borderStyle: 'round',
            borderColor: 'blue',
          })
        );

        const spinner = ora(
          'Analyzing project context for learning opportunities...'
        ).start();
        topic = await this.detectTopic();
        spinner.succeed(`Detected topic: ${chalk.cyan(topic)}`);
      } else {
        console.log(
          boxen(chalk.green.bold(`📚 Learning Session: ${chalk.cyan(topic)}`), {
            padding: 1,
            margin: 1,
            borderStyle: 'round',
            borderColor: 'green',
          })
        );
      }

      // Get context-aware suggestions from Copilot with better UX
      const spinner = ora({
        text: 'Gathering learning materials...',
        spinner: 'dots',
      }).start();

      try {
        const projectContext = await this.contextService.gatherContext();
        const copilotContext = this.convertToCommandContext(projectContext);

        // Use shorter timeout and better error handling
        const suggestions = await Promise.race([
          this.copilotService.suggest(
            `comprehensive ${topic} learning materials and commands for this project`,
            copilotContext,
            {
              maxSuggestions: (options.depth as number) || 5,
              useAIFallback: true,
            }
          ),
          this.createTimeoutPromise(
            8000,
            'Learning materials collection took too long, using fallback content'
          ),
        ]);

        // If suggestions failed or timed out, provide fallback content
        const validSuggestions =
          Array.isArray(suggestions) && suggestions.length > 0
            ? suggestions
            : this.getFallbackSuggestions(topic);

        spinner.succeed(
          `Learning materials ready (${validSuggestions.length} topics)`
        );

        // Display learning overview with gradient header
        console.log(
          UXEnhancements.createBrandedHeader(
            `Learning Plan for ${topic}`,
            'primary'
          )
        );

        const overviewTable = new Table({
          head: [
            chalk.cyan.bold('Section'),
            chalk.cyan.bold('Topics'),
            chalk.cyan.bold('Difficulty'),
          ],
          style: {
            head: [],
            border: ['blue'],
            'padding-left': 1,
            'padding-right': 1,
          },
          colWidths: [15, 35, 12],
        });

        validSuggestions.forEach((suggestion: any, index: number) => {
          const difficulty =
            index < 2 ? 'Beginner' : index < 4 ? 'Intermediate' : 'Advanced';
          const diffColor =
            difficulty === 'Beginner'
              ? chalk.green
              : difficulty === 'Intermediate'
              ? chalk.yellow
              : chalk.red;
          overviewTable.push([
            chalk.cyan(`Part ${index + 1}`),
            chalk.white(
              suggestion.description?.substring(0, 35) ||
                suggestion.command.substring(0, 35)
            ),
            diffColor(difficulty),
          ]);
        });

        console.log(overviewTable.toString());

        // Process each suggestion with improved progress feedback
        const learningContent = [];

        // Simplified progress bar with better formatting
        const progressBar = new cliProgress.SingleBar({
          format: '📚 Learning |{bar}| {percentage}% | {topic}',
          barCompleteChar: '█',
          barIncompleteChar: '░',
          hideCursor: true,
          clearOnComplete: true, // Clear progress bar when done
        });

        progressBar.start(validSuggestions.length, 0, {
          topic: 'Initializing...',
        });

        for (let i = 0; i < validSuggestions.length; i++) {
          const suggestion = validSuggestions[i];
          const topicName = `Processing ${
            suggestion.description?.substring(0, 30) || `topic ${i + 1}`
          }...`;

          progressBar.update(i + 0.3, { topic: topicName });

          const content = await this.createLearningContent(suggestion, topic);
          learningContent.push(content);

          progressBar.update(i + 0.7, { topic: 'Analyzing content...' });

          // Realistic processing time
          await new Promise((resolve) => setTimeout(resolve, 200));
        }

        progressBar.update(validSuggestions.length, { topic: 'Complete!' });
        await new Promise((resolve) => setTimeout(resolve, 300)); // Brief pause to see completion
        progressBar.stop();

        // Clear any remaining progress artifacts
        console.log(''); // Clean line after progress bar

        // Display all learning content with cleaner formatting
        console.log(chalk.green.bold('\n   🎓 Learning Content'));
        console.log(chalk.gray('   ─'.repeat(25)));

        for (let i = 0; i < learningContent.length; i++) {
          const content = learningContent[i];
          this.displayLearningContent(content);

          // Interactive pause between topics (only if multiple topics)
          if (
            !options.continuous &&
            options.interactive !== false &&
            i < learningContent.length - 1 &&
            learningContent.length > 1
          ) {
            const { continue: shouldContinue } = await inquirer.prompt([
              {
                type: 'confirm',
                name: 'continue',
                message: chalk.cyan('Continue to next learning section?'),
                default: true,
              },
            ]);

            if (!shouldContinue) break;
          }
        }

        // Offer additional learning options (skip in non-interactive mode)
        if (options.interactive !== false) {
          await this.offerAdditionalLearning(topic, learningContent);
        } else {
          console.log(chalk.green('\n📚 Learning session complete!'));
        }

        return {
          success: true,
          data: {
            topic,
            learningContent,
            suggestions: validSuggestions.length,
          },
        };
      } catch (error) {
        spinner.fail('Failed to gather learning materials');
        const errorMessage =
          error instanceof Error ? error.message : String(error);

        console.log(chalk.red(`❌ Error: ${errorMessage}`));

        return {
          success: false,
          error: errorMessage,
          data: { topic },
        };
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      console.log(chalk.red(`❌ Unexpected error: ${errorMessage}`));
      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  /**
   * Returns command definition for registration and help.
   */
  getDefinition(): CommandDefinition {
    return {
      name: 'learn',
      description:
        'Interactive learning mode combining Copilot and AI insights',
      usage: 'aia learn [topic]',
      examples: [
        'aia learn git',
        'aia learn docker',
        'aia learn typescript',
        'aia learn', // Auto-detect topic
      ],
      aliases: ['study', 'tutorial'],
      options: [
        {
          name: 'depth',
          description: 'Number of topics to cover',
          type: 'number',
          default: 3,
        },
        {
          name: 'continuous',
          description: 'Do not pause between topics',
          type: 'boolean',
          default: false,
        },
        {
          name: 'beginner',
          description: 'Focus on beginner-friendly content',
          type: 'boolean',
          default: false,
        },
        {
          name: 'advanced',
          description: 'Include advanced tips and techniques',
          type: 'boolean',
          default: false,
        },
        {
          name: 'no-interactive',
          description: 'Skip interactive prompts (useful for CI/scripts)',
          type: 'boolean',
          default: false,
        },
      ],
    };
  }

  /**
   * Returns the command name.
   */
  getName(): string {
    return 'learn';
  }

  /**
   * Returns command aliases.
   */
  getAliases(): string[] {
    return ['study', 'tutorial'];
  }

  /**
   * Validates command arguments.
   */
  validateArgs(args: string[]): { valid: boolean; errors: string[] } {
    // No validation needed - topic is optional
    return { valid: true, errors: [] };
  }

  /**
   * Provides help information for the command.
   */
  getHelp(): string {
    const definition = this.getDefinition();

    const help = [
      chalk.bold('📚 Interactive Learning Tool'),
      '',
      chalk.bold('Description:'),
      `  ${definition.description}`,
      '',
      chalk.bold('Usage:'),
      `  ${chalk.cyan(definition.usage)}`,
      '',
      chalk.bold('Examples:'),
      ...definition.examples!.map((example) => `  ${chalk.gray(example)}`),
      '',
      chalk.bold('Options:'),
      ...definition.options!.map(
        (option) =>
          `  ${chalk.yellow(`--${option.name}`)}  ${option.description}`
      ),
      '',
      chalk.bold('Features:'),
      '  • 🤖 GitHub Copilot command suggestions',
      '  • 🧠 AI-powered best practices and tips',
      '  • 🎯 Context-aware learning content',
      '  • 🔍 Automatic topic detection',
      '  • 📝 Interactive learning sessions',
      '  • 💡 Beginner to advanced progression',
      '',
      chalk.bold('Supported Topics:'),
      '  • git, docker, kubernetes, typescript, python',
      '  • npm, yarn, webpack, testing, debugging',
      '  • shell scripting, regex, ssh, vim',
      '  • Or any topic - we will do our best!',
      '',
      chalk.bold('Tips:'),
      '  • Leave topic empty for auto-detection',
      '  • Use --beginner for basic concepts',
      '  • Use --advanced for expert techniques',
    ];

    return help.join('\n');
  }

  /**
   * Private helper methods
   */

  private async detectTopic(): Promise<string> {
    try {
      const projectContext = await this.contextService.gatherContext();

      // Detect based on project type
      if (
        projectContext.projectType &&
        projectContext.projectType !== 'unknown'
      ) {
        return projectContext.projectType;
      }

      // Detect based on git status or files
      const projectAnalysis = await this.contextService.analyzeProject();
      if (projectAnalysis.projectType !== 'unknown') {
        return projectAnalysis.projectType;
      }

      // Default topics based on common scenarios
      const defaultTopics = ['git', 'shell', 'file-management', 'productivity'];
      return defaultTopics[Math.floor(Math.random() * defaultTopics.length)];
    } catch (error) {
      // Fallback to shell commands if detection fails
      return 'shell';
    }
  }

  private convertToCommandContext(aiaContext: any): any {
    return {
      workingDirectory: aiaContext.workingDirectory || process.cwd(),
      projectType: aiaContext.projectType || 'unknown',
      gitContext: {
        branch: 'main',
        hasChanges: false,
      },
      environmentContext: {
        platform: aiaContext.platform,
        shell: aiaContext.shell,
      },
    };
  }

  private async createLearningContent(
    suggestion: any,
    topic: string
  ): Promise<any> {
    try {
      // Use shorter timeouts and hide technical details from user
      console.log(
        chalk.gray(
          `⚡ Processing: ${
            suggestion.description || suggestion.command.substring(0, 40)
          }...`
        )
      );

      let explanation;
      try {
        // Try Copilot with a reasonable timeout
        explanation = await Promise.race([
          this.copilotService.explain(suggestion.command),
          this.createTimeoutPromise(5000, 'Copilot explanation timeout'),
        ]);
        console.log(chalk.green(`✓ Enhanced explanation ready`));
      } catch (error) {
        // Graceful fallback without exposing technical errors
        console.log(
          chalk.yellow(
            `⚠ Using simplified explanation for: ${suggestion.command}`
          )
        );
        explanation = {
          explanation: `This command ${suggestion.command} ${
            suggestion.description || 'performs a common task'
          }`,
          components: [],
          examples: [],
          warnings: [],
          relatedCommands: [],
        };
      }

      // Get AI insights with timeout
      let aiInsights;
      try {
        const aiContext = this.createBasicContext();
        const aiPrompt = `Provide 2-3 brief best practices and common mistakes for: ${suggestion.command}. Focus on ${topic} context. Be concise and practical.`;

        aiInsights = await Promise.race([
          this.aiService.queryAI(aiPrompt, aiContext),
          this.createTimeoutPromise(4000, 'AI insights timeout'),
        ]);
      } catch (error) {
        // Fallback AI insights
        aiInsights = {
          content: `Best practices for ${suggestion.command}: Use with caution, read documentation, test in safe environment.`,
        };
      }

      return {
        command: suggestion.command,
        description: suggestion.description,
        explanation:
          (explanation as any)?.explanation || 'Command explanation available',
        components: (explanation as any)?.components || [],
        examples: (explanation as any)?.examples || [],
        warnings: (explanation as any)?.warnings || [],
        aiInsights:
          (aiInsights as any)?.content || 'Additional insights available',
        bestPractices: this.extractBestPractices(
          (aiInsights as any)?.content || ''
        ),
        commonMistakes: this.extractCommonMistakes(
          (aiInsights as any)?.content || ''
        ),
        relatedCommands: (explanation as any)?.relatedCommands || [],
      };
    } catch (error) {
      // Simplified error handling - no technical details for users
      console.log(
        chalk.gray(`ℹ Using basic content for: ${suggestion.command}`)
      );

      // Fallback content if AI services fail
      return {
        command: suggestion.command,
        description: suggestion.description,
        explanation: 'Basic command explanation available',
        components: [],
        examples: [],
        warnings: [],
        aiInsights: 'Additional insights not available',
        bestPractices: [],
        commonMistakes: [],
        relatedCommands: [],
      };
    }
  }

  private displayLearningContent(content: any): void {
    // Clear any potential console conflicts
    console.log(''); // Ensure clean line

    // Streamlined header with better spacing
    console.log(chalk.bold.blue(`\n🔧 ${content.command}`));
    console.log(
      chalk.gray('─'.repeat(Math.min(content.command.length + 4, 80)))
    );

    // Main content in a clean box
    console.log(
      boxen(content.explanation, {
        padding: 1,
        margin: { top: 1, bottom: 1, left: 0, right: 0 },
        borderStyle: 'round',
        borderColor: 'blue',
        title: '💡 How it works',
        titleAlignment: 'left',
      })
    );

    // Description section - simplified
    console.log(chalk.bold('📖 Description:'));
    console.log(
      boxen(content.description, {
        padding: { top: 0, bottom: 0, left: 1, right: 1 },
        borderStyle: 'single',
        borderColor: 'gray',
      })
    );

    // Skip the problematic components table that shows corrupted data
    // Only show if we have meaningful component data
    if (
      content.components.length > 0 &&
      this.hasValidComponents(content.components)
    ) {
      console.log(chalk.bold('\n🔍 Command Components:'));

      const componentsTable = new Table({
        head: [chalk.cyan.bold('Component'), chalk.cyan.bold('Description')],
        style: {
          head: [],
          border: ['gray'],
          'padding-left': 1,
          'padding-right': 1,
        },
        colWidths: [20, 50],
        wordWrap: true,
      });

      content.components.forEach((comp: any) => {
        // Only add if component has meaningful data
        if (
          comp.part &&
          comp.description &&
          comp.part.length > 2 &&
          comp.description.length > 5
        ) {
          componentsTable.push([
            chalk.yellow(comp.part),
            chalk.white(comp.description),
          ]);
        }
      });

      // Only display if we have valid rows
      if (componentsTable.length > 0) {
        console.log(componentsTable.toString());
      }
    }

    // Examples section - cleaner formatting
    if (content.examples.length > 0) {
      console.log(chalk.bold('\n📝 Examples:'));
      content.examples.forEach((example: string, index: number) => {
        console.log(chalk.cyan(`  ${index + 1}. ${example}`));
      });
    }

    // Best practices and mistakes in side-by-side tables with improved layout
    if (content.bestPractices.length > 0 || content.commonMistakes.length > 0) {
      // Use responsive layout based on terminal size
      const terminalSize = UXEnhancements.getTerminalSize();
      const maxWidth = Math.min(terminalSize.columns - 4, 120);
      const colWidth = Math.floor((maxWidth - 6) / 2); // Account for borders and padding

      console.log(chalk.bold('\n💡 Key Insights:'));

      const practicesTable = new Table({
        head: [
          chalk.green.bold('✅ Best Practices'),
          chalk.red.bold('❌ Common Mistakes'),
        ],
        style: {
          head: [],
          border: ['gray'],
          'padding-left': 1,
          'padding-right': 1,
        },
        colWidths: [colWidth, colWidth],
        wordWrap: true,
      });

      const maxRows = Math.max(
        content.bestPractices.length,
        content.commonMistakes.length
      );

      // Ensure we have content to display
      if (maxRows === 0) {
        practicesTable.push([
          chalk.green('• Create meaningful aliases and shortcuts'),
          chalk.red('• Forgetting to check status before operations'),
        ]);
        practicesTable.push([
          chalk.green('• Use descriptive commit messages'),
          chalk.red('• Working directly on main/master branch'),
        ]);
      } else {
        for (let i = 0; i < maxRows; i++) {
          const practice = content.bestPractices[i] || '';
          const mistake = content.commonMistakes[i] || '';
          practicesTable.push([
            practice ? chalk.green(`• ${practice}`) : '',
            mistake ? chalk.red(`• ${mistake}`) : '',
          ]);
        }
      }

      console.log(practicesTable.toString());
    }

    // Related commands and warnings
    if (content.relatedCommands.length > 0) {
      console.log(chalk.bold('\n🔗 Related Commands:'));
      const relatedTable = new Table({
        head: [chalk.cyan.bold('Command'), chalk.cyan.bold('Usage')],
        style: {
          head: [],
          border: ['blue'],
          'padding-left': 1,
          'padding-right': 1,
        },
        colWidths: [25, 50],
      });

      content.relatedCommands.forEach((cmd: string) => {
        relatedTable.push([
          chalk.blue(cmd.split(' ')[0] || cmd),
          chalk.gray(cmd),
        ]);
      });

      console.log(relatedTable.toString());
    }

    if (content.warnings.length > 0) {
      console.log(chalk.bold('\n⚠️  Important Warnings:'));
      content.warnings.forEach((warning: string) => {
        console.log(
          boxen(chalk.yellow(`⚠️  ${warning}`), {
            padding: 1,
            borderStyle: 'round',
            borderColor: 'yellow',
          })
        );
      });
    }
  }

  private async offerAdditionalLearning(
    topic: string,
    learningContent: any[]
  ): Promise<void> {
    console.log(chalk.green.bold('\n🎓 Learning Session Complete!'));
    console.log(chalk.gray('─'.repeat(50)));
    console.log(chalk.cyan(`📚 You've learned about: ${chalk.bold(topic)}`));

    const options = [
      'Practice with examples',
      'Learn related topics',
      'Get quiz questions',
      'Save learning notes',
      'Exit',
    ];

    const { choice } = await inquirer.prompt([
      {
        type: 'list',
        name: 'choice',
        message: 'What would you like to do next?',
        choices: options,
      },
    ]);

    switch (choice) {
      case 'Practice with examples':
        await this.practiceMode(learningContent);
        break;
      case 'Learn related topics':
        await this.suggestRelatedTopics(topic);
        break;
      case 'Get quiz questions':
        await this.generateQuiz(learningContent);
        break;
      case 'Save learning notes':
        await this.saveLearningNotes(topic, learningContent);
        break;
      default:
        console.log(chalk.green.bold('\n📚 Happy learning!'));
        console.log(chalk.cyan('Keep exploring and practicing! 🚀'));
    }
  }

  private async practiceMode(learningContent: any[]): Promise<void> {
    console.log(chalk.bold('\n🏃 Practice Mode'));
    console.log('Try running these commands to practice:');

    learningContent.forEach((content, index) => {
      console.log(`\n${index + 1}. ${chalk.cyan(content.command)}`);
      if (content.examples.length > 0) {
        console.log(`   Example: ${chalk.gray(content.examples[0])}`);
      }
    });
  }

  private async suggestRelatedTopics(currentTopic: string): Promise<void> {
    const relatedTopics = this.getRelatedTopics(currentTopic);

    console.log(chalk.bold('\n🔗 Related Topics:'));
    relatedTopics.forEach((topic) => {
      console.log(`  • ${chalk.blue(topic)}`);
    });

    console.log(chalk.gray('\nRun: aia learn <topic> to explore these topics'));
  }

  private async generateQuiz(learningContent: any[]): Promise<void> {
    console.log(chalk.bold('\n🎯 Quick Quiz'));
    console.log('Test your knowledge:');

    learningContent.forEach((content, index) => {
      console.log(`\n${index + 1}. What does this command do?`);
      console.log(`   ${chalk.cyan(content.command)}`);
      console.log(
        chalk.gray('   (Think about it, then check the explanation above)')
      );
    });
  }

  private async saveLearningNotes(
    topic: string,
    learningContent: any[]
  ): Promise<void> {
    const notes = [
      `# Learning Notes: ${topic}`,
      `Generated on: ${new Date().toLocaleDateString()}`,
      '',
      ...learningContent.map((content) =>
        [
          `## ${content.command}`,
          content.description,
          '',
          '**Best Practices:**',
          ...content.bestPractices.map((p: string) => `- ${p}`),
          '',
        ].join('\n')
      ),
    ].join('\n');

    console.log(
      chalk.green(
        '\n💾 Learning notes would be saved to: aia-learning-notes.md'
      )
    );
    console.log(chalk.gray('(File saving not implemented in this demo)'));
  }

  private extractBestPractices(aiContent: string): string[] {
    // Enhanced extraction to find concise, actionable best practices
    const practices = [];
    const lines = aiContent.split('\n');

    // Look for specific actionable phrases that make good standalone tips
    for (const line of lines) {
      const cleanLine = line.trim();

      // Skip empty lines, very short lines, or lines with code blocks
      if (
        cleanLine.length < 15 ||
        cleanLine.length > 80 ||
        cleanLine.includes('```')
      )
        continue;

      // Look for actionable statements that start with action words
      if (
        cleanLine.match(
          /^(use|create|save|check|ensure|always|set|configure|add|make|keep)/i
        )
      ) {
        // Exclude lines that contain mistake-related keywords
        if (
          !cleanLine.toLowerCase().includes('mistake') &&
          !cleanLine.toLowerCase().includes('avoid') &&
          !cleanLine.toLowerCase().includes("don't") &&
          !cleanLine.toLowerCase().includes('not ')
        ) {
          practices.push(cleanLine);
        }
      }

      // Look for sentences that describe good practices
      if (
        cleanLine.match(/.*for (better|good|improved|effective).*/i) &&
        cleanLine.length < 80
      ) {
        practices.push(cleanLine);
      }

      // Extract items that explicitly mention benefits
      if (cleanLine.includes('will help') || cleanLine.includes('helps')) {
        if (cleanLine.length < 80) {
          practices.push(cleanLine);
        }
      }
    }

    // Remove duplicates and filter for quality
    const uniquePractices = Array.from(new Set(practices))
      .filter((p) => p.length > 15 && p.length < 80)
      .filter((p) => !p.includes('Components:'))
      .filter((p) => !p.includes('Warning'))
      .slice(0, 3);

    // Enhanced fallback with more specific git practices
    if (uniquePractices.length === 0) {
      return [
        'Create aliases for frequently used commands',
        'Always check git status before switching branches',
        'Use meaningful and descriptive commit messages',
      ];
    }

    return uniquePractices;
  }

  private extractCommonMistakes(aiContent: string): string[] {
    // Enhanced extraction to find concise, actionable mistakes to avoid
    const mistakes = [];
    const lines = aiContent.split('\n');

    for (const line of lines) {
      const cleanLine = line.trim();

      // Skip empty, very short lines, or lines with code blocks
      if (
        cleanLine.length < 15 ||
        cleanLine.length > 80 ||
        cleanLine.includes('```')
      )
        continue;

      // Look for lines that explicitly describe mistakes or things to avoid
      if (
        cleanLine.match(
          /^(forgetting|not |failing|missing|neglecting|skipping)/i
        )
      ) {
        if (cleanLine.length < 80) {
          mistakes.push(cleanLine);
        }
      }

      // Look for explicit avoidance statements
      if (
        cleanLine.toLowerCase().includes('avoid') &&
        !cleanLine.toLowerCase().includes('best')
      ) {
        if (cleanLine.length < 80) {
          // Clean up the avoid statement
          const cleaned = cleanLine.replace(/avoid\s*/gi, '').trim();
          if (cleaned.length > 10) {
            mistakes.push(`Avoiding ${cleaned}`);
          }
        }
      }

      // Look for "don't" statements
      if (
        cleanLine.toLowerCase().includes("don't") ||
        cleanLine.toLowerCase().includes('do not')
      ) {
        if (cleanLine.length < 80) {
          mistakes.push(cleanLine);
        }
      }

      // Look for numbered mistake lists
      if (cleanLine.match(/^\d+\.\s*.{10,80}$/)) {
        const content = cleanLine.replace(/^\d+\.\s*/, '');
        if (
          content.toLowerCase().includes('forget') ||
          content.toLowerCase().includes('avoid') ||
          content.toLowerCase().includes('not ')
        ) {
          mistakes.push(content);
        }
      }
    }

    // Remove duplicates and filter for quality
    const uniqueMistakes = Array.from(new Set(mistakes))
      .filter((m) => m.length > 15 && m.length < 80)
      .filter((m) => !m.includes('Components:'))
      .filter((m) => !m.includes('Warning'))
      .filter((m) => !m.toLowerCase().includes('best practice'))
      .slice(0, 3);

    // Enhanced fallback with more specific git mistakes
    if (uniqueMistakes.length === 0) {
      return [
        'Forgetting to check status before switching branches',
        'Making commits with unclear or missing messages',
      ];
    }

    return uniqueMistakes;
  }

  private getRelatedTopics(topic: string): string[] {
    const topicMap: Record<string, string[]> = {
      git: ['github', 'version-control', 'collaboration', 'branching'],
      docker: ['kubernetes', 'containers', 'devops', 'deployment'],
      typescript: ['javascript', 'nodejs', 'web-development', 'types'],
      python: ['pip', 'virtual-environments', 'data-science', 'web-scraping'],
      shell: ['bash', 'scripting', 'automation', 'text-processing'],
    };

    return topicMap[topic] || ['git', 'shell', 'productivity', 'automation'];
  }

  private createBasicContext() {
    return {
      workingDirectory: process.cwd(),
      platform: process.platform,
      arch: process.arch,
      nodeVersion: process.version,
      user: process.env.USER || process.env.USERNAME || 'unknown',
      shell: process.env.SHELL || 'unknown',
      timestamp: new Date().toISOString(),
      projectType: 'unknown',
      projectInfo: {},
      gitStatus: 'unknown',
      environmentScore: 1.0,
    };
  }

  /**
   * Check if components contain valid, meaningful data
   */
  private hasValidComponents(components: any[]): boolean {
    return components.some(
      (comp) =>
        comp.part &&
        comp.description &&
        comp.description.trim().length > 10 &&
        !comp.description.includes('undefined') &&
        !comp.description.includes('null')
    );
  }

  /**
   * Create a timeout promise that rejects after specified milliseconds
   */
  private createTimeoutPromise<T>(ms: number, message: string): Promise<T> {
    return new Promise((_, reject) => {
      setTimeout(() => reject(new Error(message)), ms);
    });
  }

  /**
   * Provide fallback learning suggestions when Copilot services fail
   */
  private getFallbackSuggestions(topic: string): any[] {
    const fallbackMap: Record<string, any[]> = {
      node: [
        {
          command: 'npm init -y',
          description: 'Initialize a new Node.js project',
          confidence: 0.9,
          tags: ['nodejs', 'npm'],
        },
        {
          command: 'npm install --save-dev nodemon',
          description: 'Install nodemon for development',
          confidence: 0.8,
          tags: ['nodejs', 'development'],
        },
        {
          command: 'node --version',
          description: 'Check Node.js version',
          confidence: 1.0,
          tags: ['nodejs', 'version'],
        },
      ],
      git: [
        {
          command: 'git status',
          description: 'Check repository status',
          confidence: 1.0,
          tags: ['git', 'status'],
        },
        {
          command: 'git add .',
          description: 'Stage all changes',
          confidence: 0.9,
          tags: ['git', 'staging'],
        },
        {
          command: 'git commit -m "message"',
          description: 'Commit staged changes',
          confidence: 0.9,
          tags: ['git', 'commit'],
        },
      ],
      docker: [
        {
          command: 'docker build -t myapp .',
          description: 'Build Docker image',
          confidence: 0.9,
          tags: ['docker', 'build'],
        },
        {
          command: 'docker run -p 3000:3000 myapp',
          description: 'Run Docker container',
          confidence: 0.9,
          tags: ['docker', 'run'],
        },
      ],
    };

    return (
      fallbackMap[topic] || [
        {
          command: `${topic} --help`,
          description: `Get help for ${topic}`,
          confidence: 0.7,
          tags: [topic, 'help'],
        },
        {
          command: `man ${topic}`,
          description: `Read manual for ${topic}`,
          confidence: 0.6,
          tags: [topic, 'manual'],
        },
      ]
    );
  }
}
