const SecurityValidator = require('../src/SecurityValidator');

describe('SecurityValidator', () => {
  let securityValidator;

  beforeEach(() => {
    securityValidator = new SecurityValidator();
  });

  describe('Command Validation', () => {
    test('should allow safe commands', () => {
      const result = securityValidator.validateCommand('ls -la');

      expect(result.blocked).toBe(false);
      expect(result.warnings).toHaveLength(0);
    });

    test('should block dangerous rm commands', () => {
      const result = securityValidator.validateCommand('rm -rf /');

      expect(result.blocked).toBe(true);
      expect(result.reason).toContain('dangerous');
    });

    test('should warn about sudo commands', () => {
      const result = securityValidator.validateCommand('sudo rm file.txt');

      expect(result.blocked).toBe(false);
      expect(result.warnings.length).toBeGreaterThan(0);
      expect(result.warnings[0]).toContain('elevated privileges');
    });

    test('should detect command injection attempts', () => {
      const result = securityValidator.validateCommand('ls; rm -rf *');

      expect(result.blocked).toBe(true);
      expect(result.reason).toContain('injection');
    });

    test('should warn about network commands', () => {
      const result = securityValidator.validateCommand(
        'curl http://example.com'
      );

      expect(result.blocked).toBe(false);
      expect(result.warnings.length).toBeGreaterThan(0);
    });
  });

  describe('Input Sanitization', () => {
    test('should sanitize basic inputs', () => {
      const input = 'hello world';
      const result = securityValidator.sanitizeInput(input);

      expect(result.safe).toBe(true);
      expect(result.sanitized).toBe(input);
    });

    test('should detect and handle special characters', () => {
      const input = 'hello; rm -rf /';
      const result = securityValidator.sanitizeInput(input);

      expect(result.safe).toBe(false);
      expect(result.issues.length).toBeGreaterThan(0);
    });

    test('should handle empty inputs', () => {
      const result = securityValidator.sanitizeInput('');

      expect(result.safe).toBe(true);
      expect(result.sanitized).toBe('');
    });

    test('should limit input length', () => {
      const longInput = 'a'.repeat(10000);
      const result = securityValidator.sanitizeInput(longInput);

      expect(result.safe).toBe(false);
      expect(result.issues).toContain('Input too long');
    });
  });

  describe('Path Validation', () => {
    test('should allow safe paths', () => {
      const result = securityValidator.validatePath('./safe/path');

      expect(result.safe).toBe(true);
    });

    test('should block path traversal attempts', () => {
      const result = securityValidator.validatePath('../../../etc/passwd');

      expect(result.safe).toBe(false);
      expect(result.reason).toContain('traversal');
    });

    test('should block absolute paths to sensitive directories', () => {
      const result = securityValidator.validatePath('/etc/passwd');

      expect(result.safe).toBe(false);
      expect(result.reason).toContain('sensitive');
    });

    test('should handle normalized paths', () => {
      const result = securityValidator.validatePath(
        '/home/user/../../../etc/passwd'
      );

      expect(result.safe).toBe(false);
    });
  });

  describe('Rate Limiting', () => {
    test('should allow requests within rate limit', () => {
      const result = securityValidator.checkRateLimit(
        'test-operation',
        'user1'
      );

      expect(result.allowed).toBe(true);
    });

    test('should block requests exceeding rate limit', () => {
      // Make multiple requests quickly
      for (let i = 0; i < 15; i++) {
        securityValidator.checkRateLimit('test-operation', 'user1');
      }

      const result = securityValidator.checkRateLimit(
        'test-operation',
        'user1'
      );

      expect(result.allowed).toBe(false);
      expect(result.retryAfter).toBeGreaterThan(0);
    });

    test('should track different operations separately', () => {
      // Max out one operation
      for (let i = 0; i < 15; i++) {
        securityValidator.checkRateLimit('operation1', 'user1');
      }

      // Different operation should still be allowed
      const result = securityValidator.checkRateLimit('operation2', 'user1');

      expect(result.allowed).toBe(true);
    });
  });

  describe('Security Metrics', () => {
    test('should track blocked commands', () => {
      securityValidator.validateCommand('rm -rf /');
      securityValidator.validateCommand('sudo rm -rf *');

      const metrics = securityValidator.getSecurityMetrics();

      expect(metrics.blockedCommands).toBeGreaterThan(0);
    });

    test('should track warnings issued', () => {
      securityValidator.validateCommand('sudo ls');
      securityValidator.validateCommand('curl http://example.com');

      const metrics = securityValidator.getSecurityMetrics();

      expect(metrics.warningsIssued).toBeGreaterThan(0);
    });

    test('should provide security overview', () => {
      securityValidator.validateCommand('rm -rf /');
      securityValidator.validateCommand('sudo ls');

      const metrics = securityValidator.getSecurityMetrics();

      expect(metrics).toHaveProperty('blockedCommands');
      expect(metrics).toHaveProperty('warningsIssued');
      expect(metrics).toHaveProperty('rateLimitHits');
      expect(metrics).toHaveProperty('recentIncidents');
    });
  });

  describe('Configuration', () => {
    test('should allow custom security rules', () => {
      const customRule = {
        name: 'custom-rule',
        pattern: /custom-danger/,
        action: 'block',
        reason: 'Custom dangerous command',
      };

      securityValidator.addSecurityRule(customRule);

      const result = securityValidator.validateCommand('custom-danger command');

      expect(result.blocked).toBe(true);
      expect(result.reason).toContain('Custom dangerous command');
    });

    test('should allow custom rate limits', () => {
      securityValidator.setRateLimit('custom-operation', {
        maxRequests: 5,
        timeWindow: 60000,
      });

      // Should allow up to 5 requests
      for (let i = 0; i < 5; i++) {
        const result = securityValidator.checkRateLimit(
          'custom-operation',
          'user1'
        );
        expect(result.allowed).toBe(true);
      }

      // 6th request should be blocked
      const result = securityValidator.checkRateLimit(
        'custom-operation',
        'user1'
      );
      expect(result.allowed).toBe(false);
    });
  });
});
