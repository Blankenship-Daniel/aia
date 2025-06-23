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

/**
 * TaskComplexityAnalyzer class
 * 
 * TODO: Add class description
 */
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

  private static readonly taskTypeDefinitions: Array<{
    type: TaskType;
    patterns: string[];
    excludePatterns?: string[];
  }> = [
    {
      type: TaskType.ANALYSIS,
      patterns: [
        'analyze',
        'review',
        'examine',
        'check',
        'audit',
        'report',
        'summary',
        'summarize',
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
        'create a markdown summarizing',
        'markdown summarizing',
        'summarizing the contents',
        'markdown summary',
        'create markdown',
        'generate markdown',
      ],
    },
    {
      type: TaskType.DOCUMENTATION,
      patterns: [
        'add jsdoc',
        'jsdoc',
        'document',
        'add comments',
        'documentation',
        'generate docs',
        'create readme',
        'add docstring',
        'class documentation',
        'add inline comments',
        'document all',
        'generate jsdoc',
        'add documentation',
      ],
      excludePatterns: [
        'create a markdown summarizing',
        'markdown summarizing',
        'summarizing the contents',
        'markdown summary',
      ],
    },
    {
      type: TaskType.CODE_MODIFICATION,
      patterns: [
        'modify',
        'change',
        'update',
        'edit',
        'implement',
        'add method',
        'add function',
        'add class',
      ],
    },
    {
      type: TaskType.REFACTORING,
      patterns: [
        'refactor',
        'reorganize',
        'restructure',
        'optimize',
        'clean up',
        'improve',
        'simplify',
      ],
    },
    {
      type: TaskType.TEST_GENERATION,
      patterns: [
        'test',
        'unit test',
        'unit tests',
        'add test',
        'generate test',
        'generate tests',
        'generate unit tests',
        'test coverage',
        'spec',
        'jest',
      ],
    },
    {
      type: TaskType.BUG_FIXING,
      patterns: [
        'fix',
        'bug',
        'error',
        'issue',
        'debug',
        'resolve',
        'patch',
        'repair',
      ],
    },
    {
      type: TaskType.FILE_OPERATION,
      patterns: [
        'create file',
        'create a file',
        'create new file',
        'create a new file',
        'delete file',
        'move file',
        'copy file',
        'rename',
        'backup',
        'list files',
      ],
    },
    {
      type: TaskType.CONFIGURATION,
      patterns: [
        'configure',
        'setup',
        'install',
        'config',
        'environment',
        'settings',
      ],
    },
    {
      type: TaskType.BUILD_DEPLOYMENT,
      patterns: [
        'build',
        'compile',
        'deploy',
        'package',
        'bundle',
        'publish',
        'release',
      ],
    },
  ];

  /**
   * Handles determineTaskType operation
   * 
   * @param task - Parameter description
   * 
   * @returns TaskType - Return value description
   */
  private determineTaskType(task: string): TaskType {
    for (const def of TaskComplexityAnalyzer.taskTypeDefinitions) {
      if (this.matchesPatterns(task, def.patterns)) {
        if (
          def.excludePatterns &&
          this.matchesPatterns(task, def.excludePatterns)
        ) {
          continue;
        }
        return def.type;
      }
    }
    return TaskType.UNKNOWN;
  }

  /**
   * Handles assessComplexity operation
   * 
   * @param task - Parameter description
   * @param taskType - Parameter description
   * 
   * @returns TaskComplexity - Return value description
   */
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

  private static readonly capabilityMap: Record<TaskType, TaskCapability[]> = {
    [TaskType.DOCUMENTATION]: [
      TaskCapability.CODE_PARSING,
      TaskCapability.CODE_GENERATION,
      TaskCapability.FILE_WRITING,
      TaskCapability.TEMPLATE_PROCESSING,
    ],
    [TaskType.CODE_MODIFICATION]: [
      TaskCapability.CODE_PARSING,
      TaskCapability.CODE_MODIFICATION,
      TaskCapability.AST_MANIPULATION,
      TaskCapability.CODE_GENERATION,
      TaskCapability.FILE_WRITING,
      TaskCapability.VALIDATION,
    ],
    [TaskType.REFACTORING]: [
      TaskCapability.CODE_PARSING,
      TaskCapability.CODE_MODIFICATION,
      TaskCapability.AST_MANIPULATION,
      TaskCapability.DEPENDENCY_ANALYSIS,
      TaskCapability.FILE_WRITING,
      TaskCapability.VALIDATION,
    ],
    [TaskType.TEST_GENERATION]: [
      TaskCapability.CODE_PARSING,
      TaskCapability.CODE_ANALYSIS,
      TaskCapability.TEST_GENERATION,
      TaskCapability.CODE_GENERATION,
      TaskCapability.TEMPLATE_PROCESSING,
      TaskCapability.FILE_WRITING,
    ],
    [TaskType.BUG_FIXING]: [],
    [TaskType.FILE_OPERATION]: [TaskCapability.COMMAND_EXECUTION],
    [TaskType.ANALYSIS]: [
      TaskCapability.PATTERN_MATCHING,
      TaskCapability.CODE_PARSING,
    ],
    [TaskType.CONFIGURATION]: [],
    [TaskType.BUILD_DEPLOYMENT]: [],
    [TaskType.UNKNOWN]: [],
  };

  private identifyRequiredCapabilities(
    task: string,
    taskType: TaskType
  ): TaskCapability[] {
    const capabilities: Set<TaskCapability> = new Set();
    // Always need file reading for analysis
    capabilities.add(TaskCapability.FILE_READING);
    // Add mapped capabilities
    (TaskComplexityAnalyzer.capabilityMap[taskType] || []).forEach((cap) =>
      capabilities.add(cap)
    );
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

  private static readonly baseRiskByTaskType: Record<TaskType, number> = {
    [TaskType.CODE_MODIFICATION]: 3,
    [TaskType.REFACTORING]: 3,
    [TaskType.BUG_FIXING]: 2,
    [TaskType.DOCUMENTATION]: 1,
    [TaskType.TEST_GENERATION]: 1,
    [TaskType.FILE_OPERATION]: 1,
    [TaskType.ANALYSIS]: 1,
    [TaskType.CONFIGURATION]: 1,
    [TaskType.BUILD_DEPLOYMENT]: 1,
    [TaskType.UNKNOWN]: 1,
  };

  private static readonly complexityRisk: Record<TaskComplexity, number> = {
    [TaskComplexity.ADVANCED]: 3,
    [TaskComplexity.COMPLEX]: 2,
    [TaskComplexity.MODERATE]: 1,
    [TaskComplexity.SIMPLE]: 0,
  };

  private assessRiskLevel(
    taskType: TaskType,
    complexity: TaskComplexity,
    capabilities: TaskCapability[]
  ): RiskLevel {
    let riskScore = TaskComplexityAnalyzer.baseRiskByTaskType[taskType] || 1;
    riskScore += TaskComplexityAnalyzer.complexityRisk[complexity] || 0;
    if (capabilities.includes(TaskCapability.AST_MANIPULATION)) riskScore += 2;
    if (capabilities.includes(TaskCapability.FILE_WRITING)) riskScore += 1;
    if (riskScore <= 2) return RiskLevel.LOW;
    if (riskScore <= 4) return RiskLevel.MEDIUM;
    if (riskScore <= 6) return RiskLevel.HIGH;
    return RiskLevel.CRITICAL;
  }

  private static readonly validationStrategyMap: Record<
    TaskType,
    ValidationStrategy
  > = {
    [TaskType.DOCUMENTATION]: ValidationStrategy.SYNTAX_VALIDATION,
    [TaskType.CODE_MODIFICATION]: ValidationStrategy.EXECUTION_TEST,
    [TaskType.REFACTORING]: ValidationStrategy.EXECUTION_TEST,
    [TaskType.TEST_GENERATION]: ValidationStrategy.EXECUTION_TEST,
    [TaskType.BUG_FIXING]: ValidationStrategy.EXECUTION_TEST,
    [TaskType.FILE_OPERATION]: ValidationStrategy.FILE_COMPARISON,
    [TaskType.ANALYSIS]: ValidationStrategy.METRIC_BASED,
    [TaskType.CONFIGURATION]: ValidationStrategy.MANUAL_REVIEW,
    [TaskType.BUILD_DEPLOYMENT]: ValidationStrategy.MANUAL_REVIEW,
    [TaskType.UNKNOWN]: ValidationStrategy.MANUAL_REVIEW,
  };

  /**
   * Handles determineValidationStrategy operation
   * 
   * @param taskType - Parameter description
   * 
   * @returns ValidationStrategy - Return value description
   */
  private determineValidationStrategy(taskType: TaskType): ValidationStrategy {
    return (
      TaskComplexityAnalyzer.validationStrategyMap[taskType] ||
      ValidationStrategy.MANUAL_REVIEW
    );
  }

  /**
   * Handles matchesPatterns operation
   * 
   * @param text - Parameter description
   * @param patterns - Parameter description
   * 
   * @returns boolean - Return value description
   */
  private matchesPatterns(text: string, patterns: string[]): boolean {
    return patterns.some((pattern) => text.includes(pattern));
  }
}
