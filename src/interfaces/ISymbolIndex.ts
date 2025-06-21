/**
 * Symbol Index Interface
 * Provides optimized lookup capabilities for symbols and references in a codebase
 */
import {
  SymbolInfo,
  SymbolReference,
  SymbolDefinition,
  SymbolRelationships,
  FileSymbolInfo,
  SymbolType,
} from '../types';

/**
 * ISymbolIndex - Core interface for symbol lookup and navigation
 *
 * Provides O(1) access to symbol information for AI agents and development tools.
 * Supports efficient querying of definitions, references, and relationships.
 */
export interface ISymbolIndex {
  /**
   * Get complete symbol information by name
   * @param name Symbol name to lookup
   * @returns SymbolInfo or undefined if not found
   */
  getSymbol(name: string): SymbolInfo | undefined;

  /**
   * Get all references to a symbol
   * @param symbolName Name of the symbol
   * @returns Array of symbol references
   */
  getReferences(symbolName: string): SymbolReference[];

  /**
   * Get all definitions of a symbol (may be multiple for overloads)
   * @param symbolName Name of the symbol
   * @returns Array of symbol definitions
   */
  getDefinitions(symbolName: string): SymbolDefinition[];

  /**
   * Get relationship information for a symbol
   * @param symbolName Name of the symbol
   * @returns Symbol relationships (extends, implements, uses, etc.)
   */
  getRelationships(symbolName: string): SymbolRelationships;

  /**
   * Find all symbols of a specific type
   * @param type Type of symbols to find
   * @returns Array of symbol names matching the type
   */
  findSymbolsByType(type: SymbolType): string[];

  /**
   * Get all symbols defined in a specific file
   * @param filepath Path to the file
   * @returns File symbol information
   */
  getFileSymbols(filepath: string): FileSymbolInfo;

  /**
   * Search symbols by pattern or text
   * @param pattern Search pattern or text
   * @returns Array of matching symbol names
   */
  searchSymbols(pattern: string): string[];

  /**
   * Get inheritance chain for a class
   * @param className Name of the class
   * @returns Array of parent class names in inheritance order
   */
  getInheritanceChain(className: string): string[];

  /**
   * Get all implementations of an interface
   * @param interfaceName Name of the interface
   * @returns Array of implementing class names
   */
  getImplementations(interfaceName: string): string[];

  /**
   * Get dependency graph for a symbol
   * @param symbolName Name of the symbol
   * @param depth Maximum depth to traverse
   * @returns Dependency graph structure
   */
  getDependencyGraph(symbolName: string, depth?: number): Record<string, any>;

  /**
   * Build complete symbol index for a directory
   * @param rootDir - Root directory to index
   * @param options - Indexing options
   * @returns Promise resolving to symbol lookup table
   */
  buildSymbolIndex(
    rootDir: string,
    options?: {
      excludePatterns?: string[];
      includePatterns?: string[];
      useCache?: boolean;
    }
  ): Promise<any>;
}
