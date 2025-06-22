import SemanticAnalyzer from './SemanticAnalyzer.js';

/**
 * Architecture pattern definition
 */
interface ArchitecturePattern {
  indicators: string[];
  structure: string[];
}

/**
 * Code pattern definition
 */
interface CodePattern {
  pattern: RegExp;
  description: string;
}

/**
 * Pattern detection result
 */
interface DetectedPattern {
  name: string;
  confidence: number;
  evidence: Evidence[];
}

/**
 * Evidence for pattern detection
 */
interface Evidence {
  type: 'file_structure' | 'class_name' | 'code_pattern';
  indicator: string;
  files?: string[];
  classes?: string[];
  matches?: string[];
}

/**
 * Code quality assessment
 */
interface CodeQuality {
  complexity: 'low' | 'medium' | 'high';
  maintainability: number;
  testCoverage: number;
  documentation: number;
  issues: QualityIssue[];
}

/**
 * Quality issue
 */
interface QualityIssue {
  type: 'complexity' | 'duplication' | 'naming' | 'structure';
  severity: 'low' | 'medium' | 'high';
  description: string;
  location?: string;
}

/**
 * Relationship analysis
 */
interface Relationship {
  from: string;
  to: string;
  type: 'import' | 'inheritance' | 'composition' | 'dependency';
  strength: number;
}

/**
 * Extracted concept
 */
interface Concept {
  name: string;
  type: 'entity' | 'service' | 'component' | 'utility';
  domain: 'business' | 'technical' | 'unknown';
  confidence: number;
}

/**
 * Complete codebase semantic analysis
 */
interface CodebaseSemanticAnalysis {
  architecture: DetectedPattern[];
  patterns: DetectedPattern[];
  quality: CodeQuality;
  relationships: Relationship[];
  concepts: Concept[];
}

/**
 * Codebase index structure (simplified)
 */
interface CodebaseIndex {
  files?: Map<string, any>;
  classes?: Map<string, any>;
  functions?: Map<string, any>;
  imports?: Map<string, any>;
  exports?: Map<string, any>;
  [key: string]: any;
}

/**
 * SemanticCodeAnalyzer - Advanced semantic analysis of code structures and patterns
 * Extends SemanticAnalyzer with code-specific analysis capabilities
 */
export default class SemanticCodeAnalyzer extends SemanticAnalyzer {
  private codePatterns: Map<string, CodePattern>;
  private architecturePatterns: Map<string, ArchitecturePattern>;

  /**
   * Creates an instance of the class
   */
  constructor() {
    super();
    this.codePatterns = new Map();
    this.architecturePatterns = new Map();
    this.initializeCodePatterns();
  }

  /**
   * Initialize code and architecture patterns
   */
  private initializeCodePatterns(): void {
    // Common architectural patterns
    this.architecturePatterns.set('mvc', {
      indicators: ['controller', 'model', 'view', 'routes'],
      structure: ['controllers/', 'models/', 'views/'],
    });

    this.architecturePatterns.set('microservice', {
      indicators: ['service', 'api', 'gateway', 'docker'],
      structure: ['services/', 'api/', 'docker-compose'],
    });

    this.architecturePatterns.set('layered', {
      indicators: ['service', 'repository', 'controller', 'entity'],
      structure: ['services/', 'repositories/', 'controllers/', 'entities/'],
    });

    this.architecturePatterns.set('component', {
      indicators: ['component', 'module', 'widget'],
      structure: ['components/', 'modules/', 'widgets/'],
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

    this.codePatterns.set('observer', {
      pattern: /addEventListener|on\w+|subscribe|emit/,
      description: 'Observer pattern implementation',
    });

    this.codePatterns.set('decorator', {
      pattern: /@\w+|decorator|wrapper/,
      description: 'Decorator pattern implementation',
    });
  }

  /**
   * Analyze codebase semantics comprehensively
   */
  async analyzeCodebaseSemantics(
    index: CodebaseIndex
  ): Promise<CodebaseSemanticAnalysis> {
    const analysis: CodebaseSemanticAnalysis = {
      architecture: this.detectArchitecture(index),
      patterns: this.detectPatterns(index),
      quality: this.assessCodeQuality(index),
      relationships: this.analyzeRelationships(index),
      concepts: this.extractConcepts(index),
    };

    return analysis;
  }

  /**
   * Detect architectural patterns in the codebase
   */
  private detectArchitecture(index: CodebaseIndex): DetectedPattern[] {
    const detectedPatterns: DetectedPattern[] = [];

    for (const [name, pattern] of this.architecturePatterns) {
      const confidence = this.calculatePatternConfidence(index, pattern);

      if (confidence > 0.3) {
        const evidence = this.gatherEvidence(index, pattern);
        detectedPatterns.push({
          name,
          confidence,
          evidence,
        });
      }
    }

    // Sort by confidence descending
    return detectedPatterns.sort((a, b) => b.confidence - a.confidence);
  }

  /**
   * Detect code patterns in the codebase
   */
  private detectPatterns(index: CodebaseIndex): DetectedPattern[] {
    const detectedPatterns: DetectedPattern[] = [];

    for (const [name, pattern] of this.codePatterns) {
      const matches = this.findPatternMatches(index, pattern);

      if (matches.length > 0) {
        detectedPatterns.push({
          name,
          confidence: Math.min(matches.length * 0.2, 1.0),
          evidence: [
            {
              type: 'code_pattern',
              indicator: pattern.description,
              matches: matches.slice(0, 5), // Top 5 matches
            },
          ],
        });
      }
    }

    return detectedPatterns.sort((a, b) => b.confidence - a.confidence);
  }

  /**
   * Calculate confidence score for a pattern
   */
  private calculatePatternConfidence(
    index: CodebaseIndex,
    pattern: ArchitecturePattern
  ): number {
    const { indicators, structure } = pattern;
    let score = 0;

    const allPaths = Array.from(index.files?.keys() || []);
    const allClasses = Array.from(index.classes?.keys() || []);

    // Check for indicator presence
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

  /**
   * Gather evidence for pattern detection
   */
  private gatherEvidence(
    index: CodebaseIndex,
    pattern: ArchitecturePattern
  ): Evidence[] {
    const evidence: Evidence[] = [];
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
          type: 'class_name',
          indicator,
          classes: matchingClasses.slice(0, 3), // Top 3 examples
        });
      }
    }

    return evidence;
  }

  /**
   * Find matches for code patterns
   */
  private findPatternMatches(
    index: CodebaseIndex,
    pattern: CodePattern
  ): string[] {
    const matches: string[] = [];

    // Search through file contents for pattern matches
    if (index.files) {
      for (const [filePath, fileData] of index.files) {
        if (fileData && fileData.content) {
          const content = fileData.content.toString();
          const patternMatches = content.match(pattern.pattern);

          if (patternMatches) {
            matches.push(
              `${filePath}: ${patternMatches[0].substring(0, 100)}...`
            );
          }
        }
      }
    }

    return matches;
  }

  /**
   * Assess code quality metrics
   */
  private assessCodeQuality(index: CodebaseIndex): CodeQuality {
    const issues: QualityIssue[] = [];
    let complexityScore = 0;
    let maintainabilityScore = 0.8; // Default high maintainability
    let testCoverageScore = 0.5; // Default medium coverage
    let documentationScore = 0.6; // Default medium documentation

    // Analyze complexity
    if (index.classes) {
      const totalClasses = index.classes.size;
      const avgMethodsPerClass = this.calculateAverageMethodsPerClass(index);

      if (avgMethodsPerClass > 15) {
        complexityScore += 0.5;
        issues.push({
          type: 'complexity',
          severity: 'medium',
          description: 'Classes have high method count on average',
        });
      }

      if (totalClasses > 100) {
        complexityScore += 0.3;
        issues.push({
          type: 'complexity',
          severity: 'low',
          description: 'Large number of classes may indicate high complexity',
        });
      }
    }

    // Check for test files
    const allPaths = Array.from(index.files?.keys() || []);
    const testFiles = allPaths.filter(
      (path) =>
        path.includes('test') ||
        path.includes('spec') ||
        path.endsWith('.test.js') ||
        path.endsWith('.test.ts')
    );

    if (testFiles.length > 0) {
      testCoverageScore = Math.min(
        testFiles.length / Math.max(allPaths.length * 0.3, 1),
        1.0
      );
    }

    // Check for documentation
    const docFiles = allPaths.filter(
      (path) =>
        path.toLowerCase().includes('readme') ||
        path.toLowerCase().includes('doc') ||
        path.endsWith('.md')
    );

    if (docFiles.length > 0) {
      documentationScore = Math.min(
        docFiles.length / Math.max(allPaths.length * 0.1, 1),
        1.0
      );
    }

    return {
      complexity:
        complexityScore > 0.5
          ? 'high'
          : complexityScore > 0.3
          ? 'medium'
          : 'low',
      maintainability: maintainabilityScore,
      testCoverage: testCoverageScore,
      documentation: documentationScore,
      issues,
    };
  }

  /**
   * Calculate average methods per class
   */
  private calculateAverageMethodsPerClass(index: CodebaseIndex): number {
    if (!index.classes || index.classes.size === 0) return 0;

    let totalMethods = 0;
    for (const [, classData] of index.classes) {
      if (classData && classData.methods) {
        totalMethods += Array.isArray(classData.methods)
          ? classData.methods.length
          : Object.keys(classData.methods).length;
      }
    }

    return totalMethods / index.classes.size;
  }

  /**
   * Analyze relationships between code entities
   */
  private analyzeRelationships(index: CodebaseIndex): Relationship[] {
    const relationships: Relationship[] = [];

    if (index.imports) {
      for (const [file, imports] of index.imports) {
        if (Array.isArray(imports)) {
          for (const importPath of imports) {
            relationships.push({
              from: file,
              to: importPath,
              type: 'import',
              strength: 0.5,
            });
          }
        }
      }
    }

    if (index.classes) {
      for (const [className, classData] of index.classes) {
        if (classData && classData.extends) {
          relationships.push({
            from: className,
            to: classData.extends,
            type: 'inheritance',
            strength: 0.9,
          });
        }
      }
    }

    return relationships;
  }

  /**
   * Extract semantic concepts from the codebase
   */
  private extractConcepts(index: CodebaseIndex): Concept[] {
    const concepts: Concept[] = [];

    if (index.classes) {
      for (const [className] of index.classes) {
        const classification = this.classifyEntity(className);
        concepts.push({
          name: className,
          type: this.determineEntityType(className),
          domain: classification.domain,
          confidence: 0.7,
        });
      }
    }

    if (index.functions) {
      for (const [functionName] of index.functions) {
        concepts.push({
          name: functionName,
          type: 'utility',
          domain: this.classifyEntity(functionName).domain,
          confidence: 0.6,
        });
      }
    }

    return concepts;
  }

  /**
   * Determine entity type based on name patterns
   */
  private determineEntityType(
    name: string
  ): 'entity' | 'service' | 'component' | 'utility' {
    const lowerName = name.toLowerCase();

    if (lowerName.includes('service') || lowerName.includes('manager')) {
      return 'service';
    }
    if (lowerName.includes('component') || lowerName.includes('widget')) {
      return 'component';
    }
    if (lowerName.includes('util') || lowerName.includes('helper')) {
      return 'utility';
    }

    return 'entity';
  }

  /**
   * Classify entity into domain categories
   */
  private classifyEntity(name: string): {
    domain: 'business' | 'technical' | 'unknown';
    type: string;
  } {
    const businessKeywords = [
      'user',
      'customer',
      'order',
      'payment',
      'product',
      'inventory',
      'account',
      'profile',
      'billing',
      'subscription',
      'invoice',
      'cart',
      'checkout',
      'transaction',
      'report',
      'analytics',
    ];

    const technicalKeywords = [
      'api',
      'service',
      'repository',
      'controller',
      'handler',
      'middleware',
      'validator',
      'parser',
      'formatter',
      'logger',
      'cache',
      'database',
      'connection',
      'config',
      'util',
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
