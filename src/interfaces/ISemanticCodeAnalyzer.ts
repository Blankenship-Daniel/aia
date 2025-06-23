/**
 * Interface for Semantic Code Analyzer
 * Provides semantic analysis of codebases including pattern detection and quality assessment
 */
export interface ISemanticCodeAnalyzer {
  /**
   * Analyze codebase semantics to detect patterns, architecture, and quality metrics
   * @param index - The codebase index to analyze
   * @returns Promise resolving to semantic analysis results
   */
  analyzeCodebaseSemantics(index: any): Promise<any>;
}
