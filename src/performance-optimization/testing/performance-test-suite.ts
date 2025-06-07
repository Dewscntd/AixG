import { Injectable, Logger } from '@nestjs/common';
import * as autocannon from 'autocannon';
import { performance } from 'perf_hooks';
import * as os from 'os';

interface LoadTestConfig {
  url: string;
  connections: number;
  duration: number;
  pipelining: number;
  headers?: Record<string, string>;
  body?: string;
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
}

interface LoadTestResult {
  requests: {
    total: number;
    average: number;
    mean: number;
    stddev: number;
    min: number;
    max: number;
    p50: number;
    p95: number;
    p99: number;
  };
  latency: {
    average: number;
    mean: number;
    stddev: number;
    min: number;
    max: number;
    p50: number;
    p95: number;
    p99: number;
  };
  throughput: {
    average: number;
    mean: number;
    stddev: number;
    min: number;
    max: number;
  };
  errors: number;
  timeouts: number;
  duration: number;
  start: Date;
  finish: Date;
}

interface PerformanceTestSuite {
  name: string;
  tests: PerformanceTest[];
  baseline?: LoadTestResult;
}

interface PerformanceTest {
  name: string;
  config: LoadTestConfig;
  expectedMetrics: {
    maxLatencyP95: number;
    minThroughput: number;
    maxErrorRate: number;
  };
}

/**
 * Performance Test Suite
 * Comprehensive load testing and performance validation
 */
@Injectable()
export class PerformanceTestSuite {
  private readonly logger = new Logger(PerformanceTestSuite.name);
  private readonly testResults = new Map<string, LoadTestResult>();

  /**
   * Run comprehensive performance test suite
   */
  async runTestSuite(suite: PerformanceTestSuite): Promise<{
    results: Map<string, LoadTestResult>;
    summary: {
      passed: number;
      failed: number;
      totalTests: number;
      overallScore: number;
    };
    recommendations: string[];
  }> {
    this.logger.log(`Starting performance test suite: ${suite.name}`);
    
    const results = new Map<string, LoadTestResult>();
    const recommendations: string[] = [];
    let passed = 0;
    let failed = 0;

    // Run each test in the suite
    for (const test of suite.tests) {
      try {
        this.logger.log(`Running test: ${test.name}`);
        
        const result = await this.runLoadTest(test.config);
        results.set(test.name, result);
        
        // Validate against expected metrics
        const validation = this.validateTestResult(result, test.expectedMetrics);
        
        if (validation.passed) {
          passed++;
          this.logger.log(`✅ Test passed: ${test.name}`);
        } else {
          failed++;
          this.logger.warn(`❌ Test failed: ${test.name}`);
          recommendations.push(...validation.recommendations);
        }
        
        // Wait between tests to avoid interference
        await this.sleep(5000);
        
      } catch (error) {
        failed++;
        this.logger.error(`Test error: ${test.name} - ${error.message}`);
        recommendations.push(`Fix test execution error in ${test.name}`);
      }
    }

    // Calculate overall score
    const overallScore = (passed / suite.tests.length) * 100;
    
    // Generate additional recommendations
    recommendations.push(...this.generateOptimizationRecommendations(results));

    const summary = {
      passed,
      failed,
      totalTests: suite.tests.length,
      overallScore
    };

    this.logger.log(`Test suite completed. Score: ${overallScore}% (${passed}/${suite.tests.length} passed)`);
    
    return { results, summary, recommendations };
  }

  /**
   * Run individual load test
   */
  async runLoadTest(config: LoadTestConfig): Promise<LoadTestResult> {
    return new Promise((resolve, reject) => {
      const instance = autocannon({
        url: config.url,
        connections: config.connections,
        duration: config.duration,
        pipelining: config.pipelining,
        headers: config.headers,
        body: config.body,
        method: config.method || 'GET',
        timeout: 30
      });

      instance.on('done', (result) => {
        const processedResult: LoadTestResult = {
          requests: {
            total: result.requests.total,
            average: result.requests.average,
            mean: result.requests.mean,
            stddev: result.requests.stddev,
            min: result.requests.min,
            max: result.requests.max,
            p50: result.requests.p50,
            p95: result.requests.p95,
            p99: result.requests.p99
          },
          latency: {
            average: result.latency.average,
            mean: result.latency.mean,
            stddev: result.latency.stddev,
            min: result.latency.min,
            max: result.latency.max,
            p50: result.latency.p50,
            p95: result.latency.p95,
            p99: result.latency.p99
          },
          throughput: {
            average: result.throughput.average,
            mean: result.throughput.mean,
            stddev: result.throughput.stddev,
            min: result.throughput.min,
            max: result.throughput.max
          },
          errors: result.errors,
          timeouts: result.timeouts,
          duration: result.duration,
          start: result.start,
          finish: result.finish
        };

        resolve(processedResult);
      });

      instance.on('error', reject);
    });
  }

  /**
   * Validate test result against expected metrics
   */
  private validateTestResult(
    result: LoadTestResult,
    expected: PerformanceTest['expectedMetrics']
  ): { passed: boolean; recommendations: string[] } {
    const recommendations: string[] = [];
    let passed = true;

    // Check latency P95
    if (result.latency.p95 > expected.maxLatencyP95) {
      passed = false;
      recommendations.push(
        `Latency P95 too high: ${result.latency.p95}ms > ${expected.maxLatencyP95}ms`
      );
    }

    // Check throughput
    if (result.throughput.average < expected.minThroughput) {
      passed = false;
      recommendations.push(
        `Throughput too low: ${result.throughput.average} < ${expected.minThroughput} req/s`
      );
    }

    // Check error rate
    const errorRate = (result.errors / result.requests.total) * 100;
    if (errorRate > expected.maxErrorRate) {
      passed = false;
      recommendations.push(
        `Error rate too high: ${errorRate.toFixed(2)}% > ${expected.maxErrorRate}%`
      );
    }

    return { passed, recommendations };
  }

  /**
   * Generate optimization recommendations based on results
   */
  private generateOptimizationRecommendations(
    results: Map<string, LoadTestResult>
  ): string[] {
    const recommendations: string[] = [];
    
    for (const [testName, result] of results) {
      // High latency recommendations
      if (result.latency.p95 > 500) {
        recommendations.push(`${testName}: Consider implementing caching to reduce latency`);
      }
      
      if (result.latency.p95 > 1000) {
        recommendations.push(`${testName}: Critical latency issue - review database queries and API optimization`);
      }

      // Low throughput recommendations
      if (result.throughput.average < 100) {
        recommendations.push(`${testName}: Low throughput - consider horizontal scaling or connection pooling`);
      }

      // High error rate recommendations
      const errorRate = (result.errors / result.requests.total) * 100;
      if (errorRate > 1) {
        recommendations.push(`${testName}: High error rate - review error handling and resource limits`);
      }

      // High latency variance recommendations
      if (result.latency.stddev > result.latency.mean * 0.5) {
        recommendations.push(`${testName}: High latency variance - investigate inconsistent performance`);
      }
    }

    return recommendations;
  }

  /**
   * Run stress test to find breaking point
   */
  async runStressTest(baseConfig: LoadTestConfig): Promise<{
    breakingPoint: number;
    results: Array<{ connections: number; result: LoadTestResult }>;
  }> {
    this.logger.log('Starting stress test to find breaking point');
    
    const results: Array<{ connections: number; result: LoadTestResult }> = [];
    let connections = baseConfig.connections;
    let breakingPoint = 0;

    while (connections <= 2000) { // Max 2000 connections
      const config = { ...baseConfig, connections };
      
      try {
        const result = await this.runLoadTest(config);
        results.push({ connections, result });
        
        // Check if we've hit the breaking point
        const errorRate = (result.errors / result.requests.total) * 100;
        const latencyP95 = result.latency.p95;
        
        if (errorRate > 5 || latencyP95 > 2000) {
          breakingPoint = connections;
          this.logger.log(`Breaking point found at ${connections} connections`);
          break;
        }
        
        connections += 50; // Increase by 50 connections each iteration
        await this.sleep(10000); // Wait 10 seconds between tests
        
      } catch (error) {
        this.logger.error(`Stress test failed at ${connections} connections: ${error.message}`);
        breakingPoint = connections;
        break;
      }
    }

    return { breakingPoint, results };
  }

  /**
   * Run endurance test for stability
   */
  async runEnduranceTest(config: LoadTestConfig, durationMinutes: number): Promise<{
    results: LoadTestResult[];
    stability: {
      latencyDrift: number;
      throughputDrift: number;
      memoryLeak: boolean;
    };
  }> {
    this.logger.log(`Starting ${durationMinutes}-minute endurance test`);
    
    const results: LoadTestResult[] = [];
    const testDuration = 60; // 1 minute per test
    const iterations = durationMinutes;
    
    for (let i = 0; i < iterations; i++) {
      const testConfig = { ...config, duration: testDuration };
      const result = await this.runLoadTest(testConfig);
      results.push(result);
      
      this.logger.log(`Endurance test iteration ${i + 1}/${iterations} completed`);
      
      // Brief pause between iterations
      await this.sleep(5000);
    }

    // Analyze stability
    const stability = this.analyzeStability(results);
    
    return { results, stability };
  }

  /**
   * Analyze stability from endurance test results
   */
  private analyzeStability(results: LoadTestResult[]): {
    latencyDrift: number;
    throughputDrift: number;
    memoryLeak: boolean;
  } {
    if (results.length < 2) {
      return { latencyDrift: 0, throughputDrift: 0, memoryLeak: false };
    }

    const firstResult = results[0];
    const lastResult = results[results.length - 1];
    
    // Calculate drift percentages
    const latencyDrift = ((lastResult.latency.p95 - firstResult.latency.p95) / firstResult.latency.p95) * 100;
    const throughputDrift = ((lastResult.throughput.average - firstResult.throughput.average) / firstResult.throughput.average) * 100;
    
    // Simple memory leak detection (would need actual memory monitoring)
    const memoryLeak = latencyDrift > 20 || throughputDrift < -20;

    return { latencyDrift, throughputDrift, memoryLeak };
  }

  /**
   * Generate performance report
   */
  generatePerformanceReport(
    suiteResults: Map<string, LoadTestResult>,
    stressResults?: { breakingPoint: number; results: Array<{ connections: number; result: LoadTestResult }> },
    enduranceResults?: { results: LoadTestResult[]; stability: any }
  ): string {
    let report = '# Performance Test Report\n\n';
    
    // Suite results
    report += '## Load Test Results\n\n';
    for (const [testName, result] of suiteResults) {
      report += `### ${testName}\n`;
      report += `- **Latency P95**: ${result.latency.p95}ms\n`;
      report += `- **Throughput**: ${result.throughput.average.toFixed(2)} req/s\n`;
      report += `- **Error Rate**: ${((result.errors / result.requests.total) * 100).toFixed(2)}%\n`;
      report += `- **Total Requests**: ${result.requests.total}\n\n`;
    }
    
    // Stress test results
    if (stressResults) {
      report += '## Stress Test Results\n\n';
      report += `- **Breaking Point**: ${stressResults.breakingPoint} concurrent connections\n`;
      report += `- **Max Stable Throughput**: ${stressResults.results[stressResults.results.length - 2]?.result.throughput.average.toFixed(2) || 'N/A'} req/s\n\n`;
    }
    
    // Endurance test results
    if (enduranceResults) {
      report += '## Endurance Test Results\n\n';
      report += `- **Latency Drift**: ${enduranceResults.stability.latencyDrift.toFixed(2)}%\n`;
      report += `- **Throughput Drift**: ${enduranceResults.stability.throughputDrift.toFixed(2)}%\n`;
      report += `- **Memory Leak Detected**: ${enduranceResults.stability.memoryLeak ? 'Yes' : 'No'}\n\n`;
    }
    
    return report;
  }

  /**
   * Sleep utility
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Example test suite configuration
export const FootAnalyticsTestSuite: PerformanceTestSuite = {
  name: 'FootAnalytics Performance Test Suite',
  tests: [
    {
      name: 'API Gateway Health Check',
      config: {
        url: 'http://localhost:4000/graphql',
        connections: 100,
        duration: 30,
        pipelining: 1,
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: '{ healthCheck { status } }' })
      },
      expectedMetrics: {
        maxLatencyP95: 200,
        minThroughput: 500,
        maxErrorRate: 1
      }
    },
    {
      name: 'Video Upload Endpoint',
      config: {
        url: 'http://localhost:3001/api/v1/videos/upload',
        connections: 50,
        duration: 60,
        pipelining: 1,
        method: 'POST'
      },
      expectedMetrics: {
        maxLatencyP95: 1000,
        minThroughput: 50,
        maxErrorRate: 2
      }
    },
    {
      name: 'Real-time Analysis WebSocket',
      config: {
        url: 'ws://localhost:3003/real-time-analysis',
        connections: 200,
        duration: 30,
        pipelining: 1
      },
      expectedMetrics: {
        maxLatencyP95: 100,
        minThroughput: 1000,
        maxErrorRate: 0.5
      }
    }
  ]
};
