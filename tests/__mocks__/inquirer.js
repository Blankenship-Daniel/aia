// Mock for inquirer to work with Jest
const mockInquirer = {
  prompt: jest.fn().mockResolvedValue({ continue: true }),
  createPromptModule: jest.fn().mockReturnValue({
    prompt: jest.fn().mockResolvedValue({ continue: true }),
  }),
  registerPrompt: jest.fn(),
  Separator: function (str) {
    this.line = str || '────────';
  },
};

module.exports = mockInquirer;
module.exports.default = mockInquirer;
