import { ContextInfo, CommandResult } from '../types/index.js';

/**
 * Command Service Interface
 * Defines the contract for command execution and management
 */
export interface ICommandService {
  /**
   * Initialize command service
   */
  initialize(): Promise<void>;

  /**
   * Execute a shell command
   */
  executeCommand(
    command: string,
    options?: {
      optimize?: boolean;
      safe?: boolean;
      workingDirectory?: string;
      timeout?: number;
    }
  ): Promise<{
    stdout: string;
    stderr: string;
    exitCode: number;
    duration: number;
    optimized: boolean;
  }>;

  /**
   * Validate command safety
   */
  validateCommandSafety(command: string): Promise<{
    safe: boolean;
    level: 'safe' | 'warning' | 'dangerous';
    warnings: string[];
    suggestions: string[];
  }>;

  /**
   * Optimize command for better performance
   */
  optimizeCommand(
    command: string,
    context: ContextInfo
  ): Promise<{
    optimized: string;
    original: string;
    reason: string;
    applied: boolean;
  }>;

  /**
   * Suggest next likely commands based on history
   */
  suggestCommands(
    context: ContextInfo,
    limit?: number
  ): Promise<
    Array<{
      command: string;
      description: string;
      confidence: number;
    }>
  >;

  /**
   * Parse command for structure and components
   */
  parseCommand(command: string): {
    program: string;
    args: string[];
    pipes: boolean;
    redirects: boolean;
    background: boolean;
  };

  /**
   * Get command history
   */
  getHistory(limit?: number): Promise<
    Array<{
      command: string;
      timestamp: string;
      exitCode: number;
      duration: number;
    }>
  >;
}
