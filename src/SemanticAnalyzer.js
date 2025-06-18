const chalk = require('chalk');

/**
 * Semantic Analyzer for better intent matching using embeddings and similarity
 */
class SemanticAnalyzer {
  constructor() {
    this.intentEmbeddings = new Map();
    this.entityPatterns = new Map();
    this.initializeSemanticModels();
  }

  initializeSemanticModels() {
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
      semanticVector: [0.8, 0.2, 0.9, 0.1, 0.7], // Simplified 5D vector
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
        'mend',
      ],
      semanticVector: [0.3, 0.1, 0.2, 0.9, 0.8],
      relatedConcepts: ['resolve', 'remedy', 'patch', 'heal'],
    });

    this.intentEmbeddings.set('OPTIMIZE', {
      keywords: [
        'optimize',
        'improve',
        'enhance',
        'speed up',
        'performance',
        'efficient',
        'streamline',
      ],
      semanticVector: [0.2, 0.4, 0.8, 0.3, 0.9],
      relatedConcepts: ['enhance', 'boost', 'refine', 'perfect'],
    });
  }

  /**
   * Calculate semantic similarity between input and intent
   */
  calculateSemanticSimilarity(input, intentEmbedding) {
    const inputVector = this.generateInputVector(input);
    const intentVector = intentEmbedding.semanticVector;

    // Calculate cosine similarity
    const dotProduct = inputVector.reduce(
      (sum, val, i) => sum + val * intentVector[i],
      0
    );
    const inputMagnitude = Math.sqrt(
      inputVector.reduce((sum, val) => sum + val * val, 0)
    );
    const intentMagnitude = Math.sqrt(
      intentVector.reduce((sum, val) => sum + val * val, 0)
    );

    return dotProduct / (inputMagnitude * intentMagnitude);
  }

  /**
   * Generate a simple semantic vector for input text
   */
  generateInputVector(input) {
    const words = input.toLowerCase().split(/\s+/);
    const vector = [0, 0, 0, 0, 0]; // 5-dimensional vector

    // Simple heuristic-based vector generation
    if (words.some((w) => ['create', 'make', 'build', 'generate'].includes(w)))
      vector[0] += 0.8;
    if (
      words.some((w) => ['analyze', 'check', 'review', 'examine'].includes(w))
    )
      vector[1] += 0.8;
    if (words.some((w) => ['optimize', 'improve', 'enhance'].includes(w)))
      vector[2] += 0.8;
    if (words.some((w) => ['fix', 'debug', 'solve', 'repair'].includes(w)))
      vector[3] += 0.8;
    if (words.some((w) => ['deploy', 'publish', 'release'].includes(w)))
      vector[4] += 0.8;

    return vector;
  }

  /**
   * Enhanced intent classification using semantic similarity
   */
  async enhanceIntentClassification(input, currentClassification) {
    const semanticScores = new Map();

    for (const [intent, embedding] of this.intentEmbeddings) {
      const similarity = this.calculateSemanticSimilarity(input, embedding);
      semanticScores.set(intent, similarity);
    }

    // Find best semantic match
    const bestSemanticMatch = Array.from(semanticScores.entries()).sort(
      (a, b) => b[1] - a[1]
    )[0];

    // Combine with existing classification
    const enhanced = { ...currentClassification };

    if (bestSemanticMatch[1] > 0.7) {
      enhanced.semanticMatch = {
        intent: bestSemanticMatch[0],
        confidence: bestSemanticMatch[1],
        method: 'semantic_similarity',
      };

      // Boost confidence if semantic and keyword matching agree
      if (bestSemanticMatch[0] === currentClassification.intent) {
        enhanced.confidence = Math.min(enhanced.confidence + 0.2, 1.0);
        enhanced.agreementBoost = true;
      }
    }

    return enhanced;
  }

  /**
   * Extract entities using semantic patterns
   */
  extractSemanticEntities(input) {
    const entities = {
      semanticConcepts: [],
      actionIntensity: 0,
      urgencyLevel: 0,
      complexityIndicators: [],
    };

    const words = input.toLowerCase().split(/\s+/);

    // Detect action intensity
    const intensityWords = [
      'urgent',
      'immediately',
      'asap',
      'critical',
      'important',
      'priority',
    ];
    entities.actionIntensity = intensityWords.filter((w) =>
      words.includes(w)
    ).length;

    // Detect urgency
    const urgencyWords = [
      'now',
      'today',
      'quickly',
      'fast',
      'urgent',
      'emergency',
    ];
    entities.urgencyLevel = urgencyWords.filter((w) =>
      words.includes(w)
    ).length;

    // Detect complexity indicators
    const complexityWords = [
      'complex',
      'advanced',
      'sophisticated',
      'comprehensive',
      'detailed',
    ];
    entities.complexityIndicators = complexityWords.filter((w) =>
      words.includes(w)
    );

    return entities;
  }
}

module.exports = SemanticAnalyzer;
