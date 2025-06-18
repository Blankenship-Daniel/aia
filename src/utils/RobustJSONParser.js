const chalk = require('chalk');
const { extractJSON } = require('extract-first-json');
const dirtyJSON = require('dirty-json');
const jsonic = require('jsonic');
const JSON5 = require('json5');

/**
 * Robust JSON Parser for AI Responses
 *
 * This utility replaces manual JSON parsing and string cleaning throughout AIA
 * with a more reliable, library-based approach that can handle:
 * - JSON embedded in markdown code blocks
 * - Malformed JSON with missing quotes, trailing commas
 * - Mixed text and JSON responses
 * - Single-quoted strings and unquoted keys
 * - Multiple JSON objects in a single response
 */
class RobustJSONParser {
  constructor() {
    this.parseAttempts = 0;
    this.successfulParsers = new Map();
  }

  /**
   * Main parsing method with multiple fallback strategies
   * @param {string} text - Raw text that may contain JSON
   * @param {Object} options - Parsing options
   * @returns {Object|null} Parsed JSON object or null if parsing fails
   */
  parse(text, options = {}) {
    const {
      expectedSchema = null,
      fallbackToPartial = true,
      logAttempts = true,
      requireCompleteObject = true,
    } = options;

    this.parseAttempts++;

    if (!text || typeof text !== 'string') {
      if (logAttempts) {
        console.log(
          chalk.yellow('⚠️ Invalid input: text must be a non-empty string')
        );
      }
      return null;
    }

    const cleanText = text.trim();
    if (cleanText.length === 0) {
      if (logAttempts) {
        console.log(chalk.yellow('⚠️ Empty text after trimming'));
      }
      return null;
    }

    // Strategy 1: Try native JSON.parse first (fastest for valid JSON)
    const nativeResult = this.tryNativeJSONParse(cleanText, logAttempts);
    if (nativeResult && this.validateResult(nativeResult, expectedSchema)) {
      this.recordSuccess('native');
      return nativeResult;
    }

    // Strategy 2: Extract JSON from markdown code blocks or mixed text
    const extractedResult = this.tryExtractFirstJSON(cleanText, logAttempts);
    if (
      extractedResult &&
      this.validateResult(extractedResult, expectedSchema)
    ) {
      this.recordSuccess('extract-first-json');
      return extractedResult;
    }

    // Strategy 3: Use dirty-json for malformed JSON
    const dirtyResult = this.tryDirtyJSON(cleanText, logAttempts);
    if (dirtyResult && this.validateResult(dirtyResult, expectedSchema)) {
      this.recordSuccess('dirty-json');
      return dirtyResult;
    }

    // Strategy 4: Use jsonic for relaxed JSON syntax
    const jsonicResult = this.tryJsonic(cleanText, logAttempts);
    if (jsonicResult && this.validateResult(jsonicResult, expectedSchema)) {
      this.recordSuccess('jsonic');
      return jsonicResult;
    }

    // Strategy 5: Use JSON5 for relaxed JSON with comments and trailing commas
    const json5Result = this.tryJSON5(cleanText, logAttempts);
    if (json5Result && this.validateResult(json5Result, expectedSchema)) {
      this.recordSuccess('json5');
      return json5Result;
    }

    // Strategy 6: Manual extraction with improved boundary detection
    const manualResult = this.tryManualExtraction(cleanText, logAttempts);
    if (manualResult && this.validateResult(manualResult, expectedSchema)) {
      this.recordSuccess('manual');
      return manualResult;
    }

    // Strategy 7: Regex-based partial extraction (if fallbackToPartial is true)
    if (fallbackToPartial) {
      const partialResult = this.tryPartialExtraction(
        cleanText,
        expectedSchema,
        logAttempts
      );
      if (partialResult) {
        this.recordSuccess('partial');
        return partialResult;
      }
    }

    if (logAttempts) {
      console.log(chalk.red('❌ All JSON parsing strategies failed'));
      console.log(
        chalk.gray(`Text preview: ${cleanText.substring(0, 200)}...`)
      );
    }

    return null;
  }

  /**
   * Strategy 1: Native JSON.parse
   */
  tryNativeJSONParse(text, logAttempts) {
    try {
      const result = JSON.parse(text);
      if (logAttempts) {
        console.log(chalk.green('✅ Native JSON.parse succeeded'));
      }
      return result;
    } catch (error) {
      if (logAttempts) {
        console.log(
          chalk.gray('⚠️ Native JSON.parse failed, trying alternatives...')
        );
      }
      return null;
    }
  }

  /**
   * Strategy 2: Extract first JSON from mixed text
   */
  tryExtractFirstJSON(text, logAttempts) {
    try {
      // Remove markdown code blocks first
      let cleanText = text.replace(/```json\s*|\s*```/g, '').trim();

      const result = extractJSON(cleanText);
      if (result && (typeof result === 'object' || Array.isArray(result))) {
        if (logAttempts) {
          console.log(chalk.green('✅ extract-first-json succeeded'));
        }
        return result;
      }
    } catch (error) {
      if (logAttempts) {
        console.log(
          chalk.gray('⚠️ extract-first-json failed, trying dirty-json...')
        );
      }
    }
    return null;
  }

  /**
   * Strategy 3: Dirty JSON for malformed JSON
   */
  tryDirtyJSON(text, logAttempts) {
    try {
      // Clean up common issues before passing to dirty-json
      let cleanText = text
        .replace(/```json\s*|\s*```/g, '') // Remove markdown
        .replace(/[\x00-\x1F\x7F-\x9F]/g, '') // Remove control characters
        .trim();

      // Look for JSON object boundaries
      const startIdx = cleanText.indexOf('{');
      const endIdx = cleanText.lastIndexOf('}');

      if (startIdx !== -1 && endIdx !== -1 && endIdx > startIdx) {
        cleanText = cleanText.substring(startIdx, endIdx + 1);
      }

      const result = dirtyJSON.parse(cleanText);
      if (result && typeof result === 'object') {
        if (logAttempts) {
          console.log(chalk.green('✅ dirty-json succeeded'));
        }
        return result;
      }
    } catch (error) {
      if (logAttempts) {
        console.log(chalk.gray('⚠️ dirty-json failed, trying jsonic...'));
      }
    }
    return null;
  }

  /**
   * Strategy 4: Jsonic for relaxed JSON syntax
   */
  tryJsonic(text, logAttempts) {
    try {
      // Clean up for jsonic
      let cleanText = text
        .replace(/```json\s*|\s*```/g, '')
        .replace(/[\x00-\x1F\x7F-\x9F]/g, '')
        .trim();

      // Look for JSON object boundaries
      const startIdx = cleanText.indexOf('{');
      const endIdx = cleanText.lastIndexOf('}');

      if (startIdx !== -1 && endIdx !== -1 && endIdx > startIdx) {
        cleanText = cleanText.substring(startIdx, endIdx + 1);
      }

      const result = jsonic(cleanText);
      if (result && typeof result === 'object') {
        if (logAttempts) {
          console.log(chalk.green('✅ jsonic succeeded'));
        }
        return result;
      }
    } catch (error) {
      if (logAttempts) {
        console.log(chalk.gray('⚠️ jsonic failed, trying JSON5...'));
      }
    }
    return null;
  }

  /**
   * Strategy 5: JSON5 for relaxed JSON syntax with comments and trailing commas
   */
  tryJSON5(text, logAttempts) {
    try {
      // Clean up for JSON5
      let cleanText = text
        .replace(/```json\s*|\s*```/g, '')
        .replace(/[\x00-\x1F\x7F-\x9F]/g, '')
        .trim();

      // Look for JSON object boundaries
      const startIdx = cleanText.indexOf('{');
      const endIdx = cleanText.lastIndexOf('}');

      if (startIdx !== -1 && endIdx !== -1 && endIdx > startIdx) {
        cleanText = cleanText.substring(startIdx, endIdx + 1);
      }

      const result = JSON5.parse(cleanText);
      if (result && typeof result === 'object') {
        if (logAttempts) {
          console.log(chalk.green('✅ JSON5 succeeded'));
        }
        return result;
      }
    } catch (error) {
      if (logAttempts) {
        console.log(chalk.gray('⚠️ JSON5 failed, trying manual extraction...'));
      }
    }
    return null;
  }

  /**
   * Strategy 5: Manual extraction with improved boundary detection
   */
  tryManualExtraction(text, logAttempts) {
    try {
      // Remove markdown code blocks
      let cleanText = text.replace(/```json\s*|\s*```/g, '').trim();

      // Find JSON object boundaries with proper brace counting
      const startIdx = cleanText.indexOf('{');
      if (startIdx === -1) return null;

      let braceCount = 0;
      let endIdx = -1;
      let inString = false;
      let escapeNext = false;

      for (let i = startIdx; i < cleanText.length; i++) {
        const char = cleanText[i];

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
          if (char === '{') {
            braceCount++;
          } else if (char === '}') {
            braceCount--;
            if (braceCount === 0) {
              endIdx = i;
              break;
            }
          }
        }
      }

      if (endIdx !== -1) {
        const jsonText = cleanText.substring(startIdx, endIdx + 1);

        // Apply minimal cleaning
        const cleaned = jsonText
          .replace(/,(\s*[}\]])/g, '$1') // Remove trailing commas
          .replace(/([{,]\s*)(\w+):/g, '$1"$2":') // Quote unquoted keys
          .replace(/:\s*'([^']*)'/g, ': "$1"'); // Convert single to double quotes

        const result = JSON.parse(cleaned);
        if (logAttempts) {
          console.log(chalk.green('✅ Manual extraction succeeded'));
        }
        return result;
      }
    } catch (error) {
      if (logAttempts) {
        console.log(
          chalk.gray(
            '⚠️ Manual extraction failed, trying partial extraction...'
          )
        );
      }
    }
    return null;
  }

  /**
   * Strategy 6: Partial extraction using regex patterns
   */
  tryPartialExtraction(text, expectedSchema, logAttempts) {
    if (!expectedSchema) return null;

    try {
      const result = {};
      let foundAnyField = false;

      // Extract boolean fields
      for (const [key, type] of Object.entries(expectedSchema)) {
        if (type === 'boolean') {
          const pattern = new RegExp(`"${key}"\\s*:\\s*(true|false)`, 'i');
          const match = text.match(pattern);
          if (match) {
            result[key] = match[1].toLowerCase() === 'true';
            foundAnyField = true;
          }
        } else if (type === 'number') {
          const pattern = new RegExp(`"${key}"\\s*:\\s*([0-9.-]+)`, 'i');
          const match = text.match(pattern);
          if (match) {
            result[key] = parseFloat(match[1]);
            foundAnyField = true;
          }
        } else if (type === 'string') {
          const pattern = new RegExp(`"${key}"\\s*:\\s*"([^"]*)"`, 'i');
          const match = text.match(pattern);
          if (match) {
            result[key] = match[1];
            foundAnyField = true;
          }
        }
      }

      if (foundAnyField) {
        if (logAttempts) {
          console.log(chalk.blue('🔧 Partial extraction succeeded'));
        }
        return result;
      }
    } catch (error) {
      if (logAttempts) {
        console.log(chalk.gray('⚠️ Partial extraction failed'));
      }
    }
    return null;
  }

  /**
   * Validate parsed result against expected schema
   */
  validateResult(result, expectedSchema) {
    if (!result || typeof result !== 'object') {
      return false;
    }

    if (!expectedSchema) {
      return true; // No schema to validate against
    }

    // Check if result has required fields with correct types
    for (const [key, expectedType] of Object.entries(expectedSchema)) {
      if (!(key in result)) {
        return false; // Missing required field
      }

      const actualType = typeof result[key];
      if (expectedType === 'boolean' && actualType !== 'boolean') {
        return false;
      }
      if (expectedType === 'number' && actualType !== 'number') {
        return false;
      }
      if (expectedType === 'string' && actualType !== 'string') {
        return false;
      }
    }

    return true;
  }

  /**
   * Record successful parsing strategy for analytics
   */
  recordSuccess(strategy) {
    const count = this.successfulParsers.get(strategy) || 0;
    this.successfulParsers.set(strategy, count + 1);
  }

  /**
   * Get parsing statistics
   */
  getStats() {
    return {
      totalAttempts: this.parseAttempts,
      successfulStrategies: Object.fromEntries(this.successfulParsers),
      mostSuccessfulStrategy: this.getMostSuccessfulStrategy(),
    };
  }

  /**
   * Get the most successful parsing strategy
   */
  getMostSuccessfulStrategy() {
    let maxCount = 0;
    let bestStrategy = 'none';

    for (const [strategy, count] of this.successfulParsers) {
      if (count > maxCount) {
        maxCount = count;
        bestStrategy = strategy;
      }
    }

    return { strategy: bestStrategy, count: maxCount };
  }

  /**
   * Reset statistics
   */
  resetStats() {
    this.parseAttempts = 0;
    this.successfulParsers.clear();
  }
}

// Convenience methods for common AIA use cases

/**
 * Parse agentic plan from AI response
 */
function parseAgenticPlan(response, logAttempts = true) {
  const parser = new RobustJSONParser();
  const expectedSchema = {
    steps: 'array',
  };

  return parser.parse(response, {
    expectedSchema,
    fallbackToPartial: true,
    logAttempts,
    requireCompleteObject: true,
  });
}

/**
 * Parse evaluation result from AI response
 */
function parseEvaluationResult(response, logAttempts = true) {
  const parser = new RobustJSONParser();
  const expectedSchema = {
    goalAchieved: 'boolean',
    progressMade: 'boolean',
    shouldContinue: 'boolean',
    progressScore: 'number',
  };

  return parser.parse(response, {
    expectedSchema,
    fallbackToPartial: true,
    logAttempts,
    requireCompleteObject: true,
  });
}

/**
 * Parse step verification from AI response
 */
function parseStepVerification(response, logAttempts = true) {
  const parser = new RobustJSONParser();
  const expectedSchema = {
    success: 'boolean',
    confidence: 'number',
    reason: 'string',
  };

  return parser.parse(response, {
    expectedSchema,
    fallbackToPartial: true,
    logAttempts,
    requireCompleteObject: true,
  });
}

/**
 * Parse recovery analysis from AI response
 */
function parseRecoveryAnalysis(response, logAttempts = true) {
  const parser = new RobustJSONParser();
  const expectedSchema = {
    canRecover: 'boolean',
    recoveryStrategy: 'string',
    modifiedApproach: 'string',
  };

  return parser.parse(response, {
    expectedSchema,
    fallbackToPartial: true,
    logAttempts,
    requireCompleteObject: true,
  });
}

/**
 * Parse recovery plan from AI response
 */
function parseRecoveryPlan(response, logAttempts = true) {
  const parser = new RobustJSONParser();
  const expectedSchema = {
    canRecover: 'boolean',
    recoveryActions: 'array',
    learnings: 'string',
  };

  return parser.parse(response, {
    expectedSchema,
    fallbackToPartial: true,
    logAttempts,
    requireCompleteObject: true,
  });
}

/**
 * Parse step validation from AI response
 */
function parseStepValidation(response, logAttempts = true) {
  const parser = new RobustJSONParser();
  const expectedSchema = {
    valid: 'boolean',
    confidence: 'number',
    message: 'string',
  };

  return parser.parse(response, {
    expectedSchema,
    fallbackToPartial: true,
    logAttempts,
    requireCompleteObject: true,
  });
}

module.exports = {
  RobustJSONParser,
  parseAgenticPlan,
  parseEvaluationResult,
  parseStepVerification,
  parseRecoveryAnalysis,
  parseRecoveryPlan,
  parseStepValidation,
};
