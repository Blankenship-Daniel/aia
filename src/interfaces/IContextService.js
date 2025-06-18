/**
 * Context Service Interface
 * Defines the contract for context analysis and environment awareness
 */
class IContextService {
  /**
   * Initialize context service
   * @returns {Promise<void>}
   */
  async initialize() {
    throw new Error('IContextService.initialize() must be implemented');
  }

  /**
   * Gather comprehensive context information
   * @returns {Promise<Object>} Context object with environment details
   */
  async gatherContext() {
    throw new Error('IContextService.gatherContext() must be implemented');
  }

  /**
   * Analyze project structure and dependencies
   * @param {string} [directory] - Directory to analyze (defaults to current)
   * @returns {Promise<Object>} Project analysis results
   */
  async analyzeProject(directory = null) {
    throw new Error('IContextService.analyzeProject() must be implemented');
  }

  /**
   * Get git repository status and information
   * @param {string} [directory] - Directory to check (defaults to current)
   * @returns {Promise<Object>} Git status information
   */
  async getGitStatus(directory = null) {
    throw new Error('IContextService.getGitStatus() must be implemented');
  }

  /**
   * Detect project type based on files and structure
   * @param {string} [directory] - Directory to analyze (defaults to current)
   * @returns {Promise<string>} Project type identifier
   */
  async detectProjectType(directory = null) {
    throw new Error('IContextService.detectProjectType() must be implemented');
  }

  /**
   * Get system environment information
   * @returns {Promise<Object>} System environment details
   */
  async getSystemEnvironment() {
    throw new Error(
      'IContextService.getSystemEnvironment() must be implemented'
    );
  }

  /**
   * Calculate context relevance score
   * @param {Object} context - Context to score
   * @param {string} query - User query for relevance calculation
   * @returns {number} Relevance score (0-1)
   */
  calculateRelevance(context, query) {
    throw new Error('IContextService.calculateRelevance() must be implemented');
  }

  /**
   * Update context cache with new information
   * @param {string} key - Cache key
   * @param {Object} value - Value to cache
   * @param {number} [ttl] - Time to live in milliseconds
   * @returns {void}
   */
  updateCache(key, value, ttl = null) {
    throw new Error('IContextService.updateCache() must be implemented');
  }

  /**
   * Get cached context information
   * @param {string} key - Cache key
   * @returns {Object|null} Cached value or null if not found/expired
   */
  getFromCache(key) {
    throw new Error('IContextService.getFromCache() must be implemented');
  }

  /**
   * Clear context cache
   * @returns {void}
   */
  clearCache() {
    throw new Error('IContextService.clearCache() must be implemented');
  }
}

module.exports = IContextService;
