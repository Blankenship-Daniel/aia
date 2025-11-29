To create a comprehensive Jest test file for the `main.js` source code, we need to cover various aspects:

1. Ensure `CLIApplication` is instantiated and its `run` method is called.
2. Handle the scenario where the `run` method of `CLIApplication` fails and triggers the error logging and potential shutdown.
3. Implement a mock for `CLIApplication` since it's an external dependency.
4. Test if the `process.emitWarning` logic works as intended.

Here is a complete test file for `main.js`:

```javascript
// main.test.js

const { main } = require('./main'); // Import the main function for testing
const CLIApplication = require('./dist/cli/CLIApplication').default;

// Mocking CLIApplication
jest.mock('./dist/cli/CLIApplication', () => {
  return {
    default: jest.fn().mockImplementation(() => ({
      run: jest.fn(),
      shutdown: jest.fn(),
    })),
  };
});

describe('main function', () => {
  let originalConsoleError;
  let originalProcessExit;

  beforeAll(() => {
    // Mock console.error and process.exit
    originalConsoleError = console.error;
    console.error = jest.fn();

    originalProcessExit = process.exit;
    process.exit = jest.fn();
  });

  afterAll(() => {
    // Restore original console.error and process.exit
    console.error = originalConsoleError;
    process.exit = originalProcessExit;
  });

  it('should instantiate CLIApplication and call its run method', async () => {
    const cliMock = {
      run: jest.fn(),
      shutdown: jest.fn(),
    };

    CLIApplication.mockImplementation(() => cliMock);

    await main();

    expect(CLIApplication).toHaveBeenCalledTimes(1);
    expect(cliMock.run).toHaveBeenCalledTimes(1);
  });

  it('should handle errors and call shutdown if run fails', async () => {
    const cliMock = {
      run: jest.fn().mockRejectedValue(new Error('Run failed')),
      shutdown: jest.fn(),
    };

    CLIApplication.mockImplementation(() => cliMock);

    await main();

    expect(console.error).toHaveBeenCalledWith('Failed to start AIA:', 'Run failed');
    expect(cliMock.shutdown).toHaveBeenCalledTimes(1);
    expect(process.exit).toHaveBeenCalledWith(1);
  });

  it('should handle errors and log if shutdown fails', async () => {
    const cliMock = {
      run: jest.fn().mockRejectedValue(new Error('Run failed')),
      shutdown: jest.fn().mockRejectedValue(new Error('Shutdown failed')),
    };

    CLIApplication.mockImplementation(() => cliMock);

    await main();

    expect(console.error).toHaveBeenCalledWith('Failed to start AIA:', 'Run failed');
    expect(cliMock.shutdown).toHaveBeenCalledTimes(1);
    expect(console.error).toHaveBeenCalledWith('Failed to cleanup:', 'Shutdown failed');
    expect(process.exit).toHaveBeenCalledWith(1);
  });

  it('should suppress specific deprecation warnings', () => {
    const originalEmitWarning = process.emitWarning;

    process.emitWarning('DeprecationWarning', 'DeprecationWarning', undefined, 'punycode');
    expect(originalEmitWarning).not.toHaveBeenCalled();

    process.emitWarning('Some other warning', 'Warning');
    expect(originalEmitWarning).toHaveBeenCalledWith('Some other warning', 'Warning');

    process.emitWarning = originalEmitWarning; // Restore the original
  });
});
```

### Explanation:

1. **Mock Implementation:** We mock `CLIApplication` to control its behavior and test how `main` handles running and error scenarios. The mock object includes `run` and `shutdown` methods.
   
2. **Pre-test Setup:** Before all tests, we mock `console.error` to prevent