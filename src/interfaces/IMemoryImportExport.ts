/**
 * Memory Import/Export Interface
 * SOLID SRP: Focused solely on memory import/export and maintenance operations
 * SOLID ISP: Small, focused interface for import/export-specific operations
 */
export interface IMemoryImportExport {
  /**
   * Export memory to file
   */
  exportMemory(path: string): Promise<void>;

  /**
   * Import memory from file
   */
  importMemory(path: string): Promise<void>;

  /**
   * Compress memory by removing old entries
   */
  compressMemory(): Promise<void>;

  /**
   * Clear all memory
   */
  clearMemory(): Promise<void>;
}
