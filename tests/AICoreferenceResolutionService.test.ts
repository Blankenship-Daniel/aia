Here's a comprehensive set of Jest tests for the `AICoreferenceResolutionService` class, designed to follow your project's testing conventions, including using mocks, testing both success and error scenarios, and adhering to TypeScript best practices.

```typescript
// tests/services/AICoreferenceResolutionService.test.ts

import { AICoreferenceResolutionService } from '../../src/services/AICoreferenceResolutionService';
import {
  mockAIService,
  mockContextService,
} from '../__mocks__/services';
import { IAIService } from '../../src/interfaces/IAIService';
import { IContextService } from '../../src/interfaces/IContextService';
import { CoreferenceResolutionResult, EntityExtractionResult, AmbiguityAnalysis } from '../../src/interfaces/ICoreferenceResolutionService';

describe('AICoreferenceResolutionService', () => {
  let aiService: IAIService;
  let contextService: IContextService;
  let service: AICoreferenceResolutionService;

  beforeEach(() => {
    aiService = mockAIService();
    contextService = mockContextService();
    service = new AICoreferenceResolutionService(aiService, contextService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('resolveReferences', () => {
    it('should resolve references successfully with a valid AI response', async () => {
      const input = 'He fixed it';
      const conversationHistory = [];
      const aiResponseMock = {
        content: JSON.stringify({
          references: [
            {
              text: 'it',
              type: 'pronoun',
              span: { start: 10, end: 12 },
              resolvedText: 'the bug',
              antecedent: {
                text: 'bug',
                type: 'entity',
                source: 'previous_turn',
                confidence: 0.9,
              },
              confidence: 0.85,
              reasoning: 'The pronoun refers to the bug.',
            },
          ],
        }),
      };

      // Mock AI service calls
      jest.spyOn(aiService, 'queryAI').mockResolvedValueOnce(aiResponseMock);

      const result: CoreferenceResolutionResult = await service.resolveReferences(input, conversationHistory);

      expect(aiService.queryAI).toHaveBeenCalled();
      expect(result.resolvedInput).toBe('He fixed the bug');
      expect(result.resolutions.length).toBe(1);
      expect(result.resolutions[0].resolvedText).toBe('the bug');
    });

    it('should return a fallback resolution on error', async () => {
      const input = 'Check this';
      const conversationHistory = [];

      jest.spyOn(aiService, 'queryAI').mockRejectedValueOnce(new Error('AI service failure'));

      const result: CoreferenceResolutionResult = await service.resolveReferences(input, conversationHistory);

      expect(result.originalInput).toBe(input);
      expect(result.resolvedInput).toBe(input);
      expect(result.confidence).toBe(0.5);
    });
  });

  describe('extractEntities', () => {
    it('should extract entities successfully with a valid AI response', async () => {
      const text = 'Open package.json';
      const aiResponseMock = {
        content: JSON.stringify({
          entities: [
            {
              text: 'package.json',
              type: 'file',
              span: { start: 5, end: 17 },
              confidence: 0.98,
            },
          ],
        }),
      };

      jest.spyOn(aiService, 'queryAI').mockResolvedValueOnce(aiResponseMock);

      const result: EntityExtractionResult = await service.extractEntities(text);

      expect(aiService.queryAI).toHaveBeenCalled();
      expect(result.entities.length).toBe(1);
      expect(result.entities[0].text).toBe('package.json');
    });

    it('should return empty entities on error', async