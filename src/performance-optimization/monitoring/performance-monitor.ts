import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter } from 'events';
import * as os from 'os';
import * as process from 'process';
// performance import removed as it's not used

interface PerformanceMetrics {
  timestamp: number;
  
  // Request metrics
  requestLatency: {
    p50: number;
    p95: number;
    p99: number;
    average: number;
    count: number;
  };
  
  // System metrics
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
  
  // GPU metrics (if available)
  gpu?: {
    utilization: number;
    memoryUsed: number;
    memoryTotal: number;
    temperature: number;
  };
  
  // Database metrics
  database: {
    connectionPoolSize: number;
    activeConnections: number;
    queryLatency: number;
    slowQueries: number;
  };
  
  // Cache metrics
  cache: {
    hitRatio: number;
    memoryUsage: number;
    operations: number;
  };
  
  // Message queue metrics
  messageQueue: {
    lag: number;
    throughput: number;
    errorRate: number;
  };
}

interface AlertRule {
  metric: string;
  threshold: number;
  operator: 'gt' | 'lt' | 'eq';
  severity: 'critical' | 'warning' | 'info';
  description: string;
}

interface Alert {
  id: string;
  rule: AlertRule;
  value: number;
  timestamp: number;
  resolved: boolean;
}

/**
 * Performance Monitoring Service
 * Collects, analyzes, and alerts on system performance metrics
 */
@Injectable()
export class PerformanceMonitor extends EventEmitter {
  private readonly logger = new Logger(PerformanceMonitor.name);
  private readonly requestLatencies: number[] = [];
  private readonly maxLatencyHistory = 1000;
  private readonly metricsHistory: PerformanceMetrics[] = [];
  private readonly maxHistorySize = 100;
  private readonly alerts: Map<string, Alert> = new Map();
  private readonly alertRules: AlertRule[] = [];
  private monitoringInterval?: NodeJS.Timeout;
  private isMonitoring = false;

  constructor() {
    super();
    this.setupDefaultAlertRules();
  }

  /**
   * Start performance monitoring
   */
  startMonitoring(intervalMs: number = 10000): void {
    if (this.isMonitoring) {
      this.logger.warn('Performance monitoring already started');
      return;
    }

    this.isMonitoring = true;
    this.logger.log(`Starting performance monitoring (interval: ${intervalMs}ms)`);

    this.monitoringInterval = setInterval(async () => {
      try {
        const metrics = await this.collectMetrics();
        this.metricsHistory.push(metrics);
        
        // Keep history size manageable
        if (this.metricsHistory.length > this.maxHistorySize) {
          this.metricsHistory.shift();
        }
        
        // Check alert rules
        this.checkAlertRules(metrics);
        
        // Emit metrics event
        this.emit('metrics', metrics);
        
      } catch (error) {
        this.logger.error(`Error collecting metrics: ${error.message}`);
      }
    }, intervalMs);
  }

  /**
   * Stop performance monitoring
   */
  stopMonitoring(): void {
    if (!this.isMonitoring) {
      return;
    }

    this.isMonitoring = false;
    
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = undefined;
    }
    
    this.logger.log('Performance monitoring stopped');
  }

  /**
   * Record request latency
   */
  recordRequestLatency(latencyMs: number): void {
    this.requestLatencies.push(latencyMs);
    
    // Keep only recent latencies
    if (this.requestLatencies.length > this.maxLatencyHistory) {
      this.requestLatencies.shift();
    }
  }

  /**
   * Collect comprehensive performance metrics
   */
  private async collectMetrics(): Promise<PerformanceMetrics> {
    const timestamp = Date.now();
    
    // Request latency metrics
    const requestLatency = this.calculateLatencyPercentiles();
    
    // System metrics
    const system = this.collectSystemMetrics();
    
    // GPU metrics (if available)
    const gpu = await this.collectGPUMetrics();
    
    // Database metrics (mock - would integrate with actual DB monitoring)
    const database = this.collectDatabaseMetrics();
    
    // Cache metrics (mock - would integrate with cache service)
    const cache = this.collectCacheMetrics();
    
    // Message queue metrics (mock - would integrate with queue monitoring)
    const messageQueue = this.collectMessageQueueMetrics();
    
    return {
      timestamp,
      requestLatency,
      system,
      gpu,
      database,
      cache,
      messageQueue
    };
  }

  /**
   * Calculate request latency percentiles
   */
  private calculateLatencyPercentiles(): PerformanceMetrics['requestLatency'] {
    if (this.requestLatencies.length === 0) {
      return { p50: 0, p95: 0, p99: 0, average: 0, count: 0 };
    }

    const sorted = [...this.requestLatencies].sort((a, b) => a - b);
    const count = sorted.length;
    
    const p50Index = Math.floor(count * 0.5);
    const p95Index = Math.floor(count * 0.95);
    const p99Index = Math.floor(count * 0.99);
    
    const average = sorted.reduce((sum, val) => sum + val, 0) / count;
    
    return {
      p50: sorted[p50Index] || 0,
      p95: sorted[p95Index] || 0,
      p99: sorted[p99Index] || 0,
      average,
      count
    };
  }

  /**
   * Collect system performance metrics
   */
  private collectSystemMetrics(): PerformanceMetrics['system'] {
    const memoryUsage = process.memoryUsage();
    const totalMemory = os.totalmem();
    const usedMemory = memoryUsage.heapUsed + memoryUsage.external;
    
    return {
      cpuUsage: process.cpuUsage().user / 1000000, // Convert to seconds
      memoryUsage: {
        used: usedMemory,
        total: totalMemory,
        percentage: (usedMemory / totalMemory) * 100
      },
      loadAverage: os.loadavg(),
      uptime: process.uptime()
    };
  }

  /**
   * Collect GPU metrics (requires nvidia-ml-py or similar)
   */
  private async collectGPUMetrics(): Promise<PerformanceMetrics['gpu'] | undefined> {
    try {
      // This would integrate with actual GPU monitoring library
      // For now, return mock data
      return {
        utilization: Math.random() * 100,
        memoryUsed: Math.random() * 8000,
        memoryTotal: 8000,
        temperature: 60 + Math.random() * 20
      };
    } catch (error) {
      // GPU monitoring not available
      return undefined;
    }
  }

  /**
   * Collect database performance metrics
   */
  private collectDatabaseMetrics(): PerformanceMetrics['database'] {
    // Mock data - would integrate with actual database monitoring
    return {
      connectionPoolSize: 20,
      activeConnections: Math.floor(Math.random() * 15),
      queryLatency: Math.random() * 100,
      slowQueries: Math.floor(Math.random() * 5)
    };
  }

  /**
   * Collect cache performance metrics
   */
  private collectCacheMetrics(): PerformanceMetrics['cache'] {
    // Mock data - would integrate with cache service
    return {
      hitRatio: 0.85 + Math.random() * 0.1,
      memoryUsage: Math.random() * 1000,
      operations: Math.floor(Math.random() * 1000)
    };
  }

  /**
   * Collect message queue metrics
   */
  private collectMessageQueueMetrics(): PerformanceMetrics['messageQueue'] {
    // Mock data - would integrate with message queue monitoring
    return {
      lag: Math.random() * 1000,
      throughput: Math.random() * 100,
      errorRate: Math.random() * 0.05
    };
  }

  /**
   * Setup default alert rules
   */
  private setupDefaultAlertRules(): void {
    this.alertRules.push(
      {
        metric: 'requestLatency.p95',
        threshold: 500,
        operator: 'gt',
        severity: 'warning',
        description: 'High request latency (p95 > 500ms)'
      },
      {
        metric: 'requestLatency.p99',
        threshold: 1000,
        operator: 'gt',
        severity: 'critical',
        description: 'Critical request latency (p99 > 1000ms)'
      },
      {
        metric: 'system.memoryUsage.percentage',
        threshold: 85,
        operator: 'gt',
        severity: 'warning',
        description: 'High memory usage (> 85%)'
      },
      {
        metric: 'system.memoryUsage.percentage',
        threshold: 95,
        operator: 'gt',
        severity: 'critical',
        description: 'Critical memory usage (> 95%)'
      },
      {
        metric: 'database.activeConnections',
        threshold: 18,
        operator: 'gt',
        severity: 'warning',
        description: 'High database connection usage'
      },
      {
        metric: 'cache.hitRatio',
        threshold: 0.7,
        operator: 'lt',
        severity: 'warning',
        description: 'Low cache hit ratio (< 70%)'
      }
    );
  }

  /**
   * Check alert rules against current metrics
   */
  private checkAlertRules(metrics: PerformanceMetrics): void {
    for (const rule of this.alertRules) {
      const value = this.getMetricValue(metrics, rule.metric);
      
      if (value === undefined) {
        continue;
      }
      
      const alertId = `${rule.metric}_${rule.operator}_${rule.threshold}`;
      const shouldAlert = this.evaluateRule(value, rule);
      const existingAlert = this.alerts.get(alertId);
      
      if (shouldAlert && !existingAlert) {
        // New alert
        const alert: Alert = {
          id: alertId,
          rule,
          value,
          timestamp: Date.now(),
          resolved: false
        };
        
        this.alerts.set(alertId, alert);
        this.emit('alert', alert);
        
        this.logger.warn(`Alert triggered: ${rule.description} (value: ${value})`);
        
      } else if (!shouldAlert && existingAlert && !existingAlert.resolved) {
        // Resolve alert
        existingAlert.resolved = true;
        this.emit('alertResolved', existingAlert);
        
        this.logger.log(`Alert resolved: ${rule.description}`);
      }
    }
  }

  /**
   * Get metric value by path
   */
  private getMetricValue(metrics: PerformanceMetrics, path: string): number | undefined {
    const parts = path.split('.');
    let value: any = metrics;
    
    for (const part of parts) {
      if (value && typeof value === 'object' && part in value) {
        value = value[part];
      } else {
        return undefined;
      }
    }
    
    return typeof value === 'number' ? value : undefined;
  }

  /**
   * Evaluate alert rule
   */
  private evaluateRule(value: number, rule: AlertRule): boolean {
    switch (rule.operator) {
      case 'gt':
        return value > rule.threshold;
      case 'lt':
        return value < rule.threshold;
      case 'eq':
        return value === rule.threshold;
      default:
        return false;
    }
  }

  /**
   * Get current performance summary
   */
  getPerformanceSummary(): {
    current: PerformanceMetrics | null;
    trends: {
      latencyTrend: 'improving' | 'degrading' | 'stable';
      memoryTrend: 'improving' | 'degrading' | 'stable';
      errorTrend: 'improving' | 'degrading' | 'stable';
    };
    activeAlerts: Alert[];
    healthScore: number;
  } {
    const current = this.metricsHistory[this.metricsHistory.length - 1] || null;
    const trends = this.calculateTrends();
    const activeAlerts = Array.from(this.alerts.values()).filter(alert => !alert.resolved);
    const healthScore = this.calculateHealthScore(current, activeAlerts);
    
    return {
      current,
      trends,
      activeAlerts,
      healthScore
    };
  }

  /**
   * Calculate performance trends
   */
  private calculateTrends(): {
    latencyTrend: 'improving' | 'degrading' | 'stable';
    memoryTrend: 'improving' | 'degrading' | 'stable';
    errorTrend: 'improving' | 'degrading' | 'stable';
  } {
    if (this.metricsHistory.length < 10) {
      return {
        latencyTrend: 'stable',
        memoryTrend: 'stable',
        errorTrend: 'stable'
      };
    }
    
    const recent = this.metricsHistory.slice(-5);
    const previous = this.metricsHistory.slice(-10, -5);
    
    const recentLatency = recent.reduce((sum, m) => sum + m.requestLatency.p95, 0) / recent.length;
    const previousLatency = previous.reduce((sum, m) => sum + m.requestLatency.p95, 0) / previous.length;
    
    const recentMemory = recent.reduce((sum, m) => sum + m.system.memoryUsage.percentage, 0) / recent.length;
    const previousMemory = previous.reduce((sum, m) => sum + m.system.memoryUsage.percentage, 0) / previous.length;
    
    const recentErrors = recent.reduce((sum, m) => sum + m.messageQueue.errorRate, 0) / recent.length;
    const previousErrors = previous.reduce((sum, m) => sum + m.messageQueue.errorRate, 0) / previous.length;
    
    return {
      latencyTrend: this.getTrend(recentLatency, previousLatency),
      memoryTrend: this.getTrend(recentMemory, previousMemory),
      errorTrend: this.getTrend(recentErrors, previousErrors)
    };
  }

  /**
   * Determine trend direction
   */
  private getTrend(recent: number, previous: number): 'improving' | 'degrading' | 'stable' {
    const changePercent = ((recent - previous) / previous) * 100;
    
    if (changePercent > 10) {
      return 'degrading';
    } else if (changePercent < -10) {
      return 'improving';
    } else {
      return 'stable';
    }
  }

  /**
   * Calculate overall health score (0-100)
   */
  private calculateHealthScore(metrics: PerformanceMetrics | null, alerts: Alert[]): number {
    if (!metrics) {
      return 0;
    }
    
    let score = 100;
    
    // Deduct points for active alerts
    for (const alert of alerts) {
      switch (alert.rule.severity) {
        case 'critical':
          score -= 30;
          break;
        case 'warning':
          score -= 15;
          break;
        case 'info':
          score -= 5;
          break;
      }
    }
    
    // Deduct points for poor performance
    if (metrics.requestLatency.p95 > 500) {
      score -= 10;
    }
    
    if (metrics.system.memoryUsage.percentage > 80) {
      score -= 10;
    }
    
    if (metrics.cache.hitRatio < 0.8) {
      score -= 5;
    }
    
    return Math.max(0, score);
  }

  /**
   * Get metrics history
   */
  getMetricsHistory(): PerformanceMetrics[] {
    return [...this.metricsHistory];
  }

  /**
   * Add custom alert rule
   */
  addAlertRule(rule: AlertRule): void {
    this.alertRules.push(rule);
    this.logger.log(`Added alert rule: ${rule.description}`);
  }

  /**
   * Remove alert rule
   */
  removeAlertRule(metric: string, threshold: number, operator: string): void {
    const index = this.alertRules.findIndex(
      rule => rule.metric === metric && rule.threshold === threshold && rule.operator === operator
    );
    
    if (index > -1) {
      this.alertRules.splice(index, 1);
      this.logger.log(`Removed alert rule for ${metric}`);
    }
  }
}
