To write a comprehensive Jest test file for the provided `jest.integration.config.js` configuration file, you can follow these steps. Since this is a configuration file, we mainly want to ensure that it exports the correct configuration object. Here's how you can set up the test:

1. Create a test file, named something like `jest.integration.config.test.js`, to test the configuration.
2. Since external dependencies and runtime behavior are minimal in configuration files, these tests will primarily verify that the exported object has the correct structure and values.
3. Use Jest's assertions to verify the properties of the configuration.
4. Mock the external files or paths if necessary, though it's usually minimal for config tests.

Here's a simple Jest test file for the configuration:

```javascript
// jest.integration.config.test.js

// Import the configuration
const config = require('./jest.integration.config');

describe('Jest Integration Config', () => {
  test('should have the correct displayName', () => {
    expect(config.displayName).toBe('Integration Tests');
  });

  test('should use ts-jest preset', () => {
    expect(config.preset).toBe('ts-jest');
  });

  test('should use node test environment', () => {
    expect(config.testEnvironment).toBe('node');
  });

  test('should specify the correct roots', () => {
    expect(config.roots).toEqual(['<rootDir>/tests/integration']);
  });

  test('should match correct test files', () => {
    expect(config.testMatch).toEqual(['**/*.integration.test.ts']);
  });

  test('should include setup files after environment setup', () => {
    expect(config.setupFilesAfterEnv).toEqual(['<rootDir>/tests/integration/setup.ts']);
  });

  test('should set a test timeout of 60000 ms', () => {
    expect(config.testTimeout).toBe(60000);
  });

  test('should run tests sequentially with maxWorkers as 1', () => {
    expect(config.maxWorkers).toBe(1);
  });

  test('should be verbose', () => {
    expect(config.verbose).toBe(true);
  });

  test('should not collect coverage for integration tests', () => {
    expect(config.collectCoverage).toBe(false);
  });

  test('should specify correct global setup and teardown scripts', () => {
    expect(config.globalSetup).toBe('<rootDir>/tests/integration/globalSetup.ts');
    expect(config.globalTeardown).toBe('<rootDir>/tests/integration/globalTeardown.ts');
  });
});
```

### Key Points:

- **Basic Structure**: Each test case checks that the configuration options are set correctly.
- **Comprehensive Coverage**: Each property of the configuration object has a corresponding test.
- **Minimal External Dependencies**: Since the file primarily contains configuration data, no complex mocking is required.
- **Jest Best Practices**: Tests are grouped logically using `describe` for organizational purposes.

This approach ensures that any future changes to the configuration inadvertently affecting the integration tests can be quickly identified.