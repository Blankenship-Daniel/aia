const spinner = require('./src/spinner');
console.log(JSON.stringify({
  hasStart: typeof spinner.start === 'function',
  hasStop: typeof spinner.stop === 'function'
}));
