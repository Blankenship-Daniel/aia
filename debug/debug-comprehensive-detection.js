const fs = require('fs');

const filePath =
  '/Users/d0b01r1/Documents/code/aia/src/commands/CacheCommand.ts';
const content = fs.readFileSync(filePath, 'utf8');

console.log('=== Finding All Methods Using Multiple Regex Patterns ===');

// Test different regex patterns
const patterns = [
  {
    name: 'Pattern 1: Basic method',
    regex:
      /^(?:async\s+)?(?:public\s+|private\s+|protected\s+)?(?:static\s+)?([a-zA-Z_][a-zA-Z0-9_]*)\s*\([^)]*\)\s*(?::\s*[^{]*?)?\s*\{$/,
  },
  {
    name: 'Pattern 2: Complex return type',
    regex:
      /^(?:async\s+)?(?:public\s+|private\s+|protected\s+)?(?:static\s+)?([a-zA-Z_][a-zA-Z0-9_]*)\s*\([^)]*\)\s*:\s*.*?\s*\{$/,
  },
  {
    name: 'Pattern 3: No return type',
    regex:
      /^(?:async\s+)?(?:public\s+|private\s+|protected\s+)?(?:static\s+)?([a-zA-Z_][a-zA-Z0-9_]*)\s*\([^)]*\)\s*\{$/,
  },
  {
    name: 'Pattern 4: Multi-line start',
    regex:
      /^(?:async\s+)?(?:public\s+|private\s+|protected\s+)?(?:static\s+)?([a-zA-Z_][a-zA-Z0-9_]*)\s*\($/,
  },
];

const lines = content.split('\n');
const allMethods = new Set();

patterns.forEach((pattern) => {
  console.log(`\n${pattern.name}:`);
  let count = 0;

  lines.forEach((line, i) => {
    const trimmed = line.trim();
    const match = trimmed.match(pattern.regex);

    if (match && match[1]) {
      const methodName = match[1];
      const excludeKeywords = ['if', 'for', 'while', 'switch', 'catch', 'try'];

      if (!excludeKeywords.includes(methodName)) {
        count++;
        allMethods.add(methodName);
        console.log(`  Line ${i + 1}: ${methodName} - ${trimmed}`);
      }
    }
  });

  console.log(`  Found: ${count} methods`);
});

console.log(`\nAll unique methods found: ${allMethods.size}`);
console.log([...allMethods].sort());

// Now let's combine patterns for the most comprehensive detection
console.log('\n=== Combined Pattern Detection ===');

const detectedMethods = [];
const excludeKeywords = ['if', 'for', 'while', 'switch', 'catch', 'try'];

for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  const trimmed = line.trim();
  let methodName = '';
  let isMultiLine = false;

  // Try all patterns
  for (const pattern of patterns) {
    const match = trimmed.match(pattern.regex);
    if (match && match[1] && !excludeKeywords.includes(match[1])) {
      methodName = match[1];
      isMultiLine = pattern.name.includes('Multi-line');
      break;
    }
  }

  // Handle multi-line methods
  if (
    methodName === '' &&
    trimmed.match(
      /^(?:async\s+)?(?:public\s+|private\s+|protected\s+)?(?:static\s+)?([a-zA-Z_][a-zA-Z0-9_]*)\s*\($/
    )
  ) {
    const multiMatch = trimmed.match(
      /^(?:async\s+)?(?:public\s+|private\s+|protected\s+)?(?:static\s+)?([a-zA-Z_][a-zA-Z0-9_]*)\s*\($/
    );
    if (
      multiMatch &&
      multiMatch[1] &&
      !excludeKeywords.includes(multiMatch[1])
    ) {
      // Look ahead for the opening brace
      let foundBrace = false;
      for (let j = i + 1; j < Math.min(lines.length, i + 10); j++) {
        if (lines[j].includes('{')) {
          foundBrace = true;
          break;
        }
      }
      if (foundBrace) {
        methodName = multiMatch[1];
        isMultiLine = true;
      }
    }
  }

  if (methodName) {
    // Check for JSDoc
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

    detectedMethods.push({
      line: i + 1,
      name: methodName,
      type: isMultiLine ? 'multi-line' : 'single-line',
      hasJSDoc,
      fullLine: line.trim(),
    });
  }
}

console.log(`\nFinal detection: ${detectedMethods.length} methods`);
const documented = detectedMethods.filter((m) => m.hasJSDoc).length;
const coverage =
  detectedMethods.length > 0
    ? (documented / detectedMethods.length) * 100
    : 100;

detectedMethods.forEach((method, i) => {
  console.log(
    `${i + 1}. Line ${method.line}: ${method.name} (${method.type}) - ${
      method.hasJSDoc ? '✓' : '✗'
    }`
  );
});

console.log(
  `\nDocumentation coverage: ${documented}/${
    detectedMethods.length
  } methods (${coverage.toFixed(1)}%)`
);
console.log(`Success (90%+ coverage): ${coverage >= 90 ? 'YES' : 'NO'}`);
