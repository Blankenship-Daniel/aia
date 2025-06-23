import CommandHandler from '../dist/CommandHandler.js';

interface MockAIA {
  context: {
    workingDirectory: string;
  };
  memory: {
    commands: any[];
  };
  memoryManager: {
    memory: { commands: any[] };
  };
  commandIntelligence: {
    suggestCommandOptimization: jest.Mock;
  };
  saveMemory: jest.Mock;
}

describe('CommandHandler', () => {
  let commandHandler: CommandHandler;
  let mockAIA: MockAIA;

  beforeEach(() => {
    // Mock AIA instance
    mockAIA = {
      context: {
        workingDirectory: process.cwd(),
      },
      memory: {
        commands: [],
      },
      memoryManager: {
        memory: { commands: [] },
      },
      commandIntelligence: {
        suggestCommandOptimization: jest.fn().mockReturnValue({
          suggestion: null,
          reason: '',
        }),
      },
      saveMemory: jest.fn(),
    };

    commandHandler = new CommandHandler(mockAIA as any);
    // Clear previous mock calls
    jest.clearAllMocks();
    // Reset commands array
    mockAIA.memory.commands = [];
  });

  afterEach(() => {
    // Clean up any active processes
    commandHandler.killActiveProcesses();
  });

  describe('Command Execution', () => {
    test('should execute simple commands successfully', async () => {
      const result = await commandHandler.executeCommand('echo', ['test']);

      expect(result).toHaveProperty('success', true);
      expect(result).toHaveProperty('code', 0);
    });

    test('should handle command arguments correctly', async () => {
      const result = await commandHandler.executeCommand('echo', [
        'hello',
        'world',
      ]);

      expect(result).toHaveProperty('success', true);
      expect(result).toHaveProperty('code', 0);
    });

    test('should handle command failures gracefully', async () => {
      try {
        await commandHandler.executeCommand('nonexistent-command-xyz', []);
      } catch (error) {
        expect(error).toBeDefined();
      }
    });
  });

  describe('Command Recording', () => {
    test('should record commands in memory', async () => {
      await commandHandler.recordCommand('test command');

      expect(mockAIA.memory.commands).toHaveLength(1);
      expect(mockAIA.memory.commands[0]).toHaveProperty(
        'command',
        'test command'
      );
      expect(mockAIA.memory.commands[0]).toHaveProperty('timestamp');
      expect(mockAIA.memory.commands[0]).toHaveProperty('workingDirectory');
    });

    test('should limit command history to 100 entries', async () => {
      // Add 105 commands
      for (let i = 0; i < 105; i++) {
        await commandHandler.recordCommand(`command ${i}`);
      }

      expect(mockAIA.memory.commands).toHaveLength(100);
    });
  });

  describe('Process Management', () => {
    test('should track active processes', () => {
      expect(commandHandler.getActiveProcesses()).toEqual([]);
    });

    test('should kill active processes', () => {
      commandHandler.killActiveProcesses();
      expect(commandHandler.getActiveProcesses()).toEqual([]);
    });
  });
});
