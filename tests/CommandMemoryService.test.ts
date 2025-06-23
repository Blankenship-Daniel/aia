Here is a Jest test suite for the `CommandMemoryService` class from your TypeScript code, adhering to your project's testing patterns and practices:

```typescript
import { CommandMemoryService } from '../src/services/CommandMemoryService';
import { IMemoryPersistence } from '../src/interfaces/IMemoryPersistence';
import { CommandHistoryEntry } from '../src/types/index';

// Mock the IMemoryPersistence interface
jest.mock('../src/interfaces/IMemoryPersistence');

describe('CommandMemoryService', () => {
  let commandMemoryService: CommandMemoryService;
  let mockPersistence: jest.Mocked<IMemoryPersistence>;
  let memoryMockData: { commands: CommandHistoryEntry[] };

  beforeEach(() => {
    // Initial setup for the mock persistence layer
    memoryMockData = { commands: [] };

    // Initialize a new mock for every test
    mockPersistence = {
      loadMemory: jest.fn().mockResolvedValue(memoryMockData),
      saveMemory: jest.fn().mockResolvedValue(undefined)
    };

    commandMemoryService = new CommandMemoryService(mockPersistence);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('addCommand', () => {
    it('should successfully add a new command to memory', async () => {
      await commandMemoryService.addCommand('ls', '/home', 0, 100);

      expect(mockPersistence.loadMemory).toHaveBeenCalled();
      expect(mockPersistence.saveMemory).toHaveBeenCalledWith(expect.objectContaining({
        commands: expect.arrayContaining([
          expect.objectContaining({
            command: 'ls',
            workingDirectory: '/home',
            exitCode: 0,
            duration: 100,
            optimized: false
          })
        ])
      }));
    });

    it('should maintain a maximum of 500 commands', async () => {
      memoryMockData.commands = Array.from({ length: 501 }, (_, i) => ({
        command: `command${i}`,
        timestamp: new Date().toISOString(),
        workingDirectory: '/path',
        exitCode: 0,
        duration: 10,
        optimized: false
      }));

      await commandMemoryService.addCommand('newCommand', '/newPath', 0, 50);

      const savedMemory = mockPersistence.saveMemory.mock.calls[0][0];
      expect(savedMemory.commands).toHaveLength(500);
      expect(savedMemory.commands.some(cmd => cmd.command === 'newCommand')).toBe(true);
    });

    it('should throw an error if saving fails', async () => {
      mockPersistence.saveMemory.mockRejectedValueOnce(new Error('Save failed'));

      await expect(commandMemoryService.addCommand('ls', '/home', 0, 100))
        .rejects
        .toThrow('Save failed');
    });
  });

  describe('searchCommands', () => {
    it('should return matching commands based on query', async () => {
      memoryMockData.commands = [
        { command: 'make build', timestamp: '', workingDirectory: '', exitCode: 0, duration: 0, optimized: false },
        { command: 'make clean', timestamp: '', workingDirectory: '', exitCode: 0, duration: 0, optimized: false }
      ];

      const results = await commandMemoryService.searchCommands('build');

      expect(results).toHaveLength(1);
      expect(results[0].command).toBe('make build');
    });

    it('should limit the number of results returned', async () => {
      memoryMockData.commands = Array.from({ length: 20 }, (_, i) => ({
        command: `command${i}`,
        timestamp: '',
        workingDirectory: '',
        exitCode: 0,
        duration: 0,
        optimized: false
      }));

      const results = await commandMemoryService.searchCommands('command', 5);
      expect(results).toHaveLength(5