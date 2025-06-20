import {
  MemoryEntry,
  CommandHistoryEntry,
  ContextInfo,
  AIModel,
} from '../types/index';

/**
 * Memory Service Interface
 * Defines the contract for persistent memory operations and data management
 */
export interface IMemoryService {
  /**
   * Initialize the memory service and load existing data
   */
  initialize(): Promise<{
    conversations: MemoryEntry[];
    commands: CommandHistoryEntry[];
    preferences: Record<string, unknown>;
    workingDirectories: Record<string, Record<string, unknown>>;
  }>;

  /**
   * Load memory from persistent storage
   */
  loadMemory(): Promise<{
    conversations: MemoryEntry[];
    commands: CommandHistoryEntry[];
    preferences: Record<string, unknown>;
    workingDirectories: Record<string, Record<string, unknown>>;
  }>;

  /**
   * Save current memory state to persistent storage
   */
  saveMemory(
    memory?: {
      conversations: MemoryEntry[];
      commands: CommandHistoryEntry[];
      preferences: Record<string, unknown>;
      workingDirectories: Record<string, Record<string, unknown>>;
    } | null
  ): Promise<void>;

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
   * Add a command to memory
   */
  addCommand(
    command: string,
    workingDirectory: string,
    exitCode: number,
    duration: number
  ): Promise<void>;

  /**
   * Search conversations using semantic search
   */
  searchConversations(query: string, limit?: number): Promise<MemoryEntry[]>;

  /**
   * Search command history
   */
  searchCommands(query: string, limit?: number): Promise<CommandHistoryEntry[]>;

  /**
   * Get memory statistics
   */
  getStats(): Promise<{
    totalConversations: number;
    totalCommands: number;
    memorySize: number;
    oldestEntry: string;
    newestEntry: string;
  }>;

  /**
   * Clear all memory
   */
  clearMemory(): Promise<void>;

  /**
   * Export memory to file
   */
  exportMemory(path: string): Promise<void>;

  /**
   * Import memory from file
   */
  importMemory(path: string): Promise<void>;

  /**
   * Compress memory by removing old entries
   */
  compressMemory(): Promise<void>;

  /**
   * Get recent conversations
   */
  getRecentConversations(limit?: number): Promise<MemoryEntry[]>;

  /**
   * Get recent commands
   */
  getRecentCommands(limit?: number): Promise<CommandHistoryEntry[]>;

  /**
   * Get agentic execution history
   */
  getAgenticHistory(goal?: string): Promise<any[]>;

  /**
   * Store agentic execution result
   */
  storeAgenticExecution(execution: any): Promise<void>;

  /**
   * Update user preferences
   */
  updatePreferences(preferences: Record<string, unknown>): Promise<void>;

  /**
   * Get user preferences
   */
  getPreferences(): Promise<Record<string, unknown>>;

  /**
   * Semantic search across memory
   */
  searchMemory(
    query: string,
    limit?: number,
    type?: 'conversation' | 'command'
  ): Promise<
    Array<{
      type: 'conversation' | 'command';
      content: MemoryEntry | CommandHistoryEntry;
      relevance: number;
    }>
  >;
}
