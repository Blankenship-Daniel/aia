// Jest test setup file
import { jest } from '@jest/globals';

// Global test timeout
jest.setTimeout(30000);

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
