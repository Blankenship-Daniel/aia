Here is a comprehensive Jest test suite for the `ErrorAnalysisService` class, which aligns with the guidelines and project setup you described:

```typescript
import { ErrorAnalysisService } from '../../src/services/ErrorAnalysisService';
import { IErrorDiagnosticService } from '../../src/interfaces/IErrorDiagnosticService';
import { ExecutionStep } from '../../src/types';
import { ErrorDiagnosis } from '../../src/interfaces/IErrorDiagnosticService';

// Mock dependencies
jest.mock('../../src/interfaces/IErrorDiagnosticService');

describe('ErrorAnalysisService', () => {
  let errorDiagnosticService: jest.Mocked<IErrorDiagnosticService>;
  let errorAnalysisService: ErrorAnalysisService;

  const mockStep: ExecutionStep = {
    id: 'test-step',
    description: 'Test execution step',
    command: 'test-command',
  };

  beforeEach(() => {
    errorDiagnosticService = new (IErrorDiagnosticService as any)();
    errorAnalysisService = new ErrorAnalysisService(errorDiagnosticService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('analyzeError', () => {
    it('should return a valid ErrorAnalysis on successful AI analysis', async () => {
      const mockError = 'Test error';
      const mockAiDiagnosis: ErrorDiagnosis = {
        category: { primary: 'system' },
        severity: { level: 'high' },
        rootCause: 'Simulated root cause',
        analysis: {
          causality: {
            directCause: 'Direct cause example',
            contributingFactors: ['Factor A', 'Factor B'],
          },
          recommendations: [
            { type: 'immediate_action', description: 'Immediate action' },
            { type: 'prevention', description: 'Prevention tip' },
            { type: 'investigation', description: 'Investigation strategy' },
          ],
        },
        similarCases: [
          {
            resolution: {
              steps: [{ command: 'https://related-documentation.com' }],
            },
          },
        ],
      };

      errorDiagnosticService.analyzeError.mockResolvedValue(mockAiDiagnosis);

      const result = await errorAnalysisService.analyzeError(
        mockError,
        mockStep
      );

      expect(result).toEqual({
        category: 'system',
        severity: 'high',
        description: 'Simulated root cause',
        possibleCauses: ['Direct cause example', 'Factor A', 'Factor B'],
        suggestedFixes: ['Immediate action'],
        recoveryStrategies: ['Investigation strategy'],
        preventionTips: ['Prevention tip'],
        relatedDocs: ['https://related-documentation.com'],
      });
    });

    it('should return fallback analysis if AI analysis fails', async () => {
      const mockError = 'Test error';
      const aiError = new Error('AI service failure');

      errorDiagnosticService.analyzeError.mockRejectedValue(aiError);

      const result = await errorAnalysisService.analyzeError(
        mockError,
        mockStep
      );

      expect(result).toEqual({
        category: 'unknown',
        severity: 'medium',
        description: `Error in step "Test execution step": Test error`,
        possibleCauses: ['Unknown cause - AI analysis unavailable'],
        suggestedFixes: ['Retry the operation', 'Check system logs'],
        recoveryStrategies: ['Manual intervention required'],
        preventionTips: ['Monitor system health'],
        relatedDocs: [],
      });
    });
  });

  describe('analyzeErrorSync', () => {
    it('should return a fallback analysis', () => {
      const mockError = 'Test error';

      const result = errorAnalysisService.analyzeErrorSync(
        mockError,
        mockStep
      );

      expect(result).toEqual({
        category: 'unknown',
        severity: 'medium',
        description: `Error in step "Test execution step": Test error`,
        possibleCauses: ['Unknown cause - AI analysis unavailable