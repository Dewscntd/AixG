/**
 * Contract Tests between ML Pipeline Service and Analytics Engine Service
 * Ensures API compatibility and data format consistency
 */

import { Pact, Interaction, Matchers } from '@pact-foundation/pact';
import { TestDataFactory } from '../setup/jest.setup';

const { like, eachLike, term } = Matchers;

describe('ML Pipeline -> Analytics Engine Contract', () => {
  let provider: Pact;

  beforeAll(() => {
    provider = new Pact({
      consumer: 'analytics-engine-service',
      provider: 'ml-pipeline-service',
      port: 1234,
      log: './test-results/pact.log',
      dir: './test-results/pacts',
      logLevel: 'info',
    });

    return provider.setup();
  });

  afterAll(() => provider.finalize());

  afterEach(() => provider.verify());

  describe('Video Analysis Completion Event', () => {
    it('should receive valid video analysis results', async () => {
      const matchId = TestDataFactory.createMatchId();
      const homeTeamId = TestDataFactory.createTeamId();
      const awayTeamId = TestDataFactory.createTeamId();

      // Actual request data (no matchers)
      const actualAnalysisResult = {
        eventType: 'VideoAnalysisCompleted',
        matchId: matchId,
        timestamp: '2024-01-01T00:00:00.000Z',
        data: {
          shots: [{
            teamId: homeTeamId,
            playerId: 'player-123',
            position: {
              x: 85.5,
              y: 45.2,
            },
            targetPosition: {
              x: 100,
              y: 50,
            },
            distanceToGoal: 15.3,
            angle: 25.7,
            bodyPart: 'foot',
            situation: 'open_play',
            defenderCount: 2,
            gameState: {
              minute: 45,
              scoreDifference: 0,
              isHome: true,
            },
            confidence: 0.95,
          }],
          possessionEvents: [{
            timestamp: 1234567890,
            teamId: homeTeamId,
            playerId: 'player-456',
            eventType: 'pass',
            position: {
              x: 50.0,
              y: 30.5,
            },
            successful: true,
            duration: 5,
          }],
          players: [{
            id: 'player-789',
            teamId: homeTeamId,
            position: {
              x: 45.0,
              y: 55.0,
            },
            velocity: {
              x: 2.5,
              y: -1.2,
            },
            confidence: 0.92,
          }],
          formations: {
            homeTeam: {
              formation: '4-4-2',
              confidence: 0.88,
              players: [{
                playerId: 'player-001',
                position: 'defender',
                coordinates: {
                  x: 25.0,
                  y: 50.0,
                },
              }],
            },
            awayTeam: {
              teamId: awayTeamId,
              formation: '4-3-3',
              confidence: 0.91,
              players: [{
                playerId: 'player-002',
                position: 'midfielder',
                coordinates: {
                  x: 75.0,
                  y: 50.0,
                },
              }],
            },
          },
          ballTracking: [{
            timestamp: 1234567890,
            position: {
              x: 50.0,
              y: 50.0,
            },
            velocity: {
              x: 10.5,
              y: -5.2,
            },
            confidence: 0.97,
          }],
          metadata: {
            processingTime: 45.2,
            modelVersions: {
              playerDetection: 'v2.1.0',
              ballTracking: 'v1.8.3',
              eventDetection: 'v3.0.1',
            },
            frameCount: 2700,
            analysisQuality: 'high',
          },
        },
      };

      await provider.addInteraction(
        new Interaction()
          .given('a completed video analysis')
          .uponReceiving('a video analysis completion event')
          .withRequest({
            method: 'POST',
            path: '/api/analytics/process-ml-output',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': 'Bearer token123',
            },
            body: actualAnalysisResult,
          })
          .willRespondWith({
            status: 200,
            headers: {
              'Content-Type': 'application/json',
            },
            body: {
              success: true,
              analyticsId: like('analytics-123'),
              processedAt: like('2024-01-01T00:00:00.000Z'),
            },
          })
      );

      // Test the contract
      const response = await fetch('http://localhost:1234/api/analytics/process-ml-output', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer token123',
        },
        body: JSON.stringify(actualAnalysisResult),
      });

      expect(response.status).toBe(200);
      const responseBody = await response.json();
      expect(responseBody.success).toBe(true);
      expect(responseBody.analyticsId).toBeDefined();
    });

    it('should handle partial analysis results', async () => {
      const partialAnalysisResult = {
        eventType: 'PartialAnalysisCompleted',
        matchId: 'match-456',
        timestamp: '2024-01-01T00:00:00.000Z',
        data: {
          shots: [], // No shots detected
          possessionEvents: [{
            timestamp: 1234567890,
            teamId: 'team-a',
            playerId: 'player-123',
            eventType: 'pass',
            position: {
              x: 50.0,
              y: 30.5,
            },
            successful: true,
          }],
          metadata: {
            processingTime: 30.1,
            analysisQuality: 'medium',
            warnings: ['Low confidence in player detection'],
          },
        },
      };

      await provider.addInteraction(
        new Interaction()
          .given('a partial video analysis')
          .uponReceiving('a partial analysis completion event')
          .withRequest({
            method: 'POST',
            path: '/api/analytics/process-ml-output',
            headers: {
              'Content-Type': 'application/json',
            },
            body: partialAnalysisResult,
          })
          .willRespondWith({
            status: 202,
            headers: {
              'Content-Type': 'application/json',
            },
            body: {
              success: true,
              analyticsId: like('analytics-456'),
              warnings: eachLike('Partial data processed'),
            },
          })
      );

      const response = await fetch('http://localhost:1234/api/analytics/process-ml-output', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(partialAnalysisResult),
      });

      expect(response.status).toBe(202);
    });

    it('should reject invalid analysis data', async () => {
      const invalidAnalysisResult = {
        eventType: 'VideoAnalysisCompleted',
        // Missing required fields
        data: {
          invalidField: 'invalid',
        },
      };

      await provider.addInteraction(
        new Interaction()
          .given('invalid analysis data')
          .uponReceiving('an invalid analysis completion event')
          .withRequest({
            method: 'POST',
            path: '/api/analytics/process-ml-output',
            headers: {
              'Content-Type': 'application/json',
            },
            body: invalidAnalysisResult,
          })
          .willRespondWith({
            status: 400,
            headers: {
              'Content-Type': 'application/json',
            },
            body: {
              success: false,
              error: like('Invalid analysis data format'),
              details: eachLike('Missing required field: matchId'),
            },
          })
      );

      const response = await fetch('http://localhost:1234/api/analytics/process-ml-output', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(invalidAnalysisResult),
      });

      expect(response.status).toBe(400);
    });
  });

  describe('Real-time Analysis Updates', () => {
    it('should receive real-time frame analysis updates', async () => {
      const frameAnalysisUpdate = {
        eventType: 'FrameAnalyzed',
        streamId: 'stream-123',
        frameNumber: 1500,
        timestamp: 60000, // 1 minute into the match
        data: {
          players: [{
            id: 'player-123',
            teamId: 'team-a',
            position: {
              x: 45.0,
              y: 55.0,
            },
            velocity: {
              x: 2.5,
              y: -1.2,
            },
          }],
          ball: {
            position: {
              x: 50.0,
              y: 50.0,
            },
            velocity: {
              x: 10.5,
              y: -5.2,
            },
            confidence: 0.97,
          },
          events: [{
            type: 'pass',
            confidence: 0.85,
            playerId: 'player-123',
          }],
        },
      };

      await provider.addInteraction(
        new Interaction()
          .given('a real-time frame analysis')
          .uponReceiving('a frame analysis update')
          .withRequest({
            method: 'POST',
            path: '/api/analytics/real-time-update',
            headers: {
              'Content-Type': 'application/json',
            },
            body: frameAnalysisUpdate,
          })
          .willRespondWith({
            status: 200,
            headers: {
              'Content-Type': 'application/json',
            },
            body: {
              success: true,
              processed: true,
            },
          })
      );

      const response = await fetch('http://localhost:1234/api/analytics/real-time-update', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(frameAnalysisUpdate),
      });

      expect(response.status).toBe(200);
    });
  });

  describe('Error Scenarios', () => {
    it('should handle service unavailable scenarios', async () => {
      await provider.addInteraction(
        new Interaction()
          .given('analytics service is unavailable')
          .uponReceiving('any analysis request')
          .withRequest({
            method: 'POST',
            path: '/api/analytics/process-ml-output',
          })
          .willRespondWith({
            status: 503,
            headers: {
              'Content-Type': 'application/json',
            },
            body: {
              success: false,
              error: 'Service temporarily unavailable',
              retryAfter: like(30),
            },
          })
      );

      const response = await fetch('http://localhost:1234/api/analytics/process-ml-output', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({}),
      });

      expect(response.status).toBe(503);
    });
  });
});
