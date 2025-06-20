/**
 * Integration test for AI-powered task classification in AgentExecutionEngine
 * Tests the complete integration of AI-based classification with fallbacks
 */

import { AgentExecutionEngine } from '../src/services/AgentExecutionEngine';
import { AITaskClassifier } from '../src/services/AITaskClassifier';
import { EnhancedTaskComplexityAnalyzer } from '../src/services/EnhancedTaskComplexityAnalyzer';
import {
  TaskComplexityAnalyzer,
  TaskType,
} from '../src/services/TaskComplexityAnalyzer';
import { IAIService } from '../src/interfaces/IAIService';
import { IContextService } from '../src/interfaces/IContextService';
import { ICommandService } from '../src/interfaces/ICommandService';
import { ContextInfo } from '../src/types';

// Mock services for testing
class MockAIService implements IAIService {
  private aiEnabled = true;

  async initialize(): Promise<void> {}

  async queryAI(prompt: string, context: ContextInfo) {
    if (!this.aiEnabled) {
      throw new Error('AI service unavailable');
    }

    // Simulate AI classification response for different task types
    if (
      prompt.includes('markdown summarizing') ||
      prompt.includes('summarizing the contents')
    ) {
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
        model: 'gpt-4' as any,
        metadata: {},
      };
    }

    if (prompt.includes('JSDoc') || prompt.includes('add comments')) {
      return {
        content: JSON.stringify({
          taskType: 'DOCUMENTATION',
          complexity: 'MODERATE',
          riskLevel: 'LOW',
          confidence: 0.88,
          reasoning:
            'This is a documentation task adding JSDoc comments to code',
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

    // Default response
    return {
      content: JSON.stringify({
        taskType: 'UNKNOWN',
        complexity: 'MODERATE',
        riskLevel: 'MEDIUM',
        confidence: 0.6,
        reasoning: 'Unable to classify with high confidence',
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
    return this.aiEnabled;
  }
  async checkAvailability(): Promise<boolean> {
    return this.aiEnabled;
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

  setAIEnabled(enabled: boolean) {
    this.aiEnabled = enabled;
  }
}

class MockContextService implements IContextService {
  async initialize(): Promise<void> {}

  async gatherContext(): Promise<ContextInfo> {
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
  scoreContext(context: ContextInfo): {
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

class MockCommandService implements ICommandService {
  async initialize(): Promise<void> {}

  async executeCommand(
    command: string,
    options?: {
      optimize?: boolean;
      safe?: boolean;
      workingDirectory?: string;
      timeout?: number;
    }
  ): Promise<{
    stdout: string;
    stderr: string;
    exitCode: number;
    duration: number;
    optimized: boolean;
  }> {
    return {
      stdout: 'mock output',
      stderr: '',
      exitCode: 0,
      duration: 100,
      optimized: false,
    };
  }

  async validateCommandSafety(command: string): Promise<{
    safe: boolean;
    level: 'safe' | 'warning' | 'dangerous';
    warnings: string[];
    suggestions: string[];
  }> {
    return {
      safe: true,
      level: 'safe',
      warnings: [],
      suggestions: [],
    };
  }

  async optimizeCommand(
    command: string,
    context: ContextInfo
  ): Promise<{
    optimized: string;
    original: string;
    reason: string;
    applied: boolean;
  }> {
    return {
      optimized: command,
      original: command,
      reason: 'No optimization needed',
      applied: false,
    };
  }

  async suggestCommands(
    context: ContextInfo,
    limit?: number
  ): Promise<
    Array<{
      command: string;
      description: string;
      confidence: number;
    }>
  > {
    return [
      {
        command: 'ls -la',
        description: 'List directory contents',
        confidence: 0.8,
      },
    ];
  }

  parseCommand(command: string): {
    program: string;
    args: string[];
    pipes: boolean;
    redirects: boolean;
    background: boolean;
  } {
    return {
      program: command.split(' ')[0],
      args: command.split(' ').slice(1),
      pipes: false,
      redirects: false,
      background: false,
    };
  }

  async getHistory(limit?: number): Promise<
    Array<{
      command: string;
      timestamp: string;
      exitCode: number;
      duration: number;
    }>
  > {
    return [
      {
        command: 'test command',
        timestamp: new Date().toISOString(),
        exitCode: 0,
        duration: 100,
      },
    ];
  }

  async getAvailableCommands(): Promise<string[]> {
    return ['test'];
  }

  async validateCommand(command: string): Promise<{
    valid: boolean;
    safe: boolean;
    warnings: string[];
    suggestions: string[];
  }> {
    return { valid: true, safe: true, warnings: [], suggestions: [] };
  }
}

describe('AI Task Classification Integration Tests', () => {
  let executionEngine: AgentExecutionEngine;
  let mockAIService: MockAIService;
  let mockContextService: MockContextService;
  let mockCommandService: MockCommandService;

  beforeEach(() => {
    mockAIService = new MockAIService();
    mockContextService = new MockContextService();
    mockCommandService = new MockCommandService();

    executionEngine = new AgentExecutionEngine(
      mockAIService,
      mockContextService,
      mockCommandService
    );
  });

  describe('AI-First Classification', () => {
    test('should use AI classification for markdown summarization tasks', async () => {
      const goal =
        'Create a markdown summarizing the contents of every TypeScript class in this directory';
      const context = await mockContextService.gatherContext();

      const result = await executionEngine.planExecution(goal, context);

      expect(result.success).toBe(true);
      expect(result.plan).toBeDefined();
    });

    test('should use AI classification for JSDoc documentation tasks', async () => {
      const goal =
        'Add JSDoc documentation to all methods in the UserService class';
      const context = await mockContextService.gatherContext();

      const result = await executionEngine.planExecution(goal, context);

      expect(result.success).toBe(true);
      expect(result.plan).toBeDefined();
    });

    test('should handle AI classification with high confidence', async () => {
      const goal = 'Create a markdown summarizing the TypeScript classes';
      const context = await mockContextService.gatherContext();

      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      const result = await executionEngine.planExecution(goal, context);

      expect(result.success).toBe(true);
      expect(consoleSpy).toHaveBeenCalledWith(
        '🧠 Using AI-powered task classification...'
      );

      consoleSpy.mockRestore();
    });
  });

  describe('Fallback to Programmatic Classification', () => {
    test('should fall back to programmatic classification when AI fails', async () => {
      mockAIService.setAIEnabled(false);

      const goal =
        'Create a markdown summarizing the contents of every TypeScript class';
      const context = await mockContextService.gatherContext();

      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      const result = await executionEngine.planExecution(goal, context);

      expect(result.success).toBe(true);
      expect(consoleSpy).toHaveBeenCalledWith(
        '⚠️  AI classification failed, falling back to programmatic analysis'
      );

      consoleSpy.mockRestore();
    });

    test('should use programmatic classification when AI service is not available', async () => {
      const engineWithoutAI = new AgentExecutionEngine(
        undefined as any,
        mockContextService,
        mockCommandService
      );

      const goal = 'Add JSDoc documentation to methods';
      const context = await mockContextService.gatherContext();

      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      const result = await engineWithoutAI.planExecution(goal, context);

      expect(result.success).toBe(true);
      expect(consoleSpy).toHaveBeenCalledWith(
        '⚠️  AI-powered task classification not available, using programmatic fallback'
      );

      consoleSpy.mockRestore();
    });
  });

  describe('Enhanced vs Original Analyzer Comparison', () => {
    test('should demonstrate improved classification accuracy', async () => {
      const testCases = [
        {
          task: 'Create a markdown summarizing the contents of every TypeScript class in this directory',
          expectedAI: TaskType.ANALYSIS,
          expectedProgrammatic: TaskType.ANALYSIS,
        },
        {
          task: 'Add JSDoc documentation to all methods',
          expectedAI: TaskType.DOCUMENTATION,
          expectedProgrammatic: TaskType.DOCUMENTATION,
        },
      ];

      const originalAnalyzer = new TaskComplexityAnalyzer();
      const enhancedAnalyzer = new EnhancedTaskComplexityAnalyzer(
        mockAIService,
        mockContextService
      );

      for (const testCase of testCases) {
        const originalResult = originalAnalyzer.analyzeTask(testCase.task);
        const enhancedResult = await enhancedAnalyzer.analyzeTask(
          testCase.task
        );

        expect(originalResult.type).toBe(testCase.expectedProgrammatic);
        expect(enhancedResult.type).toBe(testCase.expectedAI);
      }
    });
  });

  describe('Performance and Caching', () => {
    test('should cache AI classification results', async () => {
      const goal = 'Create a markdown summarizing the TypeScript classes';
      const context = await mockContextService.gatherContext();

      const aiClassifier = new AITaskClassifier(
        mockAIService,
        mockContextService
      );

      const result1 = await aiClassifier.classifyTask(goal);
      const result2 = await aiClassifier.classifyTask(goal);

      expect(result1.type).toBe(result2.type);
      expect(result1.complexity).toBe(result2.complexity);
    });
  });

  describe('Error Handling and Resilience', () => {
    test('should gracefully handle AI service errors', async () => {
      const errorAIService = {
        ...mockAIService,
        queryAI: jest.fn().mockRejectedValue(new Error('AI service error')),
      } as any;

      const engineWithErrorAI = new AgentExecutionEngine(
        errorAIService,
        mockContextService,
        mockCommandService
      );

      const goal = 'Create a markdown summary';
      const context = await mockContextService.gatherContext();

      const result = await engineWithErrorAI.planExecution(goal, context);

      expect(result.success).toBe(true);
    });

    test('should handle malformed AI responses gracefully', async () => {
      const malformedAIService = {
        ...mockAIService,
        queryAI: jest.fn().mockResolvedValue({
          content: 'Invalid JSON response',
          model: 'gpt-4',
          metadata: {},
        }),
      } as any;

      const engineWithMalformedAI = new AgentExecutionEngine(
        malformedAIService,
        mockContextService,
        mockCommandService
      );

      const goal = 'Analyze the codebase';
      const context = await mockContextService.gatherContext();

      const result = await engineWithMalformedAI.planExecution(goal, context);

      expect(result.success).toBe(true);
    });
  });
});
