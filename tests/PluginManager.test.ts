Certainly! Below is a sample Jest test file for the `PluginManager` class in `PluginManager.ts` following your requirements:

```typescript
import fs from 'fs-extra';
import path from 'path';
import PluginManager from '../src/PluginManager';
import { mocked } from 'ts-jest/utils'; // Import `mocked` utility to help with mocking

// Mock external dependencies
jest.mock('fs-extra');
jest.mock('path');

// Mocking fs-extra methods
const ensureDirMock = mocked(fs.ensureDir);
const readdirMock = mocked(fs.readdir);
const statMock = mocked(fs.stat);
const pathExistsMock = mocked(fs.pathExists);
const readFileMock = mocked(fs.readFile);
const readJsonMock = mocked(fs.readJson);
const writeJsonMock = mocked(fs.writeJson);

// Mocking path methods
const joinMock = mocked(path.join);

// Sample data
const pluginName = 'test-plugin';
const pluginDir = '/plugins';
const pluginJsonContent = {
  name: pluginName,
  version: '1.0.0',
  main: 'index.js',
};

// Mocked PluginManager instance
let pluginManager: PluginManager;

describe('PluginManager', () => {
  // Set up and tear down
  beforeEach(() => {
    pluginManager = new PluginManager(pluginDir);
    jest.clearAllMocks();
  });

  describe('loadAllPlugins', () => {
    it('should load all plugins successfully', async () => {
      // Setup mocks for a successful scenario
      pathExistsMock.mockResolvedValue(true);
      readdirMock.mockResolvedValue(['plugin1', 'plugin2']);
      statMock.mockResolvedValue({ isDirectory: () => true } as fs.Stats);
      readJsonMock.mockResolvedValue(pluginJsonContent);
      pathExistsMock.mockResolvedValue(true);
      readFileMock.mockResolvedValue(`module.exports = {};`);
  
      const result = await pluginManager.loadAllPlugins();
  
      expect(result).toEqual({ loaded: 2, failed: 0 });
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('✅ Loaded 2 plugins successfully')
      );
    });
  
    it('should handle errors during plugin loading', async () => {
      // Setup mocks for an error scenario
      pathExistsMock.mockRejectedValue(new Error('Error ensuring directory'));
  
      const result = await pluginManager.loadAllPlugins();
  
      expect(result).toEqual({ loaded: 0, failed: 0 });
      expect(console.error).toHaveBeenCalledWith(
        expect.stringContaining('Plugin loading error:')
      );
    });
  });

  describe('loadPlugin', () => {
    it('should load a plugin successfully', async () => {
      // Setup mocks for a successful scenario
      pathExistsMock.mockResolvedValue(true);
      readJsonMock.mockResolvedValue(pluginJsonContent);
      pathExistsMock.mockResolvedValue(true);
      readFileMock.mockResolvedValue(`module.exports = { initialize: async () => {} };`);
  
      const plugin = await pluginManager.loadPlugin(pluginName);
  
      expect(plugin).toBeDefined();
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining(`✅ Plugin loaded: ${pluginName} v1.0.0`)
      );
    });
  
    it('should handle missing manifest file', async () => {
      // Setup mocks for missing manifest
      pathExistsMock.mockResolvedValue(false);
  
      await expect(pluginManager.loadPlugin(pluginName)).rejects.toThrow('Plugin manifest not found');
    });
  
    it('should handle invalid plugin code', async () => {
      // Setup mocks for invalid plugin code
      pathExistsMock.mockResolvedValue(true);
      readJsonMock.mockResolvedValue(pluginJsonContent);
      pathExistsMock.mockResolvedValue(true);
      readFileMock.mockResolvedValue(`invalid javascript code`);
  
      await expect(pluginManager.load