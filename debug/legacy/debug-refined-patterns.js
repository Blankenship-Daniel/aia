// Testing refined regex patterns for complex return types

const testLines = [
  'private async showCacheStats(): Promise<void> {',
  'validateArgs(args: string[]): { valid: boolean; errors: string[] } {',
  'getDefinition(): CommandDefinition {',
  'async execute(context: Record<string, unknown>, args: string[], options: CommandOptions): Promise<CommandResult> {',
];

console.log('=== Testing Refined Regex Patterns ===');

const refinedPatterns = [
  // Pattern 1: Method with simple return type
  /^(?:(?:public|private|protected)\s+)?(?:async\s+)?(?:static\s+)?([a-zA-Z_][a-zA-Z0-9_]*)\s*\([^)]*\)\s*:\s*[A-Za-z<>_\[\],\s]*\s*\{$/,
  // Pattern 2: Method with complex return type (including objects with braces)
  /^(?:(?:public|private|protected)\s+)?(?:async\s+)?(?:static\s+)?([a-zA-Z_][a-zA-Z0-9_]*)\s*\([^)]*\)\s*:\s*.*?\s*\{$/,
  // Pattern 3: Method without return type
  /^(?:(?:public|private|protected)\s+)?(?:async\s+)?(?:static\s+)?([a-zA-Z_][a-zA-Z0-9_]*)\s*\([^)]*\)\s*\{$/,
  // Pattern 4: Multi-line method start
  /^(?:(?:public|private|protected)\s+)?(?:async\s+)?(?:static\s+)?([a-zA-Z_][a-zA-Z0-9_]*)\s*\($/,
];

testLines.forEach((line, i) => {
  console.log(`\nTesting: ${line}`);

  refinedPatterns.forEach((pattern, p) => {
    const match = line.match(pattern);
    console.log(`  Pattern ${p + 1}: ${match ? match[1] : 'NO MATCH'}`);
  });
});
