To generate comprehensive Jest tests for the `InitCommand` in the AIA project, we need to adhere to the specified testing patterns and ensure coverage for both success and error scenarios. Here's a Jest test suite that follows the project's requirements:

```typescript
// tests/commands/InitCommand.test.ts

import { InitCommand } from '../../src/commands/InitCommand';
import { CommandOptions, CommandResult } from '../../src/types/index';
import * as fs from 'fs-extra';
import * as path from 'path';
import { mocked } from 'ts-jest/utils';

jest.mock('fs-extra');

describe('InitCommand', () => {
  let initCommand: InitCommand;
  const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();
  const projectRoot = '/mock/project/root';
  const templateRoot = '/mock/template/root';
  const docsRoot = '/mock/docs/root';
  const vscodeExtensionRoot = '/mock/vscode/extension/root';

  beforeEach(() => {
    initCommand = new InitCommand();
    jest.spyOn(process, 'cwd').mockReturnValue(projectRoot);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should initialize AIA configuration successfully', async () => {
    // Mocking successful scenarios
    mocked(fs.ensureDir).mockResolvedValueOnce();
    mocked(fs.pathExists).mockResolvedValue(false);
    mocked(fs.copy).mockResolvedValue();
    mocked(fs.readJSON).mockResolvedValueOnce({
      outputDirectories: { architecture: 'docs/architecture' }
    });

    const result: CommandResult = await initCommand.execute({}, [], {
      vscode: true,
      skipVscode: false,
      autoSetup: false
    });

    expect(result.success).toBe(true);
    expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('AIA initialization complete.'));
  });

  it('should skip VSCode extension installation when --skip-vscode is provided', async () => {
    // Mocking successful scenarios
    mocked(fs.ensureDir).mockResolvedValue();
    mocked(fs.pathExists).mockResolvedValue(false);
    mocked(fs.copy).mockResolvedValue();
    mocked(fs.readJSON).mockResolvedValueOnce({});

    const result: CommandResult = await initCommand.execute({}, ['--skip-vscode'], {
      vscode: true,
      skipVscode: true,
      autoSetup: false
    });

    expect(result.success).toBe(true);
    expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('VSCode extension installation skipped'));
  });

  it('returns an error if config.json cannot be read', async () => {
    // Mock to simulate error while reading config.json
    mocked(fs.ensureDir).mockResolvedValue();
    mocked(fs.pathExists).mockResolvedValue(false);
    mocked(fs.copy).mockResolvedValue();
    mocked(fs.readJSON).mockRejectedValue(new Error('File not found'));

    const result: CommandResult = await initCommand.execute({}, [], {
      vscode: true,
      skipVscode: false,
      autoSetup: false
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe('Failed to read config.json');
    expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('Error reading .aia/config.json:'));
  });

  it('should handle error if creating .aia directory fails', async () => {
    mocked(fs.ensureDir).mockRejectedValue(new Error('Permission denied'));

    const result: CommandResult = await initCommand.execute({}, [], {
      vscode: true,
      skipVscode: false,
      autoSetup: false
    });

    expect(result.success).toBe(false);
    expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('Error creating .aia directory:'), expect.any(Error));
  });

  it('should invoke VSCode extension installation if