#!/usr/bin/env node

/**
 * Demo script to showcase the enhanced UX improvements
 */

const chalk = require('chalk');
const boxen = require('boxen');
const cliTable3 = require('cli-table3');
const gradientString = require('gradient-string');
const figures = require('figures');

// Simulate the enhanced UI elements
console.log('\n' + chalk.blue('='.repeat(60)));
console.log(chalk.blue.bold('🚀 AIA AGENT UX ENHANCEMENT DEMO'));
console.log(chalk.blue('='.repeat(60)));

// Enhanced Header
const headerContent =
  `${figures.star} ${chalk.bold('AI-Powered Planning')}\n\n` +
  `${chalk.cyan('Status:')} ${chalk.green('Enhanced UX Active')}\n` +
  `${chalk.cyan('Features:')} ${chalk.yellow(
    'Visual Hierarchy, Progress Tracking, Code Highlighting'
  )}`;

console.log(
  boxen(headerContent, {
    padding: 1,
    margin: { top: 1, bottom: 1 },
    borderStyle: 'round',
    borderColor: 'blue',
    title: '🎯 Planning Phase',
    titleAlignment: 'center',
  })
);

// Enhanced Execution Plan Table
const table = new cliTable3({
  head: [chalk.cyan('Step'), chalk.cyan('Action'), chalk.cyan('Type')],
  style: {
    head: [],
    border: ['cyan'],
  },
  colWidths: [6, 50, 15],
  wordWrap: true,
});

table.push([
  chalk.white('1'),
  'Analyze current project structure and file count',
  'analysis',
]);
table.push([
  chalk.white('2'),
  'Generate comprehensive code organization recommendations',
  'analysis',
]);
table.push([
  chalk.white('3'),
  'Create implementation roadmap with priority levels',
  'planning',
]);

console.log('\n' + chalk.blue.bold('📋 Execution Plan:'));
console.log(table.toString());

// Enhanced Progress Indicators
console.log('\n' + chalk.blue.bold('⚡ Execution Progress:'));
const progressItems = [
  { text: 'Planning phase completed', status: 'success' },
  { text: 'AI classification analysis', status: 'success' },
  { text: 'Enhanced UI integration', status: 'success' },
  { text: 'User experience optimization', status: 'pending' },
];

const statusIcons = {
  success: chalk.green(figures.tick),
  pending: chalk.yellow(figures.ellipsis),
  error: chalk.red(figures.cross),
};

progressItems.forEach((item) => {
  console.log(`${statusIcons[item.status]} ${item.text}`);
});

// Enhanced Summary Box
const summaryContent =
  `${chalk.green(figures.tick)} ${chalk.bold('COMPLETED')}\n\n` +
  `${chalk.cyan('Goal:')} Test the enhanced UX improvements\n` +
  `${chalk.cyan('Iterations:')} 1\n` +
  `${chalk.cyan('Steps:')} 3\n` +
  `${chalk.cyan('Success Rate:')} 100%`;

console.log(
  '\n' +
    boxen(summaryContent, {
      padding: 1,
      margin: { top: 1, bottom: 1 },
      borderStyle: 'double',
      borderColor: 'green',
      title: '📊 Execution Summary',
      titleAlignment: 'center',
    })
);

// Enhanced Alert Box
const alertContent =
  'UX enhancements successfully implemented! The agent now provides:\n\n' +
  '• Enhanced visual hierarchy with boxed sections\n' +
  '• Improved table formatting for execution plans\n' +
  '• Better progress indicators with status icons\n' +
  '• Code syntax highlighting for outputs\n' +
  '• Interactive prompts with validation\n' +
  '• Styled error and warning messages';

console.log(
  '\n' +
    boxen(alertContent, {
      padding: 1,
      margin: { top: 1, bottom: 1 },
      borderStyle: 'round',
      borderColor: 'cyan',
      title: '💡 Key Improvements',
      titleAlignment: 'center',
    })
);

console.log(
  '\n' + gradientString.cristal('🎉 Enhanced UX demonstration complete!')
);
console.log(
  '\n' +
    chalk.gray(
      'The agent command now provides a significantly improved user experience\nwith better visual feedback, clearer information hierarchy, and enhanced interactivity.'
    )
);
