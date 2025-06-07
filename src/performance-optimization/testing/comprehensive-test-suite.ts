import { PerformanceTestSuite } from './performance-test-suite';
import { PerformanceBenchmarker, BenchmarkConfig } from '../benchmarking/performance-benchmarker';

/**
 * Comprehensive Performance Test Suite for FootAnalytics
 * Includes all critical performance tests with enhanced configurations
 */

export const FootAnalyticsComprehensiveTestSuite: PerformanceTestSuite = {
  name: 'FootAnalytics Comprehensive Performance Test Suite',
  tests: [
    {
      name: 'API Gateway GraphQL Performance',
      config: {
        url: 'http://localhost:4000/graphql',
        connections: 200,
        duration: 60,
        pipelining: 2,
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': 'Bearer test-token'
        },
        body: JSON.stringify({ 
          query: `
            query GetMatchAnalytics($matchId: ID!) {
              match(id: $matchId) {
                id
                homeTeam { name players { name position } }
                awayTeam { name players { name position } }
                events { type timestamp player }
                analytics {
                  possession
                  shots
                  passAccuracy
                  xG
                }
              }
            }
          `,
          variables: { matchId: "test-match-123" }
        })
      },
      expectedMetrics: {
        maxLatencyP95: 200,
        minThroughput: 800,
        maxErrorRate: 0.5
      }
    },
    {
      name: 'Video Upload Endpoint Performance',
      config: {
        url: 'http://localhost:3001/api/v1/videos/upload',
        connections: 50,
        duration: 120,
        pipelining: 1,
        method: 'POST',
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      },
      expectedMetrics: {
        maxLatencyP95: 2000,
        minThroughput: 25,
        maxErrorRate: 1
      }
    },
    {
      name: 'Real-time Analysis WebSocket',
      config: {
        url: 'ws://localhost:3003/real-time-analysis',
        connections: 500,
        duration: 60,
        pipelining: 1
      },
      expectedMetrics: {
        maxLatencyP95: 100,
        minThroughput: 2000,
        maxErrorRate: 0.2
      }
    },
    {
      name: 'ML Pipeline Processing',
      config: {
        url: 'http://localhost:3002/api/v1/ml/process',
        connections: 20,
        duration: 180,
        pipelining: 1,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          videoId: 'test-video-123',
          analysisType: 'full',
          priority: 'high'
        })
      },
      expectedMetrics: {
        maxLatencyP95: 5000,
        minThroughput: 10,
        maxErrorRate: 2
      }
    },
    {
      name: 'Database Query Performance',
      config: {
        url: 'http://localhost:3001/api/v1/analytics/query',
        connections: 100,
        duration: 90,
        pipelining: 2,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          query: 'complex-analytics-query',
          filters: {
            dateRange: '2024-01-01:2024-12-31',
            teams: ['team1', 'team2'],
            metrics: ['xG', 'possession', 'passAccuracy']
          }
        })
      },
      expectedMetrics: {
        maxLatencyP95: 150,
        minThroughput: 500,
        maxErrorRate: 0.5
      }
    },
    {
      name: 'Cache Performance Test',
      config: {
        url: 'http://localhost:3001/api/v1/cache/test',
        connections: 300,
        duration: 45,
        pipelining: 3,
        method: 'GET'
      },
      expectedMetrics: {
        maxLatencyP95: 50,
        minThroughput: 1500,
        maxErrorRate: 0.1
      }
    },
    {
      name: 'CDN Asset Delivery',
      config: {
        url: 'http://localhost:3001/api/v1/assets/video-thumbnail',
        connections: 200,
        duration: 30,
        pipelining: 4,
        method: 'GET'
      },
      expectedMetrics: {
        maxLatencyP95: 100,
        minThroughput: 1000,
        maxErrorRate: 0.2
      }
    }
  ]
};

/**
 * Benchmark configurations for different system components
 */
export const BenchmarkConfigurations: Record<string, BenchmarkConfig> = {
  'api-response-time': {
    name: 'API Response Time Benchmark',
    description: 'Measures API endpoint response times under load',
    iterations: 1000,
    warmupIterations: 100,
    timeout: 30000,
    parallel: true,
    maxConcurrency: 50
  },
  
  'database-query-performance': {
    name: 'Database Query Performance',
    description: 'Benchmarks database query execution times',
    iterations: 500,
    warmupIterations: 50,
    timeout: 10000,
    parallel: false
  },
  
  'ml-inference-speed': {
    name: 'ML Inference Speed',
    description: 'Measures ML model inference performance',
    iterations: 200,
    warmupIterations: 20,
    timeout: 60000,
    parallel: true,
    maxConcurrency: 10
  },
  
  'cache-operations': {
    name: 'Cache Operations Performance',
    description: 'Benchmarks cache read/write operations',
    iterations: 2000,
    warmupIterations: 200,
    timeout: 5000,
    parallel: true,
    maxConcurrency: 100
  },
  
  'video-processing': {
    name: 'Video Processing Pipeline',
    description: 'Measures video processing and transcoding performance',
    iterations: 50,
    warmupIterations: 5,
    timeout: 300000,
    parallel: true,
    maxConcurrency: 5
  },
  
  'memory-allocation': {
    name: 'Memory Allocation Performance',
    description: 'Benchmarks memory allocation and garbage collection',
    iterations: 1000,
    warmupIterations: 100,
    timeout: 10000,
    parallel: false
  },
  
  'gpu-utilization': {
    name: 'GPU Utilization Benchmark',
    description: 'Measures GPU compute and memory utilization',
    iterations: 100,
    warmupIterations: 10,
    timeout: 120000,
    parallel: true,
    maxConcurrency: 4
  }
};

/**
 * Stress test configurations for finding system limits
 */
export const StressTestConfigurations = {
  'connection-limit': {
    name: 'Connection Limit Stress Test',
    baseConfig: {
      url: 'http://localhost:4000/graphql',
      connections: 100,
      duration: 60,
      pipelining: 1,
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: '{ healthCheck { status } }' })
    },
    maxConnections: 10000,
    incrementStep: 100
  },
  
  'memory-pressure': {
    name: 'Memory Pressure Test',
    baseConfig: {
      url: 'http://localhost:3001/api/v1/memory-intensive',
      connections: 50,
      duration: 300,
      pipelining: 1,
      method: 'POST'
    },
    maxConnections: 1000,
    incrementStep: 25
  },
  
  'cpu-intensive': {
    name: 'CPU Intensive Operations',
    baseConfig: {
      url: 'http://localhost:3002/api/v1/cpu-intensive',
      connections: 20,
      duration: 180,
      pipelining: 1,
      method: 'POST'
    },
    maxConnections: 200,
    incrementStep: 10
  }
};

/**
 * Endurance test configurations for stability testing
 */
export const EnduranceTestConfigurations = {
  'long-running-stability': {
    name: '24-Hour Stability Test',
    config: {
      url: 'http://localhost:4000/graphql',
      connections: 100,
      duration: 60,
      pipelining: 1,
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: '{ healthCheck { status } }' })
    },
    durationMinutes: 1440 // 24 hours
  },
  
  'memory-leak-detection': {
    name: 'Memory Leak Detection Test',
    config: {
      url: 'http://localhost:3001/api/v1/memory-test',
      connections: 50,
      duration: 60,
      pipelining: 1,
      method: 'GET'
    },
    durationMinutes: 480 // 8 hours
  },
  
  'performance-degradation': {
    name: 'Performance Degradation Test',
    config: {
      url: 'http://localhost:4000/graphql',
      connections: 200,
      duration: 60,
      pipelining: 2,
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        query: '{ matches { id analytics { xG possession } } }' 
      })
    },
    durationMinutes: 720 // 12 hours
  }
};

/**
 * Performance thresholds for different environments
 */
export const PerformanceThresholds = {
  development: {
    maxLatencyP95: 500,
    minThroughput: 100,
    maxErrorRate: 5,
    maxMemoryUsage: 90,
    maxCpuUsage: 90
  },
  
  staging: {
    maxLatencyP95: 300,
    minThroughput: 300,
    maxErrorRate: 2,
    maxMemoryUsage: 80,
    maxCpuUsage: 80
  },
  
  production: {
    maxLatencyP95: 200,
    minThroughput: 500,
    maxErrorRate: 1,
    maxMemoryUsage: 70,
    maxCpuUsage: 70
  }
};
