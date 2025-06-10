/**
 * Metrics Service
 *
 * Collects and reports performance metrics, error rates, and usage statistics
 * Implements composition pattern for flexible metric collection
 */

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

export interface OperationMetrics {
  operationName: string;
  operationType: 'query' | 'mutation' | 'subscription';
  duration: number;
  complexity?: number;
  depth?: number;
  success: boolean;
  errorCode?: string;
  userId?: string;
  timestamp: Date;
}

export interface ErrorMetrics {
  error: Error;
  operationName?: string | undefined;
  userId?: string | undefined;
  context?: Record<string, unknown> | undefined;
  timestamp: Date;
}

export interface CacheMetrics {
  operation: 'hit' | 'miss' | 'set' | 'delete';
  key: string;
  duration?: number;
  size?: number;
  timestamp: Date;
}

export interface SystemMetrics {
  memoryUsage: NodeJS.MemoryUsage;
  cpuUsage: NodeJS.CpuUsage;
  activeConnections: number;
  timestamp: Date;
}

@Injectable()
export class MetricsService {
  private readonly logger = new Logger(MetricsService.name);
  private readonly redis: Redis;
  private readonly metricsEnabled: boolean;
  private readonly systemMetricsInterval?: NodeJS.Timeout;

  // In-memory counters for performance
  private operationCounts = new Map<string, number>();
  private errorCounts = new Map<string, number>();
  private lastFlush = Date.now();

  constructor(private readonly configService: ConfigService) {
    const redisUrl = this.configService.get<string>('redisUrl');
    if (!redisUrl) {
      throw new Error('Redis URL is required for metrics service');
    }
    this.redis = new Redis(redisUrl);
    this.metricsEnabled = this.configService.get<boolean>(
      'metricsEnabled',
      true
    );

    if (this.metricsEnabled) {
      // Start system metrics collection
      this.systemMetricsInterval = setInterval(() => {
        this.collectSystemMetrics();
      }, 30000); // Every 30 seconds

      // Flush metrics every minute
      setInterval(() => {
        this.flushMetrics();
      }, 60000);
    }
  }

  /**
   * Records GraphQL operation metrics
   */
  recordOperation(metrics: OperationMetrics): void {
    if (!this.metricsEnabled) return;

    try {
      // Increment in-memory counter
      const key = `${metrics.operationType}:${metrics.operationName}`;
      this.operationCounts.set(key, (this.operationCounts.get(key) || 0) + 1);

      // Store detailed metrics in Redis (async)
      this.storeOperationMetrics(metrics).catch(error => {
        this.logger.warn(`Failed to store operation metrics: ${(error as Error).message}`);
      });

      // Log slow operations
      if (metrics.duration > 1000) {
        // > 1 second
        this.logger.warn(
          `Slow operation detected: ${metrics.operationName} took ${metrics.duration}ms`
        );
      }
    } catch (error) {
      this.logger.error(`Failed to record operation metrics: ${(error as Error).message}`);
    }
  }

  /**
   * Records error metrics
   */
  recordError(error: Error, context?: Partial<ErrorMetrics>): void {
    if (!this.metricsEnabled) return;

    try {
      const errorKey = error.constructor.name;
      this.errorCounts.set(errorKey, (this.errorCounts.get(errorKey) || 0) + 1);

      const errorMetrics: ErrorMetrics = {
        error,
        operationName: context?.operationName ?? undefined,
        userId: context?.userId ?? undefined,
        context: context?.context ?? undefined,
        timestamp: new Date(),
      };

      // Store error metrics (async)
      this.storeErrorMetrics(errorMetrics).catch(err => {
        this.logger.warn(`Failed to store error metrics: ${(err as Error).message}`);
      });

      // Log error
      this.logger.error(`GraphQL Error: ${error.message}`, {
        operationName: context?.operationName,
        userId: context?.userId,
        stack: error.stack,
      });
    } catch (err) {
      this.logger.error(`Failed to record error metrics: ${(err as Error).message}`);
    }
  }

  /**
   * Records cache operation metrics
   */
  recordCacheOperation(metrics: CacheMetrics): void {
    if (!this.metricsEnabled) return;

    try {
      const key = `cache:${metrics.operation}`;
      this.operationCounts.set(key, (this.operationCounts.get(key) || 0) + 1);

      // Store cache metrics (async)
      this.storeCacheMetrics(metrics).catch(error => {
        this.logger.warn(`Failed to store cache metrics: ${(error as Error).message}`);
      });
    } catch (error) {
      this.logger.error(`Failed to record cache metrics: ${(error as Error).message}`);
    }
  }

  /**
   * Gets current metrics summary
   */
  async getMetricsSummary(): Promise<{
    operations: Record<string, number>;
    errors: Record<string, number>;
    system: SystemMetrics;
    cache: {
      hitRate: number;
      totalOperations: number;
    };
  }> {
    try {
      // Get cache hit rate
      const cacheHits = this.operationCounts.get('cache:hit') || 0;
      const cacheMisses = this.operationCounts.get('cache:miss') || 0;
      const totalCacheOps = cacheHits + cacheMisses;
      const hitRate = totalCacheOps > 0 ? cacheHits / totalCacheOps : 0;

      return {
        operations: Object.fromEntries(this.operationCounts),
        errors: Object.fromEntries(this.errorCounts),
        system: await this.getCurrentSystemMetrics(),
        cache: {
          hitRate,
          totalOperations: totalCacheOps,
        },
      };
    } catch (error) {
      this.logger.error(`Failed to get metrics summary: ${(error as Error).message}`);
      throw error;
    }
  }

  /**
   * Resets all metrics counters
   */
  resetMetrics(): void {
    this.operationCounts.clear();
    this.errorCounts.clear();
    this.lastFlush = Date.now();
  }

  /**
   * Health check for metrics service
   */
  async healthCheck(): Promise<{ redis: boolean; collection: boolean }> {
    try {
      await this.redis.ping();
      return { redis: true, collection: this.metricsEnabled };
    } catch (error) {
      this.logger.error(
        `Metrics service health check failed: ${(error as Error).message}`
      );
      return { redis: false, collection: this.metricsEnabled };
    }
  }

  /**
   * Cleanup resources
   */
  onModuleDestroy(): void {
    if (this.systemMetricsInterval) {
      clearInterval(this.systemMetricsInterval);
    }
    this.flushMetrics();
  }

  // Private methods

  private async storeOperationMetrics(
    metrics: OperationMetrics
  ): Promise<void> {
    const key = `metrics:operations:${Date.now()}`;
    await this.redis.setex(key, 86400, JSON.stringify(metrics)); // 24 hour retention
  }

  private async storeErrorMetrics(metrics: ErrorMetrics): Promise<void> {
    const key = `metrics:errors:${Date.now()}`;
    const sanitizedMetrics = {
      ...metrics,
      error: {
        name: metrics.error.name,
        message: metrics.error.message,
        stack: metrics.error.stack,
      },
    };
    await this.redis.setex(key, 86400, JSON.stringify(sanitizedMetrics)); // 24 hour retention
  }

  private async storeCacheMetrics(metrics: CacheMetrics): Promise<void> {
    const key = `metrics:cache:${Date.now()}`;
    await this.redis.setex(key, 3600, JSON.stringify(metrics)); // 1 hour retention
  }

  private async storeSystemMetrics(metrics: SystemMetrics): Promise<void> {
    const key = `metrics:system:${Date.now()}`;
    await this.redis.setex(key, 3600, JSON.stringify(metrics)); // 1 hour retention
  }

  private collectSystemMetrics(): void {
    try {
      const metrics: SystemMetrics = {
        memoryUsage: process.memoryUsage(),
        cpuUsage: process.cpuUsage(),
        activeConnections: 0, // TODO: Get from server
        timestamp: new Date(),
      };

      this.storeSystemMetrics(metrics).catch(error => {
        this.logger.warn(`Failed to store system metrics: ${(error as Error).message}`);
      });
    } catch (error) {
      this.logger.error(`Failed to collect system metrics: ${(error as Error).message}`);
    }
  }

  private async getCurrentSystemMetrics(): Promise<SystemMetrics> {
    return {
      memoryUsage: process.memoryUsage(),
      cpuUsage: process.cpuUsage(),
      activeConnections: 0, // TODO: Get from server
      timestamp: new Date(),
    };
  }

  private async flushMetrics(): Promise<void> {
    try {
      const now = Date.now();
      const timeWindow = now - this.lastFlush;

      // Store aggregated counters
      for (const [key, count] of this.operationCounts) {
        await this.redis.hincrby('metrics:counters', key, count);
      }

      for (const [key, count] of this.errorCounts) {
        await this.redis.hincrby('metrics:errors', key, count);
      }

      // Reset counters
      this.operationCounts.clear();
      this.errorCounts.clear();
      this.lastFlush = now;

      this.logger.debug(`Flushed metrics for ${timeWindow}ms window`);
    } catch (error) {
      this.logger.error(`Failed to flush metrics: ${(error as Error).message}`);
    }
  }
}
