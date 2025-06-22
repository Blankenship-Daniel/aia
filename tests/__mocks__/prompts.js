// Mock for prompts to work with Jest
const prompts = jest.fn().mockResolvedValue({ confirm: true, choice: 'yes' });

// Add specific prompt type mocks
prompts.inject = jest.fn();
prompts.override = jest.fn();

module.exports = prompts;
module.exports.default = prompts;
