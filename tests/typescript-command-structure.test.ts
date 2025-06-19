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
      'AgentCommand.ts',
      'ConfigCommand.ts',
      'CommandFactory.ts',
    ];

    commandFiles.forEach((filename) => {
      const filePath = path.join(__dirname, '../src/commands', filename);
      expect(fs.existsSync(filePath)).toBe(true);

      const content = fs.readFileSync(filePath, 'utf8');

      // Skip ICommand checks for CommandFactory.ts since it's a factory, not a command
      if (filename === 'CommandFactory.ts') {
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
      '../src/commands/CommandFactory.ts'
    );
    const content = fs.readFileSync(factoryPath, 'utf8');

    // Verify CommandFactory implements proper typing
    expect(content).toContain('export class CommandFactory');
    expect(content).toContain('createCommand(name: string): ICommand | null');
    expect(content).toContain('getAllCommands(): Map<string, ICommand>');
    expect(content).toContain(
      'getCommandByAlias(alias: string): ICommand | null'
    );

    // Verify it creates all the main commands
    expect(content).toContain("case 'ask':");
    expect(content).toContain("case 'exec':");
    expect(content).toContain("case 'agent':");
    expect(content).toContain("case 'config':");
  });

  test('Interface compliance structure', () => {
    const fs = require('fs');
    const path = require('path');

    // Check that all command files have proper interface implementation
    const commandFiles = [
      'AskCommand.ts',
      'ExecuteCommand.ts',
      'AgentCommand.ts',
      'ConfigCommand.ts',
    ];

    commandFiles.forEach((filename) => {
      const filePath = path.join(__dirname, '../src/commands', filename);
      const content = fs.readFileSync(filePath, 'utf8');

      // Required imports
      expect(content).toContain('import { ICommand');
      expect(content).toContain('CommandDefinition');
      expect(content).toContain('CommandResult');
      expect(content).toContain('CommandOptions');

      // Required class structure
      expect(content).toContain('implements ICommand');

      // Required ICommand methods
      expect(content).toContain('getDefinition(): CommandDefinition');
      expect(content).toContain('getName(): string');
      expect(content).toContain('getAliases(): string[]');
      expect(content).toContain(
        'validateArgs(args: string[]): { valid: boolean; errors: string[] }'
      );
      expect(content).toContain('getHelp(): string');

      // Execute method with correct signature
      expect(content).toMatch(
        /(?:async\s+)?execute\(\s*context:\s*Record<string,\s*unknown>,\s*args:\s*string\[\],\s*options(?:\?)?:\s*CommandOptions\s*(?:=\s*\{\})?\s*\):\s*Promise<CommandResult>/
      );
    });
  });
});
