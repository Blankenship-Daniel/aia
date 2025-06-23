// Mock for gradient-string to work with Jest
const mockGradient = function (colors) {
  return function (text) {
    return text; // Just return the text without gradient for testing
  };
};

// Add common gradient presets
mockGradient.rainbow = function (text) {
  return text;
};
mockGradient.pastel = function (text) {
  return text;
};
mockGradient.cristal = function (text) {
  return text;
};
mockGradient.teen = function (text) {
  return text;
};
mockGradient.mind = function (text) {
  return text;
};
mockGradient.morning = function (text) {
  return text;
};
mockGradient.vice = function (text) {
  return text;
};
mockGradient.passion = function (text) {
  return text;
};
mockGradient.fruit = function (text) {
  return text;
};
mockGradient.instagram = function (text) {
  return text;
};
mockGradient.atlas = function (text) {
  return text;
};

module.exports = mockGradient;
module.exports.default = mockGradient;
