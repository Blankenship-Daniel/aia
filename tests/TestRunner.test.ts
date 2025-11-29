To generate Jest tests for the `TestRunner` class in your TypeScript project, we'll follow the patterns you've outlined, including thorough mocking and setup/teardown using `jest` and `jest.mock`. Given the sophisticated error handling and interface-driven approach of your CLI tool, let's implement unit tests for the main methods of the `TestRunner` class. 

We'll mock file system operations, console outputs, and any other dependencies as required. The tests will cover both success and error scenarios.

```typescript
// File: tests/TestRunner.spec.ts

import { jest } from '@jest/globals';
import fs from 'fs-extra';
import { default as TestRunner } from '../src/TestRunner';
import { Chalk } from 'chalk';
const chalk = new Chalk({ level: 3 });

jest.mock('fs-extra');
jest.mock('chalk', () => {
  return {
    Chalk: jest.fn().mockImplementation(() => ({
      blue: jest.fn((text: string) => text),
      gray: jest.fn((text: string) => text),
      green: jest.fn((text: string) => text),
      red: jest.fn((text: string) => text),
      yellow: jest.fn((text: string) => text),
    })),
  };
});

describe('TestRunner', () => {
  let testRunner: TestRunner;

  beforeEach(() => {
    testRunner = new TestRunner();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('registerSuite', () => {
    it('should register a test suite', () => {
      const suite = { name: 'Sample Suite', tests: [] };
      testRunner.registerSuite('sampleSuite', suite);

      expect(testRunner["testSuites"].get('sampleSuite')).toEqual(suite);
    });
  });

  describe('runAllTests', () => {
    it('should run all registered test suites successfully', async () => {
      const mockSuite = {
        name: 'Sample Suite',
        tests: [
          {
            name: 'Test 1',
            run: async () => Promise.resolve(),
          },
        ],
      };

      testRunner.registerSuite('sampleSuite', mockSuite);

      const results = await testRunner.runAllTests();

      expect(results.summary.passed).toBe(1);
      expect(results.summary.failed).toBe(0);
      expect(results.summary.total).toBe(1);
    });

    it('should handle suite registration error gracefully', async () => {
      const results = await testRunner.runAllTests();
      
      expect(results.summary.total).toBe(0);
    });
  });

  describe('runSuite', () => {
    it('should run a specific test suite and return results', async () => {
      const mockSuite = {
        name: 'Sample Suite',
        tests: [
          {
            name: 'Test 1',
            run: jest.fn().mockResolvedValue(undefined),
          },
        ],
      };

      testRunner.registerSuite('sampleSuite', mockSuite);

      const suiteResult = await testRunner.runSuite('sampleSuite');

      expect(suiteResult.passed).toBe(1);
      expect(suiteResult.failed).toBe(0);
      expect(suiteResult.tests.length).toBe(1);
    });

    it('should throw an error if suite not found', async () => {
      await expect(testRunner.runSuite('nonExistentSuite')).rejects.toThrow(
        "Test suite 'nonExistentSuite' not found"
      );
    });
  });

  describe('runTest', () => {
    it('should execute a test and return a pass result', async () => {
      const mockTest = {
        name: 'Test 1',
        run: jest.fn(),
      };

      const testResult = await testRunner['runTest'](mockTest as any);

      expect(testResult.status