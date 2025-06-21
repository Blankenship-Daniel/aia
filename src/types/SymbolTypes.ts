/**
 * Symbol Types
 * Core type definitions for the symbol lookup hash table system
 */

export type SymbolType =
  | 'class'
  | 'function'
  | 'interface'
  | 'variable'
  | 'type'
  | 'enum'
  | 'namespace';

/**
 * Symbol context information for AI consumption
 */
export interface SymbolContextInfo {
  symbol: string;
  definition: string; // Full definition code
  usage: string[]; // Example usage snippets
  related: string[]; // Related symbols
  summary: string; // AI-generated summary
  dependencies: string[]; // Direct dependencies
  dependents: string[]; // Direct dependents
}
export type SymbolScope = 'global' | 'module' | 'class' | 'function' | 'block';
export type ReferenceContext =
  | 'import'
  | 'extends'
  | 'implements'
  | 'call'
  | 'instantiation'
  | 'type'
  | 'assignment';

/**
 * Location information for symbols and references
 */
export interface SourceLocation {
  file: string;
  line: number;
  column: number;
  endLine?: number;
  endColumn?: number;
}

/**
 * Symbol definition with location and context
 */
export interface SymbolDefinition {
  location: SourceLocation;
  snippet: string; // 2-3 lines of context around the definition
  scope: SymbolScope;
  modifiers?: string[]; // export, static, async, abstract, etc.
}

/**
 * Symbol reference with usage context
 */
export interface SymbolReference {
  location: SourceLocation;
  context: ReferenceContext;
  snippet?: string; // Optional context around the reference
}

/**
 * Relationship information between symbols
 */
export interface SymbolRelationships {
  extends?: string[]; // Parent classes/interfaces
  implements?: string[]; // Implemented interfaces
  uses: string[]; // Symbols this symbol depends on
  usedBy: string[]; // Symbols that depend on this symbol
  dependencies: string[]; // Direct dependencies
  overrides?: string[]; // Methods this symbol overrides
  overriddenBy?: string[]; // Symbols that override this one
}

/**
 * Complete symbol information entry
 */
export interface SymbolInfo {
  name: string;
  type: SymbolType;
  definitions: SymbolDefinition[];
  references: SymbolReference[];
  relationships: SymbolRelationships;
  metadata: SymbolMetadata;
}

/**
 * Additional metadata for symbols
 */
export interface SymbolMetadata {
  exported: boolean;
  abstract?: boolean;
  async?: boolean;
  static?: boolean;
  readonly?: boolean;
  deprecated?: boolean;
  description?: string; // JSDoc description
  tags?: string[]; // JSDoc tags
  complexity?: number; // Complexity score
  usageCount: number; // Number of references
}

/**
 * Symbol entry in the lookup table
 */
export interface SymbolEntry {
  info: SymbolInfo;
  lastUpdated: string; // ISO timestamp
  hash: string; // Content hash for change detection
}

/**
 * File-based symbol information
 */
export interface FileSymbolInfo {
  filepath: string;
  exports: string[]; // Symbols exported from this file
  imports: ImportInfo[]; // Symbols imported into this file
  defines: string[]; // Symbols defined in this file
  references: string[]; // External symbols referenced
  lastModified: string; // File modification timestamp
  hash: string; // File content hash
}

/**
 * Import information
 */
export interface ImportInfo {
  symbols: string[]; // Imported symbol names
  from: string; // Source module/file
  isDefault?: boolean; // Default import
  isNamespace?: boolean; // Namespace import (import * as)
  alias?: string; // Import alias
}

/**
 * File symbol entry in the lookup table
 */
export interface FileSymbolEntry {
  info: FileSymbolInfo;
  dependencies: string[]; // Files this file depends on
  dependents: string[]; // Files that depend on this file
}

/**
 * Relationship entry for quick lookups
 */
export interface RelationshipEntry {
  extends?: string[];
  implements?: string[];
  uses: string[];
  usedBy: string[];
  dependencies: string[];
  weight: number; // Relationship strength/importance
}

/**
 * Pattern index for common architectural patterns
 */
export interface PatternIndex {
  inheritance: { [baseClass: string]: string[] };
  implementations: { [interfaceName: string]: string[] };
  namespaces: { [namespace: string]: string[] };
  modules: { [module: string]: string[] };
  singletons: string[];
  factories: string[];
  observers: string[];
}

/**
 * Index metadata and statistics
 */
export interface IndexMetadata {
  version: string;
  created: string; // ISO timestamp
  lastUpdated: string; // ISO timestamp
  totalSymbols: number;
  totalFiles: number;
  totalReferences: number;
  language: string; // Primary language (typescript, javascript, etc.)
  rootPath: string; // Root directory of the indexed codebase
  excludePatterns: string[]; // Patterns used to exclude files
  includePatterns: string[]; // Patterns used to include files
}

/**
 * Main symbol lookup table structure
 */
export interface SymbolLookupTable {
  symbols: { [symbolName: string]: SymbolEntry };
  fileSymbols: { [filepath: string]: FileSymbolEntry };
  relationships: { [symbolName: string]: RelationshipEntry };
  patterns: PatternIndex;
  metadata: IndexMetadata;
}

/**
 * File analysis result from AST parsing
 */
export interface FileSymbolAnalysis {
  filepath: string;
  symbols: SymbolInfo[];
  imports: ImportInfo[];
  exports: string[];
  dependencies: string[];
  errors: string[]; // Parse or analysis errors
}

/**
 * Dependency information
 */
export interface DependencyInfo {
  direct: string[]; // Direct dependencies
  indirect: string[]; // Transitive dependencies
  circular: string[]; // Circular dependency chains
  external: string[]; // External library dependencies
  weight: number; // Overall dependency weight
}
