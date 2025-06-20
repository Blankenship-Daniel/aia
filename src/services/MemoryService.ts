import { IMemoryService } from '../interfaces/IMemoryService';
import { IConfigurationService } from '../interfaces/IConfigurationService';
import {
  MemoryData,
  MemoryEntry,
  CommandHistoryEntry,
  ContextInfo,
  SearchResult,
  AIModel,
} from '../types/index';
import * as fs from 'fs-extra';
import * as path from 'path';
import * as os from 'os';

/**
 * Memory Service Implementation
 * Manages persistent memory operations and data storage
 */
export class MemoryService implements IMemoryService {
  private memory: MemoryData;
  private memoryPath: string;
  private semanticIndex: Map<string, number>;
  private initialized: boolean;

  constructor(private configService: IConfigurationService) {
    this.memory = this.getDefaultMemory();
    this.memoryPath = path.join(os.homedir(), '.aia', 'memory.json');
    this.semanticIndex = new Map();
    this.initialized = false;
  }

  /**
   * Initialize the memory service and load existing data
   */
  async initialize(): Promise<{
    conversations: MemoryEntry[];
    commands: CommandHistoryEntry[];
    preferences: Record<string, unknown>;
    workingDirectories: Record<string, Record<string, unknown>>;
  }> {
    if (this.initialized) {
      return {
        conversations: this.memory.conversations,
        commands: this.memory.commands,
        preferences: this.memory.preferences,
        workingDirectories: this.memory.workingDirectories,
      };
    }

    try {
      await fs.ensureDir(path.dirname(this.memoryPath));
      await this.loadMemoryData();
      await this.buildSemanticIndex();
      this.initialized = true;

      return {
        conversations: this.memory.conversations,
        commands: this.memory.commands,
        preferences: this.memory.preferences,
        workingDirectories: this.memory.workingDirectories,
      };
    } catch (error) {
      console.error(
        'Failed to initialize memory service:',
        (error as Error).message
      );
      this.memory = this.getDefaultMemory();
      this.initialized = true;

      return {
        conversations: this.memory.conversations,
        commands: this.memory.commands,
        preferences: this.memory.preferences,
        workingDirectories: this.memory.workingDirectories,
      };
    }
  }

  /**
   * Load memory from persistent storage
   */
  async loadMemory(): Promise<{
    conversations: MemoryEntry[];
    commands: CommandHistoryEntry[];
    preferences: Record<string, unknown>;
    workingDirectories: Record<string, Record<string, unknown>>;
  }> {
    await this.loadMemoryData();

    return {
      conversations: this.memory.conversations,
      commands: this.memory.commands,
      preferences: this.memory.preferences,
      workingDirectories: this.memory.workingDirectories as Record<
        string,
        Record<string, unknown>
      >,
    };
  }

  /**
   * Load memory data into this.memory
   */
  private async loadMemoryData(): Promise<void> {
    try {
      if (await fs.pathExists(this.memoryPath)) {
        const data = (await fs.readJson(this.memoryPath)) as MemoryData;

        // Validate and merge with defaults
        const defaultMemory = this.getDefaultMemory();
        const validatedMemory: MemoryData = {
          conversations: Array.isArray(data.conversations)
            ? data.conversations
            : defaultMemory.conversations,
          commands: Array.isArray(data.commands)
            ? data.commands
            : defaultMemory.commands,
          preferences:
            data.preferences && typeof data.preferences === 'object'
              ? data.preferences
              : defaultMemory.preferences,
          workingDirectories:
            data.workingDirectories &&
            typeof data.workingDirectories === 'object'
              ? data.workingDirectories
              : defaultMemory.workingDirectories,
          semanticIndex:
            data.semanticIndex && typeof data.semanticIndex === 'object'
              ? data.semanticIndex
              : defaultMemory.semanticIndex,
          agenticHistory: Array.isArray(data.agenticHistory)
            ? data.agenticHistory
            : defaultMemory.agenticHistory,
        };

        this.memory = validatedMemory;
      }

      const defaultMemory = this.getDefaultMemory();
      this.memory = defaultMemory;
    } catch (error) {
      console.warn(
        'Failed to load memory, using defaults:',
        (error as Error).message
      );
      const defaultMemory = this.getDefaultMemory();
      this.memory = defaultMemory;
    }
  }

  /**
   * Save current memory state to persistent storage
   */
  async saveMemory(
    memory?: {
      conversations: MemoryEntry[];
      commands: CommandHistoryEntry[];
      preferences: Record<string, unknown>;
      workingDirectories: Record<string, Record<string, unknown>>;
    } | null
  ): Promise<void> {
    try {
      const memoryToSave = memory
        ? {
            ...this.memory,
            conversations: memory.conversations,
            commands: memory.commands,
            preferences: memory.preferences,
            workingDirectories: memory.workingDirectories,
          }
        : this.memory;

      await fs.writeJson(this.memoryPath, memoryToSave, { spaces: 2 });

      if (memory) {
        this.memory = memoryToSave;
      }
    } catch (error) {
      throw new Error(`Failed to save memory: ${(error as Error).message}`);
    }
  }

  /**
   * Add a conversation to memory
   */
  async addConversation(
    query: string,
    response: string,
    context: ContextInfo,
    model?: AIModel | null
  ): Promise<void> {
    const entry: MemoryEntry = {
      query,
      response,
      timestamp: new Date().toISOString(),
      context: context as unknown as Record<string, unknown>,
      semanticTags: this.extractSemanticTags(query, response),
      confidence: this.calculateConfidence(query, response, model),
    };

    this.memory.conversations.push(entry);

    // Keep only recent conversations to prevent memory bloat
    const maxConversations = 1000;
    if (this.memory.conversations.length > maxConversations) {
      this.memory.conversations = this.memory.conversations.slice(
        -maxConversations
      );
    }

    await this.saveMemory();
    await this.updateSemanticIndex();
  }

  /**
   * Add a command to memory
   */
  async addCommand(
    command: string,
    workingDirectory: string,
    exitCode: number,
    duration: number
  ): Promise<void> {
    const entry: CommandHistoryEntry = {
      command,
      timestamp: new Date().toISOString(),
      workingDirectory,
      exitCode,
      duration,
      optimized: false, // Will be set by command optimization system
    };

    this.memory.commands.push(entry);

    // Keep only recent commands
    const maxCommands = 500;
    if (this.memory.commands.length > maxCommands) {
      this.memory.commands = this.memory.commands.slice(-maxCommands);
    }

    await this.saveMemory();
  }

  /**
   * Search conversations using semantic search
   */
  async searchConversations(
    query: string,
    limit: number = 10
  ): Promise<MemoryEntry[]> {
    const queryWords = this.tokenize(query.toLowerCase());
    const results: Array<{ entry: MemoryEntry; score: number }> = [];

    for (const conversation of this.memory.conversations) {
      const score = this.calculateSemanticScore(queryWords, conversation);
      if (score > 0.1) {
        // Minimum relevance threshold
        results.push({ entry: conversation, score });
      }
    }

    // Sort by relevance score
    results.sort((a, b) => b.score - a.score);
    return results.slice(0, limit).map((result) => result.entry);
  }

  /**
   * Search command history
   */
  async searchCommands(
    query: string,
    limit: number = 10
  ): Promise<CommandHistoryEntry[]> {
    const queryLower = query.toLowerCase();
    const results: Array<{ entry: CommandHistoryEntry; score: number }> = [];

    for (const command of this.memory.commands) {
      let score = 0;

      // Exact match gets highest score
      if (command.command.toLowerCase().includes(queryLower)) {
        score = 1.0;
      }
      // Partial word matches
      else {
        const commandWords = command.command.toLowerCase().split(/\s+/);
        const matchedWords = commandWords.filter((word) =>
          word.includes(queryLower)
        ).length;
        score = matchedWords / commandWords.length;
      }

      if (score > 0) {
        results.push({ entry: command, score });
      }
    }

    // Sort by relevance score
    results.sort((a, b) => b.score - a.score);
    return results.slice(0, limit).map((result) => result.entry);
  }

  /**
   * Get memory statistics
   */
  async getStats(): Promise<{
    totalConversations: number;
    totalCommands: number;
    memorySize: number;
    oldestEntry: string;
    newestEntry: string;
  }> {
    const allTimestamps = [
      ...this.memory.conversations.map((c) => c.timestamp),
      ...this.memory.commands.map((c) => c.timestamp),
    ].sort();

    const memoryStr = JSON.stringify(this.memory);
    const memorySize = Buffer.byteLength(memoryStr, 'utf8');

    return {
      totalConversations: this.memory.conversations.length,
      totalCommands: this.memory.commands.length,
      memorySize,
      oldestEntry: allTimestamps[0] || 'N/A',
      newestEntry: allTimestamps[allTimestamps.length - 1] || 'N/A',
    };
  }

  /**
   * Clear all memory
   */
  async clearMemory(): Promise<void> {
    this.memory = this.getDefaultMemory();
    this.semanticIndex.clear();
    await this.saveMemory();
  }

  /**
   * Export memory to file
   */
  async exportMemory(path: string): Promise<void> {
    try {
      await fs.writeJson(path, this.memory, { spaces: 2 });
    } catch (error) {
      throw new Error(`Failed to export memory: ${(error as Error).message}`);
    }
  }

  /**
   * Import memory from file
   */
  async importMemory(filePath: string): Promise<void> {
    try {
      const importedData = await fs.readJson(filePath);

      // Validate imported data structure
      if (!this.validateMemoryStructure(importedData)) {
        throw new Error('Invalid memory file structure');
      }

      this.memory = importedData as MemoryData;
      await this.saveMemory();
      await this.buildSemanticIndex();
    } catch (error) {
      throw new Error(`Failed to import memory: ${(error as Error).message}`);
    }
  }

  /**
   * Compress memory by removing old entries
   */
  async compressMemory(): Promise<void> {
    const config = this.configService.getConfiguration();
    const maxAge = 30; // Days - should come from config
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - maxAge);
    const cutoffTimestamp = cutoffDate.toISOString();

    // Remove old conversations
    const originalConversationCount = this.memory.conversations.length;
    this.memory.conversations = this.memory.conversations.filter(
      (conv) => conv.timestamp > cutoffTimestamp
    );

    // Remove old commands
    const originalCommandCount = this.memory.commands.length;
    this.memory.commands = this.memory.commands.filter(
      (cmd) => cmd.timestamp > cutoffTimestamp
    );

    await this.saveMemory();
    await this.buildSemanticIndex();

    const removedConversations =
      originalConversationCount - this.memory.conversations.length;
    const removedCommands = originalCommandCount - this.memory.commands.length;

    console.log(
      `Memory compressed: removed ${removedConversations} conversations and ${removedCommands} commands`
    );
  }

  /**
   * Get default memory structure
   */
  private getDefaultMemory(): MemoryData {
    return {
      conversations: [],
      commands: [],
      preferences: {},
      workingDirectories: {},
      semanticIndex: {},
      agenticHistory: [],
    };
  }

  /**
   * Build semantic index for faster searching
   */
  private async buildSemanticIndex(): Promise<void> {
    this.semanticIndex.clear();

    for (const conversation of this.memory.conversations) {
      const words = this.tokenize(conversation.query.toLowerCase());
      for (const word of words) {
        const count = this.semanticIndex.get(word) || 0;
        this.semanticIndex.set(word, count + 1);
      }
    }
  }

  /**
   * Update semantic index (called after adding new conversations)
   */
  private async updateSemanticIndex(): Promise<void> {
    // For simplicity, rebuild the entire index
    // In a production system, you'd want incremental updates
    await this.buildSemanticIndex();
  }

  /**
   * Extract semantic tags from query and response
   */
  private extractSemanticTags(query: string, response: string): string[] {
    const commonWords = new Set([
      'the',
      'a',
      'an',
      'and',
      'or',
      'but',
      'in',
      'on',
      'at',
      'to',
      'for',
      'of',
      'with',
      'by',
      'is',
      'are',
      'was',
      'were',
      'be',
      'been',
      'being',
      'have',
      'has',
      'had',
      'do',
      'does',
      'did',
      'will',
      'would',
      'could',
      'should',
    ]);

    const text = `${query} ${response}`.toLowerCase();
    const words = this.tokenize(text);

    return words
      .filter((word) => word.length > 2 && !commonWords.has(word))
      .slice(0, 10); // Keep top 10 semantic tags
  }

  /**
   * Calculate confidence score for a conversation entry
   */
  private calculateConfidence(
    query: string,
    response: string,
    model?: AIModel | null
  ): number {
    // Basic confidence calculation based on response length and complexity
    let confidence = 0.5; // Base confidence

    // Longer, more detailed responses get higher confidence
    if (response.length > 100) confidence += 0.2;
    if (response.length > 500) confidence += 0.2;

    // Responses with code or structured content get higher confidence
    if (
      response.includes('```') ||
      response.includes('function') ||
      response.includes('class')
    ) {
      confidence += 0.1;
    }

    return Math.min(confidence, 1.0);
  }

  /**
   * Calculate semantic score between query and conversation
   */
  private calculateSemanticScore(
    queryWords: string[],
    conversation: MemoryEntry
  ): number {
    const conversationWords = this.tokenize(
      `${conversation.query} ${
        conversation.response
      } ${conversation.semanticTags.join(' ')}`
    );

    let matches = 0;
    for (const queryWord of queryWords) {
      if (conversationWords.includes(queryWord)) {
        matches++;
      }
    }

    return matches / queryWords.length;
  }

  /**
   * Tokenize text into words
   */
  private tokenize(text: string): string[] {
    return text
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter((word) => word.length > 0);
  }

  /**
   * Validate memory data structure
   */
  private validateMemoryStructure(data: unknown): boolean {
    if (!data || typeof data !== 'object') return false;

    const memory = data as Record<string, unknown>;

    return (
      Array.isArray(memory.conversations) &&
      Array.isArray(memory.commands) &&
      typeof memory.preferences === 'object' &&
      typeof memory.workingDirectories === 'object'
    );
  }

  /**
   * Get recent conversations
   */
  async getRecentConversations(limit: number = 10): Promise<MemoryEntry[]> {
    const memory = await this.loadMemory();
    return memory.conversations.slice(-limit);
  }

  /**
   * Get recent commands
   */
  async getRecentCommands(limit: number = 10): Promise<CommandHistoryEntry[]> {
    const memory = await this.loadMemory();
    return memory.commands.slice(-limit);
  }

  /**
   * Get agentic execution history
   */
  async getAgenticHistory(goal?: string): Promise<any[]> {
    const memory = await this.loadMemory();
    const agenticHistory = (memory as any).agenticHistory || [];

    if (goal) {
      return agenticHistory.filter(
        (entry: any) =>
          entry.goal && entry.goal.toLowerCase().includes(goal.toLowerCase())
      );
    }

    return agenticHistory;
  }

  /**
   * Store agentic execution result
   */
  async storeAgenticExecution(execution: any): Promise<void> {
    const memory = await this.loadMemory();
    const memoryWithAgentic = memory as any;

    if (!memoryWithAgentic.agenticHistory) {
      memoryWithAgentic.agenticHistory = [];
    }

    memoryWithAgentic.agenticHistory.push({
      ...execution,
      timestamp: new Date().toISOString(),
    });

    // Keep only last 50 executions
    if (memoryWithAgentic.agenticHistory.length > 50) {
      memoryWithAgentic.agenticHistory =
        memoryWithAgentic.agenticHistory.slice(-50);
    }

    await this.saveMemory(memoryWithAgentic);
  }

  /**
   * Semantic search across memory
   */
  async searchMemory(
    query: string,
    limit: number = 10,
    type?: 'conversation' | 'command'
  ): Promise<
    Array<{
      type: 'conversation' | 'command';
      content: MemoryEntry | CommandHistoryEntry;
      relevance: number;
    }>
  > {
    const results: Array<{
      type: 'conversation' | 'command';
      content: MemoryEntry | CommandHistoryEntry;
      relevance: number;
    }> = [];

    if (!type || type === 'conversation') {
      const conversations = await this.searchConversations(query, limit);
      conversations.forEach((conv) => {
        results.push({
          type: 'conversation',
          content: conv,
          relevance: this.calculateSemanticSimilarity(
            query,
            conv.query + ' ' + conv.response
          ),
        });
      });
    }

    if (!type || type === 'command') {
      const commands = await this.searchCommands(query, limit);
      commands.forEach((cmd) => {
        results.push({
          type: 'command',
          content: cmd,
          relevance: this.calculateSemanticSimilarity(query, cmd.command),
        });
      });
    }

    // Sort by relevance and limit results
    return results.sort((a, b) => b.relevance - a.relevance).slice(0, limit);
  }

  /**
   * Update user preferences
   */
  async updatePreferences(preferences: Record<string, unknown>): Promise<void> {
    this.memory.preferences = { ...this.memory.preferences, ...preferences };
    await this.saveMemory();
  }

  /**
   * Get user preferences
   */
  async getPreferences(): Promise<Record<string, unknown>> {
    return this.memory.preferences || {};
  }

  /**
   * Calculate semantic similarity between two text strings
   */
  private calculateSemanticSimilarity(text1: string, text2: string): number {
    if (!text1 || !text2) return 0;

    // Simple similarity calculation based on common words
    const words1 = text1.toLowerCase().split(/\s+/);
    const words2 = text2.toLowerCase().split(/\s+/);

    const set1 = new Set(words1);
    const set2 = new Set(words2);

    const intersection = new Set([...set1].filter((x) => set2.has(x)));
    const union = new Set([...set1, ...set2]);

    return intersection.size / union.size;
  }
}
