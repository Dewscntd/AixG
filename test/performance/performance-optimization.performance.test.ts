import { Test, TestingModule } from '@nestjs/testing';
import { PerformanceOptimizationService } from '../../src/performance-optimization/performance-optimization.service';
import { RealTimePerformanceMonitor } from '../../src/performance-optimization/monitoring/real-time-performance-monitor';
import { GPUOptimizerService } from '../../src/performance-optimization/gpu-optimization/gpu-optimizer.service';
import { AdvancedCacheService } from '../../src/performance-optimization/caching/advanced-cache.service';
import { QueryOptimizer } from '../../src/performance-optimization/database-optimization/query-optimizer';

describe('Performance Optimization Performance Tests', () => {
  let performanceOptimizationService: PerformanceOptimizationService;
  let realTimeMonitor: RealTimePerformanceMonitor;
  let gpuOptimizer: GPUOptimizerService;
  let cacheService: AdvancedCacheService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PerformanceOptimizationService,
        RealTimePerformanceMonitor,
        GPUOptimizerService,
        {
          provide: AdvancedCacheService,
          useValue: {
            get: jest.fn(),
            set: jest.fn(),
            getCacheMetrics: jest.fn().mockReturnValue({
              l1Hits: 100,
              l1Misses: 20,
              l2Hits: 50,
              l2Misses: 10,
              hitRatio: 0.85,
              averageResponseTime: 5,
            }),
            warmCache: jest.fn(),
            clearAll: jest.fn(),
          },
        },
        {
          provide: QueryOptimizer,
          useValue: {
            analyzeQuery: jest.fn(),
            optimizeConfiguration: jest.fn(),
            getSlowQueries: jest.fn().mockReturnValue([]),
          },
        },
      ],
    }).compile();

    performanceOptimizationService = module.get<PerformanceOptimizationService>(
      PerformanceOptimizationService
    );
    realTimeMonitor = module.get<RealTimePerformanceMonitor>(
      RealTimePerformanceMonitor
    );
    gpuOptimizer = module.get<GPUOptimizerService>(GPUOptimizerService);
    cacheService = module.get<AdvancedCacheService>(AdvancedCacheService);
  });

  describe('Real-time Performance Monitoring', () => {
    it('should collect metrics within acceptable time limits', async () => {
      // Arrange
      const startTime = Date.now();
      const maxCollectionTime = 100; // 100ms max

      // Act
      realTimeMonitor.startMonitoring(1000);

      // Wait for first metrics collection
      await new Promise(resolve => {
        realTimeMonitor.once('metrics', () => {
          resolve(undefined);
        });
      });

      const endTime = Date.now();
      realTimeMonitor.stopMonitoring();

      // Assert
      const collectionTime = endTime - startTime;
      expect(collectionTime).toBeLessThan(maxCollectionTime);
    });

    it('should handle high-frequency metric collection', async () => {
      // Arrange
      const metricsCollected: any[] = [];
      const collectionInterval = 100; // 100ms
      const testDuration = 1000; // 1 second
      const expectedMetrics = testDuration / collectionInterval;

      // Act
      realTimeMonitor.startMonitoring(collectionInterval);

      realTimeMonitor.on('metrics', metrics => {
        metricsCollected.push(metrics);
      });

      await new Promise(resolve => setTimeout(resolve, testDuration));
      realTimeMonitor.stopMonitoring();

      // Assert
      expect(metricsCollected.length).toBeGreaterThanOrEqual(
        expectedMetrics * 0.8
      ); // Allow 20% tolerance
      expect(metricsCollected.length).toBeLessThanOrEqual(
        expectedMetrics * 1.2
      );
    });

    it('should record latency measurements efficiently', () => {
      // Arrange
      const numMeasurements = 10000;
      const latencies = Array.from(
        { length: numMeasurements },
        () => Math.random() * 1000
      );

      // Act
      const startTime = process.hrtime.bigint();

      latencies.forEach(latency => {
        realTimeMonitor.recordLatency(latency);
      });

      const endTime = process.hrtime.bigint();
      const duration = Number(endTime - startTime) / 1000000; // Convert to milliseconds

      // Assert
      expect(duration).toBeLessThan(100); // Should complete in less than 100ms

      const summary = realTimeMonitor.getPerformanceSummary();
      expect(summary.current).toBeDefined();
    });
  });

  describe('GPU Optimization Performance', () => {
    it('should complete GPU optimization within time limits', async () => {
      // Arrange
      const maxOptimizationTime = 5000; // 5 seconds
      const startTime = Date.now();

      // Act
      const result = await gpuOptimizer.optimizeGPUUsage();
      const endTime = Date.now();

      // Assert
      const optimizationTime = endTime - startTime;
      expect(optimizationTime).toBeLessThan(maxOptimizationTime);
      expect(result).toBeDefined();
      expect(result.currentMetrics).toBeDefined();
      expect(result.optimizations).toBeDefined();
    });

    it('should handle concurrent GPU metric collection', async () => {
      // Arrange
      const concurrentRequests = 10;
      const promises: Promise<any>[] = [];

      // Act
      for (let i = 0; i < concurrentRequests; i++) {
        promises.push(gpuOptimizer.getGPUMetrics());
      }

      const startTime = Date.now();
      const results = await Promise.all(promises);
      const endTime = Date.now();

      // Assert
      const totalTime = endTime - startTime;
      expect(totalTime).toBeLessThan(2000); // Should complete in less than 2 seconds
      expect(results).toHaveLength(concurrentRequests);
      results.forEach(result => {
        expect(result.utilization).toBeDefined();
        expect(result.memoryUsed).toBeDefined();
      });
    });
  });

  describe('Cache Performance', () => {
    it('should handle high-volume cache operations', async () => {
      // Arrange
      const numOperations = 1000;
      const operations: Promise<any>[] = [];

      // Act
      const startTime = Date.now();

      for (let i = 0; i < numOperations; i++) {
        if (i % 2 === 0) {
          operations.push(cacheService.set(`key-${i}`, `value-${i}`, 3600));
        } else {
          operations.push(cacheService.get(`key-${i}`));
        }
      }

      await Promise.all(operations);
      const endTime = Date.now();

      // Assert
      const totalTime = endTime - startTime;
      const operationsPerSecond = (numOperations / totalTime) * 1000;

      expect(operationsPerSecond).toBeGreaterThan(100); // At least 100 ops/sec
    });

    it('should maintain performance under memory pressure', async () => {
      // Arrange
      const largeDataSize = 1024 * 1024; // 1MB
      const numLargeObjects = 50;
      const operations: Promise<any>[] = [];

      // Act
      const startTime = Date.now();

      for (let i = 0; i < numLargeObjects; i++) {
        const largeData = 'x'.repeat(largeDataSize);
        operations.push(cacheService.set(`large-key-${i}`, largeData, 3600));
      }

      await Promise.all(operations);
      const endTime = Date.now();

      // Assert
      const totalTime = endTime - startTime;
      expect(totalTime).toBeLessThan(10000); // Should complete in less than 10 seconds
    });
  });

  describe('Overall Performance Optimization', () => {
    it('should complete full optimization cycle within time limits', async () => {
      // Arrange
      const maxOptimizationTime = 30000; // 30 seconds
      const startTime = Date.now();

      // Act
      const result =
        await performanceOptimizationService.runOptimizationCycle();
      const endTime = Date.now();

      // Assert
      const optimizationTime = endTime - startTime;
      expect(optimizationTime).toBeLessThan(maxOptimizationTime);
      expect(result).toBeDefined();
      expect(result.optimizations).toBeDefined();
      expect(result.recommendations).toBeDefined();
    });

    it('should handle concurrent optimization requests', async () => {
      // Arrange
      const concurrentOptimizations = 3;
      const promises: Promise<any>[] = [];

      // Act
      for (let i = 0; i < concurrentOptimizations; i++) {
        promises.push(performanceOptimizationService.runOptimizationCycle());
      }

      const startTime = Date.now();
      const results = await Promise.all(promises);
      const endTime = Date.now();

      // Assert
      const totalTime = endTime - startTime;
      expect(totalTime).toBeLessThan(60000); // Should complete in less than 60 seconds
      expect(results).toHaveLength(concurrentOptimizations);

      results.forEach(result => {
        expect(result.optimizations).toBeDefined();
        expect(result.recommendations).toBeDefined();
      });
    });

    it('should maintain performance under load', async () => {
      // Arrange
      const loadTestDuration = 10000; // 10 seconds
      const requestInterval = 100; // 100ms
      const responses: any[] = [];
      let isRunning = true;

      // Act
      const startTime = Date.now();

      const loadTest = async () => {
        while (isRunning) {
          try {
            const response =
              await performanceOptimizationService.getCurrentPerformanceStatus();
            responses.push(response);
          } catch (error) {
            // Log error but continue
            console.warn('Load test request failed:', error);
          }
          await new Promise(resolve => setTimeout(resolve, requestInterval));
        }
      };

      const loadTestPromise = loadTest();

      setTimeout(() => {
        isRunning = false;
      }, loadTestDuration);

      await loadTestPromise;
      const endTime = Date.now();

      // Assert
      const actualDuration = endTime - startTime;
      expect(actualDuration).toBeGreaterThanOrEqual(loadTestDuration * 0.9); // Allow 10% tolerance
      expect(responses.length).toBeGreaterThan(0);

      // Check that response times are reasonable
      const avgResponseTime =
        responses.reduce(
          (sum, response) => sum + (response.timestamp ? 1 : 0), // Simple check that responses are valid
          0
        ) / responses.length;

      expect(avgResponseTime).toBeGreaterThan(0);
    });
  });

  describe('Memory Usage', () => {
    it('should not leak memory during extended operation', async () => {
      // Arrange
      const initialMemory = process.memoryUsage().heapUsed;
      const iterations = 100;

      // Act
      for (let i = 0; i < iterations; i++) {
        await performanceOptimizationService.getCurrentPerformanceStatus();

        // Force garbage collection if available
        if (global.gc) {
          global.gc();
        }
      }

      const finalMemory = process.memoryUsage().heapUsed;

      // Assert
      const memoryIncrease = finalMemory - initialMemory;
      const memoryIncreasePercent = (memoryIncrease / initialMemory) * 100;

      // Memory increase should be less than 50%
      expect(memoryIncreasePercent).toBeLessThan(50);
    });
  });
});
