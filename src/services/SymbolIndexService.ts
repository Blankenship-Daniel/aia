import { ISymbolIndex } from '../interfaces/ISymbolIndex';
import { ICachingService } from '../interfaces/ICachingService';
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
import * as fs from 'fs-extra';
import * as path from 'path';
import * as crypto from 'crypto';

/**
 * SymbolIndexService - Core implementation of optimized symbol lookup
 *
 * Provides O(1) access to symbol information through hash table lookups.
 * Integrates with caching service for performance optimization.
 */
export class SymbolIndexService implements ISymbolIndex {
  private lookupTable: SymbolLookupTable;
  private cache: ICachingService;
  private isInitialized: boolean = false;

  constructor(cache: ICachingService) {
    this.cache = cache;
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
      // Find all TypeScript/JavaScript files
      const files = await this.findSourceFiles(
        rootDir,
        this.lookupTable.metadata
      );

      // Analyze each file
      for (const filepath of files) {
        await this.analyzeFile(filepath);
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

  private buildRelationships(): void {
    // Placeholder for relationship building
    // Will be implemented in Phase 2
  }

  private buildPatterns(): void {
    // Placeholder for pattern recognition
    // Will be implemented in Phase 2
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
