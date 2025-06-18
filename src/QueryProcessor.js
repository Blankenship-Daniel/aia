const chalk = require('chalk');

/**
 * Query Processor for expanding, correcting, and enhancing user queries
 */
class QueryProcessor {
  constructor() {
    this.abbreviations = this.initializeAbbreviations();
    this.corrections = this.initializeCommonCorrections();
    this.expansions = this.initializeQueryExpansions();
  }

  initializeAbbreviations() {
    return new Map([
      // Development abbreviations
      ['js', 'javascript'],
      ['ts', 'typescript'],
      ['py', 'python'],
      ['db', 'database'],
      ['api', 'application programming interface'],
      ['ui', 'user interface'],
      ['ux', 'user experience'],
      ['ci', 'continuous integration'],
      ['cd', 'continuous deployment'],
      ['k8s', 'kubernetes'],
      ['tf', 'terraform'],

      // Command abbreviations
      ['npm i', 'npm install'],
      ['git co', 'git checkout'],
      ['git ci', 'git commit'],
      ['git st', 'git status'],
      ['ls -la', 'list all files with details'],
      ['ps aux', 'show all running processes'],

      // Common tech abbreviations
      ['ml', 'machine learning'],
      ['ai', 'artificial intelligence'],
      ['nlp', 'natural language processing'],
      ['devops', 'development operations'],
      ['sre', 'site reliability engineering'],
      ['aws', 'amazon web services'],
      ['gcp', 'google cloud platform'],
    ]);
  }

  initializeCommonCorrections() {
    return new Map([
      // Common typos
      ['createt', 'create'],
      ['analayze', 'analyze'],
      ['optmize', 'optimize'],
      ['depoy', 'deploy'],
      ['debugg', 'debug'],
      ['confgiure', 'configure'],
      ['instll', 'install'],
      ['runing', 'running'],
      ['strat', 'start'],
      ['stpo', 'stop'],

      // Technical term corrections
      ['javascirpt', 'javascript'],
      ['typesciprt', 'typescript'],
      ['pythong', 'python'],
      ['databse', 'database'],
      ['kubernets', 'kubernetes'],
      ['dockerr', 'docker'],
      ['reactt', 'react'],
      ['angualr', 'angular'],
    ]);
  }

  initializeQueryExpansions() {
    return new Map([
      // Expand vague queries
      ['make it better', 'optimize and improve the current implementation'],
      ['fix it', 'debug and resolve the current issue'],
      ['check this', 'analyze and review the current code or configuration'],
      ['setup project', 'create and configure a new project with dependencies'],
      ['deploy app', 'build and deploy the application to production'],

      // Add context to incomplete queries
      ['test', 'run tests and verify functionality'],
      ['build', 'compile and build the project'],
      ['run', 'execute the application or script'],
      ['clean', 'remove temporary files and clean build artifacts'],
      ['update', 'update dependencies and packages to latest versions'],
    ]);
  }

  /**
   * Process and enhance user query
   */
  async processQuery(query) {
    console.log(chalk.blue('🔍 Processing query for enhancements...'));

    let processedQuery = query;
    const enhancements = {
      originalQuery: query,
      corrections: [],
      expansions: [],
      abbreviationsExpanded: [],
      suggestions: [],
    };

    // Step 1: Spell correction
    processedQuery = this.applySpellCorrections(processedQuery, enhancements);

    // Step 2: Expand abbreviations
    processedQuery = this.expandAbbreviations(processedQuery, enhancements);

    // Step 3: Query expansion
    processedQuery = this.expandQuery(processedQuery, enhancements);

    // Step 4: Add context suggestions
    this.addContextSuggestions(processedQuery, enhancements);

    // Step 5: Detect and handle ambiguity
    const ambiguityAnalysis = this.analyzeAmbiguity(processedQuery);

    return {
      processedQuery,
      enhancements,
      ambiguityAnalysis,
      confidence: this.calculateProcessingConfidence(
        enhancements,
        ambiguityAnalysis
      ),
    };
  }

  /**
   * Apply spell corrections
   */
  applySpellCorrections(query, enhancements) {
    let correctedQuery = query;

    for (const [typo, correction] of this.corrections) {
      const regex = new RegExp(`\\b${typo}\\b`, 'gi');
      if (regex.test(correctedQuery)) {
        correctedQuery = correctedQuery.replace(regex, correction);
        enhancements.corrections.push({
          original: typo,
          corrected: correction,
          confidence: 0.8,
        });
      }
    }

    return correctedQuery;
  }

  /**
   * Expand abbreviations
   */
  expandAbbreviations(query, enhancements) {
    let expandedQuery = query;

    for (const [abbrev, expansion] of this.abbreviations) {
      const regex = new RegExp(`\\b${abbrev}\\b`, 'gi');
      if (regex.test(expandedQuery)) {
        // Don't expand if it's part of a command
        if (!this.isPartOfCommand(query, abbrev)) {
          expandedQuery = expandedQuery.replace(regex, expansion);
          enhancements.abbreviationsExpanded.push({
            abbreviation: abbrev,
            expansion: expansion,
          });
        }
      }
    }

    return expandedQuery;
  }

  /**
   * Expand vague or incomplete queries
   */
  expandQuery(query, enhancements) {
    let expandedQuery = query;

    for (const [vague, expansion] of this.expansions) {
      const regex = new RegExp(`\\b${vague}\\b`, 'gi');
      if (regex.test(expandedQuery)) {
        expandedQuery = expandedQuery.replace(regex, expansion);
        enhancements.expansions.push({
          original: vague,
          expanded: expansion,
        });
      }
    }

    return expandedQuery;
  }

  /**
   * Add contextual suggestions
   */
  addContextSuggestions(query, enhancements) {
    const words = query.toLowerCase().split(/\s+/);

    // Suggest adding technology context
    if (
      words.some((w) => ['create', 'build', 'setup'].includes(w)) &&
      !words.some((w) => ['javascript', 'python', 'node', 'react'].includes(w))
    ) {
      enhancements.suggestions.push(
        'Consider specifying the programming language or framework'
      );
    }

    // Suggest adding target context
    if (
      words.some((w) => ['deploy', 'publish'].includes(w)) &&
      !words.some((w) =>
        ['production', 'staging', 'server', 'cloud'].includes(w)
      )
    ) {
      enhancements.suggestions.push(
        'Consider specifying the deployment target'
      );
    }

    // Suggest adding scope context
    if (
      words.some((w) => ['test', 'check'].includes(w)) &&
      !words.some((w) =>
        ['unit', 'integration', 'e2e', 'performance'].includes(w)
      )
    ) {
      enhancements.suggestions.push(
        'Consider specifying the type of testing needed'
      );
    }
  }

  /**
   * Analyze query for ambiguity
   */
  analyzeAmbiguity(query) {
    const ambiguity = {
      level: 'low',
      reasons: [],
      clarificationQuestions: [],
    };

    const words = query.toLowerCase().split(/\s+/);

    // Check for pronouns without clear referents
    const pronouns = ['it', 'this', 'that', 'they', 'them'];
    const hasPronouns = pronouns.some((p) => words.includes(p));

    if (hasPronouns) {
      ambiguity.level = 'medium';
      ambiguity.reasons.push('Contains pronouns that may need clarification');
      ambiguity.clarificationQuestions.push(
        'What specifically does "it" or "this" refer to?'
      );
    }

    // Check for vague terms
    const vagueTerms = ['stuff', 'things', 'something', 'everything'];
    const hasVagueTerms = vagueTerms.some((t) => words.includes(t));

    if (hasVagueTerms) {
      ambiguity.level = 'high';
      ambiguity.reasons.push('Contains vague terms that need specification');
      ambiguity.clarificationQuestions.push(
        'Can you be more specific about what you want to work with?'
      );
    }

    // Check for short queries
    if (words.length < 4) {
      ambiguity.level = ambiguity.level === 'high' ? 'high' : 'medium';
      ambiguity.reasons.push('Query is quite short and may lack context');
      ambiguity.clarificationQuestions.push(
        'Could you provide more details about what you want to achieve?'
      );
    }

    return ambiguity;
  }

  /**
   * Check if abbreviation is part of a command
   */
  isPartOfCommand(query, abbrev) {
    const commandPatterns = /(?:^|\s)(npm|yarn|pip|git|docker|kubectl)\s+/gi;
    const match = commandPatterns.exec(query);
    return match && query.indexOf(abbrev) > match.index;
  }

  /**
   * Calculate confidence in query processing
   */
  calculateProcessingConfidence(enhancements, ambiguityAnalysis) {
    let confidence = 0.7; // Base confidence

    // Boost confidence for corrections and expansions
    if (enhancements.corrections.length > 0) confidence += 0.1;
    if (enhancements.abbreviationsExpanded.length > 0) confidence += 0.1;
    if (enhancements.expansions.length > 0) confidence += 0.1;

    // Reduce confidence for ambiguity
    switch (ambiguityAnalysis.level) {
      case 'high':
        confidence -= 0.3;
        break;
      case 'medium':
        confidence -= 0.1;
        break;
      default:
        break;
    }

    return Math.max(0.1, Math.min(1.0, confidence));
  }

  /**
   * Display query processing results
   */
  displayProcessingResults(result) {
    if (result.enhancements.corrections.length > 0) {
      console.log(chalk.yellow('📝 Spell corrections applied:'));
      result.enhancements.corrections.forEach((c) => {
        console.log(chalk.gray(`   ${c.original} → ${c.corrected}`));
      });
    }

    if (result.enhancements.abbreviationsExpanded.length > 0) {
      console.log(chalk.blue('🔍 Abbreviations expanded:'));
      result.enhancements.abbreviationsExpanded.forEach((a) => {
        console.log(chalk.gray(`   ${a.abbreviation} → ${a.expansion}`));
      });
    }

    if (result.enhancements.suggestions.length > 0) {
      console.log(chalk.cyan('💡 Suggestions for clarity:'));
      result.enhancements.suggestions.forEach((s) => {
        console.log(chalk.gray(`   • ${s}`));
      });
    }

    if (result.ambiguityAnalysis.level !== 'low') {
      console.log(
        chalk.magenta(`🤔 Ambiguity level: ${result.ambiguityAnalysis.level}`)
      );
      result.ambiguityAnalysis.clarificationQuestions.forEach((q) => {
        console.log(chalk.gray(`   ? ${q}`));
      });
    }
  }
}

module.exports = QueryProcessor;
