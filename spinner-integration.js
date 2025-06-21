const fs = require('fs');
const path = require('path');

function importSpinner() {
  try {
    const spinnerPath = fs.existsSync('./src/spinner.js') ? './src/spinner.js' : './spinner.js';
    return require(spinnerPath);
  } catch (err) {
    console.error('Import error:', err.message);
    process.exit(1);
  }
}

async function testSpinner() {
  const spinner = importSpinner();
  console.log('Spinner loaded successfully');
  
  // Test basic functionality
  spinner.start('Testing spinner...');
  await new Promise(resolve => setTimeout(resolve, 2000));
  spinner.stop();
}

testSpinner().catch(console.error);
