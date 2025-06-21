const fs = require('fs');

const filePath =
  '/Users/d0b01r1/Documents/code/aia/src/commands/CacheCommand.ts';
const content = fs.readFileSync(filePath, 'utf8');
const lines = content.split('\n');

console.log('=== Using Fixed Validation Regex (consistent with insert) ===');

let totalMethods = 0;
let documentedMethods = 0;

for (let i = 0; i < lines.length; i++) {
  const line = lines[i].trim();

  // Use the same regex as insertJSDocIntoFile for consistency
  const match = line.match(
    /^(?:async\s+)?(?:public\s+|private\s+|protected\s+)?(?:static\s+)?([a-zA-Z_][a-zA-Z0-9_]*)\s*\(([^)]*)\)\s*(?::\s*([^{]+))?\s*\{$/
  );

  if (match) {
    // Keywords to exclude from method detection (control flow statements)
    const excludeKeywords = ['if', 'for', 'while', 'switch', 'catch', 'try'];
    const [, methodName] = match;

    // Skip if it matches excluded keywords
    if (!excludeKeywords.includes(methodName)) {
      totalMethods++;

      // Check if there's JSDoc above this method
      let hasJSDoc = false;
      for (let j = i - 1; j >= Math.max(0, i - 5); j--) {
        if (lines[j].trim().includes('/**')) {
          documentedMethods++;
          hasJSDoc = true;
          break;
        }
        if (
          lines[j].trim() &&
          !lines[j].trim().startsWith('*') &&
          !lines[j].trim().startsWith('//')
        ) {
          break;
        }
      }

      console.log(
        `${totalMethods}. Line ${i + 1}: ${methodName} - ${
          hasJSDoc ? '✓' : '✗'
        } ${line}`
      );
    }
  }
}

const coverage =
  totalMethods > 0 ? (documentedMethods / totalMethods) * 100 : 100;
console.log(
  `\nDocumentation coverage: ${documentedMethods}/${totalMethods} methods (${coverage.toFixed(
    1
  )}%)`
);
console.log(`Success (90%+ coverage): ${coverage >= 90 ? 'YES' : 'NO'}`);
