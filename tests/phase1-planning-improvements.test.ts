/**
 * Test for Phase 1 Agent Planning System Improvements
 * Tests the enhanced planning system with task analysis and template-based planning
 */

import {
  TaskComplexityAnalyzer,
  TaskType,
  TaskComplexity,
  TaskAnalysis,
} from '../src/services/TaskComplexityAnalyzer';
import { PlanningTemplateSystem } from '../src/services/PlanningTemplateSystem';
import {
  OutcomeValidationSystem,
  TaskOutcome,
  ValidationResult,
} from '../src/services/OutcomeValidationSystem';
import { ExecutionStep } from '../src/types/index';

describe('Phase 1 Agent Planning System Improvements', () => {
  let taskAnalyzer: TaskComplexityAnalyzer;
  let planningSystem: PlanningTemplateSystem;
  let validationSystem: OutcomeValidationSystem;

  beforeEach(() => {
    taskAnalyzer = new TaskComplexityAnalyzer();
    planningSystem = new PlanningTemplateSystem();
    validationSystem = new OutcomeValidationSystem();
  });

  describe('TaskComplexityAnalyzer', () => {
    test('should analyze JSDoc documentation task correctly', () => {
      const task = 'Add JSDoc documentation to all methods in CacheCommand.ts';
      const analysis = taskAnalyzer.analyzeTask(task);

      expect(analysis.type).toBe('documentation');
      expect(['simple', 'moderate', 'complex', 'advanced']).toContain(
        analysis.complexity
      );
      expect(analysis.requiredCapabilities).toContain('file_reading');
      expect(analysis.requiredCapabilities).toContain('file_writing');
      expect(analysis.requiredCapabilities).toContain('code_parsing');
      expect(analysis.estimatedSteps).toBeGreaterThan(0);
      expect(['low', 'medium', 'high', 'critical']).toContain(
        analysis.riskLevel
      );
    });

    test('should analyze code modification task correctly', () => {
      const task = 'Refactor the login function to use async/await';
      const analysis = taskAnalyzer.analyzeTask(task);

      expect(analysis.type).toBe('refactoring');
      expect(analysis.requiredCapabilities).toContain('code_modification');
      expect(analysis.estimatedSteps).toBeGreaterThan(2);
    });

    test('should analyze test generation task correctly', () => {
      const task = 'Generate unit tests for the UserService class';
      const analysis = taskAnalyzer.analyzeTask(task);

      expect(analysis.type).toBe('test_generation');
      expect(analysis.requiredCapabilities).toContain('test_generation');
      expect(analysis.requiredCapabilities).toContain('code_analysis');
    });
  });

  describe('PlanningTemplateSystem', () => {
    test('should generate documentation plan with proper steps', () => {
      const taskAnalysis: TaskAnalysis = {
        type: TaskType.DOCUMENTATION,
        complexity: TaskComplexity.MODERATE,
        requiredCapabilities: [
          'file_reading',
          'file_writing',
          'code_parsing',
        ] as any,
        estimatedSteps: 6,
        riskLevel: 'medium' as any,
        validationStrategy: 'comprehensive' as any,
      };

      const plan = planningSystem.generatePlan(
        taskAnalysis,
        'Add JSDoc to all methods',
        {}
      );

      expect(plan).toBeInstanceOf(Array);
      expect(plan.length).toBeGreaterThan(3);

      // Check for essential steps
      const stepDescriptions = plan.map((step) =>
        step.description.toLowerCase()
      );
      expect(stepDescriptions.some((desc) => desc.includes('analyze'))).toBe(
        true
      );
      expect(stepDescriptions.some((desc) => desc.includes('backup'))).toBe(
        true
      );
      expect(
        stepDescriptions.some(
          (desc) => desc.includes('jsdoc') || desc.includes('documentation')
        )
      ).toBe(true);
      expect(stepDescriptions.some((desc) => desc.includes('validate'))).toBe(
        true
      );
    });

    test('should generate refactoring plan with proper steps', () => {
      const taskAnalysis: TaskAnalysis = {
        type: TaskType.REFACTORING,
        complexity: TaskComplexity.COMPLEX,
        requiredCapabilities: ['code_modification', 'ast_manipulation'] as any,
        estimatedSteps: 8,
        riskLevel: 'high' as any,
        validationStrategy: 'comprehensive' as any,
      };

      const plan = planningSystem.generatePlan(
        taskAnalysis,
        'Refactor legacy code',
        {}
      );

      expect(plan).toBeInstanceOf(Array);
      expect(plan.length).toBeGreaterThan(4);

      // Check for refactoring-specific steps
      const stepDescriptions = plan.map((step) =>
        step.description.toLowerCase()
      );
      expect(stepDescriptions.some((desc) => desc.includes('analyze'))).toBe(
        true
      );
      expect(stepDescriptions.some((desc) => desc.includes('backup'))).toBe(
        true
      );
      expect(stepDescriptions.some((desc) => desc.includes('refactor'))).toBe(
        true
      );
    });

    test('should generate generic plan for unknown task types', () => {
      const taskAnalysis: TaskAnalysis = {
        type: TaskType.UNKNOWN,
        complexity: TaskComplexity.SIMPLE,
        requiredCapabilities: [] as any,
        estimatedSteps: 3,
        riskLevel: 'low' as any,
        validationStrategy: 'basic' as any,
      };

      const plan = planningSystem.generatePlan(
        taskAnalysis,
        'Do something',
        {}
      );

      expect(plan).toBeInstanceOf(Array);
      expect(plan.length).toBeGreaterThanOrEqual(3);

      // Should have generic analyze, execute, validate steps
      const stepDescriptions = plan.map((step) =>
        step.description.toLowerCase()
      );
      expect(stepDescriptions.some((desc) => desc.includes('analyze'))).toBe(
        true
      );
      expect(stepDescriptions.some((desc) => desc.includes('execute'))).toBe(
        true
      );
      expect(stepDescriptions.some((desc) => desc.includes('validate'))).toBe(
        true
      );
    });
  });

  describe('OutcomeValidationSystem', () => {
    test('should validate documentation task outcome', async () => {
      const taskOutcome: TaskOutcome = {
        taskType: TaskType.DOCUMENTATION,
        taskDescription: 'Add JSDoc to all methods',
        filePath: '/test/file.ts',
        timestamp: new Date().toISOString(),
        executionSteps: [
          {
            stepId: 'backup',
            success: true,
            output: 'Backup created',
            duration: 100,
          },
          {
            stepId: 'analyze',
            success: true,
            output: 'Found 5 methods',
            duration: 200,
          },
          {
            stepId: 'generate',
            success: true,
            output: 'JSDoc generated',
            duration: 300,
          },
        ],
      };

      const successCriteria = [
        {
          metric: 'file_modified',
          target: true,
          critical: true,
          description: 'File was modified successfully',
        },
        {
          metric: 'backup_created',
          target: true,
          critical: true,
          description: 'Backup was created successfully',
        },
      ];

      const validationSteps = [
        {
          id: 'check_syntax',
          description: 'Check syntax',
          method: 'syntax_check' as const,
          parameters: {},
          expectedResult: true,
        },
      ];

      const result = await validationSystem.validateTaskOutcome(
        taskOutcome,
        successCriteria,
        validationSteps
      );

      expect(result).toHaveProperty('success');
      expect(result).toHaveProperty('score');
      expect(result).toHaveProperty('details');
      expect(result).toHaveProperty('summary');
      expect(result).toHaveProperty('recommendations');
      expect(typeof result.success).toBe('boolean');
      expect(typeof result.score).toBe('number');
      expect(Array.isArray(result.details)).toBe(true);
    });
  });

  describe('Integration Tests', () => {
    test('should work together for documentation task flow', () => {
      // 1. Analyze task
      const task =
        'Add comprehensive JSDoc documentation to CacheCommand.ts methods';
      const analysis = taskAnalyzer.analyzeTask(task);

      expect(analysis.type).toBe('documentation');

      // 2. Generate plan
      const plan = planningSystem.generatePlan(analysis, task, {});

      expect(plan).toBeInstanceOf(Array);
      expect(plan.length).toBeGreaterThan(3);

      // 3. Check plan has all necessary components for code modification
      const stepIds = plan.map((step) => step.id);
      const stepDescriptions = plan.map((step) =>
        step.description.toLowerCase()
      );

      // Should have analysis, backup, modification, and validation steps
      expect(stepDescriptions.some((desc) => desc.includes('analyze'))).toBe(
        true
      );
      expect(stepDescriptions.some((desc) => desc.includes('backup'))).toBe(
        true
      );
      expect(
        stepDescriptions.some(
          (desc) =>
            desc.includes('jsdoc') ||
            desc.includes('documentation') ||
            desc.includes('comment')
        )
      ).toBe(true);
      expect(
        stepDescriptions.some(
          (desc) => desc.includes('validate') || desc.includes('verify')
        )
      ).toBe(true);

      // Steps should have proper structure
      plan.forEach((step) => {
        expect(step).toHaveProperty('id');
        expect(step).toHaveProperty('description');
        expect(step).toHaveProperty('expectedOutcome');
        expect(step).toHaveProperty('reasoning');
        expect(step).toHaveProperty('risks');
        expect(step).toHaveProperty('dependencies');
        expect(step).toHaveProperty('timeout');
      });
    });

    test('should identify that original agent failed due to lack of code modification steps', () => {
      const task = 'Add JSDoc documentation to all methods in CacheCommand.ts';
      const analysis = taskAnalyzer.analyzeTask(task);
      const plan = planningSystem.generatePlan(analysis, task, {});

      // The new system should generate plans that actually modify code
      const hasCodeModificationStep = plan.some(
        (step) =>
          step.description.toLowerCase().includes('jsdoc') ||
          (step.description.toLowerCase().includes('add') &&
            step.description.toLowerCase().includes('comment')) ||
          (step.description.toLowerCase().includes('generate') &&
            step.description.toLowerCase().includes('documentation'))
      );

      expect(hasCodeModificationStep).toBe(true);

      // Should have more than just file operations
      expect(plan.length).toBeGreaterThan(4);

      // Should have validation specific to documentation
      const hasDocValidation = plan.some(
        (step) =>
          step.description.toLowerCase().includes('validate') &&
          (step.description.toLowerCase().includes('documentation') ||
            step.description.toLowerCase().includes('jsdoc') ||
            step.description.toLowerCase().includes('coverage'))
      );

      expect(hasDocValidation).toBe(true);
    });
  });
});
