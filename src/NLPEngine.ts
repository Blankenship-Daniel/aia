// @ts-ignore - chalk may not have types available
const { Chalk } = require('chalk');
// Instantiate Chalk for color methods in CommonJS context
const chalk = new Chalk({ level: 3 });
import SemanticAnalyzer from './SemanticAnalyzer.js';
import QueryProcessor from './QueryProcessor.js';
import DomainSpecialist from './DomainSpecialist.js';

interface NLPAnalysis {
  originalInput: string;
  processedInput: string;
  intent: {
    primary: string;
    confidence: number;
    secondary?: string[];
  };
  entities: {
    [key: string]: string | string[];
  };
  goalType: string;
  refinedGoal: string;
  confidence: number;
  suggestions: string[];
  context: Record<string, unknown>;
  domainAnalysis?: {
    domain: string;
    confidence: number;
    enhancements: string[];
  };
}

interface IntentClassifier {
  patterns: RegExp[];
  keywords: string[];
  confidence: number;
  name: string;
}

interface EntityExtractor {
  type: string;
  pattern: RegExp;
  extractor: (match: RegExpMatchArray) => string | string[];
}

interface GoalTemplate {
  pattern: RegExp;
  template: string;
  variables: string[];
}

interface AIA {
  // Minimal interface for the AIA instance
  [key: string]: any;
}

/**
 * Enhanced Natural Language Processing Engine for AIA
 * Combines multiple NLP techniques for superior goal understanding
 */
class NLPEngine {
  private aia: AIA;
  private intentClassifiers: Map<string, IntentClassifier>;
  private entityExtractors: Map<string, EntityExtractor>;
  private goalTemplates: GoalTemplate[];
  private semanticAnalyzer: SemanticAnalyzer;
  private queryProcessor: QueryProcessor;
  private domainSpecialist: DomainSpecialist;
  private executionLearnings: any[];
  private successfulPatterns: Map<string, number>;

  /**
   * Creates an instance of the class
   * 
   * @param aia - Parameter description
   */
  constructor(aia: AIA) {
    this.aia = aia;
    this.intentClassifiers = this.initializeIntentClassifiers();
    this.entityExtractors = this.initializeEntityExtractors();
    this.goalTemplates = this.initializeGoalTemplates();

    // Enhanced NLP components
    this.semanticAnalyzer = new SemanticAnalyzer();
    this.queryProcessor = new QueryProcessor();
    this.domainSpecialist = new DomainSpecialist();

    // Learning and adaptation
    this.executionLearnings = [];
    this.successfulPatterns = new Map();
  }

  /**
   * Enhanced analyze and enhance natural language goal understanding
   */
  async enhanceGoalUnderstanding(
    userInput: string,
    context: Record<string, unknown> = {}
  ): Promise<NLPAnalysis> {
    console.log(
      chalk.blue('🧠 Analyzing natural language goal with enhanced NLP...')
    );

    // Step 1: Query processing and enhancement
    const queryResult = await this.queryProcessor.processQuery(userInput);
    this.queryProcessor.displayProcessingResults(queryResult);

    // Use processed query for analysis
    const processedInput = queryResult.processedQuery;

    // Step 2: Domain detection
    const domainAnalysis = await this.domainSpecialist.detectDomain(
      processedInput,
      context
    );
    const domainEnhancements =
      await this.domainSpecialist.getDomainEnhancements(
        processedInput,
        domainAnalysis
      );

    // Step 3: Intent classification
    const intent = await this.classifyIntent(processedInput, context);

    // Step 4: Entity extraction
    const entities = await this.extractEntities(processedInput, context);

    // Step 5: Goal type classification
    const goalType = this.classifyGoalType(processedInput);

    // Step 6: Semantic analysis enhancement
    const semanticEnhancement =
      await this.semanticAnalyzer.enhanceIntentClassification(
        processedInput,
        intent
      );

    // Step 7: Refine the goal
    const analysis: NLPAnalysis = {
      originalInput: userInput,
      processedInput,
      intent: semanticEnhancement.intent || intent,
      entities,
      goalType,
      refinedGoal: processedInput,
      confidence: 0.8,
      suggestions: [],
      context,
      domainAnalysis: {
        domain: domainAnalysis.domain,
        confidence: domainAnalysis.confidence,
        enhancements: domainEnhancements,
      },
    };

    const refinedAnalysis = await this.refineGoal(analysis);

    // Step 8: Calculate confidence and generate suggestions
    refinedAnalysis.confidence = this.calculateEnhancedConfidence(
      refinedAnalysis,
      queryResult
    );
    refinedAnalysis.suggestions =
      this.generateEnhancedRefinements(refinedAnalysis);

    // Step 9: Generate contextual insights
    const contextualInsights = await this.generateContextualInsights(
      refinedAnalysis,
      context
    );

    // Display analysis
    this.displayEnhancedAnalysis(refinedAnalysis);

    // Display domain analysis
    this.domainSpecialist.displayDomainAnalysis(
      domainAnalysis,
      domainEnhancements
    );

    return refinedAnalysis;
  }

  /**
   * Classify the intent of user input
   */
  async classifyIntent(
    userInput: string,
    context: Record<string, unknown> = {}
  ): Promise<{ primary: string; confidence: number; secondary?: string[] }> {
    const input = userInput.toLowerCase();
    let bestMatch = { intent: 'unknown', confidence: 0 };
    const secondaryMatches: string[] = [];

    for (const [intentName, classifier] of this.intentClassifiers) {
      let confidence = 0;

      // Check pattern matches
      for (const pattern of classifier.patterns) {
        if (pattern.test(input)) {
          confidence += 0.4;
        }
      }

      // Check keyword matches
      const keywords = classifier.keywords;
      const inputWords = input.split(/\s+/);
      const matchCount = keywords.filter((keyword) =>
        inputWords.some((word) => word.includes(keyword))
      ).length;

      confidence += (matchCount / keywords.length) * 0.6;

      if (confidence > bestMatch.confidence) {
        if (bestMatch.confidence > 0.3) {
          secondaryMatches.push(bestMatch.intent);
        }
        bestMatch = { intent: intentName, confidence };
      } else if (confidence > 0.3) {
        secondaryMatches.push(intentName);
      }
    }

    return {
      primary: bestMatch.intent,
      confidence: bestMatch.confidence,
      secondary: secondaryMatches.length > 0 ? secondaryMatches : undefined,
    };
  }

  /**
   * Extract entities from user input
   */
  async extractEntities(
    userInput: string,
    context: Record<string, unknown> = {}
  ): Promise<Record<string, string | string[]>> {
    const entities: Record<string, string | string[]> = {};

    for (const [entityType, extractor] of this.entityExtractors) {
      const matches = userInput.match(extractor.pattern);
      if (matches) {
        entities[entityType] = extractor.extractor(matches);
      }
    }

    // Use semantic analyzer for additional entity extraction
    const semanticEntities =
      await this.semanticAnalyzer.extractSemanticEntities(userInput);
    Object.assign(entities, semanticEntities);

    return entities;
  }

  /**
   * Classify the goal type for better processing
   */
  classifyGoalType(userInput: string): string {
    const input = userInput.toLowerCase();

    const goalTypes = [
      {
        type: 'creation',
        patterns: [/create|make|build|generate|setup|initialize/],
      },
      {
        type: 'analysis',
        patterns: [/analyze|examine|review|check|investigate/],
      },
      {
        type: 'modification',
        patterns: [/update|modify|change|edit|fix|improve/],
      },
      {
        type: 'information',
        patterns: [/show|display|list|find|search|get|what|how/],
      },
      { type: 'execution', patterns: [/run|execute|start|launch|deploy/] },
      { type: 'debugging', patterns: [/debug|troubleshoot|fix|error|problem/] },
    ];

    for (const goalType of goalTypes) {
      for (const pattern of goalType.patterns) {
        if (pattern.test(input)) {
          return goalType.type;
        }
      }
    }

    return 'general';
  }

  /**
   * Refine the goal based on analysis
   */
  async refineGoal(analysis: NLPAnalysis): Promise<NLPAnalysis> {
    const { intent, entities, goalType, processedInput } = analysis;

    // Apply goal templates
    for (const template of this.goalTemplates) {
      if (template.pattern.test(processedInput)) {
        let refinedGoal = template.template;

        // Replace template variables with extracted entities
        template.variables.forEach((variable) => {
          const entity = entities[variable];
          if (entity) {
            const entityValue = Array.isArray(entity) ? entity[0] : entity;
            refinedGoal = refinedGoal.replace(`{${variable}}`, entityValue);
          }
        });

        analysis.refinedGoal = refinedGoal;
        break;
      }
    }

    return analysis;
  }

  /**
   * Calculate confidence score for the analysis
   */
  calculateConfidence(analysis: NLPAnalysis): number {
    let confidence = 0.5; // Base confidence

    // Intent confidence
    confidence += analysis.intent.confidence * 0.3;

    // Entity confidence
    const entityCount = Object.keys(analysis.entities).length;
    confidence += Math.min(entityCount * 0.1, 0.2);

    // Goal type confidence
    if (analysis.goalType !== 'general') {
      confidence += 0.1;
    }

    return Math.min(confidence, 1.0);
  }

  /**
   * Calculate enhanced confidence with multiple factors
   */
  calculateEnhancedConfidence(analysis: NLPAnalysis, queryResult: any): number {
    let confidence = this.calculateConfidence(analysis);

    // Query processing confidence
    if (queryResult.confidence) {
      confidence += queryResult.confidence * 0.2;
    }

    // Domain analysis confidence
    if (analysis.domainAnalysis) {
      confidence += analysis.domainAnalysis.confidence * 0.15;
    }

    // Historical pattern matching
    const patternKey = `${analysis.intent.primary}-${analysis.goalType}`;
    if (this.successfulPatterns.has(patternKey)) {
      confidence += 0.1;
    }

    return Math.min(confidence, 1.0);
  }

  /**
   * Generate refinement suggestions
   */
  generateRefinements(analysis: NLPAnalysis): string[] {
    const suggestions: string[] = [];

    if (analysis.confidence < 0.7) {
      suggestions.push(
        'Consider providing more specific details about your goal'
      );
    }

    if (Object.keys(analysis.entities).length === 0) {
      suggestions.push(
        'Try including specific file names, directories, or tools'
      );
    }

    if (analysis.intent.primary === 'unknown') {
      suggestions.push(
        'Consider rephrasing your request with action words like "create", "analyze", or "fix"'
      );
    }

    return suggestions;
  }

  /**
   * Generate enhanced refinement suggestions
   */
  generateEnhancedRefinements(analysis: NLPAnalysis): string[] {
    const suggestions = this.generateRefinements(analysis);

    // Domain-specific suggestions
    if (analysis.domainAnalysis?.domain) {
      suggestions.push(
        `Consider using ${analysis.domainAnalysis.domain}-specific terminology`
      );
    }

    // Goal type specific suggestions
    switch (analysis.goalType) {
      case 'creation':
        suggestions.push(
          'Specify what type of file or component you want to create'
        );
        break;
      case 'analysis':
        suggestions.push('Specify what aspects you want to analyze');
        break;
      case 'modification':
        suggestions.push('Specify what changes you want to make');
        break;
    }

    return suggestions;
  }

  /**
   * Generate contextual insights based on current environment
   */
  async generateContextualInsights(
    analysis: NLPAnalysis,
    context: Record<string, unknown>
  ): Promise<string[]> {
    const insights: string[] = [];

    // Project context insights
    if (context.projectType) {
      insights.push(`Detected ${context.projectType} project context`);
    }

    // Working directory insights
    if (context.workingDirectory) {
      insights.push(`Working in: ${context.workingDirectory}`);
    }

    return insights;
  }

  /**
   * Display comprehensive NLP analysis
   */
  displayEnhancedAnalysis(analysis: NLPAnalysis): void {
    console.log(chalk.green('\n📊 Enhanced NLP Analysis Results:'));
    console.log(
      chalk.cyan(
        `Intent: ${analysis.intent.primary} (${(
          analysis.intent.confidence * 100
        ).toFixed(1)}%)`
      )
    );
    console.log(chalk.cyan(`Goal Type: ${analysis.goalType}`));
    console.log(
      chalk.cyan(
        `Overall Confidence: ${(analysis.confidence * 100).toFixed(1)}%`
      )
    );

    if (Object.keys(analysis.entities).length > 0) {
      console.log(chalk.yellow('\nExtracted Entities:'));
      Object.entries(analysis.entities).forEach(([type, value]) => {
        const displayValue = Array.isArray(value) ? value.join(', ') : value;
        console.log(chalk.gray(`  ${type}: ${displayValue}`));
      });
    }

    if (analysis.suggestions.length > 0) {
      console.log(chalk.yellow('\n💡 Suggestions:'));
      analysis.suggestions.forEach((suggestion) => {
        console.log(chalk.gray(`  • ${suggestion}`));
      });
    }
  }

  /**
   * Initialize intent classifiers
   */
  private initializeIntentClassifiers(): Map<string, IntentClassifier> {
    const classifiers = new Map<string, IntentClassifier>();

    classifiers.set('create', {
      patterns: [
        /create|make|build|generate|setup|initialize/i,
        /new\s+(file|directory|project|component)/i,
      ],
      keywords: ['create', 'make', 'build', 'generate', 'new', 'setup'],
      confidence: 0.8,
      name: 'create',
    });

    classifiers.set('analyze', {
      patterns: [
        /analyze|examine|review|check|investigate|inspect/i,
        /what\s+(is|are)|show\s+me|tell\s+me\s+about/i,
      ],
      keywords: ['analyze', 'examine', 'review', 'check', 'what', 'show'],
      confidence: 0.8,
      name: 'analyze',
    });

    classifiers.set('modify', {
      patterns: [
        /update|modify|change|edit|fix|improve|refactor/i,
        /add\s+to|remove\s+from|delete/i,
      ],
      keywords: ['update', 'modify', 'change', 'edit', 'fix', 'add', 'remove'],
      confidence: 0.8,
      name: 'modify',
    });

    classifiers.set('execute', {
      patterns: [
        /run|execute|start|launch|deploy|install/i,
        /how\s+to\s+(run|start|execute)/i,
      ],
      keywords: ['run', 'execute', 'start', 'launch', 'install'],
      confidence: 0.8,
      name: 'execute',
    });

    return classifiers;
  }

  /**
   * Initialize entity extractors
   */
  private initializeEntityExtractors(): Map<string, EntityExtractor> {
    const extractors = new Map<string, EntityExtractor>();

    extractors.set('file', {
      type: 'file',
      pattern: /(?:file|files?)\s+([a-zA-Z0-9._/-]+\.[a-zA-Z0-9]+)/gi,
      extractor: (matches) => matches[1],
    });

    extractors.set('directory', {
      type: 'directory',
      pattern: /(?:directory|folder|dir)\s+([a-zA-Z0-9._/-]+)/gi,
      extractor: (matches) => matches[1],
    });

    extractors.set('language', {
      type: 'language',
      pattern: /(javascript|typescript|python|java|rust|go|php|ruby|c\+\+)/gi,
      extractor: (matches) => matches[0],
    });

    extractors.set('framework', {
      type: 'framework',
      pattern: /(react|vue|angular|express|django|flask|spring|laravel)/gi,
      extractor: (matches) => matches[0],
    });

    return extractors;
  }

  /**
   * Initialize goal templates
   */
  private initializeGoalTemplates(): GoalTemplate[] {
    return [
      {
        pattern: /create\s+(?:a\s+)?(\w+)\s+(?:file|component|module)/i,
        template: 'Create a {type} with appropriate structure and dependencies',
        variables: ['type'],
      },
      {
        pattern: /analyze\s+(?:the\s+)?(\w+)/i,
        template: 'Analyze the {target} and provide detailed insights',
        variables: ['target'],
      },
      {
        pattern: /fix\s+(?:the\s+)?(\w+)/i,
        template: 'Fix the {issue} by identifying and resolving the root cause',
        variables: ['issue'],
      },
    ];
  }
}

export default NLPEngine;
