// Memory Enhancement Module
// Provides semantic search, compression, and intelligent memory management

const fs = require('fs-extra');
const path = require('path');

class MemoryManager {
  constructor(memoryPath) {
    this.memoryPath = memoryPath;
    this.memory = null;
    this.maxMemorySize = 50 * 1024 * 1024; // 50MB limit
    this.compressionThreshold = 1000; // Compress after 1000 conversations
    this.semanticIndex = new Map(); // Simple keyword-based semantic index
    this.contextLinks = new Map(); // Track relationships between sessions
  }

  async loadMemory() {
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
      return this.memory;
    } catch (error) {
      console.warn('Memory loading failed:', error.message);
      return this.getDefaultMemory();
    }
  }

  async saveMemory() {
    try {
      await fs.ensureDir(path.dirname(this.memoryPath));

      // Check if memory needs compression
      if (this.needsCompression()) {
        await this.compressMemory();
      }

      // Update metadata
      if (!this.memory.metadata) {
        this.memory.metadata = {
          created: new Date().toISOString(),
          version: '2.0.0',
          totalQueries: 0,
          lastCleanup: null,
        };
      }
      this.memory.metadata.lastSave = new Date().toISOString();
      this.memory.metadata.totalQueries = this.memory.conversations.length;

      await fs.writeJson(this.memoryPath, this.memory, { spaces: 2 });
      return true;
    } catch (error) {
      console.error('Memory saving failed:', error.message);
      return false;
    }
  }

  // Semantic search implementation
  async semanticSearch(query, limit = 10) {
    try {
      const queryTerms = this.extractKeywords(query.toLowerCase());
      const results = [];

      // Search conversations
      for (const conv of this.memory.conversations) {
        const score = this.calculateRelevanceScore(conv, queryTerms);
        if (score > 0.1) {
          results.push({
            type: 'conversation',
            content: conv,
            score: score,
            timestamp: conv.timestamp,
          });
        }
      }

      // Search commands
      for (const cmd of this.memory.commands) {
        const score = this.calculateCommandRelevanceScore(cmd, queryTerms);
        if (score > 0.1) {
          results.push({
            type: 'command',
            content: cmd,
            score: score,
            timestamp: cmd.timestamp,
          });
        }
      }

      // Sort by relevance and timestamp
      results.sort((a, b) => {
        if (Math.abs(a.score - b.score) < 0.05) {
          return new Date(b.timestamp) - new Date(a.timestamp);
        }
        return b.score - a.score;
      });

      return results.slice(0, limit);
    } catch (error) {
      console.warn('Semantic search failed:', error.message);
      return [];
    }
  }

  // Memory compression to manage size
  async compressMemory() {
    try {
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

      // Compress commands (keep last 500)
      if (this.memory.commands.length > 500) {
        this.memory.commands = this.memory.commands.slice(-500);
      }

      // Update metadata
      this.memory.metadata.lastCleanup = new Date().toISOString();
      this.memory.metadata.compressionApplied = true;

      console.log(
        `Memory compressed: ${originalSize} → ${this.memory.conversations.length} conversations`
      );
      return true;
    } catch (error) {
      console.error('Memory compression failed:', error.message);
      return false;
    }
  }

  // Build semantic index for faster searching
  async buildSemanticIndex() {
    try {
      this.semanticIndex.clear();

      // Index conversations
      this.memory.conversations.forEach((conv, index) => {
        const keywords = this.extractKeywords(
          `${conv.query} ${conv.response}`.toLowerCase()
        );

        keywords.forEach((keyword) => {
          if (!this.semanticIndex.has(keyword)) {
            this.semanticIndex.set(keyword, []);
          }
          this.semanticIndex.get(keyword).push({
            type: 'conversation',
            index: index,
            content: conv,
          });
        });
      });

      // Index commands
      this.memory.commands.forEach((cmd, index) => {
        const keywords = this.extractKeywords(cmd.command.toLowerCase());

        keywords.forEach((keyword) => {
          if (!this.semanticIndex.has(keyword)) {
            this.semanticIndex.set(keyword, []);
          }
          this.semanticIndex.get(keyword).push({
            type: 'command',
            index: index,
            content: cmd,
          });
        });
      });

      return true;
    } catch (error) {
      console.warn('Semantic index building failed:', error.message);
      return false;
    }
  }

  // Link related contexts and sessions
  async linkContexts() {
    try {
      this.contextLinks.clear();

      // Group conversations by working directory
      const directoryGroups = new Map();

      this.memory.conversations.forEach((conv, index) => {
        if (conv.context && conv.context.workingDirectory) {
          const dir = conv.context.workingDirectory;
          if (!directoryGroups.has(dir)) {
            directoryGroups.set(dir, []);
          }
          directoryGroups.get(dir).push({ index, conversation: conv });
        }
      });

      // Create links between related contexts
      directoryGroups.forEach((convs, directory) => {
        if (convs.length > 1) {
          this.contextLinks.set(directory, {
            conversations: convs,
            commonTopics: this.findCommonTopics(convs),
            timeSpan: this.calculateTimeSpan(convs),
          });
        }
      });

      return true;
    } catch (error) {
      console.warn('Context linking failed:', error.message);
      return false;
    }
  }

  // Smart cleanup of outdated or irrelevant data
  async smartCleanup() {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - 30); // 30 days ago

      let removedCount = 0;

      // Remove old, low-importance conversations
      this.memory.conversations = this.memory.conversations.filter((conv) => {
        const convDate = new Date(conv.timestamp);
        const importance = this.calculateImportanceScore(conv);

        // Keep if recent or important
        if (convDate > cutoffDate || importance > 0.3) {
          return true;
        }

        removedCount++;
        return false;
      });

      // Remove duplicate commands
      const uniqueCommands = new Map();
      this.memory.commands = this.memory.commands.filter((cmd) => {
        const key = `${cmd.command}_${cmd.workingDirectory}`;
        if (uniqueCommands.has(key)) {
          // Keep the more recent one
          const existing = uniqueCommands.get(key);
          if (new Date(cmd.timestamp) > new Date(existing.timestamp)) {
            uniqueCommands.set(key, cmd);
            return true;
          }
          return false;
        }
        uniqueCommands.set(key, cmd);
        return true;
      });

      // Rebuild indices after cleanup
      await this.buildSemanticIndex();
      await this.linkContexts();

      console.log(
        `Smart cleanup completed: removed ${removedCount} old conversations`
      );
      return {
        removed: removedCount,
        remaining: this.memory.conversations.length,
      };
    } catch (error) {
      console.error('Smart cleanup failed:', error.message);
      return { error: error.message };
    }
  }

  // Export memory for backup or migration
  async exportMemory(exportPath, format = 'json') {
    try {
      const exportData = {
        ...this.memory,
        exportMetadata: {
          exportDate: new Date().toISOString(),
          format: format,
          version: '2.0.0',
        },
      };

      switch (format) {
        case 'json':
          await fs.writeJson(exportPath, exportData, { spaces: 2 });
          break;
        case 'csv':
          await this.exportToCsv(exportPath, exportData);
          break;
        default:
          throw new Error(`Unsupported export format: ${format}`);
      }

      return { success: true, path: exportPath };
    } catch (error) {
      console.error('Memory export failed:', error.message);
      return { success: false, error: error.message };
    }
  }

  // Helper methods
  extractKeywords(text) {
    return text
      .split(/\s+/)
      .filter((word) => word.length > 2)
      .filter((word) => !this.isStopWord(word))
      .slice(0, 20); // Limit keywords per text
  }

  isStopWord(word) {
    const stopWords = new Set([
      'the',
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
      'from',
      'up',
      'about',
      'into',
      'through',
      'during',
      'before',
      'after',
      'above',
      'below',
      'between',
      'among',
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
    ]);
    return stopWords.has(word.toLowerCase());
  }

  calculateRelevanceScore(conversation, queryTerms) {
    const text = `${conversation.query} ${conversation.response}`.toLowerCase();
    let score = 0;
    let matches = 0;

    queryTerms.forEach((term) => {
      const regex = new RegExp(term, 'gi');
      const termMatches = (text.match(regex) || []).length;
      if (termMatches > 0) {
        matches++;
        score += termMatches * 0.1;
      }
    });

    // Boost score for multiple term matches
    if (matches > 1) {
      score *= 1.5;
    }

    return Math.min(score, 1.0);
  }

  calculateCommandRelevanceScore(command, queryTerms) {
    const text = command.command.toLowerCase();
    let score = 0;

    queryTerms.forEach((term) => {
      if (text.includes(term)) {
        score += 0.3;
      }
    });

    return Math.min(score, 1.0);
  }

  calculateImportanceScore(conversation) {
    let score = 0.1; // Base score

    // Recent conversations are more important
    const age = Date.now() - new Date(conversation.timestamp).getTime();
    const daysSince = age / (1000 * 60 * 60 * 24);
    if (daysSince < 7) score += 0.3;
    else if (daysSince < 30) score += 0.2;

    // Longer conversations are more important
    const responseLength = conversation.response?.length || 0;
    if (responseLength > 500) score += 0.2;
    else if (responseLength > 200) score += 0.1;

    // Code-related conversations are more important
    if (conversation.query?.match(/\b(code|debug|error|function)\b/i)) {
      score += 0.2;
    }

    return Math.min(score, 1.0);
  }

  findCommonTopics(conversations) {
    const topicCount = new Map();

    conversations.forEach(({ conversation }) => {
      const keywords = this.extractKeywords(conversation.query.toLowerCase());
      keywords.forEach((keyword) => {
        topicCount.set(keyword, (topicCount.get(keyword) || 0) + 1);
      });
    });

    return Array.from(topicCount.entries())
      .filter(([_, count]) => count > 1)
      .sort(([_, a], [__, b]) => b - a)
      .slice(0, 5)
      .map(([topic, _]) => topic);
  }

  calculateTimeSpan(conversations) {
    const timestamps = conversations.map(({ conversation }) =>
      new Date(conversation.timestamp).getTime()
    );

    const earliest = Math.min(...timestamps);
    const latest = Math.max(...timestamps);

    return {
      start: new Date(earliest).toISOString(),
      end: new Date(latest).toISOString(),
      duration: latest - earliest,
    };
  }

  needsCompression() {
    return (
      this.memory.conversations.length > this.compressionThreshold ||
      JSON.stringify(this.memory).length > this.maxMemorySize
    );
  }

  getDefaultMemory() {
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

  async exportToCsv(exportPath, data) {
    // Simple CSV export for conversations
    let csv = 'timestamp,query,response_length,working_directory\n';

    data.conversations.forEach((conv) => {
      const timestamp = conv.timestamp;
      const query = (conv.query || '').replace(/"/g, '""');
      const responseLength = (conv.response || '').length;
      const workingDir = conv.context?.workingDirectory || '';

      csv += `"${timestamp}","${query}",${responseLength},"${workingDir}"\n`;
    });

    await fs.writeFile(exportPath, csv);
  }

  // Memory statistics for monitoring
  getMemoryStats() {
    return {
      conversations: this.memory.conversations.length,
      commands: this.memory.commands.length,
      totalSize: JSON.stringify(this.memory).length,
      semanticIndexSize: this.semanticIndex.size,
      contextLinks: this.contextLinks.size,
      lastCleanup: this.memory.metadata?.lastCleanup,
      compressionNeeded: this.needsCompression(),
    };
  }
}

module.exports = MemoryManager;
