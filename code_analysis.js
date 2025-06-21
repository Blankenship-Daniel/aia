const fs = require('fs');
const path = require('path');

async function analyzeCodebase() {
  const results = [];
  const exclusions = ['node_modules', '.git', 'dist', 'build', 'coverage'];
  
  function shouldExclude(filePath) {
    return exclusions.some(exc => filePath.includes(exc));
  }
  
  function analyzeFile(filePath) {
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      const lines = content.split('\n');
      
      return {
        file: filePath,
        metrics: {
          lines: lines.length,
          longLines: lines.filter(l => l.length > 120).length,
          emptyLines: lines.filter(l => l.trim() === '').length,
          todoComments: (content.match(/\/\/(.*?)(TODO|FIXME|HACK)/gi) || []).length,
          consoleStatements: (content.match(/console\.(log|warn|error|info)/g) || []).length,
          complexityIndicators: (content.match(/if\s*\(|for\s*\(|while\s*\(/g) || []).length
        }
      };
    } catch (error) {
      return { file: filePath, error: error.message };
    }
  }
  
  function scanDirectory(dir) {
    const items = fs.readdirSync(dir);
    
    for (const item of items) {
      const fullPath = path.join(dir, item);
      
      if (shouldExclude(fullPath)) continue;
      
      const stat = fs.statSync(fullPath);
      
      if (stat.isDirectory()) {
        scanDirectory(fullPath);
      } else if (item.match(/\.(js|ts|jsx|tsx)$/)) {
        results.push(analyzeFile(fullPath));
      }
    }
  }
  
  scanDirectory('.');
  
  // Generate summary
  const summary = {
    totalFiles: results.length,
    issues: {
      longLines: results.reduce((sum, r) => sum + (r.metrics?.longLines || 0), 0),
      todos: results.reduce((sum, r) => sum + (r.metrics?.todoComments || 0), 0),
      consoleStatements: results.reduce((sum, r) => sum + (r.metrics?.consoleStatements || 0), 0)
    },
    topIssues: results
      .filter(r => r.metrics)
      .sort((a, b) => (b.metrics.todoComments + b.metrics.consoleStatements) - (a.metrics.todoComments + a.metrics.consoleStatements))
      .slice(0, 5)
  };
  
  console.log(JSON.stringify({ summary, details: results }, null, 2));
}

analyzeCodebase().catch(console.error);
