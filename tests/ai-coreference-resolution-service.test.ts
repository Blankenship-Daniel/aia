/**
 * AI Coreference Resolution Service Tests
 *
 * Tests for Phase 2.1.2: AI-powered coreference resolution replacing pattern-based logic
 */

import { AICoreferenceResolutionService } from '../src/services/AICoreferenceResolutionService';
import {
  ICoreferenceResolutionService,
  ConversationExchange,
} from '../src/interfaces/ICoreferenceResolutionService';

describe('AICoreferenceResolutionService', () => {
  let service: ICoreferenceResolutionService;
  let mockAIService: any;
  let mockConversationMemory: any;

  beforeEach(() => {
    mockAIService = {
      queryAI: jest.fn().mockResolvedValue({
        content: 'Mock AI response',
        model: 'gpt-4',
        metadata: {},
      }),
      getModel: jest.fn().mockReturnValue('gpt-4'),
    };

    mockConversationMemory = {
      addEntry: jest.fn(),
      getHistory: jest.fn().mockReturnValue([]),
      clear: jest.fn(),
    };

    service = new AICoreferenceResolutionService(
      mockAIService,
      mockConversationMemory
    );
  });

  describe('Reference Resolution', () => {
    it('should resolve pronouns using AI analysis', async () => {
      const input = 'Fix it please';
      const conversationHistory: ConversationExchange[] = [
        {
          userInput: 'I have a bug in my code',
          aiResponse:
            'I can help you fix the syntax error in your JavaScript function.',
          timestamp: new Date().toISOString(),
        },
      ];

      mockAIService.queryAI.mockResolvedValue({
        content: JSON.stringify({
          references: [
            {
              text: 'it',
              type: 'pronoun',
              span: { start: 4, end: 6 },
              resolvedText: 'the syntax error',
              antecedent: {
                text: 'syntax error',
                type: 'entity',
                source: 'previous_turn',
                confidence: 0.8,
              },
              confidence: 0.85,
              reasoning:
                'Pronoun "it" refers to "syntax error" mentioned in previous exchange',
            },
          ],
          confidence: 0.85,
        }),
        model: 'gpt-4',
        metadata: {},
      });

      const result = await service.resolveReferences(
        input,
        conversationHistory
      );

      expect(result.originalInput).toBe(input);
      expect(result.resolvedInput).toBe('Fix the syntax error please');
      expect(result.resolutions).toHaveLength(1);
      expect(result.resolutions[0].resolvedText).toBe('the syntax error');
      expect(result.confidence).toBe(0.85);
    });

    it('should handle demonstrative references', async () => {
      const input = 'How do I optimize this?';
      const conversationHistory: ConversationExchange[] = [
        {
          userInput: 'My app is running slowly',
          aiResponse:
            'The performance issue might be due to inefficient database queries.',
          timestamp: new Date().toISOString(),
        },
      ];

      mockAIService.queryAI.mockResolvedValue({
        content: JSON.stringify({
          references: [
            {
              text: 'this',
              type: 'demonstrative',
              span: { start: 18, end: 22 }, // "this" is at positions 18-21, end is exclusive
              resolvedText: 'database queries',
              antecedent: {
                text: 'database queries',
                type: 'concept',
                source: 'previous_turn',
                confidence: 0.9,
              },
              confidence: 0.8,
              reasoning:
                'Demonstrative "this" refers to database queries mentioned as performance issue',
            },
          ],
          confidence: 0.8,
        }),
        model: 'gpt-4',
        metadata: {},
      });

      const result = await service.resolveReferences(
        input,
        conversationHistory
      );

      expect(result.resolvedInput).toBe('How do I optimize database queries?');
      expect(result.resolutions[0].originalReference.type).toBe(
        'demonstrative'
      );
    });
  });

  describe('Entity Extraction', () => {
    it('should extract entities using AI analysis', async () => {
      const input =
        'The React component in UserProfile.tsx is not rendering correctly';

      mockAIService.queryAI.mockResolvedValue({
        content: JSON.stringify({
          entities: [
            {
              text: 'React component',
              type: 'technology',
              span: { start: 4, end: 18 },
              properties: { framework: 'React' },
              confidence: 0.95,
            },
            {
              text: 'UserProfile.tsx',
              type: 'file',
              span: { start: 22, end: 37 },
              properties: { extension: 'tsx', fileType: 'TypeScript React' },
              confidence: 0.9,
            },
          ],
          relationships: [
            {
              entity1: 'React component',
              entity2: 'UserProfile.tsx',
              relationshipType: 'located_in',
              confidence: 0.85,
              evidence: 'Component is located in the specified file',
            },
          ],
          confidence: 0.9,
        }),
        model: 'gpt-4',
        metadata: {},
      });

      const result = await service.extractEntities(input);

      expect(result.entities).toHaveLength(2);
      expect(result.entities[0].text).toBe('React component');
      expect(result.entities[0].type).toBe('technology');
      expect(result.entities[1].text).toBe('UserProfile.tsx');
      expect(result.entities[1].type).toBe('file');
      expect(result.relationships).toHaveLength(1);
      expect(result.relationships[0].relationshipType).toBe('located_in');
    });
  });

  describe('Ambiguity Detection', () => {
    it('should detect ambiguous references', async () => {
      const input = 'Can you update them?';

      // Reset mock and set up specific mock for detectAmbiguity call
      mockAIService.queryAI.mockReset();
      mockAIService.queryAI.mockResolvedValueOnce({
        content: JSON.stringify({
          ambiguityLevel: 'high', // Fixed property name
          ambiguousReferences: [
            {
              text: 'them',
              possibleAntecedents: [
                {
                  text: 'dependencies',
                  type: 'entity',
                  source: 'conversation_history',
                  salience: 0.6,
                },
                {
                  text: 'files',
                  type: 'entity',
                  source: 'conversation_history',
                  salience: 0.5,
                },
              ],
              ambiguityType: 'multiple_candidates',
              clarificationNeeded: true,
            },
          ],
          clarificationSuggestions: [
            'Which items would you like me to update - the dependencies or the files?',
          ],
          confidence: 0.3,
        }),
        model: 'gpt-4',
        metadata: {},
      });

      const result = await service.detectAmbiguity(input, []);

      expect(result.level).toBe('high');
      expect(result.ambiguousReferences).toHaveLength(1);
      expect(result.ambiguousReferences[0].text).toBe('them');
      expect(result.ambiguousReferences[0].possibleAntecedents).toHaveLength(2);
      expect(result.clarificationSuggestions).toHaveLength(1);
      expect(result.confidence).toBe(0.3);
    });
  });

  describe('Conversation Context Analysis', () => {
    it('should analyze conversation context', async () => {
      const conversationHistory: ConversationExchange[] = [
        {
          userInput: 'I need help with my TypeScript project',
          aiResponse:
            'I can help you with TypeScript. What specific issue are you facing?',
          timestamp: new Date().toISOString(),
        },
        {
          userInput: 'The build is failing',
          aiResponse: 'Let me help you debug the build errors.',
          timestamp: new Date().toISOString(),
        },
      ];

      const result = await service.analyzeConversationContext(
        conversationHistory
      );

      expect(result.exchanges).toHaveLength(2);
      expect(result.activeEntities).toBeDefined();
      expect(result.discourse).toBeDefined();
      expect(result.discourse.conversationFlow.currentPhase).toBe(
        'introduction'
      );
      expect(
        result.discourse.conversationFlow.coherence
      ).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Integration', () => {
    it('should handle end-to-end coreference resolution workflow', async () => {
      const input = 'Can you help me fix it?';
      const conversationHistory: ConversationExchange[] = [
        {
          userInput: 'My API endpoint is returning 500 errors',
          aiResponse:
            'I can help you debug the server error in your API endpoint.',
          timestamp: new Date().toISOString(),
        },
      ];

      // Mock the AI response for reference resolution
      mockAIService.queryAI.mockResolvedValue({
        content: JSON.stringify({
          references: [
            {
              text: 'it',
              type: 'pronoun',
              span: { start: 20, end: 22 }, // "it" is at positions 20-21, end is exclusive
              resolvedText: 'the server error',
              antecedent: {
                text: 'server error',
                type: 'entity',
                source: 'previous_turn',
                confidence: 0.9,
              },
              confidence: 0.85,
              reasoning:
                'Pronoun "it" refers to the server error mentioned in the previous exchange',
            },
          ],
          confidence: 0.85,
        }),
        model: 'gpt-4',
        metadata: {},
      });

      const result = await service.resolveReferences(
        input,
        conversationHistory
      );

      expect(result.originalInput).toBe(input);
      expect(result.resolvedInput).toBe(
        'Can you help me fix the server error?'
      );
      expect(result.resolutions).toHaveLength(1);
      expect(result.coreferenceChains).toBeDefined(); // Just check it exists
      expect(result.confidence).toBe(0.85);

      // Verify the AI service was called with appropriate prompts
      expect(mockAIService.queryAI).toHaveBeenCalled();
      const callArgs = mockAIService.queryAI.mock.calls[0][0];
      expect(callArgs).toContain('coreference resolution');
      expect(callArgs).toContain(input);
    });
  });

  describe('Error Handling', () => {
    it('should handle AI service errors gracefully', async () => {
      const input = 'Fix this issue';
      const conversationHistory: ConversationExchange[] = [];

      mockAIService.queryAI.mockRejectedValue(
        new Error('AI service unavailable')
      );

      const result = await service.resolveReferences(
        input,
        conversationHistory
      );

      // Should return fallback result when AI fails
      expect(result.originalInput).toBe(input);
      expect(result.resolvedInput).toBe(input); // No resolution applied
      expect(result.resolutions).toHaveLength(0);
      expect(result.confidence).toBeLessThan(1.0);
    });

    it('should handle malformed AI responses', async () => {
      const input = 'Update them';

      mockAIService.queryAI.mockResolvedValue({
        content: 'Invalid JSON response',
        model: 'gpt-4',
        metadata: {},
      });

      const result = await service.resolveReferences(input, []);

      expect(result.originalInput).toBe(input);
      expect(result.resolvedInput).toBe(input);
      expect(result.resolutions).toHaveLength(0);
    });
  });
});
