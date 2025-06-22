/**
 * Service for providing terminal-based syntax highlighting using cli-highlight
 * Implements ICodeHighlightService interface for dependency injection
 */

import { ICodeHighlightService } from '../interfaces/ICodeHighlightService';
import * as highlight from 'cli-highlight';
import chalk from 'chalk';

/**
 * CodeHighlightService - Terminal syntax highlighting service
 *
 * Purpose:
 * - Provides syntax highlighting for code snippets in terminal output
 * - Supports multiple programming languages with auto-detection
 * - Integrates with the CLI for enhanced code display
 *
 * Features:
 * - Syntax highlighting using cli-highlight package
 * - Customizable color themes using chalk
 * - Language auto-detection
 * - Error handling with graceful fallbacks
 * - Support for inline code and code blocks
 */
export class CodeHighlightService implements ICodeHighlightService {
  private readonly theme: Record<string, any>;

  constructor() {
    // Initialize with default theme using chalk functions
    this.theme = {
      keyword: chalk.blue,
      built_in: chalk.cyan,
      type: chalk.cyan,
      literal: chalk.green,
      number: chalk.yellow,
      regexp: chalk.red,
      string: chalk.green,
      comment: chalk.gray,
      meta: chalk.gray,
      deletion: chalk.red,
      addition: chalk.green,
      emphasis: chalk.italic,
      strong: chalk.bold,
    };
  }

  /**
   * Highlight code with syntax highlighting for terminal output
   * @param code - The code to highlight
   * @param language - Programming language (optional, auto-detect if not provided)
   * @returns Highlighted code with ANSI color codes
   */
  highlightCode(code: string, language?: string): string {
    try {
      if (!code || typeof code !== 'string') {
        return code || '';
      }

      // Use auto-detection if no language specified
      const detectedLanguage = language || this.detectLanguage(code);

      // Use cli-highlight with our theme
      const highlighted = highlight.highlight(code, {
        language: detectedLanguage,
        theme: this.theme,
        ignoreIllegals: true,
      });

      return highlighted;
    } catch (error) {
      console.error('Syntax highlighting failed:', error);
      return code; // Return original code if highlighting fails
    }
  }

  /**
   * Display a formatted code block with syntax highlighting
   * @param code - The code to display
   * @param language - Programming language (optional)
   * @param title - Optional title for the code block
   */
  displayCodeBlock(code: string, language?: string, title?: string): void {
    if (title) {
      console.log(chalk.cyan(`\n--- ${title} ---`));
    }

    const highlighted = this.highlightCode(code, language);
    console.log(highlighted);

    if (title) {
      console.log(chalk.cyan(`--- End ${title} ---\n`));
    }
  }

  /**
   * Highlight inline code snippets (single line)
   * @param code - The code snippet to highlight
   * @param language - Programming language (optional)
   * @returns Highlighted inline code
   */
  highlightInline(code: string, language?: string): string {
    const highlighted = this.highlightCode(code, language);
    return chalk.gray('`') + highlighted + chalk.gray('`');
  }

  /**
   * Get list of supported languages
   * @returns Array of supported language names
   */
  getSupportedLanguages(): string[] {
    return [
      'javascript',
      'typescript',
      'python',
      'java',
      'cpp',
      'c',
      'json',
      'yaml',
      'xml',
      'html',
      'css',
      'bash',
      'shell',
      'sql',
      'go',
      'rust',
      'php',
      'ruby',
      'kotlin',
      'swift',
    ];
  }

  /**
   * Check if a language is supported
   * @param language - Language to check
   * @returns True if language is supported
   */
  isLanguageSupported(language: string): boolean {
    return this.getSupportedLanguages().includes(language?.toLowerCase());
  }

  /**
   * Auto-detect programming language from code content
   * @param code - The code to analyze
   * @returns Detected language name or undefined if not detected
   */
  detectLanguage(code: string): string | undefined {
    if (!code) return undefined;

    // Clean code for analysis
    const cleanCode = code.trim().toLowerCase();

    // TypeScript/JavaScript detection
    if (
      cleanCode.includes('interface ') ||
      cleanCode.includes(': string') ||
      cleanCode.includes(': number')
    ) {
      return 'typescript';
    }
    if (cleanCode.includes('function') && cleanCode.includes('{'))
      return 'javascript';
    if (
      cleanCode.includes('const ') ||
      cleanCode.includes('let ') ||
      cleanCode.includes('var ')
    )
      return 'javascript';

    // Python detection
    if (cleanCode.includes('def ') && cleanCode.includes(':')) return 'python';
    if (cleanCode.includes('import ') && cleanCode.includes('from '))
      return 'python';

    // Java detection
    if (cleanCode.includes('class ') && cleanCode.includes('public'))
      return 'java';
    if (cleanCode.includes('package ') || cleanCode.includes('import java.'))
      return 'java';

    // C/C++ detection
    if (cleanCode.includes('#include') || cleanCode.includes('int main'))
      return 'cpp';
    if (cleanCode.includes('std::') || cleanCode.includes('#define'))
      return 'cpp';

    // SQL detection
    if (
      cleanCode.includes('select') ||
      cleanCode.includes('from') ||
      cleanCode.includes('where')
    )
      return 'sql';

    // HTML detection
    if (
      cleanCode.includes('<') &&
      cleanCode.includes('>') &&
      cleanCode.includes('</')
    )
      return 'html';

    // JSON detection
    if (cleanCode.startsWith('{') && cleanCode.includes('"')) return 'json';

    // Shell/Bash detection
    if (cleanCode.includes('#!/bin/bash') || cleanCode.includes('echo '))
      return 'bash';

    // Default fallback
    return 'javascript';
  }

  /**
   * Format JSON with syntax highlighting
   * @param obj - Object to format as JSON
   * @returns Highlighted JSON string
   */
  formatJSON(obj: any): string {
    try {
      const jsonString = JSON.stringify(obj, null, 2);
      return this.highlightCode(jsonString, 'json');
    } catch (error) {
      console.error('JSON formatting failed:', error);
      return String(obj);
    }
  }

  /**
   * Format error messages with highlighting
   * @param error - Error message or stack trace
   * @returns Formatted error message
   */
  formatError(error: string): string {
    return chalk.red('Error: ') + chalk.gray(error);
  }

  /**
   * Create a syntax-highlighted diff display
   * @param oldCode - Original code
   * @param newCode - Modified code
   * @param language - Programming language
   * @returns Formatted diff with highlighting
   */
  formatDiff(oldCode: string, newCode: string, language?: string): string {
    const oldHighlighted = this.highlightCode(oldCode, language);
    const newHighlighted = this.highlightCode(newCode, language);

    return `${chalk.red('- Old:')}\n${oldHighlighted}\n\n${chalk.green(
      '+ New:'
    )}\n${newHighlighted}`;
  }

  /**
   * Format code with line numbers
   * @param code - Code to format
   * @param language - Programming language
   * @param startLine - Starting line number (default: 1)
   * @returns Code with line numbers and syntax highlighting
   */
  formatWithLineNumbers(
    code: string,
    language?: string,
    startLine: number = 1
  ): string {
    const highlighted = this.highlightCode(code, language);
    const lines = highlighted.split('\n');

    return lines
      .map((line, index) => {
        const lineNumber = (startLine + index).toString().padStart(3, ' ');
        return `${chalk.gray(lineNumber)}│ ${line}`;
      })
      .join('\n');
  }

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
  ): string {
    try {
      const highlighted = this.highlightCode(code, language);

      switch (variant) {
        case 'inline':
          return this.highlightInline(code, language);

        case 'error':
          return chalk.red('Error in code:') + '\n' + chalk.gray(highlighted);

        case 'block':
        default:
          return highlighted;
      }
    } catch (error) {
      console.error('Themed snippet creation failed:', error);
      return code;
    }
  }

  /**
   * Check if content looks like code based on common patterns
   * @param content - The content to analyze
   * @returns True if content appears to contain code
   */
  looksLikeCode(content: string): boolean {
    if (!content || typeof content !== 'string') {
      return false;
    }

    // Simple heuristics for code detection
    const codeIndicators = [
      /```[\s\S]*```/, // Markdown code blocks
      /^[\s]*[\w\$]+\s*[:=]/m, // Variable assignments
      /[\{\}\[\]]/, // Brackets/braces
      /function\s+\w+/, // Function declarations
      /class\s+\w+/, // Class declarations
      /import\s+.*from/, // Import statements
      /export\s+/, // Export statements
      /<\w+.*>/, // HTML-like tags
    ];

    return codeIndicators.some((pattern) => pattern.test(content));
  }
}
