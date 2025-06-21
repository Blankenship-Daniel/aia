#!/usr/bin/env node

// Test script to verify syntax highlighting is working
const { exec } = require('child_process');

console.log('🔍 Testing syntax highlighting in AIA CLI...\n');

// Run the ask command and capture the output
exec('aia ask "show me a simple Python function"', (error, stdout, stderr) => {
  if (error) {
    console.error('Error running command:', error);
    return;
  }

  console.log('Raw output (with ANSI codes):');
  console.log('=====================================');
  console.log(stdout);

  console.log('\n\nInspecting for ANSI color codes:');
  console.log('=====================================');

  // Check for ANSI escape sequences that indicate color formatting
  const ansiRegex = /\x1b\[[0-9;]*m/g;
  const colorCodes = stdout.match(ansiRegex);

  if (colorCodes && colorCodes.length > 0) {
    console.log('✅ ANSI color codes found! Syntax highlighting is working.');
    console.log(
      `Found ${colorCodes.length} color codes:`,
      colorCodes.slice(0, 10)
    );
  } else {
    console.log(
      '❌ No ANSI color codes found. Syntax highlighting may not be working.'
    );
  }

  // Check specifically for code block detection
  if (stdout.includes('```')) {
    console.log('✅ Code blocks detected in output');
  } else {
    console.log('❌ No code blocks detected');
  }
});
