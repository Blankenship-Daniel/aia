const fs = require('fs');
const path = require('path');

function checkFormatting(dir) {
  const issues = [];
  const files = fs.readdirSync(dir);
  files.forEach(file => {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isFile() && file.endsWith('.js')) {
      const content = fs.readFileSync(fullPath, 'utf8');
      if (content.includes('  ') && !content.includes('    ')) {
        issues.push(`${file}: Mixed spacing detected`);
      }
      if (content.match(/\n\n\n/)) {
        issues.push(`${file}: Multiple blank lines`);
      }
    }
  });
  console.log(JSON.stringify(issues, null, 2));
}

checkFormatting('.');
