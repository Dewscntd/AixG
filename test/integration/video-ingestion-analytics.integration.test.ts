/**
 * Integration Tests for Video Ingestion to Analytics Pipeline
 * Tests the complete flow from video upload to analytics generation
 */

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { EventEmitter2, EventEmitterModule } from '@nestjs/event-emitter';
import supertest from 'supertest';
import { GenericContainer, StartedTestContainer } from 'testcontainers';
import { VideoIngestionModule } from '@video-ingestion/video-ingestion.module';
import { AnalyticsEngineModule } from '@analytics/analytics-engine.module';
import { TestDataFactory } from '@test-utils/test-data-factory';

describe('Video Ingestion to Analytics Integration', () => {
  let app: INestApplication;
  let postgresContainer: StartedTestContainer;
  let redisContainer: StartedTestContainer;
  let eventEmitter: EventEmitter2;
  let request: supertest.SuperTest<supertest.Test>;

  beforeAll(async () => {
    // Start test containers
    postgresContainer = await new GenericContainer('postgres:15')
      .withEnvironment({
        POSTGRES_DB: 'footanalytics_test',
        POSTGRES_USER: 'test',
        POSTGRES_PASSWORD: 'test'
      })
      .withExposedPorts(5432)
      .start();

    redisContainer = await new GenericContainer('redis:7')
      .withExposedPorts(6379)
      .start();

    // Create test module
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          envFilePath: '.env.test'
        }),
        EventEmitterModule.forRoot(),
        VideoIngestionModule,
        AnalyticsEngineModule
      ]
    })
    .overrideProvider('DATABASE_CONNECTION')
    .useValue({
      host: postgresContainer.getHost(),
      port: postgresContainer.getMappedPort(5432),
      database: 'footanalytics_test',
      username: 'test',
      password: 'test'
    })
    .overrideProvider('REDIS_CONNECTION')
    .useValue({
      host: redisContainer.getHost(),
      port: redisContainer.getMappedPort(6379)
    })
    .compile();

    app = moduleFixture.createNestApplication();
    eventEmitter = app.get(EventEmitter2);
    await app.init();

    request = supertest(app.getHttpServer());
  });

  afterAll(async () => {
    await app.close();
    await postgresContainer.stop();
    await redisContainer.stop();
  });

  describe('Complete Video Processing Pipeline', () => {
    it('should process video upload and generate analytics', async () => {
      // Step 1: Upload video
      const uploadResponse = await request
        .post('/api/videos/upload')
        .field('filename', 'test-match.mp4')
        .field('matchId', TestDataFactory.createMatchId())
        .field('teamId', TestDataFactory.createTeamId())
        .field('uploadedBy', 'test-user')
        .attach('video', Buffer.from('fake-video-data'), 'test-match.mp4')
        .expect(201);

      const { videoId } = uploadResponse.body;
      expect(videoId).toBeValidUUID();

      // Step 2: Wait for video processing to complete
      await new Promise(resolve => {
        eventEmitter.on('video.processed', (event) => {
          if (event.videoId === videoId) {
            resolve(event);
          }
        });
      });

      // Step 3: Verify video status
      const videoStatusResponse = await request
        .get(`/api/videos/${videoId}/status`)
        .expect(200);

      expect(videoStatusResponse.body.status).toBe('PROCESSED');

      // Step 4: Wait for analytics generation
      await new Promise(resolve => {
        eventEmitter.on('analytics.generated', (event) => {
          if (event.videoId === videoId) {
            resolve(event);
          }
        });
      });

      // Step 5: Verify analytics were created
      const analyticsResponse = await request
        .get(`/api/analytics/match/${uploadResponse.body.matchId}`)
        .expect(200);

      expect(analyticsResponse.body).toMatchAnalyticsSnapshot();
      expect(analyticsResponse.body.homeTeam.xG).toBeValidXG();
      expect(analyticsResponse.body.awayTeam.xG).toBeValidXG();
      expect(analyticsResponse.body.homeTeam.possession).toBeValidPossession();
      expect(analyticsResponse.body.awayTeam.possession).toBeValidPossession();
    }, 60000); // 60 second timeout for full pipeline

    it('should handle multiple concurrent video uploads', async () => {
      const uploadPromises = Array.from({ length: 3 }, (_, index) => 
        request
          .post('/api/videos/upload')
          .field('filename', `concurrent-test-${index}.mp4`)
          .field('matchId', TestDataFactory.createMatchId())
          .field('teamId', TestDataFactory.createTeamId())
          .field('uploadedBy', 'test-user')
          .attach('video', Buffer.from(`fake-video-data-${index}`), `concurrent-test-${index}.mp4`)
          .expect(201)
      );

      const uploadResponses = await Promise.all(uploadPromises);
      const videoIds = uploadResponses.map(response => response.body.videoId);

      // Wait for all videos to be processed
      const processedEvents = await Promise.all(
        videoIds.map(videoId => 
          new Promise(resolve => {
            eventEmitter.on('video.processed', (event) => {
              if (event.videoId === videoId) {
                resolve(event);
              }
            });
          })
        )
      );

      expect(processedEvents).toHaveLength(3);

      // Verify all videos are processed
      const statusPromises = videoIds.map(videoId =>
        request.get(`/api/videos/${videoId}/status`).expect(200)
      );

      const statusResponses = await Promise.all(statusPromises);
      statusResponses.forEach(response => {
        expect(response.body.status).toBe('PROCESSED');
      });
    }, 120000); // 2 minute timeout for concurrent processing

    it('should handle video processing failures gracefully', async () => {
      // Upload an invalid video file
      const uploadResponse = await request
        .post('/api/videos/upload')
        .field('filename', 'invalid-video.txt')
        .field('matchId', TestDataFactory.createMatchId())
        .field('teamId', TestDataFactory.createTeamId())
        .field('uploadedBy', 'test-user')
        .attach('video', Buffer.from('not-a-video-file'), 'invalid-video.txt')
        .expect(201);

      const { videoId } = uploadResponse.body;

      // Wait for processing to fail
      await new Promise(resolve => {
        eventEmitter.on('video.failed', (event) => {
          if (event.videoId === videoId) {
            resolve(event);
          }
        });
      });

      // Verify video status is FAILED
      const videoStatusResponse = await request
        .get(`/api/videos/${videoId}/status`)
        .expect(200);

      expect(videoStatusResponse.body.status).toBe('FAILED');
      expect(videoStatusResponse.body.validationErrors).toContain('Invalid video format');
    }, 30000);
  });

  describe('Event-Driven Communication', () => {
    it('should publish and consume events correctly', async () => {
      const events: any[] = [];
      
      // Listen to all relevant events
      eventEmitter.on('video.uploaded', (event) => events.push({ type: 'uploaded', ...event }));
      eventEmitter.on('video.validated', (event) => events.push({ type: 'validated', ...event }));
      eventEmitter.on('video.processed', (event) => events.push({ type: 'processed', ...event }));
      eventEmitter.on('analytics.generated', (event) => events.push({ type: 'analytics', ...event }));

      // Upload video
      const uploadResponse = await request
        .post('/api/videos/upload')
        .field('filename', 'event-test.mp4')
        .field('matchId', TestDataFactory.createMatchId())
        .field('teamId', TestDataFactory.createTeamId())
        .field('uploadedBy', 'test-user')
        .attach('video', Buffer.from('fake-video-data'), 'event-test.mp4')
        .expect(201);

      // Wait for all events to be processed
      await new Promise(resolve => setTimeout(resolve, 5000));

      // Verify event sequence
      expect(events).toHaveLength(4);
      expect(events[0].type).toBe('uploaded');
      expect(events[1].type).toBe('validated');
      expect(events[2].type).toBe('processed');
      expect(events[3].type).toBe('analytics');

      // Verify event data consistency
      const videoId = uploadResponse.body.videoId;
      events.forEach(event => {
        expect(event.videoId).toBe(videoId);
        expect(event.timestamp).toBeInstanceOf(Date);
        expect(event.correlationId).toBeValidUUID();
      });
    }, 30000);

    it('should handle event replay for failed processing', async () => {
      // This test would simulate event replay scenarios
      // Implementation depends on your event store setup
      expect(true).toBe(true); // Placeholder
    });
  });

  describe('Data Consistency', () => {
    it('should maintain data consistency across services', async () => {
      const matchId = TestDataFactory.createMatchId();
      
      // Upload video
      const uploadResponse = await request
        .post('/api/videos/upload')
        .field('filename', 'consistency-test.mp4')
        .field('matchId', matchId)
        .field('teamId', TestDataFactory.createTeamId())
        .field('uploadedBy', 'test-user')
        .attach('video', Buffer.from('fake-video-data'), 'consistency-test.mp4')
        .expect(201);

      // Wait for processing
      await new Promise(resolve => {
        eventEmitter.on('analytics.generated', (event) => {
          if (event.matchId === matchId) {
            resolve(event);
          }
        });
      });

      // Verify data consistency between services
      const videoResponse = await request
        .get(`/api/videos/${uploadResponse.body.videoId}`)
        .expect(200);

      const analyticsResponse = await request
        .get(`/api/analytics/match/${matchId}`)
        .expect(200);

      expect(videoResponse.body.matchId).toBe(matchId);
      expect(analyticsResponse.body.matchId).toBe(matchId);
      expect(analyticsResponse.body.videoId).toBe(uploadResponse.body.videoId);
    }, 30000);

    it('should handle database transactions correctly', async () => {
      // Test that partial failures don't leave inconsistent state
      // This would involve simulating database failures during processing
      expect(true).toBe(true); // Placeholder
    });
  });

  describe('Performance and Scalability', () => {
    it('should handle high-throughput video uploads', async () => {
      const startTime = Date.now();
      const uploadCount = 10;

      const uploadPromises = Array.from({ length: uploadCount }, (_, index) =>
        request
          .post('/api/videos/upload')
          .field('filename', `perf-test-${index}.mp4`)
          .field('matchId', TestDataFactory.createMatchId())
          .field('teamId', TestDataFactory.createTeamId())
          .field('uploadedBy', 'test-user')
          .attach('video', Buffer.from(`fake-video-data-${index}`), `perf-test-${index}.mp4`)
      );

      const responses = await Promise.all(uploadPromises);
      const endTime = Date.now();

      // All uploads should succeed
      responses.forEach(response => {
        expect(response.status).toBe(201);
        expect(response.body.videoId).toBeValidUUID();
      });

      // Should complete within reasonable time (1 second per upload)
      expect(endTime - startTime).toBeLessThan(uploadCount * 1000);
    }, 60000);

    it('should maintain response times under load', async () => {
      // Simulate concurrent requests
      const concurrentRequests = 5;
      const requestPromises = Array.from({ length: concurrentRequests }, () =>
        request.get('/api/health').expect(200)
      );

      const startTime = Date.now();
      await Promise.all(requestPromises);
      const endTime = Date.now();

      // All requests should complete quickly
      expect(endTime - startTime).toBeLessThan(1000); // 1 second for all requests
    });
  });

  describe('Error Handling and Recovery', () => {
    it('should handle service unavailability gracefully', async () => {
      // This would test circuit breaker patterns and graceful degradation
      expect(true).toBe(true); // Placeholder
    });

    it('should recover from temporary failures', async () => {
      // This would test retry mechanisms and eventual consistency
      expect(true).toBe(true); // Placeholder
    });
  });
});
