import chalk from 'chalk';

interface ConversationExchange {
  userInput: string;
  aiResponse: string;
  timestamp: string;
  context?: Record<string, unknown>;
}

interface Topic {
  subject: string;
  keywords: string[];
  confidence: number;
  startTime: string;
}

interface ContextualInput {
  original: string;
  enriched: string;
  enrichments: string[];
  confidence: number;
}

interface ResolvedReferences {
  original: string;
  resolved: string;
  resolutions: ReferenceResolution[];
  confidence: number;
}

interface ReferenceResolution {
  type: 'it' | 'this' | 'that' | 'pronoun';
  original: string;
  resolved: string;
  confidence: number;
}

interface TopicContinuity {
  current: Topic | null;
  previous: Topic | null;
  continuation: boolean;
  confidence: number;
  transition?: string;
}

interface ConversationState {
  sessionId: string;
  historyLength: number;
  currentTopic: Topic | null;
  activeContextCount: number;
  lastActivity: string;
}

interface ProcessedInput {
  originalInput: string;
  contextualInput: string;
  resolvedReferences: ResolvedReferences;
  topicContinuity: TopicContinuity;
  conversationState: ConversationState;
  suggestedClarifications: string[];
}

/**
 * Reference Resolver for handling pronouns and contextual references
 */
class ReferenceResolver {
  public async resolve(
    input: ContextualInput | string,
    conversationHistory: ConversationExchange[]
  ): Promise<ResolvedReferences> {
    let resolvedInput = typeof input === 'string' ? input : input.enriched;
    const resolutions: ReferenceResolution[] = [];

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
      original: typeof input === 'string' ? input : input.enriched,
      resolved: resolvedInput,
      resolutions,
      confidence: this.calculateResolutionConfidence(resolutions),
    };
  }

  private resolveItReferences(
    input: string,
    history: ConversationExchange[],
    resolutions: ReferenceResolution[]
  ): string {
    const itPattern = /\bit\b/gi;
    let resolved = input;

    const matches = input.match(itPattern);
    if (!matches) return resolved;

    // Find the most recent noun phrase that "it" could refer to
    for (let i = history.length - 1; i >= 0; i--) {
      const exchange = history[i];
      const nouns = this.extractNouns(exchange.aiResponse);

      if (nouns.length > 0) {
        const referent = nouns[0]; // Use the most prominent noun
        resolved = resolved.replace(itPattern, referent);
        resolutions.push({
          type: 'it',
          original: 'it',
          resolved: referent,
          confidence: 0.7,
        });
        break;
      }
    }

    return resolved;
  }

  private resolveThisReferences(
    input: string,
    history: ConversationExchange[],
    resolutions: ReferenceResolution[]
  ): string {
    const thisPattern = /\bthis\b/gi;
    let resolved = input;

    const matches = input.match(thisPattern);
    if (!matches) return resolved;

    // "This" usually refers to something recently mentioned
    if (history.length > 0) {
      const lastExchange = history[history.length - 1];
      const concepts = this.extractConcepts(lastExchange.aiResponse);

      if (concepts.length > 0) {
        const referent = concepts[0];
        resolved = resolved.replace(thisPattern, `this ${referent}`);
        resolutions.push({
          type: 'this',
          original: 'this',
          resolved: `this ${referent}`,
          confidence: 0.8,
        });
      }
    }

    return resolved;
  }

  private resolveThatReferences(
    input: string,
    history: ConversationExchange[],
    resolutions: ReferenceResolution[]
  ): string {
    const thatPattern = /\bthat\b/gi;
    let resolved = input;

    const matches = input.match(thatPattern);
    if (!matches) return resolved;

    // "That" often refers to a process or concept from earlier
    for (
      let i = history.length - 1;
      i >= Math.max(0, history.length - 3);
      i--
    ) {
      const exchange = history[i];
      const processes = this.extractProcesses(exchange.aiResponse);

      if (processes.length > 0) {
        const referent = processes[0];
        resolved = resolved.replace(thatPattern, `that ${referent}`);
        resolutions.push({
          type: 'that',
          original: 'that',
          resolved: `that ${referent}`,
          confidence: 0.6,
        });
        break;
      }
    }

    return resolved;
  }

  private extractNouns(text: string): string[] {
    // Simple noun extraction - in production, use proper NLP
    const words = text.toLowerCase().split(/\s+/);
    const commonNouns = [
      'file',
      'function',
      'class',
      'method',
      'variable',
      'code',
      'error',
      'bug',
      'issue',
    ];
    return words.filter((word) => commonNouns.includes(word));
  }

  private extractConcepts(text: string): string[] {
    // Extract conceptual phrases
    const concepts = [
      'approach',
      'solution',
      'method',
      'technique',
      'strategy',
      'pattern',
    ];
    const words = text.toLowerCase().split(/\s+/);
    return words.filter((word) => concepts.includes(word));
  }

  private extractProcesses(text: string): string[] {
    // Extract process-related terms
    const processes = [
      'installation',
      'configuration',
      'deployment',
      'testing',
      'optimization',
    ];
    const words = text.toLowerCase().split(/\s+/);
    return words.filter((word) => processes.includes(word));
  }

  private calculateResolutionConfidence(
    resolutions: ReferenceResolution[]
  ): number {
    if (resolutions.length === 0) return 1.0;

    const totalConfidence = resolutions.reduce(
      (sum, res) => sum + res.confidence,
      0
    );
    return totalConfidence / resolutions.length;
  }
}

/**
 * Conversation Context Manager
 * Maintains context across multi-turn conversations and improves coherence
 */
export class ConversationContextManager {
  private aia: {
    queryAI: (prompt: string) => Promise<string>;
  };
  private conversationHistory: Map<string, ConversationExchange[]>;
  private activeContext: Map<string, Record<string, unknown>>;
  private topicStack: Map<string, Topic[]>;
  private referenceResolver: ReferenceResolver;
  private contextWindow: number;

  constructor(aia: { queryAI: (prompt: string) => Promise<string> }) {
    this.aia = aia;
    this.conversationHistory = new Map<string, ConversationExchange[]>();
    this.activeContext = new Map<string, Record<string, unknown>>();
    this.topicStack = new Map<string, Topic[]>();
    this.referenceResolver = new ReferenceResolver();
    this.contextWindow = 10; // Number of previous exchanges to consider
  }

  /**
   * Process user input within conversation context
   */
  public async processInContext(
    userInput: string,
    sessionId: string = 'default'
  ): Promise<ProcessedInput> {
    console.log(chalk.blue('💬 Processing input with conversation context...'));

    const contextualInput = await this.enrichInputWithContext(
      userInput,
      sessionId
    );
    const resolvedReferences = await this.referenceResolver.resolve(
      contextualInput,
      this.getRecentHistory(sessionId)
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
  private async enrichInputWithContext(
    userInput: string,
    sessionId: string
  ): Promise<ContextualInput> {
    const recentHistory = this.getRecentHistory(sessionId);
    const currentTopic = this.getCurrentTopic(sessionId);
    const implicitContext = this.extractImplicitContext(
      userInput,
      recentHistory
    );

    let enrichedInput = userInput;
    const enrichments: string[] = [];

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
   * Analyze topic continuity in conversation
   */
  private analyzeTopicContinuity(
    resolvedReferences: ResolvedReferences,
    sessionId: string
  ): TopicContinuity {
    const currentTopic = this.getCurrentTopic(sessionId);
    const topicStack = this.topicStack.get(sessionId) || [];
    const previousTopic =
      topicStack.length > 1 ? topicStack[topicStack.length - 2] : null;

    const inputKeywords = this.extractKeywords(resolvedReferences.resolved);
    let continuation = false;
    let confidence = 0.5;

    if (currentTopic) {
      const overlap = this.calculateKeywordOverlap(
        inputKeywords,
        currentTopic.keywords
      );
      continuation = overlap > 0.3;
      confidence = overlap;
    }

    return {
      current: currentTopic,
      previous: previousTopic,
      continuation,
      confidence,
      transition: continuation ? undefined : 'topic_shift',
    };
  }

  /**
   * Add exchange to conversation history
   */
  public addExchange(
    sessionId: string,
    userInput: string,
    aiResponse: string,
    context?: Record<string, unknown>
  ): void {
    if (!this.conversationHistory.has(sessionId)) {
      this.conversationHistory.set(sessionId, []);
    }

    const exchange: ConversationExchange = {
      userInput,
      aiResponse,
      timestamp: new Date().toISOString(),
      context,
    };

    const history = this.conversationHistory.get(sessionId)!;
    history.push(exchange);

    // Maintain context window
    if (history.length > this.contextWindow) {
      history.shift();
    }

    // Update topic tracking
    this.updateTopicTracking(sessionId, userInput);
  }

  /**
   * Get conversation state
   */
  private getConversationState(sessionId: string): ConversationState {
    const history = this.conversationHistory.get(sessionId) || [];
    const activeContexts = this.activeContext.get(sessionId) || {};
    const currentTopic = this.getCurrentTopic(sessionId);

    return {
      sessionId,
      historyLength: history.length,
      currentTopic,
      activeContextCount: Object.keys(activeContexts).length,
      lastActivity:
        history.length > 0
          ? history[history.length - 1].timestamp
          : new Date().toISOString(),
    };
  }

  /**
   * Generate clarification suggestions
   */
  private generateClarifications(
    contextualInput: ContextualInput,
    sessionId: string
  ): string[] {
    const clarifications: string[] = [];

    if (contextualInput.confidence < 0.5) {
      clarifications.push('Could you provide more context?');
    }

    if (this.hasAmbiguousReferences(contextualInput.enriched)) {
      clarifications.push('Which specific item are you referring to?');
    }

    const currentTopic = this.getCurrentTopic(sessionId);
    if (!currentTopic && this.isTopicSpecific(contextualInput.enriched)) {
      clarifications.push('What topic or area should I focus on?');
    }

    return clarifications;
  }

  // Helper methods
  private getRecentHistory(sessionId: string): ConversationExchange[] {
    const history = this.conversationHistory.get(sessionId) || [];
    return history.slice(-this.contextWindow);
  }

  private getCurrentTopic(sessionId: string): Topic | null {
    const topicStack = this.topicStack.get(sessionId) || [];
    return topicStack.length > 0 ? topicStack[topicStack.length - 1] : null;
  }

  private extractImplicitContext(
    userInput: string,
    recentHistory: ConversationExchange[]
  ): Record<string, unknown> {
    // Extract implicit context from conversation flow
    const context: Record<string, unknown> = {};

    // Look for patterns in recent history
    for (const exchange of recentHistory.slice(-3)) {
      const keywords = this.extractKeywords(exchange.aiResponse);
      keywords.forEach((keyword) => {
        context[keyword] = ((context[keyword] as number) || 0) + 1;
      });
    }

    return context;
  }

  private isMissingSubject(userInput: string): boolean {
    // Check if input starts with a verb without a clear subject
    const verbs = [
      'create',
      'make',
      'build',
      'update',
      'fix',
      'analyze',
      'optimize',
    ];
    const firstWord = userInput.trim().split(' ')[0].toLowerCase();
    return verbs.includes(firstWord);
  }

  private isProjectRelated(userInput: string): boolean {
    const projectKeywords = [
      'file',
      'code',
      'function',
      'class',
      'module',
      'project',
      'repository',
    ];
    return projectKeywords.some((keyword) =>
      userInput.toLowerCase().includes(keyword)
    );
  }

  private hasProjectContext(userInput: string): boolean {
    const contextIndicators = ['in', 'within', 'for', 'inside'];
    return contextIndicators.some((indicator) =>
      userInput.toLowerCase().includes(indicator)
    );
  }

  private async getCurrentProjectContext(): Promise<string | null> {
    try {
      // Get current project information
      const projectInfo = await this.aia.queryAI(
        'What is the current project context?'
      );
      return projectInfo.trim() || null;
    } catch {
      return null;
    }
  }

  private isContinuation(userInput: string): boolean {
    const continuationWords = [
      'also',
      'additionally',
      'furthermore',
      'moreover',
      'then',
      'next',
    ];
    return continuationWords.some((word) =>
      userInput.toLowerCase().includes(word)
    );
  }

  private extractLastAction(
    recentHistory: ConversationExchange[]
  ): string | null {
    if (recentHistory.length === 0) return null;

    const lastExchange = recentHistory[recentHistory.length - 1];
    const actionWords = [
      'creating',
      'building',
      'analyzing',
      'fixing',
      'optimizing',
      'updating',
    ];

    for (const action of actionWords) {
      if (lastExchange.aiResponse.toLowerCase().includes(action)) {
        return action;
      }
    }

    return null;
  }

  private calculateEnrichmentConfidence(enrichments: string[]): number {
    if (enrichments.length === 0) return 1.0;

    // Each enrichment adds confidence
    const baseConfidence = 0.5;
    const enrichmentBonus = Math.min(enrichments.length * 0.2, 0.5);

    return baseConfidence + enrichmentBonus;
  }

  private extractKeywords(text: string): string[] {
    // Simple keyword extraction
    const words = text
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter((word) => word.length > 3);

    // Remove common words
    const stopWords = [
      'this',
      'that',
      'with',
      'from',
      'they',
      'them',
      'have',
      'been',
      'will',
      'would',
      'could',
      'should',
    ];
    return words.filter((word) => !stopWords.includes(word));
  }

  private calculateKeywordOverlap(
    keywords1: string[],
    keywords2: string[]
  ): number {
    if (keywords1.length === 0 || keywords2.length === 0) return 0;

    const set1 = new Set(keywords1);
    const set2 = new Set(keywords2);
    const intersection = new Set([...set1].filter((x) => set2.has(x)));

    return intersection.size / Math.max(set1.size, set2.size);
  }

  private updateTopicTracking(sessionId: string, userInput: string): void {
    const keywords = this.extractKeywords(userInput);
    const currentTopic = this.getCurrentTopic(sessionId);

    if (!this.topicStack.has(sessionId)) {
      this.topicStack.set(sessionId, []);
    }

    const topicStack = this.topicStack.get(sessionId)!;

    if (
      !currentTopic ||
      this.calculateKeywordOverlap(keywords, currentTopic.keywords) < 0.3
    ) {
      // New topic detected
      const newTopic: Topic = {
        subject: this.extractSubject(userInput),
        keywords,
        confidence: 0.7,
        startTime: new Date().toISOString(),
      };

      topicStack.push(newTopic);

      // Limit topic stack size
      if (topicStack.length > 5) {
        topicStack.shift();
      }
    } else {
      // Update current topic
      currentTopic.keywords = [
        ...new Set([...currentTopic.keywords, ...keywords]),
      ];
      currentTopic.confidence = Math.min(currentTopic.confidence + 0.1, 1.0);
    }
  }

  private extractSubject(userInput: string): string {
    // Simple subject extraction
    const words = userInput.split(' ');
    const nouns = [
      'file',
      'function',
      'class',
      'method',
      'code',
      'project',
      'application',
    ];

    for (const word of words) {
      if (nouns.includes(word.toLowerCase())) {
        return word;
      }
    }

    return words[0] || 'topic';
  }

  private hasAmbiguousReferences(input: string): boolean {
    const ambiguousTerms = ['it', 'this', 'that', 'they', 'them'];
    return ambiguousTerms.some((term) => input.toLowerCase().includes(term));
  }

  private isTopicSpecific(input: string): boolean {
    const specificTerms = ['specific', 'particular', 'certain', 'exact'];
    return specificTerms.some((term) => input.toLowerCase().includes(term));
  }

  /**
   * Clear conversation history for a session
   */
  public clearHistory(sessionId: string): void {
    this.conversationHistory.delete(sessionId);
    this.activeContext.delete(sessionId);
    this.topicStack.delete(sessionId);
  }

  /**
   * Get conversation summary
   */
  public getConversationSummary(sessionId: string): {
    exchangeCount: number;
    topics: Topic[];
    duration: string;
    lastActivity: string;
  } {
    const history = this.conversationHistory.get(sessionId) || [];
    const topics = this.topicStack.get(sessionId) || [];

    let duration = '0 minutes';
    if (history.length > 0) {
      const startTime = new Date(history[0].timestamp);
      const endTime = new Date(history[history.length - 1].timestamp);
      const durationMs = endTime.getTime() - startTime.getTime();
      duration = `${Math.round(durationMs / 60000)} minutes`;
    }

    return {
      exchangeCount: history.length,
      topics,
      duration,
      lastActivity:
        history.length > 0
          ? history[history.length - 1].timestamp
          : new Date().toISOString(),
    };
  }
}
