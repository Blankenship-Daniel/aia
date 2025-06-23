// Mock for log-update to work with Jest
const logUpdate = jest.fn();

// Add createLogUpdate method for prompts support
logUpdate.createLogUpdate = jest.fn(() => logUpdate);
logUpdate.clear = jest.fn();
logUpdate.done = jest.fn();

module.exports = logUpdate;
module.exports.default = logUpdate;
