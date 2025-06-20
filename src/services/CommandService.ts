/**
 * Command Service Implementation
 * Manages command execution and optimization
 */
import { ICommandService } from '../interfaces/ICommandService';
import { IConfigurationService } from '../interfaces/IConfigurationService';
import { IContextService } from '../interfaces/IContextService';
import { ICommandMemory } from '../interfaces/ICommandMemory';
import { ContextInfo, CommandResult } from '../types/index';
import { spawn } from 'child_process';

export class CommandService implements ICommandService {
  private configService: IConfigurationService;
  private contextService: IContextService;
  private commandMemory: ICommandMemory;
  private initialized: boolean = false;

  constructor(
    configurationService: IConfigurationService,
    contextService: IContextService,
    commandMemory: ICommandMemory
  ) {
    this.configService = configurationService;
    this.contextService = contextService;
    this.commandMemory = commandMemory;
  }

  /**
   * Initialize command service
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    this.initialized = true;
  }

  /**
   * Execute a shell command
   */
  async executeCommand(
    command: string,
    options: {
      optimize?: boolean;
      safe?: boolean;
      workingDirectory?: string;
      timeout?: number;
    } = {}
  ): Promise<{
    stdout: string;
    stderr: string;
    exitCode: number;
    duration: number;
    optimized: boolean;
  }> {
    const startTime = Date.now();

    return new Promise((resolve, reject) => {
      let stdout = '';
      let stderr = '';

      // Use shell: true to properly handle shell commands with pipes and operators
      // Use null for stdin to prevent commands from hanging on interactive prompts
      const child = spawn(command, {
        cwd: options.workingDirectory || process.cwd(),
        stdio: ['pipe', 'pipe', 'pipe'], // Changed from 'inherit' to 'pipe' for stdin
        shell: true,
      });

      // Close stdin immediately to prevent hanging on interactive commands
      if (child.stdin) {
        child.stdin.end();
      }

      child.stdout?.on('data', (data: Buffer) => {
        stdout += data.toString();
      });

      child.stderr?.on('data', (data: Buffer) => {
        stderr += data.toString();
      });

      child.on('close', (code: number | null) => {
        const duration = Date.now() - startTime;
        const exitCode = code || 0;
        const optimized = options.optimize || false;

        // Add command to memory
        this.commandMemory.addCommand(
          command,
          options.workingDirectory || process.cwd(),
          exitCode,
          duration
        );

        resolve({
          stdout,
          stderr,
          exitCode,
          duration,
          optimized,
        });
      });

      child.on('error', (error: Error) => {
        reject(new Error(`Command execution failed: ${error.message}`));
      });

      // Handle timeout
      if (options.timeout) {
        setTimeout(() => {
          child.kill('SIGTERM');
          reject(new Error(`Command timeout after ${options.timeout}ms`));
        }, options.timeout);
      }
    });
  }

  /**
   * Validate command safety
   */
  async validateCommandSafety(command: string): Promise<{
    safe: boolean;
    level: 'safe' | 'warning' | 'dangerous';
    warnings: string[];
    suggestions: string[];
  }> {
    const warnings: string[] = [];
    const suggestions: string[] = [];
    let level: 'safe' | 'warning' | 'dangerous' = 'safe';

    // Simple validation - would be more sophisticated in real implementation
    const dangerousPatterns = [
      /rm\s+-rf/,
      /sudo\s+rm/,
      /format/,
      /mkfs/,
      /dd\s+if=/,
    ];

    const warningPatterns = [/rm\s+/, /chmod\s+777/, /sudo/];

    for (const pattern of dangerousPatterns) {
      if (pattern.test(command)) {
        level = 'dangerous';
        warnings.push(
          `Potentially dangerous command pattern: ${pattern.source}`
        );
        suggestions.push(
          'Consider using a safer alternative or review the command carefully'
        );
      }
    }

    if (level === 'safe') {
      for (const pattern of warningPatterns) {
        if (pattern.test(command)) {
          level = 'warning';
          warnings.push(`Command requires caution: ${pattern.source}`);
          suggestions.push('Verify the command parameters before execution');
        }
      }
    }

    return {
      safe: level === 'safe',
      level,
      warnings,
      suggestions,
    };
  }

  /**
   * Validate command and check for issues
   */
  async validateCommand(command: string): Promise<{
    valid: boolean;
    safe: boolean;
    warnings: string[];
    suggestions: string[];
  }> {
    const warnings: string[] = [];
    const suggestions: string[] = [];
    let safe = true;

    // Check for dangerous commands
    const dangerousCommands = ['rm -rf', 'format', 'fdisk', 'dd if='];
    const isDangerous = dangerousCommands.some((dangerous) =>
      command.toLowerCase().includes(dangerous.toLowerCase())
    );

    if (isDangerous) {
      safe = false;
      warnings.push('This command appears to be potentially destructive');
      suggestions.push(
        'Consider using safer alternatives or review the command carefully'
      );
    }

    // Check for common issues
    if (command.includes('sudo') && !command.includes('-S')) {
      warnings.push('Command requires sudo privileges');
      suggestions.push('Ensure you have the necessary permissions');
    }

    // Check for network commands
    if (command.includes('curl') || command.includes('wget')) {
      warnings.push('Command makes network requests');
      suggestions.push('Ensure network connectivity and validate URLs');
    }

    return {
      valid: true, // Command syntax is valid (we don't do deep syntax validation)
      safe,
      warnings,
      suggestions,
    };
  }

  /**
   * Optimize command for better performance
   */
  async optimizeCommand(
    command: string,
    context: ContextInfo
  ): Promise<{
    optimized: string;
    original: string;
    reason: string;
    applied: boolean;
  }> {
    // Simple optimization logic - would be more sophisticated in real implementation
    let optimized = command;
    let applied = false;
    let reason = 'No optimization applied';

    // Example optimization: limit output for find commands
    if (
      command.includes('find') &&
      !command.includes('head') &&
      !command.includes('tail')
    ) {
      optimized = `${command} | head -20`;
      applied = true;
      reason = 'Limited output to first 20 results for performance';
    }

    // Example optimization: add progress for long-running commands
    if (command.includes('cp') && command.includes('-r')) {
      optimized = command.replace('cp ', 'cp -v ');
      applied = true;
      reason = 'Added verbose output for large copy operations';
    }

    return {
      optimized,
      original: command,
      reason,
      applied,
    };
  }

  /**
   * Suggest commands based on context
   */
  async suggestCommands(
    context: ContextInfo,
    limit?: number
  ): Promise<
    Array<{
      command: string;
      description: string;
      confidence: number;
    }>
  > {
    const suggestions: Array<{
      command: string;
      description: string;
      confidence: number;
    }> = [];

    // Context-based suggestions
    if (context.projectType === 'node') {
      suggestions.push(
        {
          command: 'npm install',
          description: 'Install Node.js dependencies',
          confidence: 0.9,
        },
        { command: 'npm test', description: 'Run test suite', confidence: 0.8 },
        {
          command: 'npm run build',
          description: 'Build project',
          confidence: 0.7,
        }
      );
    }

    if (context.projectType === 'python') {
      suggestions.push(
        {
          command: 'pip install -r requirements.txt',
          description: 'Install Python dependencies',
          confidence: 0.9,
        },
        {
          command: 'python -m pytest',
          description: 'Run Python tests',
          confidence: 0.8,
        }
      );
    }

    if (context.gitStatus && context.gitStatus.includes('modified')) {
      suggestions.push(
        {
          command: 'git status',
          description: 'Check git status',
          confidence: 0.95,
        },
        {
          command: 'git add .',
          description: 'Stage all changes',
          confidence: 0.7,
        },
        {
          command: 'git commit -m "Update"',
          description: 'Commit changes',
          confidence: 0.6,
        }
      );
    }

    // Apply limit if specified
    return limit ? suggestions.slice(0, limit) : suggestions;
  }

  /**
   * Parse command for structure and components
   */
  parseCommand(command: string): {
    program: string;
    args: string[];
    pipes: boolean;
    redirects: boolean;
    background: boolean;
  } {
    const parts = command.trim().split(/\s+/);
    const program = parts[0] || '';
    const args = parts.slice(1);

    return {
      program,
      args,
      pipes: command.includes('|'),
      redirects: command.includes('>') || command.includes('<'),
      background: command.endsWith('&'),
    };
  }

  /**
   * Get command history
   */
  async getHistory(limit?: number): Promise<
    Array<{
      command: string;
      timestamp: string;
      exitCode: number;
      duration: number;
    }>
  > {
    // This would get history from the memory service
    // For now, return empty array as placeholder
    return [];
  }

  /**
   * Get service health status
   */
  getHealthStatus(): {
    status: 'healthy' | 'degraded' | 'unhealthy';
    details: Record<string, unknown>;
  } {
    if (!this.initialized) {
      return {
        status: 'unhealthy',
        details: { error: 'Service not initialized' },
      };
    }

    return {
      status: 'healthy',
      details: {
        initialized: this.initialized,
        platform: process.platform,
        shell: process.env.SHELL,
      },
    };
  }
}
