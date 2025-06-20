/**
 * Planning Template System
 * Provides sophisticated planning templates for different development tasks
 */

import { ExecutionStep } from '../types/index';
import {
  TaskType,
  TaskComplexity,
  TaskAnalysis,
} from './TaskComplexityAnalyzer';

export interface PlanningTemplate {
  name: string;
  taskType: TaskType;
  description: string;
  stepTemplates: StepTemplate[];
  validationSteps: ValidationStep[];
  successCriteria: SuccessCriterion[];
}

export interface StepTemplate {
  id: string;
  description: string;
  command?: string;
  type: 'analysis' | 'modification' | 'validation' | 'reporting';
  critical: boolean;
  dependencies: string[];
  timeout: number;
  expectedOutcome: string;
  failureHandling: string;
}

export interface ValidationStep {
  id: string;
  description: string;
  method:
    | 'file_exists'
    | 'syntax_check'
    | 'content_match'
    | 'count_match'
    | 'execution_test';
  parameters: Record<string, any>;
  expectedResult: any;
}

export interface SuccessCriterion {
  metric: string;
  target: any;
  critical: boolean;
  description: string;
}

export class PlanningTemplateSystem {
  private templates: Map<TaskType, PlanningTemplate> = new Map();

  constructor() {
    this.initializeTemplates();
  }

  /**
   * Generate a plan based on task analysis
   */
  generatePlan(
    taskAnalysis: TaskAnalysis,
    taskDescription: string,
    context: any
  ): ExecutionStep[] {
    const template = this.templates.get(taskAnalysis.type);
    if (!template) {
      return this.generateGenericPlan(taskDescription, context);
    }

    return this.instantiateTemplate(
      template,
      taskDescription,
      context,
      taskAnalysis
    );
  }

  /**
   * Get success criteria for a task type
   */
  getSuccessCriteria(taskType: TaskType): SuccessCriterion[] {
    const template = this.templates.get(taskType);
    return template?.successCriteria || [];
  }

  /**
   * Get validation steps for a task type
   */
  getValidationSteps(taskType: TaskType): ValidationStep[] {
    const template = this.templates.get(taskType);
    return template?.validationSteps || [];
  }

  private initializeTemplates(): void {
    // Documentation Template
    this.templates.set(TaskType.DOCUMENTATION, {
      name: 'JSDoc Documentation Template',
      taskType: TaskType.DOCUMENTATION,
      description: 'Add comprehensive JSDoc documentation to code files',
      stepTemplates: [
        {
          id: 'analyze_file',
          description: 'Analyze target file structure and identify methods',
          type: 'analysis',
          critical: true,
          dependencies: [],
          timeout: 30000,
          expectedOutcome:
            'List of methods and functions requiring documentation',
          failureHandling: 'Cannot proceed without file analysis',
        },
        {
          id: 'backup_file',
          description: 'Create backup of original file',
          command: 'cp {filePath} {filePath}.backup',
          type: 'modification',
          critical: true,
          dependencies: ['analyze_file'],
          timeout: 10000,
          expectedOutcome: 'Backup file created successfully',
          failureHandling: 'High risk operation - require backup',
        },
        {
          id: 'extract_methods',
          description: 'Parse file and extract all method signatures',
          type: 'analysis',
          critical: true,
          dependencies: ['analyze_file'],
          timeout: 20000,
          expectedOutcome: 'Structured data of all methods with signatures',
          failureHandling: 'Use simpler parsing if AST parsing fails',
        },
        {
          id: 'generate_jsdoc',
          description: 'Generate JSDoc comments for each method',
          type: 'modification',
          critical: true,
          dependencies: ['extract_methods'],
          timeout: 45000,
          expectedOutcome: 'JSDoc comments generated for all methods',
          failureHandling: 'Generate basic docs if detailed analysis fails',
        },
        {
          id: 'insert_documentation',
          description: 'Insert JSDoc comments into the source file',
          type: 'modification',
          critical: true,
          dependencies: ['generate_jsdoc'],
          timeout: 30000,
          expectedOutcome: 'JSDoc comments inserted before each method',
          failureHandling: 'Restore from backup if insertion fails',
        },
        {
          id: 'validate_syntax',
          description: 'Validate that the modified file has correct syntax',
          command: 'npx tsc --noEmit {filePath}',
          type: 'validation',
          critical: true,
          dependencies: ['insert_documentation'],
          timeout: 20000,
          expectedOutcome: 'File compiles without syntax errors',
          failureHandling: 'Restore from backup if syntax is invalid',
        },
        {
          id: 'validate_documentation',
          description: 'Validate JSDoc documentation coverage for all methods',
          type: 'validation',
          critical: true,
          dependencies: ['validate_syntax'],
          timeout: 15000,
          expectedOutcome: 'All methods have JSDoc comments',
          failureHandling: 'Report missing documentation',
        },
        {
          id: 'generate_report',
          description: 'Generate completion report with metrics',
          type: 'reporting',
          critical: false,
          dependencies: ['validate_documentation'],
          timeout: 10000,
          expectedOutcome: 'Report showing documentation coverage',
          failureHandling: 'Continue without report if needed',
        },
      ],
      validationSteps: [
        {
          id: 'file_syntax_valid',
          description: 'Verify file has valid syntax',
          method: 'syntax_check',
          parameters: { language: 'typescript' },
          expectedResult: true,
        },
        {
          id: 'documentation_count',
          description: 'Count of methods with JSDoc',
          method: 'count_match',
          parameters: { pattern: 'method_with_jsdoc' },
          expectedResult: 'all_methods',
        },
        {
          id: 'backup_exists',
          description: 'Backup file was created',
          method: 'file_exists',
          parameters: { path: '{filePath}.backup' },
          expectedResult: true,
        },
      ],
      successCriteria: [
        {
          metric: 'methods_documented',
          target: 'all',
          critical: true,
          description: 'All methods must have JSDoc documentation',
        },
        {
          metric: 'syntax_valid',
          target: true,
          critical: true,
          description: 'Modified file must have valid syntax',
        },
        {
          metric: 'backup_created',
          target: true,
          critical: true,
          description: 'Backup file must be created for safety',
        },
        {
          metric: 'jsdoc_quality',
          target: 'complete',
          critical: false,
          description: 'JSDoc should include @param, @returns, @description',
        },
      ],
    });

    // Code Modification Template
    this.templates.set(TaskType.CODE_MODIFICATION, {
      name: 'Code Modification Template',
      taskType: TaskType.CODE_MODIFICATION,
      description: 'Modify existing code with proper validation',
      stepTemplates: [
        {
          id: 'analyze_target',
          description: 'Analyze target code and modification requirements',
          type: 'analysis',
          critical: true,
          dependencies: [],
          timeout: 30000,
          expectedOutcome: 'Understanding of current code and required changes',
          failureHandling: 'Cannot proceed without understanding target code',
        },
        {
          id: 'backup_files',
          description: 'Create backups of all files to be modified',
          type: 'modification',
          critical: true,
          dependencies: ['analyze_target'],
          timeout: 15000,
          expectedOutcome: 'Backup files created',
          failureHandling: 'Abort if backup fails',
        },
        {
          id: 'plan_modifications',
          description: 'Plan specific code modifications',
          type: 'analysis',
          critical: true,
          dependencies: ['analyze_target'],
          timeout: 25000,
          expectedOutcome: 'Detailed modification plan',
          failureHandling: 'Use simpler approach if complex planning fails',
        },
        {
          id: 'apply_modifications',
          description: 'Apply planned code modifications',
          type: 'modification',
          critical: true,
          dependencies: ['plan_modifications', 'backup_files'],
          timeout: 60000,
          expectedOutcome: 'Code modifications applied',
          failureHandling: 'Restore from backup if modifications fail',
        },
        {
          id: 'validate_syntax',
          description: 'Validate syntax of modified code',
          type: 'validation',
          critical: true,
          dependencies: ['apply_modifications'],
          timeout: 20000,
          expectedOutcome: 'Code compiles without syntax errors',
          failureHandling: 'Restore from backup if syntax errors',
        },
        {
          id: 'run_tests',
          description: 'Run existing tests to verify modifications',
          type: 'validation',
          critical: false,
          dependencies: ['validate_syntax'],
          timeout: 120000,
          expectedOutcome: 'Tests pass with modifications',
          failureHandling: 'Report test failures but continue',
        },
        {
          id: 'generate_report',
          description: 'Generate modification report',
          type: 'reporting',
          critical: false,
          dependencies: ['validate_syntax'],
          timeout: 10000,
          expectedOutcome: 'Report of changes made',
          failureHandling: 'Continue without report',
        },
      ],
      validationSteps: [
        {
          id: 'syntax_validation',
          description: 'Validate code syntax',
          method: 'syntax_check',
          parameters: { language: 'auto-detect' },
          expectedResult: true,
        },
        {
          id: 'modification_applied',
          description: 'Verify modifications were applied',
          method: 'content_match',
          parameters: { type: 'modification_markers' },
          expectedResult: true,
        },
      ],
      successCriteria: [
        {
          metric: 'modifications_applied',
          target: true,
          critical: true,
          description: 'All planned modifications must be applied',
        },
        {
          metric: 'syntax_valid',
          target: true,
          critical: true,
          description: 'Modified code must compile',
        },
        {
          metric: 'functionality_preserved',
          target: true,
          critical: true,
          description: 'Existing functionality must be preserved',
        },
      ],
    });

    // Test Generation Template
    this.templates.set(TaskType.TEST_GENERATION, {
      name: 'Test Generation Template',
      taskType: TaskType.TEST_GENERATION,
      description: 'Generate comprehensive test suites',
      stepTemplates: [
        {
          id: 'analyze_code',
          description: 'Analyze code to understand testing requirements',
          type: 'analysis',
          critical: true,
          dependencies: [],
          timeout: 30000,
          expectedOutcome: 'Understanding of code structure and test needs',
          failureHandling: 'Cannot generate tests without code analysis',
        },
        {
          id: 'identify_test_cases',
          description: 'Identify test cases and scenarios',
          type: 'analysis',
          critical: true,
          dependencies: ['analyze_code'],
          timeout: 25000,
          expectedOutcome: 'List of test cases to implement',
          failureHandling: 'Generate basic tests if detailed analysis fails',
        },
        {
          id: 'generate_tests',
          description: 'Generate test code',
          type: 'modification',
          critical: true,
          dependencies: ['identify_test_cases'],
          timeout: 60000,
          expectedOutcome: 'Test code generated',
          failureHandling: 'Generate simpler tests if complex generation fails',
        },
        {
          id: 'validate_tests',
          description: 'Validate generated test syntax',
          type: 'validation',
          critical: true,
          dependencies: ['generate_tests'],
          timeout: 20000,
          expectedOutcome: 'Tests have valid syntax',
          failureHandling: 'Fix syntax errors or use simpler tests',
        },
        {
          id: 'run_tests',
          description: 'Execute generated tests',
          type: 'validation',
          critical: true,
          dependencies: ['validate_tests'],
          timeout: 60000,
          expectedOutcome: 'Tests execute successfully',
          failureHandling: 'Debug test execution issues',
        },
      ],
      validationSteps: [
        {
          id: 'test_execution',
          description: 'Tests execute without errors',
          method: 'execution_test',
          parameters: { command: 'npm test' },
          expectedResult: 'success',
        },
        {
          id: 'test_coverage',
          description: 'Verify test coverage',
          method: 'count_match',
          parameters: { metric: 'test_cases' },
          expectedResult: 'adequate',
        },
      ],
      successCriteria: [
        {
          metric: 'tests_generated',
          target: true,
          critical: true,
          description: 'Test files must be generated',
        },
        {
          metric: 'tests_executable',
          target: true,
          critical: true,
          description: 'Generated tests must be executable',
        },
        {
          metric: 'coverage_adequate',
          target: true,
          critical: false,
          description: 'Tests should provide adequate coverage',
        },
      ],
    });

    // Refactoring Template
    this.templates.set(TaskType.REFACTORING, {
      name: 'Code Refactoring Template',
      taskType: TaskType.REFACTORING,
      description: 'Refactor existing code while preserving functionality',
      stepTemplates: [
        {
          id: 'analyze_codebase',
          description:
            'Analyze existing codebase and identify refactoring targets',
          type: 'analysis',
          critical: true,
          dependencies: [],
          timeout: 45000,
          expectedOutcome:
            'Understanding of current code structure and refactoring needs',
          failureHandling: 'Cannot proceed without codebase analysis',
        },
        {
          id: 'backup_files',
          description:
            'Create comprehensive backups of all files to be refactored',
          type: 'modification',
          critical: true,
          dependencies: ['analyze_codebase'],
          timeout: 20000,
          expectedOutcome: 'All target files backed up safely',
          failureHandling: 'Abort refactoring if backup fails',
        },
        {
          id: 'analyze_dependencies',
          description:
            'Analyze dependencies and potential impact of refactoring',
          type: 'analysis',
          critical: true,
          dependencies: ['analyze_codebase'],
          timeout: 35000,
          expectedOutcome: 'Understanding of dependency graph and impact areas',
          failureHandling: 'Use limited scope if full analysis fails',
        },
        {
          id: 'plan_refactoring',
          description:
            'Create detailed refactoring plan with steps and validation',
          type: 'analysis',
          critical: true,
          dependencies: ['analyze_dependencies'],
          timeout: 30000,
          expectedOutcome: 'Step-by-step refactoring plan',
          failureHandling: 'Use simpler approach if complex planning fails',
        },
        {
          id: 'apply_refactoring',
          description: 'Apply planned refactoring changes',
          type: 'modification',
          critical: true,
          dependencies: ['plan_refactoring', 'backup_files'],
          timeout: 90000,
          expectedOutcome: 'Refactoring changes applied to codebase',
          failureHandling: 'Restore from backup if refactoring fails',
        },
        {
          id: 'validate_syntax',
          description: 'Validate syntax of refactored code',
          type: 'validation',
          critical: true,
          dependencies: ['apply_refactoring'],
          timeout: 25000,
          expectedOutcome: 'All refactored code has valid syntax',
          failureHandling: 'Fix syntax errors or restore from backup',
        },
        {
          id: 'run_tests',
          description: 'Run test suite to verify functionality preservation',
          type: 'validation',
          critical: true,
          dependencies: ['validate_syntax'],
          timeout: 120000,
          expectedOutcome: 'All tests pass with refactored code',
          failureHandling:
            'Investigate failures, may need to adjust refactoring',
        },
        {
          id: 'generate_report',
          description: 'Generate refactoring report with changes and metrics',
          type: 'reporting',
          critical: false,
          dependencies: ['run_tests'],
          timeout: 15000,
          expectedOutcome: 'Comprehensive refactoring report generated',
          failureHandling: 'Continue without report if generation fails',
        },
      ],
      validationSteps: [
        {
          id: 'syntax_validation',
          description: 'Validate refactored code syntax',
          method: 'syntax_check',
          parameters: { language: 'auto-detect' },
          expectedResult: true,
        },
        {
          id: 'test_validation',
          description: 'Verify tests pass after refactoring',
          method: 'execution_test',
          parameters: { command: 'npm test' },
          expectedResult: 'success',
        },
        {
          id: 'backup_validation',
          description: 'Verify backups were created',
          method: 'file_exists',
          parameters: { pattern: '*.backup' },
          expectedResult: true,
        },
      ],
      successCriteria: [
        {
          metric: 'refactoring_applied',
          target: true,
          critical: true,
          description: 'All planned refactoring changes must be applied',
        },
        {
          metric: 'functionality_preserved',
          target: true,
          critical: true,
          description: 'All existing functionality must be preserved',
        },
        {
          metric: 'code_quality_improved',
          target: true,
          critical: false,
          description: 'Code quality metrics should improve',
        },
        {
          metric: 'tests_pass',
          target: true,
          critical: true,
          description: 'All tests must pass after refactoring',
        },
      ],
    });

    // Add more templates for other task types...
    this.addSimpleTemplates();
  }

  private addSimpleTemplates(): void {
    // File Operation Template
    this.templates.set(TaskType.FILE_OPERATION, {
      name: 'File Operation Template',
      taskType: TaskType.FILE_OPERATION,
      description: 'Perform file operations safely',
      stepTemplates: [
        {
          id: 'validate_target',
          description: 'Validate target files/directories exist',
          type: 'analysis',
          critical: true,
          dependencies: [],
          timeout: 10000,
          expectedOutcome: 'Target validation complete',
          failureHandling: 'Cannot proceed with invalid targets',
        },
        {
          id: 'execute_operation',
          description: 'Execute file operation',
          type: 'modification',
          critical: true,
          dependencies: ['validate_target'],
          timeout: 30000,
          expectedOutcome: 'File operation completed',
          failureHandling: 'Rollback if operation fails',
        },
        {
          id: 'verify_result',
          description: 'Verify operation result',
          type: 'validation',
          critical: true,
          dependencies: ['execute_operation'],
          timeout: 10000,
          expectedOutcome: 'Operation verified successful',
          failureHandling: 'Report verification failure',
        },
      ],
      validationSteps: [
        {
          id: 'operation_completed',
          description: 'File operation completed successfully',
          method: 'file_exists',
          parameters: { checkTarget: true },
          expectedResult: true,
        },
      ],
      successCriteria: [
        {
          metric: 'operation_completed',
          target: true,
          critical: true,
          description: 'File operation must complete successfully',
        },
      ],
    });

    // Analysis Template
    this.templates.set(TaskType.ANALYSIS, {
      name: 'Code Analysis Template',
      taskType: TaskType.ANALYSIS,
      description: 'Analyze code and generate reports',
      stepTemplates: [
        {
          id: 'perform_analysis',
          description: 'Analyze and provide results',
          command: '', // Will be dynamically generated based on task
          type: 'analysis',
          critical: true,
          dependencies: [],
          timeout: 60000,
          expectedOutcome: 'Analysis results gathered',
          failureHandling: 'Use simpler analysis if detailed fails',
        },
      ],
      validationSteps: [
        {
          id: 'report_generated',
          description: 'Analysis report was generated',
          method: 'content_match',
          parameters: { type: 'report_content' },
          expectedResult: true,
        },
      ],
      successCriteria: [
        {
          metric: 'analysis_completed',
          target: true,
          critical: true,
          description: 'Analysis must complete successfully',
        },
        {
          metric: 'report_generated',
          target: true,
          critical: true,
          description: 'Analysis report must be generated',
        },
      ],
    });

    // Analysis Template
    this.templates.set(TaskType.ANALYSIS, {
      name: 'Analysis Template',
      taskType: TaskType.ANALYSIS,
      description: 'Analyze files, directories, or code structures',
      stepTemplates: [
        {
          id: 'perform_analysis',
          description: 'Analyze and provide results',
          type: 'analysis',
          critical: true,
          dependencies: [],
          timeout: 60000,
          expectedOutcome: 'Analysis results gathered',
          failureHandling: 'Try alternative analysis methods',
        },
      ],
      validationSteps: [
        {
          id: 'results_generated',
          description: 'Analysis results were generated',
          method: 'content_match',
          parameters: { pattern: 'ANSWER:' },
          expectedResult: true,
        },
      ],
      successCriteria: [
        {
          metric: 'data_collected',
          target: true,
          critical: true,
          description: 'Data must be successfully collected',
        },
        {
          metric: 'results_clear',
          target: true,
          critical: true,
          description: 'Results must be clearly presented',
        },
      ],
    });
  }

  private instantiateTemplate(
    template: PlanningTemplate,
    taskDescription: string,
    context: any,
    taskAnalysis: TaskAnalysis
  ): ExecutionStep[] {
    const steps: ExecutionStep[] = [];

    for (const stepTemplate of template.stepTemplates) {
      let command = stepTemplate.command
        ? this.interpolateCommand(stepTemplate.command, context)
        : '';

      // Generate specific commands for analysis tasks
      if (template.taskType === TaskType.ANALYSIS && !command) {
        command = this.generateAnalysisCommand(
          stepTemplate.id,
          taskDescription,
          context
        );
      }

      const step: ExecutionStep = {
        id: stepTemplate.id,
        description: this.interpolateDescription(
          stepTemplate.description,
          taskDescription,
          context
        ),
        command,
        expectedOutcome: stepTemplate.expectedOutcome,
        reasoning: `This step is ${
          stepTemplate.critical ? 'critical' : 'optional'
        } for ${template.description}`,
        risks: stepTemplate.critical
          ? ['Failure may cause task failure']
          : ['Non-critical step'],
        dependencies: stepTemplate.dependencies,
        timeout: stepTemplate.timeout,
      };

      steps.push(step);
    }

    return steps;
  }

  private interpolateDescription(
    description: string,
    taskDescription: string,
    context: any
  ): string {
    let result = description;

    // Replace common placeholders
    result = result.replace('{taskDescription}', taskDescription);
    result = result.replace('{filePath}', context.filePath || 'target file');
    result = result.replace('{projectType}', context.projectType || 'project');

    return result;
  }

  private interpolateCommand(command: string, context: any): string {
    let result = command;

    // Replace common placeholders
    result = result.replace('{filePath}', context.filePath || '');
    result = result.replace(
      '{workingDirectory}',
      context.workingDirectory || '.'
    );

    return result;
  }

  private generateGenericPlan(
    taskDescription: string,
    context: any
  ): ExecutionStep[] {
    return [
      {
        id: 'analyze_task',
        description: `Analyze task: ${taskDescription}`,
        command: '',
        expectedOutcome: 'Task requirements understood',
        reasoning: 'Need to understand task before execution',
        risks: ['May not fully understand complex requirements'],
        dependencies: [],
        timeout: 30000,
      },
      {
        id: 'execute_task',
        description: `Execute: ${taskDescription}`,
        command: '',
        expectedOutcome: 'Task completed',
        reasoning: 'Execute the requested task',
        risks: ['Generic execution may not be optimal'],
        dependencies: ['analyze_task'],
        timeout: 60000,
      },
      {
        id: 'validate_result',
        description: 'Validate task completion',
        command: '',
        expectedOutcome: 'Task completion verified',
        reasoning: 'Ensure task was completed successfully',
        risks: ['May not detect all failure modes'],
        dependencies: ['execute_task'],
        timeout: 20000,
      },
    ];
  }

  /**
   * Generate specific commands for analysis tasks based on the task description
   */
  private generateAnalysisCommand(
    stepId: string,
    taskDescription: string,
    context: any
  ): string {
    const normalizedTask = taskDescription.toLowerCase();

    if (stepId === 'perform_analysis') {
      // Generate specific analysis commands based on the query

      // File size analysis
      if (
        normalizedTask.includes('largest') &&
        normalizedTask.includes('file')
      ) {
        return 'find . -type f -exec du -h {} + | sort -rh | head -n 10 && echo "" && echo "🎯 ANSWER: The largest file is:" && find . -type f -exec du -h {} + | sort -rh | head -n 1 && echo ""';
      }

      if (
        normalizedTask.includes('smallest') &&
        normalizedTask.includes('file')
      ) {
        return 'find . -type f -exec du -h {} + | sort -h | head -n 10 && echo "" && echo "🎯 ANSWER: The smallest file is:" && find . -type f -exec du -h {} + | sort -h | head -n 1 && echo ""';
      }

      // File count analysis
      if (
        normalizedTask.includes('how many') &&
        normalizedTask.includes('file')
      ) {
        return 'total_files=$(find . -type f | wc -l) && echo "🎯 ANSWER: $total_files files total" && echo "" && echo "Breakdown by file type:" && find . -type f -name "*.*" | sed "s/.*\\.//" | sort | uniq -c | sort -rn | head -n 10';
      }

      // TypeScript specific count
      if (
        normalizedTask.includes('typescript') ||
        normalizedTask.includes('*.ts')
      ) {
        return 'ts_files=$(find . -name "*.ts" | wc -l) && echo "🎯 ANSWER: $ts_files TypeScript files" && echo "" && echo "File type breakdown:" && find . -type f -name "*.*" | sed "s/.*\\.//" | sort | uniq -c | sort -rn | head -n 10';
      }

      // Directory size analysis
      if (
        normalizedTask.includes('size') &&
        (normalizedTask.includes('directory') ||
          normalizedTask.includes('folder'))
      ) {
        return 'echo "🎯 ANSWER: Directory sizes (largest first):" && du -sh */ 2>/dev/null | sort -rh | head -n 10';
      }

      // File summarization
      if (
        (normalizedTask.includes('summarize') ||
          normalizedTask.includes('summary')) &&
        normalizedTask.includes('file')
      ) {
        return 'echo "🎯 ANSWER: File Summary for this directory" && echo "=================================" && total_files=$(find . -maxdepth 1 -type f | wc -l) && total_dirs=$(find . -maxdepth 1 -type d | grep -v "^\\.$" | wc -l) && echo "📁 Total files: $total_files" && echo "📂 Total directories: $total_dirs" && echo "" && echo "📋 File types:" && find . -maxdepth 1 -type f -name "*.*" | sed "s/.*\\.//" | sort | uniq -c | sort -rn | head -n 10 && echo "" && echo "🗂️  Main files:" && find . -maxdepth 1 -type f | head -15';
      }

      // TypeScript class documentation generation
      if (
        normalizedTask.includes('markdown') &&
        (normalizedTask.includes('typescript') ||
          normalizedTask.includes('class')) &&
        (normalizedTask.includes('summariz') ||
          normalizedTask.includes('contents'))
      ) {
        return `echo "🎯 GENERATING: TypeScript Class Documentation" && echo "# TypeScript Classes Summary" > typescript-classes.md && echo "" >> typescript-classes.md && echo "Generated on: \$(date)" >> typescript-classes.md && echo "" >> typescript-classes.md && echo "## Classes Found" >> typescript-classes.md && echo "" >> typescript-classes.md && find . -name "*.ts" -not -path "./node_modules/*" -not -path "./dist/*" -not -name "*.test.ts" -not -name "*.spec.ts" | while read file; do echo "### \$(basename "\$file" .ts)" >> typescript-classes.md; echo "" >> typescript-classes.md; echo "**File:** \`\$file\`" >> typescript-classes.md; echo "" >> typescript-classes.md; grep -n "^export class\\|^class\\|^abstract class\\|^export abstract class" "\$file" 2>/dev/null | head -5 | while IFS=: read -r line_num class_line; do echo "- **Line \$line_num:** \`\$class_line\`" >> typescript-classes.md; done; echo "" >> typescript-classes.md; grep -n "constructor\\|public\\|private\\|protected" "\$file" 2>/dev/null | head -3 | while IFS=: read -r line_num method_line; do echo "  - \`\$method_line\`" >> typescript-classes.md; done; echo "" >> typescript-classes.md; done && echo "✅ Documentation generated: typescript-classes.md" && echo "" && echo "📊 Summary:" && echo "- Classes found: \$(find . -name "*.ts" -not -path "./node_modules/*" -not -path "./dist/*" -not -name "*.test.ts" -not -name "*.spec.ts" -exec grep -l "^export class\\|^class\\|^abstract class\\|^export abstract class" {} \\; | wc -l)" && echo "- Total TypeScript files: \$(find . -name "*.ts" -not -path "./node_modules/*" -not -path "./dist/*" | wc -l)" && echo "- Output file: typescript-classes.md"`;
      }

      // Class analysis (more general)
      if (
        normalizedTask.includes('class') &&
        (normalizedTask.includes('typescript') ||
          normalizedTask.includes('ts')) &&
        (normalizedTask.includes('analyze') || normalizedTask.includes('list'))
      ) {
        return 'echo "🎯 ANSWER: TypeScript Classes Analysis" && echo "=====================================" && echo "" && echo "📁 TypeScript files with classes:" && find . -name "*.ts" -not -path "./node_modules/*" -not -path "./dist/*" -not -name "*.test.ts" -not -name "*.spec.ts" -exec grep -l "^export class\\|^class\\|^abstract class\\|^export abstract class" {} \\; && echo "" && echo "🔍 Class definitions found:" && find . -name "*.ts" -not -path "./node_modules/*" -not -path "./dist/*" -not -name "*.test.ts" -not -name "*.spec.ts" -exec grep -H "^export class\\|^class\\|^abstract class\\|^export abstract class" {} \\; && echo "" && echo "📊 Statistics:" && echo "- Files with classes: $(find . -name "*.ts" -not -path "./node_modules/*" -not -path "./dist/*" -not -name "*.test.ts" -not -name "*.spec.ts" -exec grep -l "^export class\\|^class\\|^abstract class\\|^export abstract class" {} \\; | wc -l)" && echo "- Total class definitions: $(find . -name "*.ts" -not -path "./node_modules/*" -not -path "./dist/*" -not -name "*.test.ts" -not -name "*.spec.ts" -exec grep "^export class\\|^class\\|^abstract class\\|^export abstract class" {} \\; | wc -l)"';
      }

      // Line count analysis
      if (
        normalizedTask.includes('line') &&
        (normalizedTask.includes('count') ||
          normalizedTask.includes('most') ||
          normalizedTask.includes('largest'))
      ) {
        return 'echo "🎯 ANSWER: Files with most lines of code:" && find . -name "*.ts" -o -name "*.js" -o -name "*.tsx" -o -name "*.jsx" | head -20 | xargs wc -l | sort -rn | head -n 10';
      }

      // General file listing
      if (normalizedTask.includes('list') && normalizedTask.includes('file')) {
        return 'total=$(find . -type f | wc -l) && echo "🎯 ANSWER: $total files in the codebase" && echo "" && echo "Sample files:" && find . -type f | head -20';
      }

      // Generic code analysis
      if (
        normalizedTask.includes('code') ||
        normalizedTask.includes('codebase')
      ) {
        return 'echo "🎯 ANSWER: Codebase Overview" && echo "=========================" && total_files=$(find . -type f | wc -l) && code_files=$(find . -name "*.ts" -o -name "*.js" -o -name "*.tsx" -o -name "*.jsx" | wc -l) && test_files=$(find . -name "*.test.*" -o -name "*.spec.*" | wc -l) && echo "Total files: $total_files" && echo "Code files: $code_files" && echo "Test files: $test_files" && echo "" && echo "File types:" && find . -type f -name "*.*" | sed "s/.*\\.//" | sort | uniq -c | sort -rn | head -n 10';
      }

      // Default analysis
      return (
        'echo "🎯 ANSWER: Analysis completed for: ' +
        taskDescription +
        '" && ls -la'
      );
    }

    return '';
  }
}
