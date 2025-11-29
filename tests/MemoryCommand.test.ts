To test the `MemoryCommand` class from your TypeScript CLI tool using Jest and following the specifics you provided, we need to cover both the main functional paths and the possible error scenarios. We'll also ensure our tests use dependency injection and mocking patterns, consistent with your interface-driven design. Below are the examples of tests for the `MemoryCommand` class:

```typescript
// __tests__/commands/MemoryCommand.test.ts

import { MemoryCommand } from '../../src/commands/MemoryCommand';
import { IMemoryService } from '../../src/interfaces/IMemoryService';
import { CommandOptions, CommandResult } from '../../src/types';
import { mockMemoryService } from '../__mocks__/MemoryServiceMock';
import { jest } from '@jest/globals';

describe('MemoryCommand', () => {
  let memoryService: IMemoryService;
  let command: MemoryCommand;
  let loggerMock: any;

  beforeEach(() => {
    memoryService = mockMemoryService();
    loggerMock = {
      info: jest.fn(),
      error: jest.fn(),
    };
    command = new MemoryCommand(memoryService, loggerMock);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getDefinition', () => {
    it('should return the correct command definition', () => {
      const definition = command.getDefinition();
      expect(definition).toBeDefined();
      expect(definition.name).toBe('memory');
      expect(definition.aliases).toContain('mem');
    });
  });

  describe('execute', () => {
    it('should show memory stats by default', async () => {
      const context = {};
      const args: string[] = [];
      const options: CommandOptions = {};

      memoryService.getStats = jest.fn().mockResolvedValue({
        totalConversations: 5,
        totalCommands: 10,
        memorySize: 2048,
        oldestEntry: '2023-05-01T14:48:00.000Z',
        newestEntry: '2023-10-15T14:48:00.000Z',
      });

      const result = await command.execute(context, args, options);

      expect(result.success).toBe(true);
      expect(memoryService.getStats).toBeCalledTimes(1);
    });

    it('should handle search command', async () => {
      const context = {};
      const args: string[] = [];
      const options: CommandOptions = { search: 'test', limit: 5 };

      memoryService.searchConversations = jest.fn().mockResolvedValue([]);
      memoryService.searchCommands = jest.fn().mockResolvedValue([]);

      const result = await command.execute(context, args, options);

      expect(result.success).toBe(true);
      expect(memoryService.searchConversations).toBeCalledWith('test', 5);
    });

    it('should handle export command', async () => {
      const context = {};
      const args: string[] = [];
      const options: CommandOptions = { export: 'backup.json' };

      memoryService.exportMemory = jest.fn().mockResolvedValue(undefined);

      const result = await command.execute(context, args, options);

      expect(result.success).toBe(true);
      expect(memoryService.exportMemory).toBeCalledWith('backup.json');
    });

    it('should handle clear command', async () => {
      const context = {};
      const args: string[] = [];
      const options: CommandOptions = { clear: true, force: true };

      memoryService.clearMemory = jest.fn().mockResolvedValue(undefined);

      const result = await command.execute(context, args, options);

      expect(result.success).toBe(true);
      expect(memoryService.clearMemory).toBeCalledTimes(1);
    });

    it('should log an error and return failure on exception', async () => {
      const context = {};
      const args: string[] = [];
