#!/usr/bin/env node

const { spawn } = require('child_process');

const command = process.argv[2];
const args = process.argv.slice(3);

if (!command) {
  console.error('Usage: npx execute-command <command> [args...]');
  process.exit(1);
}

// Use 'pipe' to capture stdio and manually pipe it
const child = spawn(command, args, { stdio: ['pipe', 'pipe', 'pipe'] });

// Pipe stdout
child.stdout.on('data', (data) => {
  process.stdout.write(data);
});

// Pipe stderr
child.stderr.on('data', (data) => {
  process.stderr.write(data);
});

child.on('error', (error) => {
  if (error.code === 'ENOENT') {
    console.error(`Error: Command "${command}" not found.`);
  } else {
    console.error(`Failed to start subprocess: ${error.message}`);
  }
  process.exit(1); // Exit if the process could not be spawned or was killed
});

// Using 'close' event as it's called after stdio streams have been closed
// 'exit' might be called before all stdio data is written out
child.on('close', (code, signal) => {
  if (signal) {
    console.error(`\nSubprocess killed by signal: ${signal}`);
    process.exit(1); // Standard practice to exit with 1 on error/signal
  } else if (code !== 0) {
    // Outputting a newline before error message for clarity if command produced partial output
    console.error(`\nSubprocess exited with error code: ${code}`);
    process.exit(code);
  }
  // If code is 0 and no signal, exit normally (implicitly or explicitly with process.exit(0))
});
