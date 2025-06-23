import {
  CommandUsage,
  TimeDistribution,
  FeatureUsage,
  ErrorPattern,
} from '../types/index';

/**
 * Analytics Service Interface
 * Provides comprehensive usage analytics, performance tracking, and productivity insights
 */
export interface IAnalyticsService {
  /**
   * Get overall usage analytics including command frequency and patterns
   */
  getUsageAnalytics(): Promise<UsageAnalytics>;

  /**
   * Get performance analytics including execution times and optimizations
   */
  getPerformanceAnalytics(): Promise<PerformanceAnalytics>;

  /**
   * Generate comprehensive productivity report
   */
  generateProductivityReport(): Promise<ProductivityReport>;

  /**
   * Display interactive analytics dashboard
   */
  displayAnalyticsDashboard(): Promise<void>;

  /**
   * Record command execution for analytics
   */
  recordCommandExecution(
    command: string,
    executionTime: number,
    success: boolean
  ): Promise<void>;

  /**
   * Record feature usage
   */
  recordFeatureUsage(
    feature: string,
    context?: Record<string, any>
  ): Promise<void>;

  /**
   * Get usage trends over time
   */
  getUsageTrends(timeRange: 'day' | 'week' | 'month'): Promise<UsageTrend[]>;

  /**
   * Get optimization recommendations based on usage patterns
   */
  getOptimizationRecommendations(): Promise<OptimizationRecommendation[]>;

  /**
   * Export analytics data
   */
  exportAnalytics(format: 'json' | 'csv'): Promise<string>;

  /**
   * Clear analytics data
   */
  clearAnalytics(olderThan?: Date): Promise<void>;
}

export interface UsageAnalytics {
  mostUsedCommands: CommandUsage[];
  timeDistribution: TimeDistribution;
  featureAdoption: FeatureUsage[];
  errorPatterns: ErrorPattern[];
  totalCommands: number;
  uniqueFeatures: number;
  averageSessionLength: number;
  productivityScore: number;
}

export interface PerformanceAnalytics {
  averageExecutionTime: number;
  commandPerformance: CommandPerformance[];
  cacheEfficiency: number;
  performanceImprovement: number;
  slowestCommands: CommandPerformance[];
  fastestCommands: CommandPerformance[];
  performanceTrends: PerformanceTrend[];
}

export interface ProductivityReport {
  timePeriod: {
    start: Date;
    end: Date;
  };
  metrics: {
    commandsExecuted: number;
    timesSaved: number;
    errorsAvoided: number;
    featuresDiscovered: number;
  };
  insights: ProductivityInsight[];
  recommendations: string[];
  score: number;
}

export interface CommandPerformance {
  command: string;
  averageTime: number;
  executionCount: number;
  successRate: number;
  cacheHitRate?: number;
}

export interface PerformanceTrend {
  date: Date;
  averageTime: number;
  commandCount: number;
  cacheEfficiency: number;
}

export interface UsageTrend {
  date: Date;
  commandCount: number;
  uniqueCommands: number;
  averageSessionLength: number;
}

export interface OptimizationRecommendation {
  type: 'cache' | 'workflow' | 'configuration' | 'feature';
  title: string;
  description: string;
  impact: 'low' | 'medium' | 'high';
  effort: 'low' | 'medium' | 'high';
  command?: string;
}

export interface ProductivityInsight {
  type: 'trend' | 'achievement' | 'opportunity' | 'warning';
  title: string;
  description: string;
  value?: number;
  unit?: string;
}
