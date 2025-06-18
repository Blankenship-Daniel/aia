/**
 * Memory Service Interface
 * Defines the contract for persistent memory operations and data management
 */
class IMemoryService {
  /**
   * Initialize the memory service and load existing data
   * @returns {Promise<Object>} Loaded memory object
   */
  async initialize() {
    throw new Error('IMemoryService.initialize() must be implemented');
  }

  /**
   * Load memory from persistent storage
   * @returns {Promise<Object>} Memory object containing conversations, commands, etc.
   */
  async loadMemory() {
    throw new Error('IMemoryService.loadMemory() must be implemented');
  }

  /**
   * Save current memory state to persistent storage
   * @param {Object} [memory] - Optional memory object to save
   * @returns {Promise<void>}
   */
  async saveMemory(memory = null) {
    throw new Error('IMemoryService.saveMemory() must be implemented');
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
    throw new Error('IMemoryService.addConversation() must be implemented');
  }

  /**
   * Add a command execution to memory
   * @param {string} command - Command that was executed
   * @param {Object} result - Execution result
   * @param {Object} context - Context at time of execution
   * @returns {Promise<void>}
   */
  async addCommand(command, result, context) {
    throw new Error('IMemoryService.addCommand() must be implemented');
  }

  /**
   * Search memory with semantic or keyword search
   * @param {string} query - Search query
   * @param {number} [limit=10] - Maximum number of results
   * @param {string} [type] - Filter by type ('conversation', 'command', 'all')
   * @returns {Promise<Array>} Array of search results with relevance scores
   */
  async searchMemory(query, limit = 10, type = 'all') {
    throw new Error('IMemoryService.searchMemory() must be implemented');
  }

  /**
   * Get memory statistics and usage information
   * @returns {Object} Statistics object with counts, sizes, and performance metrics
   */
  getMemoryStats() {
    throw new Error('IMemoryService.getMemoryStats() must be implemented');
  }

  /**
   * Clear all or specific types of memory
   * @param {string} [type] - Optional type to clear ('conversations', 'commands', 'all')
   * @returns {Promise<void>}
   */
  async clearMemory(type = 'all') {
    throw new Error('IMemoryService.clearMemory() must be implemented');
  }

  /**
   * Get recent conversations
   * @param {number} [limit=10] - Number of recent conversations to retrieve
   * @returns {Array} Recent conversations
   */
  getRecentConversations(limit = 10) {
    throw new Error(
      'IMemoryService.getRecentConversations() must be implemented'
    );
  }

  /**
   * Get recent commands
   * @param {number} [limit=10] - Number of recent commands to retrieve
   * @returns {Array} Recent commands
   */
  getRecentCommands(limit = 10) {
    throw new Error('IMemoryService.getRecentCommands() must be implemented');
  }

  /**
   * Optimize memory by cleaning up old or irrelevant data
   * @returns {Promise<Object>} Cleanup statistics
   */
  async optimizeMemory() {
    throw new Error('IMemoryService.optimizeMemory() must be implemented');
  }
}

module.exports = IMemoryService;
