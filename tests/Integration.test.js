const AIA = require('../index');
const path = require('path');
const fs = require('fs-extra');

describe('AIA Integration Tests', () => {
  let aia;
  let testConfigPath;

  beforeEach(async () => {
    // Create a temporary config for testing
    testConfigPath = path.join(__dirname, 'test-config.json');
    await fs.writeJSON(testConfigPath, {
      preferredModel: 'gpt-4',
      openaiApiKey: 'test-key',
      anthropicApiKey: 'test-key',
      saveDefaultsInTest: false, // Explicitly prevent saving defaults to test file
    });

    // Pass the testConfigPath to the AIA constructor
    aia = new AIA(testConfigPath);
    // aia.configPath = testConfigPath; // No longer needed here, handled by constructor
  });

  afterEach(async () => {
    // Cleanup
    if (await fs.pathExists(testConfigPath)) {
      await fs.remove(testConfigPath);
    }
  });

  describe('Module Integration', () => {
    test('should initialize all modules successfully', async () => {
      await aia.init();

      expect(aia.errorHandler).toBeDefined();
      expect(aia.securityValidator).toBeDefined();
      expect(aia.configManager).toBeDefined();
      expect(aia.commandHandler).toBeDefined();
      expect(aia.cliFormatter).toBeDefined();
      expect(aia.performanceOptimizer).toBeDefined();
    });

    test('should handle secure command execution', async () => {
      await aia.init();

      // Test safe command
      const safeValidation = aia.securityValidator.validateCommand('ls -la');
      expect(safeValidation.safe).toBe(true);

      // Test dangerous command
      const dangerousValidation =
        aia.securityValidator.validateCommand('rm -rf /');
      expect(dangerousValidation.blocked).toBe(true);
    });

    test('should handle error scenarios gracefully', async () => {
      await aia.init();

      // Test error handling
      const testError = new Error('Test error');
      const categorizedError = aia.errorHandler.categorizeError(testError);

      expect(categorizedError.type).toBeDefined(); // Changed from category to type
      expect(categorizedError.severity).toBeDefined();
      expect(categorizedError.recoverable).toBeDefined();
    });

    test('should manage configuration correctly', async () => {
      await aia.init(); // This will now use the testConfigPath for initialization

      const config = await aia.configManager.getConfig();
      expect(config.preferredModel).toBe('gpt-4');

      // Test configuration update
      await aia.configManager.updateConfig(
        { preferredModel: 'claude-3-5-sonnet-20241022' },
        true // Indicate test environment to avoid writing to user's global config
      );
      const updatedConfig = await aia.configManager.getConfig();
      expect(updatedConfig.preferredModel).toBe('claude-3-5-sonnet-20241022');
    });

    test('should handle command optimization', async () => {
      await aia.init();

      const testCommand = 'find . -name "*.js" -type f';
      const optimization = aia.performanceOptimizer.optimizeCommand(
        testCommand,
        {}
      ); // Pass an empty context object

      expect(optimization).toBeDefined();
      expect(optimization.optimized).toBe(true);
      expect(optimization.command).toBeDefined();
    });
  });

  describe('End-to-End Workflows', () => {
    test('should execute a complete workflow', async () => {
      await aia.init();

      // Simulate a complete workflow: validate -> execute -> handle errors
      const command = 'echo "test"';

      // 1. Security validation
      const validation = aia.securityValidator.validateCommand(command);
      expect(validation.safe).toBe(true);

      // 2. Command optimization
      const optimization = aia.performanceOptimizer.optimizeCommand(
        command,
        {}
      ); // Pass an empty context object
      expect(optimization).toBeDefined();

      // 3. Error handling should be available
      const errorHandling = aia.errorHandler.getErrorMetrics();
      expect(errorHandling).toBeDefined();
    });

    test('should handle security violations correctly', async () => {
      await aia.init();

      const dangerousCommand = 'rm -rf /';

      // Should be blocked by security validator
      const validation =
        aia.securityValidator.validateCommand(dangerousCommand);
      expect(validation.blocked).toBe(true);
      expect(validation.reason).toContain('dangerous');
    });

    test('should track metrics across modules', async () => {
      await aia.init();

      // Simulate some operations that might generate metrics
      try {
        await aia.commandHandler.executeCommand('nonexistent-command-xyz');
      } catch (e) {
        // Expected error
      }
      aia.securityValidator.validateCommand('rm -rf /');

      const securityMetrics = aia.securityValidator.getMetrics();
      const errorMetrics = aia.errorHandler.getErrorMetrics();

      expect(typeof securityMetrics.blockedCommands).toBe('number');
      expect(typeof errorMetrics.total).toBe('number'); // Changed from totalErrors to total
    });
  });

  describe('Performance and Reliability', () => {
    test('should handle concurrent operations', async () => {
      await aia.init();

      // Test concurrent security validations
      const commands = ['ls', 'pwd', 'echo test', 'cat /etc/passwd'];
      const validations = await Promise.all(
        commands.map((cmd) => aia.securityValidator.validateCommand(cmd))
      );

      expect(validations).toHaveLength(commands.length);
      validations.forEach((validation) => {
        expect(validation).toBeDefined();
        expect(typeof validation.safe).toBe('boolean');
      });
    });

    test('should handle rate limiting', async () => {
      await aia.init();

      // Test rate limiting
      const operation = 'test-operation';
      const user = 'test-user';

      // Should allow initial requests
      const result1 = aia.securityValidator.checkRateLimit(operation, user);
      expect(result1.allowed).toBe(true);

      // Should track remaining requests
      expect(typeof result1.remaining).toBe('number');
    });

    test('should handle memory management', async () => {
      await aia.init();

      // Test memory loading
      const initialMemory = await aia.memoryManager.loadMemory(); // Corrected to use memoryManager
      expect(initialMemory).toBeDefined();

      // Test memory structure
      expect(initialMemory.conversations).toBeDefined();
      expect(initialMemory.commands).toBeDefined();
      expect(initialMemory.preferences).toBeDefined();
    });
  });
});
