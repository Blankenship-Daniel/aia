const fs = require('fs');

const filePath =
  '/Users/d0b01r1/Documents/code/aia/src/commands/CacheCommand.ts';
const content = fs.readFileSync(filePath, 'utf8');

// More precise method detection regex
const methodRegex =
  /^\s*(private|public|protected)?\s*(async)?\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*\([^)]*\)\s*:\s*[^{]*\{|^\s*(private|public|protected)?\s*(async)?\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*\([^)]*\)\s*\{/gm;

const lines = content.split('\n');
const methods = [];
let match;

while ((match = methodRegex.exec(content)) !== null) {
  const lineNum = content.substring(0, match.index).split('\n').length;
  const line = lines[lineNum - 1];

  // Extract method name - it's either in capture group 3 or 6
  const methodName = match[3] || match[6];

  // Skip constructor, arrow functions, and simple conditionals
  if (
    methodName &&
    methodName !== 'constructor' &&
    !line.includes('if (') &&
    !line.includes('switch (') &&
    !line.includes('} else {') &&
    !line.includes('while (') &&
    !line.includes('for (') &&
    methodName.length > 1 &&
    line.trim().includes('(')
  ) {
    methods.push({
      name: methodName,
      line: lineNum,
      full: line.trim(),
    });
  }
}

console.log(`Found ${methods.length} methods:`);
methods.forEach((method, i) => {
  console.log(`${i + 1}. ${method.name} (line ${method.line}): ${method.full}`);
});

// Also check for JSDoc blocks
const jsdocRegex = /\/\*\*[\s\S]*?\*\//g;
const jsdocBlocks = [];
let jsdocMatch;

while ((jsdocMatch = jsdocRegex.exec(content)) !== null) {
  const lineNum = content.substring(0, jsdocMatch.index).split('\n').length;
  jsdocBlocks.push({
    line: lineNum,
    content: jsdocMatch[0].split('\n')[0].trim(),
  });
}

console.log(`\nFound ${jsdocBlocks.length} JSDoc blocks:`);
jsdocBlocks.forEach((block, i) => {
  console.log(`${i + 1}. Line ${block.line}: ${block.content}`);
});
