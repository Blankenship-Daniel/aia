import { ICommand } from '../src/interfaces/ICommand.js';
import { AskCommand } from '../src/commands/AskCommand.js';
import { ExecuteCommand } from '../src/commands/ExecuteCommand.js';
import { AgentCommand } from '../src/commands/AgentCommand.js';
import { ConfigCommand } from '../src/commands/ConfigCommand.js';
import { CommandFactory } from '../src/commands/CommandFactory.js';

// Mock services for testing
const mockAIService = {} as any;
const mockMemoryService = {} as any;
const mockContextService = {} as any;
const mockCommandService = {} as any;
const mockConfigurationService = {} as any;

describe('Command Interface Compliance', () => {
  test('AskCommand implements ICommand interface', () => {
    const command = new AskCommand(
      mockAIService,
      mockContextService,
      mockMemoryService
    );

    // Check that all ICommand methods exist
    expect(typeof command.execute).toBe('function');
    expect(typeof command.getDefinition).toBe('function');
    expect(typeof command.getName).toBe('function');
    expect(typeof command.getAliases).toBe('function');
    expect(typeof command.validateArgs).toBe('function');
    expect(typeof command.getHelp).toBe('function');

    // Test basic functionality
    expect(command.getName()).toBe('ask');
    expect(command.getAliases()).toEqual(['q', 'query']);

    const validation = command.validateArgs(['test query']);
    expect(validation.valid).toBe(true);
    expect(validation.errors).toEqual([]);

    const emptyValidation = command.validateArgs([]);
    expect(emptyValidation.valid).toBe(false);
    expect(emptyValidation.errors.length).toBeGreaterThan(0);
  });

  test('ExecuteCommand implements ICommand interface', () => {
    const command = new ExecuteCommand(
      mockCommandService,
      mockContextService,
      mockMemoryService
    );

    // Check that all ICommand methods exist
    expect(typeof command.execute).toBe('function');
    expect(typeof command.getDefinition).toBe('function');
    expect(typeof command.getName).toBe('function');
    expect(typeof command.getAliases).toBe('function');
    expect(typeof command.validateArgs).toBe('function');
    expect(typeof command.getHelp).toBe('function');

    // Test basic functionality
    expect(command.getName()).toBe('exec');
    expect(command.getAliases()).toEqual(['x', 'execute']);

    const validation = command.validateArgs(['ls', '-la']);
    expect(validation.valid).toBe(true);
    expect(validation.errors).toEqual([]);

    const emptyValidation = command.validateArgs([]);
    expect(emptyValidation.valid).toBe(false);
    expect(emptyValidation.errors.length).toBeGreaterThan(0);
  });

  test('AgentCommand implements ICommand interface', () => {
    const command = new AgentCommand(
      mockAIService,
      mockContextService,
      mockCommandService,
      mockMemoryService
    );

    // Check that all ICommand methods exist
    expect(typeof command.execute).toBe('function');
    expect(typeof command.getDefinition).toBe('function');
    expect(typeof command.getName).toBe('function');
    expect(typeof command.getAliases).toBe('function');
    expect(typeof command.validateArgs).toBe('function');
    expect(typeof command.getHelp).toBe('function');

    // Test basic functionality
    expect(command.getName()).toBe('agent');
    expect(command.getAliases()).toEqual(['a', 'agentic']);

    const validation = command.validateArgs(['optimize this project']);
    expect(validation.valid).toBe(true);
    expect(validation.errors).toEqual([]);

    const emptyValidation = command.validateArgs([]);
    expect(emptyValidation.valid).toBe(false);
    expect(emptyValidation.errors.length).toBeGreaterThan(0);
  });

  test('ConfigCommand implements ICommand interface', () => {
    const command = new ConfigCommand(mockConfigurationService);

    // Check that all ICommand methods exist
    expect(typeof command.execute).toBe('function');
    expect(typeof command.getDefinition).toBe('function');
    expect(typeof command.getName).toBe('function');
    expect(typeof command.getAliases).toBe('function');
    expect(typeof command.validateArgs).toBe('function');
    expect(typeof command.getHelp).toBe('function');

    // Test basic functionality
    expect(command.getName()).toBe('config');
    expect(command.getAliases()).toEqual(['cfg', 'configure']);

    const validation = command.validateArgs([]);
    expect(validation.valid).toBe(true);
    expect(validation.errors).toEqual([]);
  });

  test('CommandFactory creates valid ICommand instances', () => {
    const factory = new CommandFactory(
      mockAIService,
      mockMemoryService,
      mockContextService,
      mockCommandService,
      mockConfigurationService
    );

    const commands = ['ask', 'exec', 'agent', 'config'];

    commands.forEach((commandName) => {
      const command = factory.createCommand(commandName);
      expect(command).not.toBeNull();

      if (command) {
        // Verify it implements ICommand interface
        expect(typeof command.execute).toBe('function');
        expect(typeof command.getDefinition).toBe('function');
        expect(typeof command.getName).toBe('function');
        expect(typeof command.getAliases).toBe('function');
        expect(typeof command.validateArgs).toBe('function');
        expect(typeof command.getHelp).toBe('function');
      }
    });

    // Test invalid command
    const invalidCommand = factory.createCommand('invalid');
    expect(invalidCommand).toBeNull();
  });

  test('All commands have consistent definition structure', () => {
    const commands = [
      new AskCommand(mockAIService, mockContextService, mockMemoryService),
      new ExecuteCommand(
        mockCommandService,
        mockContextService,
        mockMemoryService
      ),
      new AgentCommand(
        mockAIService,
        mockContextService,
        mockCommandService,
        mockMemoryService
      ),
      new ConfigCommand(mockConfigurationService),
    ];

    commands.forEach((command) => {
      const definition = command.getDefinition();

      expect(definition).toHaveProperty('name');
      expect(definition).toHaveProperty('description');
      expect(typeof definition.name).toBe('string');
      expect(typeof definition.description).toBe('string');
      expect(definition.name.length).toBeGreaterThan(0);
      expect(definition.description.length).toBeGreaterThan(0);

      if (definition.aliases) {
        expect(Array.isArray(definition.aliases)).toBe(true);
      }

      if (definition.examples) {
        expect(Array.isArray(definition.examples)).toBe(true);
      }

      if (definition.options) {
        expect(Array.isArray(definition.options)).toBe(true);
        definition.options.forEach((option) => {
          expect(option).toHaveProperty('name');
          expect(option).toHaveProperty('description');
          expect(option).toHaveProperty('type');
          expect(['string', 'number', 'boolean']).toContain(option.type);
        });
      }
    });
  });
});
