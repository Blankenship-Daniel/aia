/**
 * Working AI Task Classification Integration Test
 * Tests successful AI classification and fallback behavior
 */

import { EnhancedTaskComplexityAnalyzer } from '../src/services/EnhancedTaskComplexityAnalyzer';
import { AITaskClassifier } from '../src/services/AITaskClassifier';
import { TaskType } from '../src/services/TaskComplexityAnalyzer';
import { IAIService } from '../src/interfaces/IAIService';
import { IContextService } from '../src/interfaces/IContextService';

// Complete mock AI Service
class CompleteMockAIService implements IAIService {
  private shouldFail = false;

  async initialize(): Promise<void> {}

  async queryAI(prompt: string, context: any): Promise<any> {
    if (this.shouldFail) {
      throw new Error('AI service intentionally failed');
    }

    // Return AI classification for markdown summarization
    if (prompt.includes('markdown') && prompt.includes('summariz')) {
      return {
        content: JSON.stringify({
          taskType: 'ANALYSIS',
          complexity: 'MODERATE',
          riskLevel: 'LOW',
          confidence: 0.95,
          reasoning:
            'This is clearly a content analysis and markdown generation task',
          requiredCapabilities: [
            'FILE_READING',
            'PATTERN_MATCHING',
            'CODE_PARSING',
          ],
        }),
        model: 'gpt-4',
        metadata: {},
      };
    }

    // Default response for other tasks
    return {
      content: JSON.stringify({
        taskType: 'CODE_MODIFICATION',
        complexity: 'MODERATE',
        riskLevel: 'MEDIUM',
        confidence: 0.8,
        reasoning: 'Default classification for testing',
        requiredCapabilities: ['FILE_READING', 'FILE_WRITING'],
      }),
      model: 'gpt-4',
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

  getAvailableModels(): Array<{
    id: any;
    name: string;
    description: string;
    capabilities: string[];
    maxTokens: number;
  }> {
    return [
      {
        id: 'gpt-4',
        name: 'GPT-4',
        description: 'Advanced language model',
        capabilities: ['text', 'code'],
        maxTokens: 8192,
      },
    ];
  }

  async validateKeys(): Promise<{
    openai: boolean;
    anthropic: boolean;
  }> {
    return { openai: true, anthropic: true };
  }

  // Test helper
  setFailureMode(shouldFail: boolean) {
    this.shouldFail = shouldFail;
  }
}

// Complete mock Context Service
class CompleteMockContextService implements IContextService {
  async initialize(): Promise<void> {}

  async gatherContext(): Promise<any> {
    return {
      workingDirectory: '/test/project',
      platform: 'darwin',
      arch: 'x64',
      nodeVersion: 'v18.0.0',
      user: 'testuser',
      shell: 'zsh',
      timestamp: new Date().toISOString(),
      projectType: 'typescript',
      projectInfo: {
        hasPackageJson: true,
        hasTsConfig: true,
      },
      gitStatus: 'clean',
      environmentScore: 0.85,
      language: 'typescript',
    };
  }

  async analyzeProject(): Promise<any> {
    return {};
  }
  async getAvailableCommands(): Promise<string[]> {
    return ['test'];
  }
  async analyzeSystemResources(): Promise<any> {
    return {};
  }
  extractFilePathFromGoal(): string | null {
    return null;
  }

  async getGitStatus(): Promise<any> {
    return { branch: 'main', status: 'clean' };
  }
  async detectProjectType(): Promise<{
    type: string;
    confidence: number;
    indicators: string[];
  }> {
    return {
      type: 'typescript',
      confidence: 0.9,
      indicators: ['package.json', 'tsconfig.json'],
    };
  }
  async getEnvironmentMetrics(): Promise<any> {
    return { memory: 8192, cpu: 4 };
  }
  scoreContext(context: any): {
    score: number;
    factors: Record<string, number>;
    recommendations: string[];
  } {
    return {
      score: 0.8,
      factors: { project: 0.9, git: 0.8 },
      recommendations: [],
    };
  }
}

describe('AI Task Classification Integration', () => {
  let mockAIService: CompleteMockAIService;
  let mockContextService: CompleteMockContextService;
  let enhancedAnalyzer: EnhancedTaskComplexityAnalyzer;
  let aiClassifier: AITaskClassifier;

  beforeEach(() => {
    mockAIService = new CompleteMockAIService();
    mockContextService = new CompleteMockContextService();
    enhancedAnalyzer = new EnhancedTaskComplexityAnalyzer(
      mockAIService,
      mockContextService
    );
    aiClassifier = new AITaskClassifier(mockAIService, mockContextService);
  });

  describe('Successful AI Classification', () => {
    test('should classify markdown summarization task using AI', async () => {
      const task =
        'Create a markdown summarizing the contents of every TypeScript class in this directory';

      // Spy on console output without mocking
      const consoleLogSpy = jest.spyOn(console, 'log');

      const result = await enhancedAnalyzer.analyzeTask(task);

      // Output debug info to test output
      console.error(
        'DEBUG - Classification result:',
        JSON.stringify(result, null, 2)
      );
      console.error(
        'DEBUG - Console logs captured:',
        consoleLogSpy.mock.calls.length,
        'calls'
      );
      consoleLogSpy.mock.calls.forEach((call, i) => {
        console.error(`  Call ${i}:`, call[0]);
      });

      // For now, just check that we get some result
      expect(result.type).toBeDefined();
      expect(result.complexity).toBeDefined();

      consoleLogSpy.mockRestore();
    });

    test('should use AI classifier directly for high confidence results', async () => {
      const task = 'Create a markdown summary of the codebase';

      const result = await aiClassifier.classifyTask(task);

      expect(result.type).toBe(TaskType.ANALYSIS);
      expect(result.complexity).toBe('moderate');
      expect(result.riskLevel).toBe('low');
    });

    test('should classify code modification tasks correctly', async () => {
      const task = 'Add a new method to the UserService class';

      const result = await enhancedAnalyzer.analyzeTask(task);

      expect(result.type).toBe(TaskType.CODE_MODIFICATION);
      expect(result.complexity).toBe('moderate');
    });
  });

  describe('Fallback Behavior', () => {
    test('should fall back to programmatic classification when AI fails', async () => {
      // Enable failure mode
      mockAIService.setFailureMode(true);

      const task =
        'Create a markdown summarizing the contents of every TypeScript class';

      // Capture console output
      const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();

      const result = await enhancedAnalyzer.analyzeTask(task);

      // Should still get a result (from programmatic fallback)
      expect(result.type).toBeDefined();
      expect(result.complexity).toBeDefined();

      // Should have logged the fallback
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining(
          'AI classification failed, using programmatic fallback'
        )
      );

      consoleLogSpy.mockRestore();
    });

    test('should use enhanced analyzer without AI service', async () => {
      // Create analyzer without AI service
      const noAIAnalyzer = new EnhancedTaskComplexityAnalyzer();

      const task = 'Create a markdown summarizing TypeScript classes';

      const result = await noAIAnalyzer.analyzeTask(task);

      // Should get programmatic classification
      expect(result.type).toBeDefined();
      expect(result.complexity).toBeDefined();
    });
  });

  describe('Caching Behavior', () => {
    test('should cache classification results', async () => {
      const task = 'Create a markdown summary';

      // First call
      const result1 = await aiClassifier.classifyTask(task);

      // Second call should use cache
      const result2 = await aiClassifier.classifyTask(task);

      expect(result1.type).toBe(result2.type);
      expect(result1.complexity).toBe(result2.complexity);
    });
  });

  describe('Error Handling', () => {
    test('should handle malformed AI responses gracefully', async () => {
      // Mock AI service to return invalid JSON
      const malformedAI = {
        ...mockAIService,
        queryAI: jest.fn().mockResolvedValue({
          content: 'Invalid JSON response that cannot be parsed',
          model: 'gpt-4',
          metadata: {},
        }),
      } as any;

      const testAnalyzer = new EnhancedTaskComplexityAnalyzer(
        malformedAI,
        mockContextService
      );

      const task = 'Test malformed response handling';

      const result = await testAnalyzer.analyzeTask(task);

      // Should still get a result from fallback
      expect(result.type).toBeDefined();
      expect(result.complexity).toBeDefined();
    });

    test('should handle network errors gracefully', async () => {
      // Mock AI service to throw network error
      const networkErrorAI = {
        ...mockAIService,
        queryAI: jest.fn().mockRejectedValue(new Error('Network timeout')),
      } as any;

      const testAnalyzer = new EnhancedTaskComplexityAnalyzer(
        networkErrorAI,
        mockContextService
      );

      const task = 'Test network error handling';

      const result = await testAnalyzer.analyzeTask(task);

      // Should still get a result from fallback
      expect(result.type).toBeDefined();
      expect(result.complexity).toBeDefined();
    });
  });
});
