/**
 * Agent Command Implementation
 * Handles agentic reasoning and goal decomposition
 */
const ICommand = require('../interfaces/ICommand');
const AgenticReasoningEngine = require('../AgenticReasoningEngine');
const chalk = require('chalk');

class AgentCommand extends ICommand {
  constructor(
    aiService,
    memoryService,
    contextService,
    commandService,
    configurationService,
    logger
  ) {
    super();
    this.aiService = aiService;
    this.memoryService = memoryService;
    this.contextService = contextService;
    this.commandService = commandService;
    this.configurationService = configurationService;
    this.logger = logger;

    // Create a legacy AIA-compatible wrapper for the agentic reasoning engine
    this.aiaWrapper = this.createAIAWrapper();
    this.agenticEngine = new AgenticReasoningEngine(this.aiaWrapper);
  }

  /**
   * Create a wrapper object that provides the legacy AIA interface
   * for compatibility with the existing AgenticReasoningEngine
   */
  createAIAWrapper() {
    return {
      // Context gathering
      gatherContext: async () => {
        return await this.contextService.gatherContext();
      },

      // AI querying
      queryAI: async (prompt, model = null) => {
        const context = await this.contextService.gatherContext();
        const selectedModel =
          model || this.aiService.selectModel(prompt, context);
        const response = await this.aiService.queryAI(
          prompt,
          context,
          selectedModel
        );

        // Return just the content string for compatibility with legacy AgenticReasoningEngine
        return typeof response === 'object' && response.content
          ? response.content
          : response;
      },

      // Command execution
      executeCommand: async (command) => {
        return await this.commandService.executeCommand(command);
      },

      // Memory access (for compatibility with legacy AgenticReasoningEngine)
      get memory() {
        // Return the actual memory data, not the service
        return (
          this.memoryService.memory || {
            conversations: [],
            commands: [],
            preferences: {},
            workingDirectories: {},
          }
        );
      },

      // For direct access to memory service methods
      memoryService: this.memoryService,
      contextAnalyzer: this.contextService,

      // Logging
      log: (message) => {
        this.logger?.info(message);
      },
    };
  }

  /**
   * Get command definition
   * @returns {Object} Command definition
   */
  getDefinition() {
    return {
      name: 'agent',
      description:
        'Execute agentic reasoning to break down and solve complex goals',
      aliases: ['a', 'agentic'],
      usage: 'agent <goal> [options]',
      examples: [
        'agent "optimize this Node.js project for production"',
        'agent "set up automated testing" --auto-execute',
        'agent "debug the failing tests" --max-iterations 3',
        'agent "find all TODO comments and create a task list" --no-iteration',
      ],
      options: [
        {
          name: '--auto-execute',
          description: 'Execute commands without confirmation',
          type: 'boolean',
          default: false,
        },
        {
          name: '--max-iterations',
          description: 'Maximum number of refinement iterations',
          type: 'number',
          default: 5,
        },
        {
          name: '--no-iteration',
          description: 'Disable iterative refinement',
          type: 'boolean',
          default: false,
        },
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
    if (args.length === 0) {
      const usage = `
${chalk.bold('Usage:')} agent <goal> [options]

${chalk.bold('Examples:')}
  agent "optimize this Node.js project"
  agent "set up automated testing" --auto-execute
  agent "debug failing tests" --max-iterations 3

${chalk.bold('Options:')}
  --auto-execute       Execute commands without confirmation
  --max-iterations N   Maximum refinement iterations (1-20, default: 5)
  --no-iteration       Disable iterative refinement

${chalk.bold('Description:')}
The agent command uses agentic reasoning to break down complex goals into
actionable steps and execute them with optional user confirmation.`;

      throw new Error(`Agent command requires a goal.\n${usage}`);
    }

    if (
      options.maxIterations &&
      (options.maxIterations < 1 || options.maxIterations > 20)
    ) {
      throw new Error('Max iterations must be between 1 and 20');
    }

    return true;
  }

  /**
   * Execute the agent command
   * @param {Object} context - Execution context
   * @param {Array} args - Command arguments
   * @param {Object} options - Command options
   * @returns {Promise<Object>} Execution result
   */
  async execute(context, args, options = {}) {
    try {
      // Validate arguments
      this.validate(args, options);

      const goal = args.join(' ').trim();
      this.logger?.info(`Processing agentic goal: ${goal}`);

      // Configure agentic options - use config default if not explicitly set
      const configAutoExecute =
        this.configurationService?.get('autoExecute') || false;
      const agenticOptions = {
        autoExecute:
          options.autoExecute !== undefined
            ? options.autoExecute
            : configAutoExecute,
        maxIterations: options.maxIterations || 5,
        allowIteration: !options.noIteration,
      };

      // Set max iterations on the engine
      if (options.maxIterations) {
        this.agenticEngine.maxIterations = options.maxIterations;
      }

      // Execute agentic reasoning
      const result = await this.agenticEngine.executeAgenticQuery(
        goal,
        agenticOptions
      );

      // Store the agentic execution in memory
      const agenticRecord = {
        id: this.generateId(),
        goal,
        options: agenticOptions,
        result,
        timestamp: new Date().toISOString(),
        context: {
          workingDirectory: (await this.contextService.gatherContext())
            .workingDirectory,
        },
      };

      // Store in memory if available
      if (
        this.memoryService &&
        typeof this.memoryService.addAgenticExecution === 'function'
      ) {
        await this.memoryService.addAgenticExecution(agenticRecord);
      } else if (
        this.memoryService &&
        typeof this.memoryService.addConversation === 'function'
      ) {
        // Fallback to storing as a conversation
        await this.memoryService.addConversation({
          ...agenticRecord,
          query: `[AGENT] ${goal}`,
          response: JSON.stringify(result, null, 2),
        });
      }

      return result;
    } catch (error) {
      // Just re-throw the error, let the CLI application handle logging
      throw error;
    }
  }

  /**
   * Generate unique execution ID
   * @returns {string} Unique ID
   */
  generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }
}

module.exports = AgentCommand;
