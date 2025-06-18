import { CommandResult, CommandOptions } from '../types/index.js';

/**
 * Command Definition Interface
 */
export interface CommandDefinition {
  name: string;
  description: string;
  usage?: string;
  examples?: string[];
  aliases?: string[];
  options?: Array<{
    name: string;
    description: string;
    type: 'string' | 'number' | 'boolean';
    required?: boolean;
    default?: unknown;
  }>;
}

/**
 * Command Interface
 * Base interface for all AIA commands
 */
export interface ICommand {
  /**
   * Execute the command
   */
  execute(
    context: Record<string, unknown>,
    args: string[],
    options: CommandOptions
  ): Promise<CommandResult>;

  /**
   * Get command definition
   */
  getDefinition(): CommandDefinition;

  /**
   * Get command name
   */
  getName(): string;

  /**
   * Get command aliases
   */
  getAliases(): string[];

  /**
   * Validate command arguments
   */
  validateArgs(args: string[]): {
    valid: boolean;
    errors: string[];
  };

  /**
   * Get command help text
   */
  getHelp(): string;
}
