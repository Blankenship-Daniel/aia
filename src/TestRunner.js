// Enhanced Testing Infrastructure
// Comprehensive test utilities and integration testing framework

const { spawn } = require('child_process');
const fs = require('fs-extra');
const path = require('path');
const chalk = require('chalk');

class TestRunner {
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
  registerSuite(name, suite) {
    this.testSuites.set(name, suite);
  }

  // Run all tests
  async runAllTests(options = {}) {
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
  async runSuite(suiteName, options = {}) {
    const suite = this.testSuites.get(suiteName);
    if (!suite) {
      throw new Error(`Test suite '${suiteName}' not found`);
    }

    console.log(chalk.blue(`\n🧪 Running ${suiteName} tests...`));

    const suiteResult = {
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
      console.error(chalk.red(`Suite ${suiteName} failed:`, error.message));
      suiteResult.error = error.message;
    }

    suiteResult.duration = Date.now() - startTime;
    this.results.push(suiteResult);

    return suiteResult;
  }

  // Run individual test
  async runTest(test, options = {}) {
    const { timeout = this.config.timeout } = options;

    const testResult = {
      name: test.name,
      status: 'running',
      duration: 0,
      error: null,
      logs: [],
    };

    const startTime = Date.now();

    try {
      // Set up test timeout
      const timeoutPromise = new Promise((_, reject) => {
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
      testResult.error = error.message;
      console.log(chalk.red(`  ❌ ${test.name}: ${error.message}`));
    }

    testResult.duration = Date.now() - startTime;
    return testResult;
  }

  // Execute test function
  async executeTest(test, testResult) {
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
  createTestContext(testResult) {
    return {
      log: (message) => {
        testResult.logs.push(`${new Date().toISOString()}: ${message}`);
      },

      assert: {
        equal: (actual, expected, message = '') => {
          if (actual !== expected) {
            throw new Error(
              `Assertion failed: ${
                message || `Expected ${expected}, got ${actual}`
              }`
            );
          }
        },

        deepEqual: (actual, expected, message = '') => {
          if (JSON.stringify(actual) !== JSON.stringify(expected)) {
            throw new Error(`Deep equality assertion failed: ${message}`);
          }
        },

        truthy: (value, message = '') => {
          if (!value) {
            throw new Error(
              `Assertion failed: Expected truthy value, got ${value}. ${message}`
            );
          }
        },

        falsy: (value, message = '') => {
          if (value) {
            throw new Error(
              `Assertion failed: Expected falsy value, got ${value}. ${message}`
            );
          }
        },

        throws: async (fn, expectedError, message = '') => {
          try {
            await fn();
            throw new Error(
              `Expected function to throw, but it didn't. ${message}`
            );
          } catch (error) {
            if (expectedError && !error.message.includes(expectedError)) {
              throw new Error(
                `Expected error containing "${expectedError}", got "${error.message}". ${message}`
              );
            }
          }
        },
      },

      mock: {
        fn: () => {
          const calls = [];
          const mockFn = (...args) => {
            calls.push(args);
            return mockFn.returnValue;
          };
          mockFn.calls = calls;
          mockFn.returnValue = undefined;
          mockFn.returns = (value) => {
            mockFn.returnValue = value;
            return mockFn;
          };
          return mockFn;
        },
      },

      utils: {
        sleep: (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
        createTempFile: async (content = '') => {
          const tempPath = path.join(
            require('os').tmpdir(),
            `aia-test-${Date.now()}.tmp`
          );
          await fs.writeFile(tempPath, content);
          return tempPath;
        },
        createTempDir: async () => {
          const tempDir = path.join(
            require('os').tmpdir(),
            `aia-test-dir-${Date.now()}`
          );
          await fs.ensureDir(tempDir);
          return tempDir;
        },
      },
    };
  }

  // Integration test utilities
  async runIntegrationTest(testName, testFn) {
    console.log(chalk.blue(`\n🔌 Running integration test: ${testName}`));

    const testEnv = await this.setupIntegrationEnvironment();

    try {
      await testFn(testEnv);
      console.log(chalk.green(`  ✅ ${testName} passed`));
      return { name: testName, status: 'passed' };
    } catch (error) {
      console.log(chalk.red(`  ❌ ${testName} failed: ${error.message}`));
      return { name: testName, status: 'failed', error: error.message };
    } finally {
      await this.cleanupIntegrationEnvironment(testEnv);
    }
  }

  // Set up integration test environment
  async setupIntegrationEnvironment() {
    const tempDir = path.join(
      require('os').tmpdir(),
      `aia-integration-${Date.now()}`
    );
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
  async cleanupIntegrationEnvironment(env) {
    if (env.cleanup) {
      await env.cleanup();
    }
  }

  // Performance testing
  async runPerformanceTest(testName, testFn, options = {}) {
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

    const results = [];
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

  calculatePerformanceStats(results) {
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
  async runTestsInParallel(suiteNames, config) {
    const chunks = this.chunkArray(suiteNames, config.maxConcurrency);

    for (const chunk of chunks) {
      const promises = chunk.map((suiteName) =>
        this.runSuite(suiteName, config)
      );
      await Promise.all(promises);
    }
  }

  // Run tests sequentially
  async runTestsSequentially(suiteNames, config) {
    for (const suiteName of suiteNames) {
      await this.runSuite(suiteName, config);
    }
  }

  chunkArray(array, chunkSize) {
    const chunks = [];
    for (let i = 0; i < array.length; i += chunkSize) {
      chunks.push(array.slice(i, i + chunkSize));
    }
    return chunks;
  }

  printSummary(duration) {
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

  getTestResults() {
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

module.exports = TestRunner;
