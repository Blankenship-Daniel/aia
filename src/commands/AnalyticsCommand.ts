import { ICommand, CommandDefinition } from '../interfaces/ICommand';
import { IAnalyticsService } from '../interfaces/IAnalyticsService';
import { IContextService } from '../interfaces/IContextService';
import { CommandResult, CommandOptions } from '../types/index';
// @ts-ignore - chalk may not have types available
const { Chalk } = require('chalk');
// Instantiate Chalk for color methods in CommonJS context
const chalk = new Chalk({ level: 3 });
import Table from 'cli-table3';
import boxen from 'boxen';
import { UXEnhancements } from '../utils/UXEnhancements';

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

  /**
   * Gets definition
   * 
   * @returns CommandDefinition - Return value description
   */
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

  /**
   * Gets name
   * 
   * @returns string - Return value description
   */
  getName(): string {
    return 'analytics';
  }

  /**
   * Gets aliases
   * 
   * @returns string[] - Return value description
   */
  getAliases(): string[] {
    return ['insights', 'metrics'];
  }

  /**
   * Validates args
   * 
   * @param args - Parameter description
   * 
   * @returns  - Return value description
   */
  validateArgs(args: string[]): { valid: boolean; errors: string[] } {
    return {
      valid: true,
      errors: [],
    };
  }

  /**
   * Gets help
   * 
   * @returns string - Return value description
   */
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

  /**
   * Handles showUsageAnalytics operation
   * 
   * @returns Promise<void> - Return value description
   */
  private async showUsageAnalytics(): Promise<void> {
    // Create gradient header with responsive layout
    console.log(
      UXEnhancements.createBrandedHeader('Usage Analytics', 'primary')
    );

    const startTime = Date.now();
    const analytics = await this.analyticsService.getUsageAnalytics();
    const loadTime = Date.now() - startTime;

    // Summary metrics table with enhanced symbols
    const summaryTable = new Table({
      head: [
        chalk.cyan.bold('Metric'),
        chalk.cyan.bold('Value'),
        chalk.cyan.bold('Status'),
      ],
      style: {
        head: [],
        border: ['cyan'],
        'padding-left': 1,
        'padding-right': 1,
      },
      colWidths: [25, 15, 15],
    });

    // Use cross-platform symbols from UXEnhancements
    summaryTable.push(
      [
        `${UXEnhancements.getSymbol('info')} Total Commands`,
        chalk.yellow(analytics.totalCommands.toString()),
        analytics.totalCommands > 100
          ? UXEnhancements.createStatusIndicator('success', 'High')
          : UXEnhancements.createStatusIndicator('info', 'Normal'),
      ],
      [
        `${UXEnhancements.getSymbol('star')} Unique Features`,
        chalk.yellow(analytics.uniqueFeatures.toString()),
        analytics.uniqueFeatures > 10
          ? UXEnhancements.createStatusIndicator('success', 'Diverse')
          : UXEnhancements.createStatusIndicator('warning', 'Growing'),
      ],
      [
        `${UXEnhancements.getSymbol('play')} Average Session`,
        chalk.cyan(analytics.averageSessionLength.toFixed(1) + 's'),
        analytics.averageSessionLength > 60
          ? UXEnhancements.createStatusIndicator('success', 'Engaged')
          : UXEnhancements.createStatusIndicator('info', 'Quick'),
      ],
      [
        `${UXEnhancements.getSymbol('star')} Productivity Score`,
        chalk.green(analytics.productivityScore.toFixed(1) + '/10'),
        analytics.productivityScore > 8
          ? UXEnhancements.createStatusIndicator('success', 'Excellent')
          : analytics.productivityScore > 6
          ? UXEnhancements.createStatusIndicator('warning', 'Good')
          : UXEnhancements.createStatusIndicator('error', 'Needs Work'),
      ]
    );

    console.log(summaryTable.toString());

    // Show timing information
    console.log(UXEnhancements.createTimingDisplay(loadTime));

    // Send notification for significant metrics
    if (analytics.productivityScore > 8) {
      UXEnhancements.showNotification(
        'AIA Analytics',
        `Excellent productivity score: ${analytics.productivityScore.toFixed(
          1
        )}/10!`,
        'success'
      );
    }

    // Most used commands table
    if (analytics.mostUsedCommands.length > 0) {
      console.log(chalk.green.bold('\n🏆 Most Used Commands:'));

      const commandsTable = new Table({
        head: [
          chalk.cyan.bold('Rank'),
          chalk.cyan.bold('Command'),
          chalk.cyan.bold('Count'),
          chalk.cyan.bold('Avg Time'),
          chalk.cyan.bold('Success Rate'),
        ],
        style: {
          head: [],
          border: ['green'],
          'padding-left': 1,
          'padding-right': 1,
        },
        colWidths: [6, 20, 8, 12, 15],
      });

      analytics.mostUsedCommands.slice(0, 8).forEach((cmd, index) => {
        const successIcon =
          cmd.successRate > 0.8 ? '✅' : cmd.successRate > 0.6 ? '⚠️' : '❌';
        const successRate = `${(cmd.successRate * 100).toFixed(
          1
        )}% ${successIcon}`;

        commandsTable.push([
          chalk.yellow((index + 1).toString()),
          chalk.cyan(cmd.command),
          chalk.white(cmd.count.toString()),
          chalk.yellow(cmd.averageTime.toFixed(1) + 'ms'),
          cmd.successRate > 0.8
            ? chalk.green(successRate)
            : cmd.successRate > 0.6
            ? chalk.yellow(successRate)
            : chalk.red(successRate),
        ]);
      });

      console.log(commandsTable.toString());
    }

    // Feature adoption table
    if (analytics.featureAdoption.length > 0) {
      console.log(chalk.green.bold('\n🚀 Feature Adoption:'));

      const featuresTable = new Table({
        head: [
          chalk.cyan.bold('Feature'),
          chalk.cyan.bold('Category'),
          chalk.cyan.bold('Usage Level'),
        ],
        style: {
          head: [],
          border: ['magenta'],
          'padding-left': 1,
          'padding-right': 1,
        },
        colWidths: [25, 15, 15],
      });

      analytics.featureAdoption.slice(0, 5).forEach((feature) => {
        const freqColor =
          feature.frequency === 'high'
            ? chalk.green
            : feature.frequency === 'medium'
            ? chalk.yellow
            : chalk.gray;
        featuresTable.push([
          chalk.cyan(feature.feature),
          chalk.white(feature.category),
          freqColor(feature.frequency.toUpperCase()),
        ]);
      });

      console.log(featuresTable.toString());
    }

    // Usage patterns
    console.log(chalk.green.bold('\n⏰ Usage Patterns:'));
    const patternsTable = new Table({
      head: [chalk.cyan.bold('Pattern'), chalk.cyan.bold('Value')],
      style: {
        head: [],
        border: ['yellow'],
        'padding-left': 1,
        'padding-right': 1,
      },
      colWidths: [25, 30],
    });

    patternsTable.push(
      [
        'Most Productive Time',
        chalk.cyan(analytics.timeDistribution.mostProductiveTime),
      ],
      [
        'Peak Hours',
        analytics.timeDistribution.peakHours.map((h) => `${h}:00`).join(', '),
      ]
    );

    console.log(patternsTable.toString());

    // Error patterns
    if (analytics.errorPatterns.length > 0) {
      console.log(chalk.yellow.bold('\n⚠️  Error Patterns:'));

      const errorsTable = new Table({
        head: [
          chalk.cyan.bold('Error Type'),
          chalk.cyan.bold('Frequency'),
          chalk.cyan.bold('Commands'),
        ],
        style: {
          head: [],
          border: ['red'],
          'padding-left': 1,
          'padding-right': 1,
        },
        colWidths: [20, 12, 35],
      });

      analytics.errorPatterns.slice(0, 3).forEach((error) => {
        errorsTable.push([
          chalk.red(error.errorType),
          chalk.yellow(error.frequency.toString()),
          chalk.gray(error.commands.join(', ')),
        ]);
      });

      console.log(errorsTable.toString());
    }
  }

  /**
   * Handles showPerformanceAnalytics operation
   * 
   * @returns Promise<void> - Return value description
   */
  private async showPerformanceAnalytics(): Promise<void> {
    console.log(
      boxen(chalk.yellow.bold('⚡ Performance Analytics'), {
        padding: 1,
        margin: 1,
        borderStyle: 'double',
        borderColor: 'yellow',
      })
    );

    const analytics = await this.analyticsService.getPerformanceAnalytics();

    // Performance summary table
    const summaryTable = new Table({
      head: [
        chalk.cyan.bold('Metric'),
        chalk.cyan.bold('Value'),
        chalk.cyan.bold('Rating'),
      ],
      style: {
        head: [],
        border: ['yellow'],
        'padding-left': 1,
        'padding-right': 1,
      },
      colWidths: [25, 15, 15],
    });

    const avgExecTime = analytics.averageExecutionTime;
    const cacheEff = analytics.cacheEfficiency * 100;
    const perfGain = analytics.performanceImprovement;

    summaryTable.push(
      [
        '📊 Average Execution',
        chalk.cyan(avgExecTime.toFixed(1) + 'ms'),
        avgExecTime < 100
          ? chalk.green('Excellent')
          : avgExecTime < 500
          ? chalk.yellow('Good')
          : chalk.red('Slow'),
      ],
      [
        '🎯 Cache Efficiency',
        chalk.green(cacheEff.toFixed(1) + '%'),
        cacheEff > 80
          ? chalk.green('High')
          : cacheEff > 60
          ? chalk.yellow('Medium')
          : chalk.red('Low'),
      ],
      [
        '⚡ Performance Gain',
        chalk.green(perfGain.toFixed(1) + 'x'),
        perfGain > 2
          ? chalk.green('Excellent')
          : perfGain > 1.5
          ? chalk.yellow('Good')
          : chalk.red('Minimal'),
      ]
    );

    console.log(summaryTable.toString());

    // Command performance table
    if (analytics.commandPerformance.length > 0) {
      console.log(chalk.green.bold('\n📈 Command Performance:'));

      const perfTable = new Table({
        head: [
          chalk.cyan.bold('Rank'),
          chalk.cyan.bold('Command'),
          chalk.cyan.bold('Avg Time'),
          chalk.cyan.bold('Success Rate'),
          chalk.cyan.bold('Cache Hit'),
        ],
        style: {
          head: [],
          border: ['green'],
          'padding-left': 1,
          'padding-right': 1,
        },
        colWidths: [6, 20, 12, 12, 12],
      });

      analytics.commandPerformance.slice(0, 5).forEach((cmd, index) => {
        const hitRate = cmd.cacheHitRate
          ? `${(cmd.cacheHitRate * 100).toFixed(0)}%`
          : 'N/A';
        const successRate = `${(cmd.successRate * 100).toFixed(0)}%`;

        perfTable.push([
          chalk.yellow((index + 1).toString()),
          chalk.cyan(cmd.command),
          chalk.white(cmd.averageTime.toFixed(1) + 'ms'),
          cmd.successRate > 0.9
            ? chalk.green(successRate)
            : cmd.successRate > 0.7
            ? chalk.yellow(successRate)
            : chalk.red(successRate),
          cmd.cacheHitRate && cmd.cacheHitRate > 0.8
            ? chalk.green(hitRate)
            : cmd.cacheHitRate && cmd.cacheHitRate > 0.5
            ? chalk.yellow(hitRate)
            : chalk.gray(hitRate),
        ]);
      });

      console.log(perfTable.toString());
    }

    // Slowest commands table
    if (analytics.slowestCommands.length > 0) {
      console.log(
        chalk.yellow.bold('\n🐌 Slowest Commands (Need Optimization):')
      );

      const slowTable = new Table({
        head: [
          chalk.cyan.bold('Rank'),
          chalk.cyan.bold('Command'),
          chalk.cyan.bold('Avg Time'),
          chalk.cyan.bold('Impact'),
        ],
        style: {
          head: [],
          border: ['red'],
          'padding-left': 1,
          'padding-right': 1,
        },
        colWidths: [6, 25, 15, 15],
      });

      analytics.slowestCommands.slice(0, 3).forEach((cmd, index) => {
        const impact =
          cmd.averageTime > 1000
            ? 'High'
            : cmd.averageTime > 500
            ? 'Medium'
            : 'Low';
        const impactColor =
          cmd.averageTime > 1000
            ? chalk.red
            : cmd.averageTime > 500
            ? chalk.yellow
            : chalk.green;

        slowTable.push([
          chalk.yellow((index + 1).toString()),
          chalk.cyan(cmd.command),
          chalk.red(cmd.averageTime.toFixed(1) + 'ms'),
          impactColor(impact),
        ]);
      });

      console.log(slowTable.toString());
    }

    // Fastest commands
    if (analytics.fastestCommands.length > 0) {
      console.log(chalk.green.bold('\n🚀 Fastest Commands:'));

      const fastTable = new Table({
        head: [
          chalk.cyan.bold('Rank'),
          chalk.cyan.bold('Command'),
          chalk.cyan.bold('Avg Time'),
          chalk.cyan.bold('Efficiency'),
        ],
        style: {
          head: [],
          border: ['green'],
          'padding-left': 1,
          'padding-right': 1,
        },
        colWidths: [6, 25, 15, 15],
      });

      analytics.fastestCommands.slice(0, 3).forEach((cmd, index) => {
        fastTable.push([
          chalk.yellow((index + 1).toString()),
          chalk.cyan(cmd.command),
          chalk.green(cmd.averageTime.toFixed(1) + 'ms'),
          chalk.green('Optimal'),
        ]);
      });

      console.log(fastTable.toString());
    }

    // Performance trends
    if (analytics.performanceTrends.length > 0) {
      console.log(chalk.green.bold('\n📊 Recent Performance Trends:'));

      const trendsTable = new Table({
        head: [
          chalk.cyan.bold('Date'),
          chalk.cyan.bold('Avg Time'),
          chalk.cyan.bold('Commands'),
          chalk.cyan.bold('Trend'),
        ],
        style: {
          head: [],
          border: ['blue'],
          'padding-left': 1,
          'padding-right': 1,
        },
        colWidths: [15, 12, 12, 12],
      });

      const recent = analytics.performanceTrends.slice(-3);
      recent.forEach((trend, index) => {
        const date = trend.date.toDateString().split(' ').slice(1, 3).join(' ');
        const trendIcon =
          index === recent.length - 1
            ? '→'
            : trend.averageTime < recent[index + 1]?.averageTime
            ? '↑'
            : '↓';

        trendsTable.push([
          chalk.white(date),
          chalk.cyan(trend.averageTime.toFixed(1) + 'ms'),
          chalk.yellow(trend.commandCount.toString()),
          trend.averageTime < 200
            ? chalk.green(trendIcon)
            : chalk.yellow(trendIcon),
        ]);
      });

      console.log(trendsTable.toString());
    }
  }

  /**
   * Handles showProductivityReport operation
   * 
   * @returns Promise<void> - Return value description
   */
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

  /**
   * Handles showUsageTrends operation
   * 
   * @param options - Parameter description
   * 
   * @returns Promise<void> - Return value description
   */
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

  /**
   * Handles showRecommendations operation
   * 
   * @returns Promise<void> - Return value description
   */
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

  /**
   * Handles exportAnalytics operation
   * 
   * @param options - Parameter description
   * 
   * @returns Promise<void> - Return value description
   */
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

  /**
   * Handles clearAnalytics operation
   * 
   * @param options - Parameter description
   * 
   * @returns Promise<void> - Return value description
   */
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

  /**
   * Gets insighticon
   * 
   * @param type - Parameter description
   * 
   * @returns string - Return value description
   */
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
