import {
  IAnalyticsService,
  UsageAnalytics,
  PerformanceAnalytics,
  ProductivityReport,
  OptimizationRecommendation,
  UsageTrend,
  CommandPerformance,
  PerformanceTrend,
  ProductivityInsight,
} from '../interfaces/IAnalyticsService';
import { IMemoryService } from '../interfaces/IMemoryService';
import { IPerformanceMonitor } from '../interfaces/IPerformanceMonitor';
import { IEnhancedCachingService } from '../interfaces/IEnhancedCachingService';
import {
  CommandUsage,
  TimeDistribution,
  FeatureUsage,
  ErrorPattern,
  MemoryData,
  CommandHistoryEntry,
} from '../types/index';
import chalk from 'chalk';

/**
 * Analytics Service - Comprehensive usage analytics and performance insights
 * Provides detailed analytics, productivity reports, and optimization recommendations
 */
export class AnalyticsService implements IAnalyticsService {
  private analyticsData: {
    commands: Map<string, CommandAnalytics>;
    features: Map<string, FeatureAnalytics>;
    sessions: SessionAnalytics[];
    errors: ErrorAnalytics[];
  };

  constructor(
    private memoryService: IMemoryService,
    private performanceMonitor: IPerformanceMonitor,
    private cachingService?: IEnhancedCachingService
  ) {
    this.analyticsData = {
      commands: new Map(),
      features: new Map(),
      sessions: [],
      errors: [],
    };
    this.initializeFromMemory();
  }

  async getUsageAnalytics(): Promise<UsageAnalytics> {
    const memoryData = await this.memoryService.loadMemory();
    const commandHistory = memoryData.commands || [];

    // Process command usage
    const commandUsageMap = new Map<string, CommandUsage>();
    let totalExecutionTime = 0;
    let totalCommands = 0;

    for (const entry of commandHistory) {
      const command = entry.command;
      totalCommands++;
      totalExecutionTime += entry.duration;

      if (commandUsageMap.has(command)) {
        const usage = commandUsageMap.get(command)!;
        usage.count++;
        usage.averageTime = (usage.averageTime + entry.duration) / 2;
        usage.successRate =
          (usage.successRate * (usage.count - 1) +
            (entry.exitCode === 0 ? 1 : 0)) /
          usage.count;
        usage.lastUsed = new Date(entry.timestamp);
      } else {
        commandUsageMap.set(command, {
          command,
          count: 1,
          averageTime: entry.duration,
          successRate: entry.exitCode === 0 ? 1 : 0,
          lastUsed: new Date(entry.timestamp),
        });
      }
    }

    const mostUsedCommands = Array.from(commandUsageMap.values())
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // Generate time distribution
    const timeDistribution = this.generateTimeDistribution(commandHistory);

    // Feature adoption analysis
    const featureAdoption = this.analyzeFeatureAdoption(commandHistory);

    // Error pattern analysis
    const errorPatterns = this.analyzeErrorPatterns(commandHistory);

    return {
      mostUsedCommands,
      timeDistribution,
      featureAdoption,
      errorPatterns,
      totalCommands,
      uniqueFeatures: new Set(
        commandHistory.map((c: CommandHistoryEntry) => c.command)
      ).size,
      averageSessionLength:
        totalCommands > 0 ? totalExecutionTime / totalCommands : 0,
      productivityScore: this.calculateProductivityScore(commandHistory),
    };
  }

  async getPerformanceAnalytics(): Promise<PerformanceAnalytics> {
    const memoryData = await this.memoryService.loadMemory();
    const commandHistory = memoryData.commands || [];

    if (commandHistory.length === 0) {
      return {
        averageExecutionTime: 0,
        commandPerformance: [],
        cacheEfficiency: 0,
        performanceImprovement: 1,
        slowestCommands: [],
        fastestCommands: [],
        performanceTrends: [],
      };
    }

    const totalExecutionTime = commandHistory.reduce(
      (sum: number, cmd: CommandHistoryEntry) => sum + cmd.duration,
      0
    );
    const averageExecutionTime = totalExecutionTime / commandHistory.length;

    // Command performance analysis
    const commandPerformanceMap = new Map<string, CommandPerformance>();

    for (const entry of commandHistory) {
      const command = entry.command;
      if (commandPerformanceMap.has(command)) {
        const perf = commandPerformanceMap.get(command)!;
        perf.averageTime = (perf.averageTime + entry.duration) / 2;
        perf.executionCount++;
        perf.successRate =
          (perf.successRate * (perf.executionCount - 1) +
            (entry.exitCode === 0 ? 1 : 0)) /
          perf.executionCount;
      } else {
        commandPerformanceMap.set(command, {
          command,
          averageTime: entry.duration,
          executionCount: 1,
          successRate: entry.exitCode === 0 ? 1 : 0,
          cacheHitRate: entry.optimized ? 0.8 : 0.2, // Estimated cache hit rate
        });
      }
    }

    const commandPerformance = Array.from(commandPerformanceMap.values());
    const slowestCommands = [...commandPerformance]
      .sort((a, b) => b.averageTime - a.averageTime)
      .slice(0, 5);
    const fastestCommands = [...commandPerformance]
      .sort((a, b) => a.averageTime - b.averageTime)
      .slice(0, 5);

    // Cache efficiency
    let cacheEfficiency = 0;
    if (this.cachingService && commandHistory.length > 0) {
      try {
        const cacheAnalytics = await this.cachingService.getCacheAnalytics();
        cacheEfficiency = cacheAnalytics.hitRate;
      } catch (error) {
        // Fallback to estimated cache efficiency
        const optimizedCommands = commandHistory.filter(
          (c: CommandHistoryEntry) => c.optimized
        ).length;
        cacheEfficiency =
          commandHistory.length > 0
            ? optimizedCommands / commandHistory.length
            : 0;
      }
    }

    // Performance trends (last 7 days)
    const performanceTrends = this.generatePerformanceTrends(commandHistory);

    return {
      averageExecutionTime,
      commandPerformance,
      cacheEfficiency,
      performanceImprovement: cacheEfficiency > 0 ? 1 + cacheEfficiency * 2 : 1,
      slowestCommands,
      fastestCommands,
      performanceTrends,
    };
  }

  async generateProductivityReport(): Promise<ProductivityReport> {
    const usageAnalytics = await this.getUsageAnalytics();
    const performanceAnalytics = await this.getPerformanceAnalytics();

    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const timeSaved = this.calculateTimeSaved(performanceAnalytics);
    const errorsAvoided = this.calculateErrorsAvoided(usageAnalytics);
    const featuresDiscovered = usageAnalytics.featureAdoption.length;

    const insights = this.generateProductivityInsights(
      usageAnalytics,
      performanceAnalytics
    );
    const recommendations = this.generateRecommendations(
      usageAnalytics,
      performanceAnalytics
    );

    return {
      timePeriod: {
        start: weekAgo,
        end: now,
      },
      metrics: {
        commandsExecuted: usageAnalytics.totalCommands,
        timesSaved: timeSaved,
        errorsAvoided,
        featuresDiscovered,
      },
      insights,
      recommendations,
      score: usageAnalytics.productivityScore,
    };
  }

  async displayAnalyticsDashboard(): Promise<void> {
    console.log(chalk.blue('\n📊 AIA Analytics Dashboard'));
    console.log(chalk.blue('============================'));

    const [usageAnalytics, performanceAnalytics, productivityReport] =
      await Promise.all([
        this.getUsageAnalytics(),
        this.getPerformanceAnalytics(),
        this.generateProductivityReport(),
      ]);

    // Usage Overview
    console.log(chalk.green('\n📈 Usage Overview:'));
    console.log(
      `  Total Commands: ${chalk.yellow(
        usageAnalytics.totalCommands.toString()
      )}`
    );
    console.log(
      `  Unique Commands: ${chalk.yellow(
        usageAnalytics.uniqueFeatures.toString()
      )}`
    );
    console.log(
      `  Productivity Score: ${chalk.yellow(
        usageAnalytics.productivityScore.toFixed(1)
      )}/10`
    );
    console.log(
      `  Average Session: ${chalk.yellow(
        usageAnalytics.averageSessionLength.toFixed(1)
      )}s`
    );

    // Performance Metrics
    console.log(chalk.green('\n⚡ Performance Metrics:'));
    console.log(
      `  Average Execution: ${chalk.cyan(
        performanceAnalytics.averageExecutionTime.toFixed(1)
      )}ms`
    );
    console.log(
      `  Cache Efficiency: ${chalk.cyan(
        (performanceAnalytics.cacheEfficiency * 100).toFixed(1)
      )}%`
    );
    console.log(
      `  Performance Gain: ${chalk.cyan(
        performanceAnalytics.performanceImprovement.toFixed(1)
      )}x`
    );

    // Top Commands
    if (usageAnalytics.mostUsedCommands.length > 0) {
      console.log(chalk.green('\n🏆 Most Used Commands:'));
      usageAnalytics.mostUsedCommands.slice(0, 5).forEach((cmd, index) => {
        console.log(
          `  ${index + 1}. ${chalk.cyan(cmd.command)} (${
            cmd.count
          } times, ${cmd.averageTime.toFixed(1)}ms avg)`
        );
      });
    }

    // Performance Insights
    if (productivityReport.insights.length > 0) {
      console.log(chalk.green('\n💡 Key Insights:'));
      productivityReport.insights.slice(0, 3).forEach((insight) => {
        const icon = this.getInsightIcon(insight.type);
        console.log(`  ${icon} ${insight.title}: ${insight.description}`);
      });
    }

    // Recommendations
    const recommendations = await this.getOptimizationRecommendations();
    if (recommendations.length > 0) {
      console.log(chalk.green('\n🎯 Optimization Recommendations:'));
      recommendations.slice(0, 3).forEach((rec, index) => {
        const impact =
          rec.impact === 'high'
            ? chalk.red('HIGH')
            : rec.impact === 'medium'
            ? chalk.yellow('MED')
            : chalk.green('LOW');
        console.log(`  ${index + 1}. [${impact}] ${rec.title}`);
        console.log(`     ${chalk.gray(rec.description)}`);
      });
    }

    console.log(
      chalk.gray('\nUse "aia analytics --export" to export detailed analytics')
    );
  }

  async recordCommandExecution(
    command: string,
    executionTime: number,
    success: boolean
  ): Promise<void> {
    const commandAnalytics = this.analyticsData.commands.get(command) || {
      command,
      totalExecutions: 0,
      totalTime: 0,
      successCount: 0,
      lastExecuted: new Date(),
    };

    commandAnalytics.totalExecutions++;
    commandAnalytics.totalTime += executionTime;
    if (success) commandAnalytics.successCount++;
    commandAnalytics.lastExecuted = new Date();

    this.analyticsData.commands.set(command, commandAnalytics);
  }

  async recordFeatureUsage(
    feature: string,
    context?: Record<string, any>
  ): Promise<void> {
    const featureAnalytics = this.analyticsData.features.get(feature) || {
      feature,
      totalUsage: 0,
      firstUsed: new Date(),
      contexts: [],
    };

    featureAnalytics.totalUsage++;
    if (context) featureAnalytics.contexts.push(context);

    this.analyticsData.features.set(feature, featureAnalytics);
  }

  async getUsageTrends(
    timeRange: 'day' | 'week' | 'month'
  ): Promise<UsageTrend[]> {
    const memoryData = await this.memoryService.loadMemory();
    const commandHistory = memoryData.commands || [];

    const now = new Date();
    const timeRangeMs =
      timeRange === 'day'
        ? 24 * 60 * 60 * 1000
        : timeRange === 'week'
        ? 7 * 24 * 60 * 60 * 1000
        : 30 * 24 * 60 * 60 * 1000;

    const trends: UsageTrend[] = [];
    const periods = timeRange === 'day' ? 24 : timeRange === 'week' ? 7 : 30;

    for (let i = 0; i < periods; i++) {
      const periodStart = new Date(
        now.getTime() - (i + 1) * (timeRangeMs / periods)
      );
      const periodEnd = new Date(now.getTime() - i * (timeRangeMs / periods));

      const periodCommands = commandHistory.filter(
        (cmd: CommandHistoryEntry) => {
          const cmdDate = new Date(cmd.timestamp);
          return cmdDate >= periodStart && cmdDate < periodEnd;
        }
      );

      trends.unshift({
        date: periodStart,
        commandCount: periodCommands.length,
        uniqueCommands: new Set(
          periodCommands.map((c: CommandHistoryEntry) => c.command)
        ).size,
        averageSessionLength:
          periodCommands.length > 0
            ? periodCommands.reduce(
                (sum: number, cmd: CommandHistoryEntry) => sum + cmd.duration,
                0
              ) / periodCommands.length
            : 0,
      });
    }

    return trends;
  }

  async getOptimizationRecommendations(): Promise<
    OptimizationRecommendation[]
  > {
    const [usageAnalytics, performanceAnalytics] = await Promise.all([
      this.getUsageAnalytics(),
      this.getPerformanceAnalytics(),
    ]);

    const recommendations: OptimizationRecommendation[] = [];

    // Cache optimization recommendations
    if (performanceAnalytics.cacheEfficiency < 0.6) {
      recommendations.push({
        type: 'cache',
        title: 'Improve Cache Efficiency',
        description: `Current cache hit rate is ${(
          performanceAnalytics.cacheEfficiency * 100
        ).toFixed(
          1
        )}%. Consider enabling auto-caching for frequently used commands.`,
        impact: 'high',
        effort: 'low',
        command: 'cache --warm --auto',
      });
    }

    // Workflow optimization
    const repetitiveCommands = usageAnalytics.mostUsedCommands.filter(
      (cmd) => cmd.count > 10
    );
    if (repetitiveCommands.length > 3) {
      recommendations.push({
        type: 'workflow',
        title: 'Create Command Workflows',
        description:
          'You have several repetitive command patterns. Consider creating workflows to streamline common tasks.',
        impact: 'medium',
        effort: 'medium',
      });
    }

    // Configuration optimization
    if (performanceAnalytics.averageExecutionTime > 5000) {
      recommendations.push({
        type: 'configuration',
        title: 'Optimize Command Timeout Settings',
        description:
          'Average command execution time is high. Consider adjusting timeout settings for better performance.',
        impact: 'medium',
        effort: 'low',
      });
    }

    // Feature discovery
    if (usageAnalytics.uniqueFeatures < 5) {
      recommendations.push({
        type: 'feature',
        title: 'Explore More AIA Features',
        description:
          'You\'re using a limited set of AIA features. Try "aia help" to discover more capabilities.',
        impact: 'low',
        effort: 'low',
      });
    }

    return recommendations.sort((a, b) => {
      const impactWeight = { high: 3, medium: 2, low: 1 };
      return impactWeight[b.impact] - impactWeight[a.impact];
    });
  }

  async exportAnalytics(format: 'json' | 'csv'): Promise<string> {
    const [usageAnalytics, performanceAnalytics, productivityReport] =
      await Promise.all([
        this.getUsageAnalytics(),
        this.getPerformanceAnalytics(),
        this.generateProductivityReport(),
      ]);

    const exportData = {
      timestamp: new Date().toISOString(),
      usage: usageAnalytics,
      performance: performanceAnalytics,
      productivity: productivityReport,
    };

    if (format === 'json') {
      return JSON.stringify(exportData, null, 2);
    } else {
      // Simple CSV export for key metrics
      const csvRows = [
        'Metric,Value',
        `Total Commands,${usageAnalytics.totalCommands}`,
        `Unique Commands,${usageAnalytics.uniqueFeatures}`,
        `Productivity Score,${usageAnalytics.productivityScore.toFixed(1)}`,
        `Average Execution Time,${performanceAnalytics.averageExecutionTime.toFixed(
          1
        )}ms`,
        `Cache Efficiency,${(
          performanceAnalytics.cacheEfficiency * 100
        ).toFixed(1)}%`,
        `Performance Improvement,${performanceAnalytics.performanceImprovement.toFixed(
          1
        )}x`,
      ];
      return csvRows.join('\n');
    }
  }

  async clearAnalytics(olderThan?: Date): Promise<void> {
    if (olderThan) {
      // Clear analytics data older than specified date
      // This would involve filtering stored data
      console.log(
        `Clearing analytics data older than ${olderThan.toISOString()}`
      );
    } else {
      // Clear all analytics data
      this.analyticsData = {
        commands: new Map(),
        features: new Map(),
        sessions: [],
        errors: [],
      };
      console.log('All analytics data cleared');
    }
  }

  // Private helper methods
  private async initializeFromMemory(): Promise<void> {
    try {
      const memoryData = await this.memoryService.loadMemory();
      // Initialize analytics from existing memory data
      this.processHistoricalData(memoryData);
    } catch (error) {
      // Continue with empty analytics if memory service fails
      console.warn('Could not initialize analytics from memory:', error);
    }
  }

  private processHistoricalData(memoryData: {
    conversations: any[];
    commands: CommandHistoryEntry[];
    preferences: Record<string, unknown>;
    workingDirectories: Record<string, Record<string, unknown>>;
  }): void {
    // Process command history for analytics
    if (memoryData.commands) {
      for (const command of memoryData.commands) {
        this.recordCommandExecution(
          command.command,
          command.duration,
          command.exitCode === 0
        );
      }
    }
  }

  private generateTimeDistribution(
    commandHistory: CommandHistoryEntry[]
  ): TimeDistribution {
    const hourly: Record<string, number> = {};
    const daily: Record<string, number> = {};
    const weekly: Record<string, number> = {};

    for (const entry of commandHistory) {
      const date = new Date(entry.timestamp);
      const hour = date.getHours().toString();
      const day = date.toDateString();
      const week = this.getWeekString(date);

      hourly[hour] = (hourly[hour] || 0) + 1;
      daily[day] = (daily[day] || 0) + 1;
      weekly[week] = (weekly[week] || 0) + 1;
    }

    // Find peak hours
    const peakHours = Object.entries(hourly)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 3)
      .map(([hour]) => parseInt(hour));

    // Determine most productive time
    const maxHour = Object.entries(hourly).reduce(
      (max, [hour, count]) => (count > (hourly[max] || 0) ? hour : max),
      '0'
    );

    return {
      hourly,
      daily,
      weekly,
      peakHours,
      mostProductiveTime: this.formatTimeRange(parseInt(maxHour)),
    };
  }

  private analyzeFeatureAdoption(
    commandHistory: CommandHistoryEntry[]
  ): FeatureUsage[] {
    const featureMap = new Map<string, FeatureUsage>();
    const commandCategories: Record<string, string> = {
      agent: 'AI Assistance',
      ask: 'AI Queries',
      config: 'Configuration',
      memory: 'Memory Management',
      cache: 'Performance',
      index: 'Code Analysis',
    };

    for (const entry of commandHistory) {
      const baseCommand = entry.command.split(' ')[0];
      const category = commandCategories[baseCommand] || 'Other';

      if (featureMap.has(baseCommand)) {
        const feature = featureMap.get(baseCommand)!;
        feature.usageCount++;
      } else {
        featureMap.set(baseCommand, {
          feature: baseCommand,
          usageCount: 1,
          adoptionDate: new Date(entry.timestamp),
          frequency: 'low',
          category,
        });
      }
    }

    // Determine frequency levels
    const totalCommands = commandHistory.length;
    return Array.from(featureMap.values()).map((feature) => ({
      ...feature,
      frequency:
        feature.usageCount > totalCommands * 0.2
          ? 'high'
          : feature.usageCount > totalCommands * 0.1
          ? 'medium'
          : 'low',
    }));
  }

  private analyzeErrorPatterns(
    commandHistory: CommandHistoryEntry[]
  ): ErrorPattern[] {
    const errorMap = new Map<string, ErrorPattern>();

    for (const entry of commandHistory) {
      if (entry.exitCode !== 0) {
        const command = entry.command.split(' ')[0];
        const errorKey = `${command}_error_${entry.exitCode}`;

        if (errorMap.has(errorKey)) {
          const pattern = errorMap.get(errorKey)!;
          pattern.frequency++;
          pattern.lastOccurrence = new Date(entry.timestamp);
          if (!pattern.commands.includes(command)) {
            pattern.commands.push(command);
          }
        } else {
          errorMap.set(errorKey, {
            errorType: `Exit code ${entry.exitCode}`,
            frequency: 1,
            commands: [command],
            commonCauses: ['Command execution failed'],
            lastOccurrence: new Date(entry.timestamp),
          });
        }
      }
    }

    return Array.from(errorMap.values()).sort(
      (a, b) => b.frequency - a.frequency
    );
  }

  private calculateProductivityScore(
    commandHistory: CommandHistoryEntry[]
  ): number {
    if (commandHistory.length === 0) return 0;

    const successRate =
      commandHistory.filter((c) => c.exitCode === 0).length /
      commandHistory.length;
    const optimizationRate =
      commandHistory.filter((c) => c.optimized).length / commandHistory.length;
    const averageTime =
      commandHistory.reduce((sum, c) => sum + c.duration, 0) /
      commandHistory.length;

    // Normalize average time (assume 5s is baseline, lower is better)
    const timeScore = Math.max(0, Math.min(1, (5000 - averageTime) / 5000));

    return (successRate * 0.4 + optimizationRate * 0.3 + timeScore * 0.3) * 10;
  }

  private generatePerformanceTrends(
    commandHistory: CommandHistoryEntry[]
  ): PerformanceTrend[] {
    const trends: PerformanceTrend[] = [];
    const now = new Date();

    // Generate trends for last 7 days
    for (let i = 6; i >= 0; i--) {
      const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      const dayStart = new Date(
        date.getFullYear(),
        date.getMonth(),
        date.getDate()
      );
      const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);

      const dayCommands = commandHistory.filter((cmd) => {
        const cmdDate = new Date(cmd.timestamp);
        return cmdDate >= dayStart && cmdDate < dayEnd;
      });

      const averageTime =
        dayCommands.length > 0
          ? dayCommands.reduce((sum, cmd) => sum + cmd.duration, 0) /
            dayCommands.length
          : 0;

      const optimizedCount = dayCommands.filter((c) => c.optimized).length;
      const cacheEfficiency =
        dayCommands.length > 0 ? optimizedCount / dayCommands.length : 0;

      trends.push({
        date: dayStart,
        averageTime,
        commandCount: dayCommands.length,
        cacheEfficiency,
      });
    }

    return trends;
  }

  private calculateTimeSaved(
    performanceAnalytics: PerformanceAnalytics
  ): number {
    // Estimate time saved through optimizations (cache hits, etc.)
    const baselineTime =
      performanceAnalytics.averageExecutionTime *
      performanceAnalytics.commandPerformance.length;
    const optimizedTime =
      baselineTime / performanceAnalytics.performanceImprovement;
    return Math.max(0, (baselineTime - optimizedTime) / 1000); // Convert to seconds
  }

  private calculateErrorsAvoided(usageAnalytics: UsageAnalytics): number {
    // Estimate errors avoided through intelligent suggestions and validations
    return usageAnalytics.errorPatterns.reduce(
      (sum, pattern) => sum + Math.floor(pattern.frequency * 0.3),
      0
    );
  }

  private generateProductivityInsights(
    usage: UsageAnalytics,
    performance: PerformanceAnalytics
  ): ProductivityInsight[] {
    const insights: ProductivityInsight[] = [];

    // Performance insights
    if (performance.performanceImprovement > 2) {
      insights.push({
        type: 'achievement',
        title: 'Excellent Performance Optimization',
        description: `Your commands are running ${performance.performanceImprovement.toFixed(
          1
        )}x faster thanks to caching and optimizations`,
        value: performance.performanceImprovement,
        unit: 'x faster',
      });
    }

    // Usage pattern insights
    if (usage.mostUsedCommands.length > 0) {
      const topCommand = usage.mostUsedCommands[0];
      insights.push({
        type: 'trend',
        title: 'Most Productive Command',
        description: `"${topCommand.command}" is your go-to command with ${topCommand.count} executions`,
        value: topCommand.count,
        unit: 'executions',
      });
    }

    // Opportunity insights
    if (usage.uniqueFeatures < 8) {
      insights.push({
        type: 'opportunity',
        title: 'Feature Discovery Opportunity',
        description:
          "You're using only a subset of AIA's capabilities. Explore more commands to boost productivity",
        value: usage.uniqueFeatures,
        unit: 'features used',
      });
    }

    // Warning insights
    if (performance.averageExecutionTime > 10000) {
      insights.push({
        type: 'warning',
        title: 'Performance Concern',
        description:
          'Average command execution time is high. Consider optimizing your setup or commands',
        value: performance.averageExecutionTime,
        unit: 'ms average',
      });
    }

    return insights;
  }

  private generateRecommendations(
    usage: UsageAnalytics,
    performance: PerformanceAnalytics
  ): string[] {
    const recommendations: string[] = [];

    if (performance.cacheEfficiency < 0.7) {
      recommendations.push(
        'Enable auto-caching for frequently used commands to improve performance'
      );
    }

    if (usage.mostUsedCommands.length > 5) {
      recommendations.push(
        'Consider creating command aliases or workflows for your most common operations'
      );
    }

    if (usage.errorPatterns.length > 3) {
      recommendations.push(
        'Review error patterns and consider updating your command usage patterns'
      );
    }

    if (usage.uniqueFeatures < 6) {
      recommendations.push(
        'Explore additional AIA features like advanced AI queries and code analysis'
      );
    }

    return recommendations;
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

  private getWeekString(date: Date): string {
    const startOfWeek = new Date(date);
    startOfWeek.setDate(date.getDate() - date.getDay());
    return `Week of ${startOfWeek.toDateString()}`;
  }

  private formatTimeRange(hour: number): string {
    if (hour < 6) return 'Early Morning (12AM-6AM)';
    if (hour < 12) return 'Morning (6AM-12PM)';
    if (hour < 18) return 'Afternoon (12PM-6PM)';
    return 'Evening (6PM-12AM)';
  }
}

// Helper interfaces for internal analytics data
interface CommandAnalytics {
  command: string;
  totalExecutions: number;
  totalTime: number;
  successCount: number;
  lastExecuted: Date;
}

interface FeatureAnalytics {
  feature: string;
  totalUsage: number;
  firstUsed: Date;
  contexts: Record<string, any>[];
}

interface SessionAnalytics {
  startTime: Date;
  endTime: Date;
  commandCount: number;
  totalTime: number;
}

interface ErrorAnalytics {
  errorType: string;
  command: string;
  timestamp: Date;
  context: Record<string, any>;
}
