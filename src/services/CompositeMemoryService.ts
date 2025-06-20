/**
 * CompositeMemoryService.ts - Facade pattern implementation for backward-compatible memory service access.
 *
 * Responsibilities:
 * - Provides unified interface to all focused memory services using Facade pattern.
 * - Maintains backward compatibility with legacy MemoryService interface.
 * - Delegates operations to appropriate specialized memory services.
 * - Ensures SOLID principles compliance while preserving existing API surface.
 *
 * Architecture:
 * - Implements Facade pattern for complex memory subsystem coordination.
 * - Delegates to focused services: persistence, conversation, command, statistics, import/export.
 * - Maintains interface segregation by routing to appropriate specialized services.
 *
 * SOLID Principles:
 * - SRP: Responsible only for delegating to appropriate services.
 * - OCP: Open for extension by adding new focused services.
 * - LSP: Substitutable for the original MemoryService.
 * - ISP: Delegates to appropriate interfaces based on client needs.
 * - DIP: Depends on abstractions (interfaces) not concretions.
 *
 * Exports:
 * - {@link CompositeMemoryService}: Facade service implementing IMemoryService.
 *
 * @see IMemoryService - Main memory service interface.
 * @see IMemoryPersistence - Memory persistence operations.
 * @see IConversationMemory - Conversation history management.
 * @see ICommandMemory - Command history management.
 */

import { IMemoryService } from '../interfaces/IMemoryService.js';
import { IMemoryPersistence } from '../interfaces/IMemoryPersistence.js';
import { IConversationMemory } from '../interfaces/IConversationMemory.js';
import { ICommandMemory } from '../interfaces/ICommandMemory.js';
import { IMemoryStatistics } from '../interfaces/IMemoryStatistics.js';
import { IMemoryImportExport } from '../interfaces/IMemoryImportExport.js';
import {
  MemoryEntry,
  CommandHistoryEntry,
  AIModel,
  ContextInfo,
  AgenticGoal,
} from '../types/index.js';

/**
 * CompositeMemoryService - Facade pattern implementation providing unified access to specialized memory services.
 *
 * Purpose:
 * - Maintains backward compatibility with existing MemoryService interface.
 * - Delegates operations to focused, specialized memory services.
 * - Provides single point of access for all memory-related operations.
 * - Ensures clean separation of concerns while preserving existing API.
 *
 * Delegation Strategy:
 * - Conversation operations → IConversationMemory
 * - Command operations → ICommandMemory
 * - Statistics operations → IMemoryStatistics
 * - Import/Export operations → IMemoryImportExport
 * - Persistence operations → IMemoryPersistence
 *
 * Dependencies:
 * @see IMemoryPersistence - Handles memory data persistence.
 * @see IConversationMemory - Manages conversation history.
 * @see ICommandMemory - Manages command history.
 * @see IMemoryStatistics - Provides memory usage statistics.
 * @see IMemoryImportExport - Handles memory data import/export.
 *
 * @example
 * const memoryService = new CompositeMemoryService(persistence, conversation, command, stats, importExport);
 * await memoryService.addConversation('query', 'response', context);
 * const recentChats = await memoryService.getRecentConversations(10);
 */
export class CompositeMemoryService implements IMemoryService {
  constructor(
    private readonly memoryPersistence: IMemoryPersistence,
    private readonly conversationMemory: IConversationMemory,
    private readonly commandMemory: ICommandMemory,
    private readonly memoryStatistics: IMemoryStatistics,
    private readonly memoryImportExport: IMemoryImportExport
  ) {}

  // Conversation Memory Operations
  async addConversation(
    query: string,
    response: string,
    context: ContextInfo,
    model?: AIModel | null
  ): Promise<void> {
    return this.conversationMemory.addConversation(
      query,
      response,
      context,
      model
    );
  }

  async searchConversations(
    query: string,
    limit?: number
  ): Promise<MemoryEntry[]> {
    return this.conversationMemory.searchConversations(query, limit);
  }

  async getRecentConversations(limit?: number): Promise<MemoryEntry[]> {
    return this.conversationMemory.getRecentConversations(limit);
  }

  // Command Memory Operations
  async addCommand(
    command: string,
    workingDirectory: string,
    exitCode: number,
    duration: number
  ): Promise<void> {
    return this.commandMemory.addCommand(
      command,
      workingDirectory,
      exitCode,
      duration
    );
  }

  async searchCommands(
    query: string,
    limit?: number
  ): Promise<CommandHistoryEntry[]> {
    return this.commandMemory.searchCommands(query, limit);
  }

  async getRecentCommands(limit?: number): Promise<CommandHistoryEntry[]> {
    return this.commandMemory.getRecentCommands(limit);
  }

  // Memory Statistics Operations
  async getStats(): Promise<{
    totalConversations: number;
    totalCommands: number;
    memorySize: number;
    oldestEntry: string;
    newestEntry: string;
  }> {
    return this.memoryStatistics.getStats();
  }

  // Memory Import/Export Operations
  async exportMemory(filePath: string): Promise<void> {
    return this.memoryImportExport.exportMemory(filePath);
  }

  async importMemory(filePath: string): Promise<void> {
    return this.memoryImportExport.importMemory(filePath);
  }

  async compressMemory(): Promise<void> {
    return this.memoryImportExport.compressMemory();
  }

  async clearMemory(): Promise<void> {
    return this.memoryImportExport.clearMemory();
  }

  // Persistence Operations
  async initialize(): Promise<{
    conversations: MemoryEntry[];
    commands: CommandHistoryEntry[];
    preferences: Record<string, unknown>;
    workingDirectories: Record<string, Record<string, unknown>>;
  }> {
    // Ensure memory file exists
    if (!(await this.memoryPersistence.exists())) {
      await this.memoryPersistence.saveMemory({
        conversations: [],
        commands: [],
        preferences: {},
        workingDirectories: {},
        semanticIndex: {},
        agenticHistory: [],
      });
    }

    // Load and return the memory data
    const memoryData = await this.memoryPersistence.loadMemory();
    return {
      conversations: memoryData.conversations,
      commands: memoryData.commands,
      preferences: memoryData.preferences,
      workingDirectories: memoryData.workingDirectories,
    };
  }

  async loadMemory() {
    return this.memoryPersistence.loadMemory();
  }

  async saveMemory(data: any) {
    return this.memoryPersistence.saveMemory(data);
  }

  // Legacy Methods - Delegated to appropriate services
  async addAgenticGoal(goal: AgenticGoal): Promise<void> {
    // This would be handled by a dedicated Agentic Memory service in future
    // For now, we'll add it to the persistence layer directly
    const memoryData = await this.memoryPersistence.loadMemory();
    memoryData.agenticHistory.push(goal);
    await this.memoryPersistence.saveMemory(memoryData);
  }

  async getAgenticGoals(): Promise<AgenticGoal[]> {
    const memoryData = await this.memoryPersistence.loadMemory();
    return memoryData.agenticHistory || [];
  }

  async updatePreferences(preferences: Record<string, unknown>): Promise<void> {
    const memoryData = await this.memoryPersistence.loadMemory();
    memoryData.preferences = { ...memoryData.preferences, ...preferences };
    await this.memoryPersistence.saveMemory(memoryData);
  }

  async getPreferences(): Promise<Record<string, unknown>> {
    const memoryData = await this.memoryPersistence.loadMemory();
    return memoryData.preferences || {};
  }

  async addWorkingDirectory(
    path: string,
    metadata: Record<string, unknown>
  ): Promise<void> {
    const memoryData = await this.memoryPersistence.loadMemory();
    memoryData.workingDirectories[path] = metadata;
    await this.memoryPersistence.saveMemory(memoryData);
  }

  async getWorkingDirectories(): Promise<
    Record<string, Record<string, unknown>>
  > {
    const memoryData = await this.memoryPersistence.loadMemory();
    return memoryData.workingDirectories || {};
  }

  // Agentic Memory Operations
  async getAgenticHistory(goal?: string): Promise<any[]> {
    const memoryData = await this.memoryPersistence.loadMemory();
    let history = memoryData.agenticHistory || [];

    if (goal) {
      history = history.filter(
        (entry: any) =>
          entry.goal && entry.goal.toLowerCase().includes(goal.toLowerCase())
      );
    }

    return history;
  }

  async storeAgenticExecution(execution: any): Promise<void> {
    const memoryData = await this.memoryPersistence.loadMemory();
    if (!memoryData.agenticHistory) {
      memoryData.agenticHistory = [];
    }
    memoryData.agenticHistory.push(execution);
    await this.memoryPersistence.saveMemory(memoryData);
  }

  // Semantic Search Operations
  async searchMemory(
    query: string,
    limit?: number,
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
      const conversations = await this.conversationMemory.searchConversations(
        query,
        limit
      );
      conversations.forEach((conv) => {
        results.push({
          type: 'conversation',
          content: conv,
          relevance: conv.confidence || 0.5,
        });
      });
    }

    if (!type || type === 'command') {
      const commands = await this.commandMemory.searchCommands(query, limit);
      commands.forEach((cmd) => {
        results.push({
          type: 'command',
          content: cmd,
          relevance: 0.7, // Default relevance for command matches
        });
      });
    }

    // Sort by relevance and apply limit
    results.sort((a, b) => b.relevance - a.relevance);

    if (limit) {
      return results.slice(0, limit);
    }

    return results;
  }
}
