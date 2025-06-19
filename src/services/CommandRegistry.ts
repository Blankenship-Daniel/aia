/**
 * Command Registry Implementation
 * Manages command registration and resolution
 */
import { ICommandRegistry } from '../interfaces/ICommandRegistry';
import { ICommand } from '../interfaces/ICommand';

export class CommandRegistry implements ICommandRegistry {
  private commands: Map<string, ICommand> = new Map();
  private aliases: Map<string, string> = new Map();

  /**
   * Register a command
   */
  register(command: ICommand): void {
    if (!command || typeof command.execute !== 'function') {
      throw new Error('Invalid command: must implement execute method');
    }

    if (!command.getDefinition || typeof command.getDefinition !== 'function') {
      throw new Error('Invalid command: must implement getDefinition method');
    }

    const definition = command.getDefinition();
    if (!definition.name) {
      throw new Error('Invalid command: definition must have a name');
    }

    // Register the command
    this.commands.set(definition.name, command);

    // Register aliases if any
    if (definition.aliases) {
      for (const alias of definition.aliases) {
        this.registerAlias(alias, definition.name);
      }
    }

    console.log(`Command registered: ${definition.name}`);
  }

  /**
   * Unregister a command
   */
  unregister(name: string): boolean {
    const command = this.commands.get(name);
    if (!command) {
      return false;
    }

    // Remove aliases
    const definition = command.getDefinition();
    if (definition.aliases) {
      for (const alias of definition.aliases) {
        this.aliases.delete(alias);
      }
    }

    // Remove command
    this.commands.delete(name);
    console.log(`Command unregistered: ${name}`);
    return true;
  }

  /**
   * Get a command by name
   */
  getCommand(name: string): ICommand | null {
    return this.commands.get(name) || null;
  }

  /**
   * Get all registered commands
   */
  getAllCommands(): Map<string, ICommand> {
    return new Map(this.commands);
  }

  /**
   * Check if command exists
   */
  hasCommand(name: string): boolean {
    return this.commands.has(name) || this.aliases.has(name);
  }

  /**
   * Get command names
   */
  getCommandNames(): string[] {
    return Array.from(this.commands.keys());
  }

  /**
   * Register command alias
   */
  registerAlias(alias: string, commandName: string): void {
    if (!this.commands.has(commandName)) {
      throw new Error(
        `Cannot create alias '${alias}': command '${commandName}' not found`
      );
    }

    if (this.aliases.has(alias) || this.commands.has(alias)) {
      throw new Error(`Alias '${alias}' already exists`);
    }

    this.aliases.set(alias, commandName);
  }

  /**
   * Resolve command or alias
   */
  resolveCommand(nameOrAlias: string): ICommand | null {
    // Check direct command first
    const directCommand = this.commands.get(nameOrAlias);
    if (directCommand) {
      return directCommand;
    }

    // Check alias
    const aliasTarget = this.aliases.get(nameOrAlias);
    if (aliasTarget) {
      return this.commands.get(aliasTarget) || null;
    }

    return null;
  }

  /**
   * Clear all commands
   */
  clear(): void {
    this.commands.clear();
    this.aliases.clear();
    console.log('All commands cleared from registry');
  }

  /**
   * Get registry statistics
   */
  getStats(): {
    commandCount: number;
    aliasCount: number;
    commands: string[];
    aliases: Record<string, string>;
  } {
    return {
      commandCount: this.commands.size,
      aliasCount: this.aliases.size,
      commands: Array.from(this.commands.keys()),
      aliases: Object.fromEntries(this.aliases),
    };
  }

  /**
   * List all commands with their definitions
   */
  listCommands(): Array<{
    name: string;
    description: string;
    aliases: string[];
  }> {
    return Array.from(this.commands.values()).map((command) => {
      const definition = command.getDefinition();
      return {
        name: definition.name,
        description: definition.description,
        aliases: definition.aliases || [],
      };
    });
  }
}
