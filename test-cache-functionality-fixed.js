#!/usr/bin/env node

/**
 * Cache Functionality Test Script
 * Tests all cache command features with simulated cache data
 */

const { spawn } = require('child_process');
const chalk = require('chalk');

function runCommand(command, args = []) {
  return new Promise((resolve, reject) => {
    const child = spawn('node', ['main.js', ...command.split(' '), ...args], {
      cwd: process.cwd(),
      stdio: 'pipe',
    });

    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    child.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    child.on('close', (code) => {
      resolve({ code, stdout, stderr });
    });

    child.on('error', (error) => {
      reject(error);
    });
  });
}

async function testCacheCommand() {
  console.log(chalk.blue('🧪 Starting AIA Cache Command Functional Tests'));
  console.log(chalk.blue('===============================================\n'));

  const tests = [
    {
      name: 'Cache Help',
      command: 'cache --help',
      expect: 'usage: aia cache',
    },
    {
      name: 'Cache Statistics',
      command: 'cache --stats',
      expect: 'Cache Statistics',
    },
    {
      name: 'Cache Performance Analytics',
      command: 'cache --performance',
      expect: 'Performance Analytics',
    },
    {
      name: 'Cache Comprehensive Analytics',
      command: 'cache --analytics',
      expect: 'Comprehensive Cache Analytics',
    },
    {
      name: 'Cache Optimization Suggestions',
      command: 'cache --suggest',
      expect: 'Cache Optimization Suggestions',
    },
    {
      name: 'Cache Warming',
      command: 'cache --warm',
      expect: 'No cache warming suggestions',
    },
    {
      name: 'Cache Strategy Management',
      command: 'cache --strategy',
      expect: 'Cache Strategy Management',
    },
    {
      name: 'Cache Cleanup Preview',
      command: 'cache --cleanup',
      expect: 'Cache Cleanup Preview',
    },
    {
      name: 'Cache Clear Preview',
      command: 'cache --clear',
      expect: 'Cache Clear Confirmation Required',
    },
    {
      name: 'Cache Default Help',
      command: 'cache',
      expect: 'AIA Cache Management',
    },
    {
      name: 'Cache Alias (caching)',
      command: 'caching --stats',
      expect: 'Cache Statistics',
    },
  ];

  let passed = 0;
  let failed = 0;

  for (const test of tests) {
    try {
      console.log(chalk.cyan(`🧪 Testing: ${test.name}`));
      const result = await runCommand(test.command);

      if (
        result.code === 0 &&
        result.stdout.toLowerCase().includes(test.expect.toLowerCase())
      ) {
        console.log(chalk.green(`  ✅ PASS - ${test.name}`));
        passed++;
      } else {
        console.log(chalk.red(`  ❌ FAIL - ${test.name}`));
        console.log(chalk.gray(`     Expected: ${test.expect}`));
        console.log(
          chalk.gray(`     Got: ${result.stdout.substring(0, 100)}...`)
        );
        failed++;
      }
    } catch (error) {
      console.log(chalk.red(`  ❌ ERROR - ${test.name}: ${error.message}`));
      failed++;
    }
  }

  console.log(chalk.blue('\n📊 Test Results Summary:'));
  console.log(chalk.blue('========================'));
  console.log(chalk.green(`✅ Passed: ${passed}`));
  console.log(chalk.red(`❌ Failed: ${failed}`));
  console.log(chalk.blue(`📝 Total:  ${passed + failed}`));

  if (failed === 0) {
    console.log(chalk.green('\n🎉 All cache functionality tests passed!'));
    console.log(chalk.green('✅ AIA cache command is working correctly'));
  } else {
    console.log(
      chalk.yellow(`\n⚠️  ${failed} test(s) failed. Review output above.`)
    );
  }

  return failed === 0;
}

// Advanced feature tests
async function testAdvancedFeatures() {
  console.log(chalk.blue('\n🔬 Testing Advanced Cache Features'));
  console.log(chalk.blue('===================================\n'));

  const advancedTests = [
    {
      name: 'Performance Alias (--perf)',
      command: 'cache --perf',
      expect: 'Performance Analytics',
    },
    {
      name: 'Cleanup Alias (--clean)',
      command: 'cache --clean',
      expect: 'Cache Cleanup Preview',
    },
    {
      name: 'Cache Warming with Auto',
      command: 'cache --warm --auto',
      expect: 'No cache warming suggestions',
    },
    {
      name: 'Cache Strategy Management',
      command: 'cache --strategy',
      expect: 'Cache Strategy Management',
    },
  ];

  let passed = 0;
  let failed = 0;

  for (const test of advancedTests) {
    try {
      console.log(chalk.cyan(`🔬 Testing: ${test.name}`));
      const result = await runCommand(test.command);

      if (
        result.code === 0 &&
        result.stdout.toLowerCase().includes(test.expect.toLowerCase())
      ) {
        console.log(chalk.green(`  ✅ PASS - ${test.name}`));
        passed++;
      } else {
        console.log(chalk.red(`  ❌ FAIL - ${test.name}`));
        console.log(chalk.gray(`     Expected: ${test.expect}`));
        console.log(
          chalk.gray(`     Got: ${result.stdout.substring(0, 100)}...`)
        );
        failed++;
      }
    } catch (error) {
      console.log(chalk.red(`  ❌ ERROR - ${test.name}: ${error.message}`));
      failed++;
    }
  }

  console.log(chalk.blue('\n📊 Advanced Features Test Results:'));
  console.log(chalk.blue('=================================='));
  console.log(chalk.green(`✅ Passed: ${passed}`));
  console.log(chalk.red(`❌ Failed: ${failed}`));
  console.log(chalk.blue(`📝 Total:  ${passed + failed}`));

  return failed === 0;
}

// Error handling tests
async function testErrorHandling() {
  console.log(chalk.blue('\n🚨 Testing Error Handling'));
  console.log(chalk.blue('==========================\n'));

  const errorTests = [
    {
      name: 'Invalid Cache Option',
      command: 'cache --invalid-option',
      expectError: true,
    },
  ];

  let passed = 0;
  let failed = 0;

  for (const test of errorTests) {
    try {
      console.log(chalk.cyan(`🚨 Testing: ${test.name}`));
      const result = await runCommand(test.command);

      if (test.expectError && result.code !== 0) {
        console.log(chalk.green(`  ✅ PASS - ${test.name} (correctly failed)`));
        passed++;
      } else if (!test.expectError && result.code === 0) {
        console.log(chalk.green(`  ✅ PASS - ${test.name}`));
        passed++;
      } else {
        console.log(chalk.red(`  ❌ FAIL - ${test.name}`));
        failed++;
      }
    } catch (error) {
      console.log(chalk.red(`  ❌ ERROR - ${test.name}: ${error.message}`));
      failed++;
    }
  }

  console.log(chalk.blue('\n📊 Error Handling Test Results:'));
  console.log(chalk.blue('==============================='));
  console.log(chalk.green(`✅ Passed: ${passed}`));
  console.log(chalk.red(`❌ Failed: ${failed}`));
  console.log(chalk.blue(`📝 Total:  ${passed + failed}`));

  return failed === 0;
}

async function main() {
  try {
    const basicTests = await testCacheCommand();
    const advancedTests = await testAdvancedFeatures();
    const errorTests = await testErrorHandling();

    console.log(chalk.blue('\n🏁 Final Summary'));
    console.log(chalk.blue('================'));

    if (basicTests && advancedTests && errorTests) {
      console.log(chalk.green('🎉 ALL CACHE TESTS PASSED!'));
      console.log(chalk.green('✅ AIA cache command is fully functional'));
      process.exit(0);
    } else {
      console.log(chalk.yellow('⚠️  Some tests failed. See details above.'));
      process.exit(1);
    }
  } catch (error) {
    console.error(chalk.red('❌ Test runner error:'), error);
    process.exit(1);
  }
}

main();
