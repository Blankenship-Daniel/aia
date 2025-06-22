/**
 * AskCommand.ts - Direct AI query command with context awareness and memory integration.
 *
 * Responsibilities:
 * - Processes direct user questions to AI with contextual information.
 * - Integrates with AI service for model selection and query processing.
 * - Manages conversation memory for improved context awareness.
 * - Provides user-friendly interface with progress indicators and error handling.
 *
 * Architecture:
 * - Implements ICommand interface for consistent command structure.
 * - Uses dependency injection for AI, context, and memory services.
 * - Supports model selection and additional context parameters.
 *
 * Exports:
 * - {@link AskCommand}: Command implementation for AI queries.
 *
 * @see IAIService - AI model interaction and query processing.
 * @see IContextService - Environment and project context gathering.
 * @see IMemoryService - Conversation history and memory management.
 */

import { ICommand, CommandDefinition } from '../interfaces/ICommand';
import { IAIService } from '../interfaces/IAIService';
import { IContextService } from '../interfaces/IContextService';
import { IMemoryService } from '../interfaces/IMemoryService';
import { ICodeHighlightService } from '../interfaces/ICodeHighlightService';
import {
  CommandResult,
  CommandOptions,
  CommandOption,
  AIModel,
} from '../types/index.js';
// @ts-ignore - chalk may not have types available
const { Chalk } = require('chalk');
// Instantiate Chalk for color methods in CommonJS context
const chalk = new Chalk({ level: 3 });
import ora from 'ora';

/**
 * AskCommand - Direct AI query command providing context-aware question answering.
 *
 * Purpose:
 * - Enables users to ask direct questions to AI with automatic context integration.
 * - Manages conversation memory to provide improved contextual responses.
 * - Supports flexible model selection and additional context parameters.
 * - Provides user-friendly interface with progress indicators and clear error messages.
 *
 * Key Features:
 * - Context-aware AI queries with project and environment information.
 * - Integration with conversation memory for enhanced responses.
 * - Model selection support for different AI capabilities.
 * - Progress indication during AI processing.
 *
 * Dependencies:
 * @see IAIService - Handles AI model interactions and query processing.
 * @see IContextService - Gathers environment and project context.
 * @see IMemoryService - Manages conversation history and memory.
 *
 * @example
 * const askCmd = new AskCommand(aiService, contextService, memoryService);
 * await askCmd.execute({}, ['How do I optimize this code?'], { model: 'gpt-4' });
 */
export class AskCommand implements ICommand {
  public readonly name = 'ask';
  public readonly description = 'Ask AI a question with context awareness';

  constructor(
    private aiService: IAIService,
    private contextService: IContextService,
    private memoryService: IMemoryService,
    private codeHighlightService: ICodeHighlightService
  ) {}

  /**
   * Gets definition
   * 
   * @returns CommandDefinition - Return value description
   */
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

  /**
   * Executes the ask command to process user questions with AI integration.
   *
   * Detailed Process:
   * - Validates the user query and ensures it's not empty.
   * - Gathers current context including project and environment information.
   * - Retrieves recent conversation history for enhanced context awareness.
   * - Queries AI service with the question, context, and conversation history.
   * - Stores the conversation exchange in memory for future reference.
   * - Displays the AI response with model information to the user.
   *
   * @param {Record<string, unknown>} context - Execution context (not directly used).
   * @param {string[]} args - User question arguments to be joined as the query.
   * @param {CommandOptions} [options={}] - Command options including model preference and additional context.
   * @returns {Promise<CommandResult>} Result containing AI response data or error information.
   * @throws {Error} If AI service interaction or memory storage fails.
   *
   * @example
   * const result = await askCmd.execute({}, ['How to optimize performance?'], { model: 'gpt-4' });
   * console.log(result.data.content); // AI response content
   *
   * @see IAIService.queryAI - Core AI query processing.
   * @see IMemoryService.addConversation - Stores conversation for future context.
   */
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
          this.processResponseWithHighlighting(response.content),
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

  /**
   * Process AI response content to apply syntax highlighting to code blocks
   * @param content - Raw AI response content
   * @returns Processed content with highlighted code blocks
   */
  private processResponseWithHighlighting(content: string): string {
    // Regular expression to match markdown code blocks
    const codeBlockRegex = /```(\w+)?\n([\s\S]*?)```/g;

    return content.replace(codeBlockRegex, (match, language, code) => {
      try {
        // Use the code highlighting service to highlight the code
        const highlightedCode = this.codeHighlightService.highlightCode(
          code.trim(),
          language || 'javascript'
        );

        // Return the highlighted code with markdown-style borders
        return `\n${chalk.gray(
          '```' + (language || 'javascript')
        )}\n${highlightedCode}\n${chalk.gray('```')}\n`;
      } catch (error) {
        // Fallback to original code block if highlighting fails
        console.error('Code highlighting failed:', error);
        return match;
      }
    });
  }

  /**
   * Gets examples
   * 
   * @returns string[] - Return value description
   */
  getExamples(): string[] {
    return [
      'ask "How do I optimize this Node.js project?"',
      'ask --model gpt-4 "Explain this error message"',
      'ask --context "debugging" "Why is my code slow?"',
    ];
  }

  /**
   * Gets options
   * 
   * @returns CommandOption[] - Return value description
   */
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

  /**
   * Gets name
   * 
   * @returns string - Return value description
   */
  getName(): string {
    return this.name;
  }

  /**
   * Gets aliases
   * 
   * @returns string[] - Return value description
   */
  getAliases(): string[] {
    return ['q', 'query'];
  }

  /**
   * Validates args
   * 
   * @param args - Parameter description
   * 
   * @returns  - Return value description
   */
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

  /**
   * Gets help
   * 
   * @returns string - Return value description
   */
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
