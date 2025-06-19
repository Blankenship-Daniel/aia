import { ICommand, CommandDefinition } from '../interfaces/ICommand';
import { IAIService } from '../interfaces/IAIService';
import { IContextService } from '../interfaces/IContextService';
import { IMemoryService } from '../interfaces/IMemoryService';
import {
  CommandResult,
  CommandOptions,
  CommandOption,
  AIModel,
} from '../types/index.js';
import chalk from 'chalk';
import ora from 'ora';

export class AskCommand implements ICommand {
  public readonly name = 'ask';
  public readonly description = 'Ask AI a question with context awareness';

  constructor(
    private aiService: IAIService,
    private contextService: IContextService,
    private memoryService: IMemoryService
  ) {}

  getDefinition(): CommandDefinition {
    return {
      name: this.name,
      description: this.description,
      usage: 'ask <question>',
      aliases: ['q', 'query'],
      options: [
        {
          name: 'model',
          description: 'Preferred AI model to use',
          type: 'string',
          required: false,
        },
        {
          name: 'context',
          description: 'Additional context for the query',
          type: 'string',
          required: false,
        },
      ],
      examples: [
        'ask "How do I optimize this Node.js project?"',
        'ask --model gpt-4 "Explain this error message"',
        'ask --context "debugging" "Why is my code slow?"',
      ],
    };
  }

  async execute(
    context: Record<string, unknown>,
    args: string[],
    options: CommandOptions = {}
  ): Promise<CommandResult> {
    try {
      const query = args.join(' ').trim();

      if (!query) {
        return {
          success: false,
          error: 'Please provide a question to ask',
        };
      }

      const spinner = ora('Thinking...').start();

      try {
        // Gather context
        const contextResult = await this.contextService.gatherContext();

        // Get recent conversations for better context
        const conversationHistory =
          await this.memoryService.getRecentConversations(5);

        // Query AI with context and history
        const model = options.model as AIModel | undefined;
        const response = await this.aiService.queryAI(
          query,
          contextResult,
          model
        );

        spinner.stop();

        if (!response || !response.content) {
          return {
            success: false,
            error: 'Failed to get AI response',
          };
        }

        // Store in memory
        await this.memoryService.addConversation(
          query,
          response.content,
          contextResult,
          response.model
        );

        console.log(
          chalk.cyan('\n🤖 AI Response:\n'),
          response.content,
          chalk.dim(`\n\n(Model: ${response.model})`)
        );

        return {
          success: true,
          data: response,
        };
      } catch (error) {
        spinner.fail('Failed to process query');
        throw error;
      }
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error ? error.message : 'Query processing failed',
      };
    }
  }

  getExamples(): string[] {
    return [
      'ask "How do I optimize this Node.js project?"',
      'ask --model gpt-4 "Explain this error message"',
      'ask --context "debugging" "Why is my code slow?"',
    ];
  }

  getOptions(): CommandOption[] {
    return [
      {
        name: 'model',
        description: 'Preferred AI model to use',
        type: 'string',
        required: false,
      },
      {
        name: 'context',
        description: 'Additional context for the query',
        type: 'string',
        required: false,
      },
    ];
  }

  getName(): string {
    return this.name;
  }

  getAliases(): string[] {
    return ['q', 'query'];
  }

  validateArgs(args: string[]): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (args.length === 0) {
      errors.push('Question is required');
    }

    const query = args.join(' ').trim();
    if (!query) {
      errors.push('Question cannot be empty');
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  getHelp(): string {
    const def = this.getDefinition();
    let help = `${def.name} - ${def.description}\n\n`;
    help += `Usage: ${def.usage}\n\n`;

    if (def.aliases?.length) {
      help += `Aliases: ${def.aliases.join(', ')}\n\n`;
    }

    if (def.options?.length) {
      help += 'Options:\n';
      def.options.forEach((opt) => {
        help += `  --${opt.name}: ${opt.description}${
          opt.required ? ' (required)' : ''
        }\n`;
      });
      help += '\n';
    }

    if (def.examples?.length) {
      help += 'Examples:\n';
      def.examples.forEach((example) => {
        help += `  ${example}\n`;
      });
    }

    return help;
  }
}
