/**
 * AI Coreference Resolution Service
 *
 * Replaces pattern-based coreference resolution with AI-powered entity tracking and reference resolution.
 * Uses AI to understand context, resolve pronouns, and maintain conversation coherence.
 */

import { AIModel, ContextInfo } from '../types/index';
import {
  ICoreferenceResolutionService,
  ConversationExchange,
  CoreferenceResolutionResult,
  EntityExtractionResult,
  ConversationContext,
  AmbiguityAnalysis,
  CoreferenceChain,
  ResolvedEntity,
  EntityReference,
  Antecedent,
  DetectedEntity,
  EntityRelationship,
  AmbiguousReference,
  DiscourseState,
  TopicThread,
  ConversationFlow,
} from '../interfaces/ICoreferenceResolutionService';
import { IAIService } from '../interfaces/IAIService';
import { IContextService } from '../interfaces/IContextService';
import chalk from 'chalk';

export class AICoreferenceResolutionService
  implements ICoreferenceResolutionService
{
  private aiService: IAIService;
  private contextService: IContextService;
  private coreferenceChains: Map<string, CoreferenceChain> = new Map();
  private conversationMemory: ConversationExchange[] = [];

  private readonly COREFERENCE_ANALYSIS_PROMPT = `
Analyze the following text for coreference resolution:

Input: "{input}"
Conversation History: {conversationHistory}

Identify all pronouns, demonstratives, and other referring expressions, then resolve them to their antecedents.

Respond with JSON:
{
  "references": [
    {
      "text": "it",
      "type": "pronoun",
      "span": {"start": 10, "end": 12},
      "resolvedText": "the configuration file",
      "antecedent": {
        "text": "configuration file", 
        "type": "entity",
        "source": "previous_turn",
        "confidence": 0.9
      },
      "confidence": 0.85,
      "reasoning": "The pronoun 'it' refers to the configuration file mentioned in the previous exchange"
    }
  ],
  "entities": [
    {
      "text": "configuration file",
      "type": "file_object", 
      "span": {"start": 5, "end": 22},
      "confidence": 0.95
    }
  ],
  "relationships": [
    {
      "entity1": "user",
      "entity2": "configuration file", 
      "relationshipType": "modifies",
      "confidence": 0.8
    }
  ]
}
`;

  private readonly ENTITY_EXTRACTION_PROMPT = `
Extract and classify all entities from the following text:

Text: "{text}"
Context: {context}

Identify entities such as files, functions, variables, concepts, people, etc.

Respond with JSON:
{
  "entities": [
    {
      "text": "package.json",
      "type": "file",
      "span": {"start": 15, "end": 27},
      "properties": {"fileType": "config", "language": "json"},
      "confidence": 0.98
    }
  ],
  "relationships": [
    {
      "entity1": "package.json",
      "entity2": "node.js project",
      "relationshipType": "belongs_to",
      "confidence": 0.9,
      "evidence": "package.json is the main configuration file for Node.js projects"
    }
  ]
}
`;

  private readonly AMBIGUITY_DETECTION_PROMPT = `
Analyze the following input for ambiguous references that need clarification:

Input: "{input}"
Conversation History: {conversationHistory}

Identify pronouns or references that could refer to multiple possible antecedents or are unclear.

Respond with JSON:
{
  "ambiguityLevel": "medium",
  "ambiguousReferences": [
    {
      "text": "this",
      "possibleAntecedents": [
        {"text": "the error", "confidence": 0.6},
        {"text": "the function", "confidence": 0.4}
      ],
      "ambiguityType": "multiple_candidates",
      "clarificationNeeded": true
    }
  ],
  "clarificationSuggestions": [
    "Are you referring to the error or the function when you say 'this'?"
  ]
}
`;

  constructor(aiService: IAIService, contextService: IContextService) {
    this.aiService = aiService;
    this.contextService = contextService;
  }

  async resolveReferences(
    input: string,
    conversationHistory: ConversationExchange[],
    currentContext?: Record<string, unknown>
  ): Promise<CoreferenceResolutionResult> {
    try {
      console.log(
        chalk.blue(
          '🔗 AI Coreference Resolution: Analyzing references and entities...'
        )
      );

      const startTime = Date.now();

      // Build comprehensive prompt with conversation history
      const prompt = this.buildCoreferencePrompt(input, conversationHistory);

      // Create ContextInfo for AI service
      const contextInfo = await this.buildContextInfo(currentContext);

      // Get AI analysis
      const aiResponse = await this.aiService.queryAI(prompt, contextInfo);

      // Parse AI response
      const analysis = this.parseCoreferenceResponse(aiResponse.content);

      // Build resolved input
      const resolvedInput = this.applyResolutions(input, analysis.references);

      // Update coreference chains
      const updatedChains = await this.updateCoreferenceChains(
        Array.from(this.coreferenceChains.values()),
        input,
        resolvedInput
      );

      // Build conversation context
      const conversationContext = await this.buildConversationContext([
        ...conversationHistory,
        {
          userInput: input,
          aiResponse: resolvedInput,
          timestamp: new Date().toISOString(),
        },
      ]);

      const result: CoreferenceResolutionResult = {
        originalInput: input,
        resolvedInput,
        resolutions: analysis.references,
        coreferenceChains: updatedChains,
        conversationContext,
        confidence: this.calculateOverallConfidence(analysis.references),
        metadata: {
          processingTime: Date.now() - startTime,
          aiModel: aiResponse.model,
          analysisTimestamp: new Date(),
        },
      };

      console.log(
        chalk.green(
          `✅ Resolved ${
            analysis.references.length
          } references (confidence: ${result.confidence.toFixed(2)})`
        )
      );

      return result;
    } catch (error) {
      console.error(chalk.red('❌ Coreference resolution failed:'), error);
      return this.getFallbackResolution(input, conversationHistory);
    }
  }

  async extractEntities(
    text: string,
    context?: Record<string, unknown>
  ): Promise<EntityExtractionResult> {
    try {
      const prompt = this.ENTITY_EXTRACTION_PROMPT.replace(
        '{text}',
        text
      ).replace('{context}', JSON.stringify(context || {}));

      const contextInfo = await this.buildContextInfo(context);
      const aiResponse = await this.aiService.queryAI(prompt, contextInfo);

      return this.parseEntityResponse(aiResponse.content);
    } catch (error) {
      console.error(chalk.red('❌ Entity extraction failed:'), error);
      return {
        entities: [],
        relationships: [],
        confidence: 0.0,
      };
    }
  }

  async analyzeConversationContext(
    conversationHistory: ConversationExchange[]
  ): Promise<ConversationContext> {
    try {
      return await this.buildConversationContext(conversationHistory);
    } catch (error) {
      console.error(
        chalk.red('❌ Conversation context analysis failed:'),
        error
      );
      return {
        exchanges: conversationHistory,
        activeEntities: new Map(),
        discourse: {
          focus: [],
          topics: [],
          conversationFlow: {
            currentPhase: 'information_gathering',
            transitions: [],
            coherence: 0.5,
          },
        },
      };
    }
  }

  async detectAmbiguity(
    input: string,
    conversationHistory: ConversationExchange[]
  ): Promise<AmbiguityAnalysis> {
    try {
      const prompt = this.AMBIGUITY_DETECTION_PROMPT.replace(
        '{input}',
        input
      ).replace(
        '{conversationHistory}',
        JSON.stringify(conversationHistory.slice(-3))
      );

      const contextInfo = await this.buildContextInfo();
      const aiResponse = await this.aiService.queryAI(prompt, contextInfo);

      return this.parseAmbiguityResponse(aiResponse.content);
    } catch (error) {
      console.error(chalk.red('❌ Ambiguity detection failed:'), error);
      return {
        level: 'low',
        ambiguousReferences: [],
        clarificationSuggestions: [],
        confidence: 0.0,
      };
    }
  }

  async updateCoreferenceChains(
    chains: CoreferenceChain[],
    newInput: string,
    aiResponse: string
  ): Promise<CoreferenceChain[]> {
    try {
      // Extract entities from new input and response
      const inputEntities = await this.extractEntities(newInput);
      const responseEntities = await this.extractEntities(aiResponse);

      // Update existing chains and create new ones
      const updatedChains = [...chains];
      const allEntities = [
        ...inputEntities.entities,
        ...responseEntities.entities,
      ];

      for (const entity of allEntities) {
        const existingChain = this.findMatchingChain(entity, updatedChains);

        if (existingChain) {
          // Add to existing chain
          existingChain.mentions.push({
            text: entity.text,
            span: entity.span,
            turnIndex: this.conversationMemory.length,
            isCanonical: false,
            confidence: entity.confidence,
          });
        } else {
          // Create new chain
          const newChain: CoreferenceChain = {
            id: `chain_${Date.now()}_${Math.random()
              .toString(36)
              .substr(2, 9)}`,
            mentions: [
              {
                text: entity.text,
                span: entity.span,
                turnIndex: this.conversationMemory.length,
                isCanonical: true,
                confidence: entity.confidence,
              },
            ],
            canonicalForm: entity.text,
            entityType: entity.type,
            confidence: entity.confidence,
          };
          updatedChains.push(newChain);
        }
      }

      // Update service state
      updatedChains.forEach((chain) => {
        this.coreferenceChains.set(chain.id, chain);
      });

      return updatedChains;
    } catch (error) {
      console.error(
        chalk.red('❌ Failed to update coreference chains:'),
        error
      );
      return chains;
    }
  }

  async generateClarificationQuestions(
    ambiguityAnalysis: AmbiguityAnalysis,
    conversationContext: ConversationContext
  ): Promise<string[]> {
    try {
      if (ambiguityAnalysis.level === 'low') {
        return [];
      }

      const questions: string[] = [];

      for (const ambRef of ambiguityAnalysis.ambiguousReferences) {
        if (ambRef.clarificationNeeded) {
          if (ambRef.ambiguityType === 'multiple_candidates') {
            const candidates = ambRef.possibleAntecedents
              .map((ant) => `"${ant.text}"`)
              .join(' or ');
            questions.push(
              `When you say "${ambRef.text}", are you referring to ${candidates}?`
            );
          } else if (ambRef.ambiguityType === 'unclear_reference') {
            questions.push(
              `Could you clarify what "${ambRef.text}" refers to?`
            );
          } else if (ambRef.ambiguityType === 'missing_antecedent') {
            questions.push(
              `I don't see what "${ambRef.text}" is referring to. Could you provide more context?`
            );
          }
        }
      }

      return questions;
    } catch (error) {
      console.error(
        chalk.red('❌ Failed to generate clarification questions:'),
        error
      );
      return ambiguityAnalysis.clarificationSuggestions || [];
    }
  }

  // Private helper methods

  private buildCoreferencePrompt(
    input: string,
    conversationHistory: ConversationExchange[]
  ): string {
    return this.COREFERENCE_ANALYSIS_PROMPT.replace('{input}', input).replace(
      '{conversationHistory}',
      JSON.stringify(conversationHistory.slice(-5))
    );
  }

  private async buildContextInfo(
    currentContext?: Record<string, unknown>
  ): Promise<ContextInfo> {
    try {
      const context = await this.contextService.gatherContext();
      return context;
    } catch (error) {
      // Fallback context
      return {
        workingDirectory: process.cwd(),
        platform: process.platform,
        arch: process.arch,
        nodeVersion: process.version,
        user: process.env.USER || 'unknown',
        shell: process.env.SHELL || 'unknown',
        timestamp: new Date().toISOString(),
        projectType: 'unknown',
        projectInfo: currentContext || {},
        gitStatus: '',
        environmentScore: 1.0,
      };
    }
  }

  private parseCoreferenceResponse(content: string): {
    references: ResolvedEntity[];
  } {
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in AI response');
      }

      const parsed = JSON.parse(jsonMatch[0]);

      const references: ResolvedEntity[] = (parsed.references || []).map(
        (ref: any) => ({
          originalReference: {
            text: ref.text,
            type: ref.type || 'pronoun',
            span: ref.span || { start: 0, end: ref.text.length },
            confidence: ref.confidence || 0.5,
          },
          resolvedText: ref.resolvedText || ref.text,
          antecedent: {
            text: ref.antecedent?.text || ref.resolvedText || ref.text,
            type: ref.antecedent?.type || 'entity',
            source: ref.antecedent?.source || 'current_turn',
            salience: ref.antecedent?.confidence || 0.5,
          },
          confidence: ref.confidence || 0.5,
          reasoning: ref.reasoning || 'AI-powered coreference resolution',
        })
      );

      return { references };
    } catch (error) {
      console.error(chalk.red('❌ Failed to parse coreference response'));
      return { references: [] };
    }
  }

  private parseEntityResponse(content: string): EntityExtractionResult {
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in AI response');
      }

      const parsed = JSON.parse(jsonMatch[0]);

      return {
        entities: parsed.entities || [],
        relationships: parsed.relationships || [],
        confidence: parsed.confidence || 0.8,
      };
    } catch (error) {
      console.error(chalk.red('❌ Failed to parse entity response'));
      return {
        entities: [],
        relationships: [],
        confidence: 0.0,
      };
    }
  }

  private parseAmbiguityResponse(content: string): AmbiguityAnalysis {
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in AI response');
      }

      const parsed = JSON.parse(jsonMatch[0]);

      return {
        level: parsed.ambiguityLevel || 'low',
        ambiguousReferences: parsed.ambiguousReferences || [],
        clarificationSuggestions: parsed.clarificationSuggestions || [],
        confidence: parsed.confidence || 0.8,
      };
    } catch (error) {
      console.error(chalk.red('❌ Failed to parse ambiguity response'));
      return {
        level: 'low',
        ambiguousReferences: [],
        clarificationSuggestions: [],
        confidence: 0.0,
      };
    }
  }

  private applyResolutions(
    input: string,
    resolutions: ResolvedEntity[]
  ): string {
    let resolved = input;

    // Sort by span start position in reverse order to avoid index shifts
    const sortedResolutions = resolutions.sort(
      (a, b) => b.originalReference.span.start - a.originalReference.span.start
    );

    for (const resolution of sortedResolutions) {
      const { span } = resolution.originalReference;
      resolved =
        resolved.slice(0, span.start) +
        resolution.resolvedText +
        resolved.slice(span.end);
    }

    return resolved;
  }

  private async buildConversationContext(
    conversationHistory: ConversationExchange[]
  ): Promise<ConversationContext> {
    const activeEntities = new Map<string, CoreferenceChain>();

    // Copy current chains to active entities
    this.coreferenceChains.forEach((chain, id) => {
      activeEntities.set(id, chain);
    });

    const discourse: DiscourseState = {
      focus: this.extractCurrentFocus(conversationHistory),
      topics: await this.extractTopicThreads(conversationHistory),
      conversationFlow: this.analyzeConversationFlow(conversationHistory),
    };

    return {
      exchanges: conversationHistory,
      currentTopic: discourse.topics[discourse.topics.length - 1]?.topic,
      activeEntities,
      discourse,
    };
  }

  private extractCurrentFocus(
    conversationHistory: ConversationExchange[]
  ): string[] {
    if (conversationHistory.length === 0) return [];

    const recent = conversationHistory.slice(-2);
    const focus: string[] = [];

    recent.forEach((exchange) => {
      // Simple focus extraction - could be enhanced with AI
      const words = exchange.userInput.toLowerCase().split(/\s+/);
      const focusWords = words.filter((word) =>
        [
          'error',
          'function',
          'file',
          'code',
          'issue',
          'problem',
          'solution',
        ].includes(word)
      );
      focus.push(...focusWords);
    });

    return [...new Set(focus)]; // Remove duplicates
  }

  private async extractTopicThreads(
    conversationHistory: ConversationExchange[]
  ): Promise<TopicThread[]> {
    const topics: TopicThread[] = [];
    let currentTopic: TopicThread | null = null;

    for (let i = 0; i < conversationHistory.length; i++) {
      const exchange = conversationHistory[i];

      // Simple topic detection - could be enhanced with AI
      const topicKeywords = this.extractTopicKeywords(exchange.userInput);

      if (topicKeywords.length > 0) {
        const mainTopic = topicKeywords[0];

        if (!currentTopic || currentTopic.topic !== mainTopic) {
          // Close previous topic
          if (currentTopic) {
            currentTopic.endTurn = i - 1;
          }

          // Start new topic
          currentTopic = {
            topic: mainTopic,
            startTurn: i,
            entities: topicKeywords,
            relevance: 1.0,
          };
          topics.push(currentTopic);
        } else {
          // Continue current topic
          currentTopic.entities.push(...topicKeywords);
        }
      }
    }

    return topics;
  }

  private extractTopicKeywords(text: string): string[] {
    const keywords = [
      'debugging',
      'installation',
      'configuration',
      'optimization',
      'testing',
      'deployment',
    ];
    const words = text.toLowerCase().split(/\s+/);
    return words.filter((word) =>
      keywords.some((keyword) => word.includes(keyword))
    );
  }

  private analyzeConversationFlow(
    conversationHistory: ConversationExchange[]
  ): ConversationFlow {
    return {
      currentPhase: this.determineConversationPhase(conversationHistory),
      transitions: [],
      coherence: this.calculateCoherence(conversationHistory),
    };
  }

  private determineConversationPhase(
    conversationHistory: ConversationExchange[]
  ): ConversationFlow['currentPhase'] {
    if (conversationHistory.length <= 2) return 'introduction';
    if (conversationHistory.length <= 5) return 'information_gathering';
    return 'problem_solving';
  }

  private calculateCoherence(
    conversationHistory: ConversationExchange[]
  ): number {
    if (conversationHistory.length < 2) return 1.0;

    // Simple coherence calculation based on topic consistency
    let coherenceScore = 0;
    for (let i = 1; i < conversationHistory.length; i++) {
      const prevTopics = this.extractTopicKeywords(
        conversationHistory[i - 1].userInput
      );
      const currTopics = this.extractTopicKeywords(
        conversationHistory[i].userInput
      );

      const overlap = prevTopics.filter((topic) =>
        currTopics.includes(topic)
      ).length;
      const total = Math.max(prevTopics.length, currTopics.length, 1);
      coherenceScore += overlap / total;
    }

    return coherenceScore / (conversationHistory.length - 1);
  }

  private findMatchingChain(
    entity: DetectedEntity,
    chains: CoreferenceChain[]
  ): CoreferenceChain | null {
    for (const chain of chains) {
      if (
        chain.canonicalForm.toLowerCase() === entity.text.toLowerCase() ||
        chain.mentions.some(
          (mention) => mention.text.toLowerCase() === entity.text.toLowerCase()
        )
      ) {
        return chain;
      }
    }
    return null;
  }

  private calculateOverallConfidence(resolutions: ResolvedEntity[]): number {
    if (resolutions.length === 0) return 1.0;

    const totalConfidence = resolutions.reduce(
      (sum, res) => sum + res.confidence,
      0
    );
    return totalConfidence / resolutions.length;
  }

  private getFallbackResolution(
    input: string,
    conversationHistory: ConversationExchange[]
  ): CoreferenceResolutionResult {
    return {
      originalInput: input,
      resolvedInput: input,
      resolutions: [],
      coreferenceChains: [],
      conversationContext: {
        exchanges: conversationHistory,
        activeEntities: new Map(),
        discourse: {
          focus: [],
          topics: [],
          conversationFlow: {
            currentPhase: 'information_gathering',
            transitions: [],
            coherence: 0.5,
          },
        },
      },
      confidence: 0.5,
      metadata: {
        processingTime: 0,
        aiModel: 'gpt-3.5-turbo' as AIModel,
        analysisTimestamp: new Date(),
      },
    };
  }
}
