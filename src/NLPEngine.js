const chalk = require('chalk');
const SemanticAnalyzer = require('./SemanticAnalyzer');
const QueryProcessor = require('./QueryProcessor');
const DomainSpecialist = require('./DomainSpecialist');

/**
 * Enhanced Natural Language Processing Engine for AIA
 * Combines multiple NLP techniques for superior goal understanding
 */
class NLPEngine {
  constructor(aia) {
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
  async enhanceGoalUnderstanding(userInput, context = {}) {
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
    this.domainSpecialist.displayDomainAnalysis(
      domainAnalysis,
      domainEnhancements
    );

    // Step 3: Core NLP analysis
    const analysis = {
      originalGoal: userInput,
      processedGoal: processedInput,
      queryEnhancements: queryResult.enhancements,
      domainAnalysis,
      domainEnhancements,
      intent: await this.classifyIntent(processedInput, context),
      entities: await this.extractEntities(processedInput, context),
      goalType: this.classifyGoalType(processedInput),
      confidence: 0,
      enhancedGoal: processedInput,
      suggestedRefinements: [],
      contextualInsights: [],
      semanticAnalysis: null,
    };

    // Step 4: Enhance with semantic analysis
    analysis.semanticAnalysis =
      await this.semanticAnalyzer.enhanceIntentClassification(
        processedInput,
        analysis.intent
      );

    // Update intent with semantic insights
    if (analysis.semanticAnalysis.semanticMatch) {
      analysis.intent = analysis.semanticAnalysis;
    }

    // Step 5: Extract semantic entities
    const semanticEntities =
      this.semanticAnalyzer.extractSemanticEntities(processedInput);
    analysis.entities.semantic = semanticEntities;

    // Step 6: Calculate enhanced confidence
    analysis.confidence = this.calculateEnhancedConfidence(
      analysis,
      queryResult
    );

    // Step 7: Generate enhancements
    analysis.enhancedGoal = await this.refineGoal(analysis);
    analysis.suggestedRefinements = this.generateEnhancedRefinements(analysis);
    analysis.contextualInsights = await this.generateContextualInsights(
      analysis,
      context
    );

    // Step 8: Display comprehensive analysis
    this.displayEnhancedAnalysis(analysis);

    return analysis;
  }

  /**
   * Classify the intent of user input
   */
  async classifyIntent(userInput, context = {}) {
    const input = userInput.toLowerCase().trim();

    // Define intent patterns with weights
    const intentPatterns = {
      CREATE: {
        patterns: [
          'create',
          'make',
          'build',
          'generate',
          'setup',
          'initialize',
          'scaffold',
        ],
        confidence: 0.9,
        subTypes: ['file', 'project', 'configuration', 'test', 'documentation'],
      },
      ANALYZE: {
        patterns: [
          'analyze',
          'examine',
          'review',
          'check',
          'investigate',
          'inspect',
          'audit',
        ],
        confidence: 0.8,
        subTypes: [
          'code',
          'dependencies',
          'performance',
          'security',
          'structure',
        ],
      },
      FIX: {
        patterns: [
          'fix',
          'repair',
          'solve',
          'debug',
          'troubleshoot',
          'resolve',
          'correct',
        ],
        confidence: 0.85,
        subTypes: ['error', 'bug', 'issue', 'problem', 'conflict'],
      },
      OPTIMIZE: {
        patterns: [
          'optimize',
          'improve',
          'enhance',
          'speed up',
          'performance',
          'efficient',
        ],
        confidence: 0.8,
        subTypes: ['performance', 'memory', 'size', 'speed', 'code'],
      },
      DEPLOY: {
        patterns: [
          'deploy',
          'publish',
          'release',
          'ship',
          'launch',
          'distribute',
        ],
        confidence: 0.85,
        subTypes: ['production', 'staging', 'cloud', 'server', 'container'],
      },
      TEST: {
        patterns: ['test', 'verify', 'validate', 'check', 'ensure'],
        confidence: 0.8,
        subTypes: ['unit', 'integration', 'e2e', 'performance', 'security'],
      },
      CONFIGURE: {
        patterns: [
          'configure',
          'setup',
          'set up',
          'install',
          'enable',
          'disable',
        ],
        confidence: 0.8,
        subTypes: [
          'environment',
          'tools',
          'dependencies',
          'settings',
          'permissions',
        ],
      },
      SEARCH: {
        patterns: ['find', 'search', 'locate', 'discover', 'identify', 'list'],
        confidence: 0.75,
        subTypes: [
          'files',
          'patterns',
          'dependencies',
          'issues',
          'information',
        ],
      },
      UPDATE: {
        patterns: ['update', 'upgrade', 'refresh', 'sync', 'merge', 'pull'],
        confidence: 0.8,
        subTypes: ['dependencies', 'code', 'documentation', 'version', 'data'],
      },
      DELETE: {
        patterns: ['delete', 'remove', 'clean', 'clear', 'purge', 'uninstall'],
        confidence: 0.85,
        subTypes: ['files', 'dependencies', 'cache', 'logs', 'data'],
      },
    };

    let bestMatch = {
      intent: 'UNKNOWN',
      confidence: 0,
      subType: null,
      matches: [],
    };

    for (const [intent, config] of Object.entries(intentPatterns)) {
      const matches = config.patterns.filter((pattern) =>
        input.includes(pattern)
      );
      if (matches.length > 0) {
        const confidence =
          (matches.length / config.patterns.length) * config.confidence;
        if (confidence > bestMatch.confidence) {
          // Find subtype
          const subType =
            config.subTypes.find((sub) => input.includes(sub)) || null;

          bestMatch = {
            intent,
            confidence,
            subType,
            matches,
            patterns: config.patterns,
          };
        }
      }
    }

    // Enhance with context if available
    if (context.workingDirectory && context.projectType) {
      bestMatch = this.enhanceIntentWithContext(bestMatch, context);
    }

    return bestMatch;
  }

  /**
   * Extract entities from user input
   */
  async extractEntities(userInput, context = {}) {
    const entities = {
      technologies: [],
      fileTypes: [],
      tools: [],
      actions: [],
      targets: [],
      quantities: [],
      timeReferences: [],
      locations: [],
    };

    const input = userInput.toLowerCase();

    // Technology entities
    const technologies = [
      'node',
      'nodejs',
      'javascript',
      'js',
      'typescript',
      'ts',
      'react',
      'vue',
      'angular',
      'python',
      'java',
      'go',
      'rust',
      'php',
      'ruby',
      'swift',
      'kotlin',
      'csharp',
      'docker',
      'kubernetes',
      'aws',
      'azure',
      'gcp',
      'mongodb',
      'postgresql',
      'mysql',
      'redis',
      'elasticsearch',
      'nginx',
      'apache',
      'git',
      'github',
      'gitlab',
    ];
    entities.technologies = technologies.filter((tech) => input.includes(tech));

    // File type entities
    const fileTypes = [
      '.js',
      '.ts',
      '.py',
      '.java',
      '.go',
      '.rs',
      '.php',
      '.rb',
      '.json',
      '.yaml',
      '.yml',
      '.md',
      '.txt',
      '.html',
      '.css',
      '.scss',
      '.sql',
    ];
    entities.fileTypes = fileTypes.filter((type) => input.includes(type));

    // Tool entities
    const tools = [
      'npm',
      'yarn',
      'pip',
      'composer',
      'gradle',
      'maven',
      'webpack',
      'vite',
      'rollup',
      'babel',
      'eslint',
      'prettier',
      'jest',
      'mocha',
      'cypress',
      'playwright',
    ];
    entities.tools = tools.filter((tool) => input.includes(tool));

    // Action entities (verbs)
    const actions = [
      'create',
      'build',
      'deploy',
      'test',
      'analyze',
      'optimize',
      'fix',
      'update',
      'install',
      'configure',
      'setup',
      'run',
      'start',
      'stop',
      'restart',
    ];
    entities.actions = actions.filter((action) => input.includes(action));

    // Target entities (what the action is performed on)
    const targets = [
      'project',
      'app',
      'application',
      'service',
      'api',
      'database',
      'server',
      'component',
      'module',
      'package',
      'dependency',
      'file',
      'directory',
      'folder',
    ];
    entities.targets = targets.filter((target) => input.includes(target));

    // Quantity extraction
    const quantityRegex = /\b(\d+|all|every|each|some|many|few)\b/g;
    const quantityMatches = input.match(quantityRegex);
    entities.quantities = quantityMatches || [];

    // Time references
    const timeReferences = [
      'now',
      'today',
      'tomorrow',
      'yesterday',
      'soon',
      'later',
      'asap',
      'immediately',
    ];
    entities.timeReferences = timeReferences.filter((time) =>
      input.includes(time)
    );

    // Location entities
    const locations = [
      'local',
      'remote',
      'cloud',
      'production',
      'staging',
      'development',
      'localhost',
    ];
    entities.locations = locations.filter((loc) => input.includes(loc));

    return entities;
  }

  /**
   * Classify the goal type for better processing
   */
  classifyGoalType(userInput) {
    const input = userInput.toLowerCase();

    const goalTypes = {
      SIMPLE: ['list', 'show', 'display', 'count', 'find'],
      COMPLEX: ['analyze', 'optimize', 'refactor', 'implement', 'integrate'],
      MULTI_STEP: ['setup', 'configure', 'deploy', 'build', 'create project'],
      MAINTENANCE: ['update', 'clean', 'backup', 'sync', 'merge'],
      DIAGNOSTIC: ['debug', 'troubleshoot', 'investigate', 'check', 'verify'],
    };

    for (const [type, keywords] of Object.entries(goalTypes)) {
      if (keywords.some((keyword) => input.includes(keyword))) {
        return type;
      }
    }

    return 'GENERAL';
  }

  /**
   * Refine the goal based on analysis
   */
  async refineGoal(analysis) {
    let refinedGoal = analysis.originalGoal;

    // Add missing context if detected
    if (
      analysis.intent.intent === 'CREATE' &&
      !analysis.entities.technologies.length
    ) {
      // Suggest adding technology context
      refinedGoal = `${refinedGoal} (consider specifying technology stack)`;
    }

    // Make vague goals more specific
    if (
      analysis.originalGoal.length < 20 &&
      !analysis.entities.targets.length
    ) {
      refinedGoal = `${refinedGoal} - specify target/scope for better results`;
    }

    // Add safety suggestions for destructive operations
    if (
      analysis.intent.intent === 'DELETE' ||
      analysis.entities.actions.includes('remove')
    ) {
      refinedGoal = `${refinedGoal} (with backup/confirmation)`;
    }

    return refinedGoal;
  }

  /**
   * Calculate confidence score for the analysis
   */
  calculateConfidence(analysis) {
    let confidence = analysis.intent.confidence || 0.5;

    // Boost confidence based on entity extraction
    if (analysis.entities.technologies.length > 0) confidence += 0.1;
    if (analysis.entities.tools.length > 0) confidence += 0.1;
    if (analysis.entities.actions.length > 0) confidence += 0.1;
    if (analysis.entities.targets.length > 0) confidence += 0.1;

    // Reduce confidence for very short or vague goals
    if (analysis.originalGoal.length < 10) confidence -= 0.2;
    if (analysis.originalGoal.split(' ').length < 3) confidence -= 0.1;

    return Math.min(Math.max(confidence, 0), 1);
  }

  /**
   * Calculate enhanced confidence with multiple factors
   */
  calculateEnhancedConfidence(analysis, queryResult) {
    let confidence = this.calculateConfidence(analysis);

    // Boost confidence based on query processing
    if (queryResult.confidence > 0.8) confidence += 0.1;
    if (queryResult.enhancements.corrections.length > 0) confidence += 0.05;
    if (queryResult.enhancements.abbreviationsExpanded.length > 0)
      confidence += 0.05;

    // Boost confidence based on domain detection
    if (
      analysis.domainAnalysis &&
      analysis.domainAnalysis.primary.confidence > 0.7
    ) {
      confidence += 0.1;
    }

    // Boost confidence based on semantic analysis
    if (analysis.semanticAnalysis && analysis.semanticAnalysis.semanticMatch) {
      confidence += 0.1;
    }

    // Reduce confidence for ambiguity
    if (queryResult.ambiguityAnalysis) {
      switch (queryResult.ambiguityAnalysis.level) {
        case 'high':
          confidence -= 0.2;
          break;
        case 'medium':
          confidence -= 0.1;
          break;
        default:
          break;
      }
    }

    return Math.min(Math.max(confidence, 0.1), 1.0);
  }

  /**
   * Generate refinement suggestions
   */
  generateRefinements(analysis) {
    const suggestions = [];

    if (analysis.confidence < 0.7) {
      suggestions.push(
        'Consider being more specific about what you want to achieve'
      );
    }

    if (
      !analysis.entities.technologies.length &&
      analysis.intent.intent !== 'SEARCH'
    ) {
      suggestions.push('Specify the technology stack or programming language');
    }

    if (!analysis.entities.targets.length) {
      suggestions.push(
        'Clarify what you want to work with (files, project, dependencies, etc.)'
      );
    }

    if (
      analysis.goalType === 'COMPLEX' &&
      analysis.originalGoal.split(' ').length < 5
    ) {
      suggestions.push(
        'For complex tasks, provide more details about requirements and constraints'
      );
    }

    return suggestions;
  }

  /**
   * Generate enhanced refinement suggestions
   */
  generateEnhancedRefinements(analysis) {
    const refinements = this.generateRefinements(analysis);

    // Add domain-specific refinements
    if (
      analysis.domainEnhancements &&
      analysis.domainEnhancements.suggestions
    ) {
      refinements.push(...analysis.domainEnhancements.suggestions);
    }

    // Add query-specific refinements
    if (analysis.queryEnhancements && analysis.queryEnhancements.suggestions) {
      refinements.push(...analysis.queryEnhancements.suggestions);
    }

    return [...new Set(refinements)]; // Remove duplicates
  }

  /**
   * Generate contextual insights based on current environment
   */
  async generateContextualInsights(analysis, context) {
    const insights = [];

    // Project type insights
    if (context.projectType && analysis.entities.technologies.length === 0) {
      insights.push(
        `Detected ${context.projectType} project - consider ${context.projectType}-specific approaches`
      );
    }

    // Git context insights
    if (context.gitStatus && analysis.intent.intent === 'DEPLOY') {
      if (context.gitStatus.includes('Changes')) {
        insights.push(
          'Uncommitted changes detected - consider committing before deployment'
        );
      }
    }

    // Dependency insights
    if (
      analysis.intent.intent === 'UPDATE' &&
      context.projectType === 'Node.js'
    ) {
      insights.push(
        'For Node.js projects, consider checking npm outdated first'
      );
    }

    return insights;
  }

  /**
   * Display comprehensive NLP analysis
   */
  displayEnhancedAnalysis(analysis) {
    console.log(chalk.green(`\n🎯 Enhanced NLP Analysis Complete`));
    console.log(
      chalk.gray(`   Confidence: ${Math.round(analysis.confidence * 100)}%`)
    );

    if (analysis.semanticAnalysis && analysis.semanticAnalysis.semanticMatch) {
      console.log(
        chalk.blue(
          `   Semantic match: ${
            analysis.semanticAnalysis.semanticMatch.intent
          } (${Math.round(
            analysis.semanticAnalysis.semanticMatch.confidence * 100
          )}%)`
        )
      );
    }

    if (analysis.entities.semantic) {
      const semantic = analysis.entities.semantic;
      if (semantic.actionIntensity > 0) {
        console.log(
          chalk.yellow(`   Action intensity: ${semantic.actionIntensity}`)
        );
      }
      if (semantic.urgencyLevel > 0) {
        console.log(chalk.red(`   Urgency level: ${semantic.urgencyLevel}`));
      }
    }
  }

  /**
   * Enhance intent with contextual information
   */
  enhanceIntentWithContext(intent, context) {
    const enhanced = { ...intent };

    // Project type enhancement
    if (context.projectType) {
      enhanced.projectContext = context.projectType;

      // Adjust confidence based on project type alignment
      if (
        context.projectType === 'Node.js' &&
        intent.matches.some((m) => ['npm', 'node', 'javascript'].includes(m))
      ) {
        enhanced.confidence += 0.1;
      }
    }

    // Git context enhancement
    if (context.gitStatus) {
      enhanced.gitContext = context.gitStatus;

      if (
        intent.intent === 'DEPLOY' &&
        context.gitStatus.includes('nothing to commit')
      ) {
        enhanced.confidence += 0.1;
      }
    }

    return enhanced;
  }

  /**
   * Initialize intent classifiers
   */
  initializeIntentClassifiers() {
    return {
      patterns: new Map(),
      weights: new Map(),
      contextRules: new Map(),
    };
  }

  /**
   * Initialize entity extractors
   */
  initializeEntityExtractors() {
    return {
      namedEntities: new Map(),
      patterns: new Map(),
      contextualRules: new Map(),
    };
  }

  /**
   * Initialize goal templates for common patterns
   */
  initializeGoalTemplates() {
    return {
      CREATE_PROJECT: 'Create a {technology} project with {features}',
      ANALYZE_CODE: 'Analyze {target} for {criteria} and provide {output}',
      FIX_ISSUE: 'Fix {problem} in {location} by {method}',
      OPTIMIZE_PERFORMANCE: 'Optimize {target} performance by {approach}',
      DEPLOY_APPLICATION:
        'Deploy {application} to {environment} using {method}',
    };
  }

  /**
   * Convert natural language to structured query
   */
  async convertToStructuredQuery(analysis) {
    const structuredQuery = {
      intent: analysis.intent.intent,
      subIntent: analysis.intent.subType,
      entities: analysis.entities,
      goalType: analysis.goalType,
      complexity: this.assessComplexity(analysis),
      requiredResources: this.identifyRequiredResources(analysis),
      executionStrategy: this.suggestExecutionStrategy(analysis),
    };

    return structuredQuery;
  }

  /**
   * Assess complexity of the goal
   */
  assessComplexity(analysis) {
    let complexity = 1; // Base complexity

    // Intent complexity
    const complexIntents = ['ANALYZE', 'OPTIMIZE', 'DEPLOY', 'CREATE'];
    if (complexIntents.includes(analysis.intent.intent)) complexity += 1;

    // Multi-target complexity
    if (analysis.entities.targets.length > 1) complexity += 1;

    // Multi-technology complexity
    if (analysis.entities.technologies.length > 1) complexity += 1;

    // Goal type complexity
    if (analysis.goalType === 'COMPLEX' || analysis.goalType === 'MULTI_STEP')
      complexity += 1;

    return Math.min(complexity, 5);
  }

  /**
   * Identify required resources for goal execution
   */
  identifyRequiredResources(analysis) {
    const resources = {
      tools: [],
      files: [],
      permissions: [],
      dependencies: [],
      timeEstimate: 'unknown',
    };

    // Map entities to required resources
    resources.tools = analysis.entities.tools;

    if (analysis.entities.technologies.includes('docker')) {
      resources.tools.push('docker');
      resources.permissions.push('docker');
    }

    if (analysis.intent.intent === 'DEPLOY') {
      resources.permissions.push('deployment');
      resources.timeEstimate = 'medium';
    }

    return resources;
  }

  /**
   * Suggest execution strategy based on analysis
   */
  suggestExecutionStrategy(analysis) {
    const strategy = {
      approach: 'sequential',
      parallel: false,
      incremental: false,
      validation: 'basic',
    };

    if (analysis.goalType === 'COMPLEX') {
      strategy.approach = 'iterative';
      strategy.incremental = true;
      strategy.validation = 'comprehensive';
    }

    if (analysis.entities.targets.length > 1) {
      strategy.parallel = true;
    }

    return strategy;
  }

  /**
   * Learn from execution results to improve future NLP analysis
   */
  async learnFromExecution(nlpAnalysis, executionResult, evaluation) {
    // Store successful patterns for future reference
    const learningData = {
      originalGoal: nlpAnalysis.originalGoal,
      intent: nlpAnalysis.intent,
      entities: nlpAnalysis.entities,
      goalType: nlpAnalysis.goalType,
      confidence: nlpAnalysis.confidence,
      executionSuccess: evaluation.goalAchieved,
      timestamp: new Date().toISOString(),
    };

    // Analyze what worked and what didn't
    if (evaluation.goalAchieved) {
      console.log(
        chalk.green('✅ NLP: Goal achieved - reinforcing successful patterns')
      );

      // Reinforce successful intent-entity patterns
      if (nlpAnalysis.intent.confidence > 0.7) {
        // This intent classification was accurate
        this.reinforceSuccessfulPattern(
          nlpAnalysis.intent,
          nlpAnalysis.entities
        );
      }
    } else {
      console.log(
        chalk.yellow('⚠️ NLP: Goal not achieved - analyzing for improvements')
      );

      // Analyze potential improvements
      if (nlpAnalysis.confidence < 0.7) {
        console.log(
          chalk.gray(
            '   • Low confidence may have contributed to execution issues'
          )
        );
      }

      if (
        nlpAnalysis.entities.technologies.length === 0 &&
        executionResult.results &&
        Array.isArray(executionResult.results) &&
        executionResult.results.some(
          (r) => r.error && r.error.includes('command not found')
        )
      ) {
        console.log(
          chalk.gray(
            '   • Missing technology detection may have caused command errors'
          )
        );
      }
    }

    // Store learning data for future analysis
    if (!this.executionLearnings) {
      this.executionLearnings = [];
    }
    this.executionLearnings.push(learningData);

    // Prune old learnings to prevent memory bloat
    if (this.executionLearnings.length > 100) {
      this.executionLearnings = this.executionLearnings.slice(-100);
    }
  }

  /**
   * Reinforce successful NLP patterns
   */
  reinforceSuccessfulPattern(intent, entities) {
    // Simple reinforcement - in a production system, this would use ML
    const patternKey = `${intent.intent}-${Object.keys(entities)
      .filter((k) => entities[k].length > 0)
      .join(',')}`;

    if (!this.successfulPatterns) {
      this.successfulPatterns = new Map();
    }

    const currentCount = this.successfulPatterns.get(patternKey) || 0;
    this.successfulPatterns.set(patternKey, currentCount + 1);

    console.log(
      chalk.gray(
        `   • Reinforced pattern: ${patternKey} (${currentCount + 1} successes)`
      )
    );
  }

  /**
   * Get learning statistics
   */
  getLearningStats() {
    if (!this.executionLearnings || this.executionLearnings.length === 0) {
      return { totalExecutions: 0, successRate: 0, mostSuccessfulIntents: [] };
    }

    const totalExecutions = this.executionLearnings.length;
    const successfulExecutions = this.executionLearnings.filter(
      (l) => l.executionSuccess
    ).length;
    const successRate = successfulExecutions / totalExecutions;

    // Get most successful intents
    const intentSuccessMap = new Map();
    this.executionLearnings.forEach((learning) => {
      const intent = learning.intent.intent;
      if (!intentSuccessMap.has(intent)) {
        intentSuccessMap.set(intent, { total: 0, successful: 0 });
      }
      const stats = intentSuccessMap.get(intent);
      stats.total++;
      if (learning.executionSuccess) {
        stats.successful++;
      }
    });

    const mostSuccessfulIntents = Array.from(intentSuccessMap.entries())
      .map(([intent, stats]) => ({
        intent,
        successRate: stats.successful / stats.total,
        totalExecutions: stats.total,
      }))
      .sort((a, b) => b.successRate - a.successRate)
      .slice(0, 5);

    return {
      totalExecutions,
      successRate,
      mostSuccessfulIntents,
    };
  }
}

module.exports = NLPEngine;
