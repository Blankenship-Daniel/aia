// Mock for jsonic to work with Jest
const jsonic = function (text, options) {
  try {
    return JSON.parse(text);
  } catch (e) {
    // Simple fallback for malformed JSON
    return {};
  }
};

module.exports = jsonic;
module.exports.default = jsonic;
