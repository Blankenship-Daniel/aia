const fs = require('fs');

const filePath =
  '/Users/d0b01r1/Documents/code/aia/src/commands/CacheCommand.ts';
const content = fs.readFileSync(filePath, 'utf8');
const lines = content.split('\n');

console.log('=== Testing Final Comprehensive Method Detection ===');

let totalMethods = 0;
let documentedMethods = 0;
const detectedMethods = [];

for (let i = 0; i < lines.length; i++) {
  const line = lines[i].trim();

  // Handle both single-line and multi-line method declarations with comprehensive patterns
  let methodMatch = null;
  let methodName = '';
  let isMultiLine = false;

  const patterns = [
    // Pattern 1: Method with return type
    /^(?:async\s+)?(?:public\s+|private\s+|protected\s+)?(?:static\s+)?([a-zA-Z_][a-zA-Z0-9_]*)\s*\([^)]*\)\s*:\s*[^{]*?\s*\{$/,
    // Pattern 2: Method without return type
    /^(?:async\s+)?(?:public\s+|private\s+|protected\s+)?(?:static\s+)?([a-zA-Z_][a-zA-Z0-9_]*)\s*\([^)]*\)\s*\{$/,
    // Pattern 3: Multi-line method start
    /^(?:async\s+)?(?:public\s+|private\s+|protected\s+)?(?:static\s+)?([a-zA-Z_][a-zA-Z0-9_]*)\s*\($/,
  ];

  // Try each pattern
  for (let p = 0; p < patterns.length && !methodName; p++) {
    methodMatch = line.match(patterns[p]);
    if (methodMatch && methodMatch[1]) {
      methodName = methodMatch[1];
      isMultiLine = p === 2; // Third pattern is multi-line
    }
  }

  // For multi-line methods, verify they have an opening brace
  if (isMultiLine && methodName) {
    let foundBrace = false;
    for (let j = i + 1; j < Math.min(lines.length, i + 10); j++) {
      if (lines[j].includes('{')) {
        foundBrace = true;
        break;
      }
    }
    if (!foundBrace) {
      methodName = '';
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
});

const coverage =
  totalMethods > 0 ? (documentedMethods / totalMethods) * 100 : 100;
console.log(
  `\nDocumentation coverage: ${documentedMethods}/${totalMethods} methods (${coverage.toFixed(
    1
  )}%)`
);
console.log(`Success (90%+ coverage): ${coverage >= 90 ? 'YES' : 'NO'}`);
