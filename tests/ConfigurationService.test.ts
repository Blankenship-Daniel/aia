To generate Jest tests for the `ConfigurationService` in TypeScript, follow the project's interface-driven development pattern, utilize comprehensive mocking strategies, and ensure proper dependency injection. Below is a comprehensive example of how you could write tests for `ConfigurationService` with attention to both successful and error scenarios.

```typescript
// tests/services/ConfigurationService.test.ts

import { ConfigurationService } from '../../src/services/ConfigurationService';
import { IConfigurationService } from '../../src/interfaces/IConfigurationService';
import { AIAConfig, ConfigProfile, AsyncResult } from '../../src/types';
import * as fs from 'fs-extra';
import * as path from 'path';

// Mocks
jest.mock('fs-extra');
jest.mock('path');

describe('ConfigurationService', () => {
  let configService: IConfigurationService;
  const mockDefaultConfig: Partial<AIAConfig> = {
    preferredModel: 'claude-3-5-sonnet-20241022',
    autoExecute: false,
    plugins: {},
    profiles: {},
    outputDirectories: {
      prompts: './prompts',
    },
  };

  beforeEach(() => {
    (fs.ensureDir as jest.Mock).mockClear();
    (fs.pathExists as jest.Mock).mockResolvedValue(true);
    (fs.readJson as jest.Mock).mockResolvedValue(mockDefaultConfig);

    configService = new ConfigurationService();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('initialize', () => {
    it('should initialize and load configuration from file system', async () => {
      await configService.initialize();

      const config = configService.getConfiguration();
      expect(config).toEqual(expect.objectContaining(mockDefaultConfig));
      expect(fs.ensureDir).toHaveBeenCalledTimes(2);
    });

    it('should fallback to default configuration on error', async () => {
      (fs.readJson as jest.Mock).mockRejectedValueOnce(new Error('Read Error'));

      await configService.initialize();

      const config = configService.getConfiguration();
      expect(config).toEqual(expect.objectContaining(mockDefaultConfig));
      expect(fs.ensureDir).toHaveBeenCalledTimes(2);
    });
  });

  describe('loadConfiguration', () => {
    it('should load configuration if path exists', async () => {
      const config = await configService.loadConfiguration();
      expect(config).toEqual(expect.objectContaining(mockDefaultConfig));
      expect(fs.pathExists).toHaveBeenCalledWith(expect.any(String));
      expect(fs.readJson).toHaveBeenCalledWith(expect.any(String));
    });

    it('should return default configuration on error', async () => {
      (fs.readJson as jest.Mock).mockRejectedValueOnce(new Error('Read Error'));

      const config = await configService.loadConfiguration();
      expect(config).toEqual(expect.objectContaining(mockDefaultConfig));
    });
  });

  describe('saveConfiguration', () => {
    it('should save configuration with a valid file', async () => {
      (configService as ConfigurationService).validateConfiguration = jest
        .fn()
        .mockResolvedValue({ success: true, data: mockDefaultConfig });

      await configService.saveConfiguration(mockDefaultConfig as AIAConfig);

      expect(fs.writeJson).toHaveBeenCalledWith(
        expect.any(String), 
        mockDefaultConfig, 
        { spaces: 2 }
      );
    });

    it('should throw error if configuration validation fails', async () => {
      (configService as ConfigurationService).validateConfiguration = jest
        .fn()
        .mockResolvedValue({ success: false, error: 'Validation Error' });

      await expect(
        configService.saveConfiguration(mockDefaultConfig as AIAConfig)
      ).rejects.toThrow('Configuration validation failed: Validation Error');
    });
  });

  describe('createProfile', () => {
    it('should create a new profile', async () => {
      await configService.createProfile('testProfile