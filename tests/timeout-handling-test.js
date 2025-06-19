#!/usr/bin/env node

// Test script to verify timeout handling works
const { spawn } = require('child_process');

async function testTimeoutHandling() {
  console.log('🕐 Testing Timeout Handling for AIA CLI Agent');
  console.log('============================================\n');

  // Test 1: Simple command with timeout
  console.log('Test 1: Simple command (should complete quickly)');
  await runAIACommand('echo "hello world"', 15000);

  // Test 2: Command that might hang (but will timeout)
  console.log(
    '\nTest 2: Potentially hanging command (should timeout gracefully)'
  );
  await runAIACommand('sleep 120', 20000);

  console.log('\n✅ Timeout handling tests completed!');
}

async function runAIACommand(goal, timeoutMs) {
  console.log(`🎯 Goal: ${goal}`);
  console.log(`⏰ Timeout: ${timeoutMs}ms`);

  const startTime = Date.now();

  try {
    const result = await executeWithTimeout(goal, timeoutMs);
    const duration = Date.now() - startTime;

    console.log(`📊 Completed in ${duration}ms`);
    console.log(`📄 Output length: ${result.output.length} characters`);

    // Check for timeout indicators in output
    const timeoutIndicators = [
      'timed out',
      'timeout',
      'Timeout',
      'TIMEOUT',
      '⏰',
      'degraded functionality',
      'continuing with',
    ];

    const foundIndicators = timeoutIndicators.filter((indicator) =>
      result.output.includes(indicator)
    );

    if (foundIndicators.length > 0) {
      console.log(
        `🔍 Timeout handling detected: ${foundIndicators.join(', ')}`
      );
    } else {
      console.log(`🔍 No explicit timeout handling found in output`);
    }

    if (result.timedOut) {
      console.log('⏰ Command timed out as expected');
    } else if (result.code === 0) {
      console.log('✅ Command completed successfully');
    } else {
      console.log(`❌ Command failed with exit code ${result.code}`);
    }
  } catch (error) {
    console.log(`❌ Error: ${error.message}`);
  }
}

function executeWithTimeout(goal, timeoutMs) {
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
        resolve({
          code: -1,
          stdout,
          stderr,
          timedOut: true,
          output: stdout + stderr,
        });
      }
    }, timeoutMs);

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
        resolve({
          code,
          stdout,
          stderr,
          timedOut: false,
          output: stdout + stderr,
        });
      }
    });

    child.on('error', (error) => {
      if (!finished) {
        finished = true;
        clearTimeout(timeoutId);
        resolve({
          code: -1,
          stdout,
          stderr,
          error: error.message,
          output: stdout + stderr,
        });
      }
    });

    // Close stdin to prevent hanging
    child.stdin.end();
  });
}

// Run the test
testTimeoutHandling().catch(console.error);
