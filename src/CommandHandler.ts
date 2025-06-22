// Command Handler Module
// Separates command execution logic from main AIA class

import { spawn, ChildProcess } from 'child_process';
// @ts-ignore - chalk may not have types available
const { Chalk } = require('chalk');
// Instantiate Chalk for color methods in CommonJS context
const chalk = new Chalk({ level: 3 });
// @ts-ignore - inquirer doesn't have types available
import inquirer from 'inquirer';

interface ExecuteCommandOptions {
  autoOptimize?: boolean;
  useShell?: boolean;
  timeout?: number;
  captureOutput?: boolean;
}

interface SpawnCommandOptions {
  useShell?: boolean;
  timeout?: number;
  captureOutput?: boolean;
}

interface CommandResult {
  success: boolean;
  code: number;
  stdout: string;
  stderr: string;
  duration: number;
  command: string;
}

interface CommandRecord {
  command: string;
  timestamp: string;
  workingDirectory: string;
}

interface AIAInstance {
  memory: {
    commands?: CommandRecord[];
    [key: string]: unknown;
  };
  context: {
    workingDirectory: string;
    [key: string]: unknown;
  };
  memoryManager?: {
    memory: unknown;
    [key: string]: unknown;
  };
  commandIntelligence?: {
    suggestCommandOptimization: (
      command: string,
      context: unknown
    ) => {
      suggestion: string;
      reason: string;
    };
  };
  saveMemory?: () => Promise<void>;
}

/**
 * CommandHandler class
 * 
 * TODO: Add class description
 */
class CommandHandler {
  private aia: AIAInstance;
  private activeProcesses: Map<string, ChildProcess>;

  /**
   * Creates an instance of the class
   * 
   * @param aia - Parameter description
   */
  constructor(aia: AIAInstance) {
    this.aia = aia;
    this.activeProcesses = new Map();
  }

  async executeCommand(
    command: string,
    args: string[] = [],
    options: ExecuteCommandOptions = {}
  ): Promise<CommandResult> {
    let {
      autoOptimize = true,
      useShell = false,
      timeout = 300000, // 5 minutes default
      captureOutput = true,
    } = options;

    // If command contains spaces and no args provided, parse it
    if (args.length === 0 && command.includes(' ')) {
      // Parse the command string into command and args
      const parts = command.trim().split(/\s+/);
      command = parts[0];
      args = parts.slice(1);
    }

    let fullCommand = `${command} ${args.join(' ')}`.trim();
    let finalCommand = command;
    let finalArgs = args;

    try {
      // Apply command intelligence if enabled
      if (false && autoOptimize && this.aia.commandIntelligence) {
        // Temporarily disabled
        const optimization =
          this.aia.commandIntelligence!.suggestCommandOptimization(
            fullCommand,
            this.aia.context
          );

        if (
          optimization.suggestion &&
          optimization.suggestion !== fullCommand
        ) {
          console.log(
            chalk.blue('💡 Optimization applied:'),
            chalk.cyan(optimization.suggestion)
          );
          console.log(chalk.gray('Reason:'), optimization.reason);

          // If optimization contains shell operators, use shell execution
          if (/[|&;<>()]/.test(optimization.suggestion)) {
            // Use the optimized command as a single shell command
            finalCommand = optimization.suggestion;
            finalArgs = [];
            useShell = true;
          } else {
            // Parse optimized command for direct execution
            const parts = optimization.suggestion.split(' ');
            finalCommand = parts[0];
            finalArgs = parts.slice(1);
          }
          console.log(chalk.green('✨ Using optimized command automatically'));
        }
      }

      // Record command in memory
      await this.recordCommand(fullCommand);

      // Detect if we need shell execution
      const needsShell = useShell || /[|&;<>()]/.test(fullCommand);

      // Execute the command
      return await this.spawnCommand(finalCommand, finalArgs, {
        useShell: needsShell,
        timeout,
        captureOutput,
      });
    } catch (error) {
      console.error('Command execution failed:', (error as Error).message);
      throw error;
    }
  }

  async spawnCommand(
    command: string,
    args: string[],
    options: SpawnCommandOptions = {}
  ): Promise<CommandResult> {
    const {
      useShell = false,
      timeout = 300000,
      captureOutput = true,
    } = options;

    return new Promise((resolve, reject) => {
      const processOptions = {
        stdio: captureOutput ? ('pipe' as const) : ('inherit' as const),
        shell: useShell,
        cwd: this.aia.context.workingDirectory,
      };

      let child: ChildProcess;

      if (useShell) {
        // For shell commands, use the command as-is (already parsed)
        const fullCommand =
          args.length > 0 ? `${command} ${args.join(' ')}` : command;
        child = spawn('sh', ['-c', fullCommand], processOptions);
      } else {
        // For direct execution
        child = spawn(command, args, processOptions);
      }

      let stdout = '';
      let stderr = '';
      const startTime = Date.now();

      // Track active process
      const processId = Date.now().toString();
      this.activeProcesses.set(processId, child);

      // Set timeout
      const timeoutId = setTimeout(() => {
        child.kill('SIGTERM');
        this.activeProcesses.delete(processId);
        reject(new Error(`Command timed out after ${timeout}ms`));
      }, timeout);

      // Handle stdout
      if (child.stdout) {
        child.stdout.on('data', (data: Buffer) => {
          const output = data.toString();
          if (!captureOutput) {
            process.stdout.write(output);
          }
          stdout += output;
        });
      }

      // Handle stderr
      if (child.stderr) {
        child.stderr.on('data', (data: Buffer) => {
          const output = data.toString();
          if (!captureOutput) {
            process.stderr.write(output);
          }
          stderr += output;
        });
      }

      // Handle process completion
      child.on('close', (code: number | null) => {
        clearTimeout(timeoutId);
        this.activeProcesses.delete(processId);

        const duration = Date.now() - startTime;
        const result: CommandResult = {
          success: code === 0,
          code: code ?? -1,
          stdout,
          stderr,
          duration,
          command: `${command} ${args.join(' ')}`,
        };

        if (code === 0) {
          resolve(result);
        } else {
          const error = new Error(
            `Command failed with exit code ${code}`
          ) as Error & { result: CommandResult };
          error.result = result;
          reject(error);
        }
      });

      // Handle process errors
      child.on('error', (error: Error) => {
        clearTimeout(timeoutId);
        this.activeProcesses.delete(processId);
        reject(error);
      });
    });
  }

  /**
   * Handles recordCommand operation
   * 
   * @param command - Parameter description
   * 
   * @returns Promise<void> - Return value description
   */
  async recordCommand(command: string): Promise<void> {
    if (!this.aia.memory.commands) {
      this.aia.memory.commands = [];
    }

    this.aia.memory.commands.push({
      command,
      timestamp: new Date().toISOString(),
      workingDirectory: this.aia.context.workingDirectory,
    });

    // Keep only last 100 commands
    if (this.aia.memory.commands.length > 100) {
      this.aia.memory.commands = this.aia.memory.commands.slice(-100);
    }

    // Update memory manager
    if (this.aia.memoryManager && this.aia.saveMemory) {
      this.aia.memoryManager.memory = this.aia.memory;
      await this.aia.saveMemory();
    }
  }

  /**
   * Handles killActiveProcesses operation
   */
  killActiveProcesses(): void {
    for (const [id, process] of this.activeProcesses) {
      try {
        process.kill('SIGTERM');
        console.log(chalk.yellow(`Killed process ${id}`));
      } catch (error) {
        console.warn(
          chalk.red(`Failed to kill process ${id}:`, (error as Error).message)
        );
      }
    }
    this.activeProcesses.clear();
  }

  /**
   * Gets activeprocesses
   * 
   * @returns string[] - Return value description
   */
  getActiveProcesses(): string[] {
    return Array.from(this.activeProcesses.keys());
  }
}

export default CommandHandler;
