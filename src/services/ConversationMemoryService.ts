import { IConversationMemory } from '../interfaces/IConversationMemory';
import { IMemoryPersistence } from '../interfaces/IMemoryPersistence';
import { ICachingService } from '../interfaces/ICachingService';
import { MemoryEntry, ContextInfo, AIModel } from '../types/index';

/**
 * Conversation Memory Service Implementation
 * SOLID SRP: Handles only conversation memory operations
 * SOLID DIP: Depends on IMemoryPersistence abstraction
 *
 * Enhanced with caching and performance monitoring for Week 3 optimizations
 */
export class ConversationMemoryService implements IConversationMemory {
  constructor(
    private persistence: IMemoryPersistence,
    private cacheService?: ICachingService
  ) {}

  async addConversation(
    query: string,
    response: string,
    context: ContextInfo,
    model?: AIModel | null
  ): Promise<void> {
    const memory = await this.persistence.loadMemory();

    const entry: MemoryEntry = {
      query,
      response,
      timestamp: new Date().toISOString(),
      context: context as unknown as Record<string, unknown>,
      semanticTags: this.extractSemanticTags(query, response),
      confidence: this.calculateConfidence(query, response, model),
    };

    memory.conversations.push(entry);

    // Keep only recent conversations to prevent memory bloat
    const maxConversations = 1000;
    if (memory.conversations.length > maxConversations) {
      memory.conversations = memory.conversations.slice(-maxConversations);
    }

    await this.persistence.saveMemory(memory);

    // Invalidate search cache when new conversation is added
    if (this.cacheService) {
      await this.cacheService.deletePattern('conversation:search:*');
      await this.cacheService.deletePattern('conversation:recent:*');
    }
  }

  async searchConversations(
    query: string,
    limit: number = 10
  ): Promise<MemoryEntry[]> {
    // Try cache first
    const cacheKey = `conversation:search:${query}:${limit}`;
    if (this.cacheService) {
      const cached = await this.cacheService.get<MemoryEntry[]>(cacheKey);
      if (cached) {
        return cached;
      }
    }

    const memory = await this.persistence.loadMemory();
    const queryLower = query.toLowerCase();
    const queryWords = queryLower
      .split(/\s+/)
      .filter((word) => word.length > 2);

    const results: Array<{ entry: MemoryEntry; score: number }> = [];

    for (const conversation of memory.conversations) {
      const score = this.calculateSemanticScore(queryWords, conversation);
      if (score > 0.1) {
        results.push({ entry: conversation, score });
      }
    }

    // Sort by relevance score
    results.sort((a, b) => b.score - a.score);
    const searchResults = results.slice(0, limit).map((result) => result.entry);

    // Cache the results
    if (this.cacheService) {
      await this.cacheService.set(cacheKey, searchResults, { ttl: 300000 }); // 5 minutes
    }

    return searchResults;
  }

  /**
   * Gets recentconversations
   * 
   * @param limit - Parameter description
   * 
   * @returns Promise<MemoryEntry[]> - Return value description
   */
  async getRecentConversations(limit: number = 10): Promise<MemoryEntry[]> {
    // Try cache first
    const cacheKey = `conversation:recent:${limit}`;
    if (this.cacheService) {
      const cached = await this.cacheService.get<MemoryEntry[]>(cacheKey);
      if (cached) {
        return cached;
      }
    }

    const memory = await this.persistence.loadMemory();
    const recentConversations = memory.conversations.slice(-limit);

    // Cache the results
    if (this.cacheService) {
      await this.cacheService.set(cacheKey, recentConversations, {
        ttl: 60000,
      }); // 1 minute
    }

    return recentConversations;
  }

  /**
   * Handles extractSemanticTags operation
   * 
   * @param query - Parameter description
   * @param response - Parameter description
   * 
   * @returns string[] - Return value description
   */
  private extractSemanticTags(query: string, response: string): string[] {
    // Extract meaningful keywords from query and response
    const text = `${query} ${response}`.toLowerCase();
    const words = text
      .split(/\s+/)
      .filter(
        (word) =>
          word.length > 3 &&
          ![
            'this',
            'that',
            'with',
            'from',
            'they',
            'have',
            'will',
            'been',
            'said',
          ].includes(word)
      );

    return [...new Set(words)].slice(0, 10);
  }

  private calculateConfidence(
    query: string,
    response: string,
    model?: AIModel | null
  ): number {
    let confidence = 0.5;

    if (response.length > 100) confidence += 0.2;
    if (response.length > 500) confidence += 0.2;

    if (
      response.includes('```') ||
      response.includes('function') ||
      response.includes('class')
    ) {
      confidence += 0.1;
    }

    return Math.min(confidence, 1.0);
  }

  private calculateSemanticScore(
    queryWords: string[],
    conversation: MemoryEntry
  ): number {
    const conversationText =
      `${conversation.query} ${conversation.response}`.toLowerCase();
    const conversationWords = conversationText.split(/\s+/);

    let score = 0;
    for (const queryWord of queryWords) {
      if (conversationText.includes(queryWord)) {
        score += 1;
      }
    }

    return queryWords.length > 0 ? score / queryWords.length : 0;
  }
}
