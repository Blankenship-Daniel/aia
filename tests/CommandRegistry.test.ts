To create a comprehensive set of Jest tests for the `CommandRegistry` class, we need to follow the outlined patterns and ensure that we cover both success and error scenarios. We'll mock external dependencies using Jest's mocking capabilities and set up the test environment using `beforeEach` and `afterEach`.

Here is an example of how the tests for `CommandRegistry.ts` might look:

```typescript
import { CommandRegistry } from '../src/services/CommandRegistry';
import { ICommand } from '../src/interfaces/ICommand';
import { createMockCommand } from '../tests/__mocks__/Command';

// Mocking utils
jest.mock('../src/interfaces/ICommand');

describe('CommandRegistry', () => {
  let commandRegistry: CommandRegistry;
  let mockCommand: jest.Mocked<ICommand>;

  beforeEach(() => {
    commandRegistry = new CommandRegistry();
    mockCommand = createMockCommand();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('register()', () => {
    it('should register a valid command', () => {
      commandRegistry.register(mockCommand);
      expect(commandRegistry.getCommand(mockCommand.getDefinition().name)).toBe(mockCommand);
    });

    it('should throw an error if command does not implement execute', () => {
      mockCommand.execute = undefined as unknown as jest.Mock;
      expect(() => commandRegistry.register(mockCommand)).toThrowError('Invalid command: must implement execute method');
    });

    it('should throw an error if command does not implement getDefinition', () => {
      mockCommand.getDefinition = undefined as unknown as jest.Mock;
      expect(() => commandRegistry.register(mockCommand)).toThrowError('Invalid command: must implement getDefinition method');
    });

    it('should throw an error if command definition lacks a name', () => {
      mockCommand.getDefinition.mockReturnValueOnce({ name: '' });
      expect(() => commandRegistry.register(mockCommand)).toThrowError('Invalid command: definition must have a name');
    });

    it('should register all aliases for a command', () => {
      const definition = mockCommand.getDefinition();
      commandRegistry.register(mockCommand);
      definition.aliases?.forEach(alias => {
        expect(commandRegistry.resolveCommand(alias)).toBe(mockCommand);
      });
    });
  });

  describe('unregister()', () => {
    it('should unregister a registered command', () => {
      commandRegistry.register(mockCommand);
      expect(commandRegistry.unregister(mockCommand.getDefinition().name)).toBe(true);
    });

    it('should return false if trying to unregister a non-existent command', () => {
      expect(commandRegistry.unregister('nonExistentCommand')).toBe(false);
    });

    it('should remove all aliases for a command on unregister', () => {
      commandRegistry.register(mockCommand);
      commandRegistry.unregister(mockCommand.getDefinition().name);
      mockCommand.getDefinition().aliases?.forEach(alias => {
        expect(commandRegistry.resolveCommand(alias)).toBeNull();
      });
    });
  });

  describe('resolveCommand()', () => {
    it('should resolve a command by its name', () => {
      commandRegistry.register(mockCommand);
      expect(commandRegistry.resolveCommand(mockCommand.getDefinition().name)).toBe(mockCommand);
    });

    it('should resolve a command by one of its aliases', () => {
      commandRegistry.register(mockCommand);
      const alias = mockCommand.getDefinition().aliases?.[0];
      if (alias) {
        expect(commandRegistry.resolveCommand(alias)).toBe(mockCommand);
      }
    });

    it('should return null for non-existent command or alias', () => {
      expect(commandRegistry.resolveCommand('unknown')).toBeNull();
    });
  });

  describe('clear()', () => {
    it('should clear all commands and aliases', () => {
      commandRegistry.register(mockCommand);
      commandRegistry.clear();
      expect(commandRegistry.getAllCommands().size).toBe