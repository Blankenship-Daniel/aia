#!/usr/bin/env node

/**
 * Documentation Linter and Auto-Fixer
 *
 * Analyzes TypeScript files for JSDoc coverage and automatically generates
 * consistent documentation following project standards.
 */

import * as fs from 'fs';
import * as path from 'path';
import { glob } from 'glob';

interface MethodInfo {
  name: string;
  line: number;
  parameters: string[];
  returnType: string;
  visibility: 'public' | 'private' | 'protected';
  isAsync: boolean;
  isStatic: boolean;
  hasJSDoc: boolean;
}

interface ClassInfo {
  name: string;
  line: number;
  methods: MethodInfo[];
  hasClassJSDoc: boolean;
}

interface FileReport {
  filePath: string;
  classes: ClassInfo[];
  totalMethods: number;
  documentedMethods: number;
  coverage: number;
  issues: string[];
}

class DocumentationLinter {
  private readonly methodPatterns = [
    // Standard method patterns
    /^(\s*)((?:public|private|protected)?\s*)?(?:(async)\s+)?(?:(static)\s+)?([a-zA-Z_][a-zA-Z0-9_]*)\s*\(([^)]*)\)\s*(?::\s*([^{]+))?\s*\{/,
    // Constructor pattern
    /^(\s*)((?:public|private|protected)?\s*)?constructor\s*\(([^)]*)\)\s*\{/,
  ];

  private readonly classPattern =
    /^(\s*)(?:export\s+)?(?:abstract\s+)?class\s+([a-zA-Z_][a-zA-Z0-9_]*)/;

  async lintProject(rootDir: string): Promise<FileReport[]> {
    const tsFiles = await glob('**/*.ts', {
      cwd: rootDir,
      ignore: [
        'node_modules/**',
        'dist/**',
        'build/**',
        '**/*.d.ts',
        'tests/**',
        'debug/**',
        'coverage/**',
      ],
    });

    const reports: FileReport[] = [];

    for (const file of tsFiles) {
      const filePath = path.join(rootDir, file);
      const report = await this.lintFile(filePath);
      reports.push(report);
    }

    return reports;
  }

  async lintFile(filePath: string): Promise<FileReport> {
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n');

    const classes: ClassInfo[] = [];
    let currentClass: ClassInfo | null = null;
    let totalMethods = 0;
    let documentedMethods = 0;
    const issues: string[] = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmedLine = line.trim();

      // Check for class declaration
      const classMatch = trimmedLine.match(this.classPattern);
      if (classMatch) {
        const className = classMatch[2];
        const hasClassJSDoc = this.hasJSDocAbove(lines, i);

        currentClass = {
          name: className,
          line: i + 1,
          methods: [],
          hasClassJSDoc,
        };

        classes.push(currentClass);

        if (!hasClassJSDoc) {
          issues.push(`Class ${className} at line ${i + 1} missing JSDoc`);
        }
        continue;
      }

      // Check for method declarations
      for (const pattern of this.methodPatterns) {
        const match = trimmedLine.match(pattern);
        if (match) {
          const [
            ,
            indent,
            visibility = '',
            asyncKeyword = '',
            staticKeyword = '',
            methodName,
            params = '',
            returnType = '',
          ] = match;

          // Skip certain keywords and patterns
          if (
            ['if', 'for', 'while', 'switch', 'catch', 'try', 'else'].includes(
              methodName
            )
          ) {
            continue;
          }

          const hasJSDoc = this.hasJSDocAbove(lines, i);
          const parameters = this.parseParameters(params);

          const methodInfo: MethodInfo = {
            name: methodName || 'constructor',
            line: i + 1,
            parameters,
            returnType: returnType?.trim() || 'void',
            visibility: (visibility.trim() as any) || 'public',
            isAsync: !!asyncKeyword,
            isStatic: !!staticKeyword,
            hasJSDoc,
          };

          if (currentClass) {
            currentClass.methods.push(methodInfo);
          }

          totalMethods++;
          if (hasJSDoc) {
            documentedMethods++;
          } else {
            issues.push(
              `Method ${methodName || 'constructor'} at line ${
                i + 1
              } missing JSDoc`
            );
          }

          break;
        }
      }
    }

    const coverage =
      totalMethods > 0 ? (documentedMethods / totalMethods) * 100 : 100;

    return {
      filePath,
      classes,
      totalMethods,
      documentedMethods,
      coverage,
      issues,
    };
  }

  async fixFile(
    filePath: string
  ): Promise<{ fixed: boolean; changes: string[] }> {
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n');
    const newLines: string[] = [];
    const changes: string[] = [];
    let modified = false;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmedLine = line.trim();

      // Check for class without JSDoc
      const classMatch = trimmedLine.match(this.classPattern);
      if (classMatch && !this.hasJSDocAbove(lines, i)) {
        const className = classMatch[2];
        const indent = line.match(/^(\s*)/)?.[1] || '';

        newLines.push(`${indent}/**`);
        newLines.push(`${indent} * ${className} class`);
        newLines.push(`${indent} * `);
        newLines.push(`${indent} * TODO: Add class description`);
        newLines.push(`${indent} */`);

        changes.push(`Added JSDoc for class ${className}`);
        modified = true;
      }

      // Check for method without JSDoc
      for (const pattern of this.methodPatterns) {
        const match = trimmedLine.match(pattern);
        if (match && !this.hasJSDocAbove(lines, i)) {
          const [
            ,
            indent,
            visibility = '',
            asyncKeyword = '',
            staticKeyword = '',
            methodName,
            params = '',
            returnType = '',
          ] = match;

          // Skip control flow keywords
          if (
            ['if', 'for', 'while', 'switch', 'catch', 'try', 'else'].includes(
              methodName
            )
          ) {
            break;
          }

          const parameters = this.parseParameters(params);
          const actualIndent = line.match(/^(\s*)/)?.[1] || '';

          newLines.push(`${actualIndent}/**`);

          if (methodName === 'constructor') {
            newLines.push(`${actualIndent} * Creates an instance of the class`);
          } else {
            const methodDescription =
              this.generateMethodDescription(methodName);
            newLines.push(`${actualIndent} * ${methodDescription}`);
          }

          if (parameters.length > 0) {
            newLines.push(`${actualIndent} * `);
            parameters.forEach((param) => {
              const paramName = param.split(':')[0].trim();
              newLines.push(
                `${actualIndent} * @param ${paramName} - Parameter description`
              );
            });
          }

          if (
            returnType &&
            returnType.trim() !== 'void' &&
            methodName !== 'constructor'
          ) {
            newLines.push(`${actualIndent} * `);
            newLines.push(
              `${actualIndent} * @returns ${returnType.trim()} - Return value description`
            );
          }

          newLines.push(`${actualIndent} */`);

          changes.push(`Added JSDoc for method ${methodName || 'constructor'}`);
          modified = true;
          break;
        }
      }

      newLines.push(line);
    }

    if (modified) {
      fs.writeFileSync(filePath, newLines.join('\n'));
    }

    return {
      fixed: modified,
      changes,
    };
  }

  private hasJSDocAbove(lines: string[], lineIndex: number): boolean {
    for (let i = lineIndex - 1; i >= Math.max(0, lineIndex - 5); i--) {
      const line = lines[i].trim();
      if (line.includes('*/')) {
        return true;
      }
      if (
        line &&
        !line.startsWith('*') &&
        !line.startsWith('//') &&
        !line.startsWith('/**')
      ) {
        break;
      }
    }
    return false;
  }

  private parseParameters(paramString: string): string[] {
    if (!paramString.trim()) return [];

    return paramString
      .split(',')
      .map((param) => param.trim())
      .filter((param) => param.length > 0);
  }

  private generateMethodDescription(methodName: string): string {
    // Generate contextual descriptions based on method names
    const patterns = [
      { pattern: /^get/, description: 'Gets' },
      { pattern: /^set/, description: 'Sets' },
      { pattern: /^create/, description: 'Creates' },
      { pattern: /^generate/, description: 'Generates' },
      { pattern: /^process/, description: 'Processes' },
      { pattern: /^handle/, description: 'Handles' },
      { pattern: /^execute/, description: 'Executes' },
      { pattern: /^validate/, description: 'Validates' },
      { pattern: /^initialize/, description: 'Initializes' },
      { pattern: /^configure/, description: 'Configures' },
      { pattern: /^analyze/, description: 'Analyzes' },
      { pattern: /^calculate/, description: 'Calculates' },
      { pattern: /^build/, description: 'Builds' },
      { pattern: /^parse/, description: 'Parses' },
      { pattern: /^format/, description: 'Formats' },
      { pattern: /^cleanup/, description: 'Cleans up' },
    ];

    for (const { pattern, description } of patterns) {
      if (pattern.test(methodName)) {
        const subject = methodName.replace(pattern, '').toLowerCase();
        return `${description} ${subject || 'the operation'}`;
      }
    }

    return `Handles ${methodName} operation`;
  }

  generateReport(reports: FileReport[]): string {
    const totalFiles = reports.length;
    const totalMethods = reports.reduce((sum, r) => sum + r.totalMethods, 0);
    const totalDocumented = reports.reduce(
      (sum, r) => sum + r.documentedMethods,
      0
    );
    const overallCoverage =
      totalMethods > 0 ? (totalDocumented / totalMethods) * 100 : 100;

    let report = '# Documentation Coverage Report\n\n';
    report += `## Summary\n`;
    report += `- **Files analyzed**: ${totalFiles}\n`;
    report += `- **Total methods**: ${totalMethods}\n`;
    report += `- **Documented methods**: ${totalDocumented}\n`;
    report += `- **Overall coverage**: ${overallCoverage.toFixed(1)}%\n\n`;

    // Files with low coverage
    const lowCoverageFiles = reports.filter((r) => r.coverage < 80);
    if (lowCoverageFiles.length > 0) {
      report += `## Files needing attention (< 80% coverage)\n\n`;
      lowCoverageFiles
        .sort((a, b) => a.coverage - b.coverage)
        .forEach((file) => {
          report += `- **${file.filePath}**: ${file.coverage.toFixed(1)}% (${
            file.documentedMethods
          }/${file.totalMethods})\n`;
        });
      report += '\n';
    }

    // Top issues
    const allIssues = reports.flatMap((r) => r.issues);
    if (allIssues.length > 0) {
      report += `## Issues found\n\n`;
      report += `Total: ${allIssues.length} missing documentation blocks\n\n`;
    }

    return report;
  }
}

// CLI interface
async function main() {
  const args = process.argv.slice(2);
  const command = args[0] || 'lint';
  const target = args[1] || '.';

  const linter = new DocumentationLinter();

  switch (command) {
    case 'lint':
      console.log('🔍 Analyzing documentation coverage...');
      const reports = await linter.lintProject(target);
      const report = linter.generateReport(reports);
      console.log(report);
      break;

    case 'fix':
      console.log('🔧 Fixing documentation issues...');
      const fixReports = await linter.lintProject(target);
      let totalFixed = 0;

      for (const fileReport of fixReports) {
        if (fileReport.issues.length > 0) {
          const result = await linter.fixFile(fileReport.filePath);
          if (result.fixed) {
            console.log(
              `✅ Fixed ${fileReport.filePath}: ${result.changes.join(', ')}`
            );
            totalFixed++;
          }
        }
      }

      console.log(`\n🎉 Fixed documentation in ${totalFixed} files`);
      break;

    default:
      console.log('Usage: documentation-linter [lint|fix] [path]');
      console.log('  lint - Analyze documentation coverage');
      console.log('  fix  - Automatically add missing JSDoc blocks');
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}

export { DocumentationLinter };
