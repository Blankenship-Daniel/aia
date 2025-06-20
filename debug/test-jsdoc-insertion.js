// Direct test of JSDoc insertion logic with the exact same code from AgentExecutionEngine
const fs = require('fs');

async function testJSDocInsertion() {
  const filePath = 'src/commands/CacheCommand.ts';

  try {
    if (!fs.existsSync(filePath)) {
      console.log('File not found:', filePath);
      return;
    }

    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n');
    const newLines = [];
    let insertedCount = 0;

    console.log('[DEBUG] Processing file:', filePath);
    console.log('[DEBUG] Total lines:', lines.length);

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmed = line.trim();

      // Check if this line contains a method declaration
      // More specific regex to avoid matching if statements and other constructs
      const match = trimmed.match(
        /^(?:async\s+)?(?:public\s+|private\s+|protected\s+)?(?:static\s+)?([a-zA-Z_][a-zA-Z0-9_]*)\s*\(([^)]*)\)\s*(?::\s*([^{]+))?\s*\{$/
      );

      if (match) {
        // Keywords to exclude from method detection (control flow statements)
        const excludeKeywords = [
          'if',
          'for',
          'while',
          'switch',
          'catch',
          'try',
        ];
        const [, methodName] = match;

        // Skip if it matches excluded keywords
        if (excludeKeywords.includes(methodName)) {
          newLines.push(line);
          continue;
        }

        console.log(`[DEBUG] Found method at line ${i + 1}: ${trimmed}`);

        // Check if there's already JSDoc above this method
        const prevLine = i > 0 ? lines[i - 1].trim() : '';
        const hasPrevJSDoc =
          prevLine.includes('*/') ||
          (i > 1 && lines[i - 2].trim().includes('/**'));

        console.log(`[DEBUG] Has existing JSDoc: ${hasPrevJSDoc}`);

        if (!hasPrevJSDoc) {
          const [, methodName, params, returnType] = match;
          const paramList = params
            .split(',')
            .filter((p) => p.trim())
            .map((p) => p.trim().split(':')[0].trim());

          // Get the indentation of the method line
          const indent = line.match(/^(\s*)/)?.[1] || '  ';

          // Generate JSDoc with proper indentation
          newLines.push(`${indent}/**`);
          newLines.push(
            `${indent} * ${
              methodName.charAt(0).toUpperCase() + methodName.slice(1)
            } method`
          );

          if (paramList.length > 0 && paramList[0]) {
            paramList.forEach((param) => {
              if (param && param !== '') {
                newLines.push(
                  `${indent} * @param ${param} - Parameter description`
                );
              }
            });
          }

          if (returnType && returnType.trim() !== 'void') {
            newLines.push(
              `${indent} * @returns ${returnType.trim()} - Return value description`
            );
          }

          newLines.push(`${indent} */`);
          insertedCount++;
          console.log(`[DEBUG] Inserted JSDoc for method: ${methodName}`);
        } else {
          const [, methodName] = match;
          console.log(
            `[DEBUG] Skipping method with existing JSDoc: ${methodName}`
          );
        }
      }

      newLines.push(line);
    }

    console.log(`[DEBUG] Total methods found and processed: ${insertedCount}`);

    // Write the modified content back to the file (for testing)
    if (insertedCount > 0) {
      fs.writeFileSync(
        'src/commands/CacheCommand-with-jsdoc.ts',
        newLines.join('\n')
      );
      console.log(
        '[DEBUG] Written modified file to CacheCommand-with-jsdoc.ts'
      );
    }

    return {
      success: true,
      output: `Successfully inserted JSDoc comments for ${insertedCount} methods into ${filePath}`,
      metadata: {
        insertedCount,
        filePath,
        totalLines: newLines.length,
      },
    };
  } catch (error) {
    console.error('[DEBUG] Error:', error.message);
    return {
      success: false,
      error: error.message,
    };
  }
}

testJSDocInsertion().then((result) => {
  console.log('[DEBUG] Final result:', result);
});
