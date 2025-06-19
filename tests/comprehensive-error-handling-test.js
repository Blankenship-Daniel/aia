#!/usr/bin/env node

/**
 * Comprehensive test suite for graceful error handling
 */

const { spawn } = require('child_process');
const path = require('path');

class GracefulErrorHandlingTester {
  constructor() {
    this.testResults = [];
    this.totalTests = 0;
    this.passedTests = 0;
  }

  async runTest(testName, goal, expectedIndicators = [], timeout = 30000) {
    console.log(`\n🧪 Running Test: ${testName}`);
    console.log(`🎯 Goal: ${goal}`);
    console.log(`📝 Expected indicators: ${expectedIndicators.join(', ')}`);

    this.totalTests++;

    try {
      const result = await this.executeAIACommand(goal, timeout);
      const foundIndicators = this.analyzeOutput(result.stdout + result.stderr);

      const success =
        expectedIndicators.length === 0 ||
        expectedIndicators.some((indicator) =>
          foundIndicators.includes(indicator)
        );

      if (success) {
        this.passedTests++;
        console.log(`✅ Test passed`);
      } else {
        console.log(`❌ Test failed - expected indicators not found`);
      }

      console.log(
        `📊 Found indicators: ${foundIndicators.join(', ') || 'none'}`
      );
      console.log(`📈 Exit code: ${result.code}`);

      this.testResults.push({
        name: testName,
        goal,
        expectedIndicators,
        foundIndicators,
        success,
        exitCode: result.code,
        output: result.stdout.substring(0, 500), // First 500 chars for debugging
      });
    } catch (error) {
      console.log(`❌ Test failed with error: ${error.message}`);
      this.testResults.push({
        name: testName,
        goal,
        expectedIndicators,
        foundIndicators: [],
        success: false,
        error: error.message,
      });
    }
  }

  async executeAIACommand(goal, timeout = 15000) {
    return new Promise((resolve, reject) => {
      const aiaPath = path.join(__dirname, 'main.js');
      const child = spawn('node', [aiaPath, 'agent', goal, '--auto'], {
        stdio: ['pipe', 'pipe', 'pipe'],
      });

      let stdout = '';
      let stderr = '';
      let timeoutId;

      // Set up timeout
      timeoutId = setTimeout(() => {
        child.kill('SIGKILL');
        resolve({ code: -1, stdout, stderr, timedOut: true });
      }, timeout);

      child.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      child.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      child.on('close', (code) => {
        clearTimeout(timeoutId);
        resolve({ code, stdout, stderr });
      });

      child.on('error', (error) => {
        clearTimeout(timeoutId);
        resolve({ code: -1, stdout, stderr, error: error.message });
      });

      // Send input to avoid hanging
      child.stdin.end();
    });
  }

  analyzeOutput(output) {
    const indicators = [];

    const patterns = [
      // Enhanced error handling patterns
      { pattern: /🔄.*recovery/i, indicator: 'Recovery attempt' },
      { pattern: /💡.*alternative/i, indicator: 'Alternative suggestion' },
      { pattern: /⚠️.*continuing/i, indicator: 'Graceful continuation' },
      { pattern: /✅.*fallback/i, indicator: 'Successful fallback' },
      { pattern: /🔄.*degradation/i, indicator: 'Graceful degradation' },
      { pattern: /⏭️.*skipping/i, indicator: 'Smart skipping' },
      { pattern: /🚫.*blocked/i, indicator: 'Circuit breaker' },
      { pattern: /⚠️.*failed, retrying/i, indicator: 'Retry mechanism' },
      { pattern: /✅.*succeeded on attempt/i, indicator: 'Retry success' },
      {
        pattern: /💡.*Trying alternative/i,
        indicator: 'Alternative execution',
      },
      { pattern: /🔧.*Attempting recovery/i, indicator: 'Recovery process' },
      {
        pattern: /Graceful Error Handling Summary/i,
        indicator: 'Enhanced summary',
      },
      {
        pattern: /Circuit breaker triggered/i,
        indicator: 'Circuit breaker protection',
      },
      {
        pattern: /Command working again/i,
        indicator: 'Circuit breaker recovery',
      },

      // Basic error handling patterns
      { pattern: /✔.*✓/i, indicator: 'Success execution' },
      { pattern: /✖.*✗/i, indicator: 'Failed execution' },
      { pattern: /🔧.*Refining plan/i, indicator: 'Plan refinement' },
      { pattern: /🔄.*Iteration/i, indicator: 'Iteration attempt' },

      // Command validation patterns
      { pattern: /Command validation/i, indicator: 'Command validation' },
      {
        pattern: /suggested alternatives/i,
        indicator: 'Alternative suggestions',
      },
      { pattern: /Auto-skipped/i, indicator: 'Auto skip protection' },
    ];

    for (const { pattern, indicator } of patterns) {
      if (pattern.test(output)) {
        indicators.push(indicator);
      }
    }

    return indicators;
  }

  async runAllTests() {
    console.log('🚀 Starting Comprehensive Graceful Error Handling Tests\n');

    // Test 1: Basic error handling with single command failure
    await this.runTest(
      'Single Command Failure',
      'run nonexistent-command-xyz',
      ['Failed execution', 'Plan refinement']
    );

    // Test 2: Circuit breaker test - repeated failures
    await this.runTest('Circuit Breaker Test 1', 'execute bad-command-1', [
      'Failed execution',
    ]);

    await this.runTest('Circuit Breaker Test 2', 'execute bad-command-1', [
      'Failed execution',
    ]);

    await this.runTest('Circuit Breaker Test 3', 'execute bad-command-1', [
      'Failed execution',
      'Circuit breaker',
    ]);

    // Test 3: Command alternatives
    await this.runTest('Command Alternative Test', 'run tsc --version', [
      'Alternative suggestion',
      'Alternative execution',
    ]);

    // Test 4: Mixed success/failure workflow
    await this.runTest(
      'Mixed Workflow Test',
      'echo "start" && nonexistent-cmd && echo "end"',
      ['Success execution', 'Failed execution']
    );

    // Test 5: Recovery test with valid alternatives
    await this.runTest(
      'Recovery Test',
      'check node version using node-version-cmd',
      ['Recovery attempt', 'Alternative execution']
    );

    // Test 6: Graceful degradation test
    await this.runTest(
      'Graceful Degradation Test',
      'run optional-nonexistent-tool for analysis',
      ['Graceful degradation', 'Smart skipping']
    );

    // Test 7: Validation and safety test
    await this.runTest('Command Validation Test', 'rm -rf /', [
      'Command validation',
      'Auto skip protection',
    ]);

    this.printSummary();
  }

  printSummary() {
    console.log('\n' + '='.repeat(80));
    console.log('📊 GRACEFUL ERROR HANDLING TEST SUMMARY');
    console.log('='.repeat(80));

    console.log(`\n📈 Overall Results:`);
    console.log(`   Total Tests: ${this.totalTests}`);
    console.log(`   Passed: ${this.passedTests}`);
    console.log(`   Failed: ${this.totalTests - this.passedTests}`);
    console.log(
      `   Success Rate: ${Math.round(
        (this.passedTests / this.totalTests) * 100
      )}%`
    );

    console.log(`\n📋 Detailed Results:`);
    this.testResults.forEach((result, index) => {
      const status = result.success ? '✅' : '❌';
      console.log(`   ${index + 1}. ${status} ${result.name}`);
      if (result.foundIndicators.length > 0) {
        console.log(`      Found: ${result.foundIndicators.join(', ')}`);
      }
      if (!result.success && result.expectedIndicators.length > 0) {
        console.log(`      Expected: ${result.expectedIndicators.join(', ')}`);
      }
    });

    console.log(`\n🔍 Feature Analysis:`);
    const allFoundIndicators = this.testResults
      .flatMap((r) => r.foundIndicators)
      .reduce((acc, indicator) => {
        acc[indicator] = (acc[indicator] || 0) + 1;
        return acc;
      }, {});

    Object.entries(allFoundIndicators)
      .sort(([, a], [, b]) => b - a)
      .forEach(([indicator, count]) => {
        console.log(`   ${indicator}: ${count} occurrence(s)`);
      });

    if (this.passedTests === this.totalTests) {
      console.log(
        `\n🎉 All tests passed! Graceful error handling is working correctly.`
      );
    } else {
      console.log(
        `\n⚠️  Some tests failed. Review the implementation for missing features.`
      );
    }
  }
}

// Run the comprehensive test suite
const tester = new GracefulErrorHandlingTester();
tester.runAllTests().catch(console.error);
