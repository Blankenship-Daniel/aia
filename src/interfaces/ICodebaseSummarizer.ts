/**
 * Interface for Codebase Summarizer
 * Provides AI-powered codebase analysis and summary generation
 */
export interface ICodebaseSummarizer {
  /**
   * Generate AI-powered summary of the codebase
   * @param index - The codebase index to analyze
   * @returns Promise resolving to summary data
   */
  generateAISummary(index: any): Promise<{ summary: any; rawSummary: string }>;
}
