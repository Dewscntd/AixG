/**
 * End-to-End Tests for Complete Video Analysis Workflow
 * Tests the entire pipeline from video upload to analytics generation
 */

import { TestDataFactory } from '../setup/jest.setup';
import { IntegrationTestUtils } from '../setup/integration.setup';
import supertest from 'supertest';
import { createReadStream } from 'fs';
import { join } from 'path';

describe('Video Analysis Workflow - E2E Tests', () => {
  let app: any;
  let request: supertest.SuperTest<supertest.Test>;

  beforeAll(async () => {
    // Start the complete application stack
    app = await startTestApplication();
    request = supertest(app);
  });

  afterAll(async () => {
    await stopTestApplication(app);
  });

  beforeEach(async () => {
    // Clean state between tests
    await IntegrationTestUtils.query('TRUNCATE TABLE matches, videos, match_analytics CASCADE');
    await IntegrationTestUtils.getRedisClient().flushall();
  });

  describe('Complete Video Analysis Pipeline', () => {
    it('should process video from upload to final analytics', async () => {
      const matchId = TestDataFactory.createMatchId();
      const homeTeamId = TestDataFactory.createTeamId();
      const awayTeamId = TestDataFactory.createTeamId();

      // Step 1: Create match
      const matchResponse = await request
        .post('/api/matches')
        .send({
          id: matchId,
          homeTeamId,
          awayTeamId,
          startTime: new Date().toISOString(),
        })
        .expect(201);

      expect(matchResponse.body.id).toBe(matchId);

      // Step 2: Upload video
      const videoPath = join(__dirname, '../fixtures/sample-match.mp4');
      const uploadResponse = await request
        .post('/api/videos/upload')
        .attach('video', videoPath)
        .field('matchId', matchId)
        .field('metadata', JSON.stringify({
          duration: 5400, // 90 minutes
          resolution: '1920x1080',
          fps: 30,
        }))
        .expect(200);

      const videoId = uploadResponse.body.videoId;
      expect(videoId).toBeDefined();

      // Step 3: Wait for video processing to start
      await waitForVideoProcessing(videoId, 'processing');

      // Step 4: Simulate ML pipeline completion
      const mlResults = {
        videoId,
        matchId,
        shots: [
          {
            teamId: homeTeamId,
            playerId: TestDataFactory.createPlayerId(),
            position: { x: 85, y: 45 },
            targetPosition: { x: 100, y: 50 },
            distanceToGoal: 15,
            angle: 20,
            bodyPart: 'foot',
            situation: 'open_play',
            defenderCount: 1,
            gameState: {
              minute: 23,
              scoreDifference: 0,
              isHome: true,
            },
            confidence: 0.92,
          },
          {
            teamId: awayTeamId,
            playerId: TestDataFactory.createPlayerId(),
            position: { x: 20, y: 60 },
            targetPosition: { x: 0, y: 50 },
            distanceToGoal: 25,
            angle: 35,
            bodyPart: 'head',
            situation: 'corner',
            defenderCount: 3,
            gameState: {
              minute: 67,
              scoreDifference: -1,
              isHome: false,
            },
            confidence: 0.88,
          },
        ],
        possessionEvents: generatePossessionEvents(homeTeamId, awayTeamId, 100),
        players: generatePlayerData(homeTeamId, awayTeamId),
        formations: {
          homeTeam: {
            formation: '4-4-2',
            confidence: 0.89,
            players: generateFormationData(homeTeamId),
          },
          awayTeam: {
            formation: '4-3-3',
            confidence: 0.91,
            players: generateFormationData(awayTeamId),
          },
        },
        metadata: {
          processingTime: 120.5,
          modelVersions: {
            playerDetection: 'v2.1.0',
            ballTracking: 'v1.8.3',
            eventDetection: 'v3.0.1',
          },
          frameCount: 162000, // 90 minutes at 30fps
          analysisQuality: 'high',
        },
      };

      // Send ML results to analytics engine
      await request
        .post('/api/analytics/process-ml-output')
        .send({
          eventType: 'VideoAnalysisCompleted',
          matchId,
          timestamp: new Date().toISOString(),
          data: mlResults,
        })
        .expect(200);

      // Step 5: Wait for analytics processing
      await IntegrationTestUtils.waitForAsyncOperations(3000);

      // Step 6: Verify final analytics
      const analyticsResponse = await request
        .get(`/api/analytics/matches/${matchId}`)
        .expect(200);

      const analytics = analyticsResponse.body;

      // Verify xG calculations
      expect(analytics.homeTeam.xG).toBeGreaterThan(0);
      expect(analytics.awayTeam.xG).toBeGreaterThan(0);
      expect(analytics.homeTeam.xG).toBeValidXG();
      expect(analytics.awayTeam.xG).toBeValidXG();

      // Verify possession calculations
      expect(analytics.homeTeam.possession).toBeValidPossession();
      expect(analytics.awayTeam.possession).toBeValidPossession();
      expect(analytics.homeTeam.possession + analytics.awayTeam.possession).toBeCloseTo(100, 1);

      // Verify formations
      expect(analytics.formations.homeTeam.formation).toBe('4-4-2');
      expect(analytics.formations.awayTeam.formation).toBe('4-3-3');

      // Verify metadata
      expect(analytics.lastUpdated).toBeDefined();
      expect(analytics.version).toBeGreaterThan(0);

      // Step 7: Verify video status is completed
      const videoStatusResponse = await request
        .get(`/api/videos/${videoId}/status`)
        .expect(200);

      expect(videoStatusResponse.body.status).toBe('completed');
      expect(videoStatusResponse.body.analyticsGenerated).toBe(true);
    }, 60000); // 1 minute timeout for full pipeline

    it('should handle video processing failures gracefully', async () => {
      const matchId = TestDataFactory.createMatchId();
      const homeTeamId = TestDataFactory.createTeamId();
      const awayTeamId = TestDataFactory.createTeamId();

      // Create match
      await request
        .post('/api/matches')
        .send({
          id: matchId,
          homeTeamId,
          awayTeamId,
          startTime: new Date().toISOString(),
        })
        .expect(201);

      // Upload corrupted video
      const corruptedVideoPath = join(__dirname, '../fixtures/corrupted-video.mp4');
      const uploadResponse = await request
        .post('/api/videos/upload')
        .attach('video', corruptedVideoPath)
        .field('matchId', matchId)
        .expect(200);

      const videoId = uploadResponse.body.videoId;

      // Wait for processing to fail
      await waitForVideoProcessing(videoId, 'failed');

      // Verify error handling
      const videoStatusResponse = await request
        .get(`/api/videos/${videoId}/status`)
        .expect(200);

      expect(videoStatusResponse.body.status).toBe('failed');
      expect(videoStatusResponse.body.error).toBeDefined();

      // Verify no analytics were created
      const analyticsResponse = await request
        .get(`/api/analytics/matches/${matchId}`)
        .expect(404);
    });

    it('should support real-time analysis updates', async () => {
      const streamId = TestDataFactory.createStreamId();
      const matchId = TestDataFactory.createMatchId();

      // Start live stream
      const streamResponse = await request
        .post('/api/streams/start')
        .send({
          streamId,
          matchId,
          source: 'rtmp://test-stream',
        })
        .expect(200);

      // Send real-time frame updates
      const frameUpdates = Array.from({ length: 10 }, (_, i) => ({
        eventType: 'FrameAnalyzed',
        streamId,
        frameNumber: i + 1,
        timestamp: i * 1000,
        data: {
          players: generatePlayerData('team-a', 'team-b').slice(0, 5),
          ball: {
            position: { x: 50 + i, y: 50 },
            velocity: { x: 2, y: 0 },
            confidence: 0.95,
          },
          events: i % 3 === 0 ? [{
            type: 'pass',
            confidence: 0.85,
            playerId: TestDataFactory.createPlayerId(),
          }] : [],
        },
      }));

      // Send updates sequentially
      for (const update of frameUpdates) {
        await request
          .post('/api/analytics/real-time-update')
          .send(update)
          .expect(200);
      }

      // Verify real-time analytics
      const liveAnalyticsResponse = await request
        .get(`/api/analytics/live/${streamId}`)
        .expect(200);

      const liveAnalytics = liveAnalyticsResponse.body;
      expect(liveAnalytics.frameCount).toBe(10);
      expect(liveAnalytics.lastUpdate).toBeDefined();

      // Stop stream
      await request
        .post('/api/streams/stop')
        .send({ streamId })
        .expect(200);
    });
  });

  describe('Performance and Scalability', () => {
    it('should handle multiple concurrent video uploads', async () => {
      const uploadPromises = Array.from({ length: 5 }, async (_, i) => {
        const matchId = TestDataFactory.createMatchId();
        const homeTeamId = TestDataFactory.createTeamId();
        const awayTeamId = TestDataFactory.createTeamId();

        // Create match
        await request
          .post('/api/matches')
          .send({
            id: matchId,
            homeTeamId,
            awayTeamId,
            startTime: new Date().toISOString(),
          });

        // Upload video
        const videoPath = join(__dirname, '../fixtures/sample-match.mp4');
        return request
          .post('/api/videos/upload')
          .attach('video', videoPath)
          .field('matchId', matchId)
          .expect(200);
      });

      const startTime = Date.now();
      const responses = await Promise.all(uploadPromises);
      const endTime = Date.now();

      // All uploads should succeed
      responses.forEach(response => {
        expect(response.body.videoId).toBeDefined();
      });

      // Should handle concurrent uploads efficiently
      expect(endTime - startTime).toBeLessThan(30000); // Under 30 seconds
    });

    it('should maintain performance with large analytics datasets', async () => {
      const matchId = TestDataFactory.createMatchId();
      const homeTeamId = TestDataFactory.createTeamId();
      const awayTeamId = TestDataFactory.createTeamId();

      // Create match with large dataset
      await request
        .post('/api/matches')
        .send({
          id: matchId,
          homeTeamId,
          awayTeamId,
          startTime: new Date().toISOString(),
        })
        .expect(201);

      // Generate large ML results
      const largeMlResults = {
        matchId,
        shots: Array.from({ length: 500 }, () => ({
          teamId: Math.random() > 0.5 ? homeTeamId : awayTeamId,
          ...TestDataFactory.createShotData(),
        })),
        possessionEvents: generatePossessionEvents(homeTeamId, awayTeamId, 5000),
        players: generatePlayerData(homeTeamId, awayTeamId),
        metadata: {
          processingTime: 300.0,
          frameCount: 162000,
          analysisQuality: 'high',
        },
      };

      const startTime = Date.now();

      await request
        .post('/api/analytics/process-ml-output')
        .send({
          eventType: 'VideoAnalysisCompleted',
          matchId,
          timestamp: new Date().toISOString(),
          data: largeMlResults,
        })
        .expect(200);

      const endTime = Date.now();

      // Should process large datasets efficiently
      expect(endTime - startTime).toBeLessThan(10000); // Under 10 seconds

      // Verify analytics were generated correctly
      const analyticsResponse = await request
        .get(`/api/analytics/matches/${matchId}`)
        .expect(200);

      expect(analyticsResponse.body.homeTeam.xG).toBeValidXG();
      expect(analyticsResponse.body.awayTeam.xG).toBeValidXG();
    });
  });
});

// Helper functions
async function startTestApplication() {
  // Mock implementation - would start the actual application
  return {
    listen: jest.fn(),
    close: jest.fn(),
  };
}

async function stopTestApplication(app: any) {
  // Mock implementation - would stop the application
  return Promise.resolve();
}

async function waitForVideoProcessing(videoId: string, expectedStatus: string, timeout = 30000) {
  const startTime = Date.now();
  
  while (Date.now() - startTime < timeout) {
    // Mock implementation - would check actual video processing status
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Simulate status progression
    if (expectedStatus === 'processing') {
      return;
    } else if (expectedStatus === 'failed') {
      return;
    }
  }
  
  throw new Error(`Video processing did not reach ${expectedStatus} within timeout`);
}

function generatePossessionEvents(homeTeamId: string, awayTeamId: string, count: number) {
  return Array.from({ length: count }, (_, i) => ({
    timestamp: i * 1000,
    teamId: i % 3 === 0 ? homeTeamId : awayTeamId,
    playerId: TestDataFactory.createPlayerId(),
    eventType: 'pass' as const,
    position: TestDataFactory.createPosition(),
    successful: Math.random() > 0.2,
    duration: Math.random() * 10,
  }));
}

function generatePlayerData(homeTeamId: string, awayTeamId: string) {
  return Array.from({ length: 22 }, (_, i) => ({
    id: TestDataFactory.createPlayerId(),
    teamId: i < 11 ? homeTeamId : awayTeamId,
    position: TestDataFactory.createPosition(),
    velocity: {
      x: (Math.random() - 0.5) * 20,
      y: (Math.random() - 0.5) * 20,
    },
    confidence: 0.8 + Math.random() * 0.2,
  }));
}

function generateFormationData(teamId: string) {
  return Array.from({ length: 11 }, (_, i) => ({
    playerId: TestDataFactory.createPlayerId(),
    position: ['goalkeeper', 'defender', 'midfielder', 'forward'][Math.floor(i / 3)],
    coordinates: TestDataFactory.createPosition(),
  }));
}
