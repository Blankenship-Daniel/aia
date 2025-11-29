To generate comprehensive Jest tests for the `CLIApplication` class, we'll follow the patterns you've described. This includes using mock utilities, setting up `beforeEach`/`afterEach` hooks, and testing various scenarios including success and error cases. We'll mock the external dependencies like `ServiceFactory`, `CommandRegistry`, and `UXEnhancements` to focus on testing the `CLIApplication`'s behavior.

Here is a sample test file that aligns with your project's requirements:

```typescript
// tests/cli/CLIApplication.test.ts

import CLIApplication from '../../src/cli/CLIApplication';
import { Command } from 'commander';
import {
  ServiceFactory,
  CommandRegistry,
  UXEnhancements
} from '../../src/services'; // Import mocks for these services

jest.mock('../../src/services/CommandRegistry');
jest.mock('../../src/container/ServiceFactory');
jest.mock('../../src/utils/UXEnhancements');

describe('CLIApplication - Main Application Class', () => {
  let app: CLIApplication;
  let mockConsoleError: jest.SpyInstance;
  let mockProcessExit: jest.SpyInstance;

  beforeEach(() => {
    app = new CLIApplication();
    mockConsoleError = jest.spyOn(console, 'error').mockImplementation(() => {});
    mockProcessExit = jest.spyOn(process, 'exit').mockImplementation(() => {
      throw new Error('process.exit called');
    });

    // Mock ServiceFactory and CommandRegistry functionality
    const mockContainer = {
      resolve: jest.fn().mockImplementation((serviceName: string) => {
        switch (serviceName) {
          case 'configuration':
            return { cleanup: jest.fn() };
          case 'command':
            return {};
          case 'interactiveCLI':
            return { 
              startInteractiveMode: jest.fn().mockResolvedValue(true) 
            };
          case 'commandRegistry':
            return new CommandRegistry();
          default:
            return {};
        }
      }),
      initialize: jest.fn().mockResolvedValue(true),
      dispose: jest.fn().mockResolvedValue(true),
    };

    (ServiceFactory.createContainer as jest.Mock).mockReturnValue(mockContainer);
    (CommandRegistry as jest.Mock).mockImplementation(() => ({
      register: jest.fn(),
      resolveCommand: jest.fn().mockReturnValue({
        execute: jest.fn().mockResolvedValue({ success: true })
      }),
    }));
  });

  afterEach(() => {
    mockConsoleError.mockRestore();
    mockProcessExit.mockRestore();
    jest.clearAllMocks();
  });

  it('should initialize dependencies and set up commands successfully', async () => {
    await app.initialize();
    expect(ServiceFactory.createContainer).toHaveBeenCalled();
    expect(app.getContainer()).not.toBeNull();
    expect(app.isInitialized()).toBe(true);
  });

  it('should handle errors during initialization gracefully', async () => {
    (ServiceFactory.createContainer as jest.Mock).mockImplementationOnce(() => {
      throw new Error('Container initialization failed');
    });

    await expect(app.initialize()).rejects.toThrow('Container initialization failed');
    expect(mockConsoleError).toHaveBeenCalledWith(expect.stringContaining('Failed to initialize CLI application:'), 'Container initialization failed');
  });

  it('should run the application and enter interactive mode with no args', async () => {
    const mockInteractiveMode = jest.fn().mockResolvedValue(true);
    ((app.getContainer()?.resolve('interactiveCLI') as any).startInteractiveMode as jest.Mock).mockImplementation(mockInteractiveMode);

    await app.run(['node', 'aia']);
    expect(mockInteractiveMode).toHaveBeenCalled();
  });

  it('should handle unknown command errors gracefully', async () => {
    const mockProgramParse = jest.spyOn(Command.prototype, 'parseAsync').mockRejectedValue(new Error('Unknown command'));
    await expect(app.run(['node', 'aia', 'unknownCommand'])).rejects.toThrow('Unknown