// Mock for cli-table3 to work with Jest
const Table = function (options) {
  this.options = options || {};
  this.rows = [];

  this.push = function (...rows) {
    this.rows.push(...rows);
  };

  this.toString = function () {
    return this.rows
      .map((row) => {
        if (Array.isArray(row)) {
          return '| ' + row.join(' | ') + ' |';
        }
        return '| ' + Object.values(row).join(' | ') + ' |';
      })
      .join('\n');
  };

  return this;
};

module.exports = Table;
module.exports.default = Table;
