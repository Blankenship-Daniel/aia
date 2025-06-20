// Testing corrected regex patterns

const testLines = [
  'private async showCacheStats(): Promise<void> {',
  'private async showPerformanceAnalytics(): Promise<void> {',
  'validateArgs(args: string[]): { valid: boolean; errors: string[] } {',
  'getDefinition(): CommandDefinition {',
  'private formatBytes(bytes: number): string {',
];

console.log('=== Testing Corrected Regex Patterns ===');

const correctedPatterns = [
  // Pattern 1: Method with return type (async can be anywhere in visibility)
  /^(?:(?:public|private|protected)\s+)?(?:async\s+)?(?:static\s+)?([a-zA-Z_][a-zA-Z0-9_]*)\s*\([^)]*\)\s*:\s*[^{]*?\s*\{$/,
  // Pattern 2: Method without return type (async can be anywhere in visibility)
  /^(?:(?:public|private|protected)\s+)?(?:async\s+)?(?:static\s+)?([a-zA-Z_][a-zA-Z0-9_]*)\s*\([^)]*\)\s*\{$/,
  // Pattern 3: Multi-line method start
  /^(?:(?:public|private|protected)\s+)?(?:async\s+)?(?:static\s+)?([a-zA-Z_][a-zA-Z0-9_]*)\s*\($/,
];

testLines.forEach((line, i) => {
  console.log(`\nTesting: ${line}`);

  correctedPatterns.forEach((pattern, p) => {
    const match = line.match(pattern);
    console.log(`  Pattern ${p + 1}: ${match ? match[1] : 'NO MATCH'}`);
  });
});
