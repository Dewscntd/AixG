import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter } from 'events';
import { performance } from 'perf_hooks';
import * as os from 'os';
import * as fs from 'fs/promises';
// path import removed as it's not used

export interface BenchmarkConfig {
  name: string;
  description: string;
  iterations: number;
  warmupIterations: number;
  timeout: number;
  parallel: boolean;
  maxConcurrency?: number;
}

interface BenchmarkResult {
  name: string;
  timestamp: number;
  iterations: number;
  totalTime: number;
  averageTime: number;
  minTime: number;
  maxTime: number;
  p50: number;
  p95: number;
  p99: number;
  throughput: number;
  memoryUsage: {
    before: NodeJS.MemoryUsage;
    after: NodeJS.MemoryUsage;
    peak: number;
  };
  systemMetrics: {
    cpuUsage: number;
    loadAverage: number[];
    freeMemory: number;
  };
  errors: number;
  success: boolean;
}

interface ComparisonReport {
  baseline: BenchmarkResult;
  current: BenchmarkResult;
  improvement: {
    averageTime: number;
    throughput: number;
    memoryUsage: number;
    p95Latency: number;
  };
  verdict: 'improved' | 'degraded' | 'stable';
  recommendations: string[];
}

/**
 * Performance Benchmarker
 * Comprehensive benchmarking system with baseline comparison and reporting
 */
@Injectable()
export class PerformanceBenchmarker extends EventEmitter {
  private readonly logger = new Logger(PerformanceBenchmarker.name);
  private readonly benchmarkHistory = new Map<string, BenchmarkResult[]>();
  private readonly baselines = new Map<string, BenchmarkResult>();

  constructor() {
    super();
  }

  /**
   * Run comprehensive benchmark suite
   */
  async runBenchmark<T>(
    config: BenchmarkConfig,
    benchmarkFunction: () => Promise<T> | T
  ): Promise<BenchmarkResult> {
    this.logger.log(`Starting benchmark: ${config.name}`);

    const times: number[] = [];
    const memorySnapshots: number[] = [];
    let errors = 0;

    // Capture initial system state
    const initialMemory = process.memoryUsage();
    const initialCpuUsage = process.cpuUsage();

    // Warmup phase
    this.logger.debug(`Running ${config.warmupIterations} warmup iterations`);
    for (let i = 0; i < config.warmupIterations; i++) {
      try {
        await this.runSingleIteration(benchmarkFunction);
      } catch (error) {
        this.logger.warn(
          `Warmup iteration ${i + 1} failed: ${(error as Error).message}`
        );
      }
    }

    // Force garbage collection if available
    if (global.gc) {
      global.gc();
    }

    // Main benchmark phase
    this.logger.debug(`Running ${config.iterations} benchmark iterations`);

    if (config.parallel && config.maxConcurrency) {
      // Parallel execution
      const batches = this.createBatches(
        config.iterations,
        config.maxConcurrency
      );

      for (const batch of batches) {
        const batchPromises = batch.map(async () => {
          const startTime = performance.now();
          const startMemory = process.memoryUsage().heapUsed;

          try {
            await this.runSingleIteration(benchmarkFunction);
            const endTime = performance.now();
            const endMemory = process.memoryUsage().heapUsed;

            times.push(endTime - startTime);
            memorySnapshots.push(endMemory - startMemory);
          } catch (error) {
            errors++;
            this.logger.warn(
              `Benchmark iteration failed: ${(error as Error).message}`
            );
          }
        });

        await Promise.all(batchPromises);
      }
    } else {
      // Sequential execution
      for (let i = 0; i < config.iterations; i++) {
        const startTime = performance.now();
        const startMemory = process.memoryUsage().heapUsed;

        try {
          await this.runSingleIteration(benchmarkFunction);
          const endTime = performance.now();
          const endMemory = process.memoryUsage().heapUsed;

          times.push(endTime - startTime);
          memorySnapshots.push(endMemory - startMemory);

          // Emit progress
          if (i % Math.max(1, Math.floor(config.iterations / 10)) === 0) {
            this.emit('progress', {
              benchmark: config.name,
              completed: i + 1,
              total: config.iterations,
              percentage: ((i + 1) / config.iterations) * 100,
            });
          }
        } catch (error) {
          errors++;
          this.logger.warn(
            `Benchmark iteration ${i + 1} failed: ${(error as Error).message}`
          );
        }
      }
    }

    // Calculate final metrics
    const finalMemory = process.memoryUsage();
    const finalCpuUsage = process.cpuUsage(initialCpuUsage);

    const result = this.calculateBenchmarkResult(
      config,
      times,
      memorySnapshots,
      errors,
      initialMemory,
      finalMemory,
      finalCpuUsage
    );

    // Store result
    this.storeBenchmarkResult(config.name, result);

    this.logger.log(
      `Benchmark completed: ${config.name} - ${result.averageTime.toFixed(
        2
      )}ms avg`
    );

    return result;
  }

  /**
   * Run single benchmark iteration with timeout
   */
  private async runSingleIteration<T>(
    benchmarkFunction: () => Promise<T> | T,
    timeout: number = 30000
  ): Promise<T> {
    return Promise.race([
      Promise.resolve(benchmarkFunction()),
      new Promise<never>((_, reject) => {
        setTimeout(() => {
          reject(new Error('Benchmark iteration timeout'));
        }, timeout);
      }),
    ]);
  }

  /**
   * Create batches for parallel execution
   */
  private createBatches(total: number, batchSize: number): number[][] {
    const batches: number[][] = [];
    for (let i = 0; i < total; i += batchSize) {
      const batch = Array.from(
        { length: Math.min(batchSize, total - i) },
        (_, index) => i + index
      );
      batches.push(batch);
    }
    return batches;
  }

  /**
   * Calculate benchmark result from raw data
   */
  private calculateBenchmarkResult(
    config: BenchmarkConfig,
    times: number[],
    memorySnapshots: number[],
    errors: number,
    initialMemory: NodeJS.MemoryUsage,
    finalMemory: NodeJS.MemoryUsage,
    cpuUsage: NodeJS.CpuUsage
  ): BenchmarkResult {
    const sortedTimes = [...times].sort((a, b) => a - b);
    const totalTime = times.reduce((sum, time) => sum + time, 0);
    const averageTime = totalTime / times.length;

    const p50Index = Math.floor(sortedTimes.length * 0.5);
    const p95Index = Math.floor(sortedTimes.length * 0.95);
    const p99Index = Math.floor(sortedTimes.length * 0.99);

    const peakMemory = Math.max(...memorySnapshots);
    const throughput = (times.length / totalTime) * 1000; // ops/second

    return {
      name: config.name,
      timestamp: Date.now(),
      iterations: times.length,
      totalTime,
      averageTime,
      minTime: Math.min(...sortedTimes),
      maxTime: Math.max(...sortedTimes),
      p50: sortedTimes[p50Index] || 0,
      p95: sortedTimes[p95Index] || 0,
      p99: sortedTimes[p99Index] || 0,
      throughput,
      memoryUsage: {
        before: initialMemory,
        after: finalMemory,
        peak: peakMemory,
      },
      systemMetrics: {
        cpuUsage: (cpuUsage.user + cpuUsage.system) / 1000000, // Convert to seconds
        loadAverage: os.loadavg(),
        freeMemory: os.freemem(),
      },
      errors,
      success: errors === 0,
    };
  }

  /**
   * Store benchmark result
   */
  private storeBenchmarkResult(name: string, result: BenchmarkResult): void {
    if (!this.benchmarkHistory.has(name)) {
      this.benchmarkHistory.set(name, []);
    }

    const history = this.benchmarkHistory.get(name)!;
    history.push(result);

    // Keep only last 100 results
    if (history.length > 100) {
      history.shift();
    }

    this.emit('benchmarkComplete', result);
  }

  /**
   * Set baseline for comparison
   */
  setBaseline(name: string, result?: BenchmarkResult): void {
    const baseline = result || this.getLatestResult(name);
    if (baseline) {
      this.baselines.set(name, baseline);
      this.logger.log(
        `Baseline set for ${name}: ${baseline.averageTime.toFixed(2)}ms avg`
      );
    }
  }

  /**
   * Compare current result with baseline
   */
  compareWithBaseline(
    name: string,
    current?: BenchmarkResult
  ): ComparisonReport | null {
    const baseline = this.baselines.get(name);
    const currentResult = current || this.getLatestResult(name);

    if (!baseline || !currentResult) {
      return null;
    }

    const improvement = {
      averageTime:
        ((baseline.averageTime - currentResult.averageTime) /
          baseline.averageTime) *
        100,
      throughput:
        ((currentResult.throughput - baseline.throughput) /
          baseline.throughput) *
        100,
      memoryUsage:
        ((baseline.memoryUsage.peak - currentResult.memoryUsage.peak) /
          baseline.memoryUsage.peak) *
        100,
      p95Latency: ((baseline.p95 - currentResult.p95) / baseline.p95) * 100,
    };

    const verdict = this.determineVerdict(improvement);
    const recommendations = this.generateRecommendations(
      improvement,
      currentResult
    );

    return {
      baseline,
      current: currentResult,
      improvement,
      verdict,
      recommendations,
    };
  }

  /**
   * Get latest benchmark result
   */
  private getLatestResult(name: string): BenchmarkResult | null {
    const history = this.benchmarkHistory.get(name);
    return history && history.length > 0
      ? history[history.length - 1] ?? null
      : null;
  }

  /**
   * Determine performance verdict
   */
  private determineVerdict(
    improvement: ComparisonReport['improvement']
  ): ComparisonReport['verdict'] {
    const avgImprovement =
      (improvement.averageTime +
        improvement.throughput -
        improvement.p95Latency) /
      3;

    if (avgImprovement > 5) {
      return 'improved';
    } else if (avgImprovement < -5) {
      return 'degraded';
    } else {
      return 'stable';
    }
  }

  /**
   * Generate performance recommendations
   */
  private generateRecommendations(
    improvement: ComparisonReport['improvement'],
    result: BenchmarkResult
  ): string[] {
    const recommendations: string[] = [];

    if (improvement.averageTime < -10) {
      recommendations.push(
        'Average response time has degraded significantly - investigate recent changes'
      );
    }

    if (improvement.throughput < -15) {
      recommendations.push(
        'Throughput has decreased - consider scaling or optimization'
      );
    }

    if (improvement.memoryUsage < -20) {
      recommendations.push(
        'Memory usage has increased - check for memory leaks'
      );
    }

    if (improvement.p95Latency < -25) {
      recommendations.push(
        'P95 latency has increased - review slow operations'
      );
    }

    if (result.errors > 0) {
      recommendations.push(
        `${result.errors} errors occurred during benchmark - investigate error causes`
      );
    }

    if (result.systemMetrics.cpuUsage > 80) {
      recommendations.push(
        'High CPU usage detected - consider CPU optimization'
      );
    }

    return recommendations;
  }

  /**
   * Generate comprehensive performance report
   */
  async generateReport(benchmarkNames?: string[]): Promise<string> {
    const names = benchmarkNames || Array.from(this.benchmarkHistory.keys());
    let report = '# 🚀 Performance Benchmark Report\n\n';

    report += `**Generated**: ${new Date().toISOString()}\n`;
    report += `**System**: ${os.platform()} ${os.arch()}\n`;
    report += `**Node.js**: ${process.version}\n`;
    report += `**Memory**: ${(os.totalmem() / 1024 / 1024 / 1024).toFixed(
      2
    )} GB\n`;
    report += `**CPU**: ${os.cpus()[0]?.model || 'Unknown'} (${
      os.cpus().length
    } cores)\n\n`;

    for (const name of names) {
      const history = this.benchmarkHistory.get(name);
      const baseline = this.baselines.get(name);
      const latest = this.getLatestResult(name);

      if (!history || !latest) continue;

      report += `## 📊 ${name}

`;

      // Latest results
      report += `### Latest Results
`;
      report += `- **Average Time**: ${latest.averageTime.toFixed(2)}ms
`;
      report += `- **P95 Latency**: ${latest.p95.toFixed(2)}ms
`;
      report += `- **P99 Latency**: ${latest.p99.toFixed(2)}ms
`;
      report += `- **Throughput**: ${latest.throughput.toFixed(2)} ops/sec
`;
      report += `- **Success Rate**: ${(
        ((latest.iterations - latest.errors) / latest.iterations) *
        100
      ).toFixed(2)}%
`;
      report += `- **Memory Peak**: ${(
        latest.memoryUsage.peak /
        1024 /
        1024
      ).toFixed(2)} MB

`;

      // Baseline comparison
      if (baseline) {
        const comparison = this.compareWithBaseline(name);
        if (comparison) {
          report += `### Baseline Comparison
`;
          report += `- **Performance**: ${comparison.verdict.toUpperCase()}
`;
          report += `- **Average Time**: ${
            comparison.improvement.averageTime > 0 ? '+' : ''
          }${comparison.improvement.averageTime.toFixed(2)}%
`;
          report += `- **Throughput**: ${
            comparison.improvement.throughput > 0 ? '+' : ''
          }${comparison.improvement.throughput.toFixed(2)}%
`;
          report += `- **P95 Latency**: ${
            comparison.improvement.p95Latency > 0 ? '+' : ''
          }${comparison.improvement.p95Latency.toFixed(2)}%
`;
          report += `- **Memory Usage**: ${
            comparison.improvement.memoryUsage > 0 ? '+' : ''
          }${comparison.improvement.memoryUsage.toFixed(2)}%

`;

          if (comparison.recommendations.length > 0) {
            report += `### Recommendations
`;
            comparison.recommendations.forEach(rec => {
              report += `- ${rec}
`;
            });
            report += '\n';
          }
        }
      }

      // Historical trend
      if (history.length > 1) {
        const trend = this.calculateTrend(history);
        report += `### Historical Trend (${history.length} runs)
`;
        report += `- **Average Time Trend**: ${trend.averageTime}
`;
        report += `- **Throughput Trend**: ${trend.throughput}
`;
        report += `- **Stability**: ${trend.stability}

`;
      }
    }

    return report;
  }

  /**
   * Calculate performance trend
   */
  private calculateTrend(history: BenchmarkResult[]): {
    averageTime: string;
    throughput: string;
    stability: string;
  } {
    if (history.length < 5) {
      return {
        averageTime: 'insufficient data',
        throughput: 'insufficient data',
        stability: 'insufficient data',
      };
    }

    const recent = history.slice(-5);
    const previous = history.slice(-10, -5);

    const recentAvgTime =
      recent.reduce((sum, r) => sum + r.averageTime, 0) / recent.length;
    const previousAvgTime =
      previous.reduce((sum, r) => sum + r.averageTime, 0) / previous.length;

    const recentThroughput =
      recent.reduce((sum, r) => sum + r.throughput, 0) / recent.length;
    const previousThroughput =
      previous.reduce((sum, r) => sum + r.throughput, 0) / previous.length;

    const timeChange =
      ((recentAvgTime - previousAvgTime) / previousAvgTime) * 100;
    const throughputChange =
      ((recentThroughput - previousThroughput) / previousThroughput) * 100;

    // Calculate stability (coefficient of variation)
    const avgTimes = recent.map(r => r.averageTime);
    const mean = avgTimes.reduce((sum, t) => sum + t, 0) / avgTimes.length;
    const variance =
      avgTimes.reduce((sum, t) => sum + Math.pow(t - mean, 2), 0) /
      avgTimes.length;
    const stdDev = Math.sqrt(variance);
    const cv = (stdDev / mean) * 100;

    return {
      averageTime:
        timeChange > 5 ? 'degrading' : timeChange < -5 ? 'improving' : 'stable',
      throughput:
        throughputChange > 5
          ? 'improving'
          : throughputChange < -5
          ? 'degrading'
          : 'stable',
      stability: cv < 10 ? 'stable' : cv < 20 ? 'moderate' : 'unstable',
    };
  }

  /**
   * Export benchmark data to JSON
   */
  async exportData(filePath: string, benchmarkNames?: string[]): Promise<void> {
    const names = benchmarkNames || Array.from(this.benchmarkHistory.keys());
    const exportData = {
      timestamp: new Date().toISOString(),
      system: {
        platform: os.platform(),
        arch: os.arch(),
        nodeVersion: process.version,
        totalMemory: os.totalmem(),
        cpuModel: os.cpus()[0]?.model || 'Unknown',
        cpuCount: os.cpus().length,
      },
      benchmarks: {} as Record<string, unknown>,
    };

    for (const name of names) {
      const history = this.benchmarkHistory.get(name);
      const baseline = this.baselines.get(name);

      if (history) {
        exportData.benchmarks[name] = {
          history,
          baseline,
          latest: history[history.length - 1],
          summary: {
            totalRuns: history.length,
            averageTime:
              history.reduce((sum, r) => sum + r.averageTime, 0) /
              history.length,
            bestTime: Math.min(...history.map(r => r.averageTime)),
            worstTime: Math.max(...history.map(r => r.averageTime)),
          },
        };
      }
    }

    await fs.writeFile(filePath, JSON.stringify(exportData, null, 2));
    this.logger.log(`Benchmark data exported to ${filePath}`);
  }

  /**
   * Import benchmark data from JSON
   */
  async importData(filePath: string): Promise<void> {
    try {
      const data = await fs.readFile(filePath, 'utf-8');
      const importData = JSON.parse(data);

      for (const [name, benchmarkData] of Object.entries(
        importData.benchmarks as Record<string, unknown>
      )) {
        const data = benchmarkData as {
          history?: BenchmarkResult[];
          baseline?: BenchmarkResult;
        };
        if (data.history) {
          this.benchmarkHistory.set(name, data.history);
        }
        if (data.baseline) {
          this.baselines.set(name, data.baseline);
        }
      }

      this.logger.log(`Benchmark data imported from ${filePath}`);
    } catch (error) {
      this.logger.error(
        `Failed to import benchmark data: ${(error as Error).message}`
      );
      throw error;
    }
  }

  /**
   * Get benchmark statistics
   */
  getStatistics(): {
    totalBenchmarks: number;
    totalRuns: number;
    averageRunsPerBenchmark: number;
    benchmarkNames: string[];
    oldestResult: Date | null;
    newestResult: Date | null;
  } {
    const names = Array.from(this.benchmarkHistory.keys());
    const totalRuns = Array.from(this.benchmarkHistory.values()).reduce(
      (sum, history) => sum + history.length,
      0
    );

    let oldestTimestamp = Infinity;
    let newestTimestamp = 0;

    for (const history of this.benchmarkHistory.values()) {
      for (const result of history) {
        oldestTimestamp = Math.min(oldestTimestamp, result.timestamp);
        newestTimestamp = Math.max(newestTimestamp, result.timestamp);
      }
    }

    return {
      totalBenchmarks: names.length,
      totalRuns,
      averageRunsPerBenchmark: names.length > 0 ? totalRuns / names.length : 0,
      benchmarkNames: names,
      oldestResult:
        oldestTimestamp !== Infinity ? new Date(oldestTimestamp) : null,
      newestResult: newestTimestamp > 0 ? new Date(newestTimestamp) : null,
    };
  }
}
