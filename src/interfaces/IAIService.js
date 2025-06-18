/**
 * AI Service Interface
 * Defines the contract for AI model interactions and query processing
 */
class IAIService {
  /**
   * Initialize AI clients and model selection
   * @param {Object} config - Configuration object containing API keys and preferences
   * @returns {Promise<void>}
   */
  async initialize(config) {
    throw new Error('IAIService.initialize() must be implemented');
  }

  /**
   * Query AI with intelligent model selection
   * @param {string} prompt - The user's query or prompt
   * @param {Object} context - Current context information
   * @param {string} [preferredModel] - Optional preferred model override
   * @returns {Promise<Object>} Response object with content, model used, and metadata
   */
  async queryAI(prompt, context, preferredModel = null) {
    throw new Error('IAIService.queryAI() must be implemented');
  }

  /**
   * Select the optimal AI model based on query type and context
   * @param {string} query - The user's query
   * @param {Object} context - Current context information
   * @returns {string} Selected model identifier
   */
  selectModel(query, context) {
    throw new Error('IAIService.selectModel() must be implemented');
  }

  /**
   * Get available AI models and their capabilities
   * @returns {Array<Object>} Array of model objects with capabilities
   */
  getAvailableModels() {
    throw new Error('IAIService.getAvailableModels() must be implemented');
  }

  /**
   * Check if AI service is properly configured
   * @returns {boolean} True if configured and ready
   */
  isConfigured() {
    throw new Error('IAIService.isConfigured() must be implemented');
  }

  /**
   * Get model performance statistics
   * @returns {Object} Performance metrics by model
   */
  getPerformanceStats() {
    throw new Error('IAIService.getPerformanceStats() must be implemented');
  }
}

module.exports = IAIService;
