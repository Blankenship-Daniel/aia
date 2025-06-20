/**
 * Test for TaskComplexityAnalyzer classification fix
 * Verifies that markdown summarization tasks are correctly classified as ANALYSIS
 */

import {
  TaskComplexityAnalyzer,
  TaskType,
} from '../src/services/TaskComplexityAnalyzer';

describe('TaskComplexityAnalyzer Classification Fix', () => {
  let taskAnalyzer: TaskComplexityAnalyzer;

  beforeEach(() => {
    taskAnalyzer = new TaskComplexityAnalyzer();
  });

  describe('Analysis Task Classification', () => {
    test('should classify markdown summarization tasks as ANALYSIS', () => {
      const testCases = [
        'Create a markdown summarizing the contents of every TypeScript class in this directory',
        'Generate markdown summary of all classes',
        'Create markdown summarizing class contents',
        'Summarizing the contents of TypeScript files',
        'Generate a markdown report summarizing all components',
      ];

      testCases.forEach((testCase) => {
        const analysis = taskAnalyzer.analyzeTask(testCase);
        expect(analysis.type).toBe(TaskType.ANALYSIS);
        expect(['simple', 'moderate', 'complex', 'advanced']).toContain(
          analysis.complexity
        );
      });
    });

    test('should classify general analysis tasks correctly', () => {
      const testCases = [
        'Analyze the codebase structure',
        'Review all TypeScript files',
        'Find the largest files in the project',
        'Show me what classes exist',
        'Count how many functions are in this directory',
      ];

      testCases.forEach((testCase) => {
        const analysis = taskAnalyzer.analyzeTask(testCase);
        expect(analysis.type).toBe(TaskType.ANALYSIS);
      });
    });
  });

  describe('Documentation Task Classification', () => {
    test('should classify JSDoc tasks as DOCUMENTATION', () => {
      const testCases = [
        'Add JSDoc documentation to all methods',
        'Add JSDoc comments to the UserService class',
        'Document all public methods with JSDoc',
        'Generate JSDoc documentation',
        'Add inline comments to explain the code',
      ];

      testCases.forEach((testCase) => {
        const analysis = taskAnalyzer.analyzeTask(testCase);
        expect(analysis.type).toBe(TaskType.DOCUMENTATION);
        expect(['simple', 'moderate', 'complex', 'advanced']).toContain(
          analysis.complexity
        );
      });
    });
  });

  describe('Pattern Specificity Tests', () => {
    test('should prioritize analysis patterns for ambiguous cases', () => {
      // These cases contain both analysis and documentation keywords
      // but should be classified as analysis due to pattern priority
      const ambiguousCases = [
        'Create a markdown summarizing all documented classes',
        'Generate markdown documentation summary',
        'Analyze and summarize the documentation',
      ];

      ambiguousCases.forEach((testCase) => {
        const analysis = taskAnalyzer.analyzeTask(testCase);
        expect(analysis.type).toBe(TaskType.ANALYSIS);
      });
    });

    test('should exclude markdown summarization from documentation', () => {
      // Test that exclusion patterns work correctly
      const excludedFromDocumentation = [
        'Create a markdown summarizing the contents',
        'Markdown summarizing class structure',
        'Summarizing the contents of all files',
      ];

      excludedFromDocumentation.forEach((testCase) => {
        const analysis = taskAnalyzer.analyzeTask(testCase);
        expect(analysis.type).not.toBe(TaskType.DOCUMENTATION);
        expect(analysis.type).toBe(TaskType.ANALYSIS);
      });
    });
  });

  describe('Regression Tests', () => {
    test('should not break existing classification', () => {
      // Ensure existing patterns still work correctly
      const existingPatterns = [
        {
          task: 'Refactor the login function',
          expectedType: TaskType.REFACTORING,
        },
        { task: 'Generate unit tests', expectedType: TaskType.TEST_GENERATION },
        {
          task: 'Fix the bug in authentication',
          expectedType: TaskType.BUG_FIXING,
        },
        { task: 'Create a new file', expectedType: TaskType.FILE_OPERATION },
        {
          task: 'Configure the build system',
          expectedType: TaskType.CONFIGURATION,
        },
      ];

      existingPatterns.forEach(({ task, expectedType }) => {
        const analysis = taskAnalyzer.analyzeTask(task);
        expect(analysis.type).toBe(expectedType);
      });
    });
  });
});
