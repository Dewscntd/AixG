/**
 * Contract Tests for Video Ingestion to Analytics Service Communication
 * Uses Pact for consumer-driven contract testing
 */

import { Pact } from '@pact-foundation/pact';
import { InteractionObject } from '@pact-foundation/pact/src/dsl/interaction';
import path from 'path';
import { TestDataFactory } from '@test-utils/test-data-factory';

describe('Video Ingestion → Analytics Service Contract', () => {
  let provider: Pact;

  beforeAll(async () => {
    provider = new Pact({
      consumer: 'VideoIngestionService',
      provider: 'AnalyticsEngineService',
      port: 1234,
      log: path.resolve(process.cwd(), 'logs', 'pact.log'),
      dir: path.resolve(process.cwd(), 'pacts'),
      logLevel: 'INFO',
      spec: 2
    });

    await provider.setup();
  });

  afterAll(async () => {
    await provider.finalize();
  });

  afterEach(async () => {
    await provider.verify();
  });

  describe('Video Processing Events', () => {
    it('should send VideoProcessedEvent when video processing completes', async () => {
      const videoProcessedEvent = {
        eventType: 'VideoProcessed',
        videoId: TestDataFactory.createVideoId(),
        matchId: TestDataFactory.createMatchId(),
        timestamp: new Date().toISOString(),
        correlationId: TestDataFactory.createCorrelationId(),
        payload: {
          detectedEvents: [
            {
              type: 'shot',
              timestamp: 1500,
              position: { x: 85, y: 50 },
              playerId: TestDataFactory.createPlayerId(),
              teamId: TestDataFactory.createTeamId()
            }
          ],
          playerTracking: [
            {
              playerId: TestDataFactory.createPlayerId(),
              positions: [
                { timestamp: 1000, x: 50, y: 30 },
                { timestamp: 1500, x: 55, y: 35 }
              ]
            }
          ],
          ballTracking: [
            { timestamp: 1000, x: 50, y: 30 },
            { timestamp: 1500, x: 85, y: 50 }
          ]
        }
      };

      const interaction: InteractionObject = {
        state: 'video processing completed successfully',
        uponReceiving: 'a video processed event',
        withRequest: {
          method: 'POST',
          path: '/api/analytics/events/video-processed',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer valid-token'
          },
          body: videoProcessedEvent
        },
        willRespondWith: {
          status: 202,
          headers: {
            'Content-Type': 'application/json'
          },
          body: {
            eventId: TestDataFactory.createEventId(),
            status: 'accepted',
            message: 'Video processed event received successfully'
          }
        }
      };

      await provider.addInteraction(interaction);

      // Simulate sending the event
      const response = await fetch(`${provider.mockService.baseUrl}/api/analytics/events/video-processed`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer valid-token'
        },
        body: JSON.stringify(videoProcessedEvent)
      });

      expect(response.status).toBe(202);
      const responseBody = await response.json();
      expect(responseBody.status).toBe('accepted');
    });

    it('should handle video processing failure events', async () => {
      const videoFailedEvent = {
        eventType: 'VideoProcessingFailed',
        videoId: TestDataFactory.createVideoId(),
        matchId: TestDataFactory.createMatchId(),
        timestamp: new Date().toISOString(),
        correlationId: TestDataFactory.createCorrelationId(),
        payload: {
          error: 'Invalid video format',
          errorCode: 'INVALID_FORMAT',
          retryable: false
        }
      };

      const interaction: InteractionObject = {
        state: 'video processing failed',
        uponReceiving: 'a video processing failed event',
        withRequest: {
          method: 'POST',
          path: '/api/analytics/events/video-failed',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer valid-token'
          },
          body: videoFailedEvent
        },
        willRespondWith: {
          status: 202,
          headers: {
            'Content-Type': 'application/json'
          },
          body: {
            eventId: TestDataFactory.createEventId(),
            status: 'accepted',
            message: 'Video failed event received successfully'
          }
        }
      };

      await provider.addInteraction(interaction);

      const response = await fetch(`${provider.mockService.baseUrl}/api/analytics/events/video-failed`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer valid-token'
        },
        body: JSON.stringify(videoFailedEvent)
      });

      expect(response.status).toBe(202);
    });
  });

  describe('Analytics Query Contracts', () => {
    it('should provide match analytics when requested', async () => {
      const matchId = TestDataFactory.createMatchId();

      const interaction: InteractionObject = {
        state: 'match analytics exist for the given match',
        uponReceiving: 'a request for match analytics',
        withRequest: {
          method: 'GET',
          path: `/api/analytics/match/${matchId}`,
          headers: {
            'Authorization': 'Bearer valid-token'
          }
        },
        willRespondWith: {
          status: 200,
          headers: {
            'Content-Type': 'application/json'
          },
          body: {
            matchId: matchId,
            homeTeam: {
              teamId: TestDataFactory.createTeamId(),
              xG: 1.85,
              xA: 0.92,
              possession: 58.3,
              passAccuracy: 87.2,
              shotsOnTarget: 5,
              shotsOffTarget: 3,
              corners: 7,
              fouls: 12,
              yellowCards: 2,
              redCards: 0
            },
            awayTeam: {
              teamId: TestDataFactory.createTeamId(),
              xG: 1.23,
              xA: 0.67,
              possession: 41.7,
              passAccuracy: 82.1,
              shotsOnTarget: 3,
              shotsOffTarget: 4,
              corners: 4,
              fouls: 15,
              yellowCards: 3,
              redCards: 1
            },
            lastUpdated: new Date().toISOString(),
            version: 1
          }
        }
      };

      await provider.addInteraction(interaction);

      const response = await fetch(`${provider.mockService.baseUrl}/api/analytics/match/${matchId}`, {
        headers: {
          'Authorization': 'Bearer valid-token'
        }
      });

      expect(response.status).toBe(200);
      const analytics = await response.json();
      expect(analytics.matchId).toBe(matchId);
      expect(analytics.homeTeam.xG).toBeGreaterThan(0);
      expect(analytics.awayTeam.xG).toBeGreaterThan(0);
    });

    it('should return 404 when match analytics do not exist', async () => {
      const nonExistentMatchId = TestDataFactory.createMatchId();

      const interaction: InteractionObject = {
        state: 'no analytics exist for the given match',
        uponReceiving: 'a request for non-existent match analytics',
        withRequest: {
          method: 'GET',
          path: `/api/analytics/match/${nonExistentMatchId}`,
          headers: {
            'Authorization': 'Bearer valid-token'
          }
        },
        willRespondWith: {
          status: 404,
          headers: {
            'Content-Type': 'application/json'
          },
          body: {
            error: 'Match analytics not found',
            code: 'ANALYTICS_NOT_FOUND',
            matchId: nonExistentMatchId
          }
        }
      };

      await provider.addInteraction(interaction);

      const response = await fetch(`${provider.mockService.baseUrl}/api/analytics/match/${nonExistentMatchId}`, {
        headers: {
          'Authorization': 'Bearer valid-token'
        }
      });

      expect(response.status).toBe(404);
    });
  });

  describe('Real-time Analytics Subscriptions', () => {
    it('should provide real-time analytics updates via WebSocket', async () => {
      const matchId = TestDataFactory.createMatchId();

      const interaction: InteractionObject = {
        state: 'real-time analytics are available for the match',
        uponReceiving: 'a WebSocket subscription request for real-time analytics',
        withRequest: {
          method: 'GET',
          path: `/api/analytics/realtime/${matchId}`,
          headers: {
            'Upgrade': 'websocket',
            'Connection': 'Upgrade',
            'Authorization': 'Bearer valid-token'
          }
        },
        willRespondWith: {
          status: 101,
          headers: {
            'Upgrade': 'websocket',
            'Connection': 'Upgrade'
          }
        }
      };

      await provider.addInteraction(interaction);

      const response = await fetch(`${provider.mockService.baseUrl}/api/analytics/realtime/${matchId}`, {
        headers: {
          'Upgrade': 'websocket',
          'Connection': 'Upgrade',
          'Authorization': 'Bearer valid-token'
        }
      });

      expect(response.status).toBe(101);
    });
  });

  describe('Error Handling Contracts', () => {
    it('should handle authentication errors consistently', async () => {
      const matchId = TestDataFactory.createMatchId();

      const interaction: InteractionObject = {
        state: 'user is not authenticated',
        uponReceiving: 'a request without valid authentication',
        withRequest: {
          method: 'GET',
          path: `/api/analytics/match/${matchId}`,
          headers: {
            'Authorization': 'Bearer invalid-token'
          }
        },
        willRespondWith: {
          status: 401,
          headers: {
            'Content-Type': 'application/json'
          },
          body: {
            error: 'Unauthorized',
            code: 'INVALID_TOKEN',
            message: 'The provided authentication token is invalid'
          }
        }
      };

      await provider.addInteraction(interaction);

      const response = await fetch(`${provider.mockService.baseUrl}/api/analytics/match/${matchId}`, {
        headers: {
          'Authorization': 'Bearer invalid-token'
        }
      });

      expect(response.status).toBe(401);
    });

    it('should handle rate limiting consistently', async () => {
      const matchId = TestDataFactory.createMatchId();

      const interaction: InteractionObject = {
        state: 'rate limit has been exceeded',
        uponReceiving: 'too many requests in a short period',
        withRequest: {
          method: 'GET',
          path: `/api/analytics/match/${matchId}`,
          headers: {
            'Authorization': 'Bearer valid-token'
          }
        },
        willRespondWith: {
          status: 429,
          headers: {
            'Content-Type': 'application/json',
            'Retry-After': '60'
          },
          body: {
            error: 'Rate limit exceeded',
            code: 'RATE_LIMIT_EXCEEDED',
            retryAfter: 60
          }
        }
      };

      await provider.addInteraction(interaction);

      const response = await fetch(`${provider.mockService.baseUrl}/api/analytics/match/${matchId}`, {
        headers: {
          'Authorization': 'Bearer valid-token'
        }
      });

      expect(response.status).toBe(429);
      expect(response.headers.get('Retry-After')).toBe('60');
    });
  });
});
