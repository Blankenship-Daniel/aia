// Enhanced Testing Infrastructure
// Comprehensive test utilities and integration testing framework

import { spawn, ChildProcess } from 'child_process';
import fs from 'fs-extra';
import path from 'path';
import os from 'os';
// @ts-ignore - chalk doesn't have types available
// @ts-ignore - chalk may not have types available
const { Chalk } = require('chalk');
// Instantiate Chalk for color methods in CommonJS context
const chalk = new Chalk({ level: 3 });

interface TestConfig {
  timeout: number;
  parallel: boolean;
  maxConcurrency: number;
  coverage: boolean;
}

interface TestFunction {
  (context: TestContext): Promise<void> | void;
}

interface Test {
  name: string;
  run: TestFunction;
  setup?: TestFunction;
  teardown?: TestFunction;
}

interface TestSuite {
  name: string;
  tests: Test[];
  setup?: TestFunction;
  teardown?: TestFunction;
}

interface TestResult {
  name: string;
  status: 'running' | 'passed' | 'failed' | 'skipped';
  duration: number;
  error: string | null;
  logs: string[];
}

interface SuiteResult {
  name: string;
  tests: TestResult[];
  passed: number;
  failed: number;
  skipped: number;
  duration: number;
  error?: string;
}

interface MockFunction {
  (...args: unknown[]): unknown;
  calls: unknown[][];
  returnValue: unknown;
  returns: (value: unknown) => MockFunction;
}

interface TestAssertions {
  equal: (actual: unknown, expected: unknown, message?: string) => void;
  deepEqual: (actual: unknown, expected: unknown, message?: string) => void;
  truthy: (value: unknown, message?: string) => void;
  falsy: (value: unknown, message?: string) => void;
  throws: (
    fn: () => Promise<void> | void,
    expectedError?: string,
    message?: string
  ) => Promise<void>;
}

interface TestMock {
  fn: () => MockFunction;
}

interface TestUtils {
  sleep: (ms: number) => Promise<void>;
  createTempFile: (content?: string) => Promise<string>;
  createTempDir: () => Promise<string>;
}

interface TestContext {
  log: (message: string) => void;
  assert: TestAssertions;
  mock: TestMock;
  utils: TestUtils;
}

interface IntegrationTestEnvironment {
  tempDir: string;
  configDir: string;
  cleanup: () => Promise<void>;
}

interface PerformanceTestOptions {
  iterations?: number;
  warmupIterations?: number;
  maxDuration?: number;
}

interface PerformanceStats {
  average: number;
  median: number;
  min: number;
  max: number;
  p95: number;
  p99: number;
}

interface PerformanceTestResult {
  name: string;
  stats: PerformanceStats;
  results: number[];
}

interface TestSummary {
  total: number;
  passed: number;
  failed: number;
  skipped: number;
}

interface TestResults {
  suites: SuiteResult[];
  summary: TestSummary;
}

/**
 * TestRunner class
 * 
 * TODO: Add class description
 */
class TestRunner {
  private testSuites: Map<string, TestSuite>;
  private results: SuiteResult[];
  private config: TestConfig;

  /**
   * Creates an instance of the class
   */
  constructor() {
    this.testSuites = new Map();
    this.results = [];
    this.config = {
      timeout: 30000,
      parallel: true,
      maxConcurrency: 5,
      coverage: true,
    };
  }

  // Register test suite
  /**
   * Handles registerSuite operation
   * 
   * @param name - Parameter description
   * @param suite - Parameter description
   */
  registerSuite(name: string, suite: TestSuite): void {
    this.testSuites.set(name, suite);
  }

  // Run all tests
  /**
   * Handles runAllTests operation
   * 
   * @param options - Parameter description
   * 
   * @returns Promise<TestResults> - Return value description
   */
  async runAllTests(options: Partial<TestConfig> = {}): Promise<TestResults> {
    const config = { ...this.config, ...options };
    const startTime = Date.now();

    console.log(chalk.blue('🧪 Starting AIA Test Suite'));
    console.log(chalk.gray('─'.repeat(50)));

    const suiteNames = Array.from(this.testSuites.keys());

    if (config.parallel) {
      await this.runTestsInParallel(suiteNames, config);
    } else {
      await this.runTestsSequentially(suiteNames, config);
    }

    const duration = Date.now() - startTime;
    this.printSummary(duration);

    return this.getTestResults();
  }

  // Run specific test suite
  async runSuite(
    suiteName: string,
    options: Partial<TestConfig> = {}
  ): Promise<SuiteResult> {
    const suite = this.testSuites.get(suiteName);
    if (!suite) {
      throw new Error(`Test suite '${suiteName}' not found`);
    }

    console.log(chalk.blue(`\n🧪 Running ${suiteName} tests...`));

    const suiteResult: SuiteResult = {
      name: suiteName,
      tests: [],
      passed: 0,
      failed: 0,
      skipped: 0,
      duration: 0,
    };

    const startTime = Date.now();

    try {
      for (const test of suite.tests) {
        const testResult = await this.runTest(test, options);
        suiteResult.tests.push(testResult);

        if (testResult.status === 'passed') suiteResult.passed++;
        else if (testResult.status === 'failed') suiteResult.failed++;
        else if (testResult.status === 'skipped') suiteResult.skipped++;
      }
    } catch (error) {
      console.error(
        chalk.red(`Suite ${suiteName} failed:`, (error as Error).message)
      );
      suiteResult.error = (error as Error).message;
    }

    suiteResult.duration = Date.now() - startTime;
    this.results.push(suiteResult);

    return suiteResult;
  }

  // Run individual test
  async runTest(
    test: Test,
    options: Partial<TestConfig> = {}
  ): Promise<TestResult> {
    const { timeout = this.config.timeout } = options;

    const testResult: TestResult = {
      name: test.name,
      status: 'running',
      duration: 0,
      error: null,
      logs: [],
    };

    const startTime = Date.now();

    try {
      // Set up test timeout
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(
          () => reject(new Error(`Test timed out after ${timeout}ms`)),
          timeout
        );
      });

      // Run test with timeout
      await Promise.race([this.executeTest(test, testResult), timeoutPromise]);

      testResult.status = 'passed';
      console.log(chalk.green(`  ✅ ${test.name}`));
    } catch (error) {
      testResult.status = 'failed';
      testResult.error = (error as Error).message;
      console.log(chalk.red(`  ❌ ${test.name}: ${(error as Error).message}`));
    }

    testResult.duration = Date.now() - startTime;
    return testResult;
  }

  // Execute test function
  /**
   * Executes test
   * 
   * @param test - Parameter description
   * @param testResult - Parameter description
   * 
   * @returns Promise<void> - Return value description
   */
  private async executeTest(test: Test, testResult: TestResult): Promise<void> {
    const testContext = this.createTestContext(testResult);

    if (test.setup) {
      await test.setup(testContext);
    }

    try {
      await test.run(testContext);
    } finally {
      if (test.teardown) {
        await test.teardown(testContext);
      }
    }
  }

  // Create test context with utilities
  /**
   * Creates testcontext
   * 
   * @param testResult - Parameter description
   * 
   * @returns TestContext - Return value description
   */
  private createTestContext(testResult: TestResult): TestContext {
    return {
      log: (message: string) => {
        testResult.logs.push(`${new Date().toISOString()}: ${message}`);
      },

      assert: {
        equal: (actual: unknown, expected: unknown, message = '') => {
          if (actual !== expected) {
            throw new Error(
              `Assertion failed: ${
                message || `Expected ${expected}, got ${actual}`
              }`
            );
          }
        },

        deepEqual: (actual: unknown, expected: unknown, message = '') => {
          if (JSON.stringify(actual) !== JSON.stringify(expected)) {
            throw new Error(`Deep equality assertion failed: ${message}`);
          }
        },

        truthy: (value: unknown, message = '') => {
          if (!value) {
            throw new Error(
              `Assertion failed: Expected truthy value, got ${value}. ${message}`
            );
          }
        },

        falsy: (value: unknown, message = '') => {
          if (value) {
            throw new Error(
              `Assertion failed: Expected falsy value, got ${value}. ${message}`
            );
          }
        },

        throws: async (
          fn: () => Promise<void> | void,
          expectedError?: string,
          message = ''
        ) => {
          try {
            await fn();
            throw new Error(
              `Expected function to throw, but it didn't. ${message}`
            );
          } catch (error) {
            if (
              expectedError &&
              !(error as Error).message.includes(expectedError)
            ) {
              throw new Error(
                `Expected error containing "${expectedError}", got "${
                  (error as Error).message
                }". ${message}`
              );
            }
          }
        },
      },

      mock: {
        fn: (): MockFunction => {
          const calls: unknown[][] = [];
          const mockFn = (...args: unknown[]) => {
            calls.push(args);
            return mockFn.returnValue;
          };
          mockFn.calls = calls;
          mockFn.returnValue = undefined;
          mockFn.returns = (value: unknown) => {
            (mockFn as any).returnValue = value;
            return mockFn;
          };
          return mockFn;
        },
      },

      utils: {
        sleep: (ms: number) =>
          new Promise<void>((resolve) => setTimeout(resolve, ms)),
        createTempFile: async (content = '') => {
          const tempPath = path.join(os.tmpdir(), `aia-test-${Date.now()}.tmp`);
          await fs.writeFile(tempPath, content);
          return tempPath;
        },
        createTempDir: async () => {
          const tempDir = path.join(os.tmpdir(), `aia-test-dir-${Date.now()}`);
          await fs.ensureDir(tempDir);
          return tempDir;
        },
      },
    };
  }

  // Integration test utilities
  async runIntegrationTest(
    testName: string,
    testFn: (env: IntegrationTestEnvironment) => Promise<void>
  ): Promise<{ name: string; status: string; error?: string }> {
    console.log(chalk.blue(`\n🔌 Running integration test: ${testName}`));

    const testEnv = await this.setupIntegrationEnvironment();

    try {
      await testFn(testEnv);
      console.log(chalk.green(`  ✅ ${testName} passed`));
      return { name: testName, status: 'passed' };
    } catch (error) {
      console.log(
        chalk.red(`  ❌ ${testName} failed: ${(error as Error).message}`)
      );
      return {
        name: testName,
        status: 'failed',
        error: (error as Error).message,
      };
    } finally {
      await this.cleanupIntegrationEnvironment(testEnv);
    }
  }

  // Set up integration test environment
  /**
   * Sets upintegrationenvironment
   * 
   * @returns Promise<IntegrationTestEnvironment> - Return value description
   */
  private async setupIntegrationEnvironment(): Promise<IntegrationTestEnvironment> {
    const tempDir = path.join(os.tmpdir(), `aia-integration-${Date.now()}`);
    await fs.ensureDir(tempDir);

    const configDir = path.join(tempDir, '.aia');
    await fs.ensureDir(configDir);

    // Create test config
    const testConfig = {
      preferredModel: 'test-model',
      openaiApiKey: 'test-key',
      anthropicApiKey: 'test-key',
    };

    await fs.writeJson(path.join(configDir, 'config.json'), testConfig);

    // Create test memory
    const testMemory = {
      conversations: [],
      commands: [],
      preferences: {},
      workingDirectories: {},
      metadata: {
        created: new Date().toISOString(),
        version: '2.0.0',
        totalQueries: 0,
        lastCleanup: null,
      },
    };

    await fs.writeJson(path.join(configDir, 'memory.json'), testMemory);

    return {
      tempDir,
      configDir,
      cleanup: async () => {
        await fs.remove(tempDir);
      },
    };
  }

  // Clean up integration environment
  private async cleanupIntegrationEnvironment(
    env: IntegrationTestEnvironment
  ): Promise<void> {
    if (env.cleanup) {
      await env.cleanup();
    }
  }

  // Performance testing
  async runPerformanceTest(
    testName: string,
    testFn: () => Promise<void>,
    options: PerformanceTestOptions = {}
  ): Promise<PerformanceTestResult> {
    const {
      iterations = 100,
      warmupIterations = 10,
      maxDuration = 30000,
    } = options;

    console.log(chalk.blue(`\n⚡ Running performance test: ${testName}`));

    // Warmup
    for (let i = 0; i < warmupIterations; i++) {
      await testFn();
    }

    const results: number[] = [];
    const startTime = Date.now();

    for (let i = 0; i < iterations; i++) {
      if (Date.now() - startTime > maxDuration) {
        console.log(
          chalk.yellow(
            `  ⏰ Test stopped after ${i} iterations (max duration reached)`
          )
        );
        break;
      }

      const iterationStart = Date.now();
      await testFn();
      const duration = Date.now() - iterationStart;
      results.push(duration);
    }

    const stats = this.calculatePerformanceStats(results);

    console.log(chalk.green(`  ✅ ${testName} completed`));
    console.log(chalk.gray(`     Iterations: ${results.length}`));
    console.log(chalk.gray(`     Average: ${stats.average.toFixed(2)}ms`));
    console.log(chalk.gray(`     Median: ${stats.median.toFixed(2)}ms`));
    console.log(chalk.gray(`     Min: ${stats.min}ms, Max: ${stats.max}ms`));
    console.log(chalk.gray(`     95th percentile: ${stats.p95.toFixed(2)}ms`));

    return { name: testName, stats, results };
  }

  /**
   * Calculates performancestats
   * 
   * @param results - Parameter description
   * 
   * @returns PerformanceStats - Return value description
   */
  private calculatePerformanceStats(results: number[]): PerformanceStats {
    const sorted = [...results].sort((a, b) => a - b);

    return {
      average: results.reduce((sum, val) => sum + val, 0) / results.length,
      median: sorted[Math.floor(sorted.length / 2)],
      min: Math.min(...results),
      max: Math.max(...results),
      p95: sorted[Math.floor(sorted.length * 0.95)],
      p99: sorted[Math.floor(sorted.length * 0.99)],
    };
  }

  // Run tests in parallel
  private async runTestsInParallel(
    suiteNames: string[],
    config: TestConfig
  ): Promise<void> {
    const chunks = this.chunkArray(suiteNames, config.maxConcurrency);

    for (const chunk of chunks) {
      const promises = chunk.map((suiteName) =>
        this.runSuite(suiteName, config)
      );
      await Promise.all(promises);
    }
  }

  // Run tests sequentially
  private async runTestsSequentially(
    suiteNames: string[],
    config: TestConfig
  ): Promise<void> {
    for (const suiteName of suiteNames) {
      await this.runSuite(suiteName, config);
    }
  }

  private chunkArray<T>(array: T[], chunkSize: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += chunkSize) {
      chunks.push(array.slice(i, i + chunkSize));
    }
    return chunks;
  }

  /**
   * Handles printSummary operation
   * 
   * @param duration - Parameter description
   */
  private printSummary(duration: number): void {
    const totalTests = this.results.reduce(
      (sum, suite) => sum + suite.tests.length,
      0
    );
    const totalPassed = this.results.reduce(
      (sum, suite) => sum + suite.passed,
      0
    );
    const totalFailed = this.results.reduce(
      (sum, suite) => sum + suite.failed,
      0
    );
    const totalSkipped = this.results.reduce(
      (sum, suite) => sum + suite.skipped,
      0
    );

    console.log(chalk.blue('\n📊 Test Summary'));
    console.log(chalk.gray('─'.repeat(50)));
    console.log(chalk.green(`✅ Passed: ${totalPassed}`));
    console.log(chalk.red(`❌ Failed: ${totalFailed}`));
    console.log(chalk.yellow(`⏭️  Skipped: ${totalSkipped}`));
    console.log(chalk.blue(`📊 Total: ${totalTests}`));
    console.log(chalk.gray(`⏱️  Duration: ${duration}ms`));

    if (totalFailed > 0) {
      console.log(chalk.red('\n❌ Some tests failed:'));
      this.results.forEach((suite) => {
        suite.tests.forEach((test) => {
          if (test.status === 'failed') {
            console.log(
              chalk.red(`  • ${suite.name}: ${test.name} - ${test.error}`)
            );
          }
        });
      });
    }
  }

  /**
   * Gets testresults
   * 
   * @returns TestResults - Return value description
   */
  getTestResults(): TestResults {
    return {
      suites: this.results,
      summary: {
        total: this.results.reduce((sum, suite) => sum + suite.tests.length, 0),
        passed: this.results.reduce((sum, suite) => sum + suite.passed, 0),
        failed: this.results.reduce((sum, suite) => sum + suite.failed, 0),
        skipped: this.results.reduce((sum, suite) => sum + suite.skipped, 0),
      },
    };
  }
}

export default TestRunner;
