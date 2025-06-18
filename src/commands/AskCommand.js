/**
 * Ask Command Implementation
 * Handles AI queries and conversations
 */
const ICommand = require('../interfaces/ICommand');

class AskCommand extends ICommand {
  constructor(aiService, memoryService, contextService, logger) {
    super();
    this.aiService = aiService;
    this.memoryService = memoryService;
    this.contextService = contextService;
    this.logger = logger;
  }

  /**
   * Get command definition
   * @returns {Object} Command definition
   */
  getDefinition() {
    return {
      name: 'ask',
      description: 'Ask AI a question with full context awareness',
      aliases: ['q', 'query'],
      usage: 'ask <question>',
      examples: [
        'ask "How do I optimize this Node.js project?"',
        'ask "What are the security vulnerabilities in my dependencies?"',
        'ask "Explain this error message"',
      ],
    };
  }

  /**
   * Validate command arguments
   * @param {Array} args - Command arguments
   * @param {Object} options - Command options
   * @returns {boolean} True if valid
   */
  validate(args, options) {
    if (!args || args.length === 0) {
      throw new Error('Please provide a question to ask');
    }

    const query = args.join(' ').trim();
    if (!query) {
      throw new Error('Question cannot be empty');
    }

    return true;
  }

  /**
   * Execute the ask command
   * @param {Object} context - Execution context
   * @param {Array} args - Command arguments
   * @param {Object} options - Command options
   * @returns {Promise<string>} AI response
   */
  async execute(context, args, options) {
    try {
      // Validate arguments
      this.validate(args, options);

      const query = args.join(' ').trim();
      this.logger?.info(`Processing query: ${query}`);

      // Get current context
      const currentContext = await this.contextService.gatherContext();

      // Select appropriate model
      const model = this.aiService.selectModel(query, currentContext);
      this.logger?.info(`Selected model: ${model}`);

      // Query AI with context
      const response = await this.aiService.query(query, model, currentContext);

      // Store conversation in memory
      const conversation = {
        id: this.generateId(),
        query,
        response,
        model,
        timestamp: new Date().toISOString(),
        context: {
          workingDirectory: currentContext.workingDirectory,
          projectType: currentContext.projectType,
          gitStatus: currentContext.gitStatus,
        },
      };

      await this.memoryService.addConversation(conversation);

      return response;
    } catch (error) {
      this.logger?.error('Ask command failed:', error);
      throw error;
    }
  }

  /**
   * Generate unique conversation ID
   * @returns {string} Unique ID
   */
  generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }
}

module.exports = AskCommand;
