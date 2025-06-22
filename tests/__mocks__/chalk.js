// Mock for chalk to work with Jest
const chalk = {
  red: (text) => text,
  green: (text) => text,
  blue: (text) => text,
  yellow: (text) => text,
  magenta: (text) => text,
  cyan: (text) => text,
  white: (text) => text,
  gray: (text) => text,
  grey: (text) => text,
  black: (text) => text,
  bold: (text) => text,
  dim: (text) => text,
  italic: (text) => text,
  underline: (text) => text,
  strikethrough: (text) => text,
  inverse: (text) => text,
  hidden: (text) => text,
  reset: (text) => text,
  bgRed: (text) => text,
  bgGreen: (text) => text,
  bgBlue: (text) => text,
  bgYellow: (text) => text,
  bgMagenta: (text) => text,
  bgCyan: (text) => text,
  bgWhite: (text) => text,
  bgBlack: (text) => text,
};

// Add chaining support
Object.keys(chalk).forEach((key) => {
  if (typeof chalk[key] === 'function') {
    Object.keys(chalk).forEach((innerKey) => {
      if (typeof chalk[innerKey] === 'function') {
        chalk[key][innerKey] = chalk[innerKey];
      }
    });
  }
});

// Mock the Chalk class
const Chalk = function () {
  return chalk;
};

// Make Chalk properties available
Object.assign(Chalk.prototype, chalk);

module.exports = { Chalk, default: chalk };
