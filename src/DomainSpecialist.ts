import chalk from 'chalk';

interface Domain {
  name: string;
  keywords: string[];
  tools: string[];
  frameworks: string[];
  concepts: string[];
}

interface DomainAnalysis {
  domain: string;
  confidence: number;
  matchedKeywords: string[];
  relevance: number;
}

interface DomainVocabulary {
  [key: string]: string[];
}

interface DomainPattern {
  pattern: RegExp;
  domain: string;
  weight: number;
}

/**
 * Domain Specialist for detecting and applying domain-specific knowledge
 */
class DomainSpecialist {
  private domains: Record<string, Domain>;
  private vocabularies: DomainVocabulary;
  private patterns: DomainPattern[];

  constructor() {
    this.domains = this.initializeDomains();
    this.vocabularies = this.initializeVocabularies();
    this.patterns = this.initializePatterns();
  }

  private initializeDomains(): Record<string, Domain> {
    return {
      WEB_DEVELOPMENT: {
        name: 'Web Development',
        keywords: [
          'html',
          'css',
          'javascript',
          'react',
          'vue',
          'angular',
          'frontend',
          'backend',
          'fullstack',
          'web',
          'website',
          'webapp',
          'spa',
          'pwa',
        ],
        tools: [
          'webpack',
          'vite',
          'parcel',
          'rollup',
          'npm',
          'yarn',
          'babel',
          'eslint',
        ],
        frameworks: [
          'react',
          'vue',
          'angular',
          'svelte',
          'next',
          'nuxt',
          'gatsby',
          'express',
          'fastify',
        ],
        concepts: [
          'component',
          'routing',
          'state management',
          'responsive design',
          'api integration',
        ],
      },
      DEVOPS: {
        name: 'DevOps',
        keywords: [
          'docker',
          'kubernetes',
          'k8s',
          'container',
          'deployment',
          'pipeline',
          'ci/cd',
          'aws',
          'azure',
          'gcp',
          'terraform',
          'ansible',
        ],
        tools: [
          'docker',
          'kubernetes',
          'terraform',
          'ansible',
          'jenkins',
          'gitlab-ci',
          'github-actions',
        ],
        frameworks: ['serverless', 'microservices', 'infrastructure-as-code'],
        concepts: [
          'containerization',
          'orchestration',
          'monitoring',
          'logging',
          'scaling',
        ],
      },
      DATA_SCIENCE: {
        name: 'Data Science',
        keywords: [
          'python',
          'pandas',
          'numpy',
          'matplotlib',
          'seaborn',
          'jupyter',
          'notebook',
          'data',
          'analysis',
          'visualization',
          'machine learning',
          'ml',
          'ai',
        ],
        tools: [
          'jupyter',
          'pandas',
          'numpy',
          'matplotlib',
          'seaborn',
          'sklearn',
          'tensorflow',
          'pytorch',
        ],
        frameworks: [
          'scikit-learn',
          'tensorflow',
          'pytorch',
          'keras',
          'xgboost',
        ],
        concepts: [
          'data cleaning',
          'feature engineering',
          'model training',
          'evaluation',
          'visualization',
        ],
      },
      MOBILE_DEVELOPMENT: {
        name: 'Mobile Development',
        keywords: [
          'ios',
          'android',
          'mobile',
          'app',
          'swift',
          'kotlin',
          'react-native',
          'flutter',
          'xamarin',
        ],
        tools: [
          'xcode',
          'android-studio',
          'react-native-cli',
          'flutter',
          'expo',
        ],
        frameworks: ['react-native', 'flutter', 'ionic', 'cordova', 'xamarin'],
        concepts: [
          'native development',
          'cross-platform',
          'app store',
          'push notifications',
          'offline support',
        ],
      },
    };
  }

  private initializeVocabularies(): DomainVocabulary {
    return {
      webDev: [
        'component',
        'props',
        'state',
        'hook',
        'middleware',
        'route',
        'endpoint',
        'api',
        'rest',
        'graphql',
      ],
      devOps: [
        'container',
        'image',
        'pod',
        'service',
        'ingress',
        'deployment',
        'pipeline',
        'artifact',
        'registry',
      ],
      dataScience: [
        'dataset',
        'feature',
        'model',
        'algorithm',
        'regression',
        'classification',
        'clustering',
        'neural network',
      ],
    };
  }

  private initializePatterns(): DomainPattern[] {
    return [
      {
        pattern: /create.*(?:component|react|vue|angular)/i,
        domain: 'WEB_DEVELOPMENT',
        weight: 0.8,
      },
      {
        pattern: /build.*(?:docker|container|image)/i,
        domain: 'DEVOPS',
        weight: 0.8,
      },
      {
        pattern: /analyze.*(?:data|dataset|csv)/i,
        domain: 'DATA_SCIENCE',
        weight: 0.8,
      },
      {
        pattern: /deploy.*(?:app|application|service)/i,
        domain: 'DEVOPS',
        weight: 0.7,
      },
      {
        pattern: /setup.*(?:environment|dev|development)/i,
        domain: 'WEB_DEVELOPMENT',
        weight: 0.6,
      },
    ];
  }

  /**
   * Detect the most relevant domain for a query
   */
  async detectDomain(
    query: string,
    context: Record<string, unknown> = {}
  ): Promise<DomainAnalysis> {
    const queryLower = query.toLowerCase();
    let bestMatch: DomainAnalysis = {
      domain: 'GENERAL',
      confidence: 0,
      matchedKeywords: [],
      relevance: 0,
    };

    // Check pattern matches first
    for (const pattern of this.patterns) {
      if (pattern.pattern.test(query)) {
        const domainData = this.domains[pattern.domain];
        if (domainData) {
          bestMatch = {
            domain: pattern.domain,
            confidence: pattern.weight,
            matchedKeywords: [],
            relevance: pattern.weight,
          };
        }
      }
    }

    // Check keyword matches for each domain
    for (const [domainKey, domainData] of Object.entries(this.domains)) {
      const matchedKeywords: string[] = [];
      let score = 0;

      // Check keywords
      for (const keyword of domainData.keywords) {
        if (queryLower.includes(keyword.toLowerCase())) {
          matchedKeywords.push(keyword);
          score += 0.1;
        }
      }

      // Check tools
      for (const tool of domainData.tools) {
        if (queryLower.includes(tool.toLowerCase())) {
          matchedKeywords.push(tool);
          score += 0.15;
        }
      }

      // Check frameworks
      for (const framework of domainData.frameworks) {
        if (queryLower.includes(framework.toLowerCase())) {
          matchedKeywords.push(framework);
          score += 0.2;
        }
      }

      // Check if this domain is relevant to project context
      if (
        context.projectType &&
        this.isDomainRelevantToProject(domainKey, context.projectType as string)
      ) {
        score += 0.1;
      }

      if (score > bestMatch.confidence) {
        bestMatch = {
          domain: domainKey,
          confidence: score,
          matchedKeywords,
          relevance: score,
        };
      }
    }

    return bestMatch;
  }

  /**
   * Get domain-specific enhancements for the query
   */
  async getDomainEnhancements(
    query: string,
    domainAnalysis: DomainAnalysis
  ): Promise<string[]> {
    const enhancements: string[] = [];

    if (domainAnalysis.confidence < 0.3) {
      return enhancements; // No clear domain detected
    }

    const domainKey = domainAnalysis.domain;
    const queryLower = query.toLowerCase();

    switch (domainKey) {
      case 'WEB_DEVELOPMENT':
        enhancements.push(...this.getWebDevSuggestions(query));
        break;
      case 'DEVOPS':
        enhancements.push(...this.getDevOpsSuggestions(query));
        break;
      case 'DATA_SCIENCE':
        enhancements.push(...this.getDataScienceSuggestions(query));
        break;
    }

    return enhancements;
  }

  /**
   * Check if domain is relevant to project type
   */
  isDomainRelevantToProject(domain: string, projectType: string): boolean {
    const projectTypeLower = projectType.toLowerCase();

    const relevanceMap: Record<string, string[]> = {
      WEB_DEVELOPMENT: [
        'web',
        'react',
        'vue',
        'angular',
        'frontend',
        'backend',
        'express',
        'next',
      ],
      DEVOPS: ['docker', 'kubernetes', 'deployment', 'ci/cd', 'infrastructure'],
      DATA_SCIENCE: ['python', 'jupyter', 'analysis', 'ml', 'ai', 'data'],
      MOBILE_DEVELOPMENT: [
        'mobile',
        'ios',
        'android',
        'react-native',
        'flutter',
      ],
    };

    const relevantTerms = relevanceMap[domain] || [];
    return relevantTerms.some((term) => projectTypeLower.includes(term));
  }

  private getWebDevSuggestions(query: string): string[] {
    const suggestions: string[] = [];
    const queryLower = query.toLowerCase();

    if (queryLower.includes('create') && queryLower.includes('component')) {
      suggestions.push(
        'Consider specifying the component type (functional, class, or custom hook)'
      );
      suggestions.push('Include props interface and styling approach');
    }

    if (queryLower.includes('api')) {
      suggestions.push('Specify REST or GraphQL API approach');
      suggestions.push('Consider error handling and loading states');
    }

    if (queryLower.includes('test')) {
      suggestions.push(
        'Consider unit tests with Jest or integration tests with Cypress'
      );
    }

    return suggestions;
  }

  private getDevOpsSuggestions(query: string): string[] {
    const suggestions: string[] = [];
    const queryLower = query.toLowerCase();

    if (queryLower.includes('docker')) {
      suggestions.push('Consider multi-stage builds for optimization');
      suggestions.push('Include health checks and proper signal handling');
    }

    if (queryLower.includes('deploy')) {
      suggestions.push('Consider blue-green or rolling deployment strategies');
      suggestions.push('Include monitoring and rollback plans');
    }

    if (queryLower.includes('kubernetes')) {
      suggestions.push('Consider resource limits and requests');
      suggestions.push('Include proper service discovery and networking');
    }

    return suggestions;
  }

  private getDataScienceSuggestions(query: string): string[] {
    const suggestions: string[] = [];
    const queryLower = query.toLowerCase();

    if (queryLower.includes('analyze') && queryLower.includes('data')) {
      suggestions.push(
        'Consider data exploration with pandas and visualization'
      );
      suggestions.push('Include data cleaning and preprocessing steps');
    }

    if (queryLower.includes('model')) {
      suggestions.push(
        'Consider cross-validation and model evaluation metrics'
      );
      suggestions.push('Include feature importance analysis');
    }

    if (queryLower.includes('visualization')) {
      suggestions.push('Consider appropriate chart types for your data');
      suggestions.push(
        'Include interactive visualizations with plotly or bokeh'
      );
    }

    return suggestions;
  }

  /**
   * Display domain analysis results
   */
  displayDomainAnalysis(
    domainAnalysis: DomainAnalysis,
    enhancements: string[]
  ): void {
    if (domainAnalysis.confidence > 0.3) {
      console.log(chalk.blue('\n🎯 Domain Analysis:'));

      const domainData = this.domains[domainAnalysis.domain];
      const domainName = domainData ? domainData.name : domainAnalysis.domain;

      console.log(
        chalk.cyan(
          `Domain: ${domainName} (${(domainAnalysis.confidence * 100).toFixed(
            1
          )}%)`
        )
      );

      if (domainAnalysis.matchedKeywords.length > 0) {
        console.log(
          chalk.gray(`Matched: ${domainAnalysis.matchedKeywords.join(', ')}`)
        );
      }

      if (enhancements.length > 0) {
        console.log(chalk.yellow('\n🔧 Domain-specific suggestions:'));
        enhancements.forEach((enhancement) => {
          console.log(chalk.gray(`  • ${enhancement}`));
        });
      }
    }
  }

  /**
   * Get all available domains
   */
  getAvailableDomains(): string[] {
    return Object.keys(this.domains);
  }

  /**
   * Get domain information
   */
  getDomainInfo(domainKey: string): Domain | null {
    return this.domains[domainKey] || null;
  }
}

export default DomainSpecialist;
