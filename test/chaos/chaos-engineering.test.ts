/**
 * Chaos Engineering Tests for FootAnalytics Platform
 * Tests system resilience under various failure conditions
 */

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import supertest from 'supertest';
import { GenericContainer, StartedTestContainer } from 'testcontainers';
import { TestDataFactory } from '@test-utils/test-data-factory';

describe('Chaos Engineering Tests', () => {
  let app: INestApplication;
  let request: supertest.SuperTest<supertest.Test>;
  let postgresContainer: StartedTestContainer;
  let redisContainer: StartedTestContainer;

  beforeAll(async () => {
    // Start infrastructure containers
    postgresContainer = await new GenericContainer('postgres:15')
      .withEnvironment({
        POSTGRES_DB: 'footanalytics_chaos',
        POSTGRES_USER: 'test',
        POSTGRES_PASSWORD: 'test'
      })
      .withExposedPorts(5432)
      .start();

    redisContainer = await new GenericContainer('redis:7')
      .withExposedPorts(6379)
      .start();

    // Setup application with chaos testing configuration
    const moduleFixture: TestingModule = await Test.createTestingModule({
      // Module configuration for chaos testing
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
    request = supertest(app.getHttpServer());
  });

  afterAll(async () => {
    await app.close();
    await postgresContainer.stop();
    await redisContainer.stop();
  });

  describe('Database Failure Scenarios', () => {
    it('should handle database connection loss gracefully', async () => {
      // Stop database container to simulate connection loss
      await postgresContainer.stop();

      // Attempt to create a match (should fail gracefully)
      const response = await request
        .post('/api/matches')
        .send({
          id: TestDataFactory.createMatchId(),
          homeTeamId: TestDataFactory.createTeamId(),
          awayTeamId: TestDataFactory.createTeamId(),
          startTime: new Date().toISOString()
        })
        .expect(503); // Service Unavailable

      expect(response.body.error).toContain('Database unavailable');
      expect(response.body.retryAfter).toBeDefined();

      // Restart database
      postgresContainer = await new GenericContainer('postgres:15')
        .withEnvironment({
          POSTGRES_DB: 'footanalytics_chaos',
          POSTGRES_USER: 'test',
          POSTGRES_PASSWORD: 'test'
        })
        .withExposedPorts(5432)
        .start();

      // Wait for connection recovery
      await new Promise(resolve => setTimeout(resolve, 5000));

      // Verify service recovery
      const recoveryResponse = await request
        .get('/health')
        .expect(200);

      expect(recoveryResponse.body.database).toBe('healthy');
    });

    it('should handle database slow queries with timeout', async () => {
      // Simulate slow database by introducing artificial delay
      await simulateSlowDatabase(10000); // 10 second delay

      const startTime = Date.now();
      const response = await request
        .get('/api/analytics/match/test-match-id')
        .expect(408); // Request Timeout

      const duration = Date.now() - startTime;
      expect(duration).toBeLessThan(6000); // Should timeout before 6 seconds
      expect(response.body.error).toContain('Request timeout');
    });

    it('should handle database connection pool exhaustion', async () => {
      // Create multiple concurrent requests to exhaust connection pool
      const concurrentRequests = Array.from({ length: 50 }, () =>
        request
          .post('/api/matches')
          .send({
            id: TestDataFactory.createMatchId(),
            homeTeamId: TestDataFactory.createTeamId(),
            awayTeamId: TestDataFactory.createTeamId(),
            startTime: new Date().toISOString()
          })
      );

      const responses = await Promise.allSettled(concurrentRequests);
      
      // Some requests should succeed, others should be rate limited
      const successful = responses.filter(r => r.status === 'fulfilled').length;
      const failed = responses.filter(r => r.status === 'rejected').length;

      expect(successful).toBeGreaterThan(0);
      expect(failed).toBeGreaterThan(0);
    });
  });

  describe('Redis Cache Failure Scenarios', () => {
    it('should continue operating when Redis is unavailable', async () => {
      // Stop Redis container
      await redisContainer.stop();

      // Analytics queries should still work (slower, but functional)
      const response = await request
        .get('/api/analytics/match/test-match-id')
        .expect(200);

      expect(response.body).toBeDefined();
      expect(response.headers['x-cache-status']).toBe('miss');

      // Restart Redis
      redisContainer = await new GenericContainer('redis:7')
        .withExposedPorts(6379)
        .start();
    });

    it('should handle Redis memory pressure', async () => {
      // Fill Redis with data to simulate memory pressure
      await fillRedisMemory();

      // New cache operations should handle memory pressure gracefully
      const response = await request
        .get('/api/analytics/match/new-match-id')
        .expect(200);

      expect(response.body).toBeDefined();
      // Should either use LRU eviction or fallback to database
    });
  });

  describe('Network Partition Scenarios', () => {
    it('should handle service-to-service communication failures', async () => {
      // Simulate network partition between services
      await simulateNetworkPartition('analytics-service', 'video-service');

      // Video upload should still work
      const uploadResponse = await request
        .post('/api/videos/upload')
        .field('filename', 'test-video.mp4')
        .field('matchId', TestDataFactory.createMatchId())
        .expect(201);

      expect(uploadResponse.body.videoId).toBeDefined();

      // Analytics generation should be queued for retry
      const statusResponse = await request
        .get(`/api/videos/${uploadResponse.body.videoId}/status`)
        .expect(200);

      expect(statusResponse.body.analyticsStatus).toBe('pending');
    });

    it('should implement circuit breaker for external services', async () => {
      // Simulate external service failures
      await simulateExternalServiceFailure('ml-pipeline-service');

      // First few requests should fail normally
      for (let i = 0; i < 5; i++) {
        await request
          .post('/api/analytics/process-ml-output')
          .send({ data: 'test' })
          .expect(503);
      }

      // Circuit breaker should open after threshold
      const circuitOpenResponse = await request
        .post('/api/analytics/process-ml-output')
        .send({ data: 'test' })
        .expect(503);

      expect(circuitOpenResponse.body.error).toContain('Circuit breaker open');
      expect(circuitOpenResponse.headers['retry-after']).toBeDefined();
    });
  });

  describe('High Load Scenarios', () => {
    it('should handle sudden traffic spikes', async () => {
      // Generate sudden spike in traffic
      const spikeRequests = Array.from({ length: 100 }, () =>
        request
          .get('/api/analytics/match/popular-match-id')
      );

      const startTime = Date.now();
      const responses = await Promise.allSettled(spikeRequests);
      const endTime = Date.now();

      // Most requests should complete within reasonable time
      const successful = responses.filter(r => r.status === 'fulfilled').length;
      expect(successful).toBeGreaterThan(80); // At least 80% success rate

      // Response time should be reasonable even under load
      expect(endTime - startTime).toBeLessThan(30000); // Under 30 seconds
    });

    it('should implement rate limiting under extreme load', async () => {
      // Generate extreme load from single client
      const extremeRequests = Array.from({ length: 200 }, () =>
        request
          .post('/api/videos/upload')
          .field('filename', 'spam-video.mp4')
          .field('matchId', TestDataFactory.createMatchId())
      );

      const responses = await Promise.allSettled(extremeRequests);
      
      // Should have rate limiting responses
      const rateLimited = responses.filter(r => 
        r.status === 'fulfilled' && r.value.status === 429
      ).length;

      expect(rateLimited).toBeGreaterThan(0);
    });
  });

  describe('Data Corruption Scenarios', () => {
    it('should handle corrupted video files gracefully', async () => {
      const corruptedVideoData = Buffer.from('corrupted video data');
      
      const response = await request
        .post('/api/videos/upload')
        .attach('video', corruptedVideoData, 'corrupted.mp4')
        .field('matchId', TestDataFactory.createMatchId())
        .expect(400);

      expect(response.body.error).toContain('Invalid video format');
      expect(response.body.details).toBeDefined();
    });

    it('should validate and sanitize analytics data', async () => {
      const maliciousData = {
        eventType: 'VideoAnalysisCompleted',
        matchId: TestDataFactory.createMatchId(),
        data: {
          shots: [
            {
              // Malicious data injection attempt
              teamId: "'; DROP TABLE matches; --",
              xG: 'NaN',
              position: { x: 'invalid', y: null }
            }
          ]
        }
      };

      const response = await request
        .post('/api/analytics/process-ml-output')
        .send(maliciousData)
        .expect(400);

      expect(response.body.error).toContain('Invalid data format');
    });
  });

  describe('Resource Exhaustion Scenarios', () => {
    it('should handle memory pressure gracefully', async () => {
      // Simulate memory pressure by processing large datasets
      const largeDataset = {
        eventType: 'VideoAnalysisCompleted',
        matchId: TestDataFactory.createMatchId(),
        data: {
          shots: Array.from({ length: 10000 }, () => ({
            teamId: TestDataFactory.createTeamId(),
            playerId: TestDataFactory.createPlayerId(),
            position: { x: Math.random() * 100, y: Math.random() * 100 },
            xG: Math.random()
          })),
          possessionEvents: Array.from({ length: 50000 }, () => ({
            timestamp: Date.now(),
            teamId: TestDataFactory.createTeamId(),
            eventType: 'pass'
          }))
        }
      };

      const response = await request
        .post('/api/analytics/process-ml-output')
        .send(largeDataset);

      // Should either process successfully or reject gracefully
      expect([200, 202, 413]).toContain(response.status);
      
      if (response.status === 413) {
        expect(response.body.error).toContain('Payload too large');
      }
    });

    it('should handle CPU intensive operations', async () => {
      // Trigger CPU intensive analytics calculations
      const cpuIntensiveRequest = {
        matchId: TestDataFactory.createMatchId(),
        recalculateAll: true,
        includeAdvancedMetrics: true,
        includePlayerHeatmaps: true,
        includeFormationAnalysis: true
      };

      const startTime = Date.now();
      const response = await request
        .post('/api/analytics/calculate')
        .send(cpuIntensiveRequest);

      const duration = Date.now() - startTime;

      // Should complete within reasonable time or be queued
      expect([200, 202]).toContain(response.status);
      
      if (response.status === 202) {
        expect(response.body.estimatedCompletion).toBeDefined();
      } else {
        expect(duration).toBeLessThan(10000); // Under 10 seconds
      }
    });
  });

  describe('Security Attack Scenarios', () => {
    it('should handle DDoS attacks', async () => {
      // Simulate DDoS attack with rapid requests
      const ddosRequests = Array.from({ length: 500 }, () =>
        request
          .get('/api/health')
          .set('User-Agent', 'AttackBot/1.0')
      );

      const responses = await Promise.allSettled(ddosRequests);
      
      // Should implement DDoS protection
      const blocked = responses.filter(r => 
        r.status === 'fulfilled' && r.value.status === 429
      ).length;

      expect(blocked).toBeGreaterThan(400); // Most should be blocked
    });

    it('should handle malformed requests', async () => {
      const malformedRequests = [
        // Invalid JSON
        request.post('/api/matches').send('invalid json'),
        
        // Missing required fields
        request.post('/api/matches').send({}),
        
        // Invalid data types
        request.post('/api/matches').send({
          id: 123, // Should be string
          homeTeamId: null,
          startTime: 'invalid date'
        }),
        
        // SQL injection attempt
        request.get("/api/analytics/match/'; DROP TABLE matches; --"),
        
        // XSS attempt
        request.post('/api/matches').send({
          id: '<script>alert("xss")</script>',
          homeTeamId: 'team-1',
          awayTeamId: 'team-2'
        })
      ];

      const responses = await Promise.allSettled(malformedRequests);
      
      // All should be rejected with appropriate error codes
      responses.forEach(response => {
        if (response.status === 'fulfilled') {
          expect([400, 422]).toContain(response.value.status);
        }
      });
    });
  });
});

// Helper functions for chaos testing
async function simulateSlowDatabase(delayMs: number) {
  // Implementation would inject delay into database queries
  console.log(`Simulating slow database with ${delayMs}ms delay`);
}

async function fillRedisMemory() {
  // Implementation would fill Redis with dummy data
  console.log('Filling Redis memory to simulate pressure');
}

async function simulateNetworkPartition(service1: string, service2: string) {
  // Implementation would block network communication between services
  console.log(`Simulating network partition between ${service1} and ${service2}`);
}

async function simulateExternalServiceFailure(serviceName: string) {
  // Implementation would make external service unavailable
  console.log(`Simulating failure of ${serviceName}`);
}
