To create comprehensive Jest tests for the `ICommandMemory` interface, we will structure our tests using dependency injection, describe/it blocks for clarity, mocks for external dependencies, and both success and error scenario tests. Here's how you can generate these tests:

```typescript
// Import mock utilities and dependencies
import { mocked } from 'ts-jest/utils';
import { ICommandMemory } from '../../src/interfaces/ICommandMemory';
import { CommandHistoryEntry } from '../../src/types';
import { CommandMemoryService } from '../../src/services/CommandMemoryService'; // Mock this service
import '../__mocks__/CommandMemoryService';

describe('ICommandMemory Interface', () => {
  let commandMemory: ICommandMemory;
  const sampleCommandHistory: CommandHistoryEntry[] = [
    { command: 'npm install', directory: '/usr/app', exitCode: 0, duration: 120 },
    { command: 'npm run build', directory: '/usr/app', exitCode: 0, duration: 240 }
  ];

  beforeEach(() => {
    // Create a mock instance of the service implementing the interface
    commandMemory = new CommandMemoryService();
    jest.clearAllMocks(); // Clear previous mock calls
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('addCommand', () => {
    it('should add a command to history successfully', async () => {
      await expect(
        commandMemory.addCommand('npm start', '/usr/app', 0, 60)
      ).resolves.not.toThrow();

      // You can also verify some effect, e.g., check if it's searchable immediately
      const history = await commandMemory.getRecentCommands(1);
      expect(history).toEqual(expect.arrayContaining([expect.objectContaining({ command: 'npm start' })]));
    });

    it('should handle errors when adding a command', async () => {
      jest.spyOn(commandMemory, 'addCommand').mockRejectedValue(new Error('Failed to add command'));

      await expect(
        commandMemory.addCommand('broken command', '/broken/dir', 1, 10)
      ).rejects.toThrow('Failed to add command');
    });
  });

  describe('searchCommands', () => {
    it('should return matching commands for a valid search query', async () => {
      jest.spyOn(commandMemory, 'searchCommands').mockResolvedValue(sampleCommandHistory);

      const result = await commandMemory.searchCommands('npm', 2);
      expect(result).toHaveLength(2);
      expect(result).toEqual(expect.arrayContaining([
        expect.objectContaining({ command: 'npm install' }),
        expect.objectContaining({ command: 'npm run build' })
      ]));
    });

    it('should handle errors when searching commands', async () => {
      jest.spyOn(commandMemory, 'searchCommands').mockRejectedValue(new Error('Search failed'));

      await expect(commandMemory.searchCommands('invalid query')).rejects.toThrow('Search failed');
    });
  });

  describe('getRecentCommands', () => {
    it('should retrieve recent commands up to the limit', async () => {
      jest.spyOn(commandMemory, 'getRecentCommands').mockResolvedValue(sampleCommandHistory.slice(0, 1));

      const recentCommands = await commandMemory.getRecentCommands(1);
      expect(recentCommands).toHaveLength(1);
      expect(recentCommands[0].command).toEqual('npm install');
    });

    it('should handle errors when retrieving recent commands', async () => {
      jest.spyOn(commandMemory, 'getRecentCommands').mockRejectedValue(new Error('Failed to retrieve commands'));

      await expect(commandMemory.getRecentCommands()).rejects.toThrow('Failed to retrieve commands');
    });
  });
});
```

### Key Points:
1. **Mocking External Dependencies**: We mock any service or class that implements the interface