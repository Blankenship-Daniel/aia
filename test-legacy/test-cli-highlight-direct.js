#!/usr/bin/env node

// Direct test of cli-highlight package
const highlight = require('cli-highlight');
const chalk = require('chalk');

console.log('🔍 Testing cli-highlight package directly...\n');

const testCode = `function hello(name) {
    return \`Hello, \${name}!\`;
}`;

console.log('Original code:');
console.log(testCode);

console.log('\nHighlighted with default options:');
try {
  const result1 = highlight.highlight(testCode, { language: 'javascript' });
  console.log(result1);
  console.log(
    `Length: original=${testCode.length}, highlighted=${result1.length}`
  );
} catch (error) {
  console.error('Error with default options:', error);
}

console.log('\nHighlighted with theme:');
try {
  const theme = {
    keyword: chalk.blue,
    built_in: chalk.cyan,
    string: chalk.green,
    comment: chalk.gray,
  };

  const result2 = highlight.highlight(testCode, {
    language: 'javascript',
    theme: theme,
    ignoreIllegals: true,
  });
  console.log(result2);
  console.log(
    `Length: original=${testCode.length}, highlighted=${result2.length}`
  );
} catch (error) {
  console.error('Error with theme:', error);
}

console.log('\nTesting ANSI detection:');
const testWithColors =
  chalk.blue('function') + ' ' + chalk.green('test') + '() {}';
console.log('Test with colors:', testWithColors);
console.log('Contains ANSI codes:', /\x1b\[[0-9;]*m/.test(testWithColors));
