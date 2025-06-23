#!/usr/bin/env node

/**
 * Error Handling Integration Script
 *
 * Analyzes the codebase and provides recommendations for integrating
 * the UnifiedErrorHandler throughout all services and commands.
 */

import * as fs from 'fs';
import * as path from 'path';
import { glob } from 'glob';

interface ErrorHandlingAnalysis {
  file: string;
  hasErrorHandling: boolean;
  usesUnifiedHandler: boolean;
  errorPatterns: string[];
  recommendations: string[];
}

class ErrorHandlingAnalyzer {
  async analyzeCodebase(
    rootPath: string = 'src'
  ): Promise<ErrorHandlingAnalysis[]> {
    console.log('🔍 Analyzing error handling patterns...\n');

    const files = await glob('**/*.ts', { cwd: rootPath });
    const results: ErrorHandlingAnalysis[] = [];

    for (const file of files) {
      const filePath = path.join(rootPath, file);
      const analysis = await this.analyzeFile(filePath);
      results.push(analysis);
    }

    return results;
  }

  private async analyzeFile(filePath: string): Promise<ErrorHandlingAnalysis> {
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n');

    const analysis: ErrorHandlingAnalysis = {
      file: filePath,
      hasErrorHandling: false,
      usesUnifiedHandler: false,
      errorPatterns: [],
      recommendations: [],
    };

    // Check for existing error handling patterns
    const errorPatterns = [
      /try\s*{[\s\S]*?catch\s*\(/,
      /\.catch\s*\(/,
      /throw\s+(new\s+)?Error/,
      /console\.error/,
      /process\.exit/,
    ];

    const unifiedHandlerPatterns = [
      /import.*UnifiedErrorHandler/,
      /UnifiedErrorHandler/,
      /ErrorUtils\./,
      /errorHandler\./,
    ];

    for (const line of lines) {
      // Check for error patterns
      for (const pattern of errorPatterns) {
        if (pattern.test(line)) {
          analysis.hasErrorHandling = true;
          if (!analysis.errorPatterns.includes(line.trim())) {
            analysis.errorPatterns.push(line.trim());
          }
        }
      }

      // Check for unified handler usage
      for (const pattern of unifiedHandlerPatterns) {
        if (pattern.test(line)) {
          analysis.usesUnifiedHandler = true;
          break;
        }
      }
    }

    // Generate recommendations
    this.generateRecommendations(analysis);

    return analysis;
  }

  private generateRecommendations(analysis: ErrorHandlingAnalysis): void {
    if (analysis.hasErrorHandling && !analysis.usesUnifiedHandler) {
      analysis.recommendations.push(
        'Replace custom error handling with UnifiedErrorHandler'
      );
      analysis.recommendations.push(
        'Use ErrorUtils helper functions for common error scenarios'
      );
    }

    if (!analysis.hasErrorHandling) {
      analysis.recommendations.push(
        'Add error handling with UnifiedErrorHandler'
      );
    }

    if (analysis.errorPatterns.some((p) => p.includes('console.error'))) {
      analysis.recommendations.push(
        'Replace console.error with structured error logging'
      );
    }

    if (analysis.errorPatterns.some((p) => p.includes('process.exit'))) {
      analysis.recommendations.push(
        'Use graceful error recovery instead of process.exit'
      );
    }
  }

  generateReport(results: ErrorHandlingAnalysis[]): string {
    const totalFiles = results.length;
    const filesWithErrorHandling = results.filter(
      (r) => r.hasErrorHandling
    ).length;
    const filesWithUnifiedHandler = results.filter(
      (r) => r.usesUnifiedHandler
    ).length;

    let report = '# Error Handling Integration Analysis\n\n';

    report += '## Summary\n';
    report += `- **Total files analyzed**: ${totalFiles}\n`;
    report += `- **Files with error handling**: ${filesWithErrorHandling} (${(
      (filesWithErrorHandling / totalFiles) *
      100
    ).toFixed(1)}%)\n`;
    report += `- **Files using UnifiedErrorHandler**: ${filesWithUnifiedHandler} (${(
      (filesWithUnifiedHandler / totalFiles) *
      100
    ).toFixed(1)}%)\n\n`;

    // Files needing migration
    const needingMigration = results.filter(
      (r) => r.hasErrorHandling && !r.usesUnifiedHandler
    );
    if (needingMigration.length > 0) {
      report += '## Files Needing Error Handler Migration\n\n';
      for (const file of needingMigration) {
        report += `### ${file.file}\n`;
        report += `**Error patterns found**: ${file.errorPatterns.length}\n`;
        if (file.recommendations.length > 0) {
          report += '**Recommendations**:\n';
          for (const rec of file.recommendations) {
            report += `- ${rec}\n`;
          }
        }
        report += '\n';
      }
    }

    // Files missing error handling
    const missingErrorHandling = results.filter((r) => !r.hasErrorHandling);
    if (missingErrorHandling.length > 0) {
      report += '## Files Missing Error Handling\n\n';
      for (const file of missingErrorHandling.slice(0, 10)) {
        // Show first 10
        report += `- ${file.file}\n`;
      }
      if (missingErrorHandling.length > 10) {
        report += `... and ${missingErrorHandling.length - 10} more files\n`;
      }
      report += '\n';
    }

    // Migration guide
    report += '## Integration Examples\n\n';
    report += '### Basic Error Handling\n';
    report += '```typescript\n';
    report +=
      "import { errorHandler, ErrorUtils } from '../utils/UnifiedErrorHandler';\n\n";
    report += '// Before\n';
    report += 'try {\n';
    report += '  await riskyOperation();\n';
    report += '} catch (error) {\n';
    report += '  console.error("Operation failed:", error);\n';
    report += '  throw error;\n';
    report += '}\n\n';
    report += '// After\n';
    report += 'await errorHandler.executeWithRecovery(\n';
    report += '  () => riskyOperation(),\n';
    report += '  { operation: "riskyOperation", component: "ServiceName" }\n';
    report += ');\n';
    report += '```\n\n';

    report += '### Network Error Handling\n';
    report += '```typescript\n';
    report += '// Before\n';
    report += 'try {\n';
    report += '  const response = await fetch(url);\n';
    report += '} catch (error) {\n';
    report += '  if (error.code === "ECONNRESET") {\n';
    report += '    // Custom retry logic\n';
    report += '  }\n';
    report += '}\n\n';
    report += '// After\n';
    report += 'const response = await errorHandler.executeWithRecovery(\n';
    report += '  () => fetch(url),\n';
    report += '  { operation: "fetch", url },\n';
    report += '  { maxRetries: 3, retryDelay: 1000 }\n';
    report += ');\n';
    report += '```\n\n';

    report += '### Validation Errors\n';
    report += '```typescript\n';
    report += '// Use ErrorUtils for common scenarios\n';
    report += 'if (!isValid(input)) {\n';
    report +=
      '  throw ErrorUtils.validation("Invalid input format", { input });\n';
    report += '}\n';
    report += '```\n\n';

    return report;
  }

  async generateMigrationScript(
    results: ErrorHandlingAnalysis[]
  ): Promise<string> {
    const needingMigration = results.filter(
      (r) => r.hasErrorHandling && !r.usesUnifiedHandler
    );

    let script = '#!/bin/bash\n\n';
    script += '# Error Handler Migration Script\n';
    script +=
      '# Run this script to automatically add UnifiedErrorHandler imports\n\n';

    for (const file of needingMigration.slice(0, 5)) {
      // First 5 files
      script += `echo "Migrating ${file.file}..."\n`;
      script += `# Add import if not present\n`;
      script += `grep -q "UnifiedErrorHandler" ${file.file} || sed -i '1i import { errorHandler, ErrorUtils } from "../utils/UnifiedErrorHandler";' ${file.file}\n\n`;
    }

    script +=
      'echo "Migration complete. Please review changes and test thoroughly."\n';
    script += 'echo "Remaining files need manual migration."\n';

    return script;
  }
}

// CLI interface
async function main() {
  const args = process.argv.slice(2);
  const command = args[0] || 'analyze';
  const target = args[1] || 'src';

  const analyzer = new ErrorHandlingAnalyzer();

  switch (command) {
    case 'analyze':
      console.log('🔍 Analyzing error handling integration...');
      const results = await analyzer.analyzeCodebase(target);
      const report = analyzer.generateReport(results);
      console.log(report);

      // Save report
      fs.writeFileSync('error-handling-analysis.md', report);
      console.log('\n📄 Report saved to error-handling-analysis.md');
      break;

    case 'migrate':
      console.log('🔧 Generating migration script...');
      const migrationResults = await analyzer.analyzeCodebase(target);
      const script = await analyzer.generateMigrationScript(migrationResults);
      fs.writeFileSync('migrate-error-handling.sh', script);
      fs.chmodSync('migrate-error-handling.sh', '755');
      console.log('📜 Migration script saved to migrate-error-handling.sh');
      break;

    default:
      console.log('Usage: error-handling-integration [analyze|migrate] [path]');
      console.log('  analyze - Analyze current error handling patterns');
      console.log('  migrate - Generate migration script');
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}

export { ErrorHandlingAnalyzer };
