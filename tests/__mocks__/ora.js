// Mock for ora (spinner) to work with Jest
const ora = function (options) {
  const spinner = {
    start: jest.fn(() => spinner),
    stop: jest.fn(() => spinner),
    succeed: jest.fn(() => spinner),
    fail: jest.fn(() => spinner),
    warn: jest.fn(() => spinner),
    info: jest.fn(() => spinner),
    stopAndPersist: jest.fn(() => spinner),
    clear: jest.fn(() => spinner),
    frame: jest.fn(() => '⠋'),
    render: jest.fn(() => spinner),
    text: typeof options === 'string' ? options : options?.text || '',
    color: 'cyan',
    isSpinning: false,
    interval: 80,
  };

  return spinner;
};

// Add static properties
ora.promise = jest.fn((action, options) => {
  return Promise.resolve(action);
});

module.exports = ora;
module.exports.default = ora;
