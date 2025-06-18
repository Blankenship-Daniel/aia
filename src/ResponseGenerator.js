const chalk = require('chalk');

/**
 * Enhanced Response Generator
 * Improves response quality, coherence, and user experience
 */
class ResponseGenerator {
  constructor(aia) {
    this.aia = aia;
    this.responseTemplates = this.initializeTemplates();
    this.stylePreferences = new Map();
    this.adaptationEngine = new ResponseAdaptationEngine();
  }

  /**
   * Generate enhanced response with improved coherence and structure
   */
  async generateEnhancedResponse(query, context, nlpAnalysis) {
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
  selectResponseStrategy(nlpAnalysis, context) {
    const strategy = {
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
      strategy.verbosity = 'detailed';
    }

    // Adapt based on user preferences (if available)
    const userPrefs = this.getUserPreferences(context.userId);
    if (userPrefs) {
      strategy.style = userPrefs.preferredStyle || strategy.style;
      strategy.verbosity = userPrefs.preferredVerbosity || strategy.verbosity;
      strategy.technicalLevel =
        userPrefs.technicalLevel || strategy.technicalLevel;
    }

    return strategy;
  }

  /**
   * Build structured prompt for better AI responses
   */
  async buildStructuredPrompt(query, context, nlpAnalysis, strategy) {
    const promptSections = [];

    // System role and context
    promptSections.push(this.buildSystemContext(strategy, context));

    // Enhanced user query with context
    promptSections.push(this.buildEnhancedQuery(query, nlpAnalysis, context));

    // Response guidelines
    promptSections.push(this.buildResponseGuidelines(strategy, nlpAnalysis));

    // Output format specification
    promptSections.push(this.buildOutputFormat(strategy, nlpAnalysis));

    return promptSections.join('\n\n');
  }

  /**
   * Build system context section
   */
  buildSystemContext(strategy, context) {
    let systemContext = `You are an intelligent AI assistant specialized in software development and technical tasks.`;

    // Add role-specific context
    switch (strategy.type) {
      case 'instructional':
        systemContext += ` You excel at providing clear, step-by-step instructions and practical examples.`;
        break;
      case 'analytical':
        systemContext += ` You excel at thorough analysis, breaking down complex problems, and providing insights.`;
        break;
      case 'troubleshooting':
        systemContext += ` You excel at diagnosing problems, providing solutions, and preventing future issues.`;
        break;
      case 'advisory':
        systemContext += ` You excel at providing recommendations, best practices, and optimization strategies.`;
        break;
    }

    // Add context information
    if (context.projectType) {
      systemContext += `\n\nCurrent project context: ${context.projectType} project`;
    }
    if (context.workingDirectory) {
      systemContext += `\nWorking directory: ${context.workingDirectory}`;
    }
    if (context.gitStatus) {
      systemContext += `\nGit status: ${context.gitStatus}`;
    }

    return systemContext;
  }

  /**
   * Build enhanced query section
   */
  buildEnhancedQuery(query, nlpAnalysis, context) {
    let enhancedQuery = `User Query: "${query}"`;

    // Add intent analysis
    if (nlpAnalysis.intent.confidence > 0.7) {
      enhancedQuery += `\n\nDetected Intent: ${nlpAnalysis.intent.intent}`;
      if (nlpAnalysis.intent.subType) {
        enhancedQuery += ` (${nlpAnalysis.intent.subType})`;
      }
    }

    // Add extracted entities
    if (nlpAnalysis.entities.technologies.length > 0) {
      enhancedQuery += `\nTechnologies: ${nlpAnalysis.entities.technologies.join(
        ', '
      )}`;
    }
    if (nlpAnalysis.entities.tools.length > 0) {
      enhancedQuery += `\nTools: ${nlpAnalysis.entities.tools.join(', ')}`;
    }
    if (nlpAnalysis.entities.targets.length > 0) {
      enhancedQuery += `\nTargets: ${nlpAnalysis.entities.targets.join(', ')}`;
    }

    return enhancedQuery;
  }

  /**
   * Build response guidelines section
   */
  buildResponseGuidelines(strategy, nlpAnalysis) {
    const guidelines = ['Response Guidelines:'];

    // Style guidelines
    switch (strategy.style) {
      case 'professional':
        guidelines.push('- Use professional, clear language');
        break;
      case 'casual':
        guidelines.push('- Use friendly, conversational tone');
        break;
      case 'technical':
        guidelines.push('- Use precise technical terminology');
        break;
    }

    // Verbosity guidelines
    switch (strategy.verbosity) {
      case 'concise':
        guidelines.push('- Be concise and to the point');
        break;
      case 'balanced':
        guidelines.push(
          '- Provide balanced detail - not too brief, not too verbose'
        );
        break;
      case 'detailed':
        guidelines.push('- Provide comprehensive explanations and details');
        break;
    }

    // Technical level guidelines
    switch (strategy.technicalLevel) {
      case 'beginner':
        guidelines.push('- Explain technical concepts clearly for beginners');
        break;
      case 'intermediate':
        guidelines.push('- Assume intermediate technical knowledge');
        break;
      case 'advanced':
        guidelines.push('- Use advanced technical concepts and terminology');
        break;
    }

    // Content guidelines
    if (strategy.includeExamples) {
      guidelines.push('- Include practical examples and code snippets');
    }
    if (strategy.includeSteps) {
      guidelines.push('- Break down the solution into clear, actionable steps');
    }
    if (strategy.includeWarnings) {
      guidelines.push('- Include important warnings and potential pitfalls');
    }

    return guidelines.join('\n');
  }

  /**
   * Build output format specification
   */
  buildOutputFormat(strategy, nlpAnalysis) {
    let format = 'Output Format:\n';

    switch (strategy.structure) {
      case 'linear':
        format += '- Provide a clear, linear response with logical flow';
        break;
      case 'hierarchical':
        format += '- Use hierarchical structure with headers and sections';
        format += '\n- Use proper markdown formatting for readability';
        break;
    }

    if (strategy.includeSteps) {
      format += '\n- Number steps clearly (1., 2., 3., etc.)';
      format += '\n- Each step should be actionable and specific';
    }

    if (strategy.includeExamples) {
      format += '\n- Include code examples in appropriate language';
      format += '\n- Wrap code in proper markdown code blocks';
    }

    // Add goal-specific formatting
    if (nlpAnalysis.goalType === 'COMPLEX') {
      format += '\n- Break complex topics into digestible sections';
      format += '\n- Use bullet points for lists and key points';
    }

    return format;
  }

  /**
   * Enhance raw AI response
   */
  async enhanceResponse(rawResponse, strategy, context) {
    // Ensure rawResponse is a string
    let enhancedContent =
      typeof rawResponse === 'string'
        ? rawResponse
        : rawResponse?.content ||
          rawResponse?.toString() ||
          'No response received';

    const adaptations = [];
    let clarificationNeeded = false;

    // Apply structure enhancements
    if (strategy.structure === 'hierarchical') {
      enhancedContent = this.addStructuralHeaders(enhancedContent);
      adaptations.push('Added structural headers');
    }

    // Add code highlighting
    enhancedContent = this.enhanceCodeBlocks(enhancedContent);
    adaptations.push('Enhanced code formatting');

    // Add safety warnings if needed
    if (strategy.includeWarnings) {
      const warnings = this.identifyPotentialWarnings(enhancedContent);
      if (warnings.length > 0) {
        enhancedContent = this.addWarnings(enhancedContent, warnings);
        adaptations.push('Added safety warnings');
      }
    }

    // Add clarifications for ambiguous content
    const ambiguities = this.identifyAmbiguities(enhancedContent);
    if (ambiguities.length > 0) {
      clarificationNeeded = true;
      adaptations.push('Identified potential ambiguities');
    }

    // Add helpful context links
    enhancedContent = this.addContextualLinks(enhancedContent, context);
    adaptations.push('Added contextual information');

    return {
      content: enhancedContent,
      adaptations,
      clarificationNeeded,
    };
  }

  /**
   * Assess response quality
   */
  assessResponseQuality(enhancedResponse, originalQuery, nlpAnalysis) {
    let score = 1.0;
    const factors = [];

    // Check for completeness
    if (this.isResponseComplete(enhancedResponse.content, nlpAnalysis)) {
      factors.push({ factor: 'completeness', score: 1.0 });
    } else {
      score -= 0.2;
      factors.push({ factor: 'completeness', score: 0.8 });
    }

    // Check for clarity
    const clarityScore = this.assessClarity(enhancedResponse.content);
    score *= clarityScore;
    factors.push({ factor: 'clarity', score: clarityScore });

    // Check for actionability
    if (nlpAnalysis.intent.intent !== 'SEARCH') {
      const actionabilityScore = this.assessActionability(
        enhancedResponse.content
      );
      score *= actionabilityScore;
      factors.push({ factor: 'actionability', score: actionabilityScore });
    }

    // Check for technical accuracy
    const accuracyScore = this.assessTechnicalAccuracy(
      enhancedResponse.content,
      nlpAnalysis
    );
    score *= accuracyScore;
    factors.push({ factor: 'accuracy', score: accuracyScore });

    return {
      overall: Math.max(0, Math.min(1, score)),
      factors,
    };
  }

  /**
   * Generate follow-up suggestions
   */
  generateFollowUpSuggestions(enhancedResponse, nlpAnalysis) {
    const suggestions = [];

    // Intent-based suggestions
    switch (nlpAnalysis.intent.intent) {
      case 'CREATE':
        suggestions.push(
          'Would you like me to help test or validate what was created?'
        );
        suggestions.push('Do you need help with deployment or configuration?');
        break;
      case 'ANALYZE':
        suggestions.push(
          'Would you like me to suggest improvements based on the analysis?'
        );
        suggestions.push('Do you need help implementing any of the findings?');
        break;
      case 'FIX':
        suggestions.push(
          'Would you like me to help prevent this issue in the future?'
        );
        suggestions.push('Do you need help testing the fix?');
        break;
      case 'OPTIMIZE':
        suggestions.push(
          'Would you like me to help implement these optimizations?'
        );
        suggestions.push(
          'Do you need help measuring the performance improvements?'
        );
        break;
    }

    // Add general suggestions
    if (nlpAnalysis.goalType === 'COMPLEX') {
      suggestions.push(
        'Would you like me to break this down into smaller, manageable tasks?'
      );
    }

    return suggestions.slice(0, 3); // Limit to top 3 suggestions
  }

  /**
   * Helper methods for response enhancement
   */
  addStructuralHeaders(content) {
    // Ensure content is a string
    if (typeof content !== 'string') {
      return content?.toString() || '';
    }

    // Add headers to improve readability
    let enhanced = content;

    // Add main sections
    enhanced = enhanced.replace(/^(\d+\.\s+)/gm, '\n## $1');

    // Add sub-sections for detailed explanations
    enhanced = enhanced.replace(/^([A-Z][^.]*:)$/gm, '\n### $1');

    return enhanced;
  }

  enhanceCodeBlocks(content) {
    // Ensure proper code block formatting
    let enhanced = content;

    // Fix missing language specifiers
    enhanced = enhanced.replace(
      /```\n((?:npm|yarn|git|docker|kubectl)\s+)/g,
      '```bash\n$1'
    );
    enhanced = enhanced.replace(
      /```\n((?:import|export|const|let|var|function)\s+)/g,
      '```javascript\n$1'
    );
    enhanced = enhanced.replace(
      /```\n((?:def|import|from|class)\s+)/g,
      '```python\n$1'
    );

    return enhanced;
  }

  identifyPotentialWarnings(content) {
    const warnings = [];
    const warningPatterns = [
      {
        pattern: /rm\s+-rf/i,
        warning: 'Destructive file operation - use with caution',
      },
      { pattern: /sudo/i, warning: 'Requires administrative privileges' },
      {
        pattern: /production/i,
        warning: 'Production environment - double-check before proceeding',
      },
      {
        pattern: /delete|drop/i,
        warning: 'Data deletion operation - ensure you have backups',
      },
    ];

    for (const { pattern, warning } of warningPatterns) {
      if (pattern.test(content)) {
        warnings.push(warning);
      }
    }

    return warnings;
  }

  addWarnings(content, warnings) {
    if (warnings.length === 0) return content;

    const warningSection =
      '\n\n⚠️ **Important Warnings:**\n' +
      warnings.map((warning) => `- ${warning}`).join('\n') +
      '\n';

    return content + warningSection;
  }

  identifyAmbiguities(content) {
    const ambiguities = [];
    const ambiguousPatterns = [
      { pattern: /\b(it|this|that)\b/gi, type: 'pronoun_reference' },
      { pattern: /\bmight|could|possibly\b/gi, type: 'uncertainty' },
      { pattern: /\bdepends on|varies\b/gi, type: 'conditional' },
    ];

    for (const { pattern, type } of ambiguousPatterns) {
      const matches = content.match(pattern);
      if (matches && matches.length > 2) {
        ambiguities.push({ type, count: matches.length });
      }
    }

    return ambiguities;
  }

  addContextualLinks(content, context) {
    let enhanced = content;

    // Add helpful contextual information
    if (context.projectType === 'Node.js') {
      enhanced = enhanced.replace(/\bnpm\b/g, '[npm](https://www.npmjs.com/)');
    }

    if (context.gitStatus) {
      enhanced = enhanced.replace(/\bgit\b/g, '[git](https://git-scm.com/)');
    }

    return enhanced;
  }

  isResponseComplete(content, nlpAnalysis) {
    // Check if response addresses the main intent
    const intentKeywords = {
      CREATE: ['create', 'build', 'make', 'generate'],
      ANALYZE: ['analyze', 'examine', 'review'],
      FIX: ['fix', 'solve', 'resolve'],
      OPTIMIZE: ['optimize', 'improve', 'enhance'],
    };

    const keywords = intentKeywords[nlpAnalysis.intent.intent] || [];
    return keywords.some((keyword) => content.toLowerCase().includes(keyword));
  }

  assessClarity(content) {
    // Simple clarity assessment based on structure and readability
    let score = 1.0;

    const sentences = content.split(/[.!?]+/).length;
    const words = content.split(/\s+/).length;
    const avgSentenceLength = words / sentences;

    // Penalize very long sentences
    if (avgSentenceLength > 30) score -= 0.1;
    if (avgSentenceLength > 40) score -= 0.1;

    // Reward good structure
    if (content.includes('##') || content.includes('1.')) score += 0.1;
    if (content.includes('```')) score += 0.05;

    return Math.max(0.5, Math.min(1.0, score));
  }

  assessActionability(content) {
    // Check for actionable elements
    const actionableElements = [
      /\d+\./g, // Numbered steps
      /```/g, // Code blocks
      /\$\s+/g, // Command line instructions
      /\b(run|execute|create|install|configure)\b/gi,
    ];

    let score = 0.7; // Base score

    for (const pattern of actionableElements) {
      const matches = content.match(pattern);
      if (matches) {
        score += Math.min(0.1, matches.length * 0.02);
      }
    }

    return Math.min(1.0, score);
  }

  assessTechnicalAccuracy(content, nlpAnalysis) {
    // Basic technical accuracy checks
    let score = 0.9; // Assume good accuracy unless issues found

    // Check for common technical issues
    const issuePatterns = [
      {
        pattern: /npm install -g/i,
        issue: 'Global npm install may have issues',
      },
      { pattern: /sudo npm/i, issue: 'sudo npm is generally not recommended' },
    ];

    for (const { pattern } of issuePatterns) {
      if (pattern.test(content)) {
        score -= 0.1;
      }
    }

    return Math.max(0.5, score);
  }

  getUserPreferences(userId) {
    return this.stylePreferences.get(userId);
  }

  updateUserPreferences(userId, preferences) {
    this.stylePreferences.set(userId, preferences);
  }

  initializeTemplates() {
    return {
      instructional: {
        structure: 'step-by-step',
        includeExamples: true,
        verbosity: 'detailed',
      },
      analytical: {
        structure: 'hierarchical',
        includeExamples: false,
        verbosity: 'comprehensive',
      },
      troubleshooting: {
        structure: 'problem-solution',
        includeWarnings: true,
        verbosity: 'focused',
      },
    };
  }
}

/**
 * Response Adaptation Engine for learning user preferences
 */
class ResponseAdaptationEngine {
  constructor() {
    this.userFeedback = new Map();
    this.responsePatterns = new Map();
  }

  recordFeedback(userId, responseId, feedback) {
    if (!this.userFeedback.has(userId)) {
      this.userFeedback.set(userId, []);
    }

    this.userFeedback.get(userId).push({
      responseId,
      feedback,
      timestamp: new Date().toISOString(),
    });
  }

  adaptToUser(userId) {
    const feedback = this.userFeedback.get(userId) || [];
    const preferences = this.analyzePreferences(feedback);

    return preferences;
  }

  analyzePreferences(feedback) {
    // Analyze feedback to determine user preferences
    const preferences = {
      preferredVerbosity: 'balanced',
      preferredStyle: 'professional',
      technicalLevel: 'intermediate',
    };

    // Simple analysis based on feedback patterns
    const recentFeedback = feedback.slice(-10);

    // Analyze verbosity preferences
    const verbosityFeedback = recentFeedback.filter(
      (f) => f.feedback.includes('too long') || f.feedback.includes('too short')
    );

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

module.exports = ResponseGenerator;
