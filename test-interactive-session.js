#!/usr/bin/env node

/**
 * Test script to verify interactive mode error handling
 */

const { spawn } = require('child_process');

console.log('🧪 Testing interactive mode error handling...\n');

const child = spawn('node', ['main.js'], {
  stdio: ['pipe', 'pipe', 'pipe'],
  cwd: process.cwd(),
});

let output = '';

child.stdout.on('data', (data) => {
  const text = data.toString();
  output += text;
  process.stdout.write(text);
});

child.stderr.on('data', (data) => {
  const text = data.toString();
  output += text;
  process.stderr.write(text);
});

// Send commands to test error handling
setTimeout(() => {
  console.log('\n📝 Sending test commands...\n');

  // Test agent command without arguments
  child.stdin.write('agent\n');

  setTimeout(() => {
    // Test help command to verify CLI is still running
    child.stdin.write('help\n');

    setTimeout(() => {
      // Test a valid agent command
      child.stdin.write('agent "list files in this directory"\n');

      setTimeout(() => {
        // Exit gracefully
        child.stdin.write('exit\n');
      }, 2000);
    }, 1000);
  }, 1000);
}, 2000);

child.on('close', (code) => {
  console.log(`\n✅ Test completed. Exit code: ${code}`);

  // Check if the session handled errors gracefully
  if (
    output.includes('❌ Error: Agent command requires a goal') &&
    output.includes('📋 Available Commands:') &&
    output.includes('Goodbye! 👋')
  ) {
    console.log('✅ Interactive error handling works correctly!');
  } else {
    console.log('❌ Interactive error handling may have issues');
  }
});

child.on('error', (error) => {
  console.error('❌ Test failed:', error.message);
});
