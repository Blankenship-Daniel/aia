#!/usr/bin/env node

const { spawn } = require('child_process');
const path = require('path');

class QuickErrorTest {
  constructor() {
    this.results = [];
  }

  async runTest(testName, goal, timeout = 10000) {
    console.log(`\n🧪 Testing: ${testName}`);
    console.log(`🎯 Goal: ${goal}`);

    try {
      const result = await this.executeCommand(goal, timeout);

      if (result.timedOut) {
        console.log(`⏰ Test timed out after ${timeout / 1000}s`);
        return {
          name: testName,
          status: 'timeout',
          output: result.stdout + result.stderr,
        };
      }

      const output = result.stdout + result.stderr;
      const indicators = this.findErrorHandlingIndicators(output);

      console.log(`📊 Exit code: ${result.code}`);
      console.log(`📋 Output length: ${output.length} chars`);
      console.log(
        `🔍 Error handling indicators: ${indicators.join(', ') || 'None found'}`
      );

      // Show first part of output for debugging
      if (output.length > 0) {
        console.log(
          `📝 Sample output:\n${output.substring(0, 300)}${
            output.length > 300 ? '...' : ''
          }`
        );
      }

      return {
        name: testName,
        status: 'completed',
        exitCode: result.code,
        indicators,
        output: output.substring(0, 1000) + (output.length > 1000 ? '...' : ''),
      };
    } catch (error) {
      console.log(`❌ Test failed: ${error.message}`);
      return { name: testName, status: 'error', error: error.message };
    }
  }

  async executeCommand(goal, timeout) {
    return new Promise((resolve) => {
      const child = spawn(
        'node',
        ['main.js', 'agent', '--auto', '--verbose', goal],
        {
          stdio: ['pipe', 'pipe', 'pipe'],
          cwd: __dirname,
        }
      );

      let stdout = '';
      let stderr = '';
      let finished = false;

      const timeoutId = setTimeout(() => {
        if (!finished) {
          finished = true;
          child.kill('SIGKILL');
          resolve({ code: -1, stdout, stderr, timedOut: true });
        }
      }, timeout);

      child.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      child.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      child.on('close', (code) => {
        if (!finished) {
          finished = true;
          clearTimeout(timeoutId);
          resolve({ code, stdout, stderr });
        }
      });

      child.on('error', (error) => {
        if (!finished) {
          finished = true;
          clearTimeout(timeoutId);
          resolve({ code: -1, stdout, stderr, error: error.message });
        }
      });

      // Close stdin to prevent hanging
      child.stdin.end();
    });
  }

  findErrorHandlingIndicators(output) {
    const indicators = [];
    const patterns = [
      { regex: /🔄.*retry/i, name: 'Retry mechanism' },
      { regex: /💡.*alternative/i, name: 'Alternative suggestion' },
      { regex: /⚠️.*continuing/i, name: 'Graceful continuation' },
      { regex: /🔄.*degradation/i, name: 'Graceful degradation' },
      { regex: /⏭️.*skipping/i, name: 'Smart skipping' },
      { regex: /🚫.*blocked/i, name: 'Circuit breaker' },
      { regex: /❌.*failed.*refinement/i, name: 'Plan refinement' },
      { regex: /✅.*fallback/i, name: 'Successful fallback' },
      { regex: /🛡️.*validation/i, name: 'Command validation' },
      { regex: /🔄.*recovery/i, name: 'Recovery attempt' },
      { regex: /retrying step/i, name: 'Step retry' },
      { regex: /command blocked/i, name: 'Command blocking' },
      { regex: /suggesting alternative/i, name: 'Alternative suggestion' },
      { regex: /graceful degradation/i, name: 'Graceful degradation' },
      { regex: /circuit breaker/i, name: 'Circuit breaker' },
      { regex: /recovery attempt/i, name: 'Recovery attempt' },
    ];

    for (const pattern of patterns) {
      if (pattern.regex.test(output)) {
        indicators.push(pattern.name);
      }
    }

    return indicators;
  }

  async runAllTests() {
    console.log('🚀 Starting Quick Error Handling Tests\n');

    const tests = [
      {
        name: 'Basic Command Failure',
        goal: 'run the command "nonexistent-command-xyz"',
      },
      {
        name: 'Invalid Command Validation',
        goal: 'delete all files in the root directory',
      },
      {
        name: 'Mixed Success/Failure',
        goal: 'echo "hello" and then run "bad-command" and then echo "world"',
      },
    ];

    for (const test of tests) {
      const result = await this.runTest(test.name, test.goal);
      this.results.push(result);
    }

    this.printSummary();
  }

  printSummary() {
    console.log(
      '\n================================================================================'
    );
    console.log('📊 QUICK ERROR HANDLING TEST SUMMARY');
    console.log(
      '================================================================================\n'
    );

    const completed = this.results.filter((r) => r.status === 'completed');
    const withIndicators = completed.filter(
      (r) => r.indicators && r.indicators.length > 0
    );

    console.log(`📈 Overall Results:`);
    console.log(`   Total Tests: ${this.results.length}`);
    console.log(`   Completed: ${completed.length}`);
    console.log(`   With Error Handling: ${withIndicators.length}`);
    console.log(
      `   Success Rate: ${Math.round(
        (withIndicators.length / this.results.length) * 100
      )}%\n`
    );

    console.log('📋 Detailed Results:');
    this.results.forEach((result, index) => {
      console.log(
        `   ${index + 1}. ${result.status === 'completed' ? '✅' : '❌'} ${
          result.name
        }`
      );
      if (result.indicators && result.indicators.length > 0) {
        console.log(`      🔍 Error handling: ${result.indicators.join(', ')}`);
      }
      if (result.status === 'timeout') {
        console.log(`      ⏰ Timed out`);
      }
      if (result.error) {
        console.log(`      ❌ Error: ${result.error}`);
      }
    });

    console.log('\n🔍 Error Handling Features Found:');
    const allIndicators = this.results
      .filter((r) => r.indicators)
      .flatMap((r) => r.indicators)
      .filter((indicator, index, array) => array.indexOf(indicator) === index);

    if (allIndicators.length > 0) {
      allIndicators.forEach((indicator) => {
        const count = this.results.filter(
          (r) => r.indicators && r.indicators.includes(indicator)
        ).length;
        console.log(`   • ${indicator} (${count} test${count > 1 ? 's' : ''})`);
      });
    } else {
      console.log('   ⚠️ No error handling features detected in output');
      console.log('\n📝 Sample outputs for debugging:');
      this.results.forEach((result) => {
        if (result.output && result.output.length > 0) {
          console.log(`\n   ${result.name}:`);
          console.log(`   ${result.output.substring(0, 200)}...`);
        }
      });
    }
  }
}

// Run the tests
const tester = new QuickErrorTest();
tester.runAllTests().catch(console.error);
