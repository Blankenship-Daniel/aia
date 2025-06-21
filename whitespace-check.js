const fs = require('fs');
const path = require('path');

const file = process.argv[2];
if (!file) {
  console.error('Please provide a file path');
  process.exit(1);
}

const content = fs.readFileSync(file, 'utf8');
const lines = content.split('\n');
const report = {
  trailingWhitespace: 0,
  emptyLines: 0,
  mixedIndentation: 0
};

lines.forEach((line, i) => {
  if (line.match(/\s$/)) report.trailingWhitespace++;
  if (line.trim() === '') report.emptyLines++;
  if (line.match(/^\t.*\s{2,}|^\s{2,}.*\t/)) report.mixedIndentation++;
});

console.log(JSON.stringify(report, null, 2));
