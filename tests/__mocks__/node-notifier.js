// Mock for node-notifier to work with Jest
const notifier = {
  notify: jest.fn((options, callback) => {
    if (callback) callback(null, 'mock-response');
  }),
  on: jest.fn(),
  NotificationCenter: jest.fn(),
  WindowsToaster: jest.fn(),
  WindowsBalloon: jest.fn(),
  Growl: jest.fn(),
  NotifySend: jest.fn(),
};

module.exports = notifier;
module.exports.default = notifier;
