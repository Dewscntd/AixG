import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter } from 'events';
import * as os from 'os';
import * as process from 'process';

export interface RealTimeMetrics {
  timestamp: Date;
  system: {
    cpuUsage: number;
    memoryUsage: {
      used: number;
      total: number;
      percentage: number;
    };
    loadAverage: number[];
    uptime: number;
  };
  application: {
    heapUsed: number;
    heapTotal: number;
    external: number;
    rss: number;
    eventLoopDelay: number;
    activeHandles: number;
    activeRequests: number;
  };
  performance: {
    requestLatency: {
      p50: number;
      p95: number;
      p99: number;
    };
    throughput: number;
    errorRate: number;
  };
  gpu?: {
    utilization: number;
    memoryUsed: number;
    memoryTotal: number;
    temperature: number;
  };
}

export interface PerformanceAlert {
  type: 'warning' | 'critical';
  metric: string;
  value: number;
  threshold: number;
  message: string;
  timestamp: Date;
}

/**
 * Real-time Performance Monitor
 * Provides continuous monitoring with event-driven alerts
 */
@Injectable()
export class RealTimePerformanceMonitor extends EventEmitter {
  private readonly logger = new Logger(RealTimePerformanceMonitor.name);
  private readonly metrics: RealTimeMetrics[] = [];
  private readonly maxMetricsHistory = 1000;
  private readonly latencyMeasurements: number[] = [];
  private readonly maxLatencyHistory = 100;
  private monitoringInterval: NodeJS.Timeout | null = null;
  private isMonitoring = false;

  // Performance thresholds
  private readonly thresholds = {
    cpuUsage: { warning: 70, critical: 90 },
    memoryUsage: { warning: 80, critical: 95 },
    latencyP95: { warning: 1000, critical: 2000 }, // milliseconds
    errorRate: { warning: 0.05, critical: 0.1 }, // 5% warning, 10% critical
    gpuUtilization: { warning: 90, critical: 98 }
  };

  constructor() {
    super();
    this.setupEventLoopMonitoring();
  }

  /**
   * Start real-time monitoring
   */
  startMonitoring(intervalMs: number = 5000): void {
    if (this.isMonitoring) {
      this.logger.warn('Monitoring is already running');
      return;
    }

    this.logger.log(`Starting real-time performance monitoring (interval: ${intervalMs}ms)`);
    this.isMonitoring = true;

    this.monitoringInterval = setInterval(async () => {
      try {
        const metrics = await this.collectMetrics();
        this.addMetrics(metrics);
        this.checkThresholds(metrics);
        this.emit('metrics', metrics);
      } catch (error) {
        this.logger.error('Failed to collect metrics:', error);
      }
    }, intervalMs);
  }

  /**
   * Stop monitoring
   */
  stopMonitoring(): void {
    if (!this.isMonitoring) {
      return;
    }

    this.logger.log('Stopping real-time performance monitoring');
    this.isMonitoring = false;

    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }
  }

  /**
   * Get current metrics
   */
  getCurrentMetrics(): RealTimeMetrics | null {
    return this.metrics.length > 0 ? this.metrics[this.metrics.length - 1] : null;
  }

  /**
   * Get metrics history
   */
  getMetricsHistory(limit?: number): RealTimeMetrics[] {
    const history = this.metrics.slice();
    return limit ? history.slice(-limit) : history;
  }

  /**
   * Record request latency
   */
  recordLatency(latencyMs: number): void {
    this.latencyMeasurements.push(latencyMs);
    
    // Keep only recent measurements
    if (this.latencyMeasurements.length > this.maxLatencyHistory) {
      this.latencyMeasurements.shift();
    }
  }

  /**
   * Get performance summary
   */
  getPerformanceSummary(): {
    current: RealTimeMetrics | null;
    averages: {
      cpuUsage: number;
      memoryUsage: number;
      latencyP95: number;
    };
    trends: {
      cpuTrend: 'improving' | 'stable' | 'degrading';
      memoryTrend: 'improving' | 'stable' | 'degrading';
      latencyTrend: 'improving' | 'stable' | 'degrading';
    };
  } {
    const current = this.getCurrentMetrics();
    const recent = this.getMetricsHistory(10);

    if (recent.length === 0) {
      return {
        current: null,
        averages: { cpuUsage: 0, memoryUsage: 0, latencyP95: 0 },
        trends: { cpuTrend: 'stable', memoryTrend: 'stable', latencyTrend: 'stable' }
      };
    }

    // Calculate averages
    const averages = {
      cpuUsage: recent.reduce((sum, m) => sum + m.system.cpuUsage, 0) / recent.length,
      memoryUsage: recent.reduce((sum, m) => sum + m.system.memoryUsage.percentage, 0) / recent.length,
      latencyP95: recent.reduce((sum, m) => sum + m.performance.requestLatency.p95, 0) / recent.length
    };

    // Calculate trends
    const trends = {
      cpuTrend: this.calculateTrend(recent.map(m => m.system.cpuUsage)),
      memoryTrend: this.calculateTrend(recent.map(m => m.system.memoryUsage.percentage)),
      latencyTrend: this.calculateTrend(recent.map(m => m.performance.requestLatency.p95))
    };

    return { current, averages, trends };
  }

  /**
   * Collect current metrics
   */
  private async collectMetrics(): Promise<RealTimeMetrics> {
    const memUsage = process.memoryUsage();
    const cpuUsage = await this.getCPUUsage();
    const latencyStats = this.calculateLatencyPercentiles();

    return {
      timestamp: new Date(),
      system: {
        cpuUsage,
        memoryUsage: {
          used: os.totalmem() - os.freemem(),
          total: os.totalmem(),
          percentage: ((os.totalmem() - os.freemem()) / os.totalmem()) * 100
        },
        loadAverage: os.loadavg(),
        uptime: os.uptime()
      },
      application: {
        heapUsed: memUsage.heapUsed,
        heapTotal: memUsage.heapTotal,
        external: memUsage.external,
        rss: memUsage.rss,
        eventLoopDelay: this.getEventLoopDelay(),
        activeHandles: (process as any)._getActiveHandles().length,
        activeRequests: (process as any)._getActiveRequests().length
      },
      performance: {
        requestLatency: latencyStats,
        throughput: this.calculateThroughput(),
        errorRate: 0 // Would be calculated from actual error tracking
      },
      gpu: await this.getGPUMetrics()
    };
  }

  /**
   * Add metrics to history
   */
  private addMetrics(metrics: RealTimeMetrics): void {
    this.metrics.push(metrics);
    
    // Keep only recent metrics
    if (this.metrics.length > this.maxMetricsHistory) {
      this.metrics.shift();
    }
  }

  /**
   * Check thresholds and emit alerts
   */
  private checkThresholds(metrics: RealTimeMetrics): void {
    const alerts: PerformanceAlert[] = [];

    // CPU usage check
    if (metrics.system.cpuUsage > this.thresholds.cpuUsage.critical) {
      alerts.push({
        type: 'critical',
        metric: 'cpu_usage',
        value: metrics.system.cpuUsage,
        threshold: this.thresholds.cpuUsage.critical,
        message: `Critical CPU usage: ${metrics.system.cpuUsage.toFixed(1)}%`,
        timestamp: new Date()
      });
    } else if (metrics.system.cpuUsage > this.thresholds.cpuUsage.warning) {
      alerts.push({
        type: 'warning',
        metric: 'cpu_usage',
        value: metrics.system.cpuUsage,
        threshold: this.thresholds.cpuUsage.warning,
        message: `High CPU usage: ${metrics.system.cpuUsage.toFixed(1)}%`,
        timestamp: new Date()
      });
    }

    // Memory usage check
    if (metrics.system.memoryUsage.percentage > this.thresholds.memoryUsage.critical) {
      alerts.push({
        type: 'critical',
        metric: 'memory_usage',
        value: metrics.system.memoryUsage.percentage,
        threshold: this.thresholds.memoryUsage.critical,
        message: `Critical memory usage: ${metrics.system.memoryUsage.percentage.toFixed(1)}%`,
        timestamp: new Date()
      });
    } else if (metrics.system.memoryUsage.percentage > this.thresholds.memoryUsage.warning) {
      alerts.push({
        type: 'warning',
        metric: 'memory_usage',
        value: metrics.system.memoryUsage.percentage,
        threshold: this.thresholds.memoryUsage.warning,
        message: `High memory usage: ${metrics.system.memoryUsage.percentage.toFixed(1)}%`,
        timestamp: new Date()
      });
    }

    // Latency check
    if (metrics.performance.requestLatency.p95 > this.thresholds.latencyP95.critical) {
      alerts.push({
        type: 'critical',
        metric: 'latency_p95',
        value: metrics.performance.requestLatency.p95,
        threshold: this.thresholds.latencyP95.critical,
        message: `Critical latency: ${metrics.performance.requestLatency.p95}ms`,
        timestamp: new Date()
      });
    } else if (metrics.performance.requestLatency.p95 > this.thresholds.latencyP95.warning) {
      alerts.push({
        type: 'warning',
        metric: 'latency_p95',
        value: metrics.performance.requestLatency.p95,
        threshold: this.thresholds.latencyP95.warning,
        message: `High latency: ${metrics.performance.requestLatency.p95}ms`,
        timestamp: new Date()
      });
    }

    // Emit alerts
    alerts.forEach(alert => {
      this.emit('alert', alert);
      this.logger.warn(`Performance alert: ${alert.message}`);
    });
  }

  /**
   * Get CPU usage percentage
   */
  private async getCPUUsage(): Promise<number> {
    return new Promise((resolve) => {
      const startUsage = process.cpuUsage();
      const startTime = process.hrtime();

      setTimeout(() => {
        const endUsage = process.cpuUsage(startUsage);
        const endTime = process.hrtime(startTime);
        
        const totalTime = endTime[0] * 1000000 + endTime[1] / 1000; // microseconds
        const totalUsage = endUsage.user + endUsage.system; // microseconds
        
        const cpuPercent = (totalUsage / totalTime) * 100;
        resolve(Math.min(100, Math.max(0, cpuPercent)));
      }, 100);
    });
  }

  /**
   * Calculate latency percentiles
   */
  private calculateLatencyPercentiles(): { p50: number; p95: number; p99: number } {
    if (this.latencyMeasurements.length === 0) {
      return { p50: 0, p95: 0, p99: 0 };
    }

    const sorted = [...this.latencyMeasurements].sort((a, b) => a - b);
    const len = sorted.length;

    return {
      p50: sorted[Math.floor(len * 0.5)] || 0,
      p95: sorted[Math.floor(len * 0.95)] || 0,
      p99: sorted[Math.floor(len * 0.99)] || 0
    };
  }

  /**
   * Calculate throughput (requests per second)
   */
  private calculateThroughput(): number {
    // This would be calculated from actual request tracking
    // For now, return a placeholder
    return this.latencyMeasurements.length;
  }

  /**
   * Get GPU metrics (if available)
   */
  private async getGPUMetrics(): Promise<RealTimeMetrics['gpu'] | undefined> {
    try {
      // This would integrate with nvidia-ml-py or similar for real GPU metrics
      // For now, return mock data
      return {
        utilization: Math.random() * 100,
        memoryUsed: Math.random() * 8000, // MB
        memoryTotal: 8000, // MB
        temperature: 60 + Math.random() * 20 // Celsius
      };
    } catch (error) {
      // GPU monitoring not available
      return undefined;
    }
  }

  /**
   * Setup event loop monitoring
   */
  private setupEventLoopMonitoring(): void {
    // This would use async_hooks or similar for real event loop monitoring
    // For now, return a placeholder
  }

  /**
   * Get event loop delay
   */
  private getEventLoopDelay(): number {
    // This would measure actual event loop delay
    // For now, return a placeholder
    return Math.random() * 10;
  }

  /**
   * Calculate trend from array of values
   */
  private calculateTrend(values: number[]): 'improving' | 'stable' | 'degrading' {
    if (values.length < 2) return 'stable';

    const recent = values.slice(-5);
    const older = values.slice(-10, -5);

    if (recent.length === 0 || older.length === 0) return 'stable';

    const recentAvg = recent.reduce((sum, val) => sum + val, 0) / recent.length;
    const olderAvg = older.reduce((sum, val) => sum + val, 0) / older.length;

    const change = ((recentAvg - olderAvg) / olderAvg) * 100;

    if (change > 5) return 'degrading';
    if (change < -5) return 'improving';
    return 'stable';
  }
}
