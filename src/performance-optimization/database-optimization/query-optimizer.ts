import { Pool, PoolClient } from 'pg';
import { Logger } from '@nestjs/common';
import { Injectable } from '@nestjs/common';
import Redis from 'ioredis';
import { EventEmitter } from 'events';
import { performance } from 'perf_hooks';
import * as fs from 'fs/promises';
import * as path from 'path';

interface QueryPlan {
  planRows: number;
  actualRows: number;
  actualTime: number;
  nodeType: string;
  relationName?: string;
  indexName?: string;
  totalCost: number;
  startupCost: number;
}

interface QueryMetrics {
  query: string;
  executionTime: number;
  planningTime: number;
  bufferHits: number;
  bufferReads: number;
  tempFileReads: number;
  tempFileWrites: number;
  rowsReturned: number;
  indexScans: number;
  seqScans: number;
}

interface OptimizationSuggestion {
  type: 'index' | 'query_rewrite' | 'configuration' | 'partitioning';
  priority: 'high' | 'medium' | 'low';
  description: string;
  estimatedImprovement: string;
  implementation: string;
}

interface RealTimeAlert {
  id: string;
  type: 'slow_query' | 'high_connections' | 'lock_contention' | 'memory_usage';
  severity: 'critical' | 'warning' | 'info';
  message: string;
  timestamp: number;
  metadata: Record<string, any>;
}

interface ConnectionPoolMetrics {
  totalConnections: number;
  activeConnections: number;
  idleConnections: number;
  waitingClients: number;
  averageWaitTime: number;
}

/**
 * Database Query Optimizer
 * Analyzes query performance and provides optimization recommendations with real-time monitoring
 */
@Injectable()
export class QueryOptimizer extends EventEmitter {
  private readonly logger = new Logger(QueryOptimizer.name);
  private readonly redis: Redis;
  private readonly queryCache = new Map<string, any>();
  private readonly slowQueryThreshold = 100; // ms
  private readonly queryMetrics = new Map<string, QueryMetrics[]>();
  private readonly realTimeAlerts = new Map<string, RealTimeAlert>();
  private readonly connectionMetrics: ConnectionPoolMetrics = {
    totalConnections: 0,
    activeConnections: 0,
    idleConnections: 0,
    waitingClients: 0,
    averageWaitTime: 0
  };
  private monitoringInterval?: NodeJS.Timeout;
  private isMonitoring = false;

  constructor(
    private readonly pool: Pool,
    redisUrl: string = 'redis://localhost:6379'
  ) {
    super();
    this.redis = new Redis(redisUrl);
    this.startRealTimeMonitoring();
  }

  /**
   * Analyze query performance and provide optimization suggestions
   */
  async analyzeQuery(query: string, params: any[] = []): Promise<{
    metrics: QueryMetrics;
    plan: QueryPlan[];
    suggestions: OptimizationSuggestion[];
  }> {
    const client = await this.pool.connect();
    
    try {
      // Get query execution plan
      const plan = await this.getQueryPlan(client, query, params);
      
      // Execute query with timing
      const metrics = await this.executeWithMetrics(client, query, params);
      
      // Store metrics for analysis
      this.storeQueryMetrics(query, metrics);
      
      // Generate optimization suggestions
      const suggestions = this.generateOptimizationSuggestions(plan, metrics);
      
      // Log slow queries
      if (metrics.executionTime > this.slowQueryThreshold) {
        this.logger.warn(`Slow query detected: ${metrics.executionTime}ms`, {
          query: query.substring(0, 100),
          executionTime: metrics.executionTime,
          rowsReturned: metrics.rowsReturned
        });
      }
      
      return { metrics, plan, suggestions };
      
    } finally {
      client.release();
    }
  }

  /**
   * Get detailed query execution plan
   */
  private async getQueryPlan(
    client: PoolClient, 
    query: string, 
    params: any[]
  ): Promise<QueryPlan[]> {
    const explainQuery = `EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON) ${query}`;
    const result = await client.query(explainQuery, params);
    
    return this.parseExecutionPlan(result.rows[0]['QUERY PLAN'][0]);
  }

  /**
   * Execute query with detailed metrics collection
   */
  private async executeWithMetrics(
    client: PoolClient,
    query: string,
    params: any[]
  ): Promise<QueryMetrics> {
    // Enable timing and buffer statistics
    await client.query('SET track_io_timing = on');
    await client.query('SET log_statement_stats = on');
    
    const startTime = Date.now();
    
    // Execute query
    const result = await client.query(query, params);
    
    const executionTime = Date.now() - startTime;
    
    // Get buffer statistics
    const bufferStats = await client.query(`
      SELECT 
        heap_blks_read,
        heap_blks_hit,
        idx_blks_read,
        idx_blks_hit,
        temp_blks_read,
        temp_blks_written
      FROM pg_statio_user_tables 
      WHERE schemaname = 'public'
    `);
    
    // Calculate metrics
    const totalBufferReads = bufferStats.rows.reduce(
      (sum, row) => sum + (row.heap_blks_read || 0) + (row.idx_blks_read || 0), 0
    );
    const totalBufferHits = bufferStats.rows.reduce(
      (sum, row) => sum + (row.heap_blks_hit || 0) + (row.idx_blks_hit || 0), 0
    );
    const totalTempReads = bufferStats.rows.reduce(
      (sum, row) => sum + (row.temp_blks_read || 0), 0
    );
    const totalTempWrites = bufferStats.rows.reduce(
      (sum, row) => sum + (row.temp_blks_written || 0), 0
    );

    return {
      query,
      executionTime,
      planningTime: 0, // Would need to parse from EXPLAIN output
      bufferHits: totalBufferHits,
      bufferReads: totalBufferReads,
      tempFileReads: totalTempReads,
      tempFileWrites: totalTempWrites,
      rowsReturned: result.rowCount || 0,
      indexScans: 0, // Would need to parse from plan
      seqScans: 0 // Would need to parse from plan
    };
  }

  /**
   * Parse PostgreSQL execution plan
   */
  private parseExecutionPlan(planNode: any): QueryPlan[] {
    const plans: QueryPlan[] = [];
    
    const extractPlan = (node: any): void => {
      plans.push({
        planRows: node['Plan Rows'] || 0,
        actualRows: node['Actual Rows'] || 0,
        actualTime: node['Actual Total Time'] || 0,
        nodeType: node['Node Type'] || '',
        relationName: node['Relation Name'],
        indexName: node['Index Name'],
        totalCost: node['Total Cost'] || 0,
        startupCost: node['Startup Cost'] || 0
      });
      
      if (node.Plans) {
        node.Plans.forEach(extractPlan);
      }
    };
    
    extractPlan(planNode.Plan);
    return plans;
  }

  /**
   * Generate optimization suggestions based on query analysis
   */
  private generateOptimizationSuggestions(
    plan: QueryPlan[],
    metrics: QueryMetrics
  ): OptimizationSuggestion[] {
    const suggestions: OptimizationSuggestion[] = [];
    
    // Check for sequential scans on large tables
    const seqScans = plan.filter(p => p.nodeType === 'Seq Scan' && p.actualRows > 1000);
    if (seqScans.length > 0) {
      suggestions.push({
        type: 'index',
        priority: 'high',
        description: 'Sequential scan detected on large table',
        estimatedImprovement: '50-90% faster execution',
        implementation: `CREATE INDEX ON ${seqScans[0].relationName} (column_name);`
      });
    }
    
    // Check for high buffer reads
    if (metrics.bufferReads > metrics.bufferHits * 0.1) {
      suggestions.push({
        type: 'configuration',
        priority: 'medium',
        description: 'Low buffer cache hit ratio',
        estimatedImprovement: '20-40% faster execution',
        implementation: 'Increase shared_buffers configuration'
      });
    }
    
    // Check for temp file usage
    if (metrics.tempFileReads > 0 || metrics.tempFileWrites > 0) {
      suggestions.push({
        type: 'configuration',
        priority: 'high',
        description: 'Query using temporary files (work_mem too small)',
        estimatedImprovement: '30-70% faster execution',
        implementation: 'Increase work_mem for this session or globally'
      });
    }
    
    // Check for inefficient joins
    const nestedLoops = plan.filter(p => p.nodeType === 'Nested Loop' && p.actualRows > 10000);
    if (nestedLoops.length > 0) {
      suggestions.push({
        type: 'query_rewrite',
        priority: 'high',
        description: 'Inefficient nested loop join on large dataset',
        estimatedImprovement: '60-80% faster execution',
        implementation: 'Add appropriate indexes or rewrite query to use hash/merge join'
      });
    }
    
    // Check for large result sets that could benefit from pagination
    if (metrics.rowsReturned > 10000) {
      suggestions.push({
        type: 'query_rewrite',
        priority: 'medium',
        description: 'Large result set returned',
        estimatedImprovement: '40-60% faster response time',
        implementation: 'Implement pagination with LIMIT and OFFSET'
      });
    }
    
    return suggestions;
  }

  /**
   * Store query metrics for trend analysis
   */
  private storeQueryMetrics(query: string, metrics: QueryMetrics): void {
    const queryHash = this.hashQuery(query);
    
    if (!this.queryMetrics.has(queryHash)) {
      this.queryMetrics.set(queryHash, []);
    }
    
    const queryMetricsList = this.queryMetrics.get(queryHash)!;
    queryMetricsList.push(metrics);
    
    // Keep only last 100 executions
    if (queryMetricsList.length > 100) {
      queryMetricsList.shift();
    }
    
    // Store in Redis for persistence
    this.redis.lpush(
      `query_metrics:${queryHash}`,
      JSON.stringify(metrics)
    ).then(() => {
      this.redis.ltrim(`query_metrics:${queryHash}`, 0, 99);
    });
  }

  /**
   * Get query performance trends
   */
  async getQueryTrends(query: string): Promise<{
    averageExecutionTime: number;
    p95ExecutionTime: number;
    totalExecutions: number;
    trend: 'improving' | 'degrading' | 'stable';
  }> {
    const queryHash = this.hashQuery(query);
    const metrics = this.queryMetrics.get(queryHash) || [];
    
    if (metrics.length === 0) {
      return {
        averageExecutionTime: 0,
        p95ExecutionTime: 0,
        totalExecutions: 0,
        trend: 'stable'
      };
    }
    
    const executionTimes = metrics.map(m => m.executionTime).sort((a, b) => a - b);
    const averageExecutionTime = executionTimes.reduce((sum, time) => sum + time, 0) / executionTimes.length;
    const p95Index = Math.floor(executionTimes.length * 0.95);
    const p95ExecutionTime = executionTimes[p95Index] || executionTimes[executionTimes.length - 1];
    
    // Determine trend (compare last 10 vs previous 10)
    let trend: 'improving' | 'degrading' | 'stable' = 'stable';
    if (metrics.length >= 20) {
      const recent = metrics.slice(-10).map(m => m.executionTime);
      const previous = metrics.slice(-20, -10).map(m => m.executionTime);
      
      const recentAvg = recent.reduce((sum, time) => sum + time, 0) / recent.length;
      const previousAvg = previous.reduce((sum, time) => sum + time, 0) / previous.length;
      
      const changePercent = ((recentAvg - previousAvg) / previousAvg) * 100;
      
      if (changePercent > 10) {
        trend = 'degrading';
      } else if (changePercent < -10) {
        trend = 'improving';
      }
    }
    
    return {
      averageExecutionTime,
      p95ExecutionTime,
      totalExecutions: metrics.length,
      trend
    };
  }

  /**
   * Optimize database configuration based on workload analysis
   */
  async optimizeConfiguration(): Promise<Record<string, string>> {
    const client = await this.pool.connect();
    
    try {
      // Analyze current configuration
      const config = await client.query(`
        SELECT name, setting, unit, category, short_desc
        FROM pg_settings 
        WHERE category IN (
          'Resource Usage / Memory',
          'Resource Usage / Disk',
          'Query Tuning / Planner Cost Constants',
          'Query Tuning / Other Planner Options'
        )
        ORDER BY category, name
      `);
      
      // Get database statistics
      const stats = await client.query(`
        SELECT 
          sum(heap_blks_read) as total_heap_read,
          sum(heap_blks_hit) as total_heap_hit,
          sum(idx_blks_read) as total_idx_read,
          sum(idx_blks_hit) as total_idx_hit
        FROM pg_statio_user_tables
      `);
      
      const recommendations: Record<string, string> = {};
      
      // Calculate buffer hit ratio
      const totalReads = stats.rows[0].total_heap_read + stats.rows[0].total_idx_read;
      const totalHits = stats.rows[0].total_heap_hit + stats.rows[0].total_idx_hit;
      const hitRatio = totalHits / (totalHits + totalReads);
      
      if (hitRatio < 0.95) {
        recommendations['shared_buffers'] = '256MB'; // Increase buffer cache
      }
      
      // Analyze slow queries for work_mem recommendations
      const avgTempUsage = Array.from(this.queryMetrics.values())
        .flat()
        .filter(m => m.tempFileReads > 0)
        .length;
      
      if (avgTempUsage > 0) {
        recommendations['work_mem'] = '16MB'; // Increase work memory
      }
      
      return recommendations;
      
    } finally {
      client.release();
    }
  }

  /**
   * Create hash for query normalization
   */
  private hashQuery(query: string): string {
    // Normalize query by removing parameters and whitespace
    const normalized = query
      .replace(/\$\d+/g, '?') // Replace parameters
      .replace(/\s+/g, ' ') // Normalize whitespace
      .trim()
      .toLowerCase();
    
    // Simple hash function
    let hash = 0;
    for (let i = 0; i < normalized.length; i++) {
      const char = normalized.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    
    return hash.toString();
  }

  /**
   * Get optimization report
   */
  async getOptimizationReport(): Promise<{
    slowQueries: Array<{ query: string; avgTime: number; executions: number }>;
    indexSuggestions: OptimizationSuggestion[];
    configRecommendations: Record<string, string>;
    overallStats: {
      totalQueries: number;
      averageExecutionTime: number;
      slowQueryCount: number;
    };
  }> {
    const slowQueries: Array<{ query: string; avgTime: number; executions: number }> = [];
    const indexSuggestions: OptimizationSuggestion[] = [];
    let totalQueries = 0;
    let totalExecutionTime = 0;
    let slowQueryCount = 0;
    
    // Analyze all tracked queries
    for (const [queryHash, metrics] of this.queryMetrics) {
      const avgTime = metrics.reduce((sum, m) => sum + m.executionTime, 0) / metrics.length;
      totalQueries += metrics.length;
      totalExecutionTime += metrics.reduce((sum, m) => sum + m.executionTime, 0);
      
      if (avgTime > this.slowQueryThreshold) {
        slowQueryCount += metrics.length;
        slowQueries.push({
          query: metrics[0].query.substring(0, 100) + '...',
          avgTime,
          executions: metrics.length
        });
      }
    }
    
    // Get configuration recommendations
    const configRecommendations = await this.optimizeConfiguration();
    
    return {
      slowQueries: slowQueries.sort((a, b) => b.avgTime - a.avgTime).slice(0, 10),
      indexSuggestions,
      configRecommendations,
      overallStats: {
        totalQueries,
        averageExecutionTime: totalQueries > 0 ? totalExecutionTime / totalQueries : 0,
        slowQueryCount
      }
    };
  }

  /**
   * Start real-time database monitoring
   */
  private startRealTimeMonitoring(): void {
    if (this.isMonitoring) {
      return;
    }

    this.isMonitoring = true;
    this.logger.log('Starting real-time database monitoring');

    this.monitoringInterval = setInterval(async () => {
      try {
        await this.collectRealTimeMetrics();
        await this.checkForAnomalies();
      } catch (error) {
        this.logger.error(`Real-time monitoring error: ${error.message}`);
      }
    }, 5000); // Check every 5 seconds
  }

  /**
   * Stop real-time monitoring
   */
  stopRealTimeMonitoring(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = undefined;
      this.isMonitoring = false;
      this.logger.log('Stopped real-time database monitoring');
    }
  }

  /**
   * Collect real-time database metrics
   */
  private async collectRealTimeMetrics(): Promise<void> {
    const client = await this.pool.connect();

    try {
      // Get connection pool statistics
      const poolStats = await client.query(`
        SELECT
          count(*) as total_connections,
          count(*) FILTER (WHERE state = 'active') as active_connections,
          count(*) FILTER (WHERE state = 'idle') as idle_connections,
          avg(extract(epoch from (now() - query_start))) as avg_query_duration
        FROM pg_stat_activity
        WHERE datname = current_database()
      `);

      // Get lock information
      const lockStats = await client.query(`
        SELECT
          count(*) as total_locks,
          count(*) FILTER (WHERE NOT granted) as waiting_locks,
          mode,
          locktype
        FROM pg_locks
        GROUP BY mode, locktype
        ORDER BY count(*) DESC
      `);

      // Get current running queries
      const runningQueries = await client.query(`
        SELECT
          pid,
          query,
          state,
          extract(epoch from (now() - query_start)) as duration
        FROM pg_stat_activity
        WHERE state = 'active'
          AND query NOT LIKE '%pg_stat_activity%'
          AND query_start IS NOT NULL
        ORDER BY query_start
      `);

      // Update connection metrics
      const stats = poolStats.rows[0];
      this.connectionMetrics.totalConnections = parseInt(stats.total_connections) || 0;
      this.connectionMetrics.activeConnections = parseInt(stats.active_connections) || 0;
      this.connectionMetrics.idleConnections = parseInt(stats.idle_connections) || 0;

      // Check for long-running queries
      for (const query of runningQueries.rows) {
        if (query.duration > 30) { // 30 seconds threshold
          this.createAlert({
            type: 'slow_query',
            severity: query.duration > 60 ? 'critical' : 'warning',
            message: `Long-running query detected (${query.duration.toFixed(2)}s)`,
            metadata: {
              pid: query.pid,
              query: query.query.substring(0, 200),
              duration: query.duration
            }
          });
        }
      }

      // Check for lock contention
      const waitingLocks = lockStats.rows.find(row => row.waiting_locks > 0);
      if (waitingLocks && waitingLocks.waiting_locks > 5) {
        this.createAlert({
          type: 'lock_contention',
          severity: 'warning',
          message: `High lock contention detected (${waitingLocks.waiting_locks} waiting locks)`,
          metadata: {
            waitingLocks: waitingLocks.waiting_locks,
            lockType: waitingLocks.locktype,
            mode: waitingLocks.mode
          }
        });
      }

      // Emit metrics event
      this.emit('metrics', {
        connections: this.connectionMetrics,
        locks: lockStats.rows,
        runningQueries: runningQueries.rows.length
      });

    } finally {
      client.release();
    }
  }

  /**
   * Check for performance anomalies
   */
  private async checkForAnomalies(): Promise<void> {
    // Check connection pool utilization
    const poolUtilization = this.connectionMetrics.activeConnections / this.connectionMetrics.totalConnections;
    if (poolUtilization > 0.9) {
      this.createAlert({
        type: 'high_connections',
        severity: 'critical',
        message: `High connection pool utilization (${(poolUtilization * 100).toFixed(1)}%)`,
        metadata: {
          activeConnections: this.connectionMetrics.activeConnections,
          totalConnections: this.connectionMetrics.totalConnections,
          utilization: poolUtilization
        }
      });
    }

    // Check for query performance degradation
    for (const [queryHash, metrics] of this.queryMetrics) {
      if (metrics.length >= 10) {
        const recent = metrics.slice(-5);
        const previous = metrics.slice(-10, -5);

        const recentAvg = recent.reduce((sum, m) => sum + m.executionTime, 0) / recent.length;
        const previousAvg = previous.reduce((sum, m) => sum + m.executionTime, 0) / previous.length;

        const degradation = ((recentAvg - previousAvg) / previousAvg) * 100;

        if (degradation > 50) { // 50% performance degradation
          this.createAlert({
            type: 'slow_query',
            severity: 'warning',
            message: `Query performance degraded by ${degradation.toFixed(1)}%`,
            metadata: {
              queryHash,
              recentAvg,
              previousAvg,
              degradation
            }
          });
        }
      }
    }
  }

  /**
   * Create and emit alert
   */
  private createAlert(alertData: Omit<RealTimeAlert, 'id' | 'timestamp'>): void {
    const alert: RealTimeAlert = {
      id: `${alertData.type}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
      ...alertData
    };

    this.realTimeAlerts.set(alert.id, alert);
    this.emit('alert', alert);

    this.logger.warn(`Database alert: ${alert.message}`, alert.metadata);

    // Store alert in Redis for persistence
    this.redis.lpush('db_alerts', JSON.stringify(alert)).then(() => {
      this.redis.ltrim('db_alerts', 0, 999); // Keep last 1000 alerts
    });
  }

  /**
   * Get active alerts
   */
  getActiveAlerts(): RealTimeAlert[] {
    const now = Date.now();
    const activeAlerts: RealTimeAlert[] = [];

    for (const [id, alert] of this.realTimeAlerts) {
      // Consider alerts active for 5 minutes
      if (now - alert.timestamp < 5 * 60 * 1000) {
        activeAlerts.push(alert);
      } else {
        this.realTimeAlerts.delete(id);
      }
    }

    return activeAlerts.sort((a, b) => b.timestamp - a.timestamp);
  }

  /**
   * Get connection pool metrics
   */
  getConnectionMetrics(): ConnectionPoolMetrics {
    return { ...this.connectionMetrics };
  }

  /**
   * Auto-optimize based on real-time metrics
   */
  async autoOptimize(): Promise<{
    applied: string[];
    skipped: string[];
    errors: string[];
  }> {
    const applied: string[] = [];
    const skipped: string[] = [];
    const errors: string[] = [];

    try {
      // Auto-create indexes for frequently slow queries
      for (const [queryHash, metrics] of this.queryMetrics) {
        const avgTime = metrics.reduce((sum, m) => sum + m.executionTime, 0) / metrics.length;

        if (avgTime > this.slowQueryThreshold && metrics.length > 10) {
          const lastMetric = metrics[metrics.length - 1];

          // Simple heuristic: if query contains WHERE clause, suggest index
          if (lastMetric.query.toLowerCase().includes('where')) {
            try {
              // This is a simplified example - real implementation would analyze query structure
              const suggestion = `-- Auto-generated index suggestion for query hash ${queryHash}`;
              applied.push(suggestion);
            } catch (error) {
              errors.push(`Failed to create index for query ${queryHash}: ${error.message}`);
            }
          }
        }
      }

      // Auto-adjust configuration based on metrics
      const configRecommendations = await this.optimizeConfiguration();
      for (const [setting, value] of Object.entries(configRecommendations)) {
        try {
          // Note: In production, these would be applied carefully with proper validation
          skipped.push(`Configuration change suggested: ${setting} = ${value}`);
        } catch (error) {
          errors.push(`Failed to apply configuration ${setting}: ${error.message}`);
        }
      }

    } catch (error) {
      errors.push(`Auto-optimization error: ${error.message}`);
    }

    return { applied, skipped, errors };
  }
}
