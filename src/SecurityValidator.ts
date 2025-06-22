// @ts-ignore - chalk may not have types available
const { Chalk } = require('chalk');
// Instantiate Chalk for color methods in CommonJS context
const chalk = new Chalk({ level: 3 });
import path from 'path';
import crypto from 'crypto';
import axios from 'axios';
import {
  IAISecurityAnalyzer,
  SecurityContext,
  AISecurityAnalysis,
} from './interfaces/IAISecurityAnalyzer';

interface SecurityPattern {
  pattern: RegExp;
  severity: 'low' | 'medium' | 'high';
  description: string;
  action: 'warn' | 'block';
  skipForSafeCommands?: boolean;
}

interface SecurityRule {
  name: string;
  pattern: RegExp;
  severity: 'low' | 'medium' | 'high';
  description: string;
  action: 'warn' | 'block';
}

interface ValidationResult {
  allowed: boolean;
  warnings: string[];
  blocked: boolean;
  reason: string | null;
  sanitized: string;
  safe: boolean;
}

interface SecurityMetrics {
  blockedCommands: number;
  warningsIssued: number;
  sanitizedInputs: number;
  blockedPaths: number;
  rateLimit: {
    violations: number;
    allowed: number;
    blocked: number;
  };
}

interface RateLimit {
  limit: number;
  windowMs: number;
  requests: number[];
}

interface CommandContext {
  workingDirectory?: string;
  user?: string;
  environment?: Record<string, string>;
  projectType?: string;
}

interface EnhancedValidationResult extends ValidationResult {
  aiAnalysis?: AISecurityAnalysis;
  usedAIAnalysis?: boolean;
}

/**
 * SecurityValidator class
 * 
 * TODO: Add class description
 */
class SecurityValidator {
  private securityPatterns: Map<string, SecurityPattern>;
  private customRules: Map<string, SecurityRule>;
  private rateLimits: Map<string, RateLimit>;
  private requestCounts: Map<string, number[]>;
  private metrics: SecurityMetrics;
  private safeDiscoveryPatterns: RegExp[];
  private aiSecurityAnalyzer?: IAISecurityAnalyzer;

  /**
   * Creates an instance of the class
   * 
   * @param aiSecurityAnalyzer? - Parameter description
   */
  constructor(aiSecurityAnalyzer?: IAISecurityAnalyzer) {
    this.securityPatterns = new Map();
    this.customRules = new Map();
    this.rateLimits = new Map();
    this.requestCounts = new Map();
    this.aiSecurityAnalyzer = aiSecurityAnalyzer;
    this.metrics = {
      blockedCommands: 0,
      warningsIssued: 0,
      sanitizedInputs: 0,
      blockedPaths: 0,
      rateLimit: {
        violations: 0,
        allowed: 0,
        blocked: 0,
      },
    };

    this.safeDiscoveryPatterns = [];
    this.initializeSecurityPatterns();
  }

  /**
   * Initializes securitypatterns
   */
  private initializeSecurityPatterns(): void {
    // Whitelist of safe discovery commands that can contain special characters
    this.safeDiscoveryPatterns = [
      /^pwd\s*&&\s*ls\s+-la$/,
      /^find\s+\.\s+-maxdepth\s+\d+\s+-type\s+f.*$/,
      /^find\s+\.\s+-name\s+['"].*['"].*-type\s+f.*$/,
      /^find\s+\.\s+-name\s+['"].*['"].*-not\s+-path.*$/,
      /^echo\s+['"'][^'"]*['"].*&&.*ls.*$/,
      /^echo\s+['"'][^'"]*['"].*&&.*find.*$/,
      /^cat\s+package\.json\s+2>\/dev\/null.*$/,
      /^git\s+(status|branch|log).*2>\/dev\/null.*$/,
      /^ls\s+(node_modules\s+2>\/dev\/null.*|\s*|\-\w+)$/,
      /^echo\s+".*"$/,
      /^ps\s+aux\s+\|\s+grep.*$/,
      /^free\s+-h\s+2>\/dev\/null.*$/,
      /^df\s+-h\s+\.\s+2>\/dev\/null.*$/,
      /^docker\s+ps.*2>\/dev\/null.*$/,
      /^pip\s+list.*2>\/dev\/null.*$/,
      /^npm\s+list.*2>\/dev\/null.*$/,
      /^grep\s+-r.*--include.*$/,
      /^find\s+\.\s+-name.*\-exec.*$/,
      /^find\s+\.\/?src\s+-name\s+['"]?\*\.js['"]?\s+-type\s+f.*$/,
      /^find\s+\.\s+-name\s+['"]?\*\.js['"]?\s+-type\s+f.*$/,
      /^ls\s+-la?\s+src\/?.*$/,
    ];

    // Initialize dangerous command patterns
    this.securityPatterns.set('command_injection', {
      pattern: /[;&|`$()\[\]{}]/,
      severity: 'high',
      description: 'Potential command injection detected',
      action: 'warn',
      skipForSafeCommands: true,
    });

    this.securityPatterns.set('file_manipulation', {
      pattern: /rm\s+-rf\s+\/|rm\s+-rf\s+\*|>\s*\/dev\/(sda|hda)/,
      severity: 'high',
      description: 'Dangerous file manipulation command detected',
      action: 'block',
    });

    this.securityPatterns.set('network_commands', {
      pattern: /curl\s+.*\|\s*(sh|bash)|wget\s+.*\|\s*(sh|bash)/,
      severity: 'high',
      description: 'Remote code execution attempt detected',
      action: 'block',
    });

    this.securityPatterns.set('privilege_escalation', {
      pattern: /sudo\s+su|sudo\s+-i|sudo\s+bash|sudo\s+sh|chmod\s+777/,
      severity: 'medium',
      description: 'Privilege escalation attempt detected',
      action: 'warn',
    });

    this.securityPatterns.set('system_modification', {
      pattern: /\/etc\/passwd|\/etc\/shadow|crontab\s+-e|systemctl\s+disable/,
      severity: 'high',
      description: 'System configuration modification detected',
      action: 'block',
    });

    this.securityPatterns.set('data_exfiltration', {
      pattern: /scp\s+.*@|rsync\s+.*@|ftp\s+.*|sftp\s+.*/,
      severity: 'medium',
      description: 'Potential data transfer command detected',
      action: 'warn',
    });
  }

  /**
   * Validates command
   * 
   * @param command - Parameter description
   * 
   * @returns ValidationResult - Return value description
   */
  public validateCommand(command: string): ValidationResult {
    const result: ValidationResult = {
      allowed: true,
      warnings: [],
      blocked: false,
      reason: null,
      sanitized: command,
      safe: true,
    };

    if (!command || typeof command !== 'string') {
      result.allowed = false;
      result.blocked = true;
      result.safe = false;
      result.reason = 'Invalid command format';
      result.warnings.push('Invalid command format');
      this.metrics.blockedCommands++;
      return result;
    }

    // Check if command is in safe discovery whitelist
    const isSafeDiscoveryCommand = this.safeDiscoveryPatterns.some((pattern) =>
      pattern.test(command.trim())
    );

    // Check against security patterns
    for (const [name, pattern] of this.securityPatterns) {
      if (pattern.pattern.test(command)) {
        // Skip certain patterns for safe discovery commands
        if (isSafeDiscoveryCommand && pattern.skipForSafeCommands) {
          continue;
        }

        if (pattern.action === 'block') {
          result.allowed = false;
          result.blocked = true;
          result.safe = false;
          result.reason = pattern.description;
          result.warnings.push(pattern.description);
          this.metrics.blockedCommands++;
          break;
        } else if (pattern.action === 'warn') {
          result.warnings.push(pattern.description);
          this.metrics.warningsIssued++;
        }
      }
    }

    // Check custom rules
    for (const [name, rule] of this.customRules) {
      if (rule.pattern.test(command)) {
        if (rule.action === 'block') {
          result.allowed = false;
          result.blocked = true;
          result.safe = false;
          result.reason = rule.description;
          result.warnings.push(rule.description);
          this.metrics.blockedCommands++;
          break;
        } else if (rule.action === 'warn') {
          result.warnings.push(rule.description);
          this.metrics.warningsIssued++;
        }
      }
    }

    // Log security violations
    if (result.warnings.length > 0) {
      console.log(
        chalk.yellow('⚠️  Security warnings:'),
        result.warnings.join(', ')
      );
    }

    if (result.blocked) {
      console.log(chalk.red('🚫 Command blocked:'), result.reason);
    }

    return result;
  }

  /**
   * Enhanced validation method that uses AI-only analysis (no fallback)
   * This implements the AI-only security validation architecture
   */
  public async validateCommandEnhanced(
    command: string,
    context?: CommandContext
  ): Promise<EnhancedValidationResult> {
    const startTime = Date.now();

    // Check if AI analyzer is available (required for enhanced validation)
    if (!this.aiSecurityAnalyzer) {
      throw new Error(`
🚨 AI Security Analyzer is required for enhanced security validation.
AIA CLI requires AI-powered security analysis to function safely.
Please ensure your AI service is properly configured.

To fix this:
1. Run 'aia config' to set up your AI API keys
2. Restart the AIA CLI to initialize AI services
3. Verify your AI service configuration
      `);
    }

    if (!this.aiSecurityAnalyzer.isAvailable()) {
      throw new Error(`
🚨 AI Security service is currently unavailable.
AIA CLI requires AI-powered security validation for safe operation.
Please ensure your AI service is properly configured.

To fix this:
1. Run 'aia config' to verify your AI API keys
2. Check your internet connection
3. Ensure your API key has sufficient credits
4. Verify the AI service is responding
      `);
    }

    try {
      console.log('🧠 Using AI-powered security analysis...');

      const securityContext: SecurityContext = {
        workingDirectory: context?.workingDirectory || process.cwd(),
        userRole: this.getUserRole(context?.user),
        projectType: context?.projectType || 'unknown',
        environment: this.getEnvironmentType(),
        recentHistory: [], // Could be enhanced to track recent commands
      };

      const aiAnalysis = await this.aiSecurityAnalyzer.analyzeCommand(
        command,
        securityContext,
        {
          use_context: true,
          include_suggestions: true,
          strict_mode: false,
        }
      );

      // Create enhanced result based on AI analysis
      const enhancedResult: EnhancedValidationResult = {
        allowed: true, // Default, will be overridden by AI analysis
        blocked: false,
        safe: true,
        reason: null,
        warnings: [],
        sanitized: command, // Use original command as default
        usedAIAnalysis: true,
        aiAnalysis: aiAnalysis,
      };

      // Apply AI analysis results
      this.applyAIAnalysisToResult(enhancedResult, aiAnalysis);

      const analysisTime = Date.now() - startTime;
      console.log(`✅ AI security analysis completed in ${analysisTime}ms`);
      console.log(
        `🎯 Threat Level: ${aiAnalysis.threat_level.toUpperCase()}, Confidence: ${(
          aiAnalysis.confidence * 100
        ).toFixed(1)}%`
      );

      if (aiAnalysis.reasoning) {
        console.log(`💭 AI Reasoning: ${aiAnalysis.reasoning}`);
      }

      return enhancedResult;
    } catch (error) {
      const analysisTime = Date.now() - startTime;

      // Enhanced error message for AI failures
      const errorMessage = `
🚨 AI security analysis failed: ${
        error instanceof Error ? error.message : 'Unknown error'
      }
AIA CLI requires AI-powered security validation to function safely.
Please ensure your AI service is properly configured.

To fix this:
1. Run 'aia config' to verify your AI API keys
2. Check your internet connection
3. Ensure your API key has sufficient credits
4. Try the command again in a few moments

Analysis failed after ${analysisTime}ms.
      `;

      throw new Error(errorMessage);
    }
  }

  /**
   * Apply AI analysis results to the validation result
   */
  private applyAIAnalysisToResult(
    result: EnhancedValidationResult,
    aiAnalysis: AISecurityAnalysis
  ): void {
    // AI overrides basic regex analysis for more accurate results
    switch (aiAnalysis.recommended_action) {
      case 'block':
        result.allowed = false;
        result.blocked = true;
        result.safe = false;
        result.reason = `AI Security Analysis: ${aiAnalysis.reasoning}`;
        result.warnings = [
          `🤖 AI detected ${aiAnalysis.threat_level} threat: ${aiAnalysis.reasoning}`,
        ];
        this.metrics.blockedCommands++;
        console.log(
          chalk.red('🚫 AI Security: Command blocked'),
          result.reason
        );
        break;

      case 'warn':
        result.warnings.push(
          `🤖 AI Security Warning (${aiAnalysis.threat_level}): ${aiAnalysis.reasoning}`
        );
        if (aiAnalysis.suggested_modification) {
          result.warnings.push(
            `💡 Suggested safer alternative: ${aiAnalysis.suggested_modification}`
          );
        }
        this.metrics.warningsIssued++;
        console.log(
          chalk.yellow('⚠️  AI Security Warning:'),
          aiAnalysis.reasoning
        );
        break;

      case 'modify':
        if (aiAnalysis.suggested_modification) {
          result.sanitized = aiAnalysis.suggested_modification;
          result.warnings.push(
            `🤖 AI suggested safer command: ${aiAnalysis.suggested_modification}`
          );
          this.metrics.sanitizedInputs++;
          console.log(
            chalk.blue('🔧 AI suggested modification:'),
            aiAnalysis.suggested_modification
          );
        }
        break;

      case 'allow':
        // AI determined command is safe, even if regex flagged it
        if (result.blocked && aiAnalysis.confidence > 0.8) {
          result.allowed = true;
          result.blocked = false;
          result.safe = true;
          result.reason = null;
          result.warnings = [
            `🤖 AI Override: Command deemed safe despite regex detection (confidence: ${(
              aiAnalysis.confidence * 100
            ).toFixed(1)}%)`,
          ];
          console.log(
            chalk.green('✅ AI Override: Command approved'),
            `(${(aiAnalysis.confidence * 100).toFixed(1)}% confidence)`
          );
        }
        break;
    }

    // Add context factors to warnings if they exist
    if (aiAnalysis.context_factors?.length > 0) {
      result.warnings.push(
        `🔍 Context factors: ${aiAnalysis.context_factors.join(', ')}`
      );
    }
  }

  /**
   * Determine user role from context
   */
  private getUserRole(user?: string): SecurityContext['userRole'] {
    if (!user) return 'user';

    // Simple heuristics - could be enhanced with actual user management
    if (user === 'root' || user.includes('admin')) return 'admin';
    if (user.includes('dev') || user.includes('developer')) return 'developer';
    return 'user';
  }

  /**
   * Determine environment type
   */
  private getEnvironmentType(): SecurityContext['environment'] {
    const env = process.env.NODE_ENV?.toLowerCase();
    if (env === 'production') return 'production';
    if (env === 'staging') return 'staging';
    return 'development';
  }

  /**
   * Handles sanitizeInput operation
   * 
   * @param input - Parameter description
   * 
   * @returns string - Return value description
   */
  public sanitizeInput(input: string): string {
    if (!input || typeof input !== 'string') {
      return '';
    }

    // Basic input sanitization
    let sanitized = input
      .replace(/[<>]/g, '') // Remove potential HTML/XML
      .replace(/javascript:/gi, '') // Remove javascript: protocol
      .replace(/data:/gi, '') // Remove data: protocol
      .replace(/vbscript:/gi, '') // Remove vbscript: protocol
      .trim();

    // Limit input length
    const maxLength = this.getMaxInputLength();
    if (sanitized.length > maxLength) {
      sanitized = sanitized.substring(0, maxLength);
      console.log(
        chalk.yellow(`⚠️  Input truncated to ${maxLength} characters`)
      );
    }

    if (sanitized !== input) {
      this.metrics.sanitizedInputs++;
    }

    return sanitized;
  }

  /**
   * Gets maxinputlength
   * 
   * @returns number - Return value description
   */
  private getMaxInputLength(): number {
    return 10000; // 10KB limit
  }

  /**
   * Validates path
   * 
   * @param filePath - Parameter description
   * 
   * @returns ValidationResult - Return value description
   */
  public validatePath(filePath: string): ValidationResult {
    const result: ValidationResult = {
      allowed: true,
      warnings: [],
      blocked: false,
      reason: null,
      sanitized: filePath,
      safe: true,
    };

    if (!filePath || typeof filePath !== 'string') {
      result.allowed = false;
      result.blocked = true;
      result.safe = false;
      result.reason = 'Invalid path format';
      this.metrics.blockedPaths++;
      return result;
    }

    const normalizedPath = path.normalize(filePath);

    // Check for path traversal
    if (normalizedPath.includes('..')) {
      result.allowed = false;
      result.blocked = true;
      result.safe = false;
      result.reason = 'Path traversal attempt detected';
      result.warnings.push('Path traversal detected');
      this.metrics.blockedPaths++;
      return result;
    }

    // Check for sensitive system paths
    const sensitivePaths = [
      '/etc/',
      '/var/log/',
      '/root/',
      '/home/',
      '/proc/',
      '/sys/',
      'C:\\Windows\\',
      'C:\\Program Files\\',
    ];

    const isSystemPath = sensitivePaths.some((sensitvePath) =>
      normalizedPath.startsWith(sensitvePath)
    );

    if (isSystemPath) {
      result.warnings.push('Accessing system path');
      this.metrics.warningsIssued++;
    }

    return result;
  }

  public checkRateLimit(
    operation: string,
    userOrLimit: string | number = 'default',
    windowMs: number = 60000
  ): boolean {
    const key =
      typeof userOrLimit === 'string'
        ? `${operation}:${userOrLimit}`
        : `${operation}:default`;

    const limit = typeof userOrLimit === 'number' ? userOrLimit : 100;
    const now = Date.now();

    if (!this.rateLimits.has(key)) {
      this.rateLimits.set(key, {
        limit,
        windowMs,
        requests: [],
      });
    }

    const rateLimitData = this.rateLimits.get(key)!;

    // Clean old requests outside the window
    rateLimitData.requests = rateLimitData.requests.filter(
      (timestamp) => now - timestamp < windowMs
    );

    // Check if limit exceeded
    if (rateLimitData.requests.length >= limit) {
      this.metrics.rateLimit.violations++;
      this.metrics.rateLimit.blocked++;
      console.log(chalk.red(`⚠️  Rate limit exceeded for ${operation}`));
      return false;
    }

    // Add current request
    rateLimitData.requests.push(now);
    this.metrics.rateLimit.allowed++;
    return true;
  }

  public addSecurityRule(
    ruleOrName: SecurityRule | string,
    pattern?: RegExp,
    severity: 'low' | 'medium' | 'high' = 'medium',
    description?: string,
    action: 'warn' | 'block' = 'warn'
  ): void {
    if (typeof ruleOrName === 'object') {
      // Adding a complete rule object
      const rule = ruleOrName;
      this.customRules.set(rule.name, rule);
    } else {
      // Adding individual parameters
      if (!pattern || !description) {
        throw new Error(
          'Pattern and description are required when adding rule by name'
        );
      }

      const rule: SecurityRule = {
        name: ruleOrName,
        pattern,
        severity,
        description,
        action,
      };
      this.customRules.set(ruleOrName, rule);
    }
  }

  public setRateLimit(
    operation: string,
    limitOrOptions: number | { limit: number; windowMs?: number },
    windowMs: number = 60000
  ): void {
    const limit =
      typeof limitOrOptions === 'number'
        ? limitOrOptions
        : limitOrOptions.limit;

    const window =
      typeof limitOrOptions === 'object' && limitOrOptions.windowMs
        ? limitOrOptions.windowMs
        : windowMs;

    this.rateLimits.set(operation, {
      limit,
      windowMs: window,
      requests: [],
    });
  }

  /**
   * Gets securitymetrics
   * 
   * @returns SecurityMetrics - Return value description
   */
  public getSecurityMetrics(): SecurityMetrics {
    return { ...this.metrics };
  }

  public getPatternSeverity(
    patternName: string
  ): 'low' | 'medium' | 'high' | null {
    const pattern = this.securityPatterns.get(patternName);
    return pattern ? pattern.severity : null;
  }

  /**
   * Gets patterndescription
   * 
   * @param patternName - Parameter description
   * 
   * @returns string | null - Return value description
   */
  public getPatternDescription(patternName: string): string | null {
    const pattern = this.securityPatterns.get(patternName);
    return pattern ? pattern.description : null;
  }

  /**
   * Gets metrics
   * 
   * @returns SecurityMetrics - Return value description
   */
  public getMetrics(): SecurityMetrics {
    return { ...this.metrics };
  }

  // Helper methods for testing and integration
  /**
   * Handles sanitizeCommand operation
   * 
   * @param command - Parameter description
   * 
   * @returns string - Return value description
   */
  public sanitizeCommand(command: string): string {
    const result = this.validateCommand(command);
    return result.sanitized;
  }

  public validateCommandContext(
    command: string,
    context: CommandContext = {}
  ): ValidationResult {
    const baseResult = this.validateCommand(command);

    // Additional context-based validation
    if (context.workingDirectory) {
      const pathResult = this.validatePath(context.workingDirectory);
      if (!pathResult.allowed) {
        baseResult.allowed = false;
        baseResult.blocked = true;
        baseResult.reason = pathResult.reason;
        baseResult.warnings.push(...pathResult.warnings);
      }
    }

    return baseResult;
  }

  // Basic API key encryption (in production this should use proper encryption)
  /**
   * Handles encryptApiKey operation
   * 
   * @param apiKey - Parameter description
   * 
   * @returns string - Return value description
   */
  public encryptApiKey(apiKey: string): string {
    const algorithm = 'aes-256-cbc';
    const key = crypto.scryptSync('aia-secret', 'salt', 32);
    const iv = crypto.randomBytes(16);

    const cipher = crypto.createCipheriv(algorithm, key, iv);
    let encrypted = cipher.update(apiKey, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    return `${iv.toString('hex')}:${encrypted}`;
  }

  // Basic API key decryption
  /**
   * Handles decryptApiKey operation
   * 
   * @param encryptedKey - Parameter description
   * 
   * @returns string - Return value description
   */
  public decryptApiKey(encryptedKey: string): string {
    try {
      const algorithm = 'aes-256-cbc';
      const key = crypto.scryptSync('aia-secret', 'salt', 32);

      const [ivHex, encrypted] = encryptedKey.split(':');
      const iv = Buffer.from(ivHex, 'hex');

      const decipher = crypto.createDecipheriv(algorithm, key, iv);
      let decrypted = decipher.update(encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');

      return decrypted;
    } catch (error) {
      throw new Error('Failed to decrypt API key');
    }
  }

  /**
   * Validates anthropicapikey
   * 
   * @param apiKey - Parameter description
   * 
   * @returns Promise<boolean> - Return value description
   */
  public async validateAnthropicApiKey(apiKey: string): Promise<boolean> {
    try {
      const response = await axios.get(
        'https://api.anthropic.com/v1/messages',
        {
          headers: {
            'x-api-key': apiKey,
            'anthropic-version': '2023-06-01',
          },
          timeout: 5000,
        }
      );

      return response.status === 200 || response.status === 400; // 400 is OK for validation
    } catch (error: any) {
      if (error.response && error.response.status === 401) {
        return false; // Invalid API key
      }

      // Network or other errors don't necessarily mean invalid key
      console.warn(
        chalk.yellow('⚠️  Could not validate API key due to network error')
      );
      return true; // Assume valid if we can't verify
    }
  }

  /**
   * Handles reset operation
   */
  public reset(): void {
    this.securityPatterns.clear();
    this.customRules.clear();
    this.rateLimits.clear();
    this.requestCounts.clear();
    this.metrics = {
      blockedCommands: 0,
      warningsIssued: 0,
      sanitizedInputs: 0,
      blockedPaths: 0,
      rateLimit: {
        violations: 0,
        allowed: 0,
        blocked: 0,
      },
    };
    this.initializeSecurityPatterns();
  }
}

export { SecurityValidator };
export default SecurityValidator;
