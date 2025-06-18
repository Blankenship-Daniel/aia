/**
 * Memory Service Implementation
 * Manages persistent memory operations and data storage
 */
const fs = require('fs-extra');
const path = require('path');
const os = require('os');
const IMemoryService = require('../interfaces/IMemoryService');

class MemoryService extends IMemoryService {
  constructor(configurationService) {
    super();
    this.configService = configurationService;
    this.memory = {};
    this.memoryPath = path.join(os.homedir(), '.aia', 'memory.json');
    this.semanticIndex = new Map();
    this.initialized = false;
  }

  /**
   * Initialize the memory service and load existing data
   * @returns {Promise<Object>} Loaded memory object
   */
  async initialize() {
    if (this.initialized) {
      return this.memory;
    }

    try {
      await fs.ensureDir(path.dirname(this.memoryPath));
      this.memory = await this.loadMemory();
      this.buildSemanticIndex();
      this.initialized = true;
      return this.memory;
    } catch (error) {
      console.error('Failed to initialize memory service:', error.message);
      this.memory = this.getDefaultMemory();
      this.initialized = true;
      return this.memory;
    }
  }

  /**
   * Load memory from persistent storage
   * @returns {Promise<Object>} Memory object containing conversations, commands, etc.
   */
  async loadMemory() {
    try {
      if (await fs.pathExists(this.memoryPath)) {
        const data = await fs.readJson(this.memoryPath);
        return { ...this.getDefaultMemory(), ...data };
      }
      return this.getDefaultMemory();
    } catch (error) {
      console.warn('Failed to load memory, using defaults:', error.message);
      return this.getDefaultMemory();
    }
  }

  /**
   * Save current memory state to persistent storage
   * @param {Object} [memory] - Optional memory object to save
   * @returns {Promise<void>}
   */
  async saveMemory(memory = null) {
    try {
      const memoryToSave = memory || this.memory;

      // Apply memory size limits
      this.enforceMemoryLimits(memoryToSave);

      await fs.writeJson(this.memoryPath, memoryToSave, { spaces: 2 });
    } catch (error) {
      throw new Error(`Failed to save memory: ${error.message}`);
    }
  }

  /**
   * Add a conversation to memory
   * @param {string} query - User's query
   * @param {string} response - AI's response
   * @param {Object} context - Context at time of conversation
   * @param {string} [model] - AI model used
   * @returns {Promise<void>}
   */
  async addConversation(query, response, context, model = null) {
    const conversation = {
      id: this.generateId(),
      query,
      response,
      context,
      model,
      timestamp: new Date().toISOString(),
      semanticTags: this.extractSemanticTags(query, response),
    };

    this.memory.conversations.push(conversation);
    this.updateSemanticIndex(conversation);
    await this.saveMemory();
  }

  /**
   * Add a command execution to memory
   * @param {string} command - Command that was executed
   * @param {Object} result - Execution result
   * @param {Object} context - Context at time of execution
   * @returns {Promise<void>}
   */
  async addCommand(command, result, context) {
    const commandEntry = {
      id: this.generateId(),
      command,
      result: {
        exitCode: result.exitCode || 0,
        stdout: result.stdout || '',
        stderr: result.stderr || '',
        duration: result.duration || 0,
      },
      context,
      timestamp: new Date().toISOString(),
      workingDirectory: context.workingDirectory || process.cwd(),
    };

    this.memory.commands.push(commandEntry);
    await this.saveMemory();
  }

  /**
   * Search conversations using semantic matching
   * @param {string} query - Search query
   * @param {Object} [options] - Search options
   * @returns {Promise<Array>} Matching conversations
   */
  async searchConversations(query, options = {}) {
    const { limit = 10, minScore = 0.3, includeContext = false } = options;

    const queryTags = this.extractSemanticTags(query, '');
    const matches = [];

    for (const conversation of this.memory.conversations) {
      const score = this.calculateSemanticSimilarity(
        queryTags,
        conversation.semanticTags
      );

      if (score >= minScore) {
        matches.push({
          ...conversation,
          score,
          context: includeContext ? conversation.context : undefined,
        });
      }
    }

    return matches.sort((a, b) => b.score - a.score).slice(0, limit);
  }

  /**
   * Search commands by pattern or context
   * @param {string} pattern - Search pattern
   * @param {Object} [options] - Search options
   * @returns {Promise<Array>} Matching commands
   */
  async searchCommands(pattern, options = {}) {
    const { limit = 10, workingDirectory = null, exitCode = null } = options;

    let matches = this.memory.commands.filter((cmd) => {
      // Pattern matching
      if (
        pattern &&
        !cmd.command.toLowerCase().includes(pattern.toLowerCase())
      ) {
        return false;
      }

      // Working directory filter
      if (workingDirectory && cmd.workingDirectory !== workingDirectory) {
        return false;
      }

      // Exit code filter
      if (
        exitCode !== null &&
        (!cmd.result || cmd.result.exitCode !== exitCode)
      ) {
        return false;
      }

      return true;
    });

    return matches
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
      .slice(0, limit);
  }

  /**
   * Get memory summary statistics
   * @returns {Promise<Object>} Memory statistics
   */
  async getSummary() {
    return {
      conversations: {
        total: this.memory.conversations.length,
        recent: this.memory.conversations.filter(
          (c) => Date.now() - new Date(c.timestamp) < 7 * 24 * 60 * 60 * 1000
        ).length,
      },
      commands: {
        total: this.memory.commands.length,
        successful: this.memory.commands.filter(
          (c) => c.result && c.result.exitCode === 0
        ).length,
        failed: this.memory.commands.filter(
          (c) => c.result && c.result.exitCode !== 0
        ).length,
      },
      preferences: Object.keys(this.memory.preferences).length,
      workingDirectories: Object.keys(this.memory.workingDirectories).length,
      memorySize: JSON.stringify(this.memory).length,
    };
  }

  /**
   * Clear memory with optional filters
   * @param {Object} [options] - Clear options
   * @returns {Promise<void>}
   */
  async clear(options = {}) {
    const {
      conversations = false,
      commands = false,
      preferences = false,
      all = false,
    } = options;

    if (all) {
      this.memory = this.getDefaultMemory();
    } else {
      if (conversations) {
        this.memory.conversations = [];
      }
      if (commands) {
        this.memory.commands = [];
      }
      if (preferences) {
        this.memory.preferences = {};
      }
    }

    this.semanticIndex.clear();
    if (this.memory.conversations.length > 0) {
      this.buildSemanticIndex();
    }

    await this.saveMemory();
  }

  /**
   * Get recent conversations
   * @param {number} [limit] - Maximum number to return
   * @returns {Promise<Array>} Recent conversations
   */
  async getRecentConversations(limit = 10) {
    return this.memory.conversations
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
      .slice(0, limit);
  }

  /**
   * Get recent commands
   * @param {number} [limit] - Maximum number to return
   * @returns {Promise<Array>} Recent commands
   */
  async getRecentCommands(limit = 10) {
    return this.memory.commands
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
      .slice(0, limit);
  }

  /**
   * Update user preference
   * @param {string} key - Preference key
   * @param {*} value - Preference value
   * @returns {Promise<void>}
   */
  async setPreference(key, value) {
    this.memory.preferences[key] = value;
    await this.saveMemory();
  }

  /**
   * Get user preference
   * @param {string} key - Preference key
   * @param {*} [defaultValue] - Default value
   * @returns {*} Preference value
   */
  getPreference(key, defaultValue = null) {
    return this.memory.preferences[key] || defaultValue;
  }

  /**
   * Update working directory context
   * @param {string} directory - Directory path
   * @param {Object} context - Directory context
   * @returns {Promise<void>}
   */
  async updateWorkingDirectory(directory, context) {
    this.memory.workingDirectories[directory] = {
      ...context,
      lastAccessed: new Date().toISOString(),
    };
    await this.saveMemory();
  }

  /**
   * Get working directory context
   * @param {string} directory - Directory path
   * @returns {Object|null} Directory context
   */
  getWorkingDirectoryContext(directory) {
    return this.memory.workingDirectories[directory] || null;
  }

  // Private helper methods

  /**
   * Get default memory structure
   * @returns {Object} Default memory object
   */
  getDefaultMemory() {
    return {
      conversations: [],
      commands: [],
      preferences: {},
      workingDirectories: {},
      version: '1.0.0',
      created: new Date().toISOString(),
    };
  }

  /**
   * Generate unique ID
   * @returns {string} Unique identifier
   */
  generateId() {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Extract semantic tags from text
   * @param {string} query - Query text
   * @param {string} response - Response text
   * @returns {Array<string>} Semantic tags
   */
  extractSemanticTags(query, response) {
    const text = `${query} ${response}`.toLowerCase();
    const tags = [];

    // Technical keywords
    const techKeywords = [
      'git',
      'npm',
      'node',
      'javascript',
      'python',
      'docker',
      'kubernetes',
      'react',
      'vue',
      'angular',
      'express',
      'database',
      'sql',
      'mongodb',
      'api',
      'rest',
      'graphql',
      'test',
      'debug',
      'deploy',
      'build',
    ];

    // Command patterns
    const commandPatterns = [
      /\b(ls|cd|mkdir|rm|cp|mv|grep|find|awk|sed)\b/g,
      /\b(git add|git commit|git push|git pull|git status)\b/g,
      /\b(npm install|npm run|npm test|npm build)\b/g,
    ];

    // Extract tech keywords
    for (const keyword of techKeywords) {
      if (text.includes(keyword)) {
        tags.push(keyword);
      }
    }

    // Extract command patterns
    for (const pattern of commandPatterns) {
      const matches = text.match(pattern);
      if (matches) {
        tags.push(...matches);
      }
    }

    // Extract file extensions
    const extensionMatches = text.match(/\.\w{2,4}\b/g);
    if (extensionMatches) {
      tags.push(...extensionMatches);
    }

    return [...new Set(tags)]; // Remove duplicates
  }

  /**
   * Calculate semantic similarity between tag sets
   * @param {Array<string>} tags1 - First tag set
   * @param {Array<string>} tags2 - Second tag set
   * @returns {number} Similarity score (0-1)
   */
  calculateSemanticSimilarity(tags1, tags2) {
    if (!tags1.length || !tags2.length) {
      return 0;
    }

    const set1 = new Set(tags1);
    const set2 = new Set(tags2);
    const intersection = new Set([...set1].filter((x) => set2.has(x)));
    const union = new Set([...set1, ...set2]);

    return intersection.size / union.size;
  }
  /**
   * Build semantic index for fast searching
   */
  buildSemanticIndex() {
    this.semanticIndex.clear();

    for (const conversation of this.memory.conversations) {
      if (conversation.semanticTags) {
        this.updateSemanticIndex(conversation);
      }
    }
  }
  /**
   * Update semantic index with new conversation
   * @param {Object} conversation - Conversation to index
   */
  updateSemanticIndex(conversation) {
    if (conversation.semanticTags && Array.isArray(conversation.semanticTags)) {
      for (const tag of conversation.semanticTags) {
        if (!this.semanticIndex.has(tag)) {
          this.semanticIndex.set(tag, []);
        }
        this.semanticIndex.get(tag).push(conversation.id);
      }
    }
  }

  /**
   * Enforce memory size limits
   * @param {Object} memory - Memory object to limit
   */
  enforceMemoryLimits(memory) {
    const maxSize = this.configService
      ? this.configService.get('maxMemorySize', 50000) // Increase default for testing
      : 50000;
    const currentSize = JSON.stringify(memory).length;

    // Only enforce limits if we're significantly over the limit
    if (currentSize > maxSize * 2) {
      // Remove oldest conversations first
      const conversationsToRemove = Math.ceil(
        memory.conversations.length * 0.1
      );
      memory.conversations.splice(0, conversationsToRemove);

      // Remove oldest commands
      const commandsToRemove = Math.ceil(memory.commands.length * 0.1);
      memory.commands.splice(0, commandsToRemove);
    }
  }
}

module.exports = MemoryService;
