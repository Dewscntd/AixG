/**
 * AI Coaching API Integration Tests
 * Comprehensive testing of GraphQL and REST endpoints with Hebrew language support
 */

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { GraphQLModule } from '@nestjs/graphql';
import { ApolloDriver, ApolloDriverConfig } from '@nestjs/apollo';
import * as request from 'supertest';
import { EventEmitterModule } from '@nestjs/event-emitter';

import { AICoachingPresentationModule } from '../ai-coaching.module';
import { RealTimeCoachingService } from '../../application/services/real-time-coaching.service';
import { CoachingUrgency } from '../../domain/entities/live-coaching-session';

describe('AI Coaching API Integration', () => {
  let app: INestApplication;
  let realTimeCoachingService: RealTimeCoachingService;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        AICoachingPresentationModule,
        EventEmitterModule.forRoot(),
        GraphQLModule.forRoot<ApolloDriverConfig>({
          driver: ApolloDriver,
          autoSchemaFile: true,
          playground: false,
          introspection: false
        })
      ]
    }).compile();

    app = moduleFixture.createNestApplication();
    realTimeCoachingService = moduleFixture.get<RealTimeCoachingService>(RealTimeCoachingService);
    
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('REST API Endpoints', () => {
    describe('GET /api/v1/coaching/health', () => {
      it('should return service health status', async () => {
        const response = await request(app.getHttpServer())
          .get('/api/v1/coaching/health')
          .expect(200);

        expect(response.body).toHaveProperty('status', 'healthy');
        expect(response.body).toHaveProperty('metrics');
        expect(response.body.metrics).toHaveProperty('activeSessions');
        expect(response.body.metrics).toHaveProperty('totalSessions');
        expect(response.body).toHaveProperty('capabilities');
        expect(response.body.capabilities).toContain('hebrew_support');
      });
    });

    describe('POST /api/v1/coaching/sessions', () => {
      it('should create a new coaching session', async () => {
        const createSessionDto = {
          coachId: 'test-coach-001',
          matchId: 'match-001',
          homeTeamId: 'team-home',
          awayTeamId: 'team-away',
          language: 'he',
          preferences: {
            urgencyThreshold: CoachingUrgency.MEDIUM,
            autoNotifications: true,
            culturalAdaptation: true
          }
        };

        const response = await request(app.getHttpServer())
          .post('/api/v1/coaching/sessions')
          .send(createSessionDto)
          .expect(201);

        expect(response.body).toHaveProperty('sessionId');
        expect(response.body).toHaveProperty('matchId', 'match-001');
        expect(response.body).toHaveProperty('coachId', 'test-coach-001');
        expect(response.body).toHaveProperty('message');
        expect(response.body).toHaveProperty('hebrewMessage');
        expect(response.body).toHaveProperty('endpoints');
        expect(response.body.endpoints).toHaveProperty('websocket');
      });

      it('should reject invalid session creation', async () => {
        const invalidDto = {
          coachId: '',
          matchId: 'match-001'
          // Missing required fields
        };

        await request(app.getHttpServer())
          .post('/api/v1/coaching/sessions')
          .send(invalidDto)
          .expect(400);
      });
    });

    describe('Session Management', () => {
      let sessionId: string;

      beforeAll(async () => {
        // Create a test session
        const createSessionDto = {
          coachId: 'test-coach-002',
          matchId: 'match-002',
          homeTeamId: 'team-home',
          awayTeamId: 'team-away',
          language: 'he'
        };

        const response = await request(app.getHttpServer())
          .post('/api/v1/coaching/sessions')
          .send(createSessionDto);

        sessionId = response.body.sessionId;
      });

      describe('GET /api/v1/coaching/sessions/:sessionId', () => {
        it('should return session details', async () => {
          const response = await request(app.getHttpServer())
            .get(`/api/v1/coaching/sessions/${sessionId}`)
            .expect(200);

          expect(response.body).toHaveProperty('sessionId', sessionId);
          expect(response.body).toHaveProperty('status');
          expect(response.body).toHaveProperty('duration');
          expect(response.body).toHaveProperty('matchContext');
          expect(response.body).toHaveProperty('recentInsights');
        });

        it('should return 404 for non-existent session', async () => {
          await request(app.getHttpServer())
            .get('/api/v1/coaching/sessions/non-existent-session')
            .expect(404);
        });
      });

      describe('POST /api/v1/coaching/sessions/:sessionId/query', () => {
        it('should process English coaching query', async () => {
          const queryDto = {
            query: 'What tactical changes should we make to improve our attack?',
            language: 'en',
            urgency: CoachingUrgency.MEDIUM
          };

          const response = await request(app.getHttpServer())
            .post(`/api/v1/coaching/sessions/${sessionId}/query`)
            .send(queryDto)
            .expect(200);

          expect(response.body).toHaveProperty('queryId');
          expect(response.body).toHaveProperty('sessionId', sessionId);
          expect(response.body).toHaveProperty('insight');
          expect(response.body.insight).toHaveProperty('content');
          expect(response.body.insight).toHaveProperty('hebrewContent');
          expect(response.body).toHaveProperty('processingTime');
          expect(response.body.processingTime).toBeGreaterThan(0);
        });

        it('should process Hebrew coaching query', async () => {
          const queryDto = {
            query: 'איך נוכל לשפר את המשחק ההתקפי שלנו?',
            language: 'he',
            urgency: CoachingUrgency.HIGH
          };

          const response = await request(app.getHttpServer())
            .post(`/api/v1/coaching/sessions/${sessionId}/query`)
            .send(queryDto)
            .expect(200);

          expect(response.body).toHaveProperty('insight');
          expect(response.body.insight).toHaveProperty('content');
          expect(response.body.insight).toHaveProperty('hebrewContent');
          expect(response.body.insight).toHaveProperty('urgency', CoachingUrgency.HIGH);
          expect(response.body).toHaveProperty('language', 'he');
        });

        it('should auto-detect Hebrew language', async () => {
          const queryDto = {
            query: 'מה האסטרטגיה הטקטית הטובה ביותר?',
            language: 'auto'
          };

          const response = await request(app.getHttpServer())
            .post(`/api/v1/coaching/sessions/${sessionId}/query`)
            .send(queryDto)
            .expect(200);

          expect(response.body.language).toBe('he');
        });

        it('should reject empty queries', async () => {
          const queryDto = {
            query: '',
            language: 'en'
          };

          await request(app.getHttpServer())
            .post(`/api/v1/coaching/sessions/${sessionId}/query`)
            .send(queryDto)
            .expect(400);
        });
      });

      describe('POST /api/v1/coaching/sessions/:sessionId/insights/instant', () => {
        it('should generate instant insights', async () => {
          const insightsDto = {
            situation: 'The opposing team just scored and we need to respond quickly',
            urgency: CoachingUrgency.HIGH
          };

          const response = await request(app.getHttpServer())
            .post(`/api/v1/coaching/sessions/${sessionId}/insights/instant`)
            .send(insightsDto)
            .expect(200);

          expect(response.body).toHaveProperty('sessionId', sessionId);
          expect(response.body).toHaveProperty('situation', insightsDto.situation);
          expect(response.body).toHaveProperty('insights');
          expect(response.body.insights).toBeInstanceOf(Array);
          expect(response.body).toHaveProperty('count');
          expect(response.body).toHaveProperty('message');
          expect(response.body).toHaveProperty('hebrewMessage');
        });
      });

      describe('GET /api/v1/coaching/sessions/:sessionId/insights', () => {
        it('should return recent insights', async () => {
          const response = await request(app.getHttpServer())
            .get(`/api/v1/coaching/sessions/${sessionId}/insights`)
            .expect(200);

          expect(response.body).toHaveProperty('sessionId', sessionId);
          expect(response.body).toHaveProperty('insights');
          expect(response.body.insights).toBeInstanceOf(Array);
          expect(response.body).toHaveProperty('count');
        });

        it('should filter insights by urgency', async () => {
          const response = await request(app.getHttpServer())
            .get(`/api/v1/coaching/sessions/${sessionId}/insights`)
            .query({ urgency: CoachingUrgency.HIGH })
            .expect(200);

          expect(response.body.filters).toHaveProperty('urgency', CoachingUrgency.HIGH);
        });

        it('should limit insights count', async () => {
          const response = await request(app.getHttpServer())
            .get(`/api/v1/coaching/sessions/${sessionId}/insights`)
            .query({ count: '5' })
            .expect(200);

          expect(response.body.filters).toHaveProperty('maxCount', 5);
        });
      });

      describe('Session Subscription Management', () => {
        const clientId = 'test-client-001';

        it('should subscribe to session updates', async () => {
          const subscriptionDto = {
            clientId,
            subscriptionType: 'insights',
            language: 'he',
            filters: {
              urgencyLevel: CoachingUrgency.MEDIUM
            }
          };

          const response = await request(app.getHttpServer())
            .post(`/api/v1/coaching/sessions/${sessionId}/subscribe`)
            .send(subscriptionDto)
            .expect(200);

          expect(response.body).toHaveProperty('sessionId', sessionId);
          expect(response.body).toHaveProperty('clientId', clientId);
          expect(response.body).toHaveProperty('subscriptionType', 'insights');
          expect(response.body).toHaveProperty('websocketEndpoint');
        });

        it('should unsubscribe from session updates', async () => {
          const response = await request(app.getHttpServer())
            .delete(`/api/v1/coaching/sessions/${sessionId}/subscribe/${clientId}`)
            .expect(200);

          expect(response.body).toHaveProperty('sessionId', sessionId);
          expect(response.body).toHaveProperty('clientId', clientId);
        });
      });

      describe('DELETE /api/v1/coaching/sessions/:sessionId', () => {
        it('should end coaching session', async () => {
          const response = await request(app.getHttpServer())
            .delete(`/api/v1/coaching/sessions/${sessionId}`)
            .expect(200);

          expect(response.body).toHaveProperty('sessionId', sessionId);
          expect(response.body).toHaveProperty('status', 'ended');
          expect(response.body).toHaveProperty('message');
          expect(response.body).toHaveProperty('hebrewMessage');
        });
      });
    });

    describe('GET /api/v1/coaching/metrics', () => {
      it('should return service metrics', async () => {
        const response = await request(app.getHttpServer())
          .get('/api/v1/coaching/metrics')
          .expect(200);

        expect(response.body).toHaveProperty('service', 'ai-coaching');
        expect(response.body).toHaveProperty('metrics');
        expect(response.body.metrics).toHaveProperty('totalSessions');
        expect(response.body.metrics).toHaveProperty('activeSessions');
        expect(response.body.metrics).toHaveProperty('hebrewQueryRatio');
        expect(response.body).toHaveProperty('performance');
        expect(response.body.performance).toHaveProperty('multilingualSupport');
      });
    });
  });

  describe('Rate Limiting', () => {
    it('should include rate limit headers', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/coaching/health');

      expect(response.headers).toHaveProperty('x-ratelimit-limit');
      expect(response.headers).toHaveProperty('x-ratelimit-remaining');
      expect(response.headers).toHaveProperty('x-ratelimit-reset');
      expect(response.headers).toHaveProperty('x-ratelimit-hebrew-multiplier');
    });

    it('should handle Hebrew requests with higher limits', async () => {
      const hebrewQueryDto = {
        query: 'איך נוכל לשפר את המשחק?',
        language: 'he'
      };

      // Create session first
      const sessionResponse = await request(app.getHttpServer())
        .post('/api/v1/coaching/sessions')
        .send({
          coachId: 'test-coach-hebrew',
          matchId: 'match-hebrew',
          homeTeamId: 'team-home',
          awayTeamId: 'team-away',
          language: 'he'
        });

      const sessionId = sessionResponse.body.sessionId;

      const response = await request(app.getHttpServer())
        .post(`/api/v1/coaching/sessions/${sessionId}/query`)
        .send(hebrewQueryDto);

      expect(response.headers).toHaveProperty('x-ratelimit-hebrew-request', 'true');
    });
  });

  describe('Error Handling', () => {
    it('should return structured error responses', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/coaching/sessions')
        .send({})
        .expect(400);

      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('statusCode', 400);
    });

    it('should handle service errors gracefully', async () => {
      // Mock service to throw error
      jest.spyOn(realTimeCoachingService, 'getServiceMetrics').mockImplementation(() => {
        throw new Error('Service temporarily unavailable');
      });

      const response = await request(app.getHttpServer())
        .get('/api/v1/coaching/metrics')
        .expect(500);

      expect(response.body).toHaveProperty('message');
      
      // Restore original implementation
      jest.restoreAllMocks();
    });
  });

  describe('GraphQL API', () => {
    const graphqlEndpoint = '/graphql';

    it('should execute health query', async () => {
      const query = `
        query {
          coachingServiceMetrics {
            totalSessions
            activeSessions
            hebrewQueryRatio
            successRate
          }
        }
      `;

      const response = await request(app.getHttpServer())
        .post(graphqlEndpoint)
        .send({ query })
        .expect(200);

      expect(response.body.data).toHaveProperty('coachingServiceMetrics');
      expect(response.body.data.coachingServiceMetrics).toHaveProperty('totalSessions');
    });

    it('should create session via GraphQL', async () => {
      const mutation = `
        mutation CreateSession($input: CreateSessionInput!) {
          createCoachingSession(input: $input) {
            sessionId
            matchId
            coachId
            message
            hebrewMessage
          }
        }
      `;

      const variables = {
        input: {
          coachId: 'graphql-coach-001',
          matchId: 'graphql-match-001',
          homeTeamId: 'team-home',
          awayTeamId: 'team-away',
          language: 'he'
        }
      };

      const response = await request(app.getHttpServer())
        .post(graphqlEndpoint)
        .send({ query: mutation, variables })
        .expect(200);

      expect(response.body.data).toHaveProperty('createCoachingSession');
      expect(response.body.data.createCoachingSession).toHaveProperty('sessionId');
      expect(response.body.data.createCoachingSession).toHaveProperty('hebrewMessage');
    });

    it('should handle GraphQL errors properly', async () => {
      const invalidQuery = `
        query {
          nonExistentQuery {
            field
          }
        }
      `;

      const response = await request(app.getHttpServer())
        .post(graphqlEndpoint)
        .send({ query: invalidQuery })
        .expect(400);

      expect(response.body).toHaveProperty('errors');
      expect(response.body.errors[0]).toHaveProperty('message');
    });
  });
});

describe('Hebrew Language Integration', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AICoachingPresentationModule]
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('should handle mixed Hebrew/English content', async () => {
    // Create session
    const sessionResponse = await request(app.getHttpServer())
      .post('/api/v1/coaching/sessions')
      .send({
        coachId: 'multilingual-coach',
        matchId: 'multilingual-match',
        homeTeamId: 'team-home',
        awayTeamId: 'team-away',
        language: 'mixed'
      });

    const sessionId = sessionResponse.body.sessionId;

    // Send mixed language query
    const mixedQuery = {
      query: 'נצטרך formation change במחצית השנייה',
      language: 'auto'
    };

    const response = await request(app.getHttpServer())
      .post(`/api/v1/coaching/sessions/${sessionId}/query`)
      .send(mixedQuery)
      .expect(200);

    expect(response.body.insight).toHaveProperty('content');
    expect(response.body.insight).toHaveProperty('hebrewContent');
  });

  it('should provide Hebrew error messages', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/v1/coaching/sessions/invalid-session/query')
      .send({ query: 'איך לשפר את המשחק?' });

    // Should return error with Hebrew context
    expect(response.status).not.toBe(200);
  });
});