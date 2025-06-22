// Mock for cli-spinners to work with Jest
const cliSpinners = {
  dots: {
    interval: 80,
    frames: ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'],
  },
  line: {
    interval: 130,
    frames: ['-', '\\', '|', '/'],
  },
  pipe: {
    interval: 100,
    frames: ['┤', '┘', '┴', '└', '├', '┌', '┬', '┐'],
  },
  // Add any other spinners used in your code
};

module.exports = cliSpinners;
module.exports.default = cliSpinners;
