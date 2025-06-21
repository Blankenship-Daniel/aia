// Jest test setup file
import { jest, afterAll } from '@jest/globals';

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
