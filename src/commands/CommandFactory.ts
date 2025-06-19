import { ICommand } from '../interfaces/ICommand';
import { IAIService } from '../interfaces/IAIService';
import { IMemoryService } from '../interfaces/IMemoryService';
import { IContextService } from '../interfaces/IContextService';
import { ICommandService } from '../interfaces/ICommandService';
import { IConfigurationService } from '../interfaces/IConfigurationService';
import { AskCommand } from './AskCommand';
import { ExecuteCommand } from './ExecuteCommand';
import { ContextCommand } from './ContextCommand';
import { MemoryCommand } from './MemoryCommand';
import { ConfigCommand } from './ConfigCommand';
import { AgentCommand } from './AgentCommand';
import { IndexCommand } from './IndexCommand';

export class CommandFactory {
  constructor(
    private aiService: IAIService,
    private memoryService: IMemoryService,
    private contextService: IContextService,
    private commandService: ICommandService,
    private configurationService: IConfigurationService
  ) {}

  public createCommand(name: string): ICommand | null {
    switch (name.toLowerCase()) {
      case 'ask':
      case 'q':
      case 'query':
        return new AskCommand(
          this.aiService,
          this.contextService,
          this.memoryService
        );

      case 'exec':
      case 'x':
      case 'execute':
        return new ExecuteCommand(
          this.commandService,
          this.contextService,
          this.memoryService
        );

      case 'context':
      case 'ctx':
      case 'info':
        return new ContextCommand(this.contextService);

      case 'memory':
      case 'mem':
      case 'stats':
        return new MemoryCommand(this.memoryService);

      case 'config':
      case 'cfg':
      case 'configure':
        return new ConfigCommand(this.configurationService);

      case 'agent':
      case 'a':
      case 'agentic':
        return new AgentCommand(
          this.aiService,
          this.contextService,
          this.commandService,
          this.memoryService
        );

      case 'index':
      case 'idx':
      case 'build':
        return new IndexCommand();

      default:
        return null;
    }
  }

  public getAllCommands(): Map<string, ICommand> {
    const commands = new Map<string, ICommand>();

    // Register all commands with their primary names
    const commandList = [
      'ask',
      'exec',
      'context',
      'memory',
      'config',
      'agent',
      'index',
    ];

    for (const commandName of commandList) {
      const command = this.createCommand(commandName);
      if (command) {
        commands.set(commandName, command);
      }
    }

    return commands;
  }

  public getCommandByAlias(alias: string): ICommand | null {
    return this.createCommand(alias);
  }

  /**
   * Static method to register commands with a registry
   * Used by the CLI application to register all commands
   */
  public static registerCommands(
    commandRegistry: any, // ICommandRegistry
    services: any
  ): number {
    const factory = new CommandFactory(
      services.aiService,
      services.memoryService,
      services.contextService,
      services.commandService,
      services.configurationService
    );

    const commandNames = [
      'ask',
      'exec',
      'context',
      'memory',
      'config',
      'agent',
      'index',
    ];
    let registeredCount = 0;

    for (const commandName of commandNames) {
      const command = factory.createCommand(commandName);
      if (command) {
        commandRegistry.register(command);
        registeredCount++;
      }
    }

    return registeredCount;
  }

  /**
   * Static method to create all commands
   * Used by tests
   */
  public static createCommands(services: any): any[] {
    const factory = new CommandFactory(
      services.aiService,
      services.memoryService,
      services.contextService,
      services.commandService,
      services.configurationService
    );

    const commandNames = [
      'ask',
      'exec',
      'context',
      'memory',
      'config',
      'agent',
    ];
    const commands = [];

    for (const commandName of commandNames) {
      const command = factory.createCommand(commandName);
      if (command) {
        commands.push(command);
      }
    }

    return commands;
  }
}
