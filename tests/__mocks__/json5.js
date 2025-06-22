// Mock for json5 to work with Jest
const JSON5 = {
  parse: function (text) {
    try {
      return JSON.parse(text);
    } catch (e) {
      // Simple fallback for JSON5 syntax
      return {};
    }
  },
  stringify: function (value, replacer, space) {
    return JSON.stringify(value, replacer, space);
  },
};

module.exports = JSON5;
module.exports.default = JSON5;
