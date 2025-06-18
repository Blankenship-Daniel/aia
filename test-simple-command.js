#!/usr/bin/env node

/**
 * Simple test to verify agent command error handling
 */

const chalk = require('chalk');

// Mock the AgentCommand validation logic
function validateAgentCommand(args, options) {
  if (args.length === 0) {
    const usage = `
${chalk.bold('Usage:')} agent <goal> [options]

${chalk.bold('Examples:')}
  agent "optimize this Node.js project"
  agent "set up automated testing" --auto-execute
  agent "debug failing tests" --max-iterations 3

${chalk.bold('Options:')}
  --auto-execute       Execute commands without confirmation
  --max-iterations N   Maximum refinement iterations (1-20, default: 5)
  --no-iteration       Disable iterative refinement

${chalk.bold('Description:')}
The agent command uses agentic reasoning to break down complex goals into
actionable steps and execute them with optional user confirmation.`;

    throw new Error(`Agent command requires a goal.\n${usage}`);
  }

  if (
    options.maxIterations &&
    (options.maxIterations < 1 || options.maxIterations > 20)
  ) {
    throw new Error('Max iterations must be between 1 and 20');
  }

  return true;
}

// Mock the CLI error handling logic
function handleCommandError(error, options) {
  if (!options.quiet) {
    if (options.interactive) {
      // In interactive mode, show friendly error message and continue
      console.error(chalk.red('❌ Error:'), error.message);
      if (options.verbose) {
        console.error(chalk.gray('Stack trace:'), error.stack);
      }

      // If it's a usage error, show help for the command
      if (
        error.message.includes('Usage:') ||
        error.message.includes('requires')
      ) {
        console.log(
          chalk.yellow(
            `\n💡 Use 'help' to see all commands or check the agent command usage.`
          )
        );
      }
    } else {
      // In non-interactive mode, show standard error message
      console.error(chalk.red('Command failed:'), error.message);
      if (options.verbose) {
        console.error(error.stack);
      }
    }
  }

  // Only exit if not in interactive mode
  if (!options.interactive) {
    process.exit(1);
  }
  // In interactive mode, don't throw - just return so the loop continues
}

// Test scenarios
console.log(chalk.blue.bold('🧪 Testing Agent Command Error Handling\n'));

console.log(chalk.yellow('Test 1: Interactive mode (should continue)'));
try {
  validateAgentCommand([], {});
} catch (error) {
  handleCommandError(error, { interactive: true });
}

console.log(
  chalk.green('\n✅ Interactive mode error handling test completed!')
);
console.log(
  chalk.blue(
    'The CLI should continue running after errors in interactive mode.'
  )
);
