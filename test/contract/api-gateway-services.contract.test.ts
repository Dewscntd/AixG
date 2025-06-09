/**
 * Contract Tests for API Gateway to Microservices Communication
 * Tests GraphQL Federation and REST API contracts
 */

import { Pact } from '@pact-foundation/pact';
import { InteractionObject } from '@pact-foundation/pact/src/dsl/interaction';
import path from 'path';
import { TestDataFactory } from '@test-utils/test-data-factory';

describe('API Gateway → Services Contract Tests', () => {
  let videoServiceProvider: Pact;
  let analyticsServiceProvider: Pact;

  beforeAll(async () => {
    videoServiceProvider = new Pact({
      consumer: 'APIGateway',
      provider: 'VideoIngestionService',
      port: 1235,
      log: path.resolve(process.cwd(), 'logs', 'pact-video.log'),
      dir: path.resolve(process.cwd(), 'pacts'),
      logLevel: 'info',
      spec: 2
    });

    analyticsServiceProvider = new Pact({
      consumer: 'APIGateway',
      provider: 'AnalyticsEngineService',
      port: 1236,
      log: path.resolve(process.cwd(), 'logs', 'pact-analytics.log'),
      dir: path.resolve(process.cwd(), 'pacts'),
      logLevel: 'info',
      spec: 2
    });

    await Promise.all([
      videoServiceProvider.setup(),
      analyticsServiceProvider.setup()
    ]);
  });

  afterAll(async () => {
    await Promise.all([
      videoServiceProvider.finalize(),
      analyticsServiceProvider.finalize()
    ]);
  });

  describe('Video Service Contracts', () => {
    afterEach(async () => {
      await videoServiceProvider.verify();
    });

    it('should fetch video metadata for GraphQL resolver', async () => {
      const videoId = TestDataFactory.createVideoId();
      const matchId = TestDataFactory.createMatchId();
      const teamId = TestDataFactory.createTeamId();

      const interaction: InteractionObject = {
        state: 'video exists with the given ID',
        uponReceiving: 'a request for video metadata',
        withRequest: {
          method: 'GET',
          path: `/api/videos/${videoId}`,
          headers: {
            'Accept': 'application/json',
            'Authorization': 'Bearer service-token'
          }
        },
        willRespondWith: {
          status: 200,
          headers: {
            'Content-Type': 'application/json'
          },
          body: {
            id: videoId,
            filename: 'match-video.mp4',
            status: 'PROCESSED',
            uploadProgress: 100,
            duration: 5400, // 90 minutes
            resolution: {
              width: 1920,
              height: 1080
            },
            fileSize: 2147483648, // 2GB
            uploadedAt: '2023-12-01T10:00:00Z',
            processedAt: '2023-12-01T10:15:00Z',
            matchId,
            teamId
          }
        }
      };

      await videoServiceProvider.addInteraction(interaction);

      const response = await fetch(`${videoServiceProvider.mockService.baseUrl}/api/videos/${videoId}`, {
        headers: {
          'Accept': 'application/json',
          'Authorization': 'Bearer service-token'
        }
      });

      expect(response.status).toBe(200);
      const video = await response.json();
      expect(video.id).toBe(videoId);
      expect(video.status).toBe('PROCESSED');
    });

    it('should handle video upload requests', async () => {
      const matchId = TestDataFactory.createMatchId();
      const teamId = TestDataFactory.createTeamId();
      const responseVideoId = TestDataFactory.createVideoId();

      const uploadRequest = {
        filename: 'new-match.mp4',
        fileSize: 1073741824, // 1GB
        mimeType: 'video/mp4',
        matchId,
        teamId,
        uploadedBy: 'user-123'
      };

      const interaction: InteractionObject = {
        state: 'ready to accept video uploads',
        uponReceiving: 'a video upload request',
        withRequest: {
          method: 'POST',
          path: '/api/videos/upload',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer service-token'
          },
          body: uploadRequest
        },
        willRespondWith: {
          status: 201,
          headers: {
            'Content-Type': 'application/json'
          },
          body: {
            videoId: responseVideoId,
            uploadUrl: 'https://storage.example.com/upload/signed-url',
            expiresAt: '2023-12-01T11:00:00Z'
          }
        }
      };

      await videoServiceProvider.addInteraction(interaction);

      const response = await fetch(`${videoServiceProvider.mockService.baseUrl}/api/videos/upload`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer service-token'
        },
        body: JSON.stringify(uploadRequest)
      });

      expect(response.status).toBe(201);
      const uploadResponse = await response.json();
      expect(uploadResponse.videoId).toBeDefined();
      expect(uploadResponse.uploadUrl).toContain('https://');
    });

    it('should provide video processing status', async () => {
      const videoId = TestDataFactory.createVideoId();

      const interaction: InteractionObject = {
        state: 'video is being processed',
        uponReceiving: 'a request for video processing status',
        withRequest: {
          method: 'GET',
          path: `/api/videos/${videoId}/status`,
          headers: {
            'Accept': 'application/json',
            'Authorization': 'Bearer service-token'
          }
        },
        willRespondWith: {
          status: 200,
          headers: {
            'Content-Type': 'application/json'
          },
          body: {
            videoId,
            status: 'PROCESSING',
            progress: 65,
            estimatedCompletion: '2023-12-01T10:20:00Z',
            currentStage: 'player_detection'
          }
        }
      };

      await videoServiceProvider.addInteraction(interaction);

      const response = await fetch(`${videoServiceProvider.mockService.baseUrl}/api/videos/${videoId}/status`, {
        headers: {
          'Accept': 'application/json',
          'Authorization': 'Bearer service-token'
        }
      });

      expect(response.status).toBe(200);
      const status = await response.json();
      expect(status.status).toBe('PROCESSING');
      expect(status.progress).toBe(65);
    });
  });

  describe('Analytics Service Contracts', () => {
    afterEach(async () => {
      await analyticsServiceProvider.verify();
    });

    it('should fetch match analytics for GraphQL resolver', async () => {
      const matchId = TestDataFactory.createMatchId();
      const homeTeamId = TestDataFactory.createTeamId();
      const awayTeamId = TestDataFactory.createTeamId();

      const interaction: InteractionObject = {
        state: 'analytics exist for the given match',
        uponReceiving: 'a request for match analytics',
        withRequest: {
          method: 'GET',
          path: `/api/analytics/match/${matchId}`,
          headers: {
            'Accept': 'application/json',
            'Authorization': 'Bearer service-token'
          }
        },
        willRespondWith: {
          status: 200,
          headers: {
            'Content-Type': 'application/json'
          },
          body: {
            matchId,
            homeTeam: {
              teamId: homeTeamId,
              xG: 2.15,
              xA: 1.23,
              possession: 62.4,
              passAccuracy: 89.1,
              shotsOnTarget: 6,
              shotsOffTarget: 4,
              corners: 8,
              fouls: 11,
              yellowCards: 2,
              redCards: 0,
              formation: '4-3-3'
            },
            awayTeam: {
              teamId: awayTeamId,
              xG: 1.87,
              xA: 0.94,
              possession: 37.6,
              passAccuracy: 84.7,
              shotsOnTarget: 4,
              shotsOffTarget: 6,
              corners: 5,
              fouls: 14,
              yellowCards: 3,
              redCards: 1,
              formation: '4-4-2'
            },
            timeline: [
              {
                minute: 15,
                event: 'goal',
                team: 'home',
                xG: 0.85
              },
              {
                minute: 67,
                event: 'goal',
                team: 'away',
                xG: 0.23
              }
            ],
            lastUpdated: '2023-12-01T10:30:00Z',
            version: 3
          }
        }
      };

      await analyticsServiceProvider.addInteraction(interaction);

      const response = await fetch(`${analyticsServiceProvider.mockService.baseUrl}/api/analytics/match/${matchId}`, {
        headers: {
          'Accept': 'application/json',
          'Authorization': 'Bearer service-token'
        }
      });

      expect(response.status).toBe(200);
      const analytics = await response.json();
      expect(analytics.matchId).toBe(matchId);
      expect(analytics.homeTeam.xG).toBeGreaterThan(0);
      expect(analytics.awayTeam.xG).toBeGreaterThan(0);
    });

    it('should fetch player analytics for GraphQL resolver', async () => {
      const playerId = TestDataFactory.createPlayerId();
      const matchId = TestDataFactory.createMatchId();

      const interaction: InteractionObject = {
        state: 'player analytics exist for the given player and match',
        uponReceiving: 'a request for player analytics',
        withRequest: {
          method: 'GET',
          path: `/api/analytics/player/${playerId}/match/${matchId}`,
          headers: {
            'Accept': 'application/json',
            'Authorization': 'Bearer service-token'
          }
        },
        willRespondWith: {
          status: 200,
          headers: {
            'Content-Type': 'application/json'
          },
          body: {
            playerId,
            matchId,
            position: 'Forward',
            minutesPlayed: 87,
            xG: 0.92,
            xA: 0.34,
            shots: 4,
            shotsOnTarget: 2,
            passes: 23,
            passAccuracy: 91.3,
            touches: 45,
            dribbles: 6,
            dribblesSuccessful: 4,
            tackles: 1,
            interceptions: 0,
            distanceCovered: 10.2, // km
            sprintDistance: 1.8, // km
            maxSpeed: 32.1, // km/h
            heatmap: [
              { x: 85, y: 50, intensity: 0.8 },
              { x: 90, y: 45, intensity: 0.6 }
            ]
          }
        }
      };

      await analyticsServiceProvider.addInteraction(interaction);

      const response = await fetch(`${analyticsServiceProvider.mockService.baseUrl}/api/analytics/player/${playerId}/match/${matchId}`, {
        headers: {
          'Accept': 'application/json',
          'Authorization': 'Bearer service-token'
        }
      });

      expect(response.status).toBe(200);
      const playerAnalytics = await response.json();
      expect(playerAnalytics.playerId).toBe(playerId);
      expect(playerAnalytics.xG).toBeGreaterThanOrEqual(0);
    });

    it('should handle analytics calculation requests', async () => {
      const matchId = TestDataFactory.createMatchId();
      const calculationId = TestDataFactory.createCalculationId();

      const calculationRequest = {
        matchId,
        recalculateAll: false,
        includePlayerAnalytics: true,
        includeTeamAnalytics: true
      };

      const interaction: InteractionObject = {
        state: 'ready to calculate analytics',
        uponReceiving: 'an analytics calculation request',
        withRequest: {
          method: 'POST',
          path: '/api/analytics/calculate',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer service-token'
          },
          body: calculationRequest
        },
        willRespondWith: {
          status: 202,
          headers: {
            'Content-Type': 'application/json'
          },
          body: {
            calculationId,
            status: 'queued',
            estimatedCompletion: '2023-12-01T10:35:00Z'
          }
        }
      };

      await analyticsServiceProvider.addInteraction(interaction);

      const response = await fetch(`${analyticsServiceProvider.mockService.baseUrl}/api/analytics/calculate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer service-token'
        },
        body: JSON.stringify(calculationRequest)
      });

      expect(response.status).toBe(202);
      const calculation = await response.json();
      expect(calculation.status).toBe('queued');
    });
  });

  describe('Error Handling Contracts', () => {
    it('should handle service unavailability consistently', async () => {
      const videoId = TestDataFactory.createVideoId();

      const interaction: InteractionObject = {
        state: 'service is temporarily unavailable',
        uponReceiving: 'a request when service is down',
        withRequest: {
          method: 'GET',
          path: `/api/videos/${videoId}`,
          headers: {
            'Accept': 'application/json',
            'Authorization': 'Bearer service-token'
          }
        },
        willRespondWith: {
          status: 503,
          headers: {
            'Content-Type': 'application/json',
            'Retry-After': '30'
          },
          body: {
            error: 'Service Unavailable',
            code: 'SERVICE_UNAVAILABLE',
            message: 'The video service is temporarily unavailable',
            retryAfter: 30
          }
        }
      };

      await videoServiceProvider.addInteraction(interaction);

      const response = await fetch(`${videoServiceProvider.mockService.baseUrl}/api/videos/${videoId}`, {
        headers: {
          'Accept': 'application/json',
          'Authorization': 'Bearer service-token'
        }
      });

      expect(response.status).toBe(503);
      expect(response.headers.get('Retry-After')).toBe('30');
    });
  });
});
