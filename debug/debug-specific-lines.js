const fs = require('fs');

const filePath =
  '/Users/d0b01r1/Documents/code/aia/src/commands/CacheCommand.ts';
const content = fs.readFileSync(filePath, 'utf8');
const lines = content.split('\n');

console.log('=== Checking validateArgs line specifically ===');

const line171 = lines[170]; // 0-indexed
console.log(`Line 171: "${line171}"`);
console.log(`Line 171 trimmed: "${line171.trim()}"`);

const testRegex =
  /^(?:async\s+)?(?:public\s+|private\s+|protected\s+)?(?:static\s+)?([a-zA-Z_][a-zA-Z0-9_]*)\s*\([^)]*\)\s*(?::\s*[^{]*?)?\s*\{$/;
const match = line171.trim().match(testRegex);
console.log(`Regex match:`, match);

// Let's test with a simpler regex
const simplerRegex = /^([a-zA-Z_][a-zA-Z0-9_]*)\s*\([^)]*\)\s*:\s*.*\{$/;
const simpleMatch = line171.trim().match(simplerRegex);
console.log(`Simple regex match:`, simpleMatch);

// Check some other lines that should match
console.log('\n=== Checking other method lines ===');

const methodLines = [
  'private async showCacheStats(): Promise<void> {',
  'private async showPerformanceAnalytics(): Promise<void> {',
  'private async warmCache(keys: string[], options: any): Promise<void> {',
  'validateArgs(args: string[]): { valid: boolean; errors: string[] } {',
];

methodLines.forEach((testLine, i) => {
  console.log(`Test ${i + 1}: "${testLine}"`);
  const match = testLine.match(testRegex);
  console.log(`  Match:`, match ? match[1] : 'NO MATCH');
});
