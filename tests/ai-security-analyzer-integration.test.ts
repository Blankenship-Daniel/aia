/**
 * AI Security Analyzer Integration Test
 * Tests Phase 1.1: AI Security Analyzer implementation
 */

import { AISecurityAnalyzer } from '../src/services/AISecurityAnalyzer';
import { SecurityValidator } from '../src/SecurityValidator';
import { IAIService } from '../src/interfaces/IAIService';
import { IContextService } from '../src/interfaces/IContextService';
import {
  SecurityContext,
  AISecurityAnalysis,
} from '../src/interfaces/IAISecurityAnalyzer';
import { AIModel, ContextInfo } from '../src/types/index';

// Mock AI Service for testing
class MockAIService implements IAIService {
  private shouldFail = false;
  private customResponse?: any;

  async initialize(): Promise<void> {}

  async queryAI(
    prompt: string,
    context: ContextInfo
  ): Promise<{
    content: string;
    model: AIModel;
    metadata: Record<string, unknown>;
  }> {
    if (this.shouldFail) {
      throw new Error('AI service failed');
    }

    if (this.customResponse) {
      return {
        content: this.customResponse.content,
        model: 'gpt-4' as AIModel,
        metadata: {},
      };
    }

    // Default safe command response
    if (prompt.includes('ls -la')) {
      return {
        content: JSON.stringify({
          threat_level: 'low',
          confidence: 0.95,
          reasoning:
            'Simple directory listing command is safe for development use',
          context_factors: ['development_command', 'read_only_operation'],
          recommended_action: 'allow',
          security_score: 95,
          false_positive_likelihood: 0.05,
        }),
        model: 'gpt-4' as AIModel,
        metadata: {},
      };
    }

    // Dangerous command response
    if (prompt.includes('rm -rf /')) {
      return {
        content: JSON.stringify({
          threat_level: 'critical',
          confidence: 0.98,
          reasoning:
            'Recursive deletion of root directory will destroy the system',
          context_factors: ['destructive_operation', 'system_files'],
          recommended_action: 'block',
          security_score: 2,
          false_positive_likelihood: 0.01,
        }),
        model: 'gpt-4' as AIModel,
        metadata: {},
      };
    }

    // Suspicious but potentially legitimate command
    if (prompt.includes('find . -name "*.js" -exec rm {} \\;')) {
      return {
        content: JSON.stringify({
          threat_level: 'medium',
          confidence: 0.75,
          reasoning:
            'Bulk file deletion could be legitimate cleanup but requires caution',
          context_factors: [
            'bulk_operation',
            'file_deletion',
            'project_context',
          ],
          recommended_action: 'warn',
          suggested_modification: 'find . -name "*.js" -print0 | xargs -0 rm',
          security_score: 60,
          false_positive_likelihood: 0.4,
        }),
        model: 'gpt-4' as AIModel,
        metadata: {},
      };
    }

    // Default response
    return {
      content: JSON.stringify({
        threat_level: 'medium',
        confidence: 0.7,
        reasoning: 'Command analysis completed',
        context_factors: [],
        recommended_action: 'warn',
        security_score: 70,
        false_positive_likelihood: 0.3,
      }),
      model: 'gpt-3.5-turbo' as AIModel,
      metadata: {},
    };
  }

  selectModel(query: string, context: ContextInfo): AIModel {
    return 'gpt-4' as AIModel;
  }

  getAvailableModels(): Array<{
    id: AIModel;
    name: string;
    description: string;
    capabilities: string[];
    maxTokens: number;
  }> {
    return [
      {
        id: 'gpt-4' as AIModel,
        name: 'GPT-4',
        description: 'Most capable model',
        capabilities: ['reasoning', 'code', 'analysis'],
        maxTokens: 8192,
      },
    ];
  }

  isConfigured(): boolean {
    return true;
  }

  async validateKeys(): Promise<{ openai: boolean; anthropic: boolean }> {
    return { openai: true, anthropic: false };
  }

  // Test helpers
  setFailureMode(fail: boolean): void {
    this.shouldFail = fail;
  }

  setCustomResponse(response: any): void {
    this.customResponse = response;
  }
}

// Mock Context Service
class MockContextService implements IContextService {
  async initialize(): Promise<void> {}

  async gatherContext(): Promise<ContextInfo> {
    return {
      workingDirectory: '/test/project',
      platform: 'darwin',
      arch: 'x64',
      nodeVersion: 'v18.17.0',
      user: 'testuser',
      shell: 'bash',
      timestamp: '2024-01-01T00:00:00.000Z',
      projectType: 'typescript',
      projectInfo: {
        hasPackageJson: true,
        hasTsConfig: true,
        dependencies: ['express', 'lodash'],
      },
      gitStatus: 'clean',
      environmentScore: 0.8,
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

  async getGitStatus(): Promise<any> {
    return {
      branch: 'main',
      status: 'clean',
      commits: 42,
      modified: [],
      staged: [],
    };
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
    return {
      memory: { used: 8000, free: 8000, total: 16000 },
      cpu: { usage: 45, cores: 8 },
      disk: { used: 500000, free: 500000, total: 1000000 },
      platform: 'darwin',
      nodeVersion: '18.0.0',
    };
  }

  scoreContext(context: ContextInfo): {
    score: number;
    factors: Record<string, number>;
    recommendations: string[];
  } {
    return {
      score: 0.8,
      factors: { projectType: 0.9, gitStatus: 0.7 },
      recommendations: ['Consider adding tests'],
    };
  }
}

describe('AI Security Analyzer Integration (Phase 1.1)', () => {
  let aiService: MockAIService;
  let contextService: MockContextService;
  let aiSecurityAnalyzer: AISecurityAnalyzer;
  let securityValidator: SecurityValidator;

  beforeEach(() => {
    aiService = new MockAIService();
    contextService = new MockContextService();
    aiSecurityAnalyzer = new AISecurityAnalyzer(aiService, contextService);
    securityValidator = new SecurityValidator(aiSecurityAnalyzer);
  });

  describe('AISecurityAnalyzer Core Functionality', () => {
    test('should analyze safe commands correctly', async () => {
      const analysis = await aiSecurityAnalyzer.analyzeCommand('ls -la', {
        workingDirectory: '/test',
        userRole: 'developer',
        projectType: 'typescript',
      });

      expect(analysis.threat_level).toBe('low');
      expect(analysis.confidence).toBeGreaterThan(0.9);
      expect(analysis.recommended_action).toBe('allow');
      expect(analysis.reasoning).toContain('safe');
    });

    test('should detect dangerous commands', async () => {
      const analysis = await aiSecurityAnalyzer.analyzeCommand('rm -rf /', {
        workingDirectory: '/test',
        userRole: 'user',
      });

      expect(analysis.threat_level).toBe('critical');
      expect(analysis.confidence).toBeGreaterThan(0.9);
      expect(analysis.recommended_action).toBe('block');
      expect(analysis.reasoning).toContain('destroy');
    });

    test('should provide warnings for suspicious commands', async () => {
      const analysis = await aiSecurityAnalyzer.analyzeCommand(
        'find . -name "*.js" -exec rm {} \\;',
        {
          workingDirectory: '/test/project',
          userRole: 'developer',
          projectType: 'javascript',
        }
      );

      expect(analysis.threat_level).toBe('medium');
      expect(analysis.recommended_action).toBe('warn');
      expect(analysis.suggested_modification).toBeDefined();
    });

    test('should handle AI service failures gracefully', async () => {
      aiService.setFailureMode(true);

      await expect(
        aiSecurityAnalyzer.analyzeCommand('test command', {})
      ).rejects.toThrow('AI security analysis failed');
    });

    test('should reject low confidence analyses', async () => {
      aiService.setCustomResponse({
        content: JSON.stringify({
          threat_level: 'low',
          confidence: 0.5, // Below threshold
          reasoning: 'Low confidence analysis',
          context_factors: [],
          recommended_action: 'allow',
          security_score: 70,
        }),
      });

      await expect(
        aiSecurityAnalyzer.analyzeCommand('test command', {})
      ).rejects.toThrow('confidence too low');
    });
  });

  describe('Enhanced SecurityValidator Integration', () => {
    test('should use AI analysis when available', async () => {
      const result = await securityValidator.validateCommandEnhanced('ls -la');

      expect(result.usedAIAnalysis).toBe(true);
      expect(result.aiAnalysis).toBeDefined();
      expect(result.allowed).toBe(true);
      // No fallback in AI-only mode
    });

    test('should block dangerous commands via AI', async () => {
      const result = await securityValidator.validateCommandEnhanced(
        'rm -rf /'
      );

      expect(result.usedAIAnalysis).toBe(true);
      expect(result.aiAnalysis?.threat_level).toBe('critical');
      expect(result.allowed).toBe(false);
      expect(result.blocked).toBe(true);
      expect(result.reason).toContain('AI Security Analysis');
    });

    test('should provide AI warnings and suggestions', async () => {
      const result = await securityValidator.validateCommandEnhanced(
        'find . -name "*.js" -exec rm {} \\;'
      );

      expect(result.usedAIAnalysis).toBe(true);
      expect(
        result.warnings.some((w) => w.includes('AI Security Warning'))
      ).toBe(true);
      expect(
        result.warnings.some((w) => w.includes('Suggested safer alternative'))
      ).toBe(true);
    });

    test('should throw error when AI fails (no fallback)', async () => {
      aiService.setFailureMode(true);

      await expect(
        securityValidator.validateCommandEnhanced('ls -la')
      ).rejects.toThrow(/AI security analysis failed/);
    });

    test('should analyze complex commands with AI intelligence', async () => {
      // This command has shell metacharacters that would previously trigger regex warnings
      const command = 'find . -name "*.js" | head -5';

      aiService.setCustomResponse({
        content: JSON.stringify({
          threat_level: 'low',
          confidence: 0.9, // High confidence
          reasoning: 'Safe file discovery command with output limiting',
          context_factors: ['development_tool', 'safe_piping'],
          recommended_action: 'allow',
          security_score: 90,
        }),
      });

      const result = await securityValidator.validateCommandEnhanced(command);

      expect(result.usedAIAnalysis).toBe(true);
      expect(result.allowed).toBe(true);
      // AI should handle this better than regex pattern matching
      expect(result.aiAnalysis).toBeDefined();
      expect(result.aiAnalysis?.threat_level).toBe('low');
      expect(result.aiAnalysis?.confidence).toBeGreaterThan(0.8);
    });
  });

  describe('SecurityValidator without AI (AI-Only Mode)', () => {
    test('should throw error when AI analyzer not configured', async () => {
      const regexOnlyValidator = new SecurityValidator(); // No AI analyzer

      await expect(
        regexOnlyValidator.validateCommandEnhanced('ls -la')
      ).rejects.toThrow(/AI Security Analyzer is required/);
    });
  });

  describe('Performance and Caching', () => {
    test('should complete analysis within reasonable time', async () => {
      const startTime = Date.now();

      await aiSecurityAnalyzer.analyzeCommand('ls -la', {
        workingDirectory: '/test',
      });

      const duration = Date.now() - startTime;
      expect(duration).toBeLessThan(1000); // Should complete within 1 second
    });

    test('should cache results for repeated commands', async () => {
      const command = 'echo "test"';
      const context = { workingDirectory: '/test' };

      // First call
      const result1 = await aiSecurityAnalyzer.analyzeCommand(command, context);

      // Second call should be faster (cached)
      const startTime = Date.now();
      const result2 = await aiSecurityAnalyzer.analyzeCommand(command, context);
      const duration = Date.now() - startTime;

      expect(result1.reasoning).toBe(result2.reasoning);
      expect(duration).toBeLessThan(50); // Cached result should be very fast
    });
  });

  describe('Feedback and Learning', () => {
    test('should accept user feedback', async () => {
      const analysis = await aiSecurityAnalyzer.analyzeCommand('ls -la', {});

      // Should not throw
      await expect(
        aiSecurityAnalyzer.provideFeedback(
          'ls -la',
          analysis,
          'correct',
          'This command is indeed safe'
        )
      ).resolves.not.toThrow();
    });

    test('should provide safer alternatives', async () => {
      const alternatives = await aiSecurityAnalyzer.getSaferAlternatives(
        'rm -rf .',
        { workingDirectory: '/test' }
      );

      expect(Array.isArray(alternatives)).toBe(true);
      // Note: Actual alternatives depend on AI response format
    });
  });

  describe('Availability Check', () => {
    test('should report availability when AI service is working', async () => {
      const isAvailable = await aiSecurityAnalyzer.isAvailable();
      expect(isAvailable).toBe(true);
    });

    test('should report unavailability when AI service fails', async () => {
      aiService.setFailureMode(true);
      const isAvailable = await aiSecurityAnalyzer.isAvailable();
      expect(isAvailable).toBe(false);
    });
  });
});
