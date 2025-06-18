const chalk = require('chalk');
const path = require('path');
const crypto = require('crypto');
const axios = require('axios');

class SecurityValidator {
  constructor() {
    this.securityPatterns = new Map();
    this.customRules = new Map();
    this.rateLimits = new Map();
    this.requestCounts = new Map();
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

  initializeSecurityPatterns() {
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

    // Command injection (check first to catch complex patterns, but allow safe discovery)
    this.securityPatterns.set('command_injection', {
      pattern: /[;&|`$(){}]/,
      severity: 'high',
      description: 'Potential command injection detected',
      action: 'block',
      skipForSafeCommands: true, // New flag to skip this check for whitelisted commands
    });

    // Dangerous commands
    this.securityPatterns.set('rm_dangerous', {
      pattern: /rm\s+(-rf?|--recursive|--force|\*|\/)/i,
      severity: 'critical',
      description: 'dangerous rm command detected',
      action: 'block',
    });

    this.securityPatterns.set('sudo_warning', {
      pattern: /sudo\s+/i,
      severity: 'high',
      description: 'Sudo command requires elevated privileges',
      action: 'warn',
    });

    // Network commands
    this.securityPatterns.set('network_command', {
      pattern: /\b(curl|wget|nc|telnet|ssh|scp|rsync)\b/i,
      severity: 'medium',
      description: 'Network command detected',
      action: 'warn',
    });

    // Path traversal
    this.securityPatterns.set('path_traversal', {
      pattern: /\.\.[\/\\]/,
      severity: 'high',
      description: 'Path traversal attempt detected',
      action: 'block',
    });

    // Sensitive directories
    this.securityPatterns.set('sensitive_paths', {
      pattern: /^(\/etc|\/root|\/proc|\/sys|\/dev)\//,
      severity: 'high',
      description: 'Access to sensitive directory attempted',
      action: 'block',
    });
  }

  validateCommand(command) {
    const result = {
      allowed: true,
      warnings: [],
      blocked: false,
      reason: null,
      sanitized: command,
      safe: true, // Initialize safe as true
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
          // A warning doesn't necessarily make it unsafe, depends on policy
          // For now, let's assume warnings don't make it unsafe unless also blocked.
        }
      }
    }

    // If already blocked by a pattern, no need to check custom rules for blocking again
    if (!result.blocked) {
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
    }

    // Final determination of safe based on allowed and blocked
    result.safe = result.allowed && !result.blocked;

    return result;
  }
  sanitizeInput(input) {
    const result = {
      safe: true,
      sanitized: input || '',
      issues: [],
    };

    if (!input || typeof input !== 'string') {
      result.sanitized = '';
      return result;
    }

    let sanitized = input;

    // Remove null bytes
    if (sanitized.includes('\0')) {
      sanitized = sanitized.replace(/\0/g, '');
      result.issues.push('Null bytes removed');
      result.safe = false;
    }

    // Check for dangerous characters
    const dangerousChars = /[;&|`$(){}]/;
    if (dangerousChars.test(sanitized)) {
      result.issues.push('Special characters detected');
      result.safe = false;
    }

    // Limit length
    const maxLength = this.getMaxInputLength();
    if (sanitized.length > maxLength) {
      sanitized = sanitized.substring(0, maxLength);
      result.issues.push('Input too long');
      result.safe = false;
      console.warn(
        chalk.yellow(`⚠️  Input truncated to ${maxLength} characters`)
      );
    }

    // Normalize line endings
    const originalLength = sanitized.length;
    sanitized = sanitized.replace(/\r\n/g, '\n');

    if (sanitized.length !== originalLength || result.issues.length > 0) {
      this.metrics.sanitizedInputs++;
    }

    result.sanitized = sanitized.trim();
    return result;
  }

  getMaxInputLength() {
    return 1000; // Default max input length
  }

  validatePath(filePath) {
    const result = {
      safe: true,
      reason: null,
      warnings: [],
      blocked: false,
      normalizedPath: filePath,
    };

    if (!filePath || typeof filePath !== 'string') {
      result.safe = false;
      result.blocked = true;
      result.reason = 'Invalid path format';
      result.warnings.push('Invalid path format');
      this.metrics.blockedPaths++;
      return result;
    }

    try {
      result.normalizedPath = path.normalize(filePath);
    } catch (error) {
      result.safe = false;
      result.blocked = true;
      result.reason = 'Path normalization failed';
      result.warnings.push('Path normalization failed');
      this.metrics.blockedPaths++;
      return result;
    }

    // Check for path traversal
    if (result.normalizedPath.includes('..')) {
      result.safe = false;
      result.blocked = true;
      result.reason = 'Path traversal detected';
      result.warnings.push('Path traversal detected');
      this.metrics.blockedPaths++;
      return result;
    }

    // Check for sensitive directories
    const sensitivePattern = this.securityPatterns.get('sensitive_paths');
    if (
      sensitivePattern &&
      sensitivePattern.pattern.test(result.normalizedPath)
    ) {
      result.safe = false;
      result.blocked = true;
      result.reason = 'Access to sensitive directory blocked';
      result.warnings.push('Access to sensitive directory blocked');
      this.metrics.blockedPaths++;
      return result;
    }

    return result;
  }

  checkRateLimit(operation, userOrLimit = null, windowMs = 60000) {
    const now = Date.now();

    // Handle different call signatures:
    // checkRateLimit(operation, user) - for user-specific rate limiting
    // checkRateLimit(operation, limit, windowMs) - for operation-specific rate limiting
    let key, currentLimit;

    if (typeof userOrLimit === 'string') {
      // User-specific rate limiting: operation + user
      key = `${operation}:${userOrLimit}`;
      currentLimit = this.rateLimits.get(operation) || 10; // Default 10 per minute for user-specific
    } else {
      // Operation-specific rate limiting
      key = operation;
      currentLimit = userOrLimit || this.rateLimits.get(operation) || 5; // Default 5 per minute
    }

    if (!this.requestCounts.has(key)) {
      this.requestCounts.set(key, []);
    }

    const requests = this.requestCounts.get(key);

    // Use custom window if set
    const actualWindowMs = this.rateLimitWindows?.get(operation) || windowMs;

    // Clean old requests outside the window
    const validRequests = requests.filter(
      (time) => now - time < actualWindowMs
    );
    this.requestCounts.set(key, validRequests);

    // Check if limit is exceeded
    if (validRequests.length >= currentLimit) {
      this.metrics.rateLimit.violations++;
      this.metrics.rateLimit.blocked++;
      return {
        allowed: false,
        remaining: 0,
        retryAfter: Math.min(...validRequests) + actualWindowMs - now,
      };
    }

    // Add current request
    validRequests.push(now);
    this.requestCounts.set(key, validRequests);

    this.metrics.rateLimit.allowed++;

    return {
      allowed: true,
      remaining: currentLimit - validRequests.length,
      retryAfter: 0,
    };
  }

  addSecurityRule(ruleOrName, pattern, severity, description, action = 'warn') {
    // Support both object and parameter syntax
    if (typeof ruleOrName === 'object') {
      const rule = ruleOrName;
      this.customRules.set(rule.name, {
        pattern: rule.pattern,
        severity: rule.severity || 'medium',
        description: rule.reason || rule.description,
        action: rule.action || 'warn',
      });
    } else {
      this.customRules.set(ruleOrName, {
        pattern: new RegExp(pattern),
        severity,
        description,
        action,
      });
    }
  }
  setRateLimit(operation, limitOrOptions, windowMs = 60000) {
    // Support both object and parameter syntax
    if (typeof limitOrOptions === 'object') {
      const options = limitOrOptions;
      this.rateLimits.set(operation, options.maxRequests);
      if (!this.rateLimitWindows) {
        this.rateLimitWindows = new Map();
      }
      this.rateLimitWindows.set(operation, options.timeWindow);
    } else {
      this.rateLimits.set(operation, limitOrOptions);
      if (!this.rateLimitWindows) {
        this.rateLimitWindows = new Map();
      }
      this.rateLimitWindows.set(operation, windowMs);
    }
  }

  getSecurityMetrics() {
    return {
      ...this.metrics,
      totalPatterns: this.securityPatterns.size,
      customRules: this.customRules.size,
      rateLimits: this.rateLimits.size,
      rateLimitHits: this.metrics.rateLimit.violations,
      recentIncidents:
        this.metrics.blockedCommands + this.metrics.warningsIssued,
    };
  }

  getPatternSeverity(patternName) {
    const pattern = this.securityPatterns.get(patternName);
    if (pattern) {
      return pattern.severity;
    }

    const customRule = this.customRules.get(patternName);
    if (customRule) {
      return customRule.severity;
    }

    return 'unknown';
  }

  getPatternDescription(patternName) {
    const pattern = this.securityPatterns.get(patternName);
    if (pattern) {
      return pattern.description;
    }

    const customRule = this.customRules.get(patternName);
    if (customRule) {
      return customRule.description;
    }

    return 'Unknown pattern';
  }

  getMetrics() {
    return this.getSecurityMetrics();
  }

  // Helper methods for testing and integration
  sanitizeCommand(command) {
    return this.sanitizeInput(command);
  }

  validateCommandContext(command, context = {}) {
    const validation = this.validateCommand(command);
    const sanitized = this.sanitizeInput(command);

    return {
      ...validation,
      sanitized,
      context,
    };
  }

  // Basic API key encryption (in production this should use proper encryption)
  encryptApiKey(apiKey) {
    if (!apiKey || typeof apiKey !== 'string') {
      return apiKey;
    }

    const algorithm = 'aes-256-cbc';
    const key = crypto.scryptSync('aia-secret-key', 'salt', 32);
    const iv = crypto.randomBytes(16);

    const cipher = crypto.createCipheriv(algorithm, key, iv);
    let encrypted = cipher.update(apiKey, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    // Return encrypted key along with IV for decryption
    return `${iv.toString('hex')}:${encrypted}`;
  }

  // Basic API key decryption
  decryptApiKey(encryptedKey) {
    if (!encryptedKey || typeof encryptedKey !== 'string') {
      return encryptedKey; // Return plain key if not encrypted
    }

    const algorithm = 'aes-256-cbc';
    const parts = encryptedKey.split(':');

    if (parts.length !== 2) {
      // Handle legacy plain keys
      return encryptedKey;
    }

    const [ivHex, encrypted] = parts;
    const key = crypto.scryptSync('aia-secret-key', 'salt', 32);
    const iv = Buffer.from(ivHex, 'hex');

    try {
      const decipher = crypto.createDecipheriv(algorithm, key, iv);
      let decrypted = decipher.update(encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      return decrypted;
    } catch (error) {
      console.error('Decryption failed:', error);
      return encryptedKey; // Fallback to plain key
    }
  }

  async validateAnthropicApiKey(apiKey) {
    const endpoint = 'https://api.anthropic.com/v1/validate';

    try {
      const response = await axios.post(
        endpoint,
        {},
        {
          headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
        }
      );

      return response.status === 200;
    } catch (error) {
      console.error('Failed to validate Anthropic API key:', error.message);
      return false;
    }
  }

  reset() {
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
    this.requestCounts.clear();
  }
}

module.exports = SecurityValidator;
