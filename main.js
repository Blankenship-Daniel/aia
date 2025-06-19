#!/usr/bin/env node

/**
 * AIA - AI Agentic Assistant
 * New modular entry point using service architecture
 */

// Suppress deprecation warnings early, before any modules load
const originalProcessEmitWarning = process.emitWarning;
process.emitWarning = (warning, name, ctor, ...args) => {
  if (
    name === 'DeprecationWarning' &&
    warning &&
    warning.includes &&
    warning.includes('punycode')
  ) {
    return;
  }
  return originalProcessEmitWarning.call(process, warning, name, ctor, ...args);
};

const CLIApplication = require('./dist/cli/CLIApplication').default;

/**
 * Main entry point for AIA CLI
 */
async function main() {
  let app;
  try {
    app = new CLIApplication();
    await app.run();
  } catch (error) {
    console.error('Failed to start AIA:', error.message);

    // Attempt cleanup if app was created
    if (app && typeof app.shutdown === 'function') {
      try {
        await app.shutdown();
      } catch (cleanupError) {
        console.error('Failed to cleanup:', cleanupError.message);
      }
    }

    process.exit(1);
  }
}

// Run the application
if (require.main === module) {
  main();
}

module.exports = { main };
