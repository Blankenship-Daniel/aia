/**
 * Task Complexity Analyzer
 * Analyzes development tasks to determine their complexity and required capabilities
 */

export interface TaskAnalysis {
  type: TaskType;
  complexity: TaskComplexity;
  requiredCapabilities: TaskCapability[];
  estimatedSteps: number;
  riskLevel: RiskLevel;
  validationStrategy: ValidationStrategy;
}

export enum TaskType {
  DOCUMENTATION = 'documentation',
  CODE_MODIFICATION = 'code_modification',
  REFACTORING = 'refactoring',
  TEST_GENERATION = 'test_generation',
  BUG_FIXING = 'bug_fixing',
  FILE_OPERATION = 'file_operation',
  ANALYSIS = 'analysis',
  CONFIGURATION = 'configuration',
  BUILD_DEPLOYMENT = 'build_deployment',
  UNKNOWN = 'unknown',
}

export enum TaskComplexity {
  SIMPLE = 'simple', // 1-3 steps
  MODERATE = 'moderate', // 4-8 steps
  COMPLEX = 'complex', // 9-15 steps
  ADVANCED = 'advanced', // 16+ steps
}

export enum TaskCapability {
  FILE_READING = 'file_reading',
  FILE_WRITING = 'file_writing',
  CODE_PARSING = 'code_parsing',
  CODE_GENERATION = 'code_generation',
  CODE_MODIFICATION = 'code_modification',
  AST_MANIPULATION = 'ast_manipulation',
  COMMAND_EXECUTION = 'command_execution',
  VALIDATION = 'validation',
  TEMPLATE_PROCESSING = 'template_processing',
  PATTERN_MATCHING = 'pattern_matching',
  DEPENDENCY_ANALYSIS = 'dependency_analysis',
  TEST_GENERATION = 'test_generation',
  CODE_ANALYSIS = 'code_analysis',
}

export enum RiskLevel {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
}

export enum ValidationStrategy {
  FILE_COMPARISON = 'file_comparison',
  SYNTAX_VALIDATION = 'syntax_validation',
  EXECUTION_TEST = 'execution_test',
  METRIC_BASED = 'metric_based',
  MANUAL_REVIEW = 'manual_review',
}

export class TaskComplexityAnalyzer {
  /**
   * Analyze a task description to determine its type, complexity, and requirements
   */
  analyzeTask(taskDescription: string): TaskAnalysis {
    const normalizedTask = taskDescription.toLowerCase();

    // Determine task type
    const taskType = this.determineTaskType(normalizedTask);

    // Assess complexity
    const complexity = this.assessComplexity(normalizedTask, taskType);

    // Identify required capabilities
    const requiredCapabilities = this.identifyRequiredCapabilities(
      normalizedTask,
      taskType
    );

    // Estimate steps
    const estimatedSteps = this.estimateSteps(taskType, complexity);

    // Assess risk level
    const riskLevel = this.assessRiskLevel(
      taskType,
      complexity,
      requiredCapabilities
    );

    // Determine validation strategy
    const validationStrategy = this.determineValidationStrategy(taskType);

    return {
      type: taskType,
      complexity,
      requiredCapabilities,
      estimatedSteps,
      riskLevel,
      validationStrategy,
    };
  }

  private determineTaskType(task: string): TaskType {
    // Documentation tasks
    if (
      this.matchesPatterns(task, [
        'add jsdoc',
        'document',
        'add comments',
        'documentation',
        'generate docs',
        'create readme',
        'add docstring',
      ])
    ) {
      return TaskType.DOCUMENTATION;
    }

    // Code modification tasks
    if (
      this.matchesPatterns(task, [
        'modify',
        'change',
        'update',
        'edit',
        'implement',
        'add method',
        'add function',
        'add class',
      ])
    ) {
      return TaskType.CODE_MODIFICATION;
    }

    // Refactoring tasks
    if (
      this.matchesPatterns(task, [
        'refactor',
        'reorganize',
        'restructure',
        'optimize',
        'clean up',
        'improve',
        'simplify',
      ])
    ) {
      return TaskType.REFACTORING;
    }

    // Test generation tasks
    if (
      this.matchesPatterns(task, [
        'test',
        'unit test',
        'add test',
        'generate test',
        'test coverage',
        'spec',
        'jest',
      ])
    ) {
      return TaskType.TEST_GENERATION;
    }

    // Bug fixing tasks
    if (
      this.matchesPatterns(task, [
        'fix',
        'bug',
        'error',
        'issue',
        'debug',
        'resolve',
        'patch',
        'repair',
      ])
    ) {
      return TaskType.BUG_FIXING;
    }

    // File operations
    if (
      this.matchesPatterns(task, [
        'create file',
        'delete file',
        'move file',
        'copy file',
        'rename',
        'backup',
        'list files',
      ])
    ) {
      return TaskType.FILE_OPERATION;
    }

    // Analysis tasks
    if (
      this.matchesPatterns(task, [
        'analyze',
        'review',
        'examine',
        'check',
        'audit',
        'report',
        'summary',
        'find',
        'what',
        'which',
        'where',
        'how many',
        'how much',
        'largest',
        'smallest',
        'biggest',
        'size',
        'count',
        'list',
        'show',
        'display',
        'search',
        'locate',
      ])
    ) {
      return TaskType.ANALYSIS;
    }

    // Configuration tasks
    if (
      this.matchesPatterns(task, [
        'configure',
        'setup',
        'install',
        'config',
        'environment',
        'settings',
      ])
    ) {
      return TaskType.CONFIGURATION;
    }

    // Build and deployment
    if (
      this.matchesPatterns(task, [
        'build',
        'compile',
        'deploy',
        'package',
        'bundle',
        'publish',
        'release',
      ])
    ) {
      return TaskType.BUILD_DEPLOYMENT;
    }

    return TaskType.UNKNOWN;
  }

  private assessComplexity(task: string, taskType: TaskType): TaskComplexity {
    let complexityScore = 0;

    // Base complexity by task type
    switch (taskType) {
      case TaskType.DOCUMENTATION:
        complexityScore += 2; // Moderate base complexity
        break;
      case TaskType.CODE_MODIFICATION:
        complexityScore += 3; // Higher base complexity
        break;
      case TaskType.REFACTORING:
        complexityScore += 4; // High base complexity
        break;
      case TaskType.TEST_GENERATION:
        complexityScore += 3;
        break;
      case TaskType.BUG_FIXING:
        complexityScore += 4; // Often complex
        break;
      default:
        complexityScore += 1;
    }

    // Increase complexity for multiple targets
    if (this.matchesPatterns(task, ['all', 'every', 'each', 'multiple'])) {
      complexityScore += 2;
    }

    // Increase complexity for specific technologies
    if (this.matchesPatterns(task, ['typescript', 'react', 'angular', 'vue'])) {
      complexityScore += 1;
    }

    // Increase complexity for cross-file operations
    if (
      this.matchesPatterns(task, ['across', 'throughout', 'entire project'])
    ) {
      complexityScore += 3;
    }

    // Map score to complexity level
    if (complexityScore <= 2) return TaskComplexity.SIMPLE;
    if (complexityScore <= 4) return TaskComplexity.MODERATE;
    if (complexityScore <= 6) return TaskComplexity.COMPLEX;
    return TaskComplexity.ADVANCED;
  }

  private identifyRequiredCapabilities(
    task: string,
    taskType: TaskType
  ): TaskCapability[] {
    const capabilities: Set<TaskCapability> = new Set();

    // Always need file reading for analysis
    capabilities.add(TaskCapability.FILE_READING);

    // Task-specific capabilities
    switch (taskType) {
      case TaskType.DOCUMENTATION:
        capabilities.add(TaskCapability.CODE_PARSING);
        capabilities.add(TaskCapability.CODE_GENERATION);
        capabilities.add(TaskCapability.FILE_WRITING);
        capabilities.add(TaskCapability.TEMPLATE_PROCESSING);
        break;

      case TaskType.CODE_MODIFICATION:
        capabilities.add(TaskCapability.CODE_PARSING);
        capabilities.add(TaskCapability.CODE_MODIFICATION);
        capabilities.add(TaskCapability.AST_MANIPULATION);
        capabilities.add(TaskCapability.CODE_GENERATION);
        capabilities.add(TaskCapability.FILE_WRITING);
        capabilities.add(TaskCapability.VALIDATION);
        break;

      case TaskType.REFACTORING:
        capabilities.add(TaskCapability.CODE_PARSING);
        capabilities.add(TaskCapability.CODE_MODIFICATION);
        capabilities.add(TaskCapability.AST_MANIPULATION);
        capabilities.add(TaskCapability.DEPENDENCY_ANALYSIS);
        capabilities.add(TaskCapability.FILE_WRITING);
        capabilities.add(TaskCapability.VALIDATION);
        break;

      case TaskType.TEST_GENERATION:
        capabilities.add(TaskCapability.CODE_PARSING);
        capabilities.add(TaskCapability.CODE_ANALYSIS);
        capabilities.add(TaskCapability.TEST_GENERATION);
        capabilities.add(TaskCapability.CODE_GENERATION);
        capabilities.add(TaskCapability.TEMPLATE_PROCESSING);
        capabilities.add(TaskCapability.FILE_WRITING);
        break;

      case TaskType.FILE_OPERATION:
        capabilities.add(TaskCapability.COMMAND_EXECUTION);
        break;

      case TaskType.ANALYSIS:
        capabilities.add(TaskCapability.PATTERN_MATCHING);
        capabilities.add(TaskCapability.CODE_PARSING);
        break;
    }

    return Array.from(capabilities);
  }

  private estimateSteps(
    taskType: TaskType,
    complexity: TaskComplexity
  ): number {
    const baseSteps = {
      [TaskType.DOCUMENTATION]: 6, // Parse, analyze, generate, insert, validate, report
      [TaskType.CODE_MODIFICATION]: 8, // Parse, analyze, plan, modify, insert, validate, test, report
      [TaskType.REFACTORING]: 10, // More complex with dependency analysis
      [TaskType.TEST_GENERATION]: 7, // Analyze, generate, validate, report
      [TaskType.BUG_FIXING]: 9, // Diagnose, plan, fix, test, validate
      [TaskType.FILE_OPERATION]: 3, // Simple operations
      [TaskType.ANALYSIS]: 4, // Read, parse, analyze, report
      [TaskType.CONFIGURATION]: 5, // Check, modify, validate
      [TaskType.BUILD_DEPLOYMENT]: 6, // Prepare, build, test, deploy
      [TaskType.UNKNOWN]: 4,
    };

    const complexityMultiplier = {
      [TaskComplexity.SIMPLE]: 0.8,
      [TaskComplexity.MODERATE]: 1.0,
      [TaskComplexity.COMPLEX]: 1.5,
      [TaskComplexity.ADVANCED]: 2.0,
    };

    return Math.round(baseSteps[taskType] * complexityMultiplier[complexity]);
  }

  private assessRiskLevel(
    taskType: TaskType,
    complexity: TaskComplexity,
    capabilities: TaskCapability[]
  ): RiskLevel {
    let riskScore = 0;

    // Base risk by task type
    switch (taskType) {
      case TaskType.CODE_MODIFICATION:
      case TaskType.REFACTORING:
        riskScore += 3;
        break;
      case TaskType.BUG_FIXING:
        riskScore += 2;
        break;
      case TaskType.DOCUMENTATION:
        riskScore += 1;
        break;
      default:
        riskScore += 1;
    }

    // Complexity risk
    switch (complexity) {
      case TaskComplexity.ADVANCED:
        riskScore += 3;
        break;
      case TaskComplexity.COMPLEX:
        riskScore += 2;
        break;
      case TaskComplexity.MODERATE:
        riskScore += 1;
        break;
    }

    // Capability risk
    if (capabilities.includes(TaskCapability.AST_MANIPULATION)) riskScore += 2;
    if (capabilities.includes(TaskCapability.FILE_WRITING)) riskScore += 1;

    if (riskScore <= 2) return RiskLevel.LOW;
    if (riskScore <= 4) return RiskLevel.MEDIUM;
    if (riskScore <= 6) return RiskLevel.HIGH;
    return RiskLevel.CRITICAL;
  }

  private determineValidationStrategy(taskType: TaskType): ValidationStrategy {
    switch (taskType) {
      case TaskType.DOCUMENTATION:
        return ValidationStrategy.SYNTAX_VALIDATION;
      case TaskType.CODE_MODIFICATION:
      case TaskType.REFACTORING:
        return ValidationStrategy.EXECUTION_TEST;
      case TaskType.TEST_GENERATION:
        return ValidationStrategy.EXECUTION_TEST;
      case TaskType.BUG_FIXING:
        return ValidationStrategy.EXECUTION_TEST;
      case TaskType.FILE_OPERATION:
        return ValidationStrategy.FILE_COMPARISON;
      case TaskType.ANALYSIS:
        return ValidationStrategy.METRIC_BASED;
      default:
        return ValidationStrategy.MANUAL_REVIEW;
    }
  }

  private matchesPatterns(text: string, patterns: string[]): boolean {
    return patterns.some((pattern) => text.includes(pattern));
  }
}
