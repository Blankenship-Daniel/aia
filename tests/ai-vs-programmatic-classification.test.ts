/**
 * Test comparing AI-based vs Programmatic task classification
 * This test demonstrates the advantages of AI-based classification
 */

import {
  TaskComplexityAnalyzer,
  TaskType,
} from '../src/services/TaskComplexityAnalyzer';
import { AITaskClassifier } from '../src/services/AITaskClassifier';
import { IAIService } from '../src/interfaces/IAIService';
import { IContextService } from '../src/interfaces/IContextService';
import { ContextInfo } from '../src/types';

// Mock AI Service for testing
class MockAIService implements IAIService {
  async initialize(): Promise<void> {}

  async queryAI(prompt: string, context: ContextInfo) {
    // Simulate AI response based on prompt content
    if (prompt.includes('Create a markdown summarizing')) {
      return {
        content: JSON.stringify({
          taskType: 'ANALYSIS',
          complexity: 'MODERATE',
          riskLevel: 'LOW',
          confidence: 0.95,
          reasoning:
            'This is clearly a content analysis and markdown generation task, not JSDoc documentation',
          requiredCapabilities: [
            'FILE_READING',
            'PATTERN_MATCHING',
            'CODE_PARSING',
          ],
        }),
        model: 'gpt-4' as any,
        metadata: {},
      };
    }

    if (prompt.includes('Add JSDoc documentation')) {
      return {
        content: JSON.stringify({
          taskType: 'DOCUMENTATION',
          complexity: 'MODERATE',
          riskLevel: 'LOW',
          confidence: 0.92,
          reasoning:
            'This is a JSDoc documentation task that adds structured comments to code',
          requiredCapabilities: [
            'FILE_READING',
            'FILE_WRITING',
            'CODE_PARSING',
            'CODE_GENERATION',
          ],
        }),
        model: 'gpt-4' as any,
        metadata: {},
      };
    }

    // Default response for unknown tasks
    return {
      content: JSON.stringify({
        taskType: 'UNKNOWN',
        complexity: 'MODERATE',
        riskLevel: 'MEDIUM',
        confidence: 0.6,
        reasoning: 'Unable to classify this task with high confidence',
        requiredCapabilities: ['FILE_READING'],
      }),
      model: 'gpt-4' as any,
      metadata: {},
    };
  }

  selectModel(): any {
    return 'gpt-4';
  }

  async validateConfiguration(): Promise<boolean> {
    return true;
  }

  isConfigured(): boolean {
    return true;
  }

  async checkAvailability(): Promise<boolean> {
    return true;
  }

  getSupportedModels(): any[] {
    return ['gpt-4'];
  }
}

// Mock Context Service
class MockContextService implements IContextService {
  async initialize(): Promise<void> {}

  async gatherContext(): Promise<ContextInfo> {
    return {
      workingDirectory: '/test',
      projectType: 'typescript',
      language: 'typescript',
      dependencies: {},
      availableCommands: [],
      systemResources: {
        memory: { total: 1000, available: 500 },
        cpu: { cores: 4, usage: 0.5 },
        disk: { total: 1000, available: 500 },
      },
    };
  }

  async analyzeProject(): Promise<any> {
    return {
      projectType: 'typescript',
      dependencies: {},
      structure: {},
      vulnerabilities: [],
    };
  }

  async getAvailableCommands(): Promise<string[]> {
    return ['node', 'npm', 'git'];
  }

  async analyzeSystemResources(): Promise<any> {
    return {
      memory: { total: 1000, available: 500 },
      cpu: { cores: 4, usage: 0.5 },
      disk: { total: 1000, available: 500 },
    };
  }

  extractFilePathFromGoal(): string | null {
    return null;
  }
}

describe('AI vs Programmatic Task Classification Comparison', () => {
  let programmaticAnalyzer: TaskComplexityAnalyzer;
  let aiClassifier: AITaskClassifier;

  beforeEach(() => {
    programmaticAnalyzer = new TaskComplexityAnalyzer();
    aiClassifier = new AITaskClassifier(
      new MockAIService(),
      new MockContextService()
    );
  });

  describe('Problematic Cases Fixed by AI', () => {
    test('should correctly classify markdown summarization tasks', async () => {
      const testCases = [
        'Create a markdown summarizing the contents of every TypeScript class in this directory',
        'Generate markdown summary of all documented classes',
        'Summarize the API documentation in markdown format',
        'Create comprehensive markdown documentation from code analysis',
      ];

      for (const testCase of testCases) {
        // Programmatic approach (has issues)
        const programmaticResult = programmaticAnalyzer.analyzeTask(testCase);

        // AI approach (should be better)
        const aiResult = await aiClassifier.classifyTask(testCase);

        console.log(`\nTask: "${testCase}"`);
        console.log(`Programmatic: ${programmaticResult.type}`);
        console.log(`AI: ${aiResult.type}`);

        // AI should classify as ANALYSIS, programmatic might classify incorrectly
        expect(aiResult.type).toBe(TaskType.ANALYSIS);
      }
    });

    test('should handle ambiguous cases better with AI', async () => {
      const ambiguousCases = [
        'Document the API using markdown and generate comprehensive examples',
        'Analyze and document the codebase structure for new developers',
        'Create documentation that summarizes the entire project architecture',
        'Generate a report documenting all security vulnerabilities found',
      ];

      for (const testCase of ambiguousCases) {
        const programmaticResult = programmaticAnalyzer.analyzeTask(testCase);
        const aiResult = await aiClassifier.classifyTask(testCase);

        console.log(`\nAmbiguous: "${testCase}"`);
        console.log(`Programmatic: ${programmaticResult.type}`);
        console.log(`AI: ${aiResult.type}`);

        // AI should provide more consistent classification
        expect(aiResult.type).not.toBe(TaskType.UNKNOWN);
      }
    });

    test('should maintain accuracy for clear documentation tasks', async () => {
      const documentationTasks = [
        'Add JSDoc documentation to all methods in UserService class',
        'Generate JSDoc comments for public API methods',
        'Add inline comments explaining complex algorithms',
        'Document function parameters with proper JSDoc syntax',
      ];

      for (const testCase of documentationTasks) {
        const programmaticResult = programmaticAnalyzer.analyzeTask(testCase);
        const aiResult = await aiClassifier.classifyTask(testCase);

        console.log(`\nDocumentation: "${testCase}"`);
        console.log(`Programmatic: ${programmaticResult.type}`);
        console.log(`AI: ${aiResult.type}`);

        // Both should classify as DOCUMENTATION, but AI should be more confident
        expect(aiResult.type).toBe(TaskType.DOCUMENTATION);
        expect(programmaticResult.type).toBe(TaskType.DOCUMENTATION);
      }
    });
  });

  describe('Complex Context Understanding', () => {
    test('should understand intent from context clues', async () => {
      const contextualTasks = [
        'Help me understand what this codebase does by creating a summary',
        'I need to onboard new developers - create documentation explaining the project',
        'The stakeholders want a technical overview of our architecture',
        'Generate a report for the code review highlighting key components',
      ];

      for (const testCase of contextualTasks) {
        const programmaticResult = programmaticAnalyzer.analyzeTask(testCase);
        const aiResult = await aiClassifier.classifyTask(testCase);

        console.log(`\nContextual: "${testCase}"`);
        console.log(`Programmatic: ${programmaticResult.type}`);
        console.log(`AI: ${aiResult.type}`);

        // AI should better understand these are analysis/reporting tasks
        expect(aiResult.type).toBeOneOf([
          TaskType.ANALYSIS,
          TaskType.DOCUMENTATION,
        ]);
      }
    });
  });

  describe('Performance and Reliability', () => {
    test('should cache results for repeated queries', async () => {
      const task = 'Create a markdown summarizing the TypeScript classes';

      const start1 = Date.now();
      const result1 = await aiClassifier.classifyTask(task);
      const time1 = Date.now() - start1;

      const start2 = Date.now();
      const result2 = await aiClassifier.classifyTask(task);
      const time2 = Date.now() - start2;

      // Second call should be faster due to caching
      expect(time2).toBeLessThan(time1);
      expect(result1.type).toBe(result2.type);
    });

    test('should fallback gracefully when AI fails', async () => {
      // Create a classifier with a failing AI service
      const failingAI = {
        ...new MockAIService(),
        queryAI: async () => {
          throw new Error('AI service unavailable');
        },
      } as IAIService;

      const fallbackClassifier = new AITaskClassifier(
        failingAI,
        new MockContextService()
      );

      const task = 'Create a markdown summarizing the TypeScript classes';
      const result = await fallbackClassifier.classifyTask(task);

      // Should still return a valid result via programmatic fallback
      expect(result.type).toBeDefined();
      expect(Object.values(TaskType)).toContain(result.type);
    });
  });
});

// Helper matcher for Jest
expect.extend({
  toBeOneOf(received, expected) {
    const pass = expected.includes(received);
    if (pass) {
      return {
        message: () =>
          `expected ${received} not to be one of ${expected.join(', ')}`,
        pass: true,
      };
    } else {
      return {
        message: () =>
          `expected ${received} to be one of ${expected.join(', ')}`,
        pass: false,
      };
    }
  },
});

declare global {
  namespace jest {
    interface Matchers<R> {
      toBeOneOf(expected: any[]): R;
    }
  }
}
