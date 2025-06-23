/**
 * AI Error Diagnostic Service Tests
 *
 * Tests for Phase 2.1.3: AI-powered error analysis and diagnostics
 * replacing pattern-based error categorization
 */

import { AIErrorDiagnosticService } from '../src/services/AIErrorDiagnosticService';
import { ErrorAnalysisService } from '../src/services/ErrorAnalysisService';
import {
  IErrorDiagnosticService,
  ExecutionError,
  ExecutionContext,
  ErrorDiagnosis,
} from '../src/interfaces/IErrorDiagnosticService';
import { IAIService } from '../src/interfaces/IAIService';
import {
  ExecutionStep,
  AIAConfig,
  ContextInfo,
  AIModel,
} from '../src/types/index';

describe('AI Error Diagnostic Service - Phase 2.1.3', () => {
  let mockAIService: any;
  let errorDiagnosticService: AIErrorDiagnosticService;
  let errorAnalysisService: ErrorAnalysisService;

  beforeEach(() => {
    // Create a simple mock AI service
    mockAIService = {
      queryAI: jest.fn(),
      initialize: jest.fn(),
      selectModel: jest.fn(),
      getAvailableModels: jest.fn(),
      isConfigured: jest.fn(),
      validateKeys: jest.fn(),
      getUsageStats: jest.fn(),
    };

    errorDiagnosticService = new AIErrorDiagnosticService(mockAIService);
    errorAnalysisService = new ErrorAnalysisService(errorDiagnosticService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Core Functionality', () => {
    it('should create error diagnostic service with AI dependency', () => {
      expect(errorDiagnosticService).toBeInstanceOf(AIErrorDiagnosticService);
      expect(errorAnalysisService).toBeInstanceOf(ErrorAnalysisService);
    });

    it('should provide fallback analysis when AI fails', async () => {
      // Mock AI service to fail
      mockAIService.queryAI.mockRejectedValue(
        new Error('AI service unavailable')
      );

      const executionError: ExecutionError = {
        message: 'Test error',
        timestamp: new Date(),
        step: {
          id: 'test-step',
          description: 'Test step',
          command: 'test command',
          expectedOutcome: 'Success',
          risks: [],
          dependencies: [],
        },
        context: {
          command: 'test command',
          workingDirectory: '/test',
          environment: {},
          systemInfo: {
            platform: 'darwin',
            architecture: 'arm64',
            availableMemory: 1000,
            diskSpace: 5000,
          },
        },
      };

      const context: ExecutionContext = {
        command: 'test command',
        workingDirectory: '/test',
        environment: {},
        systemInfo: {
          platform: 'darwin',
          architecture: 'arm64',
          availableMemory: 1000,
          diskSpace: 5000,
        },
      };

      const diagnosis = await errorDiagnosticService.analyzeError(
        executionError,
        context
      );

      expect(diagnosis).toBeDefined();
      expect(diagnosis.category.primary).toBe('system'); // fallback category
      expect(diagnosis.rootCause).toBe('Error analysis unavailable');
    });

    it('should analyze errors using AI when available', async () => {
      // Mock successful AI response
      const mockDiagnosis = {
        analysis: {
          category: 'dependency',
          severity: 'high',
          rootCause: 'Missing Node.js module',
          errorClassification: {
            primaryType: 'dependency',
            subTypes: ['missing_package'],
            patterns: ['MODULE_NOT_FOUND'],
            frequency: 'common',
            complexity: 'simple',
          },
          causality: {
            directCause: 'Package not installed',
            contributingFactors: ['Missing package.json'],
            chainOfEvents: [],
            preventability: 'easily_preventable',
          },
          impact: {
            immediate: ['Build failure'],
            shortTerm: ['Development blocked'],
            longTerm: ['Project delays'],
            systemWide: false,
            userExperience: 'severe',
            businessImpact: 'medium',
          },
          recommendations: [
            {
              type: 'immediate_action',
              priority: 1,
              description: 'Install missing package',
              rationale: 'Resolve immediate build failure',
              estimatedEffort: 'minimal',
              expectedOutcome: 'Build success',
            },
          ],
          learning: {
            patternRecognition: ['dependency_error'],
            improvementOpportunities: ['automated_checks'],
            knowledgeGaps: [],
            systemWeaknesses: ['dependency_management'],
            userEducation: ['package_management'],
          },
        },
      };

      mockAIService.queryAI.mockResolvedValue({
        content: JSON.stringify(mockDiagnosis),
        model: 'gpt-4' as AIModel,
        metadata: {},
      });

      const executionError: ExecutionError = {
        message: 'Module not found: express',
        timestamp: new Date(),
        step: {
          id: 'test-step',
          description: 'Installing dependencies',
          command: 'npm install express',
          expectedOutcome: 'Package installed',
          risks: [],
          dependencies: [],
        },
        context: {
          command: 'npm install express',
          workingDirectory: '/test/project',
          environment: {},
          systemInfo: {
            platform: 'darwin',
            architecture: 'arm64',
            availableMemory: 1000,
            diskSpace: 5000,
          },
        },
      };

      const context: ExecutionContext = {
        command: 'npm install express',
        workingDirectory: '/test/project',
        environment: {},
        systemInfo: {
          platform: 'darwin',
          architecture: 'arm64',
          availableMemory: 1000,
          diskSpace: 5000,
        },
      };

      const diagnosis = await errorDiagnosticService.analyzeError(
        executionError,
        context
      );

      expect(mockAIService.queryAI).toHaveBeenCalled();
      expect(diagnosis).toBeDefined();
      expect(diagnosis.category.primary).toBe('dependency');
      expect(diagnosis.severity.level).toBe('high');
    });
  });

  describe('Error Analysis Service Integration', () => {
    it('should use AI diagnostic service for error analysis', async () => {
      // Mock AI response
      mockAIService.queryAI.mockResolvedValue({
        content: JSON.stringify({
          analysis: {
            category: 'network',
            severity: 'medium',
            rootCause: 'Connection timeout',
            errorClassification: {
              primaryType: 'network',
              subTypes: ['timeout'],
              patterns: ['CONNECTION_TIMEOUT'],
              frequency: 'common',
              complexity: 'simple',
            },
            causality: {
              directCause: 'Network latency',
              contributingFactors: ['Server overload'],
              chainOfEvents: [],
              preventability: 'preventable',
            },
            impact: {
              immediate: ['Request failed'],
              shortTerm: ['Service unavailable'],
              longTerm: ['User frustration'],
              systemWide: false,
              userExperience: 'moderate',
              businessImpact: 'low',
            },
            recommendations: [
              {
                type: 'immediate_action',
                priority: 1,
                description: 'Retry request',
                rationale: 'Temporary network issue',
                estimatedEffort: 'minimal',
                expectedOutcome: 'Request success',
              },
            ],
            learning: {
              patternRecognition: ['network_error'],
              improvementOpportunities: ['retry_logic'],
              knowledgeGaps: [],
              systemWeaknesses: ['network_handling'],
              userEducation: ['error_handling'],
            },
          },
        }),
        model: 'gpt-4' as AIModel,
        metadata: {},
      });

      const step: ExecutionStep = {
        id: 'network-test',
        description: 'Making API request',
        command: 'curl https://api.example.com',
        expectedOutcome: 'API response received',
        risks: [],
        dependencies: [],
      };

      const analysis = await errorAnalysisService.analyzeError(
        'Connection timeout after 30 seconds',
        step,
        { environment: { NODE_ENV: 'production' } }
      );

      expect(analysis.category).toBe('network');
      expect(analysis.severity).toBe('medium');
      expect(analysis.description).toContain('Connection timeout');
    });

    it('should provide synchronous fallback for backward compatibility', () => {
      const step: ExecutionStep = {
        id: 'fallback-test',
        description: 'Testing fallback',
        command: 'test command',
        expectedOutcome: 'Success',
        risks: [],
        dependencies: [],
      };

      const analysis = errorAnalysisService.analyzeErrorSync(
        'Test error message',
        step
      );

      expect(analysis.category).toBe('unknown');
      expect(analysis.severity).toBe('medium');
      expect(analysis.description).toContain('Testing fallback');
      expect(analysis.possibleCauses).toContain(
        'Unknown cause - AI analysis unavailable'
      );
    });
  });

  describe('Interface Compliance', () => {
    it('should implement IErrorDiagnosticService interface', () => {
      expect(typeof errorDiagnosticService.analyzeError).toBe('function');
      expect(typeof errorDiagnosticService.generateRecoveryStrategies).toBe(
        'function'
      );
      expect(typeof errorDiagnosticService.learnFromErrorResolution).toBe(
        'function'
      );
      expect(typeof errorDiagnosticService.analyzeErrorPatterns).toBe(
        'function'
      );
      expect(typeof errorDiagnosticService.getPreventionSuggestions).toBe(
        'function'
      );
    });

    it('should support dependency injection patterns', () => {
      const customAIService = {
        queryAI: jest.fn(),
        initialize: jest.fn(),
        selectModel: jest.fn(),
        getAvailableModels: jest.fn(),
        isConfigured: jest.fn(),
        validateKeys: jest.fn(),
        getUsageStats: jest.fn(),
      };

      const customErrorDiagnostic = new AIErrorDiagnosticService(
        customAIService
      );
      const customErrorAnalysis = new ErrorAnalysisService(
        customErrorDiagnostic
      );

      expect(customErrorDiagnostic).toBeInstanceOf(AIErrorDiagnosticService);
      expect(customErrorAnalysis).toBeInstanceOf(ErrorAnalysisService);
    });
  });

  describe('Error Handling and Resilience', () => {
    it('should handle malformed AI responses gracefully', async () => {
      // Mock AI service to return invalid JSON
      mockAIService.queryAI.mockResolvedValue({
        content: 'invalid json response',
        model: 'gpt-4' as AIModel,
        metadata: {},
      });

      const executionError: ExecutionError = {
        message: 'Test error',
        timestamp: new Date(),
        step: {
          id: 'test-step',
          description: 'Test step',
          command: 'test command',
          expectedOutcome: 'Success',
          risks: [],
          dependencies: [],
        },
        context: {
          command: 'test command',
          workingDirectory: '/test',
          environment: {},
          systemInfo: {
            platform: 'darwin',
            architecture: 'arm64',
            availableMemory: 1000,
            diskSpace: 5000,
          },
        },
      };

      const context: ExecutionContext = {
        command: 'test command',
        workingDirectory: '/test',
        environment: {},
        systemInfo: {
          platform: 'darwin',
          architecture: 'arm64',
          availableMemory: 1000,
          diskSpace: 5000,
        },
      };

      const diagnosis = await errorDiagnosticService.analyzeError(
        executionError,
        context
      );

      // Should fallback to default diagnosis
      expect(diagnosis.rootCause).toBe('Error analysis unavailable');
      expect(diagnosis.category.primary).toBe('system');
    });

    it('should handle timeout and network errors', async () => {
      mockAIService.queryAI.mockRejectedValue(new Error('Request timeout'));

      const executionError: ExecutionError = {
        message: 'Network timeout',
        timestamp: new Date(),
        step: {
          id: 'timeout-test',
          description: 'Testing timeout handling',
          command: 'network command',
          expectedOutcome: 'Success',
          risks: [],
          dependencies: [],
        },
        context: {
          command: 'network command',
          workingDirectory: '/test',
          environment: {},
          systemInfo: {
            platform: 'darwin',
            architecture: 'arm64',
            availableMemory: 1000,
            diskSpace: 5000,
          },
        },
      };

      const context: ExecutionContext = {
        command: 'network command',
        workingDirectory: '/test',
        environment: {},
        systemInfo: {
          platform: 'darwin',
          architecture: 'arm64',
          availableMemory: 1000,
          diskSpace: 5000,
        },
      };

      // Should not throw, should return fallback
      const diagnosis = await errorDiagnosticService.analyzeError(
        executionError,
        context
      );
      expect(diagnosis).toBeDefined();
      expect(diagnosis.rootCause).toBe('Error analysis unavailable');
    });
  });
});
