// Mock for terminal-size to work with Jest
function terminalSize() {
  return {
    columns: 80,
    rows: 24,
  };
}

// Add static properties
terminalSize.columns = 80;
terminalSize.rows = 24;

module.exports = terminalSize;
module.exports.default = terminalSize;
