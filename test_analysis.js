const fs = require('fs');
const path = require('path');

// Test the fixed code analysis approach
async function analyzeCodebase() {
  const results = [];
  const exclusions = ['node_modules', '.git', 'dist', 'build', 'coverage'];

  function shouldExclude(filePath) {
    return exclusions.some((exc) => filePath.includes(exc));
  }

  function analyzeFile(filePath) {
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      const lines = content.split('\n');

      return {
        file: filePath,
        metrics: {
          lines: lines.length,
          longLines: lines.filter((l) => l.length > 120).length,
          emptyLines: lines.filter((l) => l.trim() === '').length,
          todoComments: (content.match(/\/\/(.*?)(TODO|FIXME|HACK)/gi) || [])
            .length,
          consoleStatements: (
            content.match(/console\.(log|warn|error|info)/g) || []
          ).length,
          complexityIndicators: (
            content.match(/if\s*\(|for\s*\(|while\s*\(/g) || []
          ).length,
        },
      };
    } catch (error) {
      return { file: filePath, error: error.message };
    }
  }

  function scanDirectory(dir) {
    try {
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
    } catch (error) {
      console.error(`Error scanning directory ${dir}:`, error.message);
    }
  }

  scanDirectory('.');

  // Generate summary
  const validResults = results.filter((r) => r.metrics);
  const summary = {
    totalFiles: validResults.length,
    issues: {
      longLines: validResults.reduce(
        (sum, r) => sum + (r.metrics?.longLines || 0),
        0
      ),
      todos: validResults.reduce(
        (sum, r) => sum + (r.metrics?.todoComments || 0),
        0
      ),
      consoleStatements: validResults.reduce(
        (sum, r) => sum + (r.metrics?.consoleStatements || 0),
        0
      ),
    },
    topIssues: validResults
      .sort(
        (a, b) =>
          b.metrics.todoComments +
          b.metrics.consoleStatements -
          (a.metrics.todoComments + a.metrics.consoleStatements)
      )
      .slice(0, 5),
  };

  console.log('=== Code Smells Analysis ===');
  console.log(`Total files analyzed: ${summary.totalFiles}`);
  console.log(`Long lines (>120 chars): ${summary.issues.longLines}`);
  console.log(`TODO/FIXME comments: ${summary.issues.todos}`);
  console.log(`Console statements: ${summary.issues.consoleStatements}`);

  if (summary.topIssues.length > 0) {
    console.log('\nFiles with most issues:');
    summary.topIssues.forEach((file, i) => {
      console.log(
        `${i + 1}. ${file.file} (${file.metrics.todoComments} TODOs, ${
          file.metrics.consoleStatements
        } console statements)`
      );
    });
  }
}

analyzeCodebase().catch(console.error);
