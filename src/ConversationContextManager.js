const chalk = require('chalk');

/**
 * Conversation Context Manager
 * Maintains context across multi-turn conversations and improves coherence
 */
class ConversationContextManager {
  constructor(aia) {
    this.aia = aia;
    this.conversationHistory = [];
    this.activeContext = new Map();
    this.topicStack = [];
    this.referenceResolver = new ReferenceResolver();
    this.contextWindow = 10; // Number of previous exchanges to consider
  }

  /**
   * Process user input within conversation context
   */
  async processInContext(userInput, sessionId = 'default') {
    console.log(chalk.blue('💬 Processing input with conversation context...'));

    const contextualInput = await this.enrichInputWithContext(
      userInput,
      sessionId
    );
    const resolvedReferences = await this.resolveReferences(
      contextualInput,
      sessionId
    );
    const topicContinuity = this.analyzeTopicContinuity(
      resolvedReferences,
      sessionId
    );

    return {
      originalInput: userInput,
      contextualInput: contextualInput.enriched,
      resolvedReferences,
      topicContinuity,
      conversationState: this.getConversationState(sessionId),
      suggestedClarifications: this.generateClarifications(
        contextualInput,
        sessionId
      ),
    };
  }

  /**
   * Enrich user input with conversation context
   */
  async enrichInputWithContext(userInput, sessionId) {
    const recentHistory = this.getRecentHistory(sessionId);
    const currentTopic = this.getCurrentTopic(sessionId);
    const implicitContext = this.extractImplicitContext(
      userInput,
      recentHistory
    );

    let enrichedInput = userInput;
    const enrichments = [];

    // Add implicit subject if missing
    if (this.isMissingSubject(userInput) && currentTopic) {
      enrichedInput = `${currentTopic.subject} ${userInput}`;
      enrichments.push(`Added implicit subject: ${currentTopic.subject}`);
    }

    // Add project context if relevant
    if (
      this.isProjectRelated(userInput) &&
      !this.hasProjectContext(userInput)
    ) {
      const projectContext = await this.getCurrentProjectContext();
      if (projectContext) {
        enrichedInput = `${enrichedInput} in ${projectContext}`;
        enrichments.push(`Added project context: ${projectContext}`);
      }
    }

    // Add continuation context
    if (this.isContinuation(userInput) && recentHistory.length > 0) {
      const lastAction = this.extractLastAction(recentHistory);
      if (lastAction) {
        enrichedInput = `Continue ${lastAction}: ${userInput}`;
        enrichments.push(`Added continuation context: ${lastAction}`);
      }
    }

    return {
      original: userInput,
      enriched: enrichedInput,
      enrichments,
      confidence: this.calculateEnrichmentConfidence(enrichments),
    };
  }

  /**
   * Resolve pronouns and references to previous conversation elements
   */
  async resolveReferences(contextualInput, sessionId) {
    return this.referenceResolver.resolve(
      contextualInput,
      this.getRecentHistory(sessionId)
    );
  }

  /**
   * Analyze topic continuity in conversation
   */
  analyzeTopicContinuity(input, sessionId) {
    const currentTopic = this.getCurrentTopic(sessionId);
    const previousTopics = this.getTopicHistory(sessionId);

    const continuity = {
      isTopicContinuation: false,
      isTopicShift: false,
      isTopicReturn: false,
      confidence: 0,
      suggestedTopic: null,
    };

    if (currentTopic) {
      const similarity = this.calculateTopicSimilarity(
        input.contextualInput,
        currentTopic.keywords
      );
      if (similarity > 0.7) {
        continuity.isTopicContinuation = true;
        continuity.confidence = similarity;
      } else if (similarity < 0.3) {
        continuity.isTopicShift = true;
        continuity.suggestedTopic = this.extractNewTopic(input.contextualInput);
      }
    }

    // Check for topic return
    for (const previousTopic of previousTopics.slice(-5)) {
      const similarity = this.calculateTopicSimilarity(
        input.contextualInput,
        previousTopic.keywords
      );
      if (similarity > 0.8) {
        continuity.isTopicReturn = true;
        continuity.confidence = similarity;
        break;
      }
    }

    return continuity;
  }

  /**
   * Update conversation state after processing
   */
  updateConversationState(userInput, aiResponse, sessionId = 'default') {
    const exchange = {
      timestamp: new Date().toISOString(),
      userInput,
      aiResponse,
      topic: this.extractTopic(userInput),
      entities: this.extractConversationalEntities(userInput),
      sentiment: this.analyzeSentiment(userInput),
      completionStatus: this.analyzeCompletionStatus(aiResponse),
    };

    this.conversationHistory.push(exchange);
    this.updateTopicStack(exchange.topic, sessionId);
    this.updateActiveContext(exchange, sessionId);

    // Maintain conversation window
    if (this.conversationHistory.length > 50) {
      this.conversationHistory = this.conversationHistory.slice(-40);
    }
  }

  /**
   * Generate clarifying questions when input is ambiguous
   */
  generateClarifications(contextualInput, sessionId) {
    const clarifications = [];

    // Check for ambiguous pronouns
    const ambiguousPronouns = this.findAmbiguousPronouns(
      contextualInput.enriched
    );
    if (ambiguousPronouns.length > 0) {
      clarifications.push({
        type: 'pronoun_ambiguity',
        question: `What does "${ambiguousPronouns[0]}" refer to?`,
        priority: 'high',
      });
    }

    // Check for missing scope
    if (this.isMissingScope(contextualInput.enriched)) {
      clarifications.push({
        type: 'scope_missing',
        question:
          'Which specific files, directories, or components should I focus on?',
        priority: 'medium',
      });
    }

    // Check for incomplete specifications
    const incompleteSpecs = this.findIncompleteSpecifications(
      contextualInput.enriched
    );
    if (incompleteSpecs.length > 0) {
      clarifications.push({
        type: 'incomplete_specification',
        question: `Please specify: ${incompleteSpecs.join(', ')}`,
        priority: 'medium',
      });
    }

    return clarifications.slice(0, 3); // Limit to top 3 clarifications
  }

  /**
   * Maintain conversation memory across sessions
   */
  getConversationMemory(sessionId = 'default', lookback = 5) {
    return this.conversationHistory
      .filter((exchange) => exchange.sessionId === sessionId)
      .slice(-lookback)
      .map((exchange) => ({
        userIntent: exchange.topic,
        outcome: exchange.completionStatus,
        entities: exchange.entities,
        context: exchange.context,
      }));
  }

  /**
   * Add user input to conversation context
   */
  addUserInput(userInput, nlpAnalysis, sessionId = 'default') {
    const contextEntry = {
      type: 'user_input',
      content: userInput,
      nlpAnalysis: nlpAnalysis,
      timestamp: new Date().toISOString(),
      sessionId: sessionId,
    };

    this.conversationHistory.push(contextEntry);
    this.updateActiveContext(contextEntry, sessionId);

    // Update topic stack
    if (nlpAnalysis && nlpAnalysis.entities) {
      const topics = [
        ...nlpAnalysis.entities.technologies,
        ...nlpAnalysis.entities.tools,
        ...nlpAnalysis.entities.targets,
      ];
      this.updateTopicStack(topics, sessionId);
    }
  }

  /**
   * Add execution result to conversation context
   */
  addExecutionResult(
    goal,
    executionResult,
    evaluation,
    nlpAnalysis,
    sessionId = 'default'
  ) {
    const contextEntry = {
      type: 'execution_result',
      goal: goal,
      executionResult: executionResult,
      evaluation: evaluation,
      nlpAnalysis: nlpAnalysis,
      timestamp: new Date().toISOString(),
      sessionId: sessionId,
    };

    this.conversationHistory.push(contextEntry);
    this.updateActiveContext(contextEntry, sessionId);
  }

  /**
   * Get relevant context for the current goal
   */
  getRelevantContext(currentGoal, sessionId = 'default') {
    const recentHistory = this.conversationHistory
      .filter((entry) => entry.sessionId === sessionId)
      .slice(-this.contextWindow);

    const relevantEntries = recentHistory.filter((entry) => {
      if (entry.type === 'user_input') {
        return this.isTopicRelevant(entry.content, currentGoal);
      } else if (entry.type === 'execution_result') {
        return this.isTopicRelevant(entry.goal, currentGoal);
      }
      return false;
    });

    return {
      recentHistory: recentHistory.map((entry) => ({
        type: entry.type,
        content: entry.content || entry.goal,
        timestamp: entry.timestamp,
        success: entry.evaluation?.goalAchieved,
      })),
      relevantEntries: relevantEntries.length,
      currentTopics: this.topicStack.slice(-5), // Last 5 topics
      activeContext: this.activeContext.get(sessionId) || {},
    };
  }

  /**
   * Update active context with new entry
   */
  updateActiveContext(entry, sessionId) {
    if (!this.activeContext.has(sessionId)) {
      this.activeContext.set(sessionId, {});
    }

    const context = this.activeContext.get(sessionId);

    if (entry.nlpAnalysis) {
      // Update active entities
      context.activeEntities = {
        ...context.activeEntities,
        ...entry.nlpAnalysis.entities,
      };

      // Update active intent
      context.activeIntent = entry.nlpAnalysis.intent;
    }

    if (entry.type === 'execution_result') {
      context.lastExecution = {
        goal: entry.goal,
        success: entry.evaluation?.goalAchieved,
        timestamp: entry.timestamp,
      };
    }
  }

  /**
   * Update topic stack with new topics
   */
  updateTopicStack(newTopics, sessionId) {
    // Simple topic tracking - add new topics to stack
    newTopics.forEach((topic) => {
      const topicEntry = {
        topic,
        sessionId,
        timestamp: new Date().toISOString(),
      };

      // Remove existing instances of this topic
      this.topicStack = this.topicStack.filter(
        (t) => t.topic !== topic || t.sessionId !== sessionId
      );

      // Add to top of stack
      this.topicStack.push(topicEntry);
    });

    // Keep stack manageable
    if (this.topicStack.length > 50) {
      this.topicStack = this.topicStack.slice(-50);
    }
  }

  /**
   * Analyze sentiment in the input text
   */
  analyzeSentiment(input) {
    // Simple sentiment analysis
    const positiveWords = [
      'good',
      'great',
      'excellent',
      'perfect',
      'awesome',
      'love',
    ];
    const negativeWords = [
      'bad',
      'terrible',
      'awful',
      'hate',
      'broken',
      'wrong',
    ];

    const positive = positiveWords.filter((word) =>
      input.toLowerCase().includes(word)
    ).length;
    const negative = negativeWords.filter((word) =>
      input.toLowerCase().includes(word)
    ).length;

    if (positive > negative) return 'positive';
    if (negative > positive) return 'negative';
    return 'neutral';
  }

  /**
   * Analyze completion status of the AI response
   */
  analyzeCompletionStatus(response) {
    const successIndicators = [
      'completed',
      'done',
      'success',
      'finished',
      'achieved',
    ];
    const partialIndicators = ['partially', 'some', 'incomplete', 'progress'];
    const failureIndicators = [
      'failed',
      'error',
      'unable',
      "couldn't",
      'impossible',
    ];

    const hasSuccess = successIndicators.some((indicator) =>
      response.toLowerCase().includes(indicator)
    );
    const hasPartial = partialIndicators.some((indicator) =>
      response.toLowerCase().includes(indicator)
    );
    const hasFailure = failureIndicators.some((indicator) =>
      response.toLowerCase().includes(indicator)
    );

    if (hasSuccess) return 'complete';
    if (hasPartial) return 'partial';
    if (hasFailure) return 'failed';
    return 'unclear';
  }

  /**
   * Helper methods
   */
  getRecentHistory(sessionId, count = 5) {
    return this.conversationHistory
      .filter((ex) => ex.sessionId === sessionId)
      .slice(-count);
  }

  getCurrentTopic(sessionId) {
    return this.topicStack.find((topic) => topic.sessionId === sessionId);
  }

  getTopicHistory(sessionId) {
    return this.topicStack.filter((topic) => topic.sessionId === sessionId);
  }

  isMissingSubject(input) {
    const subjectIndicators = ['it', 'this', 'that', 'they', 'them'];
    return subjectIndicators.some((indicator) =>
      input.toLowerCase().startsWith(indicator)
    );
  }

  isProjectRelated(input) {
    const projectKeywords = [
      'project',
      'codebase',
      'application',
      'repo',
      'files',
    ];
    return projectKeywords.some((keyword) =>
      input.toLowerCase().includes(keyword)
    );
  }

  hasProjectContext(input) {
    const contextIndicators = ['in this', 'in the', 'for this', 'of this'];
    return contextIndicators.some((indicator) =>
      input.toLowerCase().includes(indicator)
    );
  }

  isContinuation(input) {
    const continuationWords = [
      'also',
      'additionally',
      'furthermore',
      'next',
      'then',
      'continue',
    ];
    return continuationWords.some((word) => input.toLowerCase().includes(word));
  }

  async getCurrentProjectContext() {
    try {
      const context = await this.aia.gatherContext();
      return context.projectType || context.workingDirectory;
    } catch (error) {
      return null;
    }
  }

  extractLastAction(history) {
    if (history.length === 0) return null;

    const lastExchange = history[history.length - 1];
    const actionWords = [
      'analyze',
      'create',
      'fix',
      'update',
      'deploy',
      'test',
    ];

    for (const action of actionWords) {
      if (lastExchange.userInput.toLowerCase().includes(action)) {
        return action;
      }
    }

    return null;
  }

  calculateEnrichmentConfidence(enrichments) {
    if (enrichments.length === 0) return 1.0;
    return Math.max(0.6, 1.0 - enrichments.length * 0.1);
  }

  calculateTopicSimilarity(input, keywords) {
    if (!keywords || keywords.length === 0) return 0;

    const inputWords = input.toLowerCase().split(/\s+/);
    const matches = keywords.filter((keyword) =>
      inputWords.some((word) => word.includes(keyword.toLowerCase()))
    );

    return matches.length / keywords.length;
  }

  extractTopic(input) {
    const words = input.toLowerCase().split(/\s+/);
    const topicWords = words.filter((word) => word.length > 3);
    return {
      keywords: topicWords.slice(0, 5),
      mainSubject: topicWords[0],
      timestamp: new Date().toISOString(),
    };
  }

  extractNewTopic(input) {
    const topic = this.extractTopic(input);
    return {
      subject: topic.mainSubject,
      keywords: topic.keywords,
      confidence: 0.8,
    };
  }

  extractConversationalEntities(input) {
    // Extract entities specific to conversation flow
    return {
      references: this.findReferences(input),
      temporalMarkers: this.findTemporalMarkers(input),
      scopeIndicators: this.findScopeIndicators(input),
    };
  }

  findReferences(input) {
    const pronouns = ['it', 'this', 'that', 'they', 'them', 'these', 'those'];
    return pronouns.filter((pronoun) => input.toLowerCase().includes(pronoun));
  }

  findTemporalMarkers(input) {
    const markers = [
      'now',
      'then',
      'next',
      'before',
      'after',
      'previously',
      'currently',
    ];
    return markers.filter((marker) => input.toLowerCase().includes(marker));
  }

  findScopeIndicators(input) {
    const indicators = [
      'all',
      'every',
      'each',
      'specific',
      'particular',
      'only',
    ];
    return indicators.filter((indicator) =>
      input.toLowerCase().includes(indicator)
    );
  }

  /**
   * Check if topics are relevant to each other
   */
  isTopicRelevant(text1, text2) {
    const keywords1 = this.extractKeywords(text1.toLowerCase());
    const keywords2 = this.extractKeywords(text2.toLowerCase());

    // Simple relevance check - shared keywords
    const sharedKeywords = keywords1.filter((k) => keywords2.includes(k));
    return sharedKeywords.length > 0;
  }

  /**
   * Extract keywords from text for relevance matching
   */
  extractKeywords(text) {
    return text
      .split(/\s+/)
      .filter((word) => word.length > 3)
      .filter(
        (word) =>
          ![
            'with',
            'from',
            'that',
            'this',
            'have',
            'will',
            'been',
            'make',
          ].includes(word)
      );
  }
}

/**
 * Reference Resolver for handling pronouns and contextual references
 */
class ReferenceResolver {
  async resolve(input, conversationHistory) {
    let resolvedInput = input.contextualInput || input;
    const resolutions = [];

    // Resolve "it" references
    resolvedInput = this.resolveItReferences(
      resolvedInput,
      conversationHistory,
      resolutions
    );

    // Resolve "this" references
    resolvedInput = this.resolveThisReferences(
      resolvedInput,
      conversationHistory,
      resolutions
    );

    // Resolve "that" references
    resolvedInput = this.resolveThatReferences(
      resolvedInput,
      conversationHistory,
      resolutions
    );

    return {
      original: input.contextualInput || input,
      resolved: resolvedInput,
      resolutions,
    };
  }

  resolveItReferences(input, history, resolutions) {
    if (
      !input.toLowerCase().includes(' it ') &&
      !input.toLowerCase().startsWith('it ')
    ) {
      return input;
    }

    const lastMentionedEntity = this.findLastMentionedEntity(history);
    if (lastMentionedEntity) {
      const resolved = input.replace(/\bit\b/gi, lastMentionedEntity);
      resolutions.push({
        original: 'it',
        resolved: lastMentionedEntity,
        confidence: 0.8,
      });
      return resolved;
    }

    return input;
  }

  resolveThisReferences(input, history, resolutions) {
    if (
      !input.toLowerCase().includes(' this ') &&
      !input.toLowerCase().startsWith('this ')
    ) {
      return input;
    }

    const currentContext = this.findCurrentContext(history);
    if (currentContext) {
      const resolved = input.replace(/\bthis\b/gi, `this ${currentContext}`);
      resolutions.push({
        original: 'this',
        resolved: `this ${currentContext}`,
        confidence: 0.7,
      });
      return resolved;
    }

    return input;
  }

  resolveThatReferences(input, history, resolutions) {
    if (
      !input.toLowerCase().includes(' that ') &&
      !input.toLowerCase().startsWith('that ')
    ) {
      return input;
    }

    const referencedAction = this.findLastAction(history);
    if (referencedAction) {
      const resolved = input.replace(/\bthat\b/gi, `that ${referencedAction}`);
      resolutions.push({
        original: 'that',
        resolved: `that ${referencedAction}`,
        confidence: 0.7,
      });
      return resolved;
    }

    return input;
  }

  findLastMentionedEntity(history) {
    for (let i = history.length - 1; i >= 0; i--) {
      const exchange = history[i];
      const entities = [
        'file',
        'project',
        'component',
        'module',
        'service',
        'application',
      ];

      for (const entity of entities) {
        if (exchange.userInput.toLowerCase().includes(entity)) {
          return entity;
        }
      }
    }
    return null;
  }

  findCurrentContext(history) {
    if (history.length === 0) return null;

    const lastExchange = history[history.length - 1];
    const contexts = ['project', 'file', 'directory', 'component', 'module'];

    for (const context of contexts) {
      if (lastExchange.userInput.toLowerCase().includes(context)) {
        return context;
      }
    }

    return null;
  }

  findLastAction(history) {
    for (let i = history.length - 1; i >= 0; i--) {
      const exchange = history[i];
      const actions = [
        'analysis',
        'creation',
        'update',
        'deployment',
        'optimization',
      ];

      for (const action of actions) {
        if (exchange.userInput.toLowerCase().includes(action.slice(0, -2))) {
          // Remove 'ion' suffix
          return action;
        }
      }
    }
    return null;
  }
}

module.exports = ConversationContextManager;
