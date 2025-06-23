import { ICommand } from './ICommand';

/**
 * Command Registrar Interface - SOLID OCP Compliance
 *
 * Purpose: Enable extensible command registration without modifying existing code.
 * This interface addresses the OCP violation in the original CommandFactory switch statement.
 *
 * SOLID Principles Applied:
 * - Open/Closed Principle: Open for extension (new commands), closed for modification
 * - Single Responsibility: Focused solely on command registration and creation
 * - Interface Segregation: Small, focused interface with single concern
 * - Dependency Inversion: Abstracts command creation from concrete implementations
 */
export interface ICommandRegistrar {
  /**
   * Register a command with its name, aliases, and factory function
   * @param name - Primary command name
   * @param aliases - Alternative names for the command
   * @param factory - Function that creates the command instance
   */
  register(name: string, aliases: string[], factory: () => ICommand): void;

  /**
   * Create a command instance by name or alias
   * @param name - Command name or alias
   * @returns Command instance or null if not found
   */
  create(name: string): ICommand | null;

  /**
   * Get all registered command names
   * @returns Array of all primary command names
   */
  getAllCommandNames(): string[];

  /**
   * Get all registered commands as a Map
   * @returns Map with command names as keys and command instances as values
   */
  getAllCommands(): Map<string, ICommand>;

  /**
   * Check if a command name or alias is registered
   * @param name - Command name or alias to check
   * @returns True if command exists, false otherwise
   */
  hasCommand(name: string): boolean;

  /**
   * Get all aliases for a command name
   * @param name - Primary command name
   * @returns Array of aliases for the command
   */
  getAliases(name: string): string[];
}
