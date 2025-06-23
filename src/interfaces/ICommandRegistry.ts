import { ICommand } from './ICommand';

/**
 * Command Registry Interface
 * Manages registration and resolution of commands
 */
export interface ICommandRegistry {
  /**
   * Register a command
   */
  register(command: ICommand): void;

  /**
   * Unregister a command
   */
  unregister(name: string): boolean;

  /**
   * Get a command by name
   */
  getCommand(name: string): ICommand | null;

  /**
   * Get all registered commands
   */
  getAllCommands(): Map<string, ICommand>;

  /**
   * Check if command exists
   */
  hasCommand(name: string): boolean;

  /**
   * Get command names
   */
  getCommandNames(): string[];

  /**
   * Register command alias
   */
  registerAlias(alias: string, commandName: string): void;

  /**
   * Resolve command or alias
   */
  resolveCommand(nameOrAlias: string): ICommand | null;

  /**
   * Clear all commands
   */
  clear(): void;
}
