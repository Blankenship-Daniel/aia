/**
 * Interface for Code Index Service
 * Provides codebase indexing and search capabilities
 */
export interface ICodeIndexService {
  /**
   * Index the entire codebase starting from a directory
   * @param directory - Root directory to index
   * @returns Promise resolving to index data
   */
  indexCodebase(directory: string): Promise<any>;

  /**
   * Load existing index from storage
   * @returns Promise resolving to loaded index data
   */
  loadIndex(): Promise<any>;

  /**
   * Get indexing statistics
   * @returns Index statistics including file counts, classes, functions, etc.
   */
  getIndexStats(): any;

  /**
   * Search for symbols in the indexed codebase
   * @param searchTerm - Term to search for
   * @returns Array of search results
   */
  searchSymbols(searchTerm: string): any[];

  /**
   * Search for files in the indexed codebase
   * @param searchTerm - Term to search for
   * @returns Array of file search results
   */
  searchFiles(searchTerm: string): any[];

  /**
   * Search for TODO items in the indexed codebase
   * @param searchTerm - Optional search term to filter TODOs
   * @returns Array of TODO items
   */
  searchTodos(searchTerm?: string): any[];

  /**
   * Get language distribution statistics
   * @returns Record of language names to file counts
   */
  getLanguageDistribution(): Record<string, number>;

  /**
   * Generate prompt file for AI context
   * @param type - Type of prompt file to generate
   * @param options - Additional options for generation
   * @returns Promise resolving to generated content
   */
  generatePromptFile(type: string, options?: any): Promise<string>;
}
