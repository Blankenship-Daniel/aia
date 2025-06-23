/**
 * AI Coreference Resolution Service Interface
 * SOLID SRP: Responsible only for AI-powered coreference resolution
 * SOLID OCP: Can be extended with new resolution strategies
 * SOLID LSP: Substitutable with other ICoreferenceResolutionService implementations
 * SOLID ISP: Implements only coreference resolution specific interface methods
 * SOLID DIP: Uses abstractions for AI service and context dependencies
 */

import { AIModel } from '../types/index';

export interface ConversationExchange {
  userInput: string;
  aiResponse: string;
  timestamp: string;
  context?: Record<string, unknown>;
}

export interface EntityReference {
  text: string;
  type: 'pronoun' | 'demonstrative' | 'definite_description' | 'proper_noun';
  span: { start: number; end: number };
  confidence: number;
}

export interface ResolvedEntity {
  originalReference: EntityReference;
  resolvedText: string;
  antecedent: Antecedent;
  confidence: number;
  reasoning: string;
}

export interface Antecedent {
  text: string;
  type: 'entity' | 'concept' | 'action' | 'state';
  source: 'current_turn' | 'previous_turn' | 'conversation_history';
  sourceIndex?: number;
  span?: { start: number; end: number };
  salience: number;
}

export interface CoreferenceChain {
  id: string;
  mentions: EntityMention[];
  canonicalForm: string;
  entityType: string;
  confidence: number;
}

export interface EntityMention {
  text: string;
  span: { start: number; end: number };
  turnIndex: number;
  isCanonical: boolean;
  confidence: number;
}

export interface ConversationContext {
  exchanges: ConversationExchange[];
  currentTopic?: string;
  activeEntities: Map<string, CoreferenceChain>;
  discourse: DiscourseState;
}

export interface DiscourseState {
  focus: string[]; // Currently focused entities
  topics: TopicThread[];
  conversationFlow: ConversationFlow;
}

export interface TopicThread {
  topic: string;
  startTurn: number;
  endTurn?: number;
  entities: string[];
  relevance: number;
}

export interface ConversationFlow {
  currentPhase:
    | 'introduction'
    | 'information_gathering'
    | 'problem_solving'
    | 'conclusion';
  transitions: FlowTransition[];
  coherence: number;
}

export interface FlowTransition {
  fromTurn: number;
  toTurn: number;
  type: 'continuation' | 'shift' | 'return' | 'clarification';
  confidence: number;
}

export interface CoreferenceResolutionResult {
  originalInput: string;
  resolvedInput: string;
  resolutions: ResolvedEntity[];
  coreferenceChains: CoreferenceChain[];
  conversationContext: ConversationContext;
  confidence: number;
  metadata: {
    processingTime: number;
    aiModel: AIModel;
    analysisTimestamp: Date;
  };
}

export interface EntityExtractionResult {
  entities: DetectedEntity[];
  relationships: EntityRelationship[];
  confidence: number;
}

export interface DetectedEntity {
  text: string;
  type: string;
  span: { start: number; end: number };
  properties: Record<string, unknown>;
  confidence: number;
}

export interface EntityRelationship {
  entity1: string;
  entity2: string;
  relationshipType: string;
  confidence: number;
  evidence: string;
}

export interface AmbiguityAnalysis {
  level: 'low' | 'medium' | 'high';
  ambiguousReferences: AmbiguousReference[];
  clarificationSuggestions: string[];
  confidence: number;
}

export interface AmbiguousReference {
  text: string;
  possibleAntecedents: Antecedent[];
  ambiguityType:
    | 'multiple_candidates'
    | 'unclear_reference'
    | 'missing_antecedent';
  clarificationNeeded: boolean;
}

/**
 * AI Coreference Resolution Service Interface
 * Provides intelligent coreference resolution based on AI analysis and context understanding
 */
export interface ICoreferenceResolutionService {
  /**
   * Resolve coreferences in user input using AI-powered analysis
   * @param input - The user input containing potential coreferences
   * @param conversationHistory - Previous conversation exchanges for context
   * @param currentContext - Additional context information
   * @returns Promise resolving to comprehensive coreference resolution result
   */
  resolveReferences(
    input: string,
    conversationHistory: ConversationExchange[],
    currentContext?: Record<string, unknown>
  ): Promise<CoreferenceResolutionResult>;

  /**
   * Extract and classify entities from text using AI
   * @param text - Text to analyze for entities
   * @param context - Optional context for better entity recognition
   * @returns Promise resolving to entity extraction results
   */
  extractEntities(
    text: string,
    context?: Record<string, unknown>
  ): Promise<EntityExtractionResult>;

  /**
   * Analyze conversation for coreference chains and entity tracking
   * @param conversationHistory - Complete conversation history
   * @returns Promise resolving to conversation context with coreference chains
   */
  analyzeConversationContext(
    conversationHistory: ConversationExchange[]
  ): Promise<ConversationContext>;

  /**
   * Detect and analyze ambiguous references that require clarification
   * @param input - User input to analyze
   * @param conversationHistory - Conversation context
   * @returns Promise resolving to ambiguity analysis
   */
  detectAmbiguity(
    input: string,
    conversationHistory: ConversationExchange[]
  ): Promise<AmbiguityAnalysis>;

  /**
   * Update coreference chains with new conversation turn
   * @param chains - Existing coreference chains
   * @param newInput - New user input
   * @param aiResponse - AI response to the input
   * @returns Promise resolving to updated coreference chains
   */
  updateCoreferenceChains(
    chains: CoreferenceChain[],
    newInput: string,
    aiResponse: string
  ): Promise<CoreferenceChain[]>;

  /**
   * Generate clarification questions for ambiguous references
   * @param ambiguityAnalysis - Analysis of ambiguous references
   * @param conversationContext - Current conversation context
   * @returns Promise resolving to clarification questions
   */
  generateClarificationQuestions(
    ambiguityAnalysis: AmbiguityAnalysis,
    conversationContext: ConversationContext
  ): Promise<string[]>;
}
