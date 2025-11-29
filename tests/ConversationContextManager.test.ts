To create comprehensive tests for the `ConversationContextManager` using Jest, we will mock the external dependencies, use `describe` and `it` blocks for organizing tests, and ensure both success and error scenarios are covered. We'll utilize TypeScript and include type assertions where necessary. Here's how you can approach creating these tests:

```typescript
import { ConversationContextManager } from '../src/ConversationContextManager';
// Mock utilities and dependencies
import { mockAia, mockCoreferenceResolutionService } from '../tests/__mocks__';

jest.mock('chalk', () => ({
  Chalk: jest.fn().mockImplementation(() => ({
    blue: jest.fn(),
  })),
}));

describe('ConversationContextManager', () => {
  let contextManager: ConversationContextManager;

  beforeEach(() => {
    const aia = mockAia();
    const coreferenceService = mockCoreferenceResolutionService();
    contextManager = new ConversationContextManager(aia, coreferenceService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('processInContext()', () => {
    it('should process user input with context and return processed input', async () => {
      const sessionId = 'test-session';
      const userInput = 'tell me about the project';
      const result = await contextManager.processInContext(userInput, sessionId);

      expect(result.originalInput).toBe(userInput);
      expect(result.contextualInput).toBeDefined();
      expect(result.resolvedReferences).toBeDefined();
      expect(result.topicContinuity).toBeDefined();
      expect(result.conversationState).toEqual(
        expect.objectContaining({
          sessionId,
          historyLength: expect.any(Number),
          currentTopic: expect.any(Object),
          activeContextCount: expect.any(Number),
          lastActivity: expect.any(String),
        })
      );
      expect(result.suggestedClarifications).toBeInstanceOf(Array);
    });

    it('should handle errors during processing gracefully', async () => {
      jest.spyOn(contextManager, 'enrichInputWithContext').mockRejectedValue(new Error('Error in enrichment'));
      
      await expect(
        contextManager.processInContext('some input', 'test-session')
      ).rejects.toThrow('Error in enrichment');
    });
  });

  describe('addExchange()', () => {
    it('should add a conversation exchange to history', () => {
      const sessionId = 'test-session';
      const userInput = 'What is the status of the code review?';
      const aiResponse = 'The code review is in progress.';
      contextManager.addExchange(sessionId, userInput, aiResponse);

      const history = contextManager.getConversationSummary(sessionId).exchangeCount;
      expect(history).toBe(1);
    });
  });

  describe('clearHistory()', () => {
    it('should clear the conversation history of a session', () => {
      const sessionId = 'test-session';
      contextManager.clearHistory(sessionId);

      const summary = contextManager.getConversationSummary(sessionId);
      expect(summary.exchangeCount).toBe(0);
      expect(summary.topics).toEqual([]);
    });
  });

  describe('getConversationSummary()', () => {
    it('should return a summary of the conversation session', () => {
      const sessionId = 'test-session';
      const userInput = 'Give me an update on the project';
      const aiResponse = 'The project update has been emailed.';
      contextManager.addExchange(sessionId, userInput, aiResponse);

      const summary = contextManager.getConversationSummary(sessionId);
      expect(summary.exchangeCount).toBeGreaterThan(0);
      expect(summary.topics.length).toBeGreaterThan(0);
      expect(summary.duration).toMatch(/minutes/);
    });
  });
});
```

### Key Points:
1. **Mocking External Dependencies**: We mock any external dependencies like `Chalk` and core