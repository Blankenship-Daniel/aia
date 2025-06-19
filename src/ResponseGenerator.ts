import chalk from 'chalk';

interface ResponseStrategy {
  type:
    | 'standard'
    | 'instructional'
    | 'analytical'
    | 'troubleshooting'
    | 'advisory';
  style: 'professional' | 'casual' | 'technical' | 'friendly';
  structure: 'linear' | 'hierarchical' | 'conversational';
  verbosity: 'concise' | 'balanced' | 'detailed';
  technicalLevel: 'beginner' | 'intermediate' | 'advanced';
  includeExamples: boolean;
  includeSteps: boolean;
  includeWarnings: boolean;
}

interface NLPAnalysis {
  intent: {
    intent: string;
    confidence: number;
  };
  goalType: string;
  complexity: number;
  entities: Array<{
    type: string;
    value: string;
    confidence: number;
  }>;
  sentiment: {
    polarity: number;
    confidence: number;
  };
  technicalTerms: string[];
  codeDetected: boolean;
}

interface ResponseContext {
  projectType?: string;
  codebase?: Record<string, unknown>;
  history?: Array<{
    query: string;
    response: string;
    timestamp: string;
  }>;
  userPreferences?: UserPreferences;
  [key: string]: unknown;
}

interface UserPreferences {
  preferredStyle: string;
  preferredVerbosity: string;
  technicalLevel: string;
  includeExamples: boolean;
}

interface ResponseTemplate {
  pattern: string;
  variables: string[];
  conditions: Record<string, unknown>;
}

interface EnhancedResponse {
  content: string;
  adaptations: string[];
  clarificationNeeded: boolean;
}

interface ResponseMetadata {
  strategy: ResponseStrategy;
  qualityScore: number;
  adaptations: string[];
  followUpSuggestions: string[];
  clarificationNeeded: boolean;
}

interface GeneratedResponse {
  response: string;
  metadata: ResponseMetadata;
}

interface UserFeedbackEntry {
  responseId: string;
  feedback: string;
  timestamp: string;
}

interface QualityMetrics {
  coherence: number;
  completeness: number;
  accuracy: number;
  clarity: number;
  relevance: number;
}

/**
 * Response Adaptation Engine
 * Learns from user feedback and adapts response patterns
 */
class ResponseAdaptationEngine {
  private userFeedback: Map<string, UserFeedbackEntry[]>;
  private responsePatterns: Map<string, unknown>;

  constructor() {
    this.userFeedback = new Map<string, UserFeedbackEntry[]>();
    this.responsePatterns = new Map<string, unknown>();
  }

  public recordFeedback(
    userId: string,
    responseId: string,
    feedback: string
  ): void {
    if (!this.userFeedback.has(userId)) {
      this.userFeedback.set(userId, []);
    }

    this.userFeedback.get(userId)!.push({
      responseId,
      feedback,
      timestamp: new Date().toISOString(),
    });
  }

  public adaptToUser(userId: string): UserPreferences {
    const feedback = this.userFeedback.get(userId) || [];

    // Analyze feedback to extract preferences
    const styleFeedback = feedback.filter(
      (f) => f.feedback.includes('style') || f.feedback.includes('tone')
    );

    const verbosityFeedback = feedback.filter(
      (f) =>
        f.feedback.includes('too long') ||
        f.feedback.includes('too short') ||
        f.feedback.includes('concise') ||
        f.feedback.includes('detailed')
    );

    const preferences: UserPreferences = {
      preferredStyle: 'professional',
      preferredVerbosity: 'balanced',
      technicalLevel: 'intermediate',
      includeExamples: false,
    };

    // Adapt style based on feedback
    if (styleFeedback.length > 0) {
      const casualRequests = styleFeedback.filter(
        (f) => f.feedback.includes('casual') || f.feedback.includes('friendly')
      ).length;

      if (casualRequests > styleFeedback.length / 2) {
        preferences.preferredStyle = 'casual';
      }
    }

    // Adapt verbosity based on feedback
    if (verbosityFeedback.length > 0) {
      const tooLong = verbosityFeedback.filter((f) =>
        f.feedback.includes('too long')
      ).length;
      const tooShort = verbosityFeedback.filter((f) =>
        f.feedback.includes('too short')
      ).length;

      if (tooLong > tooShort) {
        preferences.preferredVerbosity = 'concise';
      } else if (tooShort > tooLong) {
        preferences.preferredVerbosity = 'detailed';
      }
    }

    return preferences;
  }
}

/**
 * Enhanced Response Generator
 * Improves response quality, coherence, and user experience
 */
export class ResponseGenerator {
  private aia: {
    queryAI: (prompt: string) => Promise<string>;
  };
  private responseTemplates: Map<string, ResponseTemplate>;
  private stylePreferences: Map<string, UserPreferences>;
  private adaptationEngine: ResponseAdaptationEngine;

  constructor(aia: { queryAI: (prompt: string) => Promise<string> }) {
    this.aia = aia;
    this.responseTemplates = this.initializeTemplates();
    this.stylePreferences = new Map<string, UserPreferences>();
    this.adaptationEngine = new ResponseAdaptationEngine();
  }

  /**
   * Generate enhanced response with improved coherence and structure
   */
  public async generateEnhancedResponse(
    query: string,
    context: ResponseContext,
    nlpAnalysis: NLPAnalysis
  ): Promise<GeneratedResponse> {
    console.log(chalk.blue('🎨 Generating enhanced response...'));

    const responseStrategy = this.selectResponseStrategy(nlpAnalysis, context);
    const structuredPrompt = await this.buildStructuredPrompt(
      query,
      context,
      nlpAnalysis,
      responseStrategy
    );
    const rawResponse = await this.aia.queryAI(structuredPrompt);

    const enhancedResponse = await this.enhanceResponse(
      rawResponse,
      responseStrategy,
      context
    );
    const qualityScore = this.assessResponseQuality(
      enhancedResponse,
      query,
      nlpAnalysis
    );

    return {
      response: enhancedResponse.content,
      metadata: {
        strategy: responseStrategy,
        qualityScore,
        adaptations: enhancedResponse.adaptations,
        followUpSuggestions: this.generateFollowUpSuggestions(
          enhancedResponse,
          nlpAnalysis
        ),
        clarificationNeeded: enhancedResponse.clarificationNeeded,
      },
    };
  }

  /**
   * Select appropriate response strategy based on analysis
   */
  private selectResponseStrategy(
    nlpAnalysis: NLPAnalysis,
    context: ResponseContext
  ): ResponseStrategy {
    const strategy: ResponseStrategy = {
      type: 'standard',
      style: 'professional',
      structure: 'linear',
      verbosity: 'balanced',
      technicalLevel: 'intermediate',
      includeExamples: false,
      includeSteps: false,
      includeWarnings: false,
    };

    // Adapt based on intent
    switch (nlpAnalysis.intent.intent) {
      case 'CREATE':
        strategy.type = 'instructional';
        strategy.includeSteps = true;
        strategy.includeExamples = true;
        break;
      case 'ANALYZE':
        strategy.type = 'analytical';
        strategy.structure = 'hierarchical';
        strategy.verbosity = 'detailed';
        break;
      case 'FIX':
        strategy.type = 'troubleshooting';
        strategy.includeSteps = true;
        strategy.includeWarnings = true;
        break;
      case 'OPTIMIZE':
        strategy.type = 'advisory';
        strategy.includeExamples = true;
        strategy.verbosity = 'detailed';
        break;
    }

    // Adapt based on complexity
    if (
      nlpAnalysis.goalType === 'COMPLEX' ||
      nlpAnalysis.goalType === 'MULTI_STEP'
    ) {
      strategy.structure = 'hierarchical';
      strategy.includeSteps = true;
    }

    // Adapt based on technical terms
    if (nlpAnalysis.technicalTerms.length > 5) {
      strategy.technicalLevel = 'advanced';
    } else if (nlpAnalysis.technicalTerms.length < 2) {
      strategy.technicalLevel = 'beginner';
    }

    // Apply user preferences if available
    if (context.userPreferences) {
      strategy.style = context.userPreferences.preferredStyle as any;
      strategy.verbosity = context.userPreferences.preferredVerbosity as any;
      strategy.technicalLevel = context.userPreferences.technicalLevel as any;
      strategy.includeExamples = context.userPreferences.includeExamples;
    }

    return strategy;
  }

  /**
   * Build structured prompt for AI query
   */
  private async buildStructuredPrompt(
    query: string,
    context: ResponseContext,
    nlpAnalysis: NLPAnalysis,
    strategy: ResponseStrategy
  ): Promise<string> {
    let prompt = '';

    // Add context section
    prompt += '## Context\n';
    if (context.projectType) {
      prompt += `Project Type: ${context.projectType}\n`;
    }
    if (context.codebase) {
      prompt += `Codebase Info: ${JSON.stringify(context.codebase, null, 2)}\n`;
    }

    // Add analysis section
    prompt += '\n## Analysis\n';
    prompt += `Intent: ${nlpAnalysis.intent.intent}\n`;
    prompt += `Goal Type: ${nlpAnalysis.goalType}\n`;
    prompt += `Complexity: ${nlpAnalysis.complexity}/10\n`;
    if (nlpAnalysis.technicalTerms.length > 0) {
      prompt += `Technical Terms: ${nlpAnalysis.technicalTerms.join(', ')}\n`;
    }

    // Add strategy section
    prompt += '\n## Response Strategy\n';
    prompt += `Type: ${strategy.type}\n`;
    prompt += `Style: ${strategy.style}\n`;
    prompt += `Structure: ${strategy.structure}\n`;
    prompt += `Verbosity: ${strategy.verbosity}\n`;
    prompt += `Technical Level: ${strategy.technicalLevel}\n`;
    prompt += `Include Examples: ${strategy.includeExamples}\n`;
    prompt += `Include Steps: ${strategy.includeSteps}\n`;

    // Add query
    prompt += '\n## Query\n';
    prompt += query;

    // Add instructions
    prompt += '\n## Instructions\n';
    prompt += this.generateResponseInstructions(strategy);

    return prompt;
  }

  /**
   * Enhance raw AI response
   */
  private async enhanceResponse(
    rawResponse: string,
    strategy: ResponseStrategy,
    context: ResponseContext
  ): Promise<EnhancedResponse> {
    let content = rawResponse;
    const adaptations: string[] = [];
    let clarificationNeeded = false;

    // Apply structure improvements
    if (strategy.structure === 'hierarchical') {
      content = this.applyHierarchicalStructure(content);
      adaptations.push('Applied hierarchical structure');
    }

    // Add examples if requested
    if (strategy.includeExamples) {
      const examples = this.generateExamples(content, context);
      if (examples) {
        content += '\n\n## Examples\n' + examples;
        adaptations.push('Added relevant examples');
      }
    }

    // Add step-by-step instructions if requested
    if (strategy.includeSteps) {
      content = this.addStepByStepInstructions(content);
      adaptations.push('Added step-by-step instructions');
    }

    // Add warnings if needed
    if (strategy.includeWarnings) {
      const warnings = this.generateWarnings(content, context);
      if (warnings) {
        content += '\n\n## ⚠️ Important Notes\n' + warnings;
        adaptations.push('Added important warnings');
      }
    }

    // Check if clarification is needed
    clarificationNeeded = this.needsClarification(content, context);

    return {
      content,
      adaptations,
      clarificationNeeded,
    };
  }

  /**
   * Assess response quality
   */
  private assessResponseQuality(
    response: EnhancedResponse,
    query: string,
    nlpAnalysis: NLPAnalysis
  ): number {
    const metrics: QualityMetrics = {
      coherence: this.assessCoherence(response.content),
      completeness: this.assessCompleteness(response.content, query),
      accuracy: this.assessAccuracy(response.content, nlpAnalysis),
      clarity: this.assessClarity(response.content),
      relevance: this.assessRelevance(response.content, query),
    };

    // Calculate weighted average
    const weights = {
      coherence: 0.2,
      completeness: 0.25,
      accuracy: 0.25,
      clarity: 0.15,
      relevance: 0.15,
    };

    return Object.entries(metrics).reduce(
      (total, [metric, score]) =>
        total + score * weights[metric as keyof QualityMetrics],
      0
    );
  }

  /**
   * Generate follow-up suggestions
   */
  private generateFollowUpSuggestions(
    response: EnhancedResponse,
    nlpAnalysis: NLPAnalysis
  ): string[] {
    const suggestions: string[] = [];

    // Based on intent
    switch (nlpAnalysis.intent.intent) {
      case 'CREATE':
        suggestions.push('Need help with testing?');
        suggestions.push('Want to optimize this further?');
        break;
      case 'FIX':
        suggestions.push('Need help preventing this in the future?');
        suggestions.push('Want to understand the root cause?');
        break;
      case 'ANALYZE':
        suggestions.push('Need help implementing improvements?');
        suggestions.push('Want to see best practices?');
        break;
    }

    // Based on response content
    if (
      response.content.includes('error') ||
      response.content.includes('issue')
    ) {
      suggestions.push('Need help with debugging?');
    }

    if (response.content.includes('performance')) {
      suggestions.push('Want to see performance optimization tips?');
    }

    return suggestions.slice(0, 3); // Limit to 3 suggestions
  }

  // Helper methods for response processing
  private initializeTemplates(): Map<string, ResponseTemplate> {
    const templates = new Map<string, ResponseTemplate>();

    templates.set('instructional', {
      pattern:
        '## Overview\n{overview}\n\n## Steps\n{steps}\n\n## Examples\n{examples}',
      variables: ['overview', 'steps', 'examples'],
      conditions: { includeSteps: true, includeExamples: true },
    });

    templates.set('analytical', {
      pattern:
        '## Analysis\n{analysis}\n\n## Findings\n{findings}\n\n## Recommendations\n{recommendations}',
      variables: ['analysis', 'findings', 'recommendations'],
      conditions: { structure: 'hierarchical' },
    });

    templates.set('troubleshooting', {
      pattern:
        '## Problem\n{problem}\n\n## Solution\n{solution}\n\n## Prevention\n{prevention}',
      variables: ['problem', 'solution', 'prevention'],
      conditions: { includeWarnings: true },
    });

    return templates;
  }

  private generateResponseInstructions(strategy: ResponseStrategy): string {
    let instructions = `Please provide a ${strategy.verbosity} response in a ${strategy.style} tone, `;
    instructions += `suitable for someone with ${strategy.technicalLevel} technical knowledge. `;

    if (strategy.structure === 'hierarchical') {
      instructions +=
        'Organize the response with clear headings and sections. ';
    }

    if (strategy.includeExamples) {
      instructions += 'Include practical examples where relevant. ';
    }

    if (strategy.includeSteps) {
      instructions += 'Break down complex tasks into clear, numbered steps. ';
    }

    if (strategy.includeWarnings) {
      instructions += 'Highlight any important warnings or considerations. ';
    }

    return instructions;
  }

  private applyHierarchicalStructure(content: string): string {
    // Add proper headings and structure
    const lines = content.split('\n');
    let structuredContent = '';
    let inCodeBlock = false;

    for (const line of lines) {
      if (line.includes('```')) {
        inCodeBlock = !inCodeBlock;
      }

      if (!inCodeBlock && line.trim() && !line.startsWith('#')) {
        // Add heading markers for key sections
        if (line.toLowerCase().includes('step') && /\d+/.test(line)) {
          structuredContent += `### ${line}\n`;
        } else if (line.toLowerCase().includes('example')) {
          structuredContent += `### ${line}\n`;
        } else if (
          line.toLowerCase().includes('note') ||
          line.toLowerCase().includes('warning')
        ) {
          structuredContent += `### ⚠️ ${line}\n`;
        } else {
          structuredContent += `${line}\n`;
        }
      } else {
        structuredContent += `${line}\n`;
      }
    }

    return structuredContent;
  }

  private generateExamples(
    content: string,
    context: ResponseContext
  ): string | null {
    // Generate relevant examples based on content and context
    if (context.projectType === 'node' && content.includes('function')) {
      return '```javascript\nfunction example() {\n  // Your code here\n}\n```';
    }

    if (content.includes('API') || content.includes('endpoint')) {
      return '```bash\ncurl -X GET https://api.example.com/endpoint\n```';
    }

    return null;
  }

  private addStepByStepInstructions(content: string): string {
    // Convert prose to numbered steps where appropriate
    const sentences = content.split('. ');
    let stepNumber = 1;
    let structuredContent = '';

    for (const sentence of sentences) {
      if (
        sentence.toLowerCase().includes('first') ||
        sentence.toLowerCase().includes('then') ||
        sentence.toLowerCase().includes('next') ||
        sentence.toLowerCase().includes('finally')
      ) {
        structuredContent += `${stepNumber}. ${sentence.trim()}.\n`;
        stepNumber++;
      } else {
        structuredContent += `${sentence}. `;
      }
    }

    return structuredContent;
  }

  private generateWarnings(
    content: string,
    context: ResponseContext
  ): string | null {
    const warnings: string[] = [];

    if (content.includes('delete') || content.includes('remove')) {
      warnings.push(
        '⚠️ Always backup your data before making destructive changes'
      );
    }

    if (content.includes('production') || content.includes('live')) {
      warnings.push('⚠️ Test thoroughly in a development environment first');
    }

    if (content.includes('credentials') || content.includes('password')) {
      warnings.push('⚠️ Never commit sensitive information to version control');
    }

    return warnings.length > 0 ? warnings.join('\n') : null;
  }

  private needsClarification(
    content: string,
    context: ResponseContext
  ): boolean {
    // Check if the response might need clarification
    const uncertaintyIndicators = [
      'might',
      'could',
      'possibly',
      'depending on',
      'it depends',
      'you may need',
      'consider',
      'if applicable',
    ];

    return uncertaintyIndicators.some((indicator) =>
      content.toLowerCase().includes(indicator)
    );
  }

  // Quality assessment methods
  private assessCoherence(content: string): number {
    // Simple coherence assessment based on structure
    const hasHeadings = content.includes('##') || content.includes('#');
    const hasStructure = content.includes('\n\n');
    const hasList = content.includes('-') || content.includes('1.');

    let score = 0.5;
    if (hasHeadings) score += 0.2;
    if (hasStructure) score += 0.2;
    if (hasList) score += 0.1;

    return Math.min(score, 1.0);
  }

  private assessCompleteness(content: string, query: string): number {
    // Check if key terms from query appear in response
    const queryTerms = query.toLowerCase().split(/\s+/);
    const contentLower = content.toLowerCase();

    const matchedTerms = queryTerms.filter(
      (term) => term.length > 3 && contentLower.includes(term)
    );

    return Math.min(matchedTerms.length / Math.max(queryTerms.length, 1), 1.0);
  }

  private assessAccuracy(content: string, nlpAnalysis: NLPAnalysis): number {
    // Check if technical terms are used appropriately
    let score = 0.7; // Base score

    if (nlpAnalysis.technicalTerms.length > 0) {
      const techTermsInResponse = nlpAnalysis.technicalTerms.filter((term) =>
        content.toLowerCase().includes(term.toLowerCase())
      );
      score +=
        (techTermsInResponse.length / nlpAnalysis.technicalTerms.length) * 0.3;
    }

    return Math.min(score, 1.0);
  }

  private assessClarity(content: string): number {
    // Simple clarity assessment
    const sentences = content.split(/[.!?]/);
    const avgSentenceLength =
      sentences.reduce((sum, sentence) => sum + sentence.split(' ').length, 0) /
      sentences.length;

    // Prefer sentences of moderate length (10-20 words)
    if (avgSentenceLength >= 10 && avgSentenceLength <= 20) {
      return 0.9;
    } else if (avgSentenceLength >= 5 && avgSentenceLength <= 30) {
      return 0.7;
    } else {
      return 0.5;
    }
  }

  private assessRelevance(content: string, query: string): number {
    // Check relevance based on query keywords
    const queryKeywords = query
      .toLowerCase()
      .replace(/[^\w\s]/g, '')
      .split(/\s+/)
      .filter((word) => word.length > 3);

    const contentLower = content.toLowerCase();
    const relevantKeywords = queryKeywords.filter((keyword) =>
      contentLower.includes(keyword)
    );

    return relevantKeywords.length / Math.max(queryKeywords.length, 1);
  }
}
