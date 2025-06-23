// Memory Enhancement Module
// Provides semantic search, compression, and intelligent memory management

import fs from 'fs-extra';
import path from 'path';

interface MemoryConversation {
  id: string;
  timestamp: string;
  userInput: string;
  aiResponse: string;
  context?: Record<string, unknown>;
  tags?: string[];
  importance?: number;
}

interface MemoryCommand {
  command: string;
  timestamp: string;
  workingDirectory?: string;
  exitCode?: number;
  output?: string;
  context?: Record<string, unknown>;
}

interface MemoryData {
  conversations: MemoryConversation[];
  commands: MemoryCommand[];
  preferences: Record<string, unknown>;
  workingDirectories: Record<string, string>;
  metadata: {
    created: string;
    version: string;
    totalQueries: number;
    lastCleanup: string | null;
  };
}

interface SearchResult {
  type: 'conversation' | 'command';
  content: MemoryConversation | MemoryCommand;
  score: number;
  timestamp: string;
}

interface SearchOptions {
  limit?: number;
  threshold?: number;
  includeCommands?: boolean;
  includeConversations?: boolean;
  timeRange?: {
    start?: Date;
    end?: Date;
  };
}

interface MemoryStats {
  conversations: number;
  commands: number;
  totalSize: number;
  oldestEntry: string | null;
  newestEntry: string | null;
  compressionRatio: number;
  indexSize: number;
}

/**
 * MemoryManager class
 * 
 * TODO: Add class description
 */
class MemoryManager {
  private memoryPath: string;
  private memory: MemoryData | null;
  private maxMemorySize: number;
  private compressionThreshold: number;
  private semanticIndex: Map<string, Set<string>>;
  private contextLinks: Map<string, string[]>;

  /**
   * Creates an instance of the class
   * 
   * @param memoryPath - Parameter description
   */
  constructor(memoryPath: string) {
    this.memoryPath = memoryPath;
    this.memory = null;
    this.maxMemorySize = 50 * 1024 * 1024; // 50MB limit
    this.compressionThreshold = 1000; // Compress after 1000 conversations
    this.semanticIndex = new Map(); // Simple keyword-based semantic index
    this.contextLinks = new Map(); // Track relationships between sessions
  }

  /**
   * Handles loadMemory operation
   * 
   * @returns Promise<MemoryData> - Return value description
   */
  async loadMemory(): Promise<MemoryData> {
    try {
      if (await fs.pathExists(this.memoryPath)) {
        this.memory = await fs.readJson(this.memoryPath);
        await this.buildSemanticIndex();
        await this.linkContexts();
      } else {
        this.memory = {
          conversations: [],
          commands: [],
          preferences: {},
          workingDirectories: {},
          metadata: {
            created: new Date().toISOString(),
            version: '2.0.0',
            totalQueries: 0,
            lastCleanup: null,
          },
        };
      }
      return this.memory!;
    } catch (error) {
      console.warn('Memory loading failed:', (error as Error).message);
      return this.getDefaultMemory();
    }
  }

  /**
   * Handles saveMemory operation
   * 
   * @returns Promise<void> - Return value description
   */
  async saveMemory(): Promise<void> {
    try {
      await fs.ensureDir(path.dirname(this.memoryPath));

      // Check if memory needs compression
      if (this.needsCompression()) {
        await this.compressMemory();
      }

      await fs.writeJson(this.memoryPath, this.memory, { spaces: 2 });
    } catch (error) {
      console.error('Memory saving failed:', (error as Error).message);
      throw error;
    }
  }

  // Semantic search implementation
  async semanticSearch(
    query: string,
    options: SearchOptions = {}
  ): Promise<SearchResult[]> {
    const {
      limit = 10,
      threshold = 0.1,
      includeCommands = true,
      includeConversations = true,
      timeRange,
    } = options;

    try {
      if (!this.memory) {
        await this.loadMemory();
      }

      const queryTerms = this.extractKeywords(query.toLowerCase());
      const results: SearchResult[] = [];

      // Search conversations
      if (includeConversations) {
        for (const conv of this.memory!.conversations) {
          if (!conv || !conv.userInput) continue; // Skip invalid entries

          // Apply time range filter if specified
          if (timeRange) {
            const convDate = new Date(conv.timestamp);
            if (timeRange.start && convDate < timeRange.start) continue;
            if (timeRange.end && convDate > timeRange.end) continue;
          }

          const score = this.calculateRelevanceScore(conv, queryTerms);
          if (score > threshold) {
            results.push({
              type: 'conversation',
              content: conv,
              score: score,
              timestamp: conv.timestamp,
            });
          }
        }
      }

      // Search commands
      if (includeCommands) {
        for (const cmd of this.memory!.commands) {
          if (!cmd || !cmd.command) continue; // Skip invalid entries

          // Apply time range filter if specified
          if (timeRange) {
            const cmdDate = new Date(cmd.timestamp);
            if (timeRange.start && cmdDate < timeRange.start) continue;
            if (timeRange.end && cmdDate > timeRange.end) continue;
          }

          const score = this.calculateCommandRelevanceScore(cmd, queryTerms);
          if (score > threshold) {
            results.push({
              type: 'command',
              content: cmd,
              score: score,
              timestamp: cmd.timestamp,
            });
          }
        }
      }

      // Sort by relevance and timestamp
      results.sort((a, b) => {
        if (Math.abs(a.score - b.score) < 0.05) {
          return (
            new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
          );
        }
        return b.score - a.score;
      });

      return results.slice(0, limit);
    } catch (error) {
      console.warn('Semantic search failed:', (error as Error).message);
      return [];
    }
  }

  // Memory compression to manage size
  /**
   * Handles compressMemory operation
   * 
   * @returns Promise<void> - Return value description
   */
  async compressMemory(): Promise<void> {
    try {
      if (!this.memory) {
        return;
      }

      const originalSize = this.memory.conversations.length;
      const compressionTarget = Math.floor(originalSize * 0.7); // Keep 70%

      // Sort conversations by importance
      const scoredConversations = this.memory.conversations.map((conv) => ({
        ...conv,
        importance: this.calculateImportanceScore(conv),
      }));

      scoredConversations.sort((a, b) => b.importance - a.importance);

      // Keep most important conversations
      this.memory.conversations = scoredConversations
        .slice(0, compressionTarget)
        .map(({ importance, ...conv }) => conv);

      // Update metadata
      this.memory.metadata.lastCleanup = new Date().toISOString();

      console.log(
        `Memory compressed: ${originalSize} → ${this.memory.conversations.length} conversations`
      );

      // Rebuild indexes after compression
      await this.buildSemanticIndex();
      await this.linkContexts();
    } catch (error) {
      console.error('Memory compression failed:', (error as Error).message);
    }
  }

  // Build semantic index for faster searching
  /**
   * Builds semanticindex
   * 
   * @returns Promise<void> - Return value description
   */
  async buildSemanticIndex(): Promise<void> {
    try {
      if (!this.memory) {
        return;
      }

      this.semanticIndex.clear();

      // Index conversations
      for (const conv of this.memory.conversations) {
        if (!conv || !conv.userInput) continue;

        const keywords = this.extractKeywords(
          `${conv.userInput} ${conv.aiResponse || ''}`
        );

        keywords.forEach((keyword) => {
          if (!this.semanticIndex.has(keyword)) {
            this.semanticIndex.set(keyword, new Set());
          }
          this.semanticIndex.get(keyword)!.add(conv.id);
        });
      }

      // Index commands
      for (const cmd of this.memory.commands) {
        if (!cmd || !cmd.command) continue;

        const keywords = this.extractKeywords(cmd.command);
        const cmdId = `cmd_${cmd.timestamp}`;

        keywords.forEach((keyword) => {
          if (!this.semanticIndex.has(keyword)) {
            this.semanticIndex.set(keyword, new Set());
          }
          this.semanticIndex.get(keyword)!.add(cmdId);
        });
      }
    } catch (error) {
      console.warn('Index building failed:', (error as Error).message);
    }
  }

  // Link related contexts and sessions
  /**
   * Handles linkContexts operation
   * 
   * @returns Promise<void> - Return value description
   */
  async linkContexts(): Promise<void> {
    try {
      if (!this.memory) {
        return;
      }

      this.contextLinks.clear();

      const conversations = this.memory.conversations;

      for (let i = 0; i < conversations.length; i++) {
        const current = conversations[i];
        if (!current) continue;

        const relatedIds: string[] = [];

        // Find conversations with similar topics
        const currentTopics = this.findCommonTopics([current]);

        for (let j = 0; j < conversations.length; j++) {
          if (i === j) continue;

          const other = conversations[j];
          if (!other) continue;

          const otherTopics = this.findCommonTopics([other]);
          const commonTopics = currentTopics.filter((topic) =>
            otherTopics.includes(topic)
          );

          if (commonTopics.length > 0) {
            relatedIds.push(other.id);
          }
        }

        if (relatedIds.length > 0) {
          this.contextLinks.set(current.id, relatedIds);
        }
      }
    } catch (error) {
      console.warn('Context linking failed:', (error as Error).message);
    }
  }

  // Smart cleanup of outdated or irrelevant data
  /**
   * Handles smartCleanup operation
   * 
   * @returns Promise<void> - Return value description
   */
  async smartCleanup(): Promise<void> {
    try {
      if (!this.memory) {
        return;
      }

      const now = new Date();
      const sixMonthsAgo = new Date(
        now.getTime() - 6 * 30 * 24 * 60 * 60 * 1000
      );

      // Remove very old conversations with low importance
      this.memory.conversations = this.memory.conversations.filter((conv) => {
        if (!conv || !conv.timestamp) return false;

        const convDate = new Date(conv.timestamp);
        const importance = this.calculateImportanceScore(conv);

        // Keep recent conversations
        if (convDate > sixMonthsAgo) {
          return true;
        }

        // Keep old but important conversations
        return importance > 0.7;
      });

      // Remove old commands (keep last 30 days)
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      this.memory.commands = this.memory.commands.filter((cmd) => {
        if (!cmd || !cmd.timestamp) return false;
        return new Date(cmd.timestamp) > thirtyDaysAgo;
      });

      // Rebuild indexes after cleanup
      await this.buildSemanticIndex();
      await this.linkContexts();

      this.memory.metadata.lastCleanup = now.toISOString();
    } catch (error) {
      console.error('Smart cleanup failed:', (error as Error).message);
    }
  }

  // Export memory for backup or migration
  async exportMemory(
    exportPath: string,
    format: 'json' | 'csv' = 'json'
  ): Promise<void> {
    try {
      if (!this.memory) {
        await this.loadMemory();
      }

      await fs.ensureDir(path.dirname(exportPath));

      if (format === 'json') {
        await fs.writeJson(exportPath, this.memory, { spaces: 2 });
      } else if (format === 'csv') {
        await this.exportToCsv(exportPath, this.memory!);
      }

      console.log(`Memory exported to: ${exportPath}`);
    } catch (error) {
      console.error('Memory export failed:', (error as Error).message);
      throw error;
    }
  }

  // Helper methods
  /**
   * Handles extractKeywords operation
   * 
   * @param text - Parameter description
   * 
   * @returns string[] - Return value description
   */
  private extractKeywords(text: string): string[] {
    if (!text || typeof text !== 'string') {
      return [];
    }

    return text
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter((word) => word.length > 2 && !this.isStopWord(word))
      .slice(0, 20); // Limit keywords per text
  }

  /**
   * Handles isStopWord operation
   * 
   * @param word - Parameter description
   * 
   * @returns boolean - Return value description
   */
  private isStopWord(word: string): boolean {
    const stopWords = new Set([
      'the',
      'a',
      'an',
      'and',
      'or',
      'but',
      'if',
      'then',
      'else',
      'when',
      'where',
      'how',
      'what',
      'why',
      'who',
      'which',
      'that',
      'this',
      'these',
      'those',
      'i',
      'you',
      'he',
      'she',
      'it',
      'we',
      'they',
      'me',
      'him',
      'her',
      'us',
      'them',
      'my',
      'your',
      'his',
      'her',
      'its',
      'our',
      'their',
      'am',
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
      'may',
      'might',
      'must',
      'can',
      'in',
      'on',
      'at',
      'by',
      'for',
      'with',
      'without',
      'to',
      'from',
      'up',
      'down',
      'out',
      'off',
      'over',
      'under',
      'above',
      'below',
    ]);

    return stopWords.has(word);
  }

  private calculateRelevanceScore(
    conversation: MemoryConversation,
    queryTerms: string[]
  ): number {
    if (!conversation || !conversation.userInput) {
      return 0;
    }

    const text = `${conversation.userInput} ${
      conversation.aiResponse || ''
    }`.toLowerCase();
    const textTerms = this.extractKeywords(text);

    let matches = 0;
    let totalScore = 0;

    queryTerms.forEach((queryTerm) => {
      textTerms.forEach((textTerm) => {
        if (textTerm.includes(queryTerm) || queryTerm.includes(textTerm)) {
          matches++;
          // Exact match gets higher score
          totalScore += textTerm === queryTerm ? 1.0 : 0.5;
        }
      });
    });

    // Normalize by query length and add recency boost
    const baseScore = totalScore / Math.max(queryTerms.length, 1);
    const recencyBoost = this.calculateRecencyBoost(conversation.timestamp);

    return Math.min(baseScore + recencyBoost, 1.0);
  }

  private calculateCommandRelevanceScore(
    command: MemoryCommand,
    queryTerms: string[]
  ): number {
    if (!command || !command.command) {
      return 0;
    }

    const commandTerms = this.extractKeywords(command.command.toLowerCase());

    let matches = 0;
    let totalScore = 0;

    queryTerms.forEach((queryTerm) => {
      commandTerms.forEach((cmdTerm) => {
        if (cmdTerm.includes(queryTerm) || queryTerm.includes(cmdTerm)) {
          matches++;
          totalScore += cmdTerm === queryTerm ? 1.0 : 0.5;
        }
      });
    });

    const baseScore = totalScore / Math.max(queryTerms.length, 1);
    const recencyBoost = this.calculateRecencyBoost(command.timestamp);

    return Math.min(baseScore + recencyBoost, 1.0);
  }

  /**
   * Calculates recencyboost
   * 
   * @param timestamp - Parameter description
   * 
   * @returns number - Return value description
   */
  private calculateRecencyBoost(timestamp: string): number {
    const now = new Date().getTime();
    const itemTime = new Date(timestamp).getTime();
    const daysSince = (now - itemTime) / (1000 * 60 * 60 * 24);

    // Recent items get small boost
    if (daysSince < 1) return 0.1;
    if (daysSince < 7) return 0.05;
    return 0;
  }

  /**
   * Calculates importancescore
   * 
   * @param conversation - Parameter description
   * 
   * @returns number - Return value description
   */
  private calculateImportanceScore(conversation: MemoryConversation): number {
    let score = 0.5; // Base score

    if (!conversation || !conversation.userInput) {
      return 0;
    }

    // Length indicates complexity/importance
    const textLength = (
      conversation.userInput + (conversation.aiResponse || '')
    ).length;
    score += Math.min(textLength / 1000, 0.3);

    // Tags indicate manual importance
    if (conversation.tags && conversation.tags.length > 0) {
      score += 0.2;
    }

    // Recent conversations are more important
    const daysSince =
      (Date.now() - new Date(conversation.timestamp).getTime()) /
      (1000 * 60 * 60 * 24);
    if (daysSince < 7) score += 0.2;
    if (daysSince < 30) score += 0.1;

    return Math.min(score, 1.0);
  }

  /**
   * Handles findCommonTopics operation
   * 
   * @param conversations - Parameter description
   * 
   * @returns string[] - Return value description
   */
  private findCommonTopics(conversations: MemoryConversation[]): string[] {
    const allKeywords: string[] = [];

    conversations.forEach((conv) => {
      if (conv && conv.userInput) {
        const keywords = this.extractKeywords(
          `${conv.userInput} ${conv.aiResponse || ''}`
        );
        allKeywords.push(...keywords);
      }
    });

    // Count keyword frequency
    const keywordCounts = new Map<string, number>();
    allKeywords.forEach((keyword) => {
      keywordCounts.set(keyword, (keywordCounts.get(keyword) || 0) + 1);
    });

    // Return most common keywords as topics
    return Array.from(keywordCounts.entries())
      .filter(([, count]) => count > 1)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([keyword]) => keyword);
  }

  /**
   * Calculates timespan
   * 
   * @param conversations - Parameter description
   * 
   * @returns number - Return value description
   */
  private calculateTimeSpan(conversations: MemoryConversation[]): number {
    if (conversations.length === 0) return 0;

    const timestamps = conversations
      .filter((conv) => conv && conv.timestamp)
      .map((conv) => new Date(conv.timestamp).getTime())
      .sort((a, b) => a - b);

    if (timestamps.length < 2) return 0;

    return timestamps[timestamps.length - 1] - timestamps[0];
  }

  /**
   * Handles needsCompression operation
   * 
   * @returns boolean - Return value description
   */
  private needsCompression(): boolean {
    if (!this.memory) {
      return false;
    }

    return this.memory.conversations.length > this.compressionThreshold;
  }

  /**
   * Gets defaultmemory
   * 
   * @returns MemoryData - Return value description
   */
  private getDefaultMemory(): MemoryData {
    return {
      conversations: [],
      commands: [],
      preferences: {},
      workingDirectories: {},
      metadata: {
        created: new Date().toISOString(),
        version: '2.0.0',
        totalQueries: 0,
        lastCleanup: null,
      },
    };
  }

  private async exportToCsv(
    exportPath: string,
    data: MemoryData
  ): Promise<void> {
    const csvLines: string[] = ['Type,Timestamp,Content,Context'];

    // Export conversations
    data.conversations.forEach((conv) => {
      if (conv && conv.userInput) {
        const escapedInput = conv.userInput.replace(/"/g, '""');
        const escapedResponse = (conv.aiResponse || '').replace(/"/g, '""');
        csvLines.push(
          `conversation,"${conv.timestamp}","${escapedInput}","${escapedResponse}"`
        );
      }
    });

    // Export commands
    data.commands.forEach((cmd) => {
      if (cmd && cmd.command) {
        const escapedCommand = cmd.command.replace(/"/g, '""');
        const escapedOutput = (cmd.output || '').replace(/"/g, '""');
        csvLines.push(
          `command,"${cmd.timestamp}","${escapedCommand}","${escapedOutput}"`
        );
      }
    });

    await fs.writeFile(exportPath, csvLines.join('\n'), 'utf-8');
  }

  // Memory statistics for monitoring
  /**
   * Gets memorystats
   * 
   * @returns MemoryStats - Return value description
   */
  public getMemoryStats(): MemoryStats {
    if (!this.memory) {
      return {
        conversations: 0,
        commands: 0,
        totalSize: 0,
        oldestEntry: null,
        newestEntry: null,
        compressionRatio: 0,
        indexSize: 0,
      };
    }

    const conversations = this.memory.conversations.filter(
      (conv) => conv && conv.timestamp
    );
    const commands = this.memory.commands.filter((cmd) => cmd && cmd.timestamp);

    const allTimestamps = [
      ...conversations.map((conv) => conv.timestamp),
      ...commands.map((cmd) => cmd.timestamp),
    ].sort();

    const totalSize = JSON.stringify(this.memory).length;

    return {
      conversations: conversations.length,
      commands: commands.length,
      totalSize,
      oldestEntry: allTimestamps[0] || null,
      newestEntry: allTimestamps[allTimestamps.length - 1] || null,
      compressionRatio:
        this.maxMemorySize > 0 ? totalSize / this.maxMemorySize : 0,
      indexSize: this.semanticIndex.size,
    };
  }

  // Public methods for external access
  public async addConversation(
    conversation: MemoryConversation
  ): Promise<void> {
    if (!this.memory) {
      await this.loadMemory();
    }

    this.memory!.conversations.push(conversation);
    this.memory!.metadata.totalQueries++;

    // Update semantic index
    const keywords = this.extractKeywords(
      `${conversation.userInput} ${conversation.aiResponse || ''}`
    );

    keywords.forEach((keyword) => {
      if (!this.semanticIndex.has(keyword)) {
        this.semanticIndex.set(keyword, new Set());
      }
      this.semanticIndex.get(keyword)!.add(conversation.id);
    });

    await this.saveMemory();
  }

  /**
   * Handles addCommand operation
   * 
   * @param command - Parameter description
   * 
   * @returns Promise<void> - Return value description
   */
  public async addCommand(command: MemoryCommand): Promise<void> {
    if (!this.memory) {
      await this.loadMemory();
    }

    this.memory!.commands.push(command);

    // Update semantic index
    const keywords = this.extractKeywords(command.command);
    const cmdId = `cmd_${command.timestamp}`;

    keywords.forEach((keyword) => {
      if (!this.semanticIndex.has(keyword)) {
        this.semanticIndex.set(keyword, new Set());
      }
      this.semanticIndex.get(keyword)!.add(cmdId);
    });

    await this.saveMemory();
  }

  /**
   * Gets memory
   * 
   * @returns MemoryData | null - Return value description
   */
  public getMemory(): MemoryData | null {
    return this.memory;
  }
}

export default MemoryManager;
