const SemanticAnalyzer = require('./SemanticAnalyzer');

class SemanticCodeAnalyzer extends SemanticAnalyzer {
  constructor() {
    super();
    this.codePatterns = new Map();
    this.architecturePatterns = new Map();
    this.initializeCodePatterns();
  }

  initializeCodePatterns() {
    // Common architectural patterns
    this.architecturePatterns.set('mvc', {
      indicators: ['controller', 'model', 'view', 'routes'],
      structure: ['controllers/', 'models/', 'views/'],
    });

    this.architecturePatterns.set('microservice', {
      indicators: ['service', 'api', 'gateway', 'docker'],
      structure: ['services/', 'api/', 'docker-compose'],
    });

    // Code patterns
    this.codePatterns.set('singleton', {
      pattern: /class\s+\w+\s*{[\s\S]*static\s+instance[\s\S]*getInstance/,
      description: 'Singleton pattern implementation',
    });

    this.codePatterns.set('factory', {
      pattern: /class\s+\w*Factory\s*{|function\s+create\w+/,
      description: 'Factory pattern implementation',
    });
  }

  async analyzeCodebaseSemantics(index) {
    const analysis = {
      architecture: this.detectArchitecture(index),
      patterns: this.detectPatterns(index),
      quality: this.assessCodeQuality(index),
      relationships: this.analyzeRelationships(index),
      concepts: this.extractConcepts(index),
    };

    return analysis;
  }

  detectArchitecture(index) {
    const detectedPatterns = [];

    for (const [name, pattern] of this.architecturePatterns) {
      const score = this.calculateArchitectureScore(index, pattern);
      if (score > 0.7) {
        detectedPatterns.push({
          name,
          confidence: score,
          evidence: this.gatherEvidence(index, pattern),
        });
      }
    }

    return detectedPatterns;
  }

  extractConcepts(index) {
    const concepts = {
      businessDomain: [],
      technicalDomain: [],
      dataModels: [],
      workflows: [],
    };

    // Extract from class names and file names
    for (const [className, info] of index.classes) {
      const concept = this.classifyConceptFromName(className);
      if (concept.domain === 'business') {
        concepts.businessDomain.push({
          name: className,
          type: 'entity',
          file: info.file,
        });
      }
    }

    return concepts;
  }

  calculateArchitectureScore(index, pattern) {
    let score = 0;
    const indicators = pattern.indicators || [];
    const structure = pattern.structure || [];

    // Check for indicator keywords in file paths and class names
    const allPaths = Array.from(index.files?.keys() || []);
    const allClasses = Array.from(index.classes?.keys() || []);

    for (const indicator of indicators) {
      const pathMatches = allPaths.filter((path) =>
        path.toLowerCase().includes(indicator.toLowerCase())
      ).length;

      const classMatches = allClasses.filter((name) =>
        name.toLowerCase().includes(indicator.toLowerCase())
      ).length;

      if (pathMatches > 0 || classMatches > 0) {
        score += 0.3;
      }
    }

    // Check for structural patterns
    for (const structurePattern of structure) {
      const hasStructure = allPaths.some((path) =>
        path.toLowerCase().includes(structurePattern.toLowerCase())
      );

      if (hasStructure) {
        score += 0.4;
      }
    }

    return Math.min(score, 1.0);
  }

  gatherEvidence(index, pattern) {
    const evidence = [];
    const indicators = pattern.indicators || [];
    const structure = pattern.structure || [];

    const allPaths = Array.from(index.files?.keys() || []);
    const allClasses = Array.from(index.classes?.keys() || []);

    // Gather file path evidence
    for (const indicator of indicators) {
      const matchingPaths = allPaths.filter((path) =>
        path.toLowerCase().includes(indicator.toLowerCase())
      );

      if (matchingPaths.length > 0) {
        evidence.push({
          type: 'file_structure',
          indicator,
          files: matchingPaths.slice(0, 3), // Top 3 examples
        });
      }
    }

    // Gather class name evidence
    for (const indicator of indicators) {
      const matchingClasses = allClasses.filter((name) =>
        name.toLowerCase().includes(indicator.toLowerCase())
      );

      if (matchingClasses.length > 0) {
        evidence.push({
          type: 'class_naming',
          indicator,
          classes: matchingClasses.slice(0, 3),
        });
      }
    }

    return evidence;
  }

  detectPatterns(index) {
    const detectedPatterns = [];

    for (const [name, pattern] of this.codePatterns) {
      const matches = this.findPatternMatches(index, pattern);

      if (matches.length > 0) {
        detectedPatterns.push({
          name,
          description: pattern.description,
          matches,
          confidence: Math.min(matches.length * 0.3, 1.0),
        });
      }
    }

    return detectedPatterns;
  }

  findPatternMatches(index, pattern) {
    const matches = [];

    // Search through file contents for pattern matches
    for (const [filePath, fileInfo] of index.files || []) {
      // This is a simplified pattern matching - in reality,
      // you'd want to read and analyze the actual file content
      if (pattern.pattern && typeof pattern.pattern === 'object') {
        // For regex patterns, we'd need the actual file content
        // For now, check file name and symbols
        const hasPattern = fileInfo.symbols?.some(
          (symbol) => symbol.name && pattern.pattern.test(symbol.name)
        );

        if (hasPattern) {
          matches.push({
            file: filePath,
            type: 'symbol_match',
          });
        }
      }
    }

    return matches;
  }

  assessCodeQuality(index) {
    const quality = {
      score: 0,
      factors: [],
      suggestions: [],
    };

    let score = 0.5; // Base score

    // Check for documentation
    const hasReadme = index.files?.has('README.md');
    if (hasReadme) {
      score += 0.1;
      quality.factors.push('Has documentation (README.md)');
    } else {
      quality.suggestions.push('Add README.md documentation');
    }

    // Check for tests
    const testFiles = Array.from(index.files?.keys() || []).filter(
      (path) => path.includes('test') || path.includes('spec')
    );

    if (testFiles.length > 0) {
      score += 0.2;
      quality.factors.push(`Has ${testFiles.length} test files`);
    } else {
      quality.suggestions.push('Add unit tests');
    }

    // Check for configuration
    const hasConfig =
      index.files?.has('package.json') || index.files?.has('tsconfig.json');
    if (hasConfig) {
      score += 0.1;
      quality.factors.push('Has proper configuration files');
    }

    // Check TODO count
    const todoCount = index.todos?.length || 0;
    if (todoCount > 10) {
      score -= 0.1;
      quality.suggestions.push(`Address ${todoCount} TODO items`);
    } else if (todoCount > 0) {
      quality.factors.push(`${todoCount} TODO items tracked`);
    }

    quality.score = Math.max(0, Math.min(1, score));

    return quality;
  }

  analyzeRelationships(index) {
    const relationships = {
      dependencies: [],
      inheritance: [],
      composition: [],
      aggregation: [],
    };

    // Analyze file dependencies
    for (const [filePath, fileInfo] of index.files || []) {
      if (fileInfo.dependencies && fileInfo.dependencies.length > 0) {
        relationships.dependencies.push({
          from: filePath,
          to: fileInfo.dependencies,
          type: 'import',
        });
      }
    }

    // Analyze class inheritance
    for (const [className, classInfo] of index.classes || []) {
      if (classInfo.extends) {
        relationships.inheritance.push({
          child: className,
          parent: classInfo.extends,
          file: classInfo.file,
        });
      }
    }

    return relationships;
  }

  classifyConceptFromName(name) {
    const businessKeywords = [
      'user',
      'customer',
      'order',
      'product',
      'payment',
      'invoice',
      'account',
      'profile',
      'cart',
      'item',
    ];

    const technicalKeywords = [
      'service',
      'manager',
      'handler',
      'controller',
      'repository',
      'factory',
      'builder',
      'adapter',
      'strategy',
      'observer',
    ];

    const nameLower = name.toLowerCase();

    if (businessKeywords.some((keyword) => nameLower.includes(keyword))) {
      return { domain: 'business', type: 'entity' };
    }

    if (technicalKeywords.some((keyword) => nameLower.includes(keyword))) {
      return { domain: 'technical', type: 'component' };
    }

    return { domain: 'unknown', type: 'unknown' };
  }
}

module.exports = SemanticCodeAnalyzer;
