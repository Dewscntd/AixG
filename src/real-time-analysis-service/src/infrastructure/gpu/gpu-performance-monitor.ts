/**
 * GPU Performance Monitor
 * Real-time monitoring and optimization of GPU performance metrics
 */

import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';

export interface GPUMetrics {
  timestamp: number;
  utilization: {
    gpu: number;      // GPU utilization percentage
    memory: number;   // Memory utilization percentage
    compute: number;  // Compute utilization percentage
    encoder: number;  // Video encoder utilization
    decoder: number;  // Video decoder utilization
  };
  memory: {
    total: number;
    used: number;
    free: number;
    cached: number;
  };
  temperature: {
    gpu: number;
    memory: number;
    hotspot: number;
  };
  power: {
    current: number;
    average: number;
    limit: number;
  };
  clocks: {
    core: number;
    memory: number;
    shader: number;
  };
  throughput: {
    frameRate: number;
    bandwidth: number;
    operations: number;
  };
}

export interface PerformanceThresholds {
  gpu_utilization_warning: number;
  gpu_utilization_critical: number;
  memory_utilization_warning: number;
  memory_utilization_critical: number;
  temperature_warning: number;
  temperature_critical: number;
  frame_rate_minimum: number;
  latency_maximum: number;
}

export interface PerformanceAlert {
  id: string;
  timestamp: number;
  severity: 'info' | 'warning' | 'critical';
  metric: string;
  value: number;
  threshold: number;
  message: string;
  suggestions: string[];
}

export interface OptimizationRecommendation {
  id: string;
  type: 'memory' | 'compute' | 'thermal' | 'power' | 'throughput';
  priority: 'high' | 'medium' | 'low';
  title: string;
  description: string;
  impact: string;
  implementation: string;
  estimatedGain: number; // percentage improvement
}

export interface PerformanceProfile {
  name: string;
  description: string;
  settings: {
    powerLimit: number;
    memoryClockOffset: number;
    coreClockOffset: number;
    fanCurve: number[];
    tensorCores: boolean;
    mixedPrecision: boolean;
  };
  targetUseCase: 'inference' | 'training' | 'streaming' | 'balanced';
}

@Injectable()
export class GPUPerformanceMonitor {
  private readonly logger = new Logger(GPUPerformanceMonitor.name);
  
  private isMonitoring = false;
  private metrics: GPUMetrics[] = [];
  private alerts: PerformanceAlert[] = [];
  private recommendations: OptimizationRecommendation[] = [];
  
  private readonly thresholds: PerformanceThresholds = {
    gpu_utilization_warning: 85,
    gpu_utilization_critical: 95,
    memory_utilization_warning: 80,
    memory_utilization_critical: 90,
    temperature_warning: 80,
    temperature_critical: 90,
    frame_rate_minimum: 25,
    latency_maximum: 50 // ms
  };

  private readonly profiles: PerformanceProfile[] = [
    {
      name: 'High Performance',
      description: 'Maximum performance for real-time inference',
      settings: {
        powerLimit: 100,
        memoryClockOffset: 500,
        coreClockOffset: 100,
        fanCurve: [40, 50, 60, 75, 90],
        tensorCores: true,
        mixedPrecision: true
      },
      targetUseCase: 'inference'
    },
    {
      name: 'Balanced',
      description: 'Balanced performance and efficiency',
      settings: {
        powerLimit: 80,
        memoryClockOffset: 200,
        coreClockOffset: 50,
        fanCurve: [30, 40, 50, 65, 80],
        tensorCores: true,
        mixedPrecision: true
      },
      targetUseCase: 'balanced'
    },
    {
      name: 'Power Efficient',
      description: 'Optimized for power efficiency',
      settings: {
        powerLimit: 60,
        memoryClockOffset: 0,
        coreClockOffset: -50,
        fanCurve: [25, 30, 40, 55, 70],
        tensorCores: false,
        mixedPrecision: true
      },
      targetUseCase: 'streaming'
    }
  ];

  private monitoringInterval?: NodeJS.Timeout;
  private alertCheckInterval?: NodeJS.Timeout;
  private optimizationInterval?: NodeJS.Timeout;

  // Performance baselines
  private performanceBaselines = {
    frameRate: 30,
    latency: 33,
    throughput: 1000,
    memoryBandwidth: 500
  };

  constructor(private readonly eventEmitter: EventEmitter2) {}

  /**
   * Start performance monitoring
   */
  public startMonitoring(intervalMs: number = 1000): void {
    if (this.isMonitoring) {
      this.logger.warn('Performance monitoring already started');
      return;
    }

    try {
      this.logger.log('Starting GPU performance monitoring...');

      // Start metrics collection
      this.monitoringInterval = setInterval(async () => {
        await this.collectMetrics();
      }, intervalMs);

      // Start alert checking
      this.alertCheckInterval = setInterval(() => {
        this.checkAlerts();
      }, 5000); // Check alerts every 5 seconds

      // Start optimization analysis
      this.optimizationInterval = setInterval(() => {
        this.analyzeOptimizations();
      }, 30000); // Analyze every 30 seconds

      this.isMonitoring = true;
      this.logger.log('GPU performance monitoring started');

    } catch (error) {
      this.logger.error(`Failed to start monitoring: ${error.message}`);
      throw error;
    }
  }

  /**
   * Stop performance monitoring
   */
  public stopMonitoring(): void {
    if (!this.isMonitoring) {
      return;
    }

    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
    }
    if (this.alertCheckInterval) {
      clearInterval(this.alertCheckInterval);
    }
    if (this.optimizationInterval) {
      clearInterval(this.optimizationInterval);
    }

    this.isMonitoring = false;
    this.logger.log('GPU performance monitoring stopped');
  }

  /**
   * Collect current GPU metrics
   */
  private async collectMetrics(): Promise<void> {
    try {
      // In a real implementation, this would query NVIDIA-ML API
      // For demo purposes, we'll simulate realistic metrics
      const metrics: GPUMetrics = {
        timestamp: Date.now(),
        utilization: {
          gpu: Math.random() * 100,
          memory: Math.random() * 100,
          compute: Math.random() * 100,
          encoder: Math.random() * 50,
          decoder: Math.random() * 30
        },
        memory: {
          total: 24576, // 24GB
          used: Math.random() * 20480,
          free: 24576 - Math.random() * 20480,
          cached: Math.random() * 2048
        },
        temperature: {
          gpu: 45 + Math.random() * 30, // 45-75°C
          memory: 40 + Math.random() * 25, // 40-65°C
          hotspot: 50 + Math.random() * 35 // 50-85°C
        },
        power: {
          current: 200 + Math.random() * 250, // 200-450W
          average: 300 + Math.random() * 100,
          limit: 450
        },
        clocks: {
          core: 1500 + Math.random() * 500, // MHz
          memory: 9500 + Math.random() * 1000,
          shader: 1600 + Math.random() * 600
        },
        throughput: {
          frameRate: 25 + Math.random() * 10,
          bandwidth: 400 + Math.random() * 200, // GB/s
          operations: 800 + Math.random() * 400 // TOPS
        }
      };

      // Store metrics
      this.metrics.push(metrics);

      // Keep only recent metrics (last 1000 samples)
      if (this.metrics.length > 1000) {
        this.metrics.shift();
      }

      // Emit metrics event
      this.eventEmitter.emit('gpu.metrics.collected', metrics);

    } catch (error) {
      this.logger.error(`Failed to collect metrics: ${error.message}`);
    }
  }

  /**
   * Check for performance alerts
   */
  private checkAlerts(): void {
    if (this.metrics.length === 0) return;

    const latest = this.metrics[this.metrics.length - 1];
    const newAlerts: PerformanceAlert[] = [];

    // GPU utilization alerts
    if (latest.utilization.gpu > this.thresholds.gpu_utilization_critical) {
      newAlerts.push(this.createAlert(
        'critical',
        'gpu_utilization',
        latest.utilization.gpu,
        this.thresholds.gpu_utilization_critical,
        'Critical GPU utilization detected',
        [
          'Reduce batch size',
          'Enable model quantization',
          'Implement frame skipping',
          'Scale processing across multiple GPUs'
        ]
      ));
    } else if (latest.utilization.gpu > this.thresholds.gpu_utilization_warning) {
      newAlerts.push(this.createAlert(
        'warning',
        'gpu_utilization',
        latest.utilization.gpu,
        this.thresholds.gpu_utilization_warning,
        'High GPU utilization detected',
        [
          'Monitor for sustained high usage',
          'Consider optimization techniques',
          'Check for memory bottlenecks'
        ]
      ));
    }

    // Memory utilization alerts
    const memoryUtilization = (latest.memory.used / latest.memory.total) * 100;
    if (memoryUtilization > this.thresholds.memory_utilization_critical) {
      newAlerts.push(this.createAlert(
        'critical',
        'memory_utilization',
        memoryUtilization,
        this.thresholds.memory_utilization_critical,
        'Critical GPU memory utilization',
        [
          'Reduce batch size immediately',
          'Enable gradient checkpointing',
          'Clear unused tensors',
          'Run garbage collection'
        ]
      ));
    }

    // Temperature alerts
    if (latest.temperature.gpu > this.thresholds.temperature_critical) {
      newAlerts.push(this.createAlert(
        'critical',
        'temperature',
        latest.temperature.gpu,
        this.thresholds.temperature_critical,
        'Critical GPU temperature',
        [
          'Reduce power limit',
          'Increase fan speed',
          'Check thermal paste',
          'Improve case ventilation'
        ]
      ));
    }

    // Frame rate alerts
    if (latest.throughput.frameRate < this.thresholds.frame_rate_minimum) {
      newAlerts.push(this.createAlert(
        'warning',
        'frame_rate',
        latest.throughput.frameRate,
        this.thresholds.frame_rate_minimum,
        'Low frame rate detected',
        [
          'Enable TensorRT optimization',
          'Use mixed precision',
          'Reduce input resolution',
          'Optimize model architecture'
        ]
      ));
    }

    // Add new alerts
    for (const alert of newAlerts) {
      this.alerts.push(alert);
      this.logger.warn(`Performance Alert: ${alert.message} (${alert.value.toFixed(1)})`);
      this.eventEmitter.emit('gpu.alert.triggered', alert);
    }

    // Keep only recent alerts
    const hourAgo = Date.now() - 3600000;
    this.alerts = this.alerts.filter(alert => alert.timestamp > hourAgo);
  }

  /**
   * Create performance alert
   */
  private createAlert(
    severity: PerformanceAlert['severity'],
    metric: string,
    value: number,
    threshold: number,
    message: string,
    suggestions: string[]
  ): PerformanceAlert {
    return {
      id: `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
      severity,
      metric,
      value,
      threshold,
      message,
      suggestions
    };
  }

  /**
   * Analyze and generate optimization recommendations
   */
  private analyzeOptimizations(): void {
    if (this.metrics.length < 10) return; // Need enough data

    const recent = this.metrics.slice(-10);
    const newRecommendations: OptimizationRecommendation[] = [];

    // Analyze memory usage patterns
    const avgMemoryUtilization = recent.reduce((sum, m) => 
      sum + (m.memory.used / m.memory.total) * 100, 0) / recent.length;

    if (avgMemoryUtilization > 75) {
      newRecommendations.push({
        id: `opt_memory_${Date.now()}`,
        type: 'memory',
        priority: 'high',
        title: 'High Memory Utilization',
        description: 'GPU memory usage is consistently high, which may impact performance',
        impact: 'Reduced inference speed and potential out-of-memory errors',
        implementation: 'Enable model quantization and reduce batch sizes',
        estimatedGain: 25
      });
    }

    // Analyze thermal performance
    const avgTemperature = recent.reduce((sum, m) => sum + m.temperature.gpu, 0) / recent.length;
    
    if (avgTemperature > 75) {
      newRecommendations.push({
        id: `opt_thermal_${Date.now()}`,
        type: 'thermal',
        priority: 'medium',
        title: 'High Operating Temperature',
        description: 'GPU is running hot, which may cause thermal throttling',
        impact: 'Reduced clock speeds and performance degradation',
        implementation: 'Adjust fan curves and consider undervolting',
        estimatedGain: 15
      });
    }

    // Analyze throughput
    const avgFrameRate = recent.reduce((sum, m) => sum + m.throughput.frameRate, 0) / recent.length;
    
    if (avgFrameRate < this.performanceBaselines.frameRate * 0.8) {
      newRecommendations.push({
        id: `opt_throughput_${Date.now()}`,
        type: 'throughput',
        priority: 'high',
        title: 'Below Target Frame Rate',
        description: 'Current throughput is below optimal levels',
        impact: 'Reduced real-time processing capability',
        implementation: 'Enable TensorRT optimization and mixed precision',
        estimatedGain: 40
      });
    }

    // Analyze power efficiency
    const avgPower = recent.reduce((sum, m) => sum + m.power.current, 0) / recent.length;
    const powerEfficiency = avgFrameRate / avgPower; // FPS per watt
    
    if (powerEfficiency < 0.1) {
      newRecommendations.push({
        id: `opt_power_${Date.now()}`,
        type: 'power',
        priority: 'low',
        title: 'Low Power Efficiency',
        description: 'Power consumption is high relative to performance',
        impact: 'Increased operational costs and heat generation',
        implementation: 'Reduce power limit and optimize workload scheduling',
        estimatedGain: 20
      });
    }

    // Add new recommendations
    for (const recommendation of newRecommendations) {
      // Check if similar recommendation already exists
      const exists = this.recommendations.some(r => 
        r.type === recommendation.type && r.priority === recommendation.priority
      );

      if (!exists) {
        this.recommendations.push(recommendation);
        this.logger.log(`New optimization recommendation: ${recommendation.title}`);
        this.eventEmitter.emit('gpu.optimization.recommended', recommendation);
      }
    }

    // Keep only recent recommendations
    const dayAgo = Date.now() - 86400000;
    this.recommendations = this.recommendations.filter(r => 
      parseInt(r.id.split('_')[2]) > dayAgo
    );
  }

  /**
   * Apply performance profile
   */
  public async applyPerformanceProfile(profileName: string): Promise<boolean> {
    try {
      const profile = this.profiles.find(p => p.name === profileName);
      if (!profile) {
        this.logger.error(`Performance profile not found: ${profileName}`);
        return false;
      }

      this.logger.log(`Applying performance profile: ${profileName}`);

      // In a real implementation, this would:
      // 1. Set power limit via nvidia-ml
      // 2. Configure memory/core clock offsets
      // 3. Adjust fan curves
      // 4. Enable/disable features like Tensor Cores

      // Simulate profile application
      await new Promise(resolve => setTimeout(resolve, 1000));

      this.logger.log(`Performance profile applied: ${profileName}`);
      this.eventEmitter.emit('gpu.profile.applied', { profile: profileName });

      return true;

    } catch (error) {
      this.logger.error(`Failed to apply performance profile: ${error.message}`);
      return false;
    }
  }

  /**
   * Get current performance metrics
   */
  public getCurrentMetrics(): GPUMetrics | null {
    return this.metrics.length > 0 ? this.metrics[this.metrics.length - 1] : null;
  }

  /**
   * Get metrics history
   */
  public getMetricsHistory(minutes: number = 10): GPUMetrics[] {
    const cutoff = Date.now() - (minutes * 60 * 1000);
    return this.metrics.filter(m => m.timestamp > cutoff);
  }

  /**
   * Get recent alerts
   */
  public getRecentAlerts(hours: number = 1): PerformanceAlert[] {
    const cutoff = Date.now() - (hours * 60 * 60 * 1000);
    return this.alerts.filter(a => a.timestamp > cutoff);
  }

  /**
   * Get optimization recommendations
   */
  public getOptimizationRecommendations(): OptimizationRecommendation[] {
    return [...this.recommendations];
  }

  /**
   * Get available performance profiles
   */
  public getPerformanceProfiles(): PerformanceProfile[] {
    return [...this.profiles];
  }

  /**
   * Get performance summary
   */
  public getPerformanceSummary(): any {
    if (this.metrics.length === 0) {
      return null;
    }

    const recent = this.metrics.slice(-60); // Last minute of data
    const current = this.metrics[this.metrics.length - 1];

    const avgUtilization = recent.reduce((sum, m) => sum + m.utilization.gpu, 0) / recent.length;
    const avgMemoryUsage = recent.reduce((sum, m) => sum + (m.memory.used / m.memory.total) * 100, 0) / recent.length;
    const avgTemperature = recent.reduce((sum, m) => sum + m.temperature.gpu, 0) / recent.length;
    const avgFrameRate = recent.reduce((sum, m) => sum + m.throughput.frameRate, 0) / recent.length;

    return {
      current: {
        utilization: current.utilization.gpu,
        memoryUsage: (current.memory.used / current.memory.total) * 100,
        temperature: current.temperature.gpu,
        frameRate: current.throughput.frameRate
      },
      average: {
        utilization: avgUtilization,
        memoryUsage: avgMemoryUsage,
        temperature: avgTemperature,
        frameRate: avgFrameRate
      },
      status: {
        isHealthy: avgTemperature < 80 && avgMemoryUsage < 85 && avgFrameRate > 25,
        alerts: this.getRecentAlerts().length,
        recommendations: this.recommendations.length
      },
      monitoring: {
        isActive: this.isMonitoring,
        sampleCount: this.metrics.length,
        lastUpdate: current.timestamp
      }
    };
  }

  /**
   * Update performance thresholds
   */
  public updateThresholds(newThresholds: Partial<PerformanceThresholds>): void {
    Object.assign(this.thresholds, newThresholds);
    this.logger.log('Performance thresholds updated');
  }

  /**
   * Clear metrics history
   */
  public clearHistory(): void {
    this.metrics = [];
    this.alerts = [];
    this.recommendations = [];
    this.logger.log('Performance history cleared');
  }

  /**
   * Export performance data
   */
  public exportPerformanceData(): any {
    return {
      metrics: this.metrics,
      alerts: this.alerts,
      recommendations: this.recommendations,
      thresholds: this.thresholds,
      profiles: this.profiles,
      summary: this.getPerformanceSummary()
    };
  }
}