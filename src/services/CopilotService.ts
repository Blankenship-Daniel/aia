/**
 * CopilotService.ts - Implementation of GitHub Copilot CLI integration service.
 *
 * Responsibilities:
 * - Integrates with GitHub Copilot CLI for command explanations and suggestions.
 * - Provides intelligent caching of Copilot responses for performance.
 * - Implements context-aware query enhancement for better suggestions.
 * - Provides graceful fallback to AI service when Copilot is unavailable.
 *
 * Architecture:
 * - Implements ICopilotService following SOLID principles and DI patterns.
 * - Uses existing AIA caching and configuration services.
 * - Provides structured parsing of Copilot CLI output.
 * - Integrates with AIA's error handling and logging systems.
 *
 * @see ICopilotService - Interface definition for this service.
 * @see ICopilotDependencyService - Dependency checking service.
 * @see IConfigurationService - Configuration management.
 * @see ICachingService - Caching service for performance optimization.
 */

import { exec, spawn } from 'child_process';
import { promisify } from 'util';
// @ts-ignore - chalk may not have types available
const { Chalk } = require('chalk');
// Instantiate Chalk for color methods in CommonJS context
const chalk = new Chalk({ level: 3 });
import {
  ICopilotService,
  ExplanationResult,
  SuggestionResult,
  CommandContext,
  CopilotOptions,
  CommandComponent,
} from '../interfaces/ICopilotService';
import { IConfigurationService } from '../interfaces/IConfigurationService';
import { ICachingService } from '../interfaces/ICachingService';
import { IAIService } from '../interfaces/IAIService';
import { ICopilotDependencyService } from '../interfaces/ICopilotDependencyService';

/**
 * CopilotService class
 * 
 * TODO: Add class description
 */
export class CopilotService implements ICopilotService {
  private execAsync = promisify(exec);
  private readonly TIMEOUT_MS = 8000; // 8 seconds for operations
  private readonly INTERACTIVE_TIMEOUT_MS = 6000; // 6 seconds for interactive automation
  private isAvailableCache: boolean | null = null;
  private lastAvailabilityCheck = 0;
  private readonly AVAILABILITY_CACHE_TTL = 60000; // 1 minute instead of 5 minutes

  constructor(
    private configService: IConfigurationService,
    private cacheService: ICachingService,
    private aiService: IAIService,
    private dependencyService: ICopilotDependencyService
  ) {}

  /**
   * Explains a command using GitHub Copilot CLI with caching.
   */
  async explain(
    command: string,
    options?: CopilotOptions
  ): Promise<ExplanationResult> {
    const cacheKey = `copilot:explain:${command}`;
    const cacheTTL = options?.cacheTTL || 3600000; // 1 hour default

    try {
      // Check cache first
      const cached = await this.cacheService.get<ExplanationResult>(cacheKey);
      if (cached) {
        return cached;
      }

      // Check if Copilot is available
      if (!(await this.isAvailable())) {
        if (options?.useAIFallback !== false) {
          console.log(
            chalk.yellow('GitHub Copilot CLI not available, using AI fallback')
          );
          return await this.aiExplainFallback(command);
        }
        throw new Error('GitHub Copilot CLI is not available');
      }

      // Try multiple methods for getting explanation
      let result: ExplanationResult | null = null;

      try {
        // Method 1: Try direct interactive automation
        result = await this.executeInteractiveCopilotExplain(command);
      } catch (error) {
        console.log(
          chalk.yellow(
            `Direct Copilot explain failed: ${
              error instanceof Error ? error.message : error
            }`
          )
        );
        if (options?.useAIFallback !== false) {
          console.log(chalk.yellow('Using AI fallback for explain'));
          result = await this.aiExplainFallback(command);
        }
      }

      if (!result) {
        throw new Error('All explanation methods failed');
      }

      // Cache the result
      await this.cacheService.set(cacheKey, result, { ttl: cacheTTL });

      return result;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);

      // Try AI fallback on error if enabled
      if (
        options?.useAIFallback !== false &&
        this.shouldFallbackToAI(errorMessage)
      ) {
        console.log(chalk.yellow('Copilot failed, using AI fallback'));
        return await this.aiExplainFallback(command);
      }

      throw new Error(`Failed to explain command: ${errorMessage}`);
    }
  }

  /**
   * Suggests commands based on natural language query with context awareness.
   */
  async suggest(
    query: string,
    context?: CommandContext,
    options?: CopilotOptions
  ): Promise<SuggestionResult[]> {
    const maxSuggestions = options?.maxSuggestions || 5;
    const enhancedQuery = this.enhanceQueryWithContext(query, context, options);
    const cacheKey = `copilot:suggest:${this.hashQuery(enhancedQuery)}`;
    const cacheTTL = options?.cacheTTL || 1800000; // 30 minutes default

    try {
      // Check cache first
      const cached = await this.cacheService.get<SuggestionResult[]>(cacheKey);
      if (cached) {
        return cached.slice(0, maxSuggestions);
      }

      // Check if Copilot is available
      if (!(await this.isAvailable())) {
        if (options?.useAIFallback !== false) {
          console.log(
            chalk.yellow('GitHub Copilot CLI not available, using AI fallback')
          );
          return await this.aiSuggestFallback(query, context, options);
        }
        throw new Error('GitHub Copilot CLI is not available');
      }

      // Try multiple methods for getting suggestions
      let suggestions: SuggestionResult[] = [];

      try {
        // Method 1: Try interactive automation
        // Remove this console.log - no need to show technical details to users
        suggestions = await this.executeCopilotSuggest(enhancedQuery);
        console.log(chalk.green('✓ Copilot suggest successful'));
      } catch (error) {
        // Hide technical details from users
        if (options?.useAIFallback !== false) {
          // Remove console.log here - no need to show fallback message
          suggestions = await this.aiSuggestFallback(query, context, options);
        }
      }

      if (suggestions.length === 0) {
        throw new Error('No suggestions received from any method');
      }

      // Apply safety checks if enabled
      const filteredSuggestions =
        options?.safetyCheck !== false
          ? await this.applySafetyChecks(suggestions)
          : suggestions;

      // Limit results
      const limitedResults = filteredSuggestions.slice(0, maxSuggestions);

      // Cache the result
      await this.cacheService.set(cacheKey, limitedResults, { ttl: cacheTTL });

      return limitedResults;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);

      // Try AI fallback on error if enabled
      if (
        options?.useAIFallback !== false &&
        this.shouldFallbackToAI(errorMessage)
      ) {
        console.log(chalk.yellow('Copilot failed, using AI fallback'));
        return await this.aiSuggestFallback(query, context, options);
      }

      throw new Error(`Failed to get suggestions: ${errorMessage}`);
    }
  }

  /**
   * Creates a shell alias using GitHub Copilot CLI.
   */
  async createAlias(name: string, command: string): Promise<void> {
    try {
      if (!(await this.isAvailable())) {
        throw new Error('GitHub Copilot CLI is not available');
      }

      await this.execAsync(`gh copilot alias ${name} "${command}"`, {
        timeout: this.TIMEOUT_MS,
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to create alias: ${errorMessage}`);
    }
  }

  /**
   * Checks if GitHub Copilot CLI is available with caching.
   */
  async isAvailable(): Promise<boolean> {
    const now = Date.now();

    // Use cached result if recent
    if (
      this.isAvailableCache !== null &&
      now - this.lastAvailabilityCheck < this.AVAILABILITY_CACHE_TTL
    ) {
      return this.isAvailableCache;
    }

    try {
      const status = await this.dependencyService.checkDependencies();
      this.isAvailableCache =
        status.gh &&
        status.copilot &&
        status.authenticated &&
        status.copilotAccess;
      this.lastAvailabilityCheck = now;

      // Log cache update for debugging
      if (!this.isAvailableCache && status.errors && status.errors.length > 0) {
        console.log(
          chalk.gray(
            `Copilot availability cached as false: ${status.errors.join(', ')}`
          )
        );
      }

      return this.isAvailableCache;
    } catch (error) {
      this.isAvailableCache = false;
      this.lastAvailabilityCheck = now;
      console.log(
        chalk.gray(
          `Copilot availability check failed: ${
            error instanceof Error ? error.message : error
          }`
        )
      );
      return false;
    }
  }

  /**
   * Gets the current status of the Copilot service.
   */
  async getStatus(): Promise<{
    available: boolean;
    version?: string;
    authenticated: boolean;
    lastCheck: Date;
  }> {
    const status = await this.dependencyService.checkDependencies();
    let version: string | undefined;

    if (status.gh) {
      try {
        const { stdout } = await this.execAsync('gh --version', {
          timeout: 5000,
        });
        const versionMatch = stdout.match(/gh version ([\\d.]+)/);
        version = versionMatch ? versionMatch[1] : undefined;
      } catch (error) {
        // Version not available
      }
    }

    return {
      available:
        status.gh &&
        status.copilot &&
        status.authenticated &&
        status.copilotAccess,
      version,
      authenticated: status.authenticated,
      lastCheck: new Date(),
    };
  }

  /**
   * Clears cached explanations and suggestions.
   */
  async clearCache(pattern?: string): Promise<number> {
    const cachePattern = pattern || 'copilot:*';
    return await this.cacheService.deletePattern(cachePattern);
  }

  /**
   * Clears the availability cache to force a fresh dependency check.
   */
  clearAvailabilityCache(): void {
    this.isAvailableCache = null;
    this.lastAvailabilityCheck = 0;
  }

  /**
   * Private helper methods
   */

  private async executeCopilotExplain(
    command: string
  ): Promise<ExplanationResult> {
    try {
      // For explain command, try to extract from stderr/stdout without interaction
      const { stdout, stderr } = await this.execAsync(
        `echo "The command '${command}' is a shell command" | gh copilot explain "${command}" 2>&1 | head -50`,
        {
          timeout: 5000, // Shorter timeout for non-interactive attempt
          encoding: 'utf8',
        }
      );

      // If we get useful output, parse it
      const output = stdout + stderr;
      if (
        output &&
        !output.toLowerCase().includes('waiting for') &&
        output.length > 50
      ) {
        return this.parseExplanation(command, output);
      }

      // Fall back to interactive automation
      return await this.executeInteractiveCopilotExplain(command);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      throw new Error(`Copilot explain failed: ${errorMessage}`);
    }
  }

  private async executeInteractiveCopilotExplain(
    command: string
  ): Promise<ExplanationResult> {
    return new Promise((resolve, reject) => {
      const child = spawn('gh', ['copilot', 'explain', command], {
        stdio: ['pipe', 'pipe', 'pipe'],
      });

      let output = '';
      let error = '';
      let hasFoundExplanation = false;
      let hasUsefulContent = false;
      let settled = false; // Prevent multiple resolve/reject calls

      const timer = setTimeout(() => {
        if (settled) return;
        settled = true;
        child.kill();
        if (hasUsefulContent) {
          resolve(this.parseExplanation(command, output));
        } else {
          reject(
            new Error('Unable to get explanation quickly, using fallback')
          );
        }
      }, this.INTERACTIVE_TIMEOUT_MS);

      child.stdout.on('data', (data) => {
        const text = data.toString();
        output += text;

        // Check for explanation content
        if (
          text.length > 20 &&
          (text.includes('This command') ||
            text.includes('explanation') ||
            text.includes('The command') ||
            text.includes(command) ||
            text.includes('performs') ||
            text.includes('used to'))
        ) {
          hasUsefulContent = true;
        }

        // Auto-respond to interactive prompts
        if (text.includes('Select an option') && !hasFoundExplanation) {
          // Send "Explain command" option (usually option 2)
          child.stdin.write('\u001b[B\n'); // Arrow down and enter
          hasFoundExplanation = true;
        } else if (
          (text.includes('? ') ||
            text.includes('Continue') ||
            text.includes('Press')) &&
          hasUsefulContent
        ) {
          // Exit after getting explanation
          child.stdin.write('q\n'); // Quit
          if (!settled) {
            settled = true;
            clearTimeout(timer);
            child.kill();
            resolve(this.parseExplanation(command, output));
          }
        }

        // Check for network errors
        if (
          text.includes('context deadline exceeded') ||
          text.includes('network error') ||
          text.includes('failed to create thread')
        ) {
          if (!settled) {
            settled = true;
            clearTimeout(timer);
            child.kill();
            reject(new Error('Network error with Copilot CLI'));
          }
        }
      });

      child.stderr.on('data', (data) => {
        const errorText = data.toString();
        error += errorText;

        // Check for network errors in stderr too
        if (
          errorText.includes('context deadline exceeded') ||
          errorText.includes('network error') ||
          errorText.includes('failed to create thread')
        ) {
          if (!settled) {
            settled = true;
            clearTimeout(timer);
            child.kill();
            reject(new Error('Network error with Copilot CLI'));
          }
        }
      });

      child.on('close', (code) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        if (hasUsefulContent || output.length > 50) {
          resolve(this.parseExplanation(command, output));
        } else {
          reject(
            new Error(
              `No useful explanation received. Error: ${error}, Output length: ${output.length}`
            )
          );
        }
      });

      child.on('error', (err) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        reject(err);
      });
    });
  }

  private async executeCopilotSuggest(
    query: string
  ): Promise<SuggestionResult[]> {
    try {
      // Determine target type based on query content
      const target = this.detectTargetType(query);

      // Try automated interactive suggestion
      return await this.executeInteractiveCopilotSuggest(query, target);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      throw new Error(`Copilot suggest failed: ${errorMessage}`);
    }
  }

  private async executeInteractiveCopilotSuggest(
    query: string,
    target: 'shell' | 'git' | 'gh'
  ): Promise<SuggestionResult[]> {
    return new Promise((resolve, reject) => {
      const child = spawn('gh', ['copilot', 'suggest', '-t', target, query], {
        stdio: ['pipe', 'pipe', 'pipe'],
      });

      let output = '';
      let error = '';
      let suggestionFound = false;
      let suggestionText = '';
      let settled = false; // Prevent multiple resolve/reject calls

      const timer = setTimeout(() => {
        if (settled) return;
        settled = true;
        child.kill();
        if (suggestionText) {
          resolve([
            {
              command: suggestionText,
              description: `Suggested command for: ${query}`,
              confidence: 0.8,
              tags: [target, 'copilot'],
              safetyLevel: this.assessSafetyLevel(suggestionText),
              requiresConfirmation:
                this.assessSafetyLevel(suggestionText) !== 'safe',
            },
          ]);
        } else {
          reject(
            new Error('Unable to get suggestions quickly, using fallback')
          );
        }
      }, this.INTERACTIVE_TIMEOUT_MS);

      child.stdout.on('data', (data) => {
        const text = data.toString();
        output += text;

        // Look for suggestion in output - be more flexible
        if (
          (text.includes('Suggestion:') ||
            text.includes('find ') ||
            text.includes('$')) &&
          !suggestionFound
        ) {
          // Extract the suggestion from the formatted output
          const lines = text.split('\n');
          for (const line of lines) {
            const trimmed = line.trim();
            if (
              trimmed &&
              !trimmed.includes('Suggestion:') &&
              !trimmed.includes('─') &&
              !trimmed.includes('⣾') &&
              !trimmed.includes('Welcome') &&
              !trimmed.includes('powered by') &&
              !trimmed.startsWith('?') &&
              trimmed.length > 5 &&
              trimmed.length < 200 &&
              (trimmed.includes('find') ||
                trimmed.includes('ls') ||
                trimmed.includes('grep') ||
                trimmed.startsWith('$') ||
                this.looksLikeCommand(trimmed))
            ) {
              suggestionText = trimmed.replace(/^\$\s*/, ''); // Remove $ prefix
              suggestionFound = true;
              break;
            }
          }
        }

        // Auto-respond to selection menu
        if (text.includes('Select an option') && suggestionFound) {
          // Choose "Copy command to clipboard" (first option)
          child.stdin.write('\n'); // Enter to select first option
        } else if (
          text.includes('Command copied to clipboard') ||
          text.includes('copied to clipboard')
        ) {
          // Exit after copying
          if (!settled) {
            settled = true;
            clearTimeout(timer);
            child.kill();
            resolve([
              {
                command: suggestionText,
                description: `Suggested command for: ${query}`,
                confidence: 0.9,
                tags: [target, 'copilot'],
                safetyLevel: this.assessSafetyLevel(suggestionText),
                requiresConfirmation:
                  this.assessSafetyLevel(suggestionText) !== 'safe',
              },
            ]);
          }
        } else if (text.includes('What would you like to do')) {
          // Exit immediately if asked for more actions
          child.stdin.write('q\n');
        }

        // Check for network errors
        if (
          text.includes('context deadline exceeded') ||
          text.includes('network error') ||
          text.includes('failed to create thread')
        ) {
          if (!settled) {
            settled = true;
            clearTimeout(timer);
            child.kill();
            reject(new Error('Network error with Copilot CLI'));
          }
        }
      });

      child.stderr.on('data', (data) => {
        const errorText = data.toString();
        error += errorText;

        // Check for network errors in stderr too
        if (
          errorText.includes('context deadline exceeded') ||
          errorText.includes('network error') ||
          errorText.includes('failed to create thread')
        ) {
          if (!settled) {
            settled = true;
            clearTimeout(timer);
            child.kill();
            reject(new Error('Network error with Copilot CLI'));
          }
        }
      });

      child.on('close', (code) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        if (suggestionText) {
          resolve([
            {
              command: suggestionText,
              description: `Suggested command for: ${query}`,
              confidence: 0.9,
              tags: [target, 'copilot'],
              safetyLevel: this.assessSafetyLevel(suggestionText),
              requiresConfirmation:
                this.assessSafetyLevel(suggestionText) !== 'safe',
            },
          ]);
        } else {
          reject(
            new Error(
              `No suggestion found. Error: ${error}, Output: ${output.substring(
                0,
                200
              )}`
            )
          );
        }
      });

      child.on('error', (err) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        reject(err);
      });
    });
  }

  /**
   * Handles extractSuggestionFromStdout operation
   * 
   * @param stdout - Parameter description
   * 
   * @returns string - Return value description
   */
  private extractSuggestionFromStdout(stdout: string): string {
    // Extract command suggestion from stdout as fallback
    const lines = stdout.split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      if (
        trimmed &&
        !trimmed.startsWith('Welcome') &&
        !trimmed.startsWith("I'm powered") &&
        !trimmed.startsWith('⣾') &&
        !trimmed.includes('Waiting for')
      ) {
        return trimmed;
      }
    }
    return 'npm install'; // Safe fallback
  }

  /**
   * Handles detectTargetType operation
   * 
   * @param query - Parameter description
   * 
   * @returns 'shell' | 'git' | 'gh' - Return value description
   */
  private detectTargetType(query: string): 'shell' | 'git' | 'gh' {
    const lowerQuery = query.toLowerCase();

    if (
      lowerQuery.includes('git ') ||
      lowerQuery.includes('branch') ||
      lowerQuery.includes('commit') ||
      lowerQuery.includes('merge') ||
      lowerQuery.includes('pull') ||
      lowerQuery.includes('push')
    ) {
      return 'git';
    }

    if (
      lowerQuery.includes('gh ') ||
      lowerQuery.includes('github') ||
      lowerQuery.includes('pull request') ||
      lowerQuery.includes('pr ') ||
      lowerQuery.includes('issue')
    ) {
      return 'gh';
    }

    return 'shell';
  }

  /**
   * Parses explanation
   * 
   * @param command - Parameter description
   * @param output - Parameter description
   * 
   * @returns ExplanationResult - Return value description
   */
  private parseExplanation(command: string, output: string): ExplanationResult {
    // Parse the copilot output into structured format
    const lines = output.split('\n').filter((line) => line.trim());
    let explanation = '';
    const components: CommandComponent[] = [];
    const examples: string[] = [];
    const warnings: string[] = [];

    let foundExplanation = false;

    for (const line of lines) {
      const trimmedLine = line.trim();

      // Look for explanation content after "Explanation:" header
      if (trimmedLine.includes('Explanation:')) {
        foundExplanation = true;
        continue;
      }

      // If we found the explanation section, collect the content
      if (foundExplanation && trimmedLine) {
        // Skip formatting lines like "────" or spinner characters
        if (
          !trimmedLine.includes('─') &&
          !trimmedLine.includes('⣾') &&
          !trimmedLine.includes('Waiting for') &&
          !trimmedLine.includes('Welcome') &&
          !trimmedLine.includes('powered by')
        ) {
          // Clean up bullet points and add to explanation
          const cleanLine = trimmedLine
            .replace(/^•\s*/, '') // Remove bullet points
            .replace(/^\*\s*/, '') // Remove asterisks
            .replace(/^-\s*/, ''); // Remove dashes

          if (cleanLine) {
            explanation += (explanation ? ' ' : '') + cleanLine;
          }
        }
      }

      // Look for examples
      if (trimmedLine.startsWith('$') || trimmedLine.includes(command)) {
        examples.push(trimmedLine);
      }

      // Look for warnings
      if (trimmedLine.includes('Warning') || trimmedLine.includes('Caution')) {
        warnings.push(trimmedLine);
      }

      // Parse individual components (flags)
      if (trimmedLine.includes('-') || trimmedLine.includes('--')) {
        const flagMatch = trimmedLine.match(/(--?\w+)\s*(.+)/);
        if (flagMatch) {
          components.push({
            part: flagMatch[1],
            description: flagMatch[2],
          });
        }
      }
    }

    return {
      command,
      explanation: explanation || 'Command explanation from GitHub Copilot',
      components,
      examples,
      warnings: warnings.length > 0 ? warnings : undefined,
      confidence: 0.9, // High confidence for Copilot results
    };
  }

  /**
   * Parses suggestions
   * 
   * @param output - Parameter description
   * 
   * @returns SuggestionResult[] - Return value description
   */
  private parseSuggestions(output: string): SuggestionResult[] {
    const suggestions: SuggestionResult[] = [];
    const lines = output.split('\n').filter((line) => line.trim());

    for (const line of lines) {
      const trimmedLine = line.trim();

      // Look for command suggestions (usually start with $ or contain common commands)
      if (trimmedLine.startsWith('$') || this.looksLikeCommand(trimmedLine)) {
        const command = trimmedLine.replace(/^\$\s*/, '').trim();
        if (command) {
          suggestions.push({
            command,
            description: `Command suggestion from GitHub Copilot`,
            confidence: 0.8,
            tags: this.extractCommandTags(command),
            safetyLevel: this.assessSafetyLevel(command),
          });
        }
      }
    }

    return suggestions;
  }

  private enhanceQueryWithContext(
    query: string,
    context?: CommandContext,
    options?: CopilotOptions
  ): string {
    if (!context || options?.includeContext === false) {
      return query;
    }

    let enhancedQuery = query;

    // Add project context only if relevant
    if (context.projectType && !query.toLowerCase().includes('project')) {
      enhancedQuery += ` in ${context.projectType}`;
    }

    return enhancedQuery;
  }

  private async applySafetyChecks(
    suggestions: SuggestionResult[]
  ): Promise<SuggestionResult[]> {
    return suggestions.map((suggestion) => {
      const safetyLevel = this.assessSafetyLevel(suggestion.command);
      return {
        ...suggestion,
        safetyLevel,
        requiresConfirmation: safetyLevel !== 'safe',
      };
    });
  }

  /**
   * Handles assessSafetyLevel operation
   * 
   * @param command - Parameter description
   * 
   * @returns 'safe' | 'caution' | 'dangerous' - Return value description
   */
  private assessSafetyLevel(command: string): 'safe' | 'caution' | 'dangerous' {
    const dangerousPatterns = [
      /rm\\s+-rf/,
      /sudo\\s+rm/,
      />/,
      /dd\\s+if=/,
      /mkfs/,
      /format/,
      /del\\s+/,
    ];

    const cautionPatterns = [
      /sudo/,
      /chmod/,
      /chown/,
      /mv\\s+.*\\s+\\/,
      /cp\\s+.*\\s+\\/,
    ];

    if (dangerousPatterns.some((pattern) => pattern.test(command))) {
      return 'dangerous';
    }

    if (cautionPatterns.some((pattern) => pattern.test(command))) {
      return 'caution';
    }

    return 'safe';
  }

  /**
   * Handles extractCommandTags operation
   * 
   * @param command - Parameter description
   * 
   * @returns string[] - Return value description
   */
  private extractCommandTags(command: string): string[] {
    const tags: string[] = [];

    if (command.includes('git')) tags.push('git');
    if (command.includes('docker')) tags.push('docker');
    if (command.includes('npm') || command.includes('yarn'))
      tags.push('nodejs');
    if (command.includes('python') || command.includes('pip'))
      tags.push('python');
    if (command.includes('find')) tags.push('filesystem');
    if (command.includes('grep')) tags.push('search');
    if (command.includes('sed') || command.includes('awk'))
      tags.push('text-processing');

    return tags;
  }

  /**
   * Handles looksLikeCommand operation
   * 
   * @param line - Parameter description
   * 
   * @returns boolean - Return value description
   */
  private looksLikeCommand(line: string): boolean {
    // Basic heuristics to identify command lines
    const commandPatterns = [
      /^\\w+\\s+/, // starts with a word followed by space
      /\\|/, // contains pipes
      /&&/, // contains command chaining
      /^(ls|cd|mkdir|cp|mv|rm|find|grep|sed|awk|git|docker|npm|yarn|python|pip)\\b/,
    ];

    return commandPatterns.some((pattern) => pattern.test(line));
  }

  /**
   * Handles shouldFallbackToAI operation
   * 
   * @param errorMessage - Parameter description
   * 
   * @returns boolean - Return value description
   */
  private shouldFallbackToAI(errorMessage: string): boolean {
    // Determine if we should fall back to AI based on the error
    const fallbackErrors = [
      'not found',
      'not installed',
      'permission denied',
      'network error',
      'timeout',
      'timed out',
      'ENOENT',
      'context deadline exceeded',
      'failed to create thread',
      'connection refused',
      'network is unreachable',
      'no such host',
      'temporary failure',
    ];

    return fallbackErrors.some((error) =>
      errorMessage.toLowerCase().includes(error.toLowerCase())
    );
  }

  /**
   * Handles hashQuery operation
   * 
   * @param query - Parameter description
   * 
   * @returns string - Return value description
   */
  private hashQuery(query: string): string {
    // Simple hash for cache keys
    let hash = 0;
    for (let i = 0; i < query.length; i++) {
      const char = query.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(36);
  }

  /**
   * AI Fallback methods
   */

  private async aiExplainFallback(command: string): Promise<ExplanationResult> {
    const prompt = `Explain this command in detail, including what it does, its components, and any warnings: ${command}`;
    const context = this.createBasicContext();
    const aiResponse = await this.aiService.queryAI(prompt, context);

    return {
      command,
      explanation: aiResponse.content || 'Unable to explain this command',
      components: [], // AI fallback doesn't parse components
      confidence: 0.7, // Lower confidence for AI fallback
    };
  }

  private async aiSuggestFallback(
    query: string,
    context?: CommandContext,
    options?: CopilotOptions
  ): Promise<SuggestionResult[]> {
    const contextInfo = context
      ? `Context: Working directory: ${
          context.workingDirectory
        }, Project type: ${context.projectType || 'unknown'}`
      : '';

    const prompt = `Suggest shell commands for: ${query}. ${contextInfo}. Provide 3-5 specific, executable commands.`;
    const aiContext = this.createBasicContext(context?.workingDirectory);
    const aiResponse = await this.aiService.queryAI(prompt, aiContext);

    // Parse AI response into suggestions (simplified)
    const lines = aiResponse.content
      .split('\\n')
      .filter((line: string) => line.trim());
    const suggestions: SuggestionResult[] = [];

    for (const line of lines) {
      if (this.looksLikeCommand(line)) {
        const command = line
          .replace(/^\\d+\\.\\s*/, '')
          .replace(/^\\$\\s*/, '')
          .trim();
        if (command) {
          suggestions.push({
            command,
            description: 'AI-generated suggestion',
            confidence: 0.6, // Lower confidence for AI fallback
            tags: this.extractCommandTags(command),
            safetyLevel: this.assessSafetyLevel(command),
          });
        }
      }
    }

    return suggestions.slice(0, options?.maxSuggestions || 5);
  }

  /**
   * Creates basiccontext
   * 
   * @param workingDirectory? - Parameter description
   */
  private createBasicContext(workingDirectory?: string) {
    return {
      workingDirectory: workingDirectory || process.cwd(),
      platform: process.platform,
      arch: process.arch,
      nodeVersion: process.version,
      user: process.env.USER || process.env.USERNAME || 'unknown',
      shell: process.env.SHELL || 'unknown',
      timestamp: new Date().toISOString(),
      projectType: 'unknown',
      projectInfo: {},
      gitStatus: 'unknown',
      environmentScore: 1.0,
    };
  }
}
