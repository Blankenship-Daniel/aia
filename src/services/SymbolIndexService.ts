import { ISymbolIndex } from '../interfaces/ISymbolIndex';
import { ICachingService } from '../interfaces/ICachingService';
import { IAIService } from '../interfaces/IAIService';
import {
  SymbolLookupTable,
  SymbolInfo,
  SymbolReference,
  SymbolDefinition,
  SymbolRelationships,
  FileSymbolInfo,
  SymbolEntry,
  FileSymbolEntry,
  IndexMetadata,
  PatternIndex,
  FileSymbolAnalysis,
  ContextInfo,
  DependencyInfo,
  SymbolType,
} from '../types';
import { CodeIndexService } from './CodeIndexService';
import SemanticCodeAnalyzer from '../SemanticCodeAnalyzer';
import * as fs from 'fs-extra';
import * as path from 'path';
import * as crypto from 'crypto';

/**
 * Phase 2: AI-Enhanced Symbol Index Service
 *
 * Leverages existing AI capabilities and codebase analysis infrastructure
 * to provide intelligent symbol extraction and relationship mapping.
 *
 * Key enhancements:
 * - Integrates with existing CodeIndexService for symbol extraction
 * - Uses AI for intelligent symbol relationship detection
 * - Leverages SemanticCodeAnalyzer for pattern recognition
 * - Provides AI-optimized symbol context for enhanced queries
 */
export class SymbolIndexService implements ISymbolIndex {
  private lookupTable: SymbolLookupTable;
  private cache: ICachingService;
  private aiService?: IAIService;
  private codeIndexService?: CodeIndexService;
  private semanticAnalyzer?: SemanticCodeAnalyzer;
  private isInitialized: boolean = false;

  constructor(
    cache: ICachingService,
    aiService?: IAIService,
    codeIndexService?: CodeIndexService,
    semanticAnalyzer?: SemanticCodeAnalyzer
  ) {
    this.cache = cache;
    this.aiService = aiService;
    this.codeIndexService = codeIndexService;
    this.semanticAnalyzer = semanticAnalyzer;
    this.lookupTable = this.createEmptyLookupTable();
  }

  /**
   * Build complete symbol index for a directory
   */
  async buildSymbolIndex(
    rootDir: string,
    options?: {
      excludePatterns?: string[];
      includePatterns?: string[];
      useCache?: boolean;
    }
  ): Promise<SymbolLookupTable> {
    const startTime = Date.now();

    // Check cache first
    if (options?.useCache !== false) {
      const cached = await this.cache.get('symbol-lookup-table');
      if (cached) {
        this.lookupTable = cached as SymbolLookupTable;
        this.isInitialized = true;
        return this.lookupTable;
      }
    }

    console.log('🤖 Building AI-enhanced symbol index...');

    // Initialize empty lookup table
    this.lookupTable = this.createEmptyLookupTable();
    this.lookupTable.metadata.rootPath = rootDir;
    this.lookupTable.metadata.excludePatterns = options?.excludePatterns || [
      'node_modules/**',
      '**/*.test.ts',
      '**/*.spec.ts',
    ];
    this.lookupTable.metadata.includePatterns = options?.includePatterns || [
      '**/*.ts',
      '**/*.js',
    ];

    try {
      // Phase 2 Enhancement: Use existing codebase index if available
      await this.buildFromExistingIndex(rootDir);

      // If no existing index or it's incomplete, fall back to file analysis
      if (Object.keys(this.lookupTable.symbols).length === 0) {
        console.log(
          '📁 No existing codebase index found, analyzing files directly...'
        );
        await this.buildFromFileAnalysis(rootDir);
      }

      // AI Enhancement: Use semantic analysis for enhanced relationships
      if (this.semanticAnalyzer) {
        console.log('🧠 Applying AI semantic analysis...');
        await this.enhanceWithSemanticAnalysis();
      }

      // Build relationships and patterns
      this.buildRelationships();
      this.buildPatterns();

      // Update metadata
      this.updateMetadata(startTime);
      this.isInitialized = true;

      // Cache the complete table if enabled
      if (options?.useCache !== false) {
        await this.cache.set('symbol-lookup-table', this.lookupTable, {
          ttl: 3600000,
        }); // 1 hour TTL
      }

      console.log(
        `✅ Symbol index built with ${
          Object.keys(this.lookupTable.symbols).length
        } symbols`
      );
      return this.lookupTable;
    } catch (error) {
      throw new Error(
        `Failed to build symbol index: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`
      );
    }
  }

  /**
   * Get symbol information by name with caching
   */
  getSymbol(name: string): SymbolInfo | undefined {
    const entry = this.lookupTable.symbols[name];
    if (entry) {
      // Cache asynchronously for future requests
      const cacheKey = `symbol:${name}`;
      this.cache.set(cacheKey, entry.info, { ttl: 300000 }).catch((err) => {
        console.warn('Failed to cache symbol:', err);
      });
      return entry.info;
    }

    return undefined;
  }

  /**
   * Get all references to a symbol
   */
  getReferences(symbolName: string): SymbolReference[] {
    const symbol = this.getSymbol(symbolName);
    return symbol?.references || [];
  }

  /**
   * Get all definitions of a symbol
   */
  getDefinitions(symbolName: string): SymbolDefinition[] {
    const symbol = this.getSymbol(symbolName);
    return symbol?.definitions || [];
  }

  /**
   * Get relationship information for a symbol
   */
  getRelationships(symbolName: string): SymbolRelationships {
    const symbol = this.getSymbol(symbolName);
    if (symbol) {
      return symbol.relationships;
    }

    // Return empty relationships if symbol not found
    return {
      uses: [],
      usedBy: [],
      dependencies: [],
    };
  }

  /**
   * Find symbols by type with caching
   */
  findSymbolsByType(type: SymbolType): string[] {
    const symbols = Object.entries(this.lookupTable.symbols)
      .filter(([_, entry]) => entry.info.type === type)
      .map(([name]) => name);

    // Cache asynchronously for future requests
    const cacheKey = `symbols-by-type:${type}`;
    this.cache.set(cacheKey, symbols, { ttl: 600000 }).catch((err) => {
      console.warn('Failed to cache symbols by type:', err);
    });

    return symbols;
  }

  /**
   * Get file symbol information
   */
  getFileSymbols(filepath: string): FileSymbolInfo {
    const entry = this.lookupTable.fileSymbols[filepath];
    return (
      entry?.info || {
        filepath,
        exports: [],
        imports: [],
        defines: [],
        references: [],
        lastModified: '',
        hash: '',
      }
    );
  }

  /**
   * Search symbols by pattern
   */
  searchSymbols(pattern: string): string[] {
    const regex = new RegExp(pattern, 'i');
    return Object.keys(this.lookupTable.symbols).filter((name) =>
      regex.test(name)
    );
  }

  /**
   * Get inheritance chain for a class
   */
  getInheritanceChain(className: string): string[] {
    const chain: string[] = [];
    let current = className;
    const visited = new Set<string>();

    while (current && !visited.has(current)) {
      visited.add(current);
      const relationships = this.lookupTable.relationships[current];
      if (relationships?.extends && relationships.extends.length > 0) {
        const parent = relationships.extends[0];
        chain.push(parent);
        current = parent;
      } else {
        break;
      }
    }

    return chain;
  }

  /**
   * Get implementations of an interface
   */
  getImplementations(interfaceName: string): string[] {
    return this.lookupTable.patterns.implementations[interfaceName] || [];
  }

  /**
   * Get dependency graph for a symbol
   */
  getDependencyGraph(
    symbolName: string,
    depth: number = 2
  ): Record<string, any> {
    const graph: Record<string, any> = {};
    const visited = new Set<string>();

    const traverse = (name: string, currentDepth: number) => {
      if (visited.has(name) || currentDepth > depth) return;
      visited.add(name);

      const relationships = this.lookupTable.relationships[name];
      if (relationships) {
        graph[name] = {
          uses: relationships.uses,
          usedBy: relationships.usedBy,
          extends: relationships.extends,
          implements: relationships.implements,
          dependencies: relationships.dependencies,
        };

        // Recursively traverse dependencies
        if (currentDepth < depth) {
          [
            ...(relationships.uses || []),
            ...(relationships.dependencies || []),
          ].forEach((dep) => traverse(dep, currentDepth + 1));
        }
      }
    };

    traverse(symbolName, 0);
    return graph;
  }

  /**
   * Get context information for AI consumption
   */
  getContextWindow(symbolName: string, depth: number = 2): any {
    const symbol = this.getSymbol(symbolName);
    if (!symbol) return undefined;

    const definition = symbol.definitions[0];
    const relationships = symbol.relationships;

    return {
      symbol: symbolName,
      definition: definition?.snippet || '',
      usage: symbol.references.slice(0, 3).map((ref) => ref.snippet || ''),
      related: [
        ...(relationships.uses || []),
        ...(relationships.usedBy || []),
      ].slice(0, 5),
      summary: symbol.metadata.description || `${symbol.type} ${symbolName}`,
      dependencies: relationships.dependencies || [],
      dependents: relationships.usedBy || [],
    };
  }

  // Private helper methods

  private createEmptyLookupTable(): SymbolLookupTable {
    return {
      symbols: {},
      fileSymbols: {},
      relationships: {},
      patterns: {
        inheritance: {},
        implementations: {},
        namespaces: {},
        modules: {},
        singletons: [],
        factories: [],
        observers: [],
      },
      metadata: {
        version: '1.0.0',
        created: new Date().toISOString(),
        lastUpdated: new Date().toISOString(),
        totalSymbols: 0,
        totalFiles: 0,
        totalReferences: 0,
        language: 'typescript',
        rootPath: '',
        excludePatterns: [],
        includePatterns: [],
      },
    };
  }

  private async findSourceFiles(
    rootDir: string,
    metadata: IndexMetadata
  ): Promise<string[]> {
    // This is a simplified implementation
    // In a real implementation, you would use glob patterns to match files
    const files: string[] = [];

    const walkDir = async (dir: string) => {
      const entries = await fs.readdir(dir, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);

        if (entry.isDirectory()) {
          // Skip excluded directories
          if (
            !metadata.excludePatterns.some((pattern) =>
              fullPath.includes(pattern.replace('/**', ''))
            )
          ) {
            await walkDir(fullPath);
          }
        } else if (entry.isFile()) {
          // Include TypeScript and JavaScript files
          if (fullPath.endsWith('.ts') || fullPath.endsWith('.js')) {
            files.push(fullPath);
          }
        }
      }
    };

    await walkDir(rootDir);
    return files;
  }

  private async analyzeFile(filepath: string): Promise<void> {
    // Placeholder for file analysis
    // In Phase 2, this will use TypeScript AST analysis
    const stats = await fs.stat(filepath);
    const content = await fs.readFile(filepath, 'utf-8');
    const hash = crypto.createHash('md5').update(content).digest('hex');

    // Basic file symbol info
    const fileInfo: FileSymbolInfo = {
      filepath,
      exports: [],
      imports: [],
      defines: [],
      references: [],
      lastModified: stats.mtime.toISOString(),
      hash,
    };

    this.lookupTable.fileSymbols[filepath] = {
      info: fileInfo,
      dependencies: [],
      dependents: [],
    };
  }

  /**
   * Phase 2: Build symbol index from existing codebase index
   */
  private async buildFromExistingIndex(rootDir: string): Promise<void> {
    try {
      const indexPath = path.join(rootDir, '.aia', 'codebase-index.json');

      if (!(await fs.pathExists(indexPath))) {
        console.log(
          '📍 No existing codebase index found at .aia/codebase-index.json'
        );
        return;
      }

      console.log('📋 Loading existing codebase index...');
      const indexData = await fs.readJson(indexPath);

      // Extract symbols from the files section - stored as array of [filePath, fileData]
      if (indexData.files && Array.isArray(indexData.files)) {
        for (const [filePath, fileData] of indexData.files) {
          // Only process source files, skip config/data files
          if (
            fileData.type === 'source' &&
            ['typescript', 'javascript'].includes(fileData.language)
          ) {
            await this.extractSymbolsFromFileData(filePath, fileData);
          }
        }
      }

      // Extract class information - stored as array of [className, classData]
      if (indexData.classes && Array.isArray(indexData.classes)) {
        for (const [className, classData] of indexData.classes) {
          await this.extractClassSymbolInfo(className, classData);
        }
      }

      // Extract function information - stored as array of [functionName, functionData]
      if (indexData.functions && Array.isArray(indexData.functions)) {
        for (const [functionName, functionData] of indexData.functions) {
          await this.extractFunctionSymbolInfo(functionName, functionData);
        }
      }

      console.log(
        `📊 Extracted ${
          Object.keys(this.lookupTable.symbols).length
        } symbols from existing index`
      );
    } catch (error) {
      console.log('⚠️ Failed to load existing codebase index:', error);
    }
  }

  /**
   * Phase 2: Build symbol index from direct file analysis
   */
  private async buildFromFileAnalysis(rootDir: string): Promise<void> {
    // Find all TypeScript/JavaScript files
    const files = await this.findSourceFiles(
      rootDir,
      this.lookupTable.metadata
    );

    console.log(`📁 Analyzing ${files.length} source files...`);

    // Analyze each file
    for (const filepath of files) {
      await this.analyzeFile(filepath);
    }
  }

  /**
   * Phase 2: Enhance symbol index with AI semantic analysis
   */
  private async enhanceWithSemanticAnalysis(): Promise<void> {
    if (!this.semanticAnalyzer) {
      return;
    }

    try {
      // Create a simplified codebase index for semantic analysis
      const codebaseIndex = this.createCodebaseIndexFromSymbols();

      // Run semantic analysis
      const semanticAnalysis =
        await this.semanticAnalyzer.analyzeCodebaseSemantics(codebaseIndex);

      // Enhance symbols with semantic insights
      await this.applySemanticInsights(semanticAnalysis);

      console.log('🧠 Applied semantic analysis enhancements');
    } catch (error) {
      console.log('⚠️ Semantic analysis failed:', error);
    }
  }

  /**
   * Extract symbol information from existing codebase index file data
   */
  private async extractSymbolsFromFileData(
    filePath: string,
    fileData: any
  ): Promise<void> {
    if (!fileData.symbols || !Array.isArray(fileData.symbols)) {
      return;
    }

    for (const symbolData of fileData.symbols) {
      const symbolName = symbolData.name;
      const symbolType = this.mapSymbolType(symbolData.type);

      if (!symbolName || !symbolType) {
        continue;
      }

      // Create symbol info
      const symbolInfo: SymbolInfo = {
        name: symbolName,
        type: symbolType,
        definitions: [
          {
            location: {
              file: filePath,
              line: 1,
              column: 1,
            },
            snippet: '', // Will be enhanced with AI context
            scope: 'module',
            modifiers: fileData.exports?.includes(symbolName) ? ['export'] : [],
          },
        ],
        references: [],
        relationships: {
          uses: [],
          usedBy: [],
          dependencies: fileData.dependencies || [],
        },
        metadata: {
          exported: fileData.exports?.includes(symbolName) || false,
          description: symbolData.description || '',
          usageCount: 0,
        },
      };

      // Store in lookup table
      this.lookupTable.symbols[symbolName] = {
        info: symbolInfo,
        lastUpdated: new Date().toISOString(),
        hash: this.generateSymbolHash(symbolInfo),
      };
    }

    // Create file symbol info
    this.lookupTable.fileSymbols[filePath] = {
      info: {
        filepath: filePath,
        exports: fileData.exports || [],
        imports: fileData.imports || [],
        defines: fileData.symbols?.map((s: any) => s.name) || [],
        references: fileData.dependencies || [],
        lastModified: fileData.lastModified || new Date().toISOString(),
        hash: fileData.hash || '',
      },
      dependencies: fileData.dependencies || [],
      dependents: [],
    };
  }

  /**
   * Extract class symbol information
   */
  private async extractClassSymbolInfo(
    className: string,
    classData: any
  ): Promise<void> {
    const symbolInfo: SymbolInfo = {
      name: className,
      type: 'class',
      definitions: [
        {
          location: {
            file: classData.file || '',
            line: 1,
            column: 1,
          },
          snippet: '',
          scope: 'module',
          modifiers: ['export'],
        },
      ],
      references: [],
      relationships: {
        extends: classData.extends ? [classData.extends] : [],
        implements: classData.implements || [],
        uses: [],
        usedBy: [],
        dependencies: [],
      },
      metadata: {
        exported: true,
        description: '',
        usageCount: 0,
      },
    };

    this.lookupTable.symbols[className] = {
      info: symbolInfo,
      lastUpdated: new Date().toISOString(),
      hash: this.generateSymbolHash(symbolInfo),
    };
  }

  /**
   * Extract function symbol information
   */
  private async extractFunctionSymbolInfo(
    functionName: string,
    functionData: any
  ): Promise<void> {
    const symbolInfo: SymbolInfo = {
      name: functionName,
      type: 'function',
      definitions: [
        {
          location: {
            file: functionData.file || '',
            line: 1,
            column: 1,
          },
          snippet: '',
          scope: 'module',
          modifiers: functionData.async ? ['async', 'export'] : ['export'],
        },
      ],
      references: [],
      relationships: {
        uses: [],
        usedBy: [],
        dependencies: [],
      },
      metadata: {
        exported: true,
        async: functionData.async || false,
        description: '',
        usageCount: 0,
      },
    };

    this.lookupTable.symbols[functionName] = {
      info: symbolInfo,
      lastUpdated: new Date().toISOString(),
      hash: this.generateSymbolHash(symbolInfo),
    };
  }

  /**
   * Map symbol types from codebase index to our symbol types
   */
  private mapSymbolType(type: string): SymbolType | null {
    switch (type?.toLowerCase()) {
      case 'class':
        return 'class';
      case 'function':
        return 'function';
      case 'interface':
        return 'interface';
      case 'variable':
        return 'variable';
      case 'type':
        return 'type';
      case 'enum':
        return 'enum';
      case 'namespace':
        return 'namespace';
      default:
        return null;
    }
  }

  /**
   * Create a codebase index structure for semantic analysis
   */
  private createCodebaseIndexFromSymbols(): any {
    const files = new Map();
    const classes = new Map();
    const functions = new Map();

    // Convert our symbol data to the format expected by SemanticCodeAnalyzer
    for (const [symbolName, symbolEntry] of Object.entries(
      this.lookupTable.symbols
    )) {
      const symbol = symbolEntry.info;

      if (symbol.type === 'class') {
        classes.set(symbolName, {
          file: symbol.definitions[0]?.location.file || '',
          extends: symbol.relationships.extends?.[0] || '',
          methods: [],
        });
      } else if (symbol.type === 'function') {
        functions.set(symbolName, {
          file: symbol.definitions[0]?.location.file || '',
          async: symbol.metadata.async || false,
        });
      }
    }

    for (const [filePath, fileEntry] of Object.entries(
      this.lookupTable.fileSymbols
    )) {
      files.set(filePath, {
        path: filePath,
        symbols: fileEntry.info.defines,
        imports: fileEntry.info.imports,
        exports: fileEntry.info.exports,
      });
    }

    return { files, classes, functions };
  }

  /**
   * Apply semantic analysis insights to enhance symbol information
   */
  private async applySemanticInsights(semanticAnalysis: any): Promise<void> {
    // Apply relationship insights
    if (semanticAnalysis.relationships) {
      for (const relationship of semanticAnalysis.relationships) {
        await this.enhanceSymbolRelationship(relationship);
      }
    }

    // Apply concept insights
    if (semanticAnalysis.concepts) {
      for (const concept of semanticAnalysis.concepts) {
        await this.enhanceSymbolWithConcept(concept);
      }
    }
  }

  /**
   * Enhance symbol with relationship information
   */
  private async enhanceSymbolRelationship(relationship: any): Promise<void> {
    const fromSymbol = this.lookupTable.symbols[relationship.from];
    const toSymbol = this.lookupTable.symbols[relationship.to];

    if (fromSymbol && toSymbol) {
      // Add relationship information
      if (!fromSymbol.info.relationships.uses.includes(relationship.to)) {
        fromSymbol.info.relationships.uses.push(relationship.to);
      }
      if (!toSymbol.info.relationships.usedBy.includes(relationship.from)) {
        toSymbol.info.relationships.usedBy.push(relationship.from);
      }
    }
  }

  /**
   * Enhance symbol with concept information
   */
  private async enhanceSymbolWithConcept(concept: any): Promise<void> {
    const symbol = this.lookupTable.symbols[concept.name];
    if (symbol) {
      // Add domain and type classification
      symbol.info.metadata.description = `${concept.domain} ${concept.type}: ${
        symbol.info.metadata.description || ''
      }`.trim();
    }
  }

  /**
   * Generate hash for symbol information
   */
  private generateSymbolHash(symbolInfo: SymbolInfo): string {
    const content = JSON.stringify({
      name: symbolInfo.name,
      type: symbolInfo.type,
      definitions: symbolInfo.definitions.length,
      relationships: symbolInfo.relationships,
    });
    return crypto.createHash('md5').update(content).digest('hex');
  }

  private buildRelationships(): void {
    console.log('🔗 Building symbol relationships...');

    // Build reverse relationships
    for (const [symbolName, symbolEntry] of Object.entries(
      this.lookupTable.symbols
    )) {
      const symbol = symbolEntry.info;

      // For each symbol this one uses, add this symbol to their usedBy list
      for (const usedSymbol of symbol.relationships.uses) {
        const usedEntry = this.lookupTable.symbols[usedSymbol];
        if (
          usedEntry &&
          !usedEntry.info.relationships.usedBy.includes(symbolName)
        ) {
          usedEntry.info.relationships.usedBy.push(symbolName);
        }
      }
    }

    // Build relationship entries for quick lookups
    for (const [symbolName, symbolEntry] of Object.entries(
      this.lookupTable.symbols
    )) {
      const symbol = symbolEntry.info;
      this.lookupTable.relationships[symbolName] = {
        extends: symbol.relationships.extends || [],
        implements: symbol.relationships.implements || [],
        uses: symbol.relationships.uses,
        usedBy: symbol.relationships.usedBy,
        dependencies: symbol.relationships.dependencies,
        weight: this.calculateRelationshipWeight(symbol),
      };
    }
  }

  private buildPatterns(): void {
    console.log('🔍 Building architectural patterns...');

    // Initialize pattern index
    this.lookupTable.patterns = {
      inheritance: {},
      implementations: {},
      namespaces: {},
      modules: {},
      singletons: [],
      factories: [],
      observers: [],
    };

    // Build inheritance patterns
    for (const [symbolName, symbolEntry] of Object.entries(
      this.lookupTable.symbols
    )) {
      const symbol = symbolEntry.info;

      if (symbol.type === 'class' && symbol.relationships.extends) {
        for (const baseClass of symbol.relationships.extends) {
          if (!this.lookupTable.patterns.inheritance[baseClass]) {
            this.lookupTable.patterns.inheritance[baseClass] = [];
          }
          this.lookupTable.patterns.inheritance[baseClass].push(symbolName);
        }
      }

      if (symbol.type === 'class' && symbol.relationships.implements) {
        for (const interfaceName of symbol.relationships.implements) {
          if (!this.lookupTable.patterns.implementations[interfaceName]) {
            this.lookupTable.patterns.implementations[interfaceName] = [];
          }
          this.lookupTable.patterns.implementations[interfaceName].push(
            symbolName
          );
        }
      }

      // Detect common patterns
      if (symbolName.toLowerCase().includes('singleton')) {
        this.lookupTable.patterns.singletons.push(symbolName);
      }
      if (symbolName.toLowerCase().includes('factory')) {
        this.lookupTable.patterns.factories.push(symbolName);
      }
      if (
        symbolName.toLowerCase().includes('observer') ||
        symbolName.toLowerCase().includes('listener')
      ) {
        this.lookupTable.patterns.observers.push(symbolName);
      }
    }
  }

  /**
   * Calculate relationship weight for a symbol
   */
  private calculateRelationshipWeight(symbol: SymbolInfo): number {
    let weight = 0;
    weight += symbol.relationships.uses.length * 0.1;
    weight += symbol.relationships.usedBy.length * 0.2; // Higher weight for symbols used by others
    weight += (symbol.relationships.extends?.length || 0) * 0.3;
    weight += (symbol.relationships.implements?.length || 0) * 0.2;
    return Math.min(weight, 1.0);
  }

  private updateMetadata(startTime: number): void {
    const endTime = Date.now();
    this.lookupTable.metadata.lastUpdated = new Date().toISOString();
    this.lookupTable.metadata.totalFiles = Object.keys(
      this.lookupTable.fileSymbols
    ).length;
    this.lookupTable.metadata.totalSymbols = Object.keys(
      this.lookupTable.symbols
    ).length;

    // Calculate total references
    this.lookupTable.metadata.totalReferences = Object.values(
      this.lookupTable.symbols
    ).reduce((total, entry) => total + entry.info.references.length, 0);
  }
}
