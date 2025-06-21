const fs = require('fs');

const filePath =
  '/Users/d0b01r1/Documents/code/aia/src/commands/CacheCommand.ts';
const content = fs.readFileSync(filePath, 'utf8');
const lines = content.split('\n');

console.log('=== Debugging Why validateArgs is Missing ===');

// Find line 171 specifically
console.log(`Line 171: "${lines[170]}"`); // 0-indexed, so 170 is line 171
console.log(`Line 171 trimmed: "${lines[170].trim()}"`);

const line171 = lines[170].trim();
const singleLineMatch = line171.match(
  /^(?:async\s+)?(?:public\s+|private\s+|protected\s+)?(?:static\s+)?([a-zA-Z_][a-zA-Z0-9_]*)\s*\(([^)]*)\)\s*(?::\s*([^{]+))?\s*\{$/
);

console.log(`Single-line match result:`, singleLineMatch);

const multiLineMatch = line171.match(
  /^(?:async\s+)?(?:public\s+|private\s+|protected\s+)?(?:static\s+)?([a-zA-Z_][a-zA-Z0-9_]*)\s*\($/
);

console.log(`Multi-line match result:`, multiLineMatch);

// Let's also check for all method signatures that don't have JSDoc
console.log('\n=== Checking all lines that look like method signatures ===');

for (let i = 0; i < lines.length; i++) {
  const line = lines[i].trim();

  // Look for any line that might be a method signature
  if (
    line.match(
      /^(?:async\s+)?(?:public\s+|private\s+|protected\s+)?(?:static\s+)?[a-zA-Z_][a-zA-Z0-9_]*\s*\([^)]*\).*:\s*.*\{/
    ) ||
    line.match(
      /^(?:async\s+)?(?:public\s+|private\s+|protected\s+)?(?:static\s+)?[a-zA-Z_][a-zA-Z0-9_]*\s*\([^)]*\)\s*\{/
    ) ||
    line.match(
      /^(?:async\s+)?(?:public\s+|private\s+|protected\s+)?(?:static\s+)?[a-zA-Z_][a-zA-Z0-9_]*\s*\($/
    )
  ) {
    // Check if it has JSDoc
    let hasJSDoc = false;
    for (let j = i - 1; j >= Math.max(0, i - 5); j--) {
      if (lines[j].trim().includes('/**')) {
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

    console.log(`Line ${i + 1}: ${hasJSDoc ? '✓' : '✗'} ${line}`);
  }
}
