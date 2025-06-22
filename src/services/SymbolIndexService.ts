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
  SymbolType,
  ImportInfo,
} from '../types';
import { CodeIndexService } from './CodeIndexService';
import SemanticCodeAnalyzer from '../SemanticCodeAnalyzer';
import { TypeScriptSymbolAnalyzer } from '../analyzers/TypeScriptSymbolAnalyzer';
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
  private tsAnalyzer: TypeScriptSymbolAnalyzer;
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
    this.tsAnalyzer = new TypeScriptSymbolAnalyzer();
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
      force?: boolean;
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
      'dist/**',
      'coverage/**',
      '.vscode/**',
      '.git/**',
      '**/*.test.ts',
      '**/*.spec.ts',
      '**/*.log',
      '.DS_Store',
      '.env',
    ];
    this.lookupTable.metadata.includePatterns = options?.includePatterns || [
      '**/*.ts',
      '**/*.js',
    ];

    try {
      // If force option is used, skip existing index and use direct TypeScript analysis
      if (options?.force) {
        console.log(
          '🔄 Force rebuild enabled, analyzing files directly with TypeScript AST...'
        );
        await this.buildFromFileAnalysis(rootDir);
      } else {
        // Phase 2 Enhancement: Use existing codebase index if available
        await this.buildFromExistingIndex(rootDir);

        // If no existing index or it's incomplete, fall back to file analysis
        if (Object.keys(this.lookupTable.symbols).length === 0) {
          console.log(
            '📁 No existing codebase index found, analyzing files directly...'
          );
          await this.buildFromFileAnalysis(rootDir);
        }
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

  /**
   * Creates emptylookuptable
   * 
   * @returns SymbolLookupTable - Return value description
   */
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
        const relativePath = path.relative(rootDir, fullPath);

        if (entry.isDirectory()) {
          // Skip excluded directories using more robust pattern matching
          const shouldSkip = metadata.excludePatterns.some((pattern) => {
            // Handle different pattern formats
            if (pattern.endsWith('/**')) {
              // Match directory patterns like "node_modules/**"
              const dirPattern = pattern.replace('/**', '');
              return (
                relativePath.includes(dirPattern) || entry.name === dirPattern
              );
            } else if (pattern.includes('/')) {
              // Handle path-based patterns
              return relativePath.includes(pattern);
            } else {
              // Handle simple directory name patterns
              return entry.name === pattern || relativePath.includes(pattern);
            }
          });

          if (!shouldSkip) {
            await walkDir(fullPath);
          }
        } else if (entry.isFile()) {
          // Check if file should be excluded
          const shouldSkipFile = metadata.excludePatterns.some((pattern) => {
            if (pattern.startsWith('**/') && pattern.includes('.')) {
              // Handle file extension patterns like "**/*.test.ts" or "**/*.log"
              const extension = pattern.replace('**/', '');
              return (
                relativePath.endsWith(extension) || fullPath.endsWith(extension)
              );
            } else if (pattern.includes('.') && !pattern.includes('/')) {
              // Handle direct file patterns like ".DS_Store", ".env"
              return entry.name === pattern || relativePath.endsWith(pattern);
            } else if (pattern.includes('.')) {
              // Handle specific file patterns with paths
              return (
                relativePath.includes(pattern) || fullPath.includes(pattern)
              );
            }
            return false;
          });

          // Include TypeScript and JavaScript files that aren't excluded
          if (
            !shouldSkipFile &&
            (fullPath.endsWith('.ts') || fullPath.endsWith('.js'))
          ) {
            files.push(fullPath);
          }
        }
      }
    };

    await walkDir(rootDir);
    return files;
  }

  /**
   * Phase 2: Build symbol index from existing codebase index (legacy fallback)
   * Note: This is a fallback method when force=false and no TypeScript analysis is available
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

      console.log('📋 Loading existing codebase index (legacy fallback)...');
      const indexData = await fs.readJson(indexPath);

      // Simple extraction for basic symbol count (TypeScript AST analysis is preferred)
      let symbolCount = 0;

      if (indexData.files && Array.isArray(indexData.files)) {
        for (const [filePath, fileData] of indexData.files) {
          if (
            fileData.type === 'source' &&
            ['typescript', 'javascript'].includes(fileData.language) &&
            fileData.symbols
          ) {
            symbolCount += fileData.symbols.length;
          }
        }
      }

      if (indexData.classes && Array.isArray(indexData.classes)) {
        symbolCount += indexData.classes.length;
      }

      if (indexData.functions && Array.isArray(indexData.functions)) {
        symbolCount += indexData.functions.length;
      }

      console.log(
        `📊 Found ${symbolCount} symbols in existing index (recommend using --force for accurate analysis)`
      );
    } catch (error) {
      console.log('⚠️ Failed to load existing codebase index:', error);
    }
  }

  /**
   * Phase 2: Build symbol index from direct file analysis
   */
  private async buildFromFileAnalysis(rootDir: string): Promise<void> {
    // Initialize the TypeScript analyzer
    await this.tsAnalyzer.initialize(rootDir);

    // Find all TypeScript/JavaScript files
    const files = await this.findSourceFiles(
      rootDir,
      this.lookupTable.metadata
    );

    console.log(
      `📁 Analyzing ${files.length} source files with TypeScript AST...`
    );

    // Analyze each file for symbols and references
    for (const filepath of files) {
      await this.analyzeFileWithTypeScriptAST(filepath);
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

  /**
   * Builds relationships
   */
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

  /**
   * Builds patterns
   */
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

  /**
   * Handles updateMetadata operation
   * 
   * @param startTime - Parameter description
   */
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

  /**
   * Analyze a file using TypeScript AST to extract symbols and references
   */
  private async analyzeFileWithTypeScriptAST(filepath: string): Promise<void> {
    try {
      // Use TypeScript analyzer to extract symbols and references
      const analysis = await this.tsAnalyzer.analyzeFileReferences(filepath);

      // Validate the analysis result
      if (!analysis || !analysis.symbols || !analysis.references) {
        console.warn(`Invalid analysis result for ${filepath}, skipping file`);
        return;
      }

      // Process symbols from the file
      for (const symbol of analysis.symbols) {
        try {
          await this.addSymbolToIndex(symbol, filepath);
        } catch (error) {
          console.warn(
            `Failed to add symbol ${symbol.name} from ${filepath}:`,
            error
          );
        }
      }

      // Process references and update existing symbols
      for (const [symbolName, references] of analysis.references) {
        try {
          if (references && Array.isArray(references)) {
            await this.addReferencesToSymbol(symbolName, references);
          }
        } catch (error) {
          console.warn(
            `Failed to add references for symbol ${symbolName}:`,
            error
          );
        }
      }

      // Create file symbol info
      const stats = await fs.stat(filepath);
      const content = await fs.readFile(filepath, 'utf-8');
      const hash = crypto.createHash('md5').update(content).digest('hex');

      const fileInfo: FileSymbolInfo = {
        filepath,
        exports: analysis.symbols
          .filter((s) => s.metadata?.exported)
          .map((s) => s.name),
        imports: this.extractImportsFromSymbols(analysis.symbols),
        defines: analysis.symbols.map((s) => s.name),
        references: Array.from(analysis.references.keys()),
        lastModified: stats.mtime.toISOString(),
        hash,
      };

      this.lookupTable.fileSymbols[filepath] = {
        info: fileInfo,
        dependencies: [],
        dependents: [],
      };
    } catch (error) {
      console.warn(`Failed to analyze ${filepath} with TypeScript AST:`, error);
      // Skip files that can't be analyzed
    }
  }

  /**
   * Add a symbol to the index or update if it already exists
   */
  private async addSymbolToIndex(
    symbol: SymbolInfo,
    filepath: string
  ): Promise<void> {
    const existingEntry = this.lookupTable.symbols[symbol.name];

    if (existingEntry) {
      // Merge with existing symbol
      const existingSymbol = existingEntry.info;

      // Add new definitions
      existingSymbol.definitions.push(...symbol.definitions);

      // Merge relationships (safely handling undefined arrays)
      if (existingSymbol.relationships.extends) {
        existingSymbol.relationships.extends.push(
          ...(symbol.relationships.extends || [])
        );
      } else {
        existingSymbol.relationships.extends =
          symbol.relationships.extends || [];
      }

      if (existingSymbol.relationships.implements) {
        existingSymbol.relationships.implements.push(
          ...(symbol.relationships.implements || [])
        );
      } else {
        existingSymbol.relationships.implements =
          symbol.relationships.implements || [];
      }

      if (existingSymbol.relationships.uses) {
        existingSymbol.relationships.uses.push(
          ...(symbol.relationships.uses || [])
        );
      } else {
        existingSymbol.relationships.uses = symbol.relationships.uses || [];
      }

      if (existingSymbol.relationships.usedBy) {
        existingSymbol.relationships.usedBy.push(
          ...(symbol.relationships.usedBy || [])
        );
      } else {
        existingSymbol.relationships.usedBy = symbol.relationships.usedBy || [];
      }

      // Remove duplicates
      existingSymbol.relationships.extends = [
        ...new Set(existingSymbol.relationships.extends),
      ];
      existingSymbol.relationships.implements = [
        ...new Set(existingSymbol.relationships.implements),
      ];
      existingSymbol.relationships.uses = [
        ...new Set(existingSymbol.relationships.uses),
      ];
      existingSymbol.relationships.usedBy = [
        ...new Set(existingSymbol.relationships.usedBy),
      ];

      // Update metadata
      existingEntry.lastUpdated = new Date().toISOString();
    } else {
      // Create new symbol entry
      this.lookupTable.symbols[symbol.name] = {
        info: symbol,
        lastUpdated: new Date().toISOString(),
        hash: this.generateSymbolHash(symbol),
      };
    }
  }

  /**
   * Add references to an existing symbol or create a placeholder if it doesn't exist
   */
  private async addReferencesToSymbol(
    symbolName: string,
    references: SymbolReference[]
  ): Promise<void> {
    // Validate inputs
    if (!symbolName || typeof symbolName !== 'string') {
      console.warn(`Invalid symbol name provided: ${symbolName}`);
      return;
    }

    if (!references || !Array.isArray(references)) {
      // Skip if references is undefined or not an array
      console.warn(
        `Invalid references provided for symbol ${symbolName}:`,
        typeof references
      );
      return;
    }

    if (references.length === 0) {
      // Skip if no references to add
      return;
    }

    // Skip built-in JavaScript symbols to avoid errors
    const builtInSymbols = new Set([
      'toString',
      'constructor',
      'hasOwnProperty',
      'valueOf',
      'toLocaleString',
      'propertyIsEnumerable',
      'isPrototypeOf',
      '__defineGetter__',
      '__defineSetter__',
      '__lookupGetter__',
      '__lookupSetter__',
    ]);

    if (builtInSymbols.has(symbolName)) {
      // Skip built-in JavaScript symbols as they don't belong in our symbol table
      return;
    }

    const existingEntry = this.lookupTable.symbols[symbolName];

    if (existingEntry) {
      // Ensure the symbol entry has proper structure
      if (!existingEntry.info) {
        console.warn(`Symbol ${symbolName} exists but has no info property`);
        return;
      }

      // Add references to existing symbol
      if (!existingEntry.info.references) {
        existingEntry.info.references = [];
      }
      existingEntry.info.references.push(...references);

      // Update usage count
      if (existingEntry.info.metadata) {
        existingEntry.info.metadata.usageCount =
          existingEntry.info.references.length;
      }

      existingEntry.lastUpdated = new Date().toISOString();
    } else {
      // Create a placeholder entry for symbols that are referenced but not defined in our codebase
      // This could be external libraries, built-in types, etc.
      const placeholderSymbol: SymbolInfo = {
        name: symbolName,
        type: 'variable', // Use 'variable' as fallback type for unknown symbols
        definitions: [],
        references: references,
        relationships: {
          extends: [],
          implements: [],
          uses: [],
          usedBy: [],
          dependencies: [],
        },
        metadata: {
          exported: false,
          usageCount: references.length,
          description: 'External or referenced symbol',
        },
      };

      this.lookupTable.symbols[symbolName] = {
        info: placeholderSymbol,
        lastUpdated: new Date().toISOString(),
        hash: this.generateSymbolHash(placeholderSymbol),
      };
    }
  }

  /**
   * Extract import statements from symbols for file symbol info
   */
  private extractImportsFromSymbols(symbols: SymbolInfo[]): ImportInfo[] {
    const imports: ImportInfo[] = [];

    // This is a simplified extraction - in a real implementation you might
    // want to parse import statements from the AST more thoroughly
    for (const symbol of symbols) {
      for (const reference of symbol.references) {
        if (reference.context === 'import') {
          imports.push({
            symbols: [symbol.name],
            from: reference.location.file,
            isDefault: false,
            isNamespace: false,
          });
        }
      }
    }

    return imports;
  }
}
