Creating a comprehensive test suite for the `ConversationMemoryService` requires careful consideration of different scenarios such as success, error handling, and dependency interactions. Below is an example of how you can achieve this using Jest, adhering to the patterns and practices outlined:

```typescript
// tests/services/ConversationMemoryService.test.ts
import { ConversationMemoryService } from '../../src/services/ConversationMemoryService';
import { IConversationMemory } from '../../src/interfaces/IConversationMemory';
import { IMemoryPersistence } from '../../src/interfaces/IMemoryPersistence';
import { ICachingService } from '../../src/interfaces/ICachingService';
import { MemoryEntry, ContextInfo, AIModel } from '../../src/types/index';

// Import the mock utilities
import '../../tests/__mocks__/IMemoryPersistence';
import '../../tests/__mocks__/ICachingService';

// Jest mock functions
jest.mock('../../src/interfaces/IMemoryPersistence');
jest.mock('../../src/interfaces/ICachingService');

describe('ConversationMemoryService', () => {
  let persistenceMock: jest.Mocked<IMemoryPersistence>;
  let cacheServiceMock: jest.Mocked<ICachingService>;
  let conversationMemoryService: IConversationMemory;

  beforeEach(() => {
    // Setup mock dependencies
    persistenceMock = new (jest.requireMock('../../src/interfaces/IMemoryPersistence'))();
    cacheServiceMock = new (jest.requireMock('../../src/interfaces/ICachingService'))();
  
    // Instantiate service with mocks
    conversationMemoryService = new ConversationMemoryService(persistenceMock, cacheServiceMock);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('addConversation', () => {
    it('should add a conversation successfully and invalidate cache', async () => {
      const query = 'What is the weather today?';
      const response = 'The weather is sunny';
      const context: ContextInfo = { location: 'New York' };
      
      const memory = { conversations: [] };
      persistenceMock.loadMemory.mockResolvedValue(memory);
      persistenceMock.saveMemory.mockResolvedValue();

      await conversationMemoryService.addConversation(query, response, context);

      expect(persistenceMock.loadMemory).toHaveBeenCalled();
      expect(persistenceMock.saveMemory).toHaveBeenCalledWith(expect.objectContaining({
        conversations: expect.any(Array)
      }));
      expect(cacheServiceMock.deletePattern).toHaveBeenNthCalledWith(1, 'conversation:search:*');
      expect(cacheServiceMock.deletePattern).toHaveBeenNthCalledWith(2, 'conversation:recent:*');
    });

    it('should handle errors from persistence layer', async () => {
      persistenceMock.loadMemory.mockRejectedValue(new Error('Load memory failed'));

      await expect(
        conversationMemoryService.addConversation('query', 'response', { userId: '123' })
      ).rejects.toThrow('Load memory failed');
    });
  });

  describe('searchConversations', () => {
    it('should return cached results if available', async () => {
      const cachedResults: MemoryEntry[] = [{
        query: 'Cached query',
        response: 'Cached response',
        timestamp: new Date().toISOString(),
        context: { userId: 'cached' },
        semanticTags: [],
        confidence: 1,
      }];
      
      cacheServiceMock.get.mockResolvedValue(cachedResults);

      const results = await conversationMemoryService.searchConversations('Cached query', 10);
      
      expect(results).toEqual(cachedResults);
      expect(cacheServiceMock.get).toHaveBeenCalled();
      expect(persistenceMock.loadMemory).not.toHaveBeenCalled();
    });

    it('should handle cache miss and perform memory search', async () => {
      cacheServiceMock.get.mockResolvedValue(null);

      const memory: { conversations: MemoryEntry[] } = {
        conversations: [{
          query: 'Example query',
          response: 'Example response',
          timestamp: new Date().toISOString(),
