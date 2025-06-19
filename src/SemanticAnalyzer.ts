import chalk from 'chalk';

interface IntentEmbedding {
  keywords: string[];
  semanticVector: number[];
  relatedConcepts: string[];
}

interface SemanticEntity {
  [key: string]: string | string[];
}

interface IntentClassification {
  intent: {
    primary: string;
    confidence: number;
    secondary?: string[];
  };
}

/**
 * Semantic Analyzer for better intent matching using embeddings and similarity
 */
class SemanticAnalyzer {
  private intentEmbeddings: Map<string, IntentEmbedding>;
  private entityPatterns: Map<string, RegExp>;

  constructor() {
    this.intentEmbeddings = new Map();
    this.entityPatterns = new Map();
    this.initializeSemanticModels();
  }

  private initializeSemanticModels(): void {
    // Pre-computed semantic vectors for common intents (simplified representation)
    this.intentEmbeddings.set('CREATE', {
      keywords: [
        'create',
        'make',
        'build',
        'generate',
        'setup',
        'initialize',
        'develop',
        'construct',
      ],
      semanticVector: [0.8, 0.2, 0.9, 0.1, 0.7],
      relatedConcepts: ['build', 'develop', 'establish', 'form'],
    });

    this.intentEmbeddings.set('ANALYZE', {
      keywords: [
        'analyze',
        'examine',
        'review',
        'check',
        'investigate',
        'inspect',
        'audit',
        'evaluate',
      ],
      semanticVector: [0.1, 0.9, 0.3, 0.8, 0.2],
      relatedConcepts: ['study', 'assess', 'examine', 'scrutinize'],
    });

    this.intentEmbeddings.set('FIX', {
      keywords: [
        'fix',
        'repair',
        'solve',
        'debug',
        'troubleshoot',
        'resolve',
        'correct',
        'patch',
      ],
      semanticVector: [0.3, 0.1, 0.2, 0.9, 0.8],
      relatedConcepts: ['repair', 'solve', 'correct', 'mend'],
    });

    this.intentEmbeddings.set('SEARCH', {
      keywords: [
        'find',
        'search',
        'look',
        'locate',
        'discover',
        'identify',
        'retrieve',
        'get',
      ],
      semanticVector: [0.2, 0.8, 0.1, 0.3, 0.9],
      relatedConcepts: ['locate', 'discover', 'retrieve', 'obtain'],
    });

    this.intentEmbeddings.set('MODIFY', {
      keywords: [
        'modify',
        'change',
        'update',
        'edit',
        'alter',
        'adjust',
        'improve',
        'enhance',
      ],
      semanticVector: [0.6, 0.3, 0.8, 0.4, 0.5],
      relatedConcepts: ['change', 'alter', 'adjust', 'improve'],
    });

    // Initialize entity patterns
    this.entityPatterns.set(
      'file',
      /\b[\w.-]+\.(js|ts|py|java|cpp|h|css|html|json|md|txt)\b/gi
    );
    this.entityPatterns.set(
      'directory',
      /\b(?:src|lib|test|tests|docs|config|scripts|build|dist)\/?\b/gi
    );
    this.entityPatterns.set(
      'command',
      /\b(?:npm|node|python|pip|git|docker|yarn|pnpm)\b/gi
    );
    this.entityPatterns.set(
      'framework',
      /\b(?:react|vue|angular|express|django|flask|spring)\b/gi
    );
  }

  /**
   * Calculate semantic similarity between input and intent
   */
  calculateSemanticSimilarity(
    input: string,
    intentEmbedding: IntentEmbedding
  ): number {
    const inputVector = this.generateInputVector(input);
    const intentVector = intentEmbedding.semanticVector;

    // Simple cosine similarity calculation
    let dotProduct = 0;
    let inputMagnitude = 0;
    let intentMagnitude = 0;

    for (
      let i = 0;
      i < Math.min(inputVector.length, intentVector.length);
      i++
    ) {
      dotProduct += inputVector[i] * intentVector[i];
      inputMagnitude += inputVector[i] * inputVector[i];
      intentMagnitude += intentVector[i] * intentVector[i];
    }

    inputMagnitude = Math.sqrt(inputMagnitude);
    intentMagnitude = Math.sqrt(intentMagnitude);

    if (inputMagnitude === 0 || intentMagnitude === 0) {
      return 0;
    }

    return dotProduct / (inputMagnitude * intentMagnitude);
  }

  /**
   * Generate a simple semantic vector for input text
   */
  private generateInputVector(input: string): number[] {
    const words = input.toLowerCase().split(/\s+/);
    const vector = [0, 0, 0, 0, 0]; // 5D vector

    // Simple vector generation based on word categories
    words.forEach((word) => {
      if (['create', 'make', 'build', 'generate'].includes(word)) {
        vector[0] += 0.2;
      }
      if (['analyze', 'check', 'examine', 'review'].includes(word)) {
        vector[1] += 0.2;
      }
      if (['modify', 'change', 'update', 'edit'].includes(word)) {
        vector[2] += 0.2;
      }
      if (['find', 'search', 'look', 'get'].includes(word)) {
        vector[3] += 0.2;
      }
      if (['fix', 'debug', 'solve', 'repair'].includes(word)) {
        vector[4] += 0.2;
      }
    });

    // Normalize vector
    const magnitude = Math.sqrt(
      vector.reduce((sum, val) => sum + val * val, 0)
    );
    if (magnitude > 0) {
      return vector.map((val) => val / magnitude);
    }

    return vector;
  }

  /**
   * Enhanced intent classification using semantic similarity
   */
  async enhanceIntentClassification(
    input: string,
    currentClassification: {
      primary: string;
      confidence: number;
      secondary?: string[];
    }
  ): Promise<IntentClassification> {
    let bestMatch = {
      intent: currentClassification.primary,
      confidence: currentClassification.confidence,
    };
    const secondaryMatches: string[] = [];

    // Calculate semantic similarity for each intent
    for (const [intentName, embedding] of this.intentEmbeddings) {
      const similarity = this.calculateSemanticSimilarity(input, embedding);

      // Also check keyword matches
      const words = input.toLowerCase().split(/\s+/);
      const keywordMatches = embedding.keywords.filter((keyword) =>
        words.some((word) => word.includes(keyword) || keyword.includes(word))
      ).length;

      const keywordScore = keywordMatches / embedding.keywords.length;
      const combinedScore = similarity * 0.6 + keywordScore * 0.4;

      if (combinedScore > bestMatch.confidence) {
        if (bestMatch.confidence > 0.3) {
          secondaryMatches.push(bestMatch.intent);
        }
        bestMatch = { intent: intentName, confidence: combinedScore };
      } else if (combinedScore > 0.3) {
        secondaryMatches.push(intentName);
      }
    }

    return {
      intent: {
        primary: bestMatch.intent,
        confidence: bestMatch.confidence,
        secondary:
          secondaryMatches.length > 0
            ? secondaryMatches
            : currentClassification.secondary,
      },
    };
  }

  /**
   * Extract entities using semantic patterns
   */
  async extractSemanticEntities(input: string): Promise<SemanticEntity> {
    const entities: SemanticEntity = {};

    for (const [entityType, pattern] of this.entityPatterns) {
      const matches = Array.from(input.matchAll(pattern));
      if (matches.length > 0) {
        const values = matches.map((match) => match[0]);
        entities[entityType] = values.length === 1 ? values[0] : values;
      }
    }

    return entities;
  }

  /**
   * Get related concepts for an intent
   */
  getRelatedConcepts(intent: string): string[] {
    const embedding = this.intentEmbeddings.get(intent.toUpperCase());
    return embedding ? embedding.relatedConcepts : [];
  }

  /**
   * Find semantically similar intents
   */
  findSimilarIntents(input: string, threshold: number = 0.5): string[] {
    const similarIntents: string[] = [];

    for (const [intentName, embedding] of this.intentEmbeddings) {
      const similarity = this.calculateSemanticSimilarity(input, embedding);
      if (similarity >= threshold) {
        similarIntents.push(intentName);
      }
    }

    return similarIntents.sort((a, b) => {
      const aScore = this.calculateSemanticSimilarity(
        input,
        this.intentEmbeddings.get(a)!
      );
      const bScore = this.calculateSemanticSimilarity(
        input,
        this.intentEmbeddings.get(b)!
      );
      return bScore - aScore;
    });
  }
}

export default SemanticAnalyzer;
