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
        const spinner = ora(
          'Detecting learning topic from project context...'
        ).start();
        topic = await this.detectTopic();
        spinner.succeed(`Detected topic: ${chalk.cyan(topic)}`);
      }

      console.log(chalk.bold(`\\n📚 Learning Session: ${chalk.cyan(topic)}`));
      console.log(chalk.gray('─'.repeat(50)));

      // Get context-aware suggestions from Copilot
      const spinner = ora('Gathering learning materials...').start();

      try {
        const projectContext = await this.contextService.gatherContext();
        const copilotContext = this.convertToCommandContext(projectContext);

        // Get basic commands for the topic
        const suggestions = await this.copilotService.suggest(
          `common ${topic} commands for this project`,
          copilotContext,
          { maxSuggestions: (options.depth as number) || 3 }
        );

        spinner.succeed('Learning materials gathered');

        // Process each suggestion with AI enhancement
        const learningContent = [];

        for (const suggestion of suggestions) {
          const content = await this.createLearningContent(suggestion, topic);
          learningContent.push(content);

          // Display the learning content
          this.displayLearningContent(content);

          // Interactive pause between topics
          if (
            !options.continuous &&
            learningContent.length < suggestions.length
          ) {
            const { continue: shouldContinue } = await inquirer.prompt([
              {
                type: 'confirm',
                name: 'continue',
                message: 'Continue to next topic?',
                default: true,
              },
            ]);

            if (!shouldContinue) break;
          }
        }

        // Offer additional learning options
        await this.offerAdditionalLearning(topic, learningContent);

        return {
          success: true,
          data: {
            topic,
            learningContent,
            suggestions: suggestions.length,
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

    return help.join('\\n');
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
      // Get detailed explanation from Copilot
      const explanation = await this.copilotService.explain(suggestion.command);

      // Get AI insights and best practices
      const aiContext = this.createBasicContext();
      const aiPrompt = `Provide best practices, tips, and common use cases for: ${suggestion.command}. Focus on ${topic} context.`;
      const aiInsights = await this.aiService.queryAI(aiPrompt, aiContext);

      return {
        command: suggestion.command,
        description: suggestion.description,
        explanation: explanation.explanation,
        components: explanation.components || [],
        examples: explanation.examples || [],
        warnings: explanation.warnings || [],
        aiInsights: aiInsights.content,
        bestPractices: this.extractBestPractices(aiInsights.content),
        commonMistakes: this.extractCommonMistakes(aiInsights.content),
        relatedCommands: explanation.relatedCommands || [],
      };
    } catch (error) {
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
    console.log('\\n' + chalk.bold(`🔧 ${content.command}`));
    console.log(chalk.gray('─'.repeat(40)));

    console.log(chalk.bold('\\n📖 Description:'));
    console.log(`  ${content.description}`);

    console.log(chalk.bold('\\n💡 Explanation:'));
    console.log(`  ${content.explanation}`);

    if (content.components.length > 0) {
      console.log(chalk.bold('\\n🔍 Components:'));
      content.components.forEach((comp: any) => {
        console.log(`  ${chalk.yellow(comp.part)}: ${comp.description}`);
      });
    }

    if (content.examples.length > 0) {
      console.log(chalk.bold('\\n📝 Examples:'));
      content.examples.forEach((example: string) => {
        console.log(`  ${chalk.cyan(example)}`);
      });
    }

    if (content.bestPractices.length > 0) {
      console.log(chalk.bold('\\n✅ Best Practices:'));
      content.bestPractices.forEach((practice: string) => {
        console.log(`  • ${practice}`);
      });
    }

    if (content.commonMistakes.length > 0) {
      console.log(chalk.bold('\\n❌ Common Mistakes:'));
      content.commonMistakes.forEach((mistake: string) => {
        console.log(`  • ${chalk.red(mistake)}`);
      });
    }

    if (content.relatedCommands.length > 0) {
      console.log(chalk.bold('\\n🔗 Related Commands:'));
      content.relatedCommands.forEach((cmd: string) => {
        console.log(`  ${chalk.blue(cmd)}`);
      });
    }

    if (content.warnings.length > 0) {
      console.log(chalk.bold('\\n⚠️  Warnings:'));
      content.warnings.forEach((warning: string) => {
        console.log(`  ${chalk.yellow(warning)}`);
      });
    }
  }

  private async offerAdditionalLearning(
    topic: string,
    learningContent: any[]
  ): Promise<void> {
    console.log('\\n' + chalk.bold('🎓 Learning Session Complete!'));
    console.log(chalk.gray('─'.repeat(50)));

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
        console.log(chalk.green('\\n📚 Happy learning!'));
    }
  }

  private async practiceMode(learningContent: any[]): Promise<void> {
    console.log(chalk.bold('\\n🏃 Practice Mode'));
    console.log('Try running these commands to practice:');

    learningContent.forEach((content, index) => {
      console.log(`\\n${index + 1}. ${chalk.cyan(content.command)}`);
      if (content.examples.length > 0) {
        console.log(`   Example: ${chalk.gray(content.examples[0])}`);
      }
    });
  }

  private async suggestRelatedTopics(currentTopic: string): Promise<void> {
    const relatedTopics = this.getRelatedTopics(currentTopic);

    console.log(chalk.bold('\\n🔗 Related Topics:'));
    relatedTopics.forEach((topic) => {
      console.log(`  • ${chalk.blue(topic)}`);
    });

    console.log(
      chalk.gray('\\nRun: aia learn <topic> to explore these topics')
    );
  }

  private async generateQuiz(learningContent: any[]): Promise<void> {
    console.log(chalk.bold('\\n🎯 Quick Quiz'));
    console.log('Test your knowledge:');

    learningContent.forEach((content, index) => {
      console.log(`\\n${index + 1}. What does this command do?`);
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
        ].join('\\n')
      ),
    ].join('\\n');

    console.log(
      chalk.green(
        '\\n💾 Learning notes would be saved to: aia-learning-notes.md'
      )
    );
    console.log(chalk.gray('(File saving not implemented in this demo)'));
  }

  private extractBestPractices(aiContent: string): string[] {
    // Simple extraction - could be enhanced with NLP
    const practices = [];
    const lines = aiContent.split('\\n');

    for (const line of lines) {
      if (
        line.toLowerCase().includes('best practice') ||
        line.toLowerCase().includes('tip:') ||
        line.toLowerCase().includes('recommended')
      ) {
        practices.push(line.trim());
      }
    }

    return practices.slice(0, 3); // Limit to 3 practices
  }

  private extractCommonMistakes(aiContent: string): string[] {
    // Simple extraction - could be enhanced with NLP
    const mistakes = [];
    const lines = aiContent.split('\\n');

    for (const line of lines) {
      if (
        line.toLowerCase().includes('mistake') ||
        line.toLowerCase().includes('avoid') ||
        line.toLowerCase().includes('do not')
      ) {
        mistakes.push(line.trim());
      }
    }

    return mistakes.slice(0, 2); // Limit to 2 mistakes
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
}
