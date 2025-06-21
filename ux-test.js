const fs = require('fs');
const path = require('path');

function analyzeJSFiles() {
  const results = [];
  const files = fs.readdirSync('.');
  files.forEach(file => {
    if (file.endsWith('.js')) {
      const stats = fs.statSync(file);
      results.push({
        file,
        size: stats.size,
        modified: stats.mtime
      });
    }
  });
  console.log('UX Analysis Results:', JSON.stringify(results, null, 2));
}

analyzeJSFiles();
