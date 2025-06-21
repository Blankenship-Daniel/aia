// Debug script to test method detection regex
const fs = require('fs');

const filePath = 'src/commands/CacheCommand.ts';
const content = fs.readFileSync(filePath, 'utf8');
const lines = content.split('\n');

const methodRegex =
  /^(?:async\s+)?(?:public\s+|private\s+|protected\s+)?(?:static\s+)?([a-zA-Z_][a-zA-Z0-9_]*)\s*\(([^)]*)\)\s*(?::\s*([^{]+))?\s*\{$/;

console.log('=== METHOD DETECTION DEBUG ===');
console.log(`Analyzing file: ${filePath}`);
console.log(`Total lines: ${lines.length}`);
console.log('');

let methodCount = 0;
let hasJSDocCount = 0;

// Keywords to exclude from method detection
const excludeKeywords = ['if', 'for', 'while', 'switch', 'catch', 'try'];

for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  const trimmed = line.trim();

  const match = trimmed.match(methodRegex);

  if (match) {
    const [, methodName, params, returnType] = match;

    // Skip if it matches excluded keywords
    if (excludeKeywords.includes(methodName)) {
      continue;
    }

    methodCount++;

    // Check if there's already JSDoc above this method
    const prevLine = i > 0 ? lines[i - 1].trim() : '';
    const hasPrevJSDoc =
      prevLine.includes('*/') || (i > 1 && lines[i - 2].trim().includes('/**'));

    if (hasPrevJSDoc) {
      hasJSDocCount++;
    }

    console.log(
      `Line ${i + 1}: ${methodName}(${params})${
        returnType ? ': ' + returnType : ''
      }`
    );
    console.log(`  Full line: "${line}"`);
    console.log(`  Has JSDoc: ${hasPrevJSDoc}`);
    console.log(`  Previous line: "${prevLine}"`);
    console.log('');
  }
}

console.log(`=== SUMMARY ===`);
console.log(`Total methods found: ${methodCount}`);
console.log(`Methods with JSDoc: ${hasJSDocCount}`);
console.log(`Methods needing JSDoc: ${methodCount - hasJSDocCount}`);
