/**
 * Command Intelligence Module
 * Provides intelligent command suggestions, predictions, and safety validation
 */

/**
 * Command pattern definition
 */
interface CommandPattern {
  pattern: string[];
  frequency: number;
  context?: string;
}

/**
 * Safety rule definition
 */
interface SafetyRule {
  name: string;
  check: (command: string, context: any) => SafetyResult;
}

/**
 * Safety validation result
 */
interface SafetyResult {
  warning?: string;
  suggestion?: string;
  block?: boolean;
}

/**
 * Command validation result
 */
interface CommandValidation {
  safe: boolean;
  warning: string | null;
  suggestions: string[];
  blocked: boolean;
}

/**
 * Command prediction
 */
interface CommandPrediction {
  command: string;
  confidence: number;
  reason: string;
  category: 'pattern' | 'context' | 'chain' | 'common';
}

/**
 * Command optimization suggestion
 */
interface CommandOptimization {
  original: string;
  suggestions: string[];
  reason: string;
  efficiency: number;
}

/**
 * Platform-specific commands
 */
interface PlatformCommands {
  [platform: string]: {
    common: string[];
    file: string[];
    process: string[];
    network: string[];
  };
}

/**
 * Command history entry
 */
interface CommandHistoryEntry {
  command: string;
  timestamp: string;
  success: boolean;
  context?: any;
}

/**
 * Command Intelligence Engine
 */
export default class CommandIntelligence {
  private commandPatterns: Map<string, CommandPattern>;
  private safetyRules: SafetyRule[];
  private commandChains: Map<string, string[]>;
  private platformCommands: PlatformCommands;

  constructor() {
    this.commandPatterns = new Map();
    this.safetyRules = this.initializeSafetyRules();
    this.commandChains = new Map();
    this.platformCommands = this.initializePlatformCommands();
    this.initializeCommandChains();
  }

  /**
   * Predict next likely commands based on history and context
   */
  predictNextCommands(
    query: string,
    currentContext: any,
    commandHistory: CommandHistoryEntry[]
  ): CommandPrediction[] {
    try {
      const predictions: CommandPrediction[] = [];
      const recentCommands = commandHistory.slice(-5);
      const lastCommand = recentCommands[recentCommands.length - 1];

      if (!lastCommand) {
        return this.getCommonStarterCommands(currentContext);
      }

      // Pattern-based predictions
      const patterns = this.findCommandPatterns(recentCommands);
      predictions.push(...this.generatePatternPredictions(patterns));

      // Context-based predictions
      const contextPredictions = this.generateContextPredictions(
        lastCommand,
        currentContext
      );
      predictions.push(...contextPredictions);

      // Chain-based predictions
      const chainPredictions = this.generateChainPredictions(
        lastCommand.command
      );
      predictions.push(...chainPredictions);

      return this.rankPredictions(predictions);
    } catch (error: any) {
      console.warn('Command prediction failed:', error.message);
      return [];
    }
  }

  /**
   * Validate command safety before execution
   */
  validateCommandSafety(command: string, context: any): CommandValidation {
    try {
      const validation: CommandValidation = {
        safe: true,
        warning: null,
        suggestions: [],
        blocked: false,
      };

      // Check against safety rules
      for (const rule of this.safetyRules) {
        const result = rule.check(command, context);
        if (result.warning) {
          validation.warning = result.warning;
          validation.safe = false;
        }
        if (result.suggestion) {
          validation.suggestions.push(result.suggestion);
        }
        if (result.block) {
          validation.blocked = true;
          validation.safe = false;
        }
      }

      return validation;
    } catch (error: any) {
      console.warn('Safety validation failed:', error.message);
      return { safe: true, warning: null, suggestions: [], blocked: false };
    }
  }

  /**
   * Suggest command optimizations
   */
  suggestCommandOptimization(
    command: string,
    context: any
  ): { suggestion: string; reason: string } {
    try {
      const optimizations = this.suggestOptimizations(command, context);

      if (optimizations.length > 0) {
        const bestOptimization = optimizations[0];
        const suggestion = bestOptimization.suggestions[0] || command;

        // Safety check: don't suggest interactive commands in non-interactive environments
        if (
          !process.stdout.isTTY &&
          (suggestion.includes('| less') || suggestion.includes('| more'))
        ) {
          return {
            suggestion: command,
            reason: 'No safe optimization available',
          };
        }

        return {
          suggestion,
          reason: bestOptimization.reason,
        };
      }

      return {
        suggestion: command,
        reason: 'No optimization needed',
      };
    } catch (error: any) {
      console.warn('Command optimization failed:', error.message);
      return {
        suggestion: command,
        reason: 'Optimization failed',
      };
    }
  }

  /**
   * Initialize safety rules
   */
  private initializeSafetyRules(): SafetyRule[] {
    return [
      {
        name: 'destructive_commands',
        check: (command: string, context: any): SafetyResult => {
          const destructivePatterns = [
            /rm\s+-rf\s+\/[^\/\s]*/,
            /rm\s+-rf\s+\*/,
            /sudo\s+rm\s+-rf/,
            /dd\s+if=/,
            /mkfs/,
            /fdisk/,
            /format/,
          ];

          for (const pattern of destructivePatterns) {
            if (pattern.test(command)) {
              return {
                warning:
                  'This command can permanently delete files or format disks',
                suggestion:
                  'Double-check your command and consider using --dry-run first',
                block: true,
              };
            }
          }

          return {};
        },
      },
      {
        name: 'network_security',
        check: (command: string, context: any): SafetyResult => {
          if (command.includes('curl') && command.includes('| sh')) {
            return {
              warning: 'Executing downloaded scripts can be dangerous',
              suggestion: 'Download and inspect the script before executing',
            };
          }

          if (command.includes('wget') && command.includes('| bash')) {
            return {
              warning: 'Executing downloaded scripts can be dangerous',
              suggestion: 'Download and inspect the script before executing',
            };
          }

          return {};
        },
      },
      {
        name: 'sudo_usage',
        check: (command: string, context: any): SafetyResult => {
          if (command.startsWith('sudo ')) {
            return {
              warning: 'This command will run with administrator privileges',
              suggestion: 'Make sure you understand what this command does',
            };
          }

          return {};
        },
      },
      {
        name: 'interactive_commands',
        check: (command: string, context: any): SafetyResult => {
          const interactiveCommands = [
            'vi',
            'vim',
            'nano',
            'emacs',
            'less',
            'more',
            'top',
            'htop',
          ];
          const commandName = command.split(' ')[0];

          if (
            interactiveCommands.includes(commandName) &&
            !process.stdout.isTTY
          ) {
            return {
              warning: 'This command requires interactive terminal',
              suggestion: 'Run this command in an interactive terminal session',
            };
          }

          return {};
        },
      },
    ];
  }

  /**
   * Initialize platform-specific commands
   */
  private initializePlatformCommands(): PlatformCommands {
    return {
      win32: {
        common: ['dir', 'type', 'copy', 'move', 'del', 'mkdir', 'rmdir'],
        file: ['attrib', 'xcopy', 'robocopy', 'fc'],
        process: ['tasklist', 'taskkill', 'wmic'],
        network: ['ping', 'ipconfig', 'netstat', 'telnet'],
      },
      darwin: {
        common: ['ls', 'cat', 'cp', 'mv', 'rm', 'mkdir', 'rmdir'],
        file: ['find', 'grep', 'chmod', 'chown', 'ln'],
        process: ['ps', 'kill', 'killall', 'lsof'],
        network: ['ping', 'ifconfig', 'netstat', 'curl'],
      },
      linux: {
        common: ['ls', 'cat', 'cp', 'mv', 'rm', 'mkdir', 'rmdir'],
        file: ['find', 'grep', 'chmod', 'chown', 'ln', 'tar'],
        process: ['ps', 'kill', 'killall', 'top', 'htop'],
        network: ['ping', 'ifconfig', 'netstat', 'wget', 'curl'],
      },
    };
  }

  /**
   * Initialize command chains
   */
  private initializeCommandChains(): void {
    // Git command chains
    this.commandChains.set('git status', ['git add', 'git commit', 'git push']);
    this.commandChains.set('git add', ['git commit', 'git status']);
    this.commandChains.set('git commit', ['git push', 'git log', 'git status']);
    this.commandChains.set('git pull', ['git status', 'git log']);
    this.commandChains.set('git clone', ['cd', 'ls', 'git status']);

    // NPM command chains
    this.commandChains.set('npm install', [
      'npm start',
      'npm test',
      'npm run build',
    ]);
    this.commandChains.set('npm init', ['npm install', 'git init']);
    this.commandChains.set('npm test', ['npm run build', 'git add']);

    // File system command chains
    this.commandChains.set('ls', ['cd', 'cat', 'vi', 'rm']);
    this.commandChains.set('cd', ['ls', 'pwd']);
    this.commandChains.set('mkdir', ['cd', 'ls']);
    this.commandChains.set('cat', ['grep', 'less', 'head', 'tail']);

    // Process commands
    this.commandChains.set('ps', ['kill', 'grep']);
    this.commandChains.set('top', ['kill', 'killall']);
  }

  /**
   * Find command patterns in recent history
   */
  private findCommandPatterns(
    commands: CommandHistoryEntry[]
  ): CommandPattern[] {
    const patterns: CommandPattern[] = [];
    const patternMap = new Map<string, number>();

    // Look for sequences of 2-3 commands
    for (let i = 0; i < commands.length - 1; i++) {
      const sequence = commands
        .slice(i, i + 2)
        .map((cmd) => cmd.command.split(' ')[0]);
      const patternKey = sequence.join(' -> ');
      patternMap.set(patternKey, (patternMap.get(patternKey) || 0) + 1);
    }

    for (const [pattern, frequency] of patternMap) {
      if (frequency > 1) {
        patterns.push({
          pattern: pattern.split(' -> '),
          frequency,
        });
      }
    }

    return patterns.sort((a, b) => b.frequency - a.frequency);
  }

  /**
   * Generate predictions based on patterns
   */
  private generatePatternPredictions(
    patterns: CommandPattern[]
  ): CommandPrediction[] {
    const predictions: CommandPrediction[] = [];

    for (const pattern of patterns.slice(0, 3)) {
      if (pattern.pattern.length > 1) {
        const nextCommand = pattern.pattern[1];
        predictions.push({
          command: nextCommand,
          confidence: Math.min(pattern.frequency * 0.2, 0.9),
          reason: `Often follows pattern: ${pattern.pattern.join(' -> ')}`,
          category: 'pattern',
        });
      }
    }

    return predictions;
  }

  /**
   * Generate context-based predictions
   */
  private generateContextPredictions(
    lastCommand: CommandHistoryEntry,
    context: any
  ): CommandPrediction[] {
    const predictions: CommandPrediction[] = [];
    const commandName = lastCommand.command.split(' ')[0];

    // Git context predictions
    if (commandName === 'git' && lastCommand.command.includes('status')) {
      if (context.gitChanges && context.gitChanges.length > 0) {
        predictions.push({
          command: 'git add .',
          confidence: 0.8,
          reason: 'Uncommitted changes detected',
          category: 'context',
        });
      }
    }

    // NPM context predictions
    if (commandName === 'npm' && lastCommand.command.includes('install')) {
      predictions.push({
        command: 'npm start',
        confidence: 0.7,
        reason: 'Start development server after installation',
        category: 'context',
      });
    }

    // File system context predictions
    if (commandName === 'ls' && context.directoryType === 'project') {
      predictions.push({
        command: 'cat package.json',
        confidence: 0.6,
        reason: 'Examine project configuration',
        category: 'context',
      });
    }

    return predictions;
  }

  /**
   * Generate chain-based predictions
   */
  private generateChainPredictions(lastCommand: string): CommandPrediction[] {
    const predictions: CommandPrediction[] = [];
    const commandName = lastCommand.split(' ')[0];
    const fullCommand = lastCommand.toLowerCase();

    // Look for exact matches first
    const exactChain = this.commandChains.get(fullCommand);
    if (exactChain) {
      for (const [index, nextCmd] of exactChain.entries()) {
        predictions.push({
          command: nextCmd,
          confidence: 0.8 - index * 0.1,
          reason: `Common next step after "${fullCommand}"`,
          category: 'chain',
        });
      }
    }

    // Look for command name matches
    for (const [chainKey, chainCommands] of this.commandChains) {
      if (chainKey.startsWith(commandName + ' ') || chainKey === commandName) {
        for (const [index, nextCmd] of chainCommands.entries()) {
          predictions.push({
            command: nextCmd,
            confidence: 0.6 - index * 0.1,
            reason: `Often follows ${commandName} commands`,
            category: 'chain',
          });
        }
        break;
      }
    }

    return predictions;
  }

  /**
   * Get common starter commands for context
   */
  private getCommonStarterCommands(context: any): CommandPrediction[] {
    const predictions: CommandPrediction[] = [];

    // Basic file system exploration
    predictions.push({
      command: 'ls',
      confidence: 0.9,
      reason: 'List directory contents',
      category: 'common',
    });

    predictions.push({
      command: 'pwd',
      confidence: 0.8,
      reason: 'Show current directory',
      category: 'common',
    });

    // Git commands if in a git repository
    if (context.isGitRepo) {
      predictions.push({
        command: 'git status',
        confidence: 0.9,
        reason: 'Check repository status',
        category: 'common',
      });
    }

    // NPM commands if package.json exists
    if (context.hasPackageJson) {
      predictions.push({
        command: 'npm install',
        confidence: 0.8,
        reason: 'Install dependencies',
        category: 'common',
      });
    }

    return predictions;
  }

  /**
   * Suggest command optimizations
   */
  private suggestOptimizations(
    command: string,
    context: any
  ): CommandOptimization[] {
    const optimizations: CommandOptimization[] = [];

    // Add head/tail for large outputs
    if (
      command.includes('cat ') &&
      !command.includes('| head') &&
      !command.includes('| tail')
    ) {
      optimizations.push({
        original: command,
        suggestions: [`${command} | head -20`],
        reason: 'Limit output for large files',
        efficiency: 0.7,
      });
    }

    // Add grep for search patterns
    if (command.includes('ls') && !command.includes('grep')) {
      optimizations.push({
        original: command,
        suggestions: [`${command} | grep <pattern>`],
        reason: 'Filter results with grep',
        efficiency: 0.6,
      });
    }

    // Suggest using -A for git log
    if (command === 'git log' && !command.includes('--oneline')) {
      optimizations.push({
        original: command,
        suggestions: ['git log --oneline -10'],
        reason: 'Show concise commit history',
        efficiency: 0.8,
      });
    }

    return optimizations.sort((a, b) => b.efficiency - a.efficiency);
  }

  /**
   * Get platform-specific commands
   */
  private getPlatformCommands(context: any): string[] {
    const platform = process.platform as keyof PlatformCommands;
    const commands = this.platformCommands[platform];

    if (!commands) {
      return this.platformCommands.linux.common;
    }

    // Filter platform commands based on current context
    return commands.common || [];
  }

  /**
   * Rank predictions by confidence score
   */
  private rankPredictions(
    predictions: CommandPrediction[]
  ): CommandPrediction[] {
    // Sort predictions by confidence score
    return predictions.sort((a, b) => b.confidence - a.confidence).slice(0, 5); // Return top 5 predictions
  }
}
