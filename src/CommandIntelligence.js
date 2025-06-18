// Command Intelligence Module
// Provides intelligent command suggestions, predictions, and safety validation

class CommandIntelligence {
  constructor() {
    this.commandPatterns = new Map();
    this.safetyRules = this.initializeSafetyRules();
    this.commandChains = new Map();
    this.platformCommands = this.initializePlatformCommands();
  }

  // Predict next likely commands based on history and context
  predictNextCommands(query, currentContext, commandHistory) {
    try {
      const predictions = [];
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
    } catch (error) {
      console.warn('Command prediction failed:', error.message);
      return [];
    }
  }

  // Validate command safety before execution
  validateCommandSafety(command, context) {
    try {
      const validation = {
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
    } catch (error) {
      console.warn('Safety validation failed:', error.message);
      return { safe: true, warning: null, suggestions: [], blocked: false };
    }
  }

  // Suggest command optimizations
  suggestCommandOptimization(command, context) {
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
          reason: 'Performance optimization available',
        };
      }

      return { suggestion: command, reason: 'No optimization needed' };
    } catch (error) {
      console.warn('Command optimization failed:', error.message);
      return { suggestion: command, reason: 'Optimization analysis failed' };
    }
  }

  // Detect and suggest command chaining
  detectCommandChains(commandHistory) {
    const chains = [];
    const recentCommands = commandHistory.slice(-10);

    for (let i = 0; i < recentCommands.length - 1; i++) {
      const currentCmd = recentCommands[i].command;
      const nextCmd = recentCommands[i + 1].command;

      const chainSuggestion = this.suggestChain(currentCmd, nextCmd);
      if (chainSuggestion) {
        chains.push(chainSuggestion);
      }
    }

    return chains;
  }

  // Generate platform-specific command suggestions
  generatePlatformCommands(platform, context) {
    const platformCmds =
      this.platformCommands[platform] || this.platformCommands.default;
    const contextualCmds = this.filterCommandsByContext(platformCmds, context);

    return contextualCmds;
  }

  // Initialize safety rules
  initializeSafetyRules() {
    return [
      {
        name: 'destructive_operations',
        check: (cmd, ctx) => {
          const destructivePatterns = [
            /rm\s+-rf\s+\//,
            /sudo\s+rm/,
            /rmdir/,
            /del\s+\/s/,
            /format/,
            /dd\s+if=/,
            /mkfs/,
            /fdisk/,
            /parted/,
          ];

          for (const pattern of destructivePatterns) {
            if (pattern.test(cmd)) {
              return {
                warning:
                  'This command may permanently delete files or format drives',
                block: true,
              };
            }
          }
          return {};
        },
      },
      {
        name: 'network_operations',
        check: (cmd, ctx) => {
          const networkPatterns = [/curl.*\|.*sh/, /wget.*\|.*sh/, /nc\s+-l/];

          for (const pattern of networkPatterns) {
            if (pattern.test(cmd)) {
              return {
                warning:
                  'This command downloads and executes code from the internet',
                suggestion: 'Review the script before execution',
              };
            }
          }
          return {};
        },
      },
      {
        name: 'permission_escalation',
        check: (cmd, ctx) => {
          if (/^sudo/.test(cmd)) {
            return {
              warning: 'This command requires elevated privileges',
              suggestion: 'Ensure you understand what the command does',
            };
          }
          return {};
        },
      },
    ];
  }

  // Initialize platform-specific commands
  initializePlatformCommands() {
    return {
      darwin: {
        package_management: ['brew install', 'brew update', 'brew upgrade'],
        system_info: ['system_profiler', 'diskutil list', 'networksetup'],
        development: ['xcode-select', 'codesign', 'instruments'],
      },
      linux: {
        package_management: [
          'apt install',
          'apt update',
          'yum install',
          'dnf install',
        ],
        system_info: ['lscpu', 'lsblk', 'systemctl status'],
        development: ['gcc', 'make', 'gdb'],
      },
      win32: {
        package_management: [
          'choco install',
          'scoop install',
          'winget install',
        ],
        system_info: ['systeminfo', 'wmic', 'Get-ComputerInfo'],
        development: ['msbuild', 'devenv', 'dotnet'],
      },
      default: {
        common: ['ls', 'cd', 'pwd', 'cat', 'grep', 'find'],
        git: ['git status', 'git add', 'git commit', 'git push', 'git pull'],
        development: ['npm install', 'npm start', 'npm test', 'node', 'python'],
      },
    };
  }

  // Suggest optimizations for a command
  suggestOptimizations(command, context) {
    const optimizations = [];

    // Flag optimizations
    const flagSuggestions = this.suggestFlagOptimizations(command);
    if (flagSuggestions.length > 0) {
      optimizations.push({
        type: 'flags',
        suggestions: flagSuggestions,
        confidence: 0.7,
      });
    }

    // Pipeline optimizations
    const pipelineSuggestions = this.suggestPipelineOptimizations(
      command,
      context
    );
    if (pipelineSuggestions.length > 0) {
      optimizations.push({
        type: 'pipeline',
        suggestions: pipelineSuggestions,
        confidence: 0.6,
      });
    }

    // Alternative command suggestions
    const alternatives = this.findCommandAlternatives(command);
    if (alternatives.length > 0) {
      optimizations.push({
        type: 'alternatives',
        suggestions: alternatives,
        confidence: 0.5,
      });
    }

    return optimizations;
  }

  // Helper methods
  findCommandPatterns(commands) {
    const patterns = [];

    for (let i = 0; i < commands.length - 1; i++) {
      const current = commands[i].command;
      const next = commands[i + 1].command;

      const pattern = this.extractPattern(current, next);
      if (pattern) {
        patterns.push(pattern);
      }
    }

    return patterns;
  }

  extractPattern(cmd1, cmd2) {
    // Simple pattern extraction - could be much more sophisticated
    const cmd1Base = cmd1.split(' ')[0];
    const cmd2Base = cmd2.split(' ')[0];

    if (cmd1Base === 'git' && cmd2Base === 'git') {
      return { type: 'git_workflow', commands: [cmd1, cmd2] };
    }

    if (cmd1Base === 'npm' && cmd2Base === 'npm') {
      return { type: 'npm_workflow', commands: [cmd1, cmd2] };
    }

    return null;
  }

  generatePatternPredictions(patterns) {
    const predictions = [];

    for (const pattern of patterns) {
      switch (pattern.type) {
        case 'git_workflow':
          predictions.push(...this.getGitWorkflowPredictions(pattern));
          break;
        case 'npm_workflow':
          predictions.push(...this.getNpmWorkflowPredictions(pattern));
          break;
      }
    }

    return predictions;
  }

  generateContextPredictions(lastCommand, context) {
    const predictions = [];
    const cmd = lastCommand.command;

    // Git context predictions
    if (cmd.startsWith('git')) {
      if (context.gitStatus && context.gitStatus.includes('modified')) {
        predictions.push({
          command: 'git add .',
          confidence: 0.8,
          reason: 'Modified files detected',
        });
      }
    }

    // Package management context
    if (cmd.includes('install') || cmd.includes('add')) {
      predictions.push({
        command: 'npm start',
        confidence: 0.6,
        reason: 'After installing dependencies',
      });
    }

    return predictions;
  }

  generateChainPredictions(command) {
    const chainMap = {
      'git add': ['git commit', 'git status'],
      'git commit': ['git push', 'git status'],
      'npm install': ['npm start', 'npm test', 'npm run build'],
      cd: ['ls', 'pwd', 'git status'],
      mkdir: ['cd', 'ls'],
      touch: ['ls', 'cat', 'vim', 'nano'],
    };

    const baseCmd = command.split(' ').slice(0, 2).join(' ');
    const chains = chainMap[baseCmd] || chainMap[command.split(' ')[0]] || [];

    return chains.map((cmd) => ({
      command: cmd,
      confidence: 0.7,
      reason: 'Common command chain',
    }));
  }

  getCommonStarterCommands(context) {
    const starters = [
      { command: 'ls', confidence: 0.9, reason: 'List directory contents' },
      { command: 'pwd', confidence: 0.8, reason: 'Show current directory' },
      { command: 'git status', confidence: 0.7, reason: 'Check git status' },
    ];

    if (context.projectType === 'package.json') {
      starters.push({
        command: 'npm install',
        confidence: 0.8,
        reason: 'Node.js project detected',
      });
    }

    return starters;
  }

  getGitWorkflowPredictions(pattern) {
    return [
      {
        command: 'git status',
        confidence: 0.9,
        reason: 'Check status in git workflow',
      },
      { command: 'git add .', confidence: 0.7, reason: 'Stage changes' },
      {
        command: 'git commit -m "message"',
        confidence: 0.6,
        reason: 'Commit changes',
      },
    ];
  }

  getNpmWorkflowPredictions(pattern) {
    return [
      {
        command: 'npm start',
        confidence: 0.8,
        reason: 'Start development server',
      },
      { command: 'npm test', confidence: 0.7, reason: 'Run tests' },
      { command: 'npm run build', confidence: 0.6, reason: 'Build project' },
    ];
  }

  findCommandAlternatives(command) {
    const alternatives = {
      'ls -la': ['ls -al', 'ls -l -a', 'exa -la'],
      'cat file.txt': ['less file.txt', 'more file.txt', 'head file.txt'],
      'grep pattern file': ['ag pattern file', 'rg pattern file'],
      'find . -name': ['fd -n', 'locate'],
    };

    return alternatives[command] || [];
  }

  suggestFlagOptimizations(command) {
    const suggestions = [];

    // Suggest verbose flags for learning - return actual commands
    if (command.includes('rm ') && !command.includes('-v')) {
      suggestions.push(command.replace('rm ', 'rm -v '));
    }

    // Suggest safer alternatives - return actual commands
    if (
      command.includes('rm ') &&
      !command.includes('-i') &&
      !command.includes('-v')
    ) {
      suggestions.push(command.replace('rm ', 'rm -i '));
    } else if (
      command.includes('rm ') &&
      !command.includes('-i') &&
      command.includes('-v')
    ) {
      suggestions.push(command.replace('rm -v ', 'rm -iv '));
    }

    // Suggest human-readable output
    if (command.includes('ls -l') && !command.includes('-h')) {
      suggestions.push(command.replace('ls -l', 'ls -lh'));
    }

    if (command.includes('du ') && !command.includes('-h')) {
      suggestions.push(command.replace('du ', 'du -h '));
    }

    if (command.includes('df ') && !command.includes('-h')) {
      suggestions.push(command.replace('df ', 'df -h '));
    }

    return suggestions;
  }

  suggestPipelineOptimizations(command, context) {
    const suggestions = [];

    // Check if we're in an interactive environment
    const isInteractive = process.stdout.isTTY && process.stdin.isTTY;

    // Suggest common pipelines with actual executable commands
    if (command.includes('cat ') && !command.includes('|')) {
      // Only suggest head for potentially large outputs, not less
      suggestions.push(`${command} | head -20`);
      // Only suggest less if in interactive mode
      if (isInteractive) {
        suggestions.push(`${command} | less`);
      }
    }

    if (command.includes('ls ') && !command.includes('|')) {
      // For ls commands, suggest useful pipeline combinations
      if (command === 'ls' || command === 'ls -l' || command === 'ls -la') {
        suggestions.push(`${command} | grep -v "^\\."`); // Filter hidden files
        suggestions.push(`${command} | sort -k5 -n`); // Sort by file size
      }
    }

    if (command.includes('find ') && !command.includes('|')) {
      suggestions.push(`${command} | head -20`);
      suggestions.push(`${command} | sort`);
    }

    if (command.includes('ps ') && !command.includes('|')) {
      suggestions.push(`${command} | grep -v grep`);
    }

    return suggestions;
  }

  suggestChain(cmd1, cmd2) {
    // Suggest combining commands with && or |
    if (cmd1.startsWith('cd ') && cmd2.startsWith('ls')) {
      return {
        original: [cmd1, cmd2],
        optimized: `${cmd1} && ${cmd2}`,
        benefit: 'Combine directory change with listing',
      };
    }

    return null;
  }

  filterCommandsByContext(commands, context) {
    // Filter platform commands based on current context
    return commands.common || [];
  }

  rankPredictions(predictions) {
    // Sort predictions by confidence score
    return predictions.sort((a, b) => b.confidence - a.confidence).slice(0, 5); // Return top 5 predictions
  }
}

module.exports = CommandIntelligence;
