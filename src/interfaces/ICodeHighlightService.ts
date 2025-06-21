/**
 * Interface for code syntax highlighting service
 * Provides terminal-based syntax highlighting for code snippets
 */
export interface ICodeHighlightService {
  /**
   * Highlight code with syntax highlighting for terminal output
   * @param code - The code to highlight
   * @param language - Programming language (optional, auto-detect if not provided)
   * @returns Highlighted code with ANSI color codes
   */
  highlightCode(code: string, language?: string): string;

  /**
   * Display a formatted code block with syntax highlighting
   * @param code - The code to display
   * @param language - Programming language (optional)
   * @param title - Optional title for the code block
   */
  displayCodeBlock(code: string, language?: string, title?: string): void;

  /**
   * Highlight inline code snippets (single line)
   * @param code - The code snippet to highlight
   * @param language - Programming language (optional)
   * @returns Highlighted inline code
   */
  highlightInline(code: string, language?: string): string;

  /**
   * Get list of supported languages
   * @returns Array of supported language names
   */
  getSupportedLanguages(): string[];

  /**
   * Check if a language is supported
   * @param language - Language to check
   * @returns True if language is supported
   */
  isLanguageSupported(language: string): boolean;

  /**
   * Auto-detect programming language from code content
   * @param code - The code to analyze
   * @returns Detected language name or undefined if not detected
   */
  detectLanguage(code: string): string | undefined;

  /**
   * Format error messages with syntax highlighting
   * @param error - Error message or stack trace
   * @returns Formatted error with highlighting
   */
  formatError(error: string): string;

  /**
   * Create a themed code snippet for display
   * @param code - Code to theme
   * @param language - Language for highlighting
   * @param variant - Display variant ('block' | 'inline' | 'error')
   * @returns Themed code string
   */
  createThemedSnippet(
    code: string,
    language?: string,
    variant?: 'block' | 'inline' | 'error'
  ): string;
}
