/**
 * ICommand.ts - Core command interface defining the contract for all AIA CLI commands.
 *
 * Responsibilities:
 * - Defines the standard interface that all AIA commands must implement.
 * - Specifies command execution, definition, validation, and help methods.
 * - Ensures consistent command structure across the entire CLI application.
 * - Provides type safety for command arguments, options, and results.
 *
 * Architecture:
 * - Central interface enabling polymorphic command handling.
 * - Supports command registration and dynamic execution.
 * - Integrates with command registry and factory patterns.
 *
 * Exports:
 * - {@link ICommand}: Main command interface for all CLI commands.
 * - {@link CommandDefinition}: Structure for command metadata and options.
 *
 * @see CommandResult - Standard command execution result type.
 * @see CommandOptions - Command execution options and parameters.
 * @see CommandRegistry - Service that manages command registration and routing.
 */

import { CommandResult, CommandOptions } from '../types/index';

/**
 * CommandDefinition - Metadata structure for command registration and help generation.
 *
 * Purpose:
 * - Provides comprehensive command metadata including usage, examples, and options.
 * - Enables automatic help generation and command validation.
 * - Supports command aliases and option definitions with type safety.
 *
 * @example
 * const definition: CommandDefinition = {
 *   name: 'ask',
 *   description: 'Ask AI a question',
 *   usage: 'ask <question>',
 *   examples: ['ask "How do I optimize this code?"'],
 *   aliases: ['q'],
 *   options: [{ name: 'model', description: 'AI model', type: 'string' }]
 * };
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
 * ICommand - Core interface that all AIA CLI commands must implement.
 *
 * Purpose:
 * - Establishes consistent contract for command implementation across the CLI application.
 * - Enables polymorphic command handling through command registry and factory patterns.
 * - Provides type safety and standardization for command execution and metadata.
 * - Supports dynamic command registration, validation, and help generation.
 *
 * Implementation Requirements:
 * - All commands must implement execute() for core functionality.
 * - Commands must provide definition metadata for registration and help.
 * - Validation methods ensure argument correctness before execution.
 * - Help methods provide user-friendly command documentation.
 *
 * Dependencies:
 * @see CommandResult - Standard return type for command execution.
 * @see CommandOptions - Input options and parameters for commands.
 * @see CommandDefinition - Metadata structure for command registration.
 *
 * @example
 * class MyCommand implements ICommand {
 *   async execute(context, args, options) { return { success: true }; }
 *   getDefinition() { return { name: 'my-cmd', description: '...', ... }; }
 *   // ... other required methods
 * }
 */
export interface ICommand {
  /**
   * Executes the command with provided context, arguments, and options.
   *
   * @param {Record<string, unknown>} context - Execution context and environment information.
   * @param {string[]} args - Command arguments provided by the user.
   * @param {CommandOptions} options - Command-specific options and flags.
   * @returns {Promise<CommandResult>} Result indicating success/failure with optional data and error information.
   *
   * @example
   * const result = await command.execute({}, ['arg1', 'arg2'], { verbose: true });
   * if (result.success) console.log('Success:', result.data);
   */
  execute(
    context: Record<string, unknown>,
    args: string[],
    options: CommandOptions
  ): Promise<CommandResult>;

  /**
   * Returns the complete command definition including metadata, options, and examples.
   *
   * @returns {CommandDefinition} Command definition with name, description, usage, examples, aliases, and options.
   *
   * @example
   * const def = command.getDefinition();
   * console.log(`Command: ${def.name} - ${def.description}`);
   */
  getDefinition(): CommandDefinition;

  /**
   * Returns the primary name of the command.
   *
   * @returns {string} Command name used for registration and execution.
   *
   * @example
   * const name = command.getName(); // 'ask', 'agent', etc.
   */
  getName(): string;

  /**
   * Returns alternative names (aliases) for the command.
   *
   * @returns {string[]} Array of command aliases for convenient access.
   *
   * @example
   * const aliases = command.getAliases(); // ['q', 'query'] for ask command
   */
  getAliases(): string[];

  /**
   * Validates command arguments before execution to ensure correctness.
   *
   * @param {string[]} args - Arguments to validate.
   * @returns {{valid: boolean, errors: string[]}} Validation result with error details if invalid.
   *
   * @example
   * const validation = command.validateArgs(['arg1']);
   * if (!validation.valid) console.error('Errors:', validation.errors);
   */
  validateArgs(args: string[]): {
    valid: boolean;
    errors: string[];
  };

  /**
   * Returns comprehensive help text for the command including usage and examples.
   *
   * @returns {string} Formatted help text for display to users.
   *
   * @example
   * const help = command.getHelp();
   * console.log(help); // Displays formatted help with usage, examples, etc.
   */
  getHelp(): string;
}
