/**
 * Advanced Error Analysis Service
 * Provides intelligent error diagnosis and recovery suggestions
 * Now powered by AI through the IErrorDiagnosticService
 */
import { ExecutionStep } from '../types/index';
import chalk from 'chalk';
import {
  IErrorDiagnosticService,
  ErrorDiagnosis,
  ExecutionError,
  ExecutionContext,
} from '../interfaces/IErrorDiagnosticService';

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
  constructor(private errorDiagnosticService: IErrorDiagnosticService) {}

  /**
   * Analyze error using AI-powered diagnostics (async version)
   */
  async analyzeError(
    error: string,
    step: ExecutionStep,
    context?: any
  ): Promise<ErrorAnalysis> {
    try {
      // Create ExecutionError and ExecutionContext for AI analysis
      const executionError: ExecutionError = {
        message: error,
        stack: error,
        timestamp: new Date(),
        step: step,
        context: this.createExecutionContext(step, context),
      };

      const executionContext = this.createExecutionContext(step, context);

      // Use AI-powered error analysis
      const aiDiagnosis = await this.errorDiagnosticService.analyzeError(
        executionError,
        executionContext
      );

      // Convert AI analysis to ErrorAnalysis format
      return this.convertAIDiagnosisToErrorAnalysis(aiDiagnosis, step, error);
    } catch (aiError) {
      // Fallback to basic analysis if AI fails
      console.warn('AI error analysis failed, using fallback:', aiError);
      return this.createFallbackAnalysis(error, step);
    }
  }

  /**
   * Synchronous error analysis for backward compatibility
   * Uses fallback analysis when AI is not available
   */
  analyzeErrorSync(
    error: string,
    step: ExecutionStep,
    context?: any
  ): ErrorAnalysis {
    return this.createFallbackAnalysis(error, step);
  }

  private createExecutionContext(
    step: ExecutionStep,
    context?: any
  ): ExecutionContext {
    return {
      command: step.command,
      workingDirectory: process.cwd(),
      environment: process.env as Record<string, string>,
      systemInfo: {
        platform: process.platform,
        architecture: process.arch,
        nodeVersion: process.version,
        shell: process.env.SHELL || 'unknown',
        availableMemory: 0, // Will be filled by actual implementation
        diskSpace: 0, // Will be filled by actual implementation
      },
      projectContext: context?.projectContext,
      userContext: context?.userContext,
      previousErrors: context?.previousErrors,
    };
  }

  private convertAIDiagnosisToErrorAnalysis(
    aiDiagnosis: ErrorDiagnosis,
    step: ExecutionStep,
    originalError: string
  ): ErrorAnalysis {
    return {
      category: this.mapAICategoryToErrorCategory(aiDiagnosis.category.primary),
      severity: this.mapAISeverityToErrorSeverity(aiDiagnosis.severity.level),
      description:
        aiDiagnosis.rootCause || `Error in step: ${step.description}`,
      possibleCauses: this.extractPossibleCauses(aiDiagnosis),
      suggestedFixes: this.extractSuggestedFixes(aiDiagnosis),
      recoveryStrategies: this.extractRecoveryStrategies(aiDiagnosis),
      preventionTips: aiDiagnosis.analysis.recommendations
        .filter((r) => r.type === 'prevention')
        .map((r) => r.description),
      relatedDocs: this.extractRelatedDocs(aiDiagnosis),
    };
  }

  private extractPossibleCauses(diagnosis: ErrorDiagnosis): string[] {
    const causes: string[] = [];
    causes.push(diagnosis.analysis.causality.directCause);
    causes.push(...diagnosis.analysis.causality.contributingFactors);
    return causes.filter(Boolean);
  }

  private extractSuggestedFixes(diagnosis: ErrorDiagnosis): string[] {
    return diagnosis.analysis.recommendations
      .filter((r) => r.type === 'immediate_action')
      .map((r) => r.description);
  }

  private extractRecoveryStrategies(diagnosis: ErrorDiagnosis): string[] {
    return diagnosis.analysis.recommendations
      .filter((r) => r.type === 'investigation' || r.type === 'improvement')
      .map((r) => r.description);
  }

  private extractRelatedDocs(diagnosis: ErrorDiagnosis): string[] {
    // Extract any URLs or documentation references from similar cases
    return diagnosis.similarCases
      .flatMap((c) => c.resolution.steps)
      .map((s) => s.command)
      .filter((cmd) => cmd && (cmd.includes('http') || cmd.includes('docs')))
      .filter(Boolean) as string[];
  }

  private mapAICategoryToErrorCategory(
    aiCategory: string
  ): ErrorAnalysis['category'] {
    const categoryMap: Record<string, ErrorAnalysis['category']> = {
      system: 'system',
      permission: 'permission',
      network: 'network',
      configuration: 'configuration',
      dependency: 'dependency',
      syntax: 'syntax',
      runtime: 'system',
      security: 'permission',
      resource: 'system',
      logic: 'syntax',
    };

    return categoryMap[aiCategory.toLowerCase()] || 'unknown';
  }

  private mapAISeverityToErrorSeverity(
    aiSeverity: string
  ): ErrorAnalysis['severity'] {
    const severityMap: Record<string, ErrorAnalysis['severity']> = {
      low: 'low',
      medium: 'medium',
      high: 'high',
      critical: 'critical',
    };

    return severityMap[aiSeverity.toLowerCase()] || 'medium';
  }

  private createFallbackAnalysis(
    error: string,
    step: ExecutionStep
  ): ErrorAnalysis {
    return {
      category: 'unknown',
      severity: 'medium',
      description: `Error in step "${step.description}": ${error.substring(
        0,
        100
      )}${error.length > 100 ? '...' : ''}`,
      possibleCauses: ['Unknown cause - AI analysis unavailable'],
      suggestedFixes: ['Retry the operation', 'Check system logs'],
      recoveryStrategies: ['Manual intervention required'],
      preventionTips: ['Monitor system health'],
      relatedDocs: [],
    };
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

    output += `${categoryIcon} ${chalk.bold('Category:')} ${chalk.cyan(
      analysis.category
    )}\n`;
    output += `${severityColor('●')} ${chalk.bold('Severity:')} ${severityColor(
      analysis.severity
    )}\n`;
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
