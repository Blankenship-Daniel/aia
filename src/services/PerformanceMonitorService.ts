/**
 * Performance Monitor Service Implementation
 *
 * Advanced performance monitoring service that tracks method execution,
 * system metrics, and generates performance alerts.
 *
 * Part of SOLID Week 3: Advanced Performance Optimizations
 */

import {
  IPerformanceMonitor,
  MethodMetrics,
  SystemMetrics,
  PerformanceAlert,
  PerformanceThresholds,
} from '../interfaces/IPerformanceMonitor.js';

export class PerformanceMonitorService implements IPerformanceMonitor {
  private methodMetrics = new Map<string, MethodMetrics>();
  private alerts: PerformanceAlert[] = [];
  private thresholds: PerformanceThresholds = {};
  private enabled = true;
  private startTime = Date.now();

  async recordMethodExecution(
    className: string,
    methodName: string,
    executionTime: number,
    success: boolean,
    error?: Error
  ): Promise<void> {
    if (!this.enabled) return;

    const key = `${className}.${methodName}`;
    const existing = this.methodMetrics.get(key);

    if (existing) {
      // Update existing metrics
      existing.executionCount++;
      existing.totalExecutionTime += executionTime;
      existing.averageExecutionTime =
        existing.totalExecutionTime / existing.executionCount;
      existing.minExecutionTime = Math.min(
        existing.minExecutionTime,
        executionTime
      );
      existing.maxExecutionTime = Math.max(
        existing.maxExecutionTime,
        executionTime
      );
      existing.lastExecutionTime = executionTime;

      if (!success) {
        existing.errorCount++;
        existing.lastError = error;
      }
    } else {
      // Create new metrics entry
      const metrics: MethodMetrics = {
        methodName,
        className,
        executionCount: 1,
        totalExecutionTime: executionTime,
        averageExecutionTime: executionTime,
        minExecutionTime: executionTime,
        maxExecutionTime: executionTime,
        lastExecutionTime: executionTime,
        errorCount: success ? 0 : 1,
        lastError: error,
      };

      this.methodMetrics.set(key, metrics);
    }

    // Check thresholds and generate alerts
    await this.checkThresholds(className, methodName, executionTime, success);
  }

  async getMethodMetrics(
    className: string,
    methodName: string
  ): Promise<MethodMetrics | null> {
    const key = `${className}.${methodName}`;
    return this.methodMetrics.get(key) || null;
  }

  async getClassMetrics(className: string): Promise<MethodMetrics[]> {
    const results: MethodMetrics[] = [];

    for (const [key, metrics] of this.methodMetrics.entries()) {
      if (metrics.className === className) {
        results.push(metrics);
      }
    }

    return results.sort(
      (a, b) => b.averageExecutionTime - a.averageExecutionTime
    );
  }

  async getSystemMetrics(): Promise<SystemMetrics> {
    const memoryUsage = process.memoryUsage();
    const cpuUsage = process.cpuUsage();

    return {
      memoryUsage: {
        used: memoryUsage.heapUsed,
        total: memoryUsage.heapTotal,
        percentage: (memoryUsage.heapUsed / memoryUsage.heapTotal) * 100,
      },
      cpuUsage: (cpuUsage.user + cpuUsage.system) / 1000000, // Convert to seconds
      uptime: Date.now() - this.startTime,
      timestamp: Date.now(),
    };
  }

  async setThresholds(thresholds: PerformanceThresholds): Promise<void> {
    this.thresholds = { ...this.thresholds, ...thresholds };
  }

  async getAlerts(): Promise<PerformanceAlert[]> {
    return [...this.alerts].sort((a, b) => b.timestamp - a.timestamp);
  }

  async clearMetrics(): Promise<void> {
    this.methodMetrics.clear();
    this.alerts = [];
  }

  async getPerformanceReport(): Promise<{
    systemMetrics: SystemMetrics;
    topSlowMethods: MethodMetrics[];
    recentAlerts: PerformanceAlert[];
    summary: {
      totalMethods: number;
      totalExecutions: number;
      averageExecutionTime: number;
      errorRate: number;
    };
  }> {
    const systemMetrics = await this.getSystemMetrics();
    const allMetrics = Array.from(this.methodMetrics.values());

    // Get top 10 slowest methods
    const topSlowMethods = allMetrics
      .sort((a, b) => b.averageExecutionTime - a.averageExecutionTime)
      .slice(0, 10);

    // Get recent alerts (last 50)
    const recentAlerts = this.alerts
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, 50);

    // Calculate summary statistics
    const totalExecutions = allMetrics.reduce(
      (sum, m) => sum + m.executionCount,
      0
    );
    const totalErrors = allMetrics.reduce((sum, m) => sum + m.errorCount, 0);
    const totalExecutionTime = allMetrics.reduce(
      (sum, m) => sum + m.totalExecutionTime,
      0
    );

    const summary = {
      totalMethods: allMetrics.length,
      totalExecutions,
      averageExecutionTime:
        totalExecutions > 0 ? totalExecutionTime / totalExecutions : 0,
      errorRate:
        totalExecutions > 0 ? (totalErrors / totalExecutions) * 100 : 0,
    };

    return {
      systemMetrics,
      topSlowMethods,
      recentAlerts,
      summary,
    };
  }

  async setEnabled(enabled: boolean): Promise<void> {
    this.enabled = enabled;
  }

  async isEnabled(): Promise<boolean> {
    return this.enabled;
  }

  private async checkThresholds(
    className: string,
    methodName: string,
    executionTime: number,
    success: boolean
  ): Promise<void> {
    const alerts: PerformanceAlert[] = [];

    // Check execution time threshold
    if (
      this.thresholds.maxExecutionTime &&
      executionTime > this.thresholds.maxExecutionTime
    ) {
      alerts.push({
        level: 'warning',
        message: `Method ${className}.${methodName} exceeded execution time threshold`,
        threshold: this.thresholds.maxExecutionTime,
        actualValue: executionTime,
        timestamp: Date.now(),
        metadata: { className, methodName },
      });
    }

    // Check memory usage threshold
    if (this.thresholds.maxMemoryUsage) {
      const systemMetrics = await this.getSystemMetrics();
      if (
        systemMetrics.memoryUsage.percentage > this.thresholds.maxMemoryUsage
      ) {
        alerts.push({
          level: 'error',
          message: 'System memory usage exceeded threshold',
          threshold: this.thresholds.maxMemoryUsage,
          actualValue: systemMetrics.memoryUsage.percentage,
          timestamp: Date.now(),
        });
      }
    }

    // Check error rate threshold
    if (this.thresholds.maxErrorRate && !success) {
      const metrics = this.methodMetrics.get(`${className}.${methodName}`);
      if (metrics) {
        const errorRate = (metrics.errorCount / metrics.executionCount) * 100;
        if (errorRate > this.thresholds.maxErrorRate) {
          alerts.push({
            level: 'error',
            message: `Method ${className}.${methodName} exceeded error rate threshold`,
            threshold: this.thresholds.maxErrorRate,
            actualValue: errorRate,
            timestamp: Date.now(),
            metadata: {
              className,
              methodName,
              errorCount: metrics.errorCount,
              executionCount: metrics.executionCount,
            },
          });
        }
      }
    }

    // Add alerts to collection
    this.alerts.push(...alerts);

    // Keep only last 1000 alerts to prevent memory leaks
    if (this.alerts.length > 1000) {
      this.alerts = this.alerts.slice(-1000);
    }
  }
}
