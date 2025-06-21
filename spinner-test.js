const fs = require('fs');
const path = require('path');

function findSpinnerModule() {
  const possiblePaths = ['./src/spinner.js', './spinner.js', './lib/spinner.js'];
  for (const p of possiblePaths) {
    if (fs.existsSync(p)) {
      console.log('Found spinner at:', p);
      return p;
    }
  }
  console.error('Spinner module not found in common locations');
  process.exit(1);
}

const spinnerPath = findSpinnerModule();
console.log('Testing spinner module at:', spinnerPath);
