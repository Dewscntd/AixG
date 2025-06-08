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
      logLevel: 'INFO',
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

      const expectedAnalysisResult = {
        eventType: 'VideoAnalysisCompleted',
        matchId: like(matchId),
        timestamp: like('2024-01-01T00:00:00.000Z'),
        data: {
          shots: eachLike({
            teamId: like(homeTeamId),
            playerId: like('player-123'),
            position: {
              x: like(85.5),
              y: like(45.2),
            },
            targetPosition: {
              x: like(100),
              y: like(50),
            },
            distanceToGoal: like(15.3),
            angle: like(25.7),
            bodyPart: term({
              matcher: 'foot|head|other',
              generate: 'foot',
            }),
            situation: term({
              matcher: 'open_play|corner|free_kick|penalty',
              generate: 'open_play',
            }),
            defenderCount: like(2),
            gameState: {
              minute: like(45),
              scoreDifference: like(0),
              isHome: like(true),
            },
            confidence: like(0.95),
          }),
          possessionEvents: eachLike({
            timestamp: like(1234567890),
            teamId: like(homeTeamId),
            playerId: like('player-456'),
            eventType: term({
              matcher: 'pass|dribble|shot|tackle|interception|clearance',
              generate: 'pass',
            }),
            position: {
              x: like(50.0),
              y: like(30.5),
            },
            successful: like(true),
            duration: like(5),
          }),
          players: eachLike({
            id: like('player-789'),
            teamId: like(homeTeamId),
            position: {
              x: like(45.0),
              y: like(55.0),
            },
            velocity: {
              x: like(2.5),
              y: like(-1.2),
            },
            confidence: like(0.92),
          }),
          formations: {
            homeTeam: {
              formation: term({
                matcher: '4-4-2|4-3-3|3-5-2|5-4-1',
                generate: '4-4-2',
              }),
              confidence: like(0.88),
              players: eachLike({
                playerId: like('player-001'),
                position: like('defender'),
                coordinates: {
                  x: like(25.0),
                  y: like(50.0),
                },
              }),
            },
            awayTeam: {
              teamId: like(awayTeamId),
              formation: like('4-3-3'),
              confidence: like(0.91),
              players: eachLike({
                playerId: like('player-002'),
                position: like('midfielder'),
                coordinates: {
                  x: like(75.0),
                  y: like(50.0),
                },
              }),
            },
          },
          ballTracking: eachLike({
            timestamp: like(1234567890),
            position: {
              x: like(50.0),
              y: like(50.0),
            },
            velocity: {
              x: like(10.5),
              y: like(-5.2),
            },
            confidence: like(0.97),
          }),
          metadata: {
            processingTime: like(45.2),
            modelVersions: {
              playerDetection: like('v2.1.0'),
              ballTracking: like('v1.8.3'),
              eventDetection: like('v3.0.1'),
            },
            frameCount: like(2700),
            analysisQuality: like('high'),
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
              'Authorization': like('Bearer token123'),
            },
            body: expectedAnalysisResult,
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
        body: JSON.stringify(expectedAnalysisResult),
      });

      expect(response.status).toBe(200);
      const responseBody = await response.json();
      expect(responseBody.success).toBe(true);
      expect(responseBody.analyticsId).toBeDefined();
    });

    it('should handle partial analysis results', async () => {
      const partialAnalysisResult = {
        eventType: 'PartialAnalysisCompleted',
        matchId: like('match-456'),
        timestamp: like('2024-01-01T00:00:00.000Z'),
        data: {
          shots: [], // No shots detected
          possessionEvents: eachLike({
            timestamp: like(1234567890),
            teamId: like('team-a'),
            playerId: like('player-123'),
            eventType: like('pass'),
            position: {
              x: like(50.0),
              y: like(30.5),
            },
            successful: like(true),
          }),
          metadata: {
            processingTime: like(30.1),
            analysisQuality: like('medium'),
            warnings: eachLike('Low confidence in player detection'),
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
        streamId: like('stream-123'),
        frameNumber: like(1500),
        timestamp: like(60000), // 1 minute into the match
        data: {
          players: eachLike({
            id: like('player-123'),
            teamId: like('team-a'),
            position: {
              x: like(45.0),
              y: like(55.0),
            },
            velocity: {
              x: like(2.5),
              y: like(-1.2),
            },
          }),
          ball: {
            position: {
              x: like(50.0),
              y: like(50.0),
            },
            velocity: {
              x: like(10.5),
              y: like(-5.2),
            },
            confidence: like(0.97),
          },
          events: eachLike({
            type: like('pass'),
            confidence: like(0.85),
            playerId: like('player-123'),
          }),
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
