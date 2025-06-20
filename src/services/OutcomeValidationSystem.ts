/**
 * Outcome Validation System
 * Provides comprehensive validation of task execution results
 */

import { TaskType, ValidationStrategy } from './TaskComplexityAnalyzer';
import { SuccessCriterion, ValidationStep } from './PlanningTemplateSystem';

export interface ValidationResult {
  success: boolean;
  score: number; // 0-1
  details: ValidationDetail[];
  summary: string;
  recommendations: string[];
}

export interface ValidationDetail {
  criterion: string;
  expected: any;
  actual: any;
  passed: boolean;
  critical: boolean;
  message: string;
}

export interface TaskOutcome {
  taskDescription: string;
  taskType: TaskType;
  filePath?: string;
  beforeState?: any;
  afterState?: any;
  executionSteps: StepOutcome[];
  timestamp: string;
}

export interface StepOutcome {
  stepId: string;
  success: boolean;
  output: string;
  error?: string;
  duration: number;
}

export class OutcomeValidationSystem {
  /**
   * Validate task outcome against success criteria
   */
  async validateTaskOutcome(
    outcome: TaskOutcome,
    successCriteria: SuccessCriterion[],
    validationSteps: ValidationStep[]
  ): Promise<ValidationResult> {
    const details: ValidationDetail[] = [];
    let totalScore = 0;
    let maxScore = 0;

    // Validate against success criteria
    for (const criterion of successCriteria) {
      const detail = await this.validateCriterion(outcome, criterion);
      details.push(detail);

      if (detail.passed) {
        totalScore += criterion.critical ? 2 : 1;
      }
      maxScore += criterion.critical ? 2 : 1;
    }

    // Run validation steps
    for (const step of validationSteps) {
      const detail = await this.runValidationStep(outcome, step);
      details.push(detail);

      if (detail.passed) {
        totalScore += detail.critical ? 2 : 1;
      }
      maxScore += detail.critical ? 2 : 1;
    }

    const score = maxScore > 0 ? totalScore / maxScore : 0;
    const success = this.determineOverallSuccess(details, score);

    return {
      success,
      score,
      details,
      summary: this.generateSummary(details, score, success),
      recommendations: this.generateRecommendations(details, outcome),
    };
  }

  /**
   * Validate specific task types
   */
  async validateDocumentationTask(
    outcome: TaskOutcome
  ): Promise<ValidationResult> {
    const details: ValidationDetail[] = [];

    // Check if file was modified
    const fileModified = await this.checkFileModified(outcome.filePath!);
    details.push({
      criterion: 'file_modified',
      expected: true,
      actual: fileModified,
      passed: fileModified,
      critical: true,
      message: fileModified
        ? 'File was successfully modified'
        : 'File was not modified',
    });

    // Check JSDoc count
    const jsdocCount = await this.countJSDocComments(outcome.filePath!);
    const methodCount = await this.countMethods(outcome.filePath!);
    details.push({
      criterion: 'jsdoc_coverage',
      expected: methodCount,
      actual: jsdocCount,
      passed: jsdocCount >= methodCount,
      critical: true,
      message: `${jsdocCount}/${methodCount} methods documented`,
    });

    // Check syntax validity
    const syntaxValid = await this.validateSyntax(outcome.filePath!);
    details.push({
      criterion: 'syntax_valid',
      expected: true,
      actual: syntaxValid,
      passed: syntaxValid,
      critical: true,
      message: syntaxValid ? 'File syntax is valid' : 'File has syntax errors',
    });

    // Check backup exists
    const backupExists = await this.checkFileExists(
      `${outcome.filePath}.backup`
    );
    details.push({
      criterion: 'backup_created',
      expected: true,
      actual: backupExists,
      passed: backupExists,
      critical: true,
      message: backupExists ? 'Backup file created' : 'No backup file found',
    });

    const score = this.calculateScore(details);
    const success = this.determineOverallSuccess(details, score);

    return {
      success,
      score,
      details,
      summary: this.generateDocumentationSummary(
        details,
        jsdocCount,
        methodCount
      ),
      recommendations: this.generateDocumentationRecommendations(details),
    };
  }

  /**
   * Validate code modification tasks
   */
  async validateCodeModificationTask(
    outcome: TaskOutcome
  ): Promise<ValidationResult> {
    const details: ValidationDetail[] = [];

    // Check file modification
    const fileModified = await this.checkFileModified(outcome.filePath!);
    details.push({
      criterion: 'file_modified',
      expected: true,
      actual: fileModified,
      passed: fileModified,
      critical: true,
      message: fileModified
        ? 'Code was successfully modified'
        : 'No code modifications detected',
    });

    // Check syntax validity
    const syntaxValid = await this.validateSyntax(outcome.filePath!);
    details.push({
      criterion: 'syntax_valid',
      expected: true,
      actual: syntaxValid,
      passed: syntaxValid,
      critical: true,
      message: syntaxValid
        ? 'Modified code has valid syntax'
        : 'Modified code has syntax errors',
    });

    // Check backup exists
    const backupExists = await this.checkFileExists(
      `${outcome.filePath}.backup`
    );
    details.push({
      criterion: 'backup_created',
      expected: true,
      actual: backupExists,
      passed: backupExists,
      critical: true,
      message: backupExists
        ? 'Backup created before modification'
        : 'No backup found - risky modification',
    });

    // Check if tests pass (if tests exist)
    const testsPass = await this.runTests(outcome.filePath!);
    if (testsPass !== null) {
      details.push({
        criterion: 'tests_pass',
        expected: true,
        actual: testsPass,
        passed: testsPass,
        critical: false,
        message: testsPass ? 'All tests pass' : 'Some tests are failing',
      });
    }

    const score = this.calculateScore(details);
    const success = this.determineOverallSuccess(details, score);

    return {
      success,
      score,
      details,
      summary: this.generateCodeModificationSummary(details),
      recommendations: this.generateCodeModificationRecommendations(details),
    };
  }

  private async validateCriterion(
    outcome: TaskOutcome,
    criterion: SuccessCriterion
  ): Promise<ValidationDetail> {
    let actual: any;
    let passed: boolean;

    switch (criterion.metric) {
      case 'methods_documented':
        if (outcome.filePath) {
          const methodCount = await this.countMethods(outcome.filePath);
          const jsdocCount = await this.countJSDocComments(outcome.filePath);
          actual = `${jsdocCount}/${methodCount}`;
          passed =
            criterion.target === 'all'
              ? jsdocCount >= methodCount
              : jsdocCount > 0;
        } else {
          actual = 'unknown';
          passed = false;
        }
        break;

      case 'syntax_valid':
        if (outcome.filePath) {
          actual = await this.validateSyntax(outcome.filePath);
          passed = actual === criterion.target;
        } else {
          actual = false;
          passed = false;
        }
        break;

      case 'backup_created':
        if (outcome.filePath) {
          actual = await this.checkFileExists(`${outcome.filePath}.backup`);
          passed = actual === criterion.target;
        } else {
          actual = false;
          passed = false;
        }
        break;

      case 'file_modified':
        if (outcome.filePath) {
          actual = await this.checkFileModified(outcome.filePath);
          passed = actual === criterion.target;
        } else {
          actual = false;
          passed = false;
        }
        break;

      default:
        actual = 'unknown';
        passed = false;
    }

    return {
      criterion: criterion.metric,
      expected: criterion.target,
      actual,
      passed,
      critical: criterion.critical,
      message: this.formatCriterionMessage(criterion, actual, passed),
    };
  }

  private async runValidationStep(
    outcome: TaskOutcome,
    step: ValidationStep
  ): Promise<ValidationDetail> {
    let actual: any;
    let passed: boolean;

    switch (step.method) {
      case 'file_exists':
        const filePath = this.interpolatePath(step.parameters.path, outcome);
        actual = await this.checkFileExists(filePath);
        passed = actual === step.expectedResult;
        break;

      case 'syntax_check':
        if (outcome.filePath) {
          actual = await this.validateSyntax(outcome.filePath);
          passed = actual === step.expectedResult;
        } else {
          actual = false;
          passed = false;
        }
        break;

      case 'count_match':
        if (outcome.filePath) {
          actual = await this.countPattern(
            outcome.filePath,
            step.parameters.pattern
          );
          passed = this.matchesExpectedCount(actual, step.expectedResult);
        } else {
          actual = 0;
          passed = false;
        }
        break;

      case 'content_match':
        if (outcome.filePath) {
          actual = await this.checkContentMatch(
            outcome.filePath,
            step.parameters
          );
          passed = actual === step.expectedResult;
        } else {
          actual = false;
          passed = false;
        }
        break;

      case 'execution_test':
        actual = await this.runExecutionTest(step.parameters.command);
        passed = actual === step.expectedResult;
        break;

      default:
        actual = 'unknown';
        passed = false;
    }

    return {
      criterion: step.id,
      expected: step.expectedResult,
      actual,
      passed,
      critical: true, // Validation steps are generally critical
      message: `${step.description}: ${passed ? 'PASS' : 'FAIL'}`,
    };
  }

  // Helper methods for file analysis
  private async checkFileExists(filePath: string): Promise<boolean> {
    try {
      const fs = await import('fs');
      return fs.existsSync(filePath);
    } catch {
      return false;
    }
  }

  private async checkFileModified(filePath: string): Promise<boolean> {
    try {
      const fs = await import('fs');
      const backupPath = `${filePath}.backup`;

      if (!fs.existsSync(filePath) || !fs.existsSync(backupPath)) {
        return false;
      }

      const originalContent = fs.readFileSync(backupPath, 'utf8');
      const currentContent = fs.readFileSync(filePath, 'utf8');

      return originalContent !== currentContent;
    } catch {
      return false;
    }
  }

  private async countMethods(filePath: string): Promise<number> {
    try {
      const fs = await import('fs');
      const content = fs.readFileSync(filePath, 'utf8');

      // Simple regex to count method declarations (could be enhanced with AST)
      const methodRegex =
        /(async\s+)?(private\s+|public\s+|protected\s+)?\s*\w+\s*\([^)]*\)\s*:\s*[^{]+\{|function\s+\w+\s*\([^)]*\)\s*\{/g;
      const matches = content.match(methodRegex);

      return matches ? matches.length : 0;
    } catch {
      return 0;
    }
  }

  private async countJSDocComments(filePath: string): Promise<number> {
    try {
      const fs = await import('fs');
      const content = fs.readFileSync(filePath, 'utf8');

      // Count JSDoc comments (/** ... */)
      const jsdocRegex = /\/\*\*[\s\S]*?\*\//g;
      const matches = content.match(jsdocRegex);

      return matches ? matches.length : 0;
    } catch {
      return 0;
    }
  }

  private async validateSyntax(filePath: string): Promise<boolean> {
    try {
      // For TypeScript files, we could use TypeScript compiler API
      // For now, simple check for obvious syntax errors
      const fs = await import('fs');
      const content = fs.readFileSync(filePath, 'utf8');

      // Basic syntax checks
      const openBraces = (content.match(/\{/g) || []).length;
      const closeBraces = (content.match(/\}/g) || []).length;
      const openParens = (content.match(/\(/g) || []).length;
      const closeParens = (content.match(/\)/g) || []).length;

      return openBraces === closeBraces && openParens === closeParens;
    } catch {
      return false;
    }
  }

  private async runTests(filePath: string): Promise<boolean | null> {
    try {
      // Check if tests exist for the file
      const testPath = filePath.replace(/\.ts$/, '.test.ts');
      if (!(await this.checkFileExists(testPath))) {
        return null; // No tests exist
      }

      // Run tests (simplified - could use actual test runner)
      const { exec } = await import('child_process');
      return new Promise((resolve) => {
        exec('npm test', (error) => {
          resolve(!error);
        });
      });
    } catch {
      return null;
    }
  }

  private async countPattern(
    filePath: string,
    pattern: string
  ): Promise<number> {
    try {
      const fs = await import('fs');
      const content = fs.readFileSync(filePath, 'utf8');

      switch (pattern) {
        case 'method_with_jsdoc':
          // Count methods that have JSDoc immediately before them
          const methodWithJsdocRegex =
            /\/\*\*[\s\S]*?\*\/\s*(async\s+)?(private\s+|public\s+|protected\s+)?\s*\w+\s*\([^)]*\)/g;
          const matches = content.match(methodWithJsdocRegex);
          return matches ? matches.length : 0;
        default:
          return 0;
      }
    } catch {
      return 0;
    }
  }

  private async checkContentMatch(
    filePath: string,
    parameters: any
  ): Promise<boolean> {
    // Implementation depends on content matching requirements
    return true;
  }

  private async runExecutionTest(command: string): Promise<string> {
    try {
      const { exec } = await import('child_process');
      return new Promise((resolve) => {
        exec(command, (error) => {
          resolve(error ? 'failure' : 'success');
        });
      });
    } catch {
      return 'failure';
    }
  }

  // Helper methods
  private interpolatePath(path: string, outcome: TaskOutcome): string {
    return path.replace('{filePath}', outcome.filePath || '');
  }

  private matchesExpectedCount(actual: number, expected: any): boolean {
    if (expected === 'all_methods') {
      // Would need method count comparison
      return actual > 0;
    }
    return actual >= expected;
  }

  private calculateScore(details: ValidationDetail[]): number {
    let totalScore = 0;
    let maxScore = 0;

    for (const detail of details) {
      if (detail.passed) {
        totalScore += detail.critical ? 2 : 1;
      }
      maxScore += detail.critical ? 2 : 1;
    }

    return maxScore > 0 ? totalScore / maxScore : 0;
  }

  private determineOverallSuccess(
    details: ValidationDetail[],
    score: number
  ): boolean {
    // Fail if any critical criteria fail
    const criticalFailures = details.filter((d) => d.critical && !d.passed);
    if (criticalFailures.length > 0) {
      return false;
    }

    // Require minimum score
    return score >= 0.7;
  }

  private formatCriterionMessage(
    criterion: SuccessCriterion,
    actual: any,
    passed: boolean
  ): string {
    return `${criterion.description}: Expected ${
      criterion.target
    }, got ${actual} - ${passed ? 'PASS' : 'FAIL'}`;
  }

  private generateSummary(
    details: ValidationDetail[],
    score: number,
    success: boolean
  ): string {
    const passedCount = details.filter((d) => d.passed).length;
    const totalCount = details.length;
    const criticalFailures = details.filter(
      (d) => d.critical && !d.passed
    ).length;

    let summary = `Validation ${
      success ? 'PASSED' : 'FAILED'
    } - Score: ${Math.round(score * 100)}%\n`;
    summary += `Criteria: ${passedCount}/${totalCount} passed`;

    if (criticalFailures > 0) {
      summary += ` (${criticalFailures} critical failures)`;
    }

    return summary;
  }

  private generateDocumentationSummary(
    details: ValidationDetail[],
    jsdocCount: number,
    methodCount: number
  ): string {
    const success = details.every((d) => !d.critical || d.passed);
    const coverage =
      methodCount > 0 ? Math.round((jsdocCount / methodCount) * 100) : 0;

    return (
      `Documentation Task ${success ? 'COMPLETED' : 'FAILED'}\n` +
      `JSDoc Coverage: ${jsdocCount}/${methodCount} methods (${coverage}%)\n` +
      `File Status: ${
        details.find((d) => d.criterion === 'syntax_valid')?.passed
          ? 'Valid'
          : 'Invalid'
      } syntax`
    );
  }

  private generateCodeModificationSummary(details: ValidationDetail[]): string {
    const success = details.every((d) => !d.critical || d.passed);

    return (
      `Code Modification ${success ? 'COMPLETED' : 'FAILED'}\n` +
      `Modifications Applied: ${
        details.find((d) => d.criterion === 'file_modified')?.passed
          ? 'Yes'
          : 'No'
      }\n` +
      `Syntax Valid: ${
        details.find((d) => d.criterion === 'syntax_valid')?.passed
          ? 'Yes'
          : 'No'
      }\n` +
      `Backup Created: ${
        details.find((d) => d.criterion === 'backup_created')?.passed
          ? 'Yes'
          : 'No'
      }`
    );
  }

  private generateRecommendations(
    details: ValidationDetail[],
    outcome: TaskOutcome
  ): string[] {
    const recommendations: string[] = [];
    const failedCritical = details.filter((d) => d.critical && !d.passed);

    for (const detail of failedCritical) {
      switch (detail.criterion) {
        case 'file_modified':
          recommendations.push(
            'Verify that the task actually requires file modification'
          );
          break;
        case 'syntax_valid':
          recommendations.push(
            'Check for syntax errors and fix them before proceeding'
          );
          break;
        case 'backup_created':
          recommendations.push(
            'Always create backup files before making modifications'
          );
          break;
        case 'methods_documented':
          recommendations.push('Ensure all methods have JSDoc documentation');
          break;
      }
    }

    if (recommendations.length === 0) {
      recommendations.push(
        'Task completed successfully - no improvements needed'
      );
    }

    return recommendations;
  }

  private generateDocumentationRecommendations(
    details: ValidationDetail[]
  ): string[] {
    const recommendations: string[] = [];

    const syntaxFailed = details.find(
      (d) => d.criterion === 'syntax_valid' && !d.passed
    );
    if (syntaxFailed) {
      recommendations.push('Fix syntax errors in the documentation');
      recommendations.push('Verify JSDoc syntax is correct');
    }

    const incompleteCoverage = details.find(
      (d) => d.criterion === 'jsdoc_coverage' && !d.passed
    );
    if (incompleteCoverage) {
      recommendations.push(
        'Add JSDoc comments to remaining undocumented methods'
      );
      recommendations.push(
        'Ensure all public methods have comprehensive documentation'
      );
    }

    const noBackup = details.find(
      (d) => d.criterion === 'backup_created' && !d.passed
    );
    if (noBackup) {
      recommendations.push('Create backup files before modifying source code');
    }

    if (recommendations.length === 0) {
      recommendations.push('Documentation task completed successfully');
      recommendations.push('Consider adding more detailed JSDoc with examples');
    }

    return recommendations;
  }

  private generateCodeModificationRecommendations(
    details: ValidationDetail[]
  ): string[] {
    const recommendations: string[] = [];

    const noModification = details.find(
      (d) => d.criterion === 'file_modified' && !d.passed
    );
    if (noModification) {
      recommendations.push(
        'Verify that code modifications were actually applied'
      );
      recommendations.push(
        'Check if the modification logic is working correctly'
      );
    }

    const syntaxErrors = details.find(
      (d) => d.criterion === 'syntax_valid' && !d.passed
    );
    if (syntaxErrors) {
      recommendations.push('Fix syntax errors introduced by modifications');
      recommendations.push(
        'Consider using AST-based modifications for better syntax safety'
      );
    }

    const testFailures = details.find(
      (d) => d.criterion === 'tests_pass' && !d.passed
    );
    if (testFailures) {
      recommendations.push('Investigate test failures caused by modifications');
      recommendations.push('Update tests if behavior changes are intentional');
    }

    if (recommendations.length === 0) {
      recommendations.push('Code modification completed successfully');
      recommendations.push(
        'Consider running additional tests to verify functionality'
      );
    }

    return recommendations;
  }
}
