const fs = require('fs');

const filePath =
  '/Users/d0b01r1/Documents/code/aia/src/commands/CacheCommand.ts';
const content = fs.readFileSync(filePath, 'utf8');
const lines = content.split('\n');

console.log('=== Using Insert JSDoc Regex (from AgentExecutionEngine) ===');

let insertMethods = 0;
for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  const trimmed = line.trim();

  // This is the exact regex from insertJSDocIntoFile
  const match = trimmed.match(
    /^(?:async\s+)?(?:public\s+|private\s+|protected\s+)?(?:static\s+)?([a-zA-Z_][a-zA-Z0-9_]*)\s*\(([^)]*)\)\s*(?::\s*([^{]+))?\s*\{$/
  );

  if (match) {
    const excludeKeywords = ['if', 'for', 'while', 'switch', 'catch', 'try'];
    const [, methodName] = match;

    if (!excludeKeywords.includes(methodName)) {
      insertMethods++;
      console.log(
        `${insertMethods}. Line ${i + 1}: ${methodName} - ${trimmed}`
      );
    }
  }
}

console.log(`\nTotal methods found by insert regex: ${insertMethods}`);

console.log(
  '\n=== Using Validation Regex (from validateDocumentationCoverage) ==='
);

let validationMethods = 0;
for (let i = 0; i < lines.length; i++) {
  const line = lines[i].trim();

  // This is the exact regex from validateDocumentationCoverage
  if (
    line.match(
      /(?:async\s+)?(?:public\s+|private\s+|protected\s+)?(?:static\s+)?(\w+)\s*\([^)]*\)\s*(?::\s*[^{]+)?\s*{/
    )
  ) {
    validationMethods++;
    console.log(`${validationMethods}. Line ${i + 1}: ${line}`);
  }
}

console.log(`\nTotal methods found by validation regex: ${validationMethods}`);

console.log('\n=== Checking JSDoc Coverage Manually ===');

let jsdocMethods = 0;
let methodsWithJSDoc = [];

for (let i = 0; i < lines.length; i++) {
  const line = lines[i].trim();

  if (
    line.match(
      /(?:async\s+)?(?:public\s+|private\s+|protected\s+)?(?:static\s+)?(\w+)\s*\([^)]*\)\s*(?::\s*[^{]+)?\s*{/
    )
  ) {
    let hasJSDoc = false;

    // Check for JSDoc above this method
    for (let j = i - 1; j >= Math.max(0, i - 5); j--) {
      if (lines[j].trim().includes('/**')) {
        hasJSDoc = true;
        jsdocMethods++;
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

    methodsWithJSDoc.push({
      line: i + 1,
      method: line,
      hasJSDoc,
    });
  }
}

console.log(`Methods with JSDoc: ${jsdocMethods}/${validationMethods}`);
methodsWithJSDoc.forEach((method, i) => {
  console.log(
    `${i + 1}. Line ${method.line}: ${method.hasJSDoc ? '✓' : '✗'} ${
      method.method
    }`
  );
});
