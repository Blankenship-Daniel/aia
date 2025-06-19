import { MemoryEntry, ContextInfo, AIModel } from '../types/index';

/**
 * Conversation Memory Interface
 * SOLID SRP: Focused solely on conversation memory operations
 * SOLID ISP: Small, focused interface for conversation-specific operations
 */
export interface IConversationMemory {
  /**
   * Add a conversation to memory
   */
  addConversation(
    query: string,
    response: string,
    context: ContextInfo,
    model?: AIModel | null
  ): Promise<void>;

  /**
   * Search conversations using semantic search
   */
  searchConversations(query: string, limit?: number): Promise<MemoryEntry[]>;

  /**
   * Get recent conversations
   */
  getRecentConversations(limit?: number): Promise<MemoryEntry[]>;
}
