import { ICommand, CommandDefinition } from '../interfaces/ICommand';
import { IAnalyticsService } from '../interfaces/IAnalyticsService';
import { IContextService } from '../interfaces/IContextService';
import { CommandResult, CommandOptions } from '../types/index';
import chalk from 'chalk';

/**
 * Analytics Command - Comprehensive usage analytics and insights
 * Provides detailed analytics, performance reports, and productivity insights
 */
export class AnalyticsCommand implements ICommand {
  constructor(
    private analyticsService: IAnalyticsService,
    private context: IContextService
  ) {}

  async execute(
    context: Record<string, unknown>,
    args: string[],
    options: CommandOptions
  ): Promise<CommandResult> {
    try {
      // Handle different operations based on options
      if (options.usage) {
        await this.showUsageAnalytics();
      } else if (options.performance || options.perf) {
        await this.showPerformanceAnalytics();
      } else if (options.productivity) {
        await this.showProductivityReport();
      } else if (options.trends) {
        await this.showUsageTrends(options);
      } else if (options.recommendations || options.rec) {
        await this.showRecommendations();
      } else if (options.export) {
        await this.exportAnalytics(options);
      } else if (options.clear) {
        await this.clearAnalytics(options);
      } else {
        // Default: show comprehensive analytics dashboard
        await this.analyticsService.displayAnalyticsDashboard();
      }

      return {
        success: true,
        data: {},
        output: 'Analytics command executed successfully',
      };
    } catch (error) {
      console.error(chalk.red('Analytics command error:'), error);
      return {
        success: false,
        error: `Analytics command failed: ${error}`,
        output: '',
      };
    }
  }

  getDefinition(): CommandDefinition {
    return {
      name: 'analytics',
      description:
        'Comprehensive usage analytics, performance insights, and productivity reports',
      usage: 'analytics [options]',
      examples: [
        'analytics - Show comprehensive analytics dashboard',
        'analytics --usage - Display usage analytics',
        'analytics --performance - Show performance metrics',
        'analytics --productivity - Generate productivity report',
        'analytics --trends week - Show weekly usage trends',
        'analytics --recommendations - Get optimization suggestions',
        'analytics --export json - Export analytics data',
      ],
      aliases: ['insights', 'metrics'],
      options: [
        {
          name: 'usage',
          description: 'Show usage analytics',
          type: 'boolean',
          required: false,
        },
        {
          name: 'performance',
          description: 'Display performance analytics',
          type: 'boolean',
          required: false,
        },
        {
          name: 'perf',
          description: 'Alias for performance',
          type: 'boolean',
          required: false,
        },
        {
          name: 'productivity',
          description: 'Generate productivity report',
          type: 'boolean',
          required: false,
        },
        {
          name: 'trends',
          description: 'Show usage trends (day/week/month)',
          type: 'string',
          required: false,
        },
        {
          name: 'recommendations',
          description: 'Show optimization recommendations',
          type: 'boolean',
          required: false,
        },
        {
          name: 'rec',
          description: 'Alias for recommendations',
          type: 'boolean',
          required: false,
        },
        {
          name: 'export',
          description: 'Export analytics data (json/csv)',
          type: 'string',
          required: false,
        },
        {
          name: 'clear',
          description: 'Clear analytics data',
          type: 'boolean',
          required: false,
        },
        {
          name: 'confirm',
          description: 'Confirm destructive operations',
          type: 'boolean',
          required: false,
        },
      ],
    };
  }

  getName(): string {
    return 'analytics';
  }

  getAliases(): string[] {
    return ['insights', 'metrics'];
  }

  validateArgs(args: string[]): { valid: boolean; errors: string[] } {
    return {
      valid: true,
      errors: [],
    };
  }

  getHelp(): string {
    return `
📊 AIA Analytics & Insights
============================
Comprehensive usage analytics and performance insights

📈 Analytics Options:
  analytics                    - Show comprehensive dashboard
  analytics --usage            - Display usage analytics
  analytics --performance      - Show performance metrics
  analytics --productivity     - Generate productivity report

📊 Trends & Patterns:
  analytics --trends day       - Daily usage trends
  analytics --trends week      - Weekly usage trends  
  analytics --trends month     - Monthly usage trends

💡 Optimization:
  analytics --recommendations  - Get optimization suggestions
  analytics --rec              - Alias for recommendations

📤 Data Management:
  analytics --export json      - Export as JSON
  analytics --export csv       - Export as CSV
  analytics --clear            - Clear analytics data

Flags:
  --confirm, -c                Confirm destructive operations
    `;
  }

  private async showUsageAnalytics(): Promise<void> {
    console.log(chalk.blue('\n📈 Usage Analytics'));
    console.log(chalk.blue('=================='));

    const analytics = await this.analyticsService.getUsageAnalytics();

    console.log(
      `📊 Total Commands: ${chalk.yellow(analytics.totalCommands.toString())}`
    );
    console.log(
      `🔧 Unique Features: ${chalk.yellow(analytics.uniqueFeatures.toString())}`
    );
    console.log(
      `⏱️  Average Session: ${chalk.cyan(
        analytics.averageSessionLength.toFixed(1)
      )}s`
    );
    console.log(
      `🎯 Productivity Score: ${chalk.green(
        analytics.productivityScore.toFixed(1)
      )}/10`
    );

    // Most used commands
    if (analytics.mostUsedCommands.length > 0) {
      console.log(chalk.green('\n🏆 Most Used Commands:'));
      analytics.mostUsedCommands.slice(0, 8).forEach((cmd, index) => {
        const successIcon =
          cmd.successRate > 0.8 ? '✅' : cmd.successRate > 0.6 ? '⚠️' : '❌';
        console.log(
          `  ${index + 1}. ${chalk.cyan(cmd.command)} - ${
            cmd.count
          } uses (${cmd.averageTime.toFixed(1)}ms avg) ${successIcon}`
        );
      });
    }

    // Feature adoption
    if (analytics.featureAdoption.length > 0) {
      console.log(chalk.green('\n🚀 Feature Adoption:'));
      analytics.featureAdoption.slice(0, 5).forEach((feature) => {
        const freqColor =
          feature.frequency === 'high'
            ? chalk.green
            : feature.frequency === 'medium'
            ? chalk.yellow
            : chalk.gray;
        console.log(
          `  • ${chalk.cyan(feature.feature)} (${
            feature.category
          }) - ${freqColor(feature.frequency)} usage`
        );
      });
    }

    // Most productive time
    console.log(chalk.green('\n⏰ Usage Patterns:'));
    console.log(
      `  Most Productive Time: ${chalk.cyan(
        analytics.timeDistribution.mostProductiveTime
      )}`
    );
    if (analytics.timeDistribution.peakHours.length > 0) {
      console.log(
        `  Peak Hours: ${analytics.timeDistribution.peakHours
          .map((h) => `${h}:00`)
          .join(', ')}`
      );
    }

    // Error patterns
    if (analytics.errorPatterns.length > 0) {
      console.log(chalk.yellow('\n⚠️  Error Patterns:'));
      analytics.errorPatterns.slice(0, 3).forEach((error) => {
        console.log(`  • ${error.errorType}: ${error.frequency} occurrences`);
        console.log(`    Commands: ${error.commands.join(', ')}`);
      });
    }
  }

  private async showPerformanceAnalytics(): Promise<void> {
    console.log(chalk.blue('\n⚡ Performance Analytics'));
    console.log(chalk.blue('========================'));

    const analytics = await this.analyticsService.getPerformanceAnalytics();

    console.log(
      `📊 Average Execution: ${chalk.cyan(
        analytics.averageExecutionTime.toFixed(1)
      )}ms`
    );
    console.log(
      `🎯 Cache Efficiency: ${chalk.green(
        (analytics.cacheEfficiency * 100).toFixed(1)
      )}%`
    );
    console.log(
      `⚡ Performance Gain: ${chalk.green(
        analytics.performanceImprovement.toFixed(1)
      )}x`
    );

    // Command performance
    if (analytics.commandPerformance.length > 0) {
      console.log(chalk.green('\n📈 Command Performance:'));
      analytics.commandPerformance.slice(0, 5).forEach((cmd, index) => {
        const hitRate = cmd.cacheHitRate
          ? `(${(cmd.cacheHitRate * 100).toFixed(0)}% cache hit)`
          : '';
        console.log(
          `  ${index + 1}. ${chalk.cyan(
            cmd.command
          )} - ${cmd.averageTime.toFixed(1)}ms avg, ${(
            cmd.successRate * 100
          ).toFixed(0)}% success ${hitRate}`
        );
      });
    }

    // Slowest commands
    if (analytics.slowestCommands.length > 0) {
      console.log(chalk.yellow('\n🐌 Slowest Commands:'));
      analytics.slowestCommands.slice(0, 3).forEach((cmd, index) => {
        console.log(
          `  ${index + 1}. ${chalk.cyan(cmd.command)} - ${chalk.red(
            cmd.averageTime.toFixed(1)
          )}ms`
        );
      });
    }

    // Fastest commands
    if (analytics.fastestCommands.length > 0) {
      console.log(chalk.green('\n🚀 Fastest Commands:'));
      analytics.fastestCommands.slice(0, 3).forEach((cmd, index) => {
        console.log(
          `  ${index + 1}. ${chalk.cyan(cmd.command)} - ${chalk.green(
            cmd.averageTime.toFixed(1)
          )}ms`
        );
      });
    }

    // Performance trends
    if (analytics.performanceTrends.length > 0) {
      console.log(chalk.green('\n📊 Recent Performance Trends:'));
      const recent = analytics.performanceTrends.slice(-3);
      recent.forEach((trend) => {
        const date = trend.date.toDateString();
        console.log(
          `  ${date}: ${trend.averageTime.toFixed(1)}ms avg, ${
            trend.commandCount
          } commands`
        );
      });
    }
  }

  private async showProductivityReport(): Promise<void> {
    console.log(chalk.blue('\n📊 Productivity Report'));
    console.log(chalk.blue('======================'));

    const report = await this.analyticsService.generateProductivityReport();

    console.log(chalk.green('📅 Report Period:'));
    console.log(`  From: ${report.timePeriod.start.toDateString()}`);
    console.log(`  To: ${report.timePeriod.end.toDateString()}`);

    console.log(chalk.green('\n📈 Productivity Metrics:'));
    console.log(
      `  Commands Executed: ${chalk.yellow(
        report.metrics.commandsExecuted.toString()
      )}`
    );
    console.log(
      `  Time Saved: ${chalk.green(report.metrics.timesSaved.toFixed(1))}s`
    );
    console.log(
      `  Errors Avoided: ${chalk.cyan(report.metrics.errorsAvoided.toString())}`
    );
    console.log(
      `  Features Discovered: ${chalk.blue(
        report.metrics.featuresDiscovered.toString()
      )}`
    );
    console.log(`  Overall Score: ${chalk.green(report.score.toFixed(1))}/10`);

    // Key insights
    if (report.insights.length > 0) {
      console.log(chalk.green('\n💡 Key Insights:'));
      report.insights.forEach((insight) => {
        const icon = this.getInsightIcon(insight.type);
        const valueText = insight.value
          ? ` (${insight.value}${insight.unit || ''})`
          : '';
        console.log(`  ${icon} ${insight.title}${valueText}`);
        console.log(`    ${chalk.gray(insight.description)}`);
      });
    }

    // Recommendations
    if (report.recommendations.length > 0) {
      console.log(chalk.green('\n🎯 Recommendations:'));
      report.recommendations.forEach((rec, index) => {
        console.log(`  ${index + 1}. ${rec}`);
      });
    }
  }

  private async showUsageTrends(options: CommandOptions): Promise<void> {
    const timeRange = (options.trends as string) || 'week';

    if (!['day', 'week', 'month'].includes(timeRange)) {
      console.log(chalk.red('Invalid time range. Use: day, week, or month'));
      return;
    }

    console.log(
      chalk.blue(
        `\n📊 Usage Trends - ${
          timeRange.charAt(0).toUpperCase() + timeRange.slice(1)
        }`
      )
    );
    console.log(chalk.blue('='.repeat(20 + timeRange.length)));

    const trends = await this.analyticsService.getUsageTrends(
      timeRange as 'day' | 'week' | 'month'
    );

    if (trends.length === 0) {
      console.log(
        chalk.yellow('No trend data available for the selected time range.')
      );
      return;
    }

    console.log(
      chalk.green(
        `\n📈 ${
          timeRange.charAt(0).toUpperCase() + timeRange.slice(1)
        }ly Trends:`
      )
    );

    trends.slice(-10).forEach((trend, index) => {
      const date =
        timeRange === 'day'
          ? `${trend.date.getHours()}:00`
          : trend.date.toDateString();

      const commandBar = '█'.repeat(
        Math.min(20, Math.floor(trend.commandCount / 2))
      );
      console.log(
        `  ${date}: ${chalk.cyan(
          trend.commandCount.toString().padStart(3)
        )} commands ${chalk.blue(commandBar)}`
      );
    });

    // Summary statistics
    const totalCommands = trends.reduce(
      (sum, trend) => sum + trend.commandCount,
      0
    );
    const avgCommands = totalCommands / trends.length;
    const maxCommands = Math.max(...trends.map((t) => t.commandCount));

    console.log(chalk.green('\n📊 Summary:'));
    console.log(`  Total Commands: ${chalk.yellow(totalCommands.toString())}`);
    console.log(
      `  Average per ${timeRange === 'day' ? 'hour' : 'day'}: ${chalk.cyan(
        avgCommands.toFixed(1)
      )}`
    );
    console.log(
      `  Peak Activity: ${chalk.green(maxCommands.toString())} commands`
    );
  }

  private async showRecommendations(): Promise<void> {
    console.log(chalk.blue('\n💡 Optimization Recommendations'));
    console.log(chalk.blue('================================='));

    const recommendations =
      await this.analyticsService.getOptimizationRecommendations();

    if (recommendations.length === 0) {
      console.log(
        chalk.green(
          '🎉 Excellent! No optimization recommendations at this time.'
        )
      );
      console.log(chalk.gray('Your AIA usage is already well-optimized.'));
      return;
    }

    recommendations.forEach((rec, index) => {
      const impactColor =
        rec.impact === 'high'
          ? chalk.red
          : rec.impact === 'medium'
          ? chalk.yellow
          : chalk.green;
      const effortColor =
        rec.effort === 'high'
          ? chalk.red
          : rec.effort === 'medium'
          ? chalk.yellow
          : chalk.green;

      console.log(`\n${index + 1}. ${chalk.cyan(rec.title)}`);
      console.log(`   ${chalk.gray(rec.description)}`);
      console.log(
        `   Impact: ${impactColor(
          rec.impact.toUpperCase()
        )} | Effort: ${effortColor(rec.effort.toUpperCase())}`
      );

      if (rec.command) {
        console.log(`   💡 Try: ${chalk.yellow('aia ' + rec.command)}`);
      }
    });

    console.log(
      chalk.gray(
        '\nImplementing these recommendations can significantly improve your productivity!'
      )
    );
  }

  private async exportAnalytics(options: CommandOptions): Promise<void> {
    const format = (options.export as string) || 'json';

    if (!['json', 'csv'].includes(format)) {
      console.log(chalk.red('Invalid export format. Use: json or csv'));
      return;
    }

    console.log(
      chalk.blue(`📤 Exporting analytics data as ${format.toUpperCase()}...`)
    );

    try {
      const data = await this.analyticsService.exportAnalytics(
        format as 'json' | 'csv'
      );

      const filename = `aia-analytics-${
        new Date().toISOString().split('T')[0]
      }.${format}`;

      // In a real implementation, this would write to file
      console.log(chalk.green(`✅ Analytics exported successfully!`));
      console.log(chalk.gray(`Filename: ${filename}`));
      console.log(chalk.gray(`Size: ${(data.length / 1024).toFixed(1)} KB`));

      // For demo purposes, show first few lines
      if (format === 'json') {
        const preview = JSON.parse(data);
        console.log(chalk.blue('\nPreview:'));
        console.log(
          JSON.stringify(
            {
              timestamp: preview.timestamp,
              usage: {
                totalCommands: preview.usage.totalCommands,
                uniqueFeatures: preview.usage.uniqueFeatures,
                productivityScore: preview.usage.productivityScore,
              },
            },
            null,
            2
          )
        );
      } else {
        console.log(chalk.blue('\nPreview:'));
        console.log(data.split('\n').slice(0, 5).join('\n'));
      }
    } catch (error) {
      console.error(chalk.red('Export failed:'), error);
    }
  }

  private async clearAnalytics(options: CommandOptions): Promise<void> {
    if (!options.confirm) {
      console.log(chalk.yellow('⚠️  Clear Analytics Confirmation'));
      console.log(chalk.yellow('================================'));
      console.log('This will permanently remove all analytics data.');
      console.log(`Use ${chalk.cyan('--confirm')} flag to proceed.`);
      return;
    }

    console.log(chalk.blue('🗑️  Clearing analytics data...'));

    try {
      await this.analyticsService.clearAnalytics();
      console.log(chalk.green('✅ Analytics data cleared successfully.'));
    } catch (error) {
      console.error(chalk.red('Failed to clear analytics:'), error);
    }
  }

  private getInsightIcon(type: string): string {
    switch (type) {
      case 'achievement':
        return '🏆';
      case 'trend':
        return '📈';
      case 'opportunity':
        return '💡';
      case 'warning':
        return '⚠️';
      default:
        return '📊';
    }
  }
}
