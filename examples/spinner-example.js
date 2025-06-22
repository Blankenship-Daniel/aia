#!/usr/bin/env node

/**
 * Example showing how to use the new SpinnerService and UIService
 * Run with: node examples/spinner-example.js
 */

// Import necessary modules
const { SpinnerService } = require('../dist/services/SpinnerService');
const { UIService } = require('../dist/services/UIService');

// Example 1: Use the SpinnerService directly
async function spinnerServiceExample() {
  console.log('\n=== SpinnerService Direct Example ===\n');

  const spinnerService = new SpinnerService();

  // Example 1: Basic spinner
  const basicSpinner = spinnerService.start('Loading basic example...');
  await sleep(2000);
  basicSpinner.succeed('Basic example completed!');

  // Example 2: Spinner with options
  const optionsSpinner = spinnerService.start(
    'Loading with custom options...',
    {
      spinner: 'dots12',
      color: 'green',
      showTimer: true,
    }
  );
  await sleep(3000);
  optionsSpinner.text('Almost done...');
  await sleep(1000);
  optionsSpinner.succeed();

  // Example 3: Different spinner states
  const statesSpinner = spinnerService.start('Testing different states...');
  await sleep(1500);
  statesSpinner.info('This is an info message');
  await sleep(1000);

  const warningSpinner = spinnerService.start('This might be a problem...');
  await sleep(1500);
  warningSpinner.warn('Warning state shown here');
  await sleep(1000);

  const errorSpinner = spinnerService.start('Attempting something risky...');
  await sleep(1500);
  errorSpinner.fail('Failed with an error');
}

// Example 2: Use the UIService (which uses SpinnerService internally)
async function uiServiceExample() {
  console.log('\n=== UIService Example ===\n');

  const uiService = new UIService();

  // Create and use a spinner through UIService
  const spinner = uiService.createLoadingSpinner(
    'Loading through UIService...',
    {
      showTimer: true,
    }
  );

  await sleep(2000);
  spinner.text('Updating message...');
  await sleep(1500);
  spinner.succeed('UIService spinner completed successfully!');

  // Show a progress section
  console.log(
    uiService.createProgressSection('Task Progress', [
      { text: 'First task completed', status: 'success' },
      { text: 'Second task in progress', status: 'pending' },
      { text: 'Third task failed', status: 'error' },
    ])
  );

  // Show a summary box
  console.log(
    uiService.createSummaryBox('Implement SpinnerService', {
      status: 'completed',
      iterations: 3,
      steps: 5,
      successRate: 100,
    })
  );

  // Show an alert box
  console.log(
    uiService.createAlertBox(
      'Now you can use the SpinnerService and UIService for consistent UX across the application!',
      'info'
    )
  );
}

// Helper function to simulate async operations
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Run the examples
async function main() {
  console.log('\n🚀 AIA CLI SpinnerService Demo\n');

  try {
    await spinnerServiceExample();
    await uiServiceExample();

    console.log('\n✅ Demo completed successfully!\n');
  } catch (error) {
    console.error('❌ Demo failed:', error);
  }
}

main();
