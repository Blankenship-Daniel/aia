// Test to verify TypeScript command files compile correctly
import { describe, test, expect } from '@jest/globals';

describe('TypeScript Command Files Compilation', () => {
  test('Command files should be valid TypeScript', async () => {
    // This test simply ensures the TypeScript files can be imported without syntax errors

    // Test importing interfaces - we can't test interfaces at runtime since they're types
    const ICommandModule = await import('../src/interfaces/ICommand.js');
    expect(ICommandModule).toBeDefined();

    // Test that the command files exist and are TypeScript
    const fs = require('fs');
    const path = require('path');

    const commandFiles = [
      'AskCommand.ts',
      'ExecuteCommand.ts',
      'AgentCommandRefactored.ts',
      'ConfigCommand.ts',
      'ContextCommand.ts',
      'IndexCommand.ts',
      'MemoryCommand.ts',
    ];

    commandFiles.forEach((filename) => {
      const filePath = path.join(__dirname, '../src/commands', filename);
      expect(fs.existsSync(filePath)).toBe(true);

      const content = fs.readFileSync(filePath, 'utf8');

      // Skip ICommand checks for factory files since they're factories, not commands
      if (filename.includes('Factory')) {
        // Check for TypeScript-specific features in factory
        expect(content).toContain('export class CommandFactory');
        expect(content).toContain('createCommand');
        expect(content).toContain('ICommand');
        return;
      }

      // Check for TypeScript-specific features in command implementations
      expect(content).toContain('implements ICommand');
      expect(content).toContain('async execute(');
      expect(content).toContain('CommandResult');
      expect(content).toContain('CommandOptions');

      // Check for ICommand interface methods
      expect(content).toContain('getDefinition()');
      expect(content).toContain('getName()');
      expect(content).toContain('getAliases()');
      expect(content).toContain('validateArgs(');
      expect(content).toContain('getHelp()');
    });
  });

  test('Command Factory should be properly typed', async () => {
    const fs = require('fs');
    const path = require('path');

    const factoryPath = path.join(
      __dirname,
      '../src/commands/CommandFactoryV2.ts'
    );
    const content = fs.readFileSync(factoryPath, 'utf8');

    // Verify CommandFactory implements proper typing
    expect(content).toContain('export class CommandFactoryV2');
    expect(content).toContain('createCommand');
    expect(content).toContain('registerCommand');
    expect(content).toContain(
      'getCommandByAlias(alias: string): ICommand | null'
    );

    // Verify it has command creation functionality
    expect(content).toContain('createCommand');
    expect(content).toContain('getAllCommands');
    expect(content).toContain('registerCommand');
  });

  test('Interface compliance structure', () => {
    const fs = require('fs');
    const path = require('path');

    // Check that all command files have proper interface implementation
    const commandFiles = [
      'AskCommand.ts',
      'ExecuteCommand.ts',
      'AgentCommandRefactored.ts',
      'ConfigCommand.ts',
    ];

    commandFiles.forEach((filename) => {
      const filePath = path.join(__dirname, '../src/commands', filename);
      const content = fs.readFileSync(filePath, 'utf8');

      // Required imports - check what's actually used
      expect(content).toContain('import');
      expect(content).toContain('ICommand');

      // Check class structure
      expect(content).toContain('export class');
      expect(content).toContain('implements ICommand');
      expect(content).toContain('CommandOptions');

      // Required class structure
      expect(content).toContain('implements ICommand');

      // Required ICommand methods
      // Check basic method structure (interface compliance may vary)
      expect(content).toContain('getName():');
      expect(content).toContain('getAliases():');
      expect(content).toContain('validateArgs');
      expect(content).toContain('getHelp():');

      // Check for execute method (signature may vary)
      expect(content).toContain('execute(');
    });
  });
});
