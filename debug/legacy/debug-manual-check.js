const fs = require('fs');

const filePath =
  '/Users/d0b01r1/Documents/code/aia/src/commands/CacheCommand.ts';
const content = fs.readFileSync(filePath, 'utf8');
const lines = content.split('\n');

console.log('=== Manual Check: All Lines with "private async" ===');

// Check all lines with "private async" which should be methods
lines.forEach((line, i) => {
  if (line.includes('private async')) {
    console.log(`Line ${i + 1}: ${line.trim()}`);

    // Test our patterns on this line
    const patterns = [
      /^(?:async\s+)?(?:public\s+|private\s+|protected\s+)?(?:static\s+)?([a-zA-Z_][a-zA-Z0-9_]*)\s*\([^)]*\)\s*:\s*[^{]*?\s*\{$/,
      /^(?:async\s+)?(?:public\s+|private\s+|protected\s+)?(?:static\s+)?([a-zA-Z_][a-zA-Z0-9_]*)\s*\([^)]*\)\s*\{$/,
      /^(?:async\s+)?(?:public\s+|private\s+|protected\s+)?(?:static\s+)?([a-zA-Z_][a-zA-Z0-9_]*)\s*\($/,
    ];

    patterns.forEach((pattern, p) => {
      const match = line.trim().match(pattern);
      console.log(`  Pattern ${p + 1}: ${match ? match[1] : 'NO MATCH'}`);
    });
    console.log('');
  }
});

console.log('\n=== Manual Check: All Lines with "validateArgs" ===');

lines.forEach((line, i) => {
  if (line.includes('validateArgs')) {
    console.log(`Line ${i + 1}: ${line.trim()}`);

    const patterns = [
      /^(?:async\s+)?(?:public\s+|private\s+|protected\s+)?(?:static\s+)?([a-zA-Z_][a-zA-Z0-9_]*)\s*\([^)]*\)\s*:\s*[^{]*?\s*\{$/,
      /^(?:async\s+)?(?:public\s+|private\s+|protected\s+)?(?:static\s+)?([a-zA-Z_][a-zA-Z0-9_]*)\s*\([^)]*\)\s*\{$/,
      /^(?:async\s+)?(?:public\s+|private\s+|protected\s+)?(?:static\s+)?([a-zA-Z_][a-zA-Z0-9_]*)\s*\($/,
    ];

    patterns.forEach((pattern, p) => {
      const match = line.trim().match(pattern);
      console.log(`  Pattern ${p + 1}: ${match ? match[1] : 'NO MATCH'}`);
    });
    console.log('');
  }
});
