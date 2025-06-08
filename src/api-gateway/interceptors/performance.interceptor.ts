/**
 * Performance Interceptor
 * 
 * Intercepts requests to monitor and optimize GraphQL performance
 * Implements composition pattern for flexible performance monitoring
 */

import { Injectable, NestInterceptor, ExecutionContext, CallHandler, Logger } from '@nestjs/common';
import { GqlExecutionContext } from '@nestjs/graphql';
import { Observable } from 'rxjs';
import { tap, timeout, catchError } from 'rxjs/operators';
import { ConfigService } from '@nestjs/config';
import { MetricsService } from '../services/metrics.service';
import { GraphQLContext } from '../types/context';
import { GraphQLInfo, GraphQLSelection } from './logging.interceptor';

// Health check metrics interface
export interface HealthCheckMetrics {
  memoryUsagePercent: string;
  uptimeHours: string;
  [key: string]: unknown;
}

export interface PerformanceMetrics {
  operationName: string;
  operationType: string;
  startTime: number;
  endTime?: number;
  duration?: number;
  memoryUsageBefore: NodeJS.MemoryUsage;
  memoryUsageAfter?: NodeJS.MemoryUsage;
  memoryDelta?: {
    rss: number;
    heapUsed: number;
    heapTotal: number;
    external: number;
  };
  cpuUsageBefore: NodeJS.CpuUsage;
  cpuUsageAfter?: NodeJS.CpuUsage;
  cpuDelta?: NodeJS.CpuUsage;
  complexity?: number;
  depth?: number;
  resultSize?: number;
  cacheHits?: number;
  cacheMisses?: number;
}

@Injectable()
export class PerformanceInterceptor implements NestInterceptor {
  private readonly logger = new Logger(PerformanceInterceptor.name);
  private readonly requestTimeout: number;
  private readonly slowQueryThreshold: number;
  private readonly memoryWarningThreshold: number;

  constructor(
    private readonly configService: ConfigService,
    private readonly metricsService: MetricsService
  ) {
    this.requestTimeout = this.configService.get<number>('requestTimeout', 30000); // 30 seconds
    this.slowQueryThreshold = this.configService.get<number>('slowQueryThreshold', 1000); // 1 second
    this.memoryWarningThreshold = this.configService.get<number>('memoryWarningThreshold', 100 * 1024 * 1024); // 100MB
  }

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const gqlContext = GqlExecutionContext.create(context);
    const ctx = gqlContext.getContext<GraphQLContext>();
    const info = gqlContext.getInfo();

    // Skip performance monitoring for introspection queries
    if (this.isIntrospectionQuery(info)) {
      return next.handle();
    }

    // Initialize performance metrics
    const metrics: PerformanceMetrics = {
      operationName: info?.operation?.name?.value || 'anonymous',
      operationType: this.getOperationType(info),
      startTime: Date.now(),
      memoryUsageBefore: process.memoryUsage(),
      cpuUsageBefore: process.cpuUsage(),
      complexity: ctx.metadata?.queryComplexity,
      depth: ctx.metadata?.queryDepth,
    };

    // Log operation start
    this.logger.debug('Performance monitoring started', {
      operationName: metrics.operationName,
      operationType: metrics.operationType,
      correlationId: ctx.correlationId,
    });

    return next.handle().pipe(
      // Add timeout protection
      timeout(this.requestTimeout),
      
      // Monitor successful completion
      tap((result) => {
        this.recordSuccessfulCompletion(metrics, result, ctx);
      }),
      
      // Monitor errors and timeouts
      catchError((error) => {
        this.recordErrorCompletion(metrics, error, ctx);
        throw error;
      })
    );
  }

  /**
   * Records metrics for successful operation completion
   */
  private recordSuccessfulCompletion(
    metrics: PerformanceMetrics,
    result: unknown,
    context: GraphQLContext
  ): void {
    this.finalizeMetrics(metrics, result);
    this.analyzePerformance(metrics, context);
    this.recordMetrics(metrics, true);
  }

  /**
   * Records metrics for error completion
   */
  private recordErrorCompletion(
    metrics: PerformanceMetrics,
    error: Error,
    context: GraphQLContext
  ): void {
    this.finalizeMetrics(metrics);
    this.analyzePerformance(metrics, context, error);
    this.recordMetrics(metrics, false);
  }

  /**
   * Finalizes performance metrics calculation
   */
  private finalizeMetrics(metrics: PerformanceMetrics, result?: unknown): void {
    metrics.endTime = Date.now();
    metrics.duration = metrics.endTime - metrics.startTime;
    metrics.memoryUsageAfter = process.memoryUsage();
    metrics.cpuUsageAfter = process.cpuUsage(metrics.cpuUsageBefore);

    // Calculate memory delta
    metrics.memoryDelta = {
      rss: metrics.memoryUsageAfter.rss - metrics.memoryUsageBefore.rss,
      heapUsed: metrics.memoryUsageAfter.heapUsed - metrics.memoryUsageBefore.heapUsed,
      heapTotal: metrics.memoryUsageAfter.heapTotal - metrics.memoryUsageBefore.heapTotal,
      external: metrics.memoryUsageAfter.external - metrics.memoryUsageBefore.external,
    };

    // Calculate result size
    if (result) {
      metrics.resultSize = this.calculateResultSize(result);
    }
  }

  /**
   * Analyzes performance and logs warnings for issues
   */
  private analyzePerformance(
    metrics: PerformanceMetrics,
    context: GraphQLContext,
    _error?: Error
  ): void {
    const logData = {
      operationName: metrics.operationName,
      duration: metrics.duration,
      memoryDelta: metrics.memoryDelta,
      cpuUsage: metrics.cpuUsageAfter,
      correlationId: context.correlationId,
      userId: context.user?.id,
    };

    // Check for slow queries
    if (metrics.duration && metrics.duration > this.slowQueryThreshold) {
      this.logger.warn('Slow GraphQL operation detected', {
        ...logData,
        threshold: this.slowQueryThreshold,
        slowBy: metrics.duration - this.slowQueryThreshold,
      });
    }

    // Check for high memory usage
    if (metrics.memoryDelta && metrics.memoryDelta.heapUsed > this.memoryWarningThreshold) {
      this.logger.warn('High memory usage detected', {
        ...logData,
        memoryIncrease: metrics.memoryDelta.heapUsed,
        threshold: this.memoryWarningThreshold,
      });
    }

    // Check for high CPU usage
    if (metrics.cpuUsageAfter && (metrics.cpuUsageAfter.user + metrics.cpuUsageAfter.system) > 1000000) { // 1 second
      this.logger.warn('High CPU usage detected', {
        ...logData,
        cpuTime: metrics.cpuUsageAfter.user + metrics.cpuUsageAfter.system,
      });
    }

    // Check for large result sets
    if (metrics.resultSize && metrics.resultSize > 1024 * 1024) { // 1MB
      this.logger.warn('Large result set detected', {
        ...logData,
        resultSize: metrics.resultSize,
        resultSizeMB: (metrics.resultSize / (1024 * 1024)).toFixed(2),
      });
    }

    // Log performance summary
    this.logger.debug('Performance metrics', logData);
  }

  /**
   * Records metrics in the metrics service
   */
  private recordMetrics(metrics: PerformanceMetrics, success: boolean): void {
    this.metricsService.recordOperation({
      operationName: metrics.operationName,
      operationType: metrics.operationType as 'query' | 'mutation' | 'subscription',
      duration: metrics.duration || 0,
      complexity: metrics.complexity,
      depth: metrics.depth,
      success,
      timestamp: new Date(),
    });
  }

  /**
   * Calculates the size of the result in bytes
   */
  private calculateResultSize(result: unknown): number {
    try {
      return Buffer.byteLength(JSON.stringify(result), 'utf8');
    } catch {
      return 0;
    }
  }

  /**
   * Determines the operation type from GraphQL info
   */
  private getOperationType(info: GraphQLInfo): string {
    if (!info?.operation?.operation) {
      return 'unknown';
    }
    return info.operation.operation;
  }

  /**
   * Checks if the operation is an introspection query
   */
  private isIntrospectionQuery(info: GraphQLInfo): boolean {
    if (!info?.operation?.selectionSet?.selections) {
      return false;
    }

    return info.operation.selectionSet.selections.some((selection: GraphQLSelection) =>
      selection.name?.value === '__schema' || selection.name?.value === '__type'
    );
  }

  /**
   * Gets current system performance metrics
   */
  getSystemMetrics(): {
    memory: NodeJS.MemoryUsage;
    cpu: NodeJS.CpuUsage;
    uptime: number;
  } {
    return {
      memory: process.memoryUsage(),
      cpu: process.cpuUsage(),
      uptime: process.uptime(),
    };
  }

  /**
   * Health check for performance monitoring
   */
  async healthCheck(): Promise<{
    monitoring: boolean;
    systemHealth: 'good' | 'warning' | 'critical';
    metrics: HealthCheckMetrics;
  }> {
    try {
      const systemMetrics = this.getSystemMetrics();
      const memoryUsagePercent = (systemMetrics.memory.heapUsed / systemMetrics.memory.heapTotal) * 100;
      
      let systemHealth: 'good' | 'warning' | 'critical' = 'good';
      
      if (memoryUsagePercent > 90) {
        systemHealth = 'critical';
      } else if (memoryUsagePercent > 75) {
        systemHealth = 'warning';
      }

      return {
        monitoring: true,
        systemHealth,
        metrics: {
          memoryUsagePercent: memoryUsagePercent.toFixed(2),
          uptimeHours: (systemMetrics.uptime / 3600).toFixed(2),
        },
      };
    } catch (error) {
      this.logger.error('Performance health check failed', error);
      return {
        monitoring: false,
        systemHealth: 'critical',
        metrics: {
          memoryUsagePercent: 'unknown',
          uptimeHours: 'unknown',
        },
      };
    }
  }
}
