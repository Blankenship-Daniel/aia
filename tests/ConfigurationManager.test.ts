Based on the `ConfigurationManager` class you've shared, I'll create a comprehensive set of Jest tests that align with your project's requirements. These tests will include mocking of external dependencies like `fs-extra` and utilize the jest mocking utilities you mentioned. The tests will focus on key class functionalities, error handling, and the correct setup and teardown processes.

```typescript
// tests/ConfigurationManager.test.ts

import ConfigurationManager from '../src/ConfigurationManager';
import fs from 'fs-extra';
import inquirer from 'inquirer';
import path from 'path';
import os from 'os';
import { mocked } from 'ts-jest/utils';

// Import mock utilities
jest.mock('fs-extra');
jest.mock('inquirer');

describe('ConfigurationManager Test Suite', () => {
  let configManager: ConfigurationManager;
  const configDir = path.join(os.homedir(), '.aia');
  const configFile = path.join(configDir, 'config.json');
  
  beforeEach(() => {
    jest.clearAllMocks();
    mocked(fs.pathExists).mockResolvedValue(true);
    mocked(fs.readJson).mockResolvedValue({});
    mocked(fs.ensureDir).mockResolvedValue(undefined);
    mocked(inquirer.prompt).mockResolvedValue({
      openaiApiKey: 'mocked-api-key',
      preferredModel: 'gpt-4'
    });

    configManager = new ConfigurationManager(configDir);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Initialization', () => {
    it('should initialize with default configuration values', async () => {
      await configManager.initialize();
      expect(fs.ensureDir).toHaveBeenCalledWith(configDir);
      expect(fs.readJson).toHaveBeenCalledWith(configFile);

      const config = configManager.getConfig();
      expect(config.preferredModel).toBe('gpt-4');
    });
  });

  describe('Configuration Loading', () => {
    it('should load and merge configuration with defaults', async () => {
      mocked(fs.readJson).mockResolvedValueOnce({
        preferredModel: 'gpt-3.5-turbo'
      });

      await configManager.initialize();
      const config = configManager.getConfig();

      expect(config.preferredModel).toBe('gpt-3.5-turbo');
      expect(config.maxAgentIterations).toBe(5); // Default value
    });

    it('should handle missing configuration file gracefully', async () => {
      mocked(fs.pathExists).mockResolvedValueOnce(false);

      await configManager.initialize();
      expect(fs.writeJson).toHaveBeenCalledWith(configFile, expect.anything(), { spaces: 2 });
      
      const config = configManager.getConfig();
      expect(config.preferredModel).toBe('gpt-4'); // Default value
    });
  });

  describe('Error Handling', () => {
    it('should log an error and use defaults if configuration loading fails', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      const errorMessage = 'Mocked Error';
      mocked(fs.readJson).mockRejectedValue(new Error(errorMessage));

      await configManager.initialize();

      expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining('Failed to load main configuration:'), errorMessage);
      consoleErrorSpy.mockRestore();
    });
  });

  describe('Interactive Setup', () => {
    it('should perform quick setup and update configuration', async () => {
      const mockAnswers = {
        openaiApiKey: 'new-api-key',
        preferredModel: 'claude-3-sonnet',
      };

      mocked(inquirer.prompt).mockResolvedValueOnce(mockAnswers);

      await configManager.setupInteractiveConfig();
      const config = configManager.getConfig();

      expect(config.openaiApiKey).toBe(mockAnswers.openaiApiKey);
      expect(config.preferredModel).toBe(mockAnswers.preferredModel);
