const fs = require('fs');
const path = require('path');

const suggestions = [];

if (!fs.existsSync('src')) {
  suggestions.push('Consider creating a "src" directory for source files');
}

if (!fs.existsSync('test')) {
  suggestions.push('Consider creating a "test" directory for test files');
}

if (!fs.existsSync('.gitignore')) {
  suggestions.push('Add a .gitignore file');
}

if (!fs.existsSync('README.md')) {
  suggestions.push('Add a README.md file for project documentation');
}

if (fs.existsSync('package.json')) {
  const pkg = require('./package.json');
  if (!pkg.scripts || Object.keys(pkg.scripts).length < 2) {
    suggestions.push('Add more npm scripts for common operations');
  }
}

console.log('Structural Improvement Suggestions:\n');
console.log(suggestions.join('\n'));
