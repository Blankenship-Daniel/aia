/**
 * Performance Monitoring Service Interface
 *
 * Provides comprehensive performance monitoring capabilities
 * for memory operations and service execution.
 *
 * Part of SOLID Week 3: Advanced Performance Optimizations
 */

export interface MethodMetrics {
  methodName: string;
  className: string;
  executionCount: number;
  totalExecutionTime: number;
  averageExecutionTime: number;
  minExecutionTime: number;
  maxExecutionTime: number;
  lastExecutionTime: number;
  errorCount: number;
  lastError?: Error;
}

export interface SystemMetrics {
  memoryUsage: {
    used: number;
    total: number;
    percentage: number;
  };
  cpuUsage: number;
  uptime: number;
  timestamp: number;
}

export interface PerformanceAlert {
  level: 'info' | 'warning' | 'error';
  message: string;
  threshold: number;
  actualValue: number;
  timestamp: number;
  metadata?: Record<string, any>;
}

export interface PerformanceThresholds {
  maxExecutionTime?: number;
  maxMemoryUsage?: number;
  maxErrorRate?: number;
  minHitRate?: number;
}

export interface IPerformanceMonitor {
  /**
   * Record method execution metrics
   */
  recordMethodExecution(
    className: string,
    methodName: string,
    executionTime: number,
    success: boolean,
    error?: Error
  ): Promise<void>;

  /**
   * Get metrics for a specific method
   */
  getMethodMetrics(
    className: string,
    methodName: string
  ): Promise<MethodMetrics | null>;

  /**
   * Get all metrics for a class
   */
  getClassMetrics(className: string): Promise<MethodMetrics[]>;

  /**
   * Get system-wide performance metrics
   */
  getSystemMetrics(): Promise<SystemMetrics>;

  /**
   * Set performance thresholds for alerts
   */
  setThresholds(thresholds: PerformanceThresholds): Promise<void>;

  /**
   * Get performance alerts
   */
  getAlerts(): Promise<PerformanceAlert[]>;

  /**
   * Clear all metrics
   */
  clearMetrics(): Promise<void>;

  /**
   * Get performance summary report
   */
  getPerformanceReport(): Promise<{
    systemMetrics: SystemMetrics;
    topSlowMethods: MethodMetrics[];
    recentAlerts: PerformanceAlert[];
    summary: {
      totalMethods: number;
      totalExecutions: number;
      averageExecutionTime: number;
      errorRate: number;
    };
  }>;

  /**
   * Enable/disable performance monitoring
   */
  setEnabled(enabled: boolean): Promise<void>;

  /**
   * Check if monitoring is enabled
   */
  isEnabled(): Promise<boolean>;
}
