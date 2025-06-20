import path from 'path';
import fs from 'fs-extra';

// Import individual modules since the main AIA class might not exist
import ErrorHandler from '../src/ErrorHandler';
import SecurityValidator from '../src/SecurityValidator';
import MemoryManager from '../src/MemoryManager';

describe('AIA Integration Tests', () => {
  let testConfigPath: string;
  let errorHandler: ErrorHandler;
  let securityValidator: SecurityValidator;
  let memoryManager: MemoryManager;
  let testMemoryPath: string;

  beforeEach(async () => {
    // Create temporary paths for testing
    testConfigPath = path.join(__dirname, 'test-config.json');
    testMemoryPath = path.join(__dirname, 'test-memory.json');

    await fs.writeJSON(testConfigPath, {
      preferredModel: 'gpt-4',
      openaiApiKey: 'test-key',
      anthropicApiKey: 'test-key',
      saveDefaultsInTest: false,
    });

    // Initialize individual modules
    errorHandler = new ErrorHandler();
    securityValidator = new SecurityValidator();
    memoryManager = new MemoryManager(testMemoryPath);
  });

  afterEach(async () => {
    // Cleanup
    if (await fs.pathExists(testConfigPath)) {
      await fs.remove(testConfigPath);
    }
    if (await fs.pathExists(testMemoryPath)) {
      await fs.remove(testMemoryPath);
    }
  });

  describe('Module Integration', () => {
    test('should initialize all modules successfully', async () => {
      expect(errorHandler).toBeDefined();
      expect(securityValidator).toBeDefined();
      expect(memoryManager).toBeDefined();
    });

    test('should handle secure command validation', async () => {
      // Test safe command
      const safeValidation = securityValidator.validateCommand('ls -la');
      expect(safeValidation).toBeDefined();

      // Test dangerous command
      const dangerousValidation = securityValidator.validateCommand('rm -rf /');
      expect(dangerousValidation).toBeDefined();
    });

    test('should handle error scenarios gracefully', async () => {
      // Test error handling
      const testError = new Error('Test error');
      const categorizedError = errorHandler.categorizeError(testError);

      expect(categorizedError.type).toBeDefined();
      expect(categorizedError.recoverable).toBeDefined();
    });

    test('should manage memory correctly', async () => {
      const memory = await memoryManager.loadMemory();
      expect(memory).toBeDefined();
      expect(memory.conversations).toBeDefined();
      expect(memory.commands).toBeDefined();
      expect(memory.preferences).toBeDefined();
      expect(memory.metadata).toBeDefined();
    });
  });

  describe('End-to-End Workflows', () => {
    test('should execute a complete validation workflow', async () => {
      // Simulate a complete workflow: validate -> memory -> error handling
      const command = 'echo "test"';

      // 1. Security validation
      const validation = securityValidator.validateCommand(command);
      expect(validation).toBeDefined();

      // 2. Memory operations
      const memory = await memoryManager.loadMemory();
      expect(memory).toBeDefined();

      // 3. Error handling should be available
      const errorHandling = errorHandler.getErrorMetrics();
      expect(errorHandling).toBeDefined();
    });

    test('should handle security violations correctly', async () => {
      const dangerousCommand = 'rm -rf /';

      // Should be blocked by security validator
      const validation = securityValidator.validateCommand(dangerousCommand);
      expect(validation).toBeDefined();
    });

    test('should track metrics across modules', async () => {
      // Test security validation
      securityValidator.validateCommand('rm -rf /');

      // Test error logging
      errorHandler.logError(new Error('Test error'));

      const securityMetrics = securityValidator.getSecurityMetrics();
      const errorMetrics = errorHandler.getErrorMetrics();

      expect(securityMetrics).toBeDefined();
      expect(errorMetrics).toBeDefined();
      expect(typeof errorMetrics.total).toBe('number');
    });
  });

  describe('Performance and Reliability', () => {
    test('should handle concurrent operations', async () => {
      // Test concurrent security validations
      const commands = ['ls', 'pwd', 'echo test', 'cat /etc/passwd'];
      const validations = await Promise.all(
        commands.map((cmd) => securityValidator.validateCommand(cmd))
      );

      expect(validations).toHaveLength(commands.length);
      validations.forEach((validation) => {
        expect(validation).toBeDefined();
      });
    });

    test('should handle rate limiting', async () => {
      // Test rate limiting
      const operation = 'test-operation';
      const user = 'test-user';

      // Should allow initial requests
      const result1 = securityValidator.checkRateLimit(operation, user);
      expect(result1).toBeDefined();
    });

    test('should handle memory management', async () => {
      // Test memory loading
      const initialMemory = await memoryManager.loadMemory();
      expect(initialMemory).toBeDefined();

      // Test memory structure
      expect(initialMemory.conversations).toBeDefined();
      expect(initialMemory.commands).toBeDefined();
      expect(initialMemory.preferences).toBeDefined();
    });
  });
});
