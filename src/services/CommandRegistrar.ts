import { ICommandRegistrar } from '../interfaces/ICommandRegistrar';
import { ICommand } from '../interfaces/ICommand';

/**
 * Command Registrar Service - SOLID Registry Pattern Implementation
 *
 * Purpose: Provides extensible command registration without modifying existing code.
 * Replaces the OCP-violating switch statement in CommandFactory.
 *
 * SOLID Principles Applied:
 * - Single Responsibility: Only handles command registration and creation
 * - Open/Closed: Open for extension (new commands), closed for modification
 * - Interface Segregation: Implements focused ICommandRegistrar interface
 * - Dependency Inversion: Depends on ICommand abstraction, not concrete classes
 *
 * Benefits:
 * - Adding new commands requires NO modification to existing code
 * - Commands are registered at startup, created on demand
 * - Supports command aliases naturally
 * - Thread-safe and memory efficient
 */
export class CommandRegistrar implements ICommandRegistrar {
  private readonly factories = new Map<string, () => ICommand>();
  private readonly aliases = new Map<string, string>();
  private readonly commandAliases = new Map<string, string[]>();

  /**
   * Register a command with its name, aliases, and factory function
   */
  public register(
    name: string,
    aliases: string[],
    factory: () => ICommand
  ): void {
    const primaryName = name.toLowerCase();

    // Validate command name
    if (!primaryName.trim()) {
      throw new Error('Command name cannot be empty');
    }

    // Check for duplicate registration
    if (this.factories.has(primaryName)) {
      throw new Error(`Command '${primaryName}' is already registered`);
    }

    // Register primary name
    this.factories.set(primaryName, factory);
    this.commandAliases.set(
      primaryName,
      aliases.map((a) => a.toLowerCase())
    );

    // Register aliases
    for (const alias of aliases) {
      const aliasKey = alias.toLowerCase();

      if (this.aliases.has(aliasKey) || this.factories.has(aliasKey)) {
        throw new Error(
          `Alias '${aliasKey}' conflicts with existing command or alias`
        );
      }

      this.aliases.set(aliasKey, primaryName);
    }
  }

  /**
   * Create a command instance by name or alias
   */
  public create(name: string): ICommand | null {
    const key = name.toLowerCase();

    // Try direct command name first
    let factory = this.factories.get(key);

    // If not found, try alias resolution
    if (!factory) {
      const primaryName = this.aliases.get(key);
      if (primaryName) {
        factory = this.factories.get(primaryName);
      }
    }

    return factory ? factory() : null;
  }

  /**
   * Get all registered command names
   */
  public getAllCommandNames(): string[] {
    return Array.from(this.factories.keys());
  }

  /**
   * Get all registered commands as a Map
   */
  public getAllCommands(): Map<string, ICommand> {
    const commands = new Map<string, ICommand>();

    for (const [name, factory] of this.factories) {
      commands.set(name, factory());
    }

    return commands;
  }

  /**
   * Check if a command name or alias is registered
   */
  public hasCommand(name: string): boolean {
    const key = name.toLowerCase();
    return this.factories.has(key) || this.aliases.has(key);
  }

  /**
   * Get all aliases for a command name
   */
  public getAliases(name: string): string[] {
    const key = name.toLowerCase();
    return this.commandAliases.get(key) || [];
  }

  /**
   * Get statistics about registered commands
   * Useful for diagnostics and monitoring
   */
  public getRegistrationStats(): {
    totalCommands: number;
    totalAliases: number;
    commandsWithAliases: number;
  } {
    return {
      totalCommands: this.factories.size,
      totalAliases: this.aliases.size,
      commandsWithAliases: Array.from(this.commandAliases.values()).filter(
        (aliases) => aliases.length > 0
      ).length,
    };
  }

  /**
   * Clear all registrations
   * Useful for testing
   */
  public clear(): void {
    this.factories.clear();
    this.aliases.clear();
    this.commandAliases.clear();
  }
}
