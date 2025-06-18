const chalk = require('chalk');

/**
 * Domain Specialist for detecting and applying domain-specific knowledge
 */
class DomainSpecialist {
  constructor() {
    this.domains = this.initializeDomains();
    this.vocabularies = this.initializeVocabularies();
    this.patterns = this.initializePatterns();
  }

  initializeDomains() {
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
        ],
        confidence: 0,
      },
      DEVOPS: {
        name: 'DevOps',
        keywords: [
          'docker',
          'kubernetes',
          'k8s',
          'ci',
          'cd',
          'pipeline',
          'deploy',
          'deployment',
          'infrastructure',
          'cloud',
          'aws',
          'azure',
          'gcp',
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
        frameworks: ['terraform', 'ansible', 'helm', 'istio'],
        confidence: 0,
      },
      DATA_SCIENCE: {
        name: 'Data Science & ML',
        keywords: [
          'python',
          'jupyter',
          'notebook',
          'pandas',
          'numpy',
          'sklearn',
          'tensorflow',
          'pytorch',
          'ml',
          'ai',
          'model',
          'dataset',
          'analysis',
        ],
        tools: [
          'jupyter',
          'pandas',
          'numpy',
          'matplotlib',
          'seaborn',
          'scikit-learn',
        ],
        frameworks: ['tensorflow', 'pytorch', 'keras', 'huggingface'],
        confidence: 0,
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
          'java',
          'react-native',
          'flutter',
          'xamarin',
        ],
        tools: ['xcode', 'android-studio', 'fastlane', 'expo'],
        frameworks: ['react-native', 'flutter', 'ionic', 'cordova'],
        confidence: 0,
      },
      BACKEND_DEVELOPMENT: {
        name: 'Backend Development',
        keywords: [
          'api',
          'server',
          'database',
          'node',
          'express',
          'fastapi',
          'django',
          'flask',
          'spring',
          'microservices',
        ],
        tools: ['postman', 'insomnia', 'swagger', 'graphql'],
        frameworks: ['express', 'fastapi', 'django', 'flask', 'spring-boot'],
        confidence: 0,
      },
      DATABASE: {
        name: 'Database Management',
        keywords: [
          'sql',
          'nosql',
          'database',
          'db',
          'mysql',
          'postgresql',
          'mongodb',
          'redis',
          'elasticsearch',
          'query',
          'schema',
        ],
        tools: ['mysql', 'postgresql', 'mongodb', 'redis', 'elasticsearch'],
        frameworks: ['prisma', 'sequelize', 'mongoose', 'sqlalchemy'],
        confidence: 0,
      },
    };
  }

  initializeVocabularies() {
    return {
      WEB_DEVELOPMENT: {
        entities: {
          components: ['component', 'widget', 'element', 'module'],
          styling: [
            'css',
            'sass',
            'scss',
            'less',
            'styled-components',
            'tailwind',
          ],
          bundling: ['webpack', 'vite', 'parcel', 'rollup', 'build', 'bundle'],
          testing: [
            'jest',
            'cypress',
            'playwright',
            'testing-library',
            'unit-test',
            'e2e',
          ],
        },
        actions: {
          create: ['scaffold', 'generate', 'bootstrap', 'initialize'],
          optimize: ['minify', 'compress', 'tree-shake', 'code-split'],
          deploy: ['publish', 'release', 'ship', 'go-live'],
        },
      },
      DEVOPS: {
        entities: {
          containers: ['container', 'image', 'dockerfile', 'pod', 'deployment'],
          orchestration: ['cluster', 'node', 'service', 'ingress', 'namespace'],
          ci_cd: ['pipeline', 'job', 'stage', 'workflow', 'action', 'runner'],
        },
        actions: {
          deploy: ['rollout', 'release', 'promote', 'ship'],
          scale: ['autoscale', 'horizontal-scale', 'vertical-scale'],
          monitor: ['observe', 'track', 'alert', 'dashboard'],
        },
      },
      DATA_SCIENCE: {
        entities: {
          data: ['dataset', 'dataframe', 'series', 'matrix', 'tensor'],
          models: ['classifier', 'regressor', 'neural-network', 'transformer'],
          metrics: ['accuracy', 'precision', 'recall', 'f1-score', 'loss'],
        },
        actions: {
          analyze: ['explore', 'visualize', 'profile', 'summarize'],
          train: ['fit', 'learn', 'optimize', 'tune'],
          evaluate: ['validate', 'test', 'benchmark', 'score'],
        },
      },
    };
  }

  initializePatterns() {
    return {
      WEB_DEVELOPMENT: [
        /create\s+(?:a\s+)?(?:new\s+)?(?:react|vue|angular)\s+(?:app|project|component)/i,
        /setup\s+(?:a\s+)?(?:web|frontend|backend)\s+(?:development\s+)?environment/i,
        /build\s+(?:and\s+)?deploy\s+(?:a\s+)?(?:web|frontend)\s+(?:app|application)/i,
      ],
      DEVOPS: [
        /(?:deploy|containerize|dockerize)\s+(?:the\s+)?(?:app|application|service)/i,
        /setup\s+(?:a\s+)?(?:ci\/cd|pipeline|kubernetes|k8s)/i,
        /(?:scale|monitor|manage)\s+(?:the\s+)?(?:infrastructure|deployment)/i,
      ],
      DATA_SCIENCE: [
        /(?:analyze|explore|visualize)\s+(?:the\s+)?(?:data|dataset)/i,
        /(?:train|build|create)\s+(?:a\s+)?(?:model|classifier|ml\s+model)/i,
        /(?:clean|preprocess|prepare)\s+(?:the\s+)?data/i,
      ],
    };
  }

  /**
   * Detect the most relevant domain for a query
   */
  async detectDomain(query, context = {}) {
    console.log(chalk.blue('🎯 Detecting domain context...'));

    const input = query.toLowerCase();
    const domainScores = {};

    // Reset confidence scores
    Object.keys(this.domains).forEach((domain) => {
      this.domains[domain].confidence = 0;
    });

    // Score based on keywords
    for (const [domainKey, domain] of Object.entries(this.domains)) {
      let score = 0;

      // Keyword matching
      domain.keywords.forEach((keyword) => {
        if (input.includes(keyword)) {
          score += 1;
        }
      });

      // Tool/framework matching (higher weight)
      domain.tools.forEach((tool) => {
        if (input.includes(tool)) {
          score += 2;
        }
      });

      domain.frameworks.forEach((framework) => {
        if (input.includes(framework)) {
          score += 2;
        }
      });

      // Pattern matching (highest weight)
      if (this.patterns[domainKey]) {
        this.patterns[domainKey].forEach((pattern) => {
          if (pattern.test(query)) {
            score += 3;
          }
        });
      }

      // Context enhancement
      if (context.projectType) {
        if (this.isDomainRelevantToProject(domainKey, context.projectType)) {
          score += 1;
        }
      }

      domainScores[domainKey] = score;
      this.domains[domainKey].confidence = Math.min(score / 5, 1.0); // Normalize to 0-1
    }

    // Find primary domain
    const primaryDomain = Object.entries(domainScores).sort(
      (a, b) => b[1] - a[1]
    )[0];

    // Find secondary domains (if any significant match)
    const secondaryDomains = Object.entries(domainScores)
      .filter(([key, score]) => key !== primaryDomain[0] && score >= 2)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 2);

    return {
      primary: {
        domain: primaryDomain[0],
        name: this.domains[primaryDomain[0]].name,
        confidence: this.domains[primaryDomain[0]].confidence,
        score: primaryDomain[1],
      },
      secondary: secondaryDomains.map(([key, score]) => ({
        domain: key,
        name: this.domains[key].name,
        confidence: this.domains[key].confidence,
        score,
      })),
      allScores: domainScores,
    };
  }

  /**
   * Get domain-specific enhancements for the query
   */
  async getDomainEnhancements(query, domainAnalysis) {
    const primaryDomain = domainAnalysis.primary.domain;
    const enhancements = {
      vocabulary: {},
      suggestions: [],
      contextualHints: [],
      bestPractices: [],
    };

    if (this.vocabularies[primaryDomain]) {
      enhancements.vocabulary = this.vocabularies[primaryDomain];
    }

    // Add domain-specific suggestions
    switch (primaryDomain) {
      case 'WEB_DEVELOPMENT':
        enhancements.suggestions = this.getWebDevSuggestions(query);
        enhancements.bestPractices = [
          'Consider responsive design and accessibility',
          'Use semantic HTML and proper CSS organization',
          'Implement proper error handling and loading states',
        ];
        break;

      case 'DEVOPS':
        enhancements.suggestions = this.getDevOpsSuggestions(query);
        enhancements.bestPractices = [
          'Follow infrastructure as code principles',
          'Implement proper monitoring and logging',
          'Use blue-green or canary deployment strategies',
        ];
        break;

      case 'DATA_SCIENCE':
        enhancements.suggestions = this.getDataScienceSuggestions(query);
        enhancements.bestPractices = [
          'Validate data quality and handle missing values',
          'Use proper train/validation/test splits',
          'Document data sources and preprocessing steps',
        ];
        break;
    }

    return enhancements;
  }

  /**
   * Check if domain is relevant to project type
   */
  isDomainRelevantToProject(domain, projectType) {
    const relevanceMap = {
      WEB_DEVELOPMENT: ['Node.js', 'React', 'Vue', 'Angular', 'Web'],
      DEVOPS: ['Docker', 'Kubernetes', 'Infrastructure'],
      DATA_SCIENCE: ['Python', 'Jupyter', 'Data', 'ML'],
      MOBILE_DEVELOPMENT: ['React Native', 'Flutter', 'iOS', 'Android'],
      BACKEND_DEVELOPMENT: ['Node.js', 'Python', 'Java', 'API'],
      DATABASE: ['SQL', 'NoSQL', 'Database'],
    };

    return (
      relevanceMap[domain]?.some((type) =>
        projectType.toLowerCase().includes(type.toLowerCase())
      ) || false
    );
  }

  getWebDevSuggestions(query) {
    const suggestions = [];
    const input = query.toLowerCase();

    if (input.includes('create') && input.includes('app')) {
      suggestions.push(
        'Consider using a framework like Create React App, Vite, or Next.js'
      );
      suggestions.push('Set up ESLint and Prettier for code quality');
    }

    if (input.includes('deploy')) {
      suggestions.push(
        'Consider using Vercel, Netlify, or GitHub Pages for frontend deployment'
      );
      suggestions.push('Set up environment variables for different stages');
    }

    return suggestions;
  }

  getDevOpsSuggestions(query) {
    const suggestions = [];
    const input = query.toLowerCase();

    if (input.includes('docker')) {
      suggestions.push('Use multi-stage builds to optimize image size');
      suggestions.push(
        'Consider security scanning with tools like Snyk or Trivy'
      );
    }

    if (input.includes('deploy') || input.includes('ci')) {
      suggestions.push('Implement proper secret management');
      suggestions.push('Set up automated testing in the pipeline');
    }

    return suggestions;
  }

  getDataScienceSuggestions(query) {
    const suggestions = [];
    const input = query.toLowerCase();

    if (input.includes('analyze') || input.includes('data')) {
      suggestions.push('Start with exploratory data analysis (EDA)');
      suggestions.push('Check for data quality issues and outliers');
    }

    if (input.includes('model') || input.includes('train')) {
      suggestions.push('Consider cross-validation for model evaluation');
      suggestions.push(
        'Track experiments with tools like MLflow or Weights & Biases'
      );
    }

    return suggestions;
  }

  /**
   * Display domain analysis results
   */
  displayDomainAnalysis(domainAnalysis, enhancements) {
    if (domainAnalysis.primary.confidence > 0.3) {
      console.log(
        chalk.green(
          `🎯 Detected domain: ${domainAnalysis.primary.name} (${Math.round(
            domainAnalysis.primary.confidence * 100
          )}% confidence)`
        )
      );

      if (domainAnalysis.secondary.length > 0) {
        console.log(chalk.gray('Secondary domains:'));
        domainAnalysis.secondary.forEach((domain) => {
          console.log(
            chalk.gray(
              `   • ${domain.name} (${Math.round(domain.confidence * 100)}%)`
            )
          );
        });
      }

      if (enhancements.suggestions.length > 0) {
        console.log(chalk.cyan('💡 Domain-specific suggestions:'));
        enhancements.suggestions.forEach((suggestion) => {
          console.log(chalk.gray(`   • ${suggestion}`));
        });
      }
    }
  }
}

module.exports = DomainSpecialist;
