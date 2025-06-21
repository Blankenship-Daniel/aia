/**
 * AI Model Recommendation Service Test
 *
 * Tests the new AI-powered model recommendation service
 */

import { AIModelRecommendationService } from '../src/services/AIModelRecommendationService';
import { ModelSelectionContext } from '../src/interfaces/IModelRecommendationService';
import { AIModel } from '../src/types/index';

describe('AIModelRecommendationService', () => {
  let service: AIModelRecommendationService;
  let mockAIService: any;
  let mockContextService: any;

  beforeEach(() => {
    // Mock AI service
    mockAIService = {
      queryAI: jest.fn().mockResolvedValue({
        content: JSON.stringify({
          recommendedModel: 'gpt-4',
          confidence: 0.9,
          reasoning: 'Complex task requires advanced model',
          alternatives: [
            {
              model: 'gpt-3.5-turbo',
              confidence: 0.7,
              reasoning: 'Faster alternative',
              tradeoffs: ['faster', 'cheaper'],
            },
          ],
          taskRequirements: {
            complexity: 'high',
            domain: 'code',
            skillsRequired: ['programming', 'debugging'],
            expectedOutputType: 'code',
            contextSensitivity: 'high',
            reasoning: 'requires deep code understanding',
            confidence: 0.9,
          },
        }),
        model: 'gpt-4' as AIModel,
        metadata: {},
      }),
    };

    // Mock Context service
    mockContextService = {
      gatherContext: jest.fn().mockResolvedValue({
        workingDirectory: '/test/project',
        projectType: 'typescript',
        platform: 'darwin',
        arch: 'arm64',
        nodeVersion: 'v18.0.0',
        user: 'testuser',
        shell: '/bin/zsh',
        timestamp: new Date().toISOString(),
        projectInfo: {},
        gitStatus: 'clean',
        environmentScore: 1.0,
      }),
    };

    service = new AIModelRecommendationService(
      mockAIService,
      mockContextService
    );
  });

  describe('recommendModel', () => {
    it('should recommend a model based on AI analysis', async () => {
      const context: ModelSelectionContext = {
        query: 'Help me debug this TypeScript function',
        availableModels: [
          'gpt-4',
          'gpt-3.5-turbo',
          'claude-3-5-sonnet-20241022',
        ],
        projectContext: {
          workingDirectory: '/test/project',
          projectType: 'typescript',
          language: 'typescript',
        },
      };

      const recommendation = await service.recommendModel(context);

      expect(recommendation).toBeDefined();
      expect(recommendation.recommendedModel).toBe('gpt-4');
      expect(recommendation.confidence).toBeGreaterThan(0.5);
      expect(recommendation.reasoning).toContain(
        'Complex task requires advanced model'
      );
      expect(mockAIService.queryAI).toHaveBeenCalledTimes(1);
      expect(mockContextService.gatherContext).toHaveBeenCalledTimes(1);
    });

    it('should provide fallback recommendation on AI failure', async () => {
      mockAIService.queryAI.mockRejectedValue(new Error('AI service failed'));

      const context: ModelSelectionContext = {
        query: 'Simple query',
        availableModels: ['gpt-3.5-turbo'],
        projectContext: {
          workingDirectory: '/test',
        },
      };

      const recommendation = await service.recommendModel(context);

      expect(recommendation).toBeDefined();
      expect(recommendation.recommendedModel).toBe('gpt-3.5-turbo');
      expect(recommendation.reasoning).toContain('fallback');
    });
  });

  describe('analyzeTaskRequirements', () => {
    it('should analyze task requirements using AI', async () => {
      // Set up specific mock for analyzeTaskRequirements call
      mockAIService.queryAI.mockResolvedValueOnce({
        content: JSON.stringify({
          complexity: 'high',
          domain: 'code',
          skillsRequired: ['programming', 'debugging'],
          expectedOutputType: 'code',
          contextSensitivity: 'high',
          reasoning: 'requires deep code understanding',
          confidence: 0.9,
        }),
        model: 'gpt-4',
        metadata: {},
      });

      const requirements = await service.analyzeTaskRequirements(
        'Debug TypeScript code'
      );

      expect(requirements).toBeDefined();
      expect(requirements.complexity).toBe('high');
      expect(requirements.domain).toBe('code');
      expect(requirements.skillsRequired).toContain('programming');
      expect(mockAIService.queryAI).toHaveBeenCalled();
    });

    it('should provide fallback requirements on AI failure', async () => {
      mockAIService.queryAI.mockRejectedValue(new Error('AI failed'));

      const requirements = await service.analyzeTaskRequirements('Test task');

      expect(requirements).toBeDefined();
      expect(requirements.complexity).toBe('medium');
      expect(requirements.domain).toBe('general');
      expect(requirements.reasoning).toContain('error');
    });
  });

  describe('trackModelPerformance', () => {
    it('should track model performance data', async () => {
      await service.trackModelPerformance(
        'gpt-4' as AIModel,
        'debugging task',
        { success: true, responseTime: 2000, quality: 0.9 },
        { satisfaction: 5, comments: 'Excellent output' }
      );

      // Should not throw and should log success
      expect(true).toBe(true); // Test passes if no error thrown
    });
  });

  describe('getDetailedRecommendationAnalysis', () => {
    it('should provide comprehensive analysis', async () => {
      const context: ModelSelectionContext = {
        query: 'Complex coding task',
        availableModels: ['gpt-4', 'gpt-3.5-turbo'],
        projectContext: {
          workingDirectory: '/test/project',
          projectType: 'typescript',
        },
      };

      const analysis = await service.getDetailedRecommendationAnalysis(context);

      expect(analysis).toBeDefined();
      expect(analysis.taskAnalysis).toBeDefined();
      expect(analysis.contextAnalysis).toBeDefined();
      expect(analysis.modelComparison).toBeDefined();
      expect(analysis.recommendation).toBeDefined();
      expect(analysis.metadata).toBeDefined();
    });
  });

  describe('getAvailableModelsWithMetrics', () => {
    it('should return models with performance metrics', async () => {
      const models = await service.getAvailableModelsWithMetrics();

      expect(models).toBeDefined();
      expect(Array.isArray(models)).toBe(true);
      expect(models.length).toBeGreaterThan(0);

      if (models.length > 0) {
        const model = models[0];
        expect(model.model).toBeDefined();
        expect(model.averageResponseTime).toBeGreaterThan(0);
        expect(model.successRate).toBeGreaterThanOrEqual(0);
        expect(model.successRate).toBeLessThanOrEqual(1);
      }
    });

    it('should filter by provider when specified', async () => {
      const openaiModels = await service.getAvailableModelsWithMetrics(
        'openai'
      );

      expect(openaiModels).toBeDefined();
      openaiModels.forEach((model) => {
        expect(model.model).toMatch(/^gpt/);
      });
    });
  });
});
