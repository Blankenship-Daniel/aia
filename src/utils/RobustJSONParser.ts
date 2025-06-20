import chalk from 'chalk';
// @ts-ignore - No type declarations available
import { extractJSON } from 'extract-first-json';
// @ts-ignore - No type declarations available
import dirtyJSON from 'dirty-json';
// @ts-ignore - No type declarations available
import jsonic from 'jsonic';
import JSON5 from 'json5';

/**
 * RobustJSONParser.ts - Robust JSON parsing utility for AI responses with multiple fallback strategies.
 *
 * Responsibilities:
 * - Parses JSON from AI responses that may contain malformed or embedded JSON.
 * - Provides multiple fallback strategies for handling various JSON formats and edge cases.
 * - Handles JSON embedded in markdown code blocks, mixed text responses, and partial JSON.
 * - Supports debugging and logging of parsing attempts for troubleshooting.
 *
 * Capabilities:
 * - Standard JSON parsing with validation.
 * - Extraction from markdown code blocks.
 * - Handling of malformed JSON with missing quotes, trailing commas.
 * - Support for single-quoted strings and unquoted keys.
 * - Multiple JSON objects in single response.
 * - Partial JSON recovery and reconstruction.
 *
 * Exports:
 * - {@link RobustJSONParser}: Main parser class with comprehensive parsing strategies.
 * - {@link parseAgenticPlan}: Specialized parser for agentic plan structures.
 * - {@link parseEvaluationResult}: Parser for evaluation result objects.
 * - {@link parseStepVerification}: Parser for step verification data.
 *
 * @see AgenticReasoningEngine - Primary consumer of parsing functionality.
 * @see extract-first-json - Library for extracting JSON from mixed content.
 * @see dirty-json - Library for parsing malformed JSON.
 * @see jsonic - Library for relaxed JSON parsing.
 */

/**
 * RobustJSONParser - Advanced JSON parsing utility designed for AI response processing.
 *
 * Purpose:
 * - Provides reliable JSON extraction from AI responses that may contain malformed, embedded, or mixed content.
 * - Implements multiple parsing strategies with intelligent fallback mechanisms.
 * - Handles various edge cases including markdown code blocks, partial JSON, and syntax errors.
 * - Supports debugging and detailed logging for troubleshooting parsing issues.
 *
 * Parsing Strategies (in order of execution):
 * 1. Standard JSON.parse() for well-formed JSON
 * 2. Extraction from markdown code blocks
 * 3. extract-first-json library for mixed content
 * 4. dirty-json library for malformed JSON
 * 5. jsonic library for relaxed JSON syntax
 * 6. JSON5 library for extended JSON syntax
 * 7. Multiple object extraction
 * 8. Partial JSON recovery
 *
 * @example
 * const parser = new RobustJSONParser();
 * const result = parser.parseFromResponse('```json\n{"key": "value"}\n```');
 * console.log(result); // { key: "value" }
 */
export class RobustJSONParser {
  private parseAttempts: number;
  private debugMode: boolean;

  constructor() {
    this.parseAttempts = 0;
    this.debugMode = process.env.DEBUG_JSON_PARSER === 'true';
  }

  /**
   * Parses JSON from AI response using multiple fallback strategies.
   *
   * Detailed Process:
   * - Attempts standard JSON parsing first for optimal performance.
   * - Falls back to specialized libraries for malformed or embedded JSON.
   * - Tries multiple extraction strategies until successful or all fail.
   * - Provides detailed logging when debug mode is enabled.
   *
   * @param {string} response - The AI response string potentially containing JSON.
   * @param {boolean} [logAttempts=false] - Whether to log parsing attempts and results.
   * @returns {unknown | null} Parsed JSON object or null if all parsing strategies fail.
   *
   * @example
   * const parser = new RobustJSONParser();
   * const result = parser.parseFromResponse('Here is the data: {"status": "ok"}', true);
   * // Returns: { status: "ok" }
   *
   * @see parseStandardJSON - First parsing strategy using native JSON.parse.
   * @see parseFromCodeBlocks - Extracts JSON from markdown code blocks.
   */
  public parseFromResponse(
    response: string,
    logAttempts: boolean = false
  ): unknown | null {
    this.parseAttempts = 0;

    if (!response || typeof response !== 'string') {
      return null;
    }

    const strategies = [
      () => this.parseStandardJSON(response),
      () => this.parseFromCodeBlocks(response),
      () => this.parseWithExtractFirstJSON(response),
      () => this.parseWithDirtyJSON(response),
      () => this.parseWithJSONIC(response),
      () => this.parseWithJSON5(response),
      () => this.parseMultipleObjects(response),
      () => this.parsePartialJSON(response),
    ];

    for (const strategy of strategies) {
      try {
        this.parseAttempts++;
        const result = strategy();

        if (result !== null && result !== undefined) {
          if (logAttempts || this.debugMode) {
            console.log(
              chalk.green(`✅ JSON parsed on attempt ${this.parseAttempts}`)
            );
          }
          return result;
        }
      } catch (error) {
        if (this.debugMode) {
          const errorMessage =
            error instanceof Error ? error.message : 'Unknown error';
          console.log(
            chalk.yellow(
              `⚠️ Strategy ${this.parseAttempts} failed: ${errorMessage}`
            )
          );
        }
        continue;
      }
    }

    if (logAttempts || this.debugMode) {
      console.log(
        chalk.red(
          `❌ All JSON parsing strategies failed after ${this.parseAttempts} attempts`
        )
      );
    }
    return null;
  }

  /**
   * Standard JSON.parse
   */
  private parseStandardJSON(response: string): unknown | null {
    try {
      return JSON.parse(response.trim());
    } catch {
      return null;
    }
  }

  /**
   * Extract JSON from markdown code blocks
   */
  private parseFromCodeBlocks(response: string): unknown | null {
    const codeBlockRegex = /```(?:json|javascript|js)?\n?([\s\S]*?)\n?```/gi;
    let match: RegExpExecArray | null;

    while ((match = codeBlockRegex.exec(response)) !== null) {
      try {
        const jsonContent = match[1].trim();
        return JSON.parse(jsonContent);
      } catch {
        continue;
      }
    }

    // Try inline code blocks
    const inlineCodeRegex = /`([^`]+)`/g;
    while ((match = inlineCodeRegex.exec(response)) !== null) {
      try {
        const jsonContent = match[1].trim();
        if (jsonContent.startsWith('{') || jsonContent.startsWith('[')) {
          return JSON.parse(jsonContent);
        }
      } catch {
        continue;
      }
    }

    return null;
  }

  /**
   * Use extract-first-json library
   */
  private parseWithExtractFirstJSON(response: string): unknown | null {
    try {
      const result = extractJSON(response);
      return result;
    } catch {
      return null;
    }
  }

  /**
   * Use dirty-json for malformed JSON
   */
  private parseWithDirtyJSON(response: string): unknown | null {
    try {
      // Clean response first
      let cleaned = response.trim();

      // Remove common AI response prefixes
      const prefixPatterns = [
        /^Here's the JSON:/i,
        /^The JSON is:/i,
        /^JSON:/i,
        /^Response:/i,
        /^Result:/i,
      ];

      for (const pattern of prefixPatterns) {
        cleaned = cleaned.replace(pattern, '').trim();
      }

      return dirtyJSON.parse(cleaned);
    } catch {
      return null;
    }
  }

  /**
   * Use jsonic for relaxed JSON parsing
   */
  private parseWithJSONIC(response: string): unknown | null {
    try {
      let cleaned = response.trim();

      // Extract potential JSON from text
      const jsonMatch = cleaned.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
      if (jsonMatch) {
        cleaned = jsonMatch[0];
      }

      return jsonic(cleaned);
    } catch {
      return null;
    }
  }

  /**
   * Use JSON5 for extended JSON syntax
   */
  private parseWithJSON5(response: string): unknown | null {
    try {
      let cleaned = response.trim();

      // Extract potential JSON from text
      const jsonMatch = cleaned.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
      if (jsonMatch) {
        cleaned = jsonMatch[0];
      }

      return JSON5.parse(cleaned);
    } catch {
      return null;
    }
  }

  /**
   * Parse multiple JSON objects from response
   */
  private parseMultipleObjects(response: string): unknown | null {
    const objects: unknown[] = [];
    const objectRegex = /\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}/g;
    let match: RegExpExecArray | null;

    while ((match = objectRegex.exec(response)) !== null) {
      try {
        const obj = JSON.parse(match[0]);
        objects.push(obj);
      } catch {
        continue;
      }
    }

    if (objects.length === 1) {
      return objects[0];
    } else if (objects.length > 1) {
      return objects;
    }

    return null;
  }

  /**
   * Parse partial or truncated JSON
   */
  private parsePartialJSON(response: string): unknown | null {
    try {
      let cleaned = response.trim();

      // Find the start of JSON
      const startMatch = cleaned.match(/[\{\[]/);
      if (startMatch) {
        cleaned = cleaned.substring(startMatch.index!);
      }

      // Try to close incomplete objects/arrays
      let openBraces = 0;
      let openBrackets = 0;
      let inString = false;
      let escapeNext = false;

      for (let i = 0; i < cleaned.length; i++) {
        const char = cleaned[i];

        if (escapeNext) {
          escapeNext = false;
          continue;
        }

        if (char === '\\') {
          escapeNext = true;
          continue;
        }

        if (char === '"' && !escapeNext) {
          inString = !inString;
          continue;
        }

        if (!inString) {
          if (char === '{') openBraces++;
          else if (char === '}') openBraces--;
          else if (char === '[') openBrackets++;
          else if (char === ']') openBrackets--;
        }
      }

      // Close incomplete structures
      while (openBraces > 0) {
        cleaned += '}';
        openBraces--;
      }
      while (openBrackets > 0) {
        cleaned += ']';
        openBrackets--;
      }

      return JSON.parse(cleaned);
    } catch {
      return null;
    }
  }

  /**
   * Clean and normalize response before parsing
   */
  private cleanResponse(response: string): string {
    return response
      .trim()
      .replace(/[\u0000-\u001F\u007F-\u009F]/g, '') // Remove control characters
      .replace(/\n\s*\n/g, '\n') // Remove excessive newlines
      .replace(/,\s*([}\]])/g, '$1'); // Remove trailing commas
  }

  /**
   * Get parsing statistics
   */
  public getParseAttempts(): number {
    return this.parseAttempts;
  }

  /**
   * Reset parsing statistics
   */
  public resetStats(): void {
    this.parseAttempts = 0;
  }
}

// Convenience methods for common AIA use cases

/**
 * Parse agentic plan from AI response
 */
export function parseAgenticPlan(
  response: string,
  logAttempts: boolean = true
): unknown | null {
  const parser = new RobustJSONParser();
  const result = parser.parseFromResponse(response, logAttempts);

  if (logAttempts && result) {
    console.log(chalk.green('✅ Agentic plan parsed successfully'));
  }

  return result;
}

/**
 * Parse evaluation result from AI response
 */
export function parseEvaluationResult(
  response: string,
  logAttempts: boolean = true
): unknown | null {
  const parser = new RobustJSONParser();
  const result = parser.parseFromResponse(response, logAttempts);

  if (logAttempts && result) {
    console.log(chalk.green('✅ Evaluation result parsed successfully'));
  }

  return result;
}

/**
 * Parse step verification from AI response
 */
export function parseStepVerification(
  response: string,
  logAttempts: boolean = true
): unknown | null {
  const parser = new RobustJSONParser();
  const result = parser.parseFromResponse(response, logAttempts);

  if (logAttempts && result) {
    console.log(chalk.green('✅ Step verification parsed successfully'));
  }

  return result;
}

/**
 * Parse recovery analysis from AI response
 */
export function parseRecoveryAnalysis(
  response: string,
  logAttempts: boolean = true
): unknown | null {
  const parser = new RobustJSONParser();
  const result = parser.parseFromResponse(response, logAttempts);

  if (logAttempts && result) {
    console.log(chalk.green('✅ Recovery analysis parsed successfully'));
  }

  return result;
}

/**
 * Parse recovery plan from AI response
 */
export function parseRecoveryPlan(
  response: string,
  logAttempts: boolean = true
): unknown | null {
  const parser = new RobustJSONParser();
  const result = parser.parseFromResponse(response, logAttempts);

  if (logAttempts && result) {
    console.log(chalk.green('✅ Recovery plan parsed successfully'));
  }

  return result;
}

/**
 * Parse step validation from AI response
 */
export function parseStepValidation(
  response: string,
  logAttempts: boolean = true
): unknown | null {
  const parser = new RobustJSONParser();
  const result = parser.parseFromResponse(response, logAttempts);

  if (logAttempts && result) {
    console.log(chalk.green('✅ Step validation parsed successfully'));
  }

  return result;
}
