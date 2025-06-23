/**
 * Enhanced Jest Test Setup
 *
 * Provides comprehensive testing utilities and environment management
 */
import { jest, afterAll, beforeEach, afterEach } from '@jest/globals';
import * as fs from 'fs-extra';
import * as path from 'path';
import * as os from 'os';

/**
 * Enhanced test teardown and cleanup utilities
 */

// Track resources for cleanup
const activeResources = new Set<() => void>();
const activeTimeouts = new Set<any>();
const activeIntervals = new Set<any>();

// Override setTimeout to track timeouts
const originalSetTimeout = global.setTimeout;
global.setTimeout = ((callback: any, delay?: number, ...args: any[]) => {
  const timeout = originalSetTimeout(callback, delay, ...args);
  activeTimeouts.add(timeout);
  return timeout;
}) as any;

// Override setInterval to track intervals
const originalSetInterval = global.setInterval;
global.setInterval = ((callback: any, delay?: number, ...args: any[]) => {
  const interval = originalSetInterval(callback, delay, ...args);
  activeIntervals.add(interval);
  return interval;
}) as any;

// Override clearTimeout
const originalClearTimeout = global.clearTimeout;
global.clearTimeout = ((timeout: any) => {
  activeTimeouts.delete(timeout);
  originalClearTimeout(timeout);
}) as any;

// Override clearInterval
const originalClearInterval = global.clearInterval;
global.clearInterval = ((interval: any) => {
  activeIntervals.delete(interval);
  originalClearInterval(interval);
}) as any;

// Global cleanup function
const cleanup = () => {
  // Clear all active timeouts
  activeTimeouts.forEach((timeout) => {
    originalClearTimeout(timeout);
  });
  activeTimeouts.clear();

  // Clear all active intervals
  activeIntervals.forEach((interval) => {
    originalClearInterval(interval);
  });
  activeIntervals.clear();

  // Execute all cleanup functions
  activeResources.forEach((cleanupFn) => {
    try {
      cleanupFn();
    } catch (error) {
      console.warn('Error during cleanup:', error);
    }
  });
  activeResources.clear();
};

// Setup global cleanup hooks
beforeEach(() => {
  // Reset tracking for each test
  activeTimeouts.clear();
  activeIntervals.clear();
  activeResources.clear();
});

afterEach(() => {
  cleanup();
});

// Global teardown
afterAll(() => {
  cleanup();
  // Only force exit if we detect hanging processes
  if (activeTimeouts.size > 0 || activeIntervals.size > 0) {
    console.warn(
      'Warning: Active timers detected during teardown, forcing cleanup'
    );
    setTimeout(() => {
      if (activeTimeouts.size > 0 || activeIntervals.size > 0) {
        console.warn('Force exiting due to hanging timers');
        process.exit(0);
      }
    }, 100);
  }
});

// Global test timeout
jest.setTimeout(30000);

// Store original environment variables to restore after tests
const originalEnv = { ...process.env };

// Mock console methods to avoid noise in tests
global.console = {
  ...console,
  // Uncomment to silence console.log during tests
  // log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.AIA_CONFIG_DIR = '/tmp/aia-test';

// Set test API keys to prevent actual API calls during testing
process.env.ANTHROPIC_API_KEY = 'sk-ant-test123-mock-key-for-testing';
process.env.OPENAI_API_KEY = 'sk-test123-mock-key-for-testing';

// Global teardown: restore original environment after all tests
afterAll(() => {
  // Restore original environment variables
  Object.keys(process.env).forEach((key) => {
    if (originalEnv[key] !== undefined) {
      process.env[key] = originalEnv[key];
    } else {
      delete process.env[key];
    }
  });
});

// Helper function for tests that need to temporarily modify environment variables
declare global {
  var setupTestEnv: (env: Record<string, string>) => () => void;
  var createTestDir: (prefix?: string) => Promise<string>;
  var createTestConfig: (testDir: string) => Promise<string>;
  var TestUtils: {
    wait: (ms: number) => Promise<void>;
    createTempFile: (content?: string, extension?: string) => Promise<string>;
    verifyFileContent: (
      filePath: string,
      expectedContent?: string
    ) => Promise<boolean>;
    cleanup: (paths: string[]) => Promise<void>;
    mockCommandResult: (
      success?: boolean,
      output?: string,
      exitCode?: number
    ) => any;
  };
  var MockAIProvider: new (responses?: string[]) => {
    query: (prompt: string) => Promise<string>;
    getCallCount: () => number;
    reset: () => void;
    setResponses: (responses: string[]) => void;
  };
}

global.setupTestEnv = (env: Record<string, string>) => {
  const backup: Record<string, string | undefined> = {};

  // Backup current values and set new ones
  Object.entries(env).forEach(([key, value]) => {
    backup[key] = process.env[key];
    process.env[key] = value;
  });

  // Return cleanup function
  return () => {
    Object.entries(backup).forEach(([key, value]) => {
      if (value !== undefined) {
        process.env[key] = value;
      } else {
        delete process.env[key];
      }
    });
  };
};

/**
 * Create temporary test directory
 */
global.createTestDir = async (prefix = 'aia-test'): Promise<string> => {
  const testDir = path.join(os.tmpdir(), `${prefix}-${Date.now()}`);
  await fs.ensureDir(testDir);
  return testDir;
};

/**
 * Create test configuration
 */
global.createTestConfig = async (testDir: string): Promise<string> => {
  const configDir = path.join(testDir, '.aia');
  await fs.ensureDir(configDir);

  const config = {
    preferredModel: 'test-model',
    openaiApiKey: 'sk-test-openai-key',
    anthropicApiKey: 'sk-ant-test-anthropic-key',
  };

  const configPath = path.join(configDir, 'config.json');
  await fs.writeJson(configPath, config);

  return configPath;
};

/**
 * Test utilities
 */
global.TestUtils = {
  /**
   * Wait for a specified time
   */
  wait: (ms: number): Promise<void> =>
    new Promise((resolve) => setTimeout(resolve, ms)),

  /**
   * Create a temporary file with content
   */
  createTempFile: async (content = '', extension = '.tmp'): Promise<string> => {
    const tempPath = path.join(
      os.tmpdir(),
      `aia-test-${Date.now()}${extension}`
    );
    await fs.writeFile(tempPath, content);
    return tempPath;
  },

  /**
   * Verify file exists and has expected content
   */
  verifyFileContent: async (
    filePath: string,
    expectedContent?: string
  ): Promise<boolean> => {
    try {
      const exists = await fs.pathExists(filePath);
      if (!exists) return false;

      if (expectedContent !== undefined) {
        const content = await fs.readFile(filePath, 'utf8');
        return content === expectedContent;
      }

      return true;
    } catch {
      return false;
    }
  },

  /**
   * Clean up test files and directories
   */
  cleanup: async (paths: string[]): Promise<void> => {
    await Promise.all(
      paths.map(async (path) => {
        try {
          await fs.remove(path);
        } catch {
          // Ignore cleanup errors
        }
      })
    );
  },

  /**
   * Create a mock command execution result
   */
  mockCommandResult: (
    success = true,
    output = 'Mock output',
    exitCode = 0
  ) => ({
    success,
    output,
    exitCode,
    error: success ? null : 'Mock error',
    duration: 100,
  }),
};

/**
 * Mock AI Provider for testing
 */
global.MockAIProvider = class MockAIProvider {
  private responses: string[] = ['Mock AI response'];
  private callCount = 0;

  constructor(responses?: string[]) {
    if (responses) {
      this.responses = responses;
    }
  }

  async query(prompt: string): Promise<string> {
    const response = this.responses[this.callCount % this.responses.length];
    this.callCount++;
    return Promise.resolve(response);
  }

  getCallCount(): number {
    return this.callCount;
  }

  reset(): void {
    this.callCount = 0;
  }

  setResponses(responses: string[]): void {
    this.responses = responses;
    this.callCount = 0;
  }
};

/**
 * Test Data Management Utilities
 */
export class TestDataManager {
  private static tempDirs: string[] = [];
  private static tempFiles: string[] = [];

  /**
   * Create a temporary directory for test data
   */
  static async createTempDir(prefix = 'aia-test'): Promise<string> {
    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), `${prefix}-`));
    this.tempDirs.push(tempDir);
    return tempDir;
  }

  /**
   * Create a temporary file with specified content
   */
  static async createTempFile(
    content: string,
    extension = '.ts',
    prefix = 'test-file'
  ): Promise<string> {
    const tempDir = await this.createTempDir();
    const filePath = path.join(tempDir, `${prefix}${extension}`);
    await fs.writeFile(filePath, content);
    this.tempFiles.push(filePath);
    return filePath;
  }

  /**
   * Create a test project structure
   */
  static async createTestProject(
    structure: Record<string, string>
  ): Promise<string> {
    const projectDir = await this.createTempDir('test-project');

    for (const [filePath, content] of Object.entries(structure)) {
      const fullPath = path.join(projectDir, filePath);
      await fs.ensureDir(path.dirname(fullPath));
      await fs.writeFile(fullPath, content);
    }

    return projectDir;
  }

  /**
   * Clean up all temporary files and directories
   */
  static async cleanup(): Promise<void> {
    // Clean up temp files
    for (const file of this.tempFiles) {
      try {
        await fs.remove(file);
      } catch (error) {
        // Ignore cleanup errors
      }
    }

    // Clean up temp directories
    for (const dir of this.tempDirs) {
      try {
        await fs.remove(dir);
      } catch (error) {
        // Ignore cleanup errors
      }
    }

    this.tempDirs = [];
    this.tempFiles = [];
  }
}

/**
 * Enhanced AI Provider for Testing with pattern matching
 */
export class EnhancedMockAIProvider {
  private responses: Map<string, any> = new Map();
  private callHistory: Array<{ prompt: string; timestamp: Date }> = [];

  /**
   * Set mock response for a specific prompt pattern
   */
  setMockResponse(promptPattern: string | RegExp, response: any): void {
    const key =
      promptPattern instanceof RegExp ? promptPattern.source : promptPattern;
    this.responses.set(key, response);
  }

  /**
   * Mock query method
   */
  async query(prompt: string): Promise<any> {
    this.callHistory.push({ prompt, timestamp: new Date() });

    // Find matching response
    for (const [pattern, response] of this.responses) {
      const regex = new RegExp(pattern, 'i');
      if (regex.test(prompt)) {
        return typeof response === 'function' ? response(prompt) : response;
      }
    }

    // Default response
    return {
      content: `Mock response for: ${prompt.substring(0, 50)}...`,
      success: true,
    };
  }

  /**
   * Get call history for testing
   */
  getCallHistory(): Array<{ prompt: string; timestamp: Date }> {
    return [...this.callHistory];
  }

  /**
   * Clear call history and responses
   */
  reset(): void {
    this.responses.clear();
    this.callHistory = [];
  }
}

/**
 * Test Assertion Utilities
 */
export const TestAssertions = {
  /**
   * Assert that a file exists and has expected content
   */
  async fileExists(filePath: string): Promise<boolean> {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  },

  /**
   * Assert file content matches expected pattern
   */
  async fileContains(
    filePath: string,
    pattern: string | RegExp
  ): Promise<boolean> {
    try {
      const content = await fs.readFile(filePath, 'utf8');
      return typeof pattern === 'string'
        ? content.includes(pattern)
        : pattern.test(content);
    } catch {
      return false;
    }
  },

  /**
   * Assert that command execution produces expected output
   */
  async commandOutputMatches(
    command: string,
    expectedPattern: string | RegExp
  ): Promise<boolean> {
    const { exec } = require('child_process');
    return new Promise((resolve) => {
      exec(command, (error: any, stdout: string, stderr: string) => {
        const output = stdout + stderr;
        const matches =
          typeof expectedPattern === 'string'
            ? output.includes(expectedPattern)
            : expectedPattern.test(output);
        resolve(matches);
      });
    });
  },
};

/**
 * Performance Testing Utilities
 */
export class PerformanceTestUtil {
  /**
   * Measure execution time of an operation
   */
  static async measureTime<T>(
    operation: () => Promise<T> | T
  ): Promise<{ result: T; duration: number }> {
    const startTime = process.hrtime.bigint();
    const result = await operation();
    const endTime = process.hrtime.bigint();
    const duration = Number(endTime - startTime) / 1_000_000; // Convert to milliseconds

    return { result, duration };
  }

  /**
   * Run operation multiple times and get performance statistics
   */
  static async benchmark<T>(
    operation: () => Promise<T> | T,
    iterations = 10
  ): Promise<{
    average: number;
    min: number;
    max: number;
    total: number;
    results: T[];
  }> {
    const durations: number[] = [];
    const results: T[] = [];

    for (let i = 0; i < iterations; i++) {
      const { result, duration } = await this.measureTime(operation);
      durations.push(duration);
      results.push(result);
    }

    return {
      average: durations.reduce((a, b) => a + b, 0) / durations.length,
      min: Math.min(...durations),
      max: Math.max(...durations),
      total: durations.reduce((a, b) => a + b, 0),
      results,
    };
  }
}

/**
 * Integration Test Helpers
 */
export class IntegrationTestHelper {
  private static servers: Array<{ close: () => void }> = [];

  /**
   * Start a mock server for testing HTTP endpoints
   */
  static async startMockServer(
    port = 3000
  ): Promise<{ url: string; close: () => void }> {
    const express = require('express');
    const app = express();

    app.use(express.json());

    // Default endpoints for common testing scenarios
    app.get('/health', (req: any, res: any) => res.json({ status: 'ok' }));
    app.post('/api/test', (req: any, res: any) =>
      res.json({ received: req.body })
    );

    const server = app.listen(port);
    this.servers.push(server);

    return {
      url: `http://localhost:${port}`,
      close: () => server.close(),
    };
  }

  /**
   * Clean up all started servers
   */
  static cleanup(): void {
    this.servers.forEach((server) => {
      try {
        server.close();
      } catch (error) {
        // Ignore cleanup errors
      }
    });
    this.servers = [];
  }
}

/**
 * Register a cleanup function
 */
(global as any).registerCleanup = (cleanupFn: () => void) => {
  activeResources.add(cleanupFn);
};

/**
 * Set environment variables for testing
 */
(global as any).setTestEnv = (vars: Record<string, string>): (() => void) => {
  const backup: Record<string, string | undefined> = {};

  Object.entries(vars).forEach(([key, value]) => {
    backup[key] = process.env[key];
    process.env[key] = value;
  });

  const cleanupFn = () => {
    Object.entries(backup).forEach(([key, value]) => {
      if (value !== undefined) {
        process.env[key] = value;
      } else {
        delete process.env[key];
      }
    });
  };

  // Register cleanup
  activeResources.add(cleanupFn);
  return cleanupFn;
};

// Global cleanup after all tests
afterAll(async () => {
  await TestDataManager.cleanup();
  IntegrationTestHelper.cleanup();
});

// Export utilities for use in tests
export {
  TestDataManager as TempFiles,
  EnhancedMockAIProvider as MockAIProvider,
  TestAssertions as Assertions,
  PerformanceTestUtil as Performance,
  IntegrationTestHelper as Integration,
};
