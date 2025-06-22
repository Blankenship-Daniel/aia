/**
 * Command Validation Service
 * Validates commands before execution to prevent common failures
 */
import { AsyncResult } from '../types';

export interface CommandValidationResult {
  valid: boolean;
  reason?: string;
  suggestions?: string[];
  severity: 'info' | 'warning' | 'error';
}

export interface CommandValidationOptions {
  checkExists?: boolean;
  checkPermissions?: boolean;
  checkSafety?: boolean;
  suggestAlternatives?: boolean;
}

/**
 * CommandValidationService class
 * 
 * TODO: Add class description
 */
export class CommandValidationService {
  private knownCommands: Set<string>;
  private dangerousCommands: Set<string>;
  private commandAlternatives: Map<string, string[]>;

  /**
   * Creates an instance of the class
   */
  constructor() {
    this.knownCommands = new Set([
      'ls',
      'cd',
      'pwd',
      'cat',
      'echo',
      'grep',
      'find',
      'which',
      'type',
      'git',
      'npm',
      'yarn',
      'node',
      'python',
      'pip',
      'curl',
      'wget',
      'jest',
      'test',
      'build',
      'start',
      'tsc',
      'eslint',
      'prettier',
    ]);

    this.dangerousCommands = new Set([
      'rm',
      'rmdir',
      'del',
      'delete',
      'format',
      'fdisk',
      'dd',
      'chmod 777',
      'chown',
      'sudo rm',
      'rm -rf',
    ]);

    this.commandAlternatives = new Map([
      ['depcheck', ['npm ls --depth=0', 'npm audit', 'yarn why']],
      ['sonarqube-scanner', ['eslint', 'jshint', 'npm audit']],
      ['njsscan', ['eslint --ext .js,.ts .', 'npm audit']],
      ['eslint', ['jshint', 'prettier --check .']],
      ['npm', ['yarn', 'pnpm']],
      ['yarn', ['npm', 'pnpm']],
    ]);
  }

  /**
   * Validate a command before execution
   */
  async validateCommand(
    command: string,
    options: CommandValidationOptions = {}
  ): Promise<CommandValidationResult> {
    const {
      checkExists = true,
      checkPermissions = true,
      checkSafety = true,
      suggestAlternatives = true,
    } = options;

    // Parse command
    const parts = command.trim().split(/\s+/);
    const baseCommand = parts[0];
    const args = parts.slice(1);

    // Safety check first
    if (checkSafety) {
      const safetyResult = this.checkCommandSafety(command);
      if (!safetyResult.valid) {
        return safetyResult;
      }
    }

    // Check if command exists
    if (checkExists) {
      const existsResult = await this.checkCommandExists(baseCommand);
      if (!existsResult.valid) {
        const result: CommandValidationResult = {
          valid: false,
          reason: existsResult.reason,
          severity: 'error',
        };

        // Suggest alternatives if available
        if (suggestAlternatives && this.commandAlternatives.has(baseCommand)) {
          result.suggestions = this.commandAlternatives.get(baseCommand);
        }

        return result;
      }
    }

    // All validations passed
    return {
      valid: true,
      severity: 'info',
    };
  }

  /**
   * Check if command is safe to execute
   */
  private checkCommandSafety(command: string): CommandValidationResult {
    const lowerCommand = command.toLowerCase();

    // Check for dangerous commands
    for (const dangerous of this.dangerousCommands) {
      if (lowerCommand.includes(dangerous)) {
        return {
          valid: false,
          reason: `Potentially dangerous command detected: ${dangerous}`,
          severity: 'error',
          suggestions: ['Review command carefully', 'Use safer alternatives'],
        };
      }
    }

    // Check for suspicious patterns
    if (lowerCommand.includes('rm -rf /') || lowerCommand.includes('del /')) {
      return {
        valid: false,
        reason: 'Extremely dangerous command that could delete system files',
        severity: 'error',
      };
    }

    if (lowerCommand.includes('sudo') && lowerCommand.includes('rm')) {
      return {
        valid: false,
        reason: 'Potentially dangerous elevated deletion command',
        severity: 'error',
        suggestions: [
          'Verify target files',
          'Use less destructive alternatives',
        ],
      };
    }

    return { valid: true, severity: 'info' };
  }

  /**
   * Check if command exists in the system
   */
  private async checkCommandExists(
    command: string
  ): Promise<CommandValidationResult> {
    try {
      // Use a mock implementation for now - in real implementation would check PATH
      if (this.knownCommands.has(command)) {
        return { valid: true, severity: 'info' };
      }

      // Simulate checking common commands that might not be installed
      const commonMissingCommands = [
        'depcheck',
        'sonarqube-scanner',
        'njsscan',
        'webpack-bundle-analyzer',
      ];

      if (commonMissingCommands.includes(command)) {
        return {
          valid: false,
          reason: `Command '${command}' is not installed or not in PATH`,
          severity: 'error',
        };
      }

      // For unknown commands, assume they exist but warn
      return {
        valid: true,
        reason: `Cannot verify if '${command}' exists`,
        severity: 'warning',
      };
    } catch (error) {
      return {
        valid: false,
        reason: `Error checking command existence: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`,
        severity: 'error',
      };
    }
  }

  /**
   * Get alternative commands for a given command
   */
  getAlternatives(command: string): string[] {
    return this.commandAlternatives.get(command) || [];
  }

  /**
   * Add custom command alternative
   */
  addAlternative(command: string, alternatives: string[]): void {
    this.commandAlternatives.set(command, alternatives);
  }

  /**
   * Check if command is known to be safe
   */
  isKnownSafe(command: string): boolean {
    const safeCommands = [
      'ls',
      'cat',
      'echo',
      'pwd',
      'which',
      'type',
      'git status',
      'git log',
      'npm --version',
      'node --version',
      'yarn --version',
    ];

    return safeCommands.some((safe) => command.startsWith(safe));
  }

  /**
   * Suggest safer alternatives for potentially dangerous commands
   */
  suggestSaferAlternative(command: string): string | null {
    const lowerCommand = command.toLowerCase();

    if (lowerCommand.includes('rm -rf')) {
      return 'Use more specific paths or move to trash instead';
    }

    if (lowerCommand.includes('chmod 777')) {
      return 'Use more restrictive permissions like chmod 755 or chmod 644';
    }

    if (lowerCommand.includes('curl') && !lowerCommand.includes('https')) {
      return 'Use HTTPS URLs for secure downloads';
    }

    return null;
  }
}
