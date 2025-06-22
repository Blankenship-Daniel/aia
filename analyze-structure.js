const fs = require('fs');
const path = require('path');

function analyzeStructure(dir = '.') {
  const stats = {
    totalFiles: 0,
    byFolder: {},
    byExtension: {}
  };

  function scan(currentPath) {
    const files = fs.readdirSync(currentPath);
    files.forEach(file => {
      const fullPath = path.join(currentPath, file);
      if (fs.statSync(fullPath).isDirectory()) {
        if (file !== 'node_modules' && file !== '.git') {
          scan(fullPath);
          stats.byFolder[fullPath] = fs.readdirSync(fullPath).length;
        }
      } else {
        stats.totalFiles++;
        const ext = path.extname(file);
        stats.byExtension[ext] = (stats.byExtension[ext] || 0) + 1;
      }
    });
  }

  scan(dir);
  return stats;
}

console.log('Project Structure Analysis:\n');
console.log(JSON.stringify(analyzeStructure(), null, 2));
