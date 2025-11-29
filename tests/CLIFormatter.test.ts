To create Jest tests for the `CLIFormatter` class following best practices, we focus on testing the core functions, including both success and error scenarios. We'll mock external dependencies using Jest and organize our tests to reflect the structure and responsibilities of `CLIFormatter`.

Firstly, we'll mock the external libraries `chalk` and `ora`, commonly used in CLI applications for styling and spinner functionality. Since you mentioned to leverage comprehensive mocking patterns, we'll place mocks in `tests/__mocks__`.

Let's define the Jest tests while following the instructions:

### Mocks

Create a mock file in `tests/__mocks__/chalk.ts`:

```typescript
const mockChalk = {
  green: jest.fn((text) => text),
  red: jest.fn((text) => text),
  yellow: jest.fn((text) => text),
  blue: jest.fn((text) => text),
  cyan: jest.fn((text) => text),
  gray: jest.fn((text) => text),
  white: jest.fn((text) => text),
  bold: { blue: jest.fn((text) => text) }
};

module.exports = { Chalk: jest.fn(() => mockChalk) };
```

Create a mock file in `tests/__mocks__/ora.ts`:

```typescript
const mockSpinner = {
  start: jest.fn().mockReturnThis(),
  succeed: jest.fn(),
  fail: jest.fn(),
  stop: jest.fn()
};

module.exports = jest.fn(() => mockSpinner);
module.exports.Ora = jest.fn(() => mockSpinner);
```

### Jest Tests

Create a test file `src/__tests__/CLIFormatter.test.ts`:

```typescript
import { CLIFormatter } from '../CLIFormatter';
import ora from 'ora';
import chalk from 'chalk'; // Will automatically use the mock due to jest.config setting

describe('CLIFormatter', () => {
  let formatter: CLIFormatter;
  let consoleSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    formatter = new CLIFormatter();
    consoleSpy = jest.spyOn(console, 'log').mockImplementation();
  });

  afterEach(() => {
    consoleSpy.mockRestore();
  });

  describe('displaySuccess', () => {
    it('should display a success message without details', () => {
      formatter.displaySuccess('Operation completed');
      expect(consoleSpy).toHaveBeenCalledWith('✅ Operation completed');
    });

    it('should display a success message with string details', () => {
      formatter.displaySuccess('File saved', 'path: /tmp/file.json');
      expect(consoleSpy).toHaveBeenCalledWith('✅ File saved');
      expect(consoleSpy).toHaveBeenCalledWith('   path: /tmp/file.json');
    });

    it('should display a success message with object details', () => {
      formatter.displaySuccess('Data processed', { key: 'value' });
      expect(consoleSpy).toHaveBeenCalledWith('✅ Data processed');
      expect(consoleSpy).toHaveBeenCalledWith('   {\n  "key": "value"\n}');
    });
  });

  describe('displayError', () => {
    it('should display an error message from string', () => {
      formatter.displayError('File not found');
      expect(consoleSpy).toHaveBeenCalledWith('❌ Error: File not found');
    });

    it('should display an error message from Error object', () => {
      const error = new Error('File missing');
      formatter.displayError(error, 'Checking file system');
      expect(consoleSpy).toHaveBeenCalledWith('❌ Error: File missing');
      expect(consoleSpy).toHaveBeenCalledWith('   Context: Checking file system');
    });
  });

  describe('displayLoading', () => {
    it('should start a loading spinner', () => {
      const spinnerId = formatter.displayLoading('Processing files');
