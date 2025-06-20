/**
 * Advanced Error Analysis Service
 * Provides intelligent error diagnosis and recovery suggestions
 */
import { ExecutionStep } from '../types/index';
import chalk from 'chalk';

export interface ErrorAnalysis {
  category:
    | 'system'
    | 'permission'
    | 'network'
    | 'configuration'
    | 'dependency'
    | 'syntax'
    | 'unknown';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  possibleCauses: string[];
  suggestedFixes: string[];
  recoveryStrategies: string[];
  preventionTips: string[];
  relatedDocs?: string[];
}

export class ErrorAnalysisService {
  private errorPatterns = new Map<RegExp, Partial<ErrorAnalysis>>([
    // System errors
    [
      /command not found|not found/i,
      {
        category: 'system',
        severity: 'high',
        possibleCauses: [
          'Tool not installed',
          'PATH not configured',
          'Typo in command',
        ],
        suggestedFixes: [
          'Install missing tool',
          'Add tool to PATH',
          'Check command spelling',
        ],
        preventionTips: [
          'Verify tool installation before use',
          'Use absolute paths when possible',
        ],
      },
    ],

    // Permission errors
    [
      /permission denied|access denied|not permitted/i,
      {
        category: 'permission',
        severity: 'medium',
        possibleCauses: [
          'Insufficient permissions',
          'File/directory ownership issues',
        ],
        suggestedFixes: [
          'Run with sudo/admin privileges',
          'Change file permissions',
          'Check ownership',
        ],
        recoveryStrategies: [
          'Retry with elevated permissions',
          'Use alternative approach',
        ],
        preventionTips: [
          'Set proper permissions during setup',
          'Use user-specific directories',
        ],
      },
    ],

    // Network errors
    [
      /network|connection|timeout|dns|resolve/i,
      {
        category: 'network',
        severity: 'medium',
        possibleCauses: [
          'Network connectivity issues',
          'DNS resolution problems',
          'Firewall blocking',
        ],
        suggestedFixes: [
          'Check internet connection',
          'Try different DNS servers',
          'Check firewall settings',
        ],
        recoveryStrategies: [
          'Retry after network check',
          'Use offline alternatives',
          'Cache results',
        ],
        preventionTips: [
          'Implement network retry logic',
          'Provide offline fallbacks',
        ],
      },
    ],

    // Configuration errors
    [
      /config|configuration|settings|missing.*file/i,
      {
        category: 'configuration',
        severity: 'medium',
        possibleCauses: [
          'Missing configuration file',
          'Invalid configuration',
          'Wrong file path',
        ],
        suggestedFixes: [
          'Create default configuration',
          'Validate config syntax',
          'Check file paths',
        ],
        recoveryStrategies: [
          'Use default settings',
          'Regenerate configuration',
          'Skip optional config',
        ],
        preventionTips: [
          'Validate configuration on startup',
          'Provide configuration templates',
        ],
      },
    ],

    // Dependency errors
    [
      /module.*not found|cannot resolve|dependency/i,
      {
        category: 'dependency',
        severity: 'high',
        possibleCauses: [
          'Missing dependencies',
          'Version conflicts',
          'Installation incomplete',
        ],
        suggestedFixes: [
          'Install missing dependencies',
          'Update package versions',
          'Clear cache and reinstall',
        ],
        recoveryStrategies: [
          'Use alternative packages',
          'Install specific versions',
          'Rebuild dependencies',
        ],
        preventionTips: [
          'Pin dependency versions',
          'Use lockfiles',
          'Regular dependency audits',
        ],
      },
    ],

    // Syntax errors
    [
      /syntax error|parse error|invalid syntax/i,
      {
        category: 'syntax',
        severity: 'high',
        possibleCauses: [
          'Code syntax errors',
          'Invalid configuration syntax',
          'Wrong file format',
        ],
        suggestedFixes: [
          'Check syntax in editor',
          'Validate file format',
          'Use syntax checker',
        ],
        recoveryStrategies: [
          'Revert to last working version',
          'Use syntax validator',
          'Rebuild file',
        ],
        preventionTips: [
          'Use linting tools',
          'Enable syntax highlighting',
          'Validate before commit',
        ],
      },
    ],
  ]);

  analyzeError(
    error: string,
    step: ExecutionStep,
    context?: any
  ): ErrorAnalysis {
    const errorText = error.toLowerCase();

    // Find matching pattern
    let analysis: Partial<ErrorAnalysis> = {
      category: 'unknown',
      severity: 'medium',
    };

    for (const [pattern, errorAnalysis] of this.errorPatterns) {
      if (pattern.test(errorText)) {
        analysis = { ...analysis, ...errorAnalysis };
        break;
      }
    }

    // Enhance analysis with context
    const enhancedAnalysis = this.enhanceWithContext(
      analysis,
      step,
      context,
      error
    );

    return {
      category: enhancedAnalysis.category || 'unknown',
      severity: enhancedAnalysis.severity || 'medium',
      description:
        enhancedAnalysis.description || `Error in step: ${step.description}`,
      possibleCauses: enhancedAnalysis.possibleCauses || ['Unknown cause'],
      suggestedFixes: enhancedAnalysis.suggestedFixes || [
        'Retry the operation',
      ],
      recoveryStrategies: enhancedAnalysis.recoveryStrategies || [
        'Manual intervention required',
      ],
      preventionTips: enhancedAnalysis.preventionTips || [
        'Monitor system health',
      ],
      relatedDocs: enhancedAnalysis.relatedDocs || [],
    };
  }

  private enhanceWithContext(
    analysis: Partial<ErrorAnalysis>,
    step: ExecutionStep,
    context: any,
    originalError: string
  ): Partial<ErrorAnalysis> {
    const enhanced = { ...analysis };

    // Add command-specific context
    if (step.command) {
      const command = step.command.toLowerCase();

      if (command.includes('git')) {
        enhanced.relatedDocs = ['https://git-scm.com/docs'];
        if (originalError.includes('not a git repository')) {
          enhanced.suggestedFixes = [
            'Run git init first',
            'Check if you are in the correct directory',
          ];
        }
      }

      if (command.includes('npm') || command.includes('yarn')) {
        enhanced.relatedDocs = [
          'https://docs.npmjs.com/',
          'https://yarnpkg.com/getting-started',
        ];
        if (originalError.includes('ENOENT')) {
          enhanced.suggestedFixes = [
            'Run npm install first',
            'Check package.json exists',
          ];
        }
      }

      if (command.includes('docker')) {
        enhanced.relatedDocs = ['https://docs.docker.com/'];
        if (originalError.includes('docker daemon')) {
          enhanced.suggestedFixes = [
            'Start Docker daemon',
            'Check Docker installation',
          ];
        }
      }
    }

    // Add severity based on step importance
    if (step.risks && step.risks.length > 0) {
      enhanced.severity = 'high';
    }

    // Add description with step context
    enhanced.description = `Error in step "${step.description}": ${originalError.substring(0, 100)}${originalError.length > 100 ? '...' : ''}`;

    return enhanced;
  }

  formatErrorAnalysis(analysis: ErrorAnalysis): string {
    const severityColor = {
      low: chalk.green,
      medium: chalk.yellow,
      high: chalk.red,
      critical: chalk.redBright,
    }[analysis.severity];

    const categoryIcon = {
      system: '🖥️',
      permission: '🔒',
      network: '🌐',
      configuration: '⚙️',
      dependency: '📦',
      syntax: '📝',
      unknown: '❓',
    }[analysis.category];

    let output = '\n';
    output += chalk.red('❌ Error Analysis\n');
    output += chalk.gray('━'.repeat(60)) + '\n';

    output += `${categoryIcon} ${chalk.bold('Category:')} ${chalk.cyan(analysis.category)}\n`;
    output += `${severityColor('●')} ${chalk.bold('Severity:')} ${severityColor(analysis.severity)}\n`;
    output += `📝 ${chalk.bold('Description:')} ${analysis.description}\n\n`;

    if (analysis.possibleCauses.length > 0) {
      output += chalk.yellow('🤔 Possible Causes:\n');
      analysis.possibleCauses.forEach((cause, index) => {
        output += `   ${index + 1}. ${cause}\n`;
      });
      output += '\n';
    }

    if (analysis.suggestedFixes.length > 0) {
      output += chalk.green('🔧 Suggested Fixes:\n');
      analysis.suggestedFixes.forEach((fix, index) => {
        output += `   ${index + 1}. ${fix}\n`;
      });
      output += '\n';
    }

    if (analysis.recoveryStrategies.length > 0) {
      output += chalk.blue('🔄 Recovery Strategies:\n');
      analysis.recoveryStrategies.forEach((strategy, index) => {
        output += `   ${index + 1}. ${strategy}\n`;
      });
      output += '\n';
    }

    if (analysis.preventionTips.length > 0) {
      output += chalk.magenta('💡 Prevention Tips:\n');
      analysis.preventionTips.forEach((tip, index) => {
        output += `   ${index + 1}. ${tip}\n`;
      });
      output += '\n';
    }

    if (analysis.relatedDocs && analysis.relatedDocs.length > 0) {
      output += chalk.cyan('📚 Related Documentation:\n');
      analysis.relatedDocs.forEach((doc, index) => {
        output += `   ${index + 1}. ${doc}\n`;
      });
      output += '\n';
    }

    output += chalk.gray('━'.repeat(60));

    return output;
  }

  generateRecoveryPlan(analysis: ErrorAnalysis): string[] {
    const plan: string[] = [];

    // Add immediate fixes
    if (analysis.suggestedFixes.length > 0) {
      plan.push(`Try immediate fix: ${analysis.suggestedFixes[0]}`);
    }

    // Add recovery strategy
    if (analysis.recoveryStrategies.length > 0) {
      plan.push(`Apply recovery strategy: ${analysis.recoveryStrategies[0]}`);
    }

    // Add preventive measures
    if (analysis.preventionTips.length > 0) {
      plan.push(`Implement prevention: ${analysis.preventionTips[0]}`);
    }

    return plan;
  }
}
