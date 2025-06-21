const fs = require('fs');

const filePath =
  '/Users/d0b01r1/Documents/code/aia/src/commands/CacheCommand.ts';
const content = fs.readFileSync(filePath, 'utf8');
const lines = content.split('\n');

console.log(
  '=== Testing Updated Method Detection (Single-line + Multi-line) ==='
);

let totalMethods = 0;
let documentedMethods = 0;
const detectedMethods = [];

for (let i = 0; i < lines.length; i++) {
  const line = lines[i].trim();

  // Handle both single-line and multi-line method declarations
  let methodMatch = null;
  let methodName = '';
  let isMultiLine = false;

  // First, try single-line method detection
  methodMatch = line.match(
    /^(?:async\s+)?(?:public\s+|private\s+|protected\s+)?(?:static\s+)?([a-zA-Z_][a-zA-Z0-9_]*)\s*\(([^)]*)\)\s*(?::\s*([^{]+))?\s*\{$/
  );

  if (methodMatch) {
    methodName = methodMatch[1];
  } else {
    // Try multi-line method detection
    const multiLineMatch = line.match(
      /^(?:async\s+)?(?:public\s+|private\s+|protected\s+)?(?:static\s+)?([a-zA-Z_][a-zA-Z0-9_]*)\s*\($/
    );

    if (multiLineMatch) {
      methodName = multiLineMatch[1];
      isMultiLine = true;

      // Look ahead to find the closing brace
      let j = i + 1;
      let foundMethodEnd = false;

      while (j < lines.length && j < i + 10) {
        const lookAheadLine = lines[j].trim();
        if (lookAheadLine.includes('{')) {
          foundMethodEnd = true;
          break;
        }
        if (lookAheadLine.includes(')') && lookAheadLine.includes(':')) {
          j++;
          if (j < lines.length && lines[j].trim().includes('{')) {
            foundMethodEnd = true;
            break;
          }
        }
        j++;
      }

      if (!foundMethodEnd) {
        methodName = '';
      }
    }
  }

  if (methodName) {
    // Keywords to exclude from method detection (control flow statements)
    const excludeKeywords = ['if', 'for', 'while', 'switch', 'catch', 'try'];

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

      detectedMethods.push({
        line: i + 1,
        name: methodName,
        type: isMultiLine ? 'multi-line' : 'single-line',
        hasJSDoc,
        fullLine: lines[i],
      });
    }
  }
}

console.log(`Found ${totalMethods} methods:`);
detectedMethods.forEach((method, i) => {
  console.log(
    `${i + 1}. Line ${method.line}: ${method.name} (${method.type}) - ${
      method.hasJSDoc ? '✓' : '✗'
    }`
  );
  console.log(`   ${method.fullLine.trim()}`);
});

const coverage =
  totalMethods > 0 ? (documentedMethods / totalMethods) * 100 : 100;
console.log(
  `\nDocumentation coverage: ${documentedMethods}/${totalMethods} methods (${coverage.toFixed(
    1
  )}%)`
);
console.log(`Success (90%+ coverage): ${coverage >= 90 ? 'YES' : 'NO'}`);
