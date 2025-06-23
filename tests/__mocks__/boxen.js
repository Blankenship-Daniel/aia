// Mock for boxen to work with Jest
module.exports = function boxen(text, options) {
  // Simple mock that just returns the text with some basic formatting
  const border = options?.borderStyle === 'double' ? '=' : '-';
  const padding = options?.padding || 1;
  const width = options?.width || 80;

  const paddingStr = ' '.repeat(padding);
  const borderLine = border.repeat(width);

  return `${borderLine}\n${paddingStr}${text}${paddingStr}\n${borderLine}`;
};

// Add default export for ES modules compatibility
module.exports.default = module.exports;
