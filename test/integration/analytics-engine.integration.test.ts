/**
 * Integration Tests for Analytics Engine Service
 * Tests real database interactions and event processing
 */

import { AnalyticsApplicationService } from '../../src/analytics-engine-service/application/analytics-application.service';
import { IntegrationTestUtils } from '../setup/integration.setup';
import { TestDataFactory } from '../setup/jest.setup';

describe('Analytics Engine Service - Integration Tests', () => {
  let analyticsService: AnalyticsApplicationService;
  let eventStore: any;

  beforeEach(async () => {
    // Create test event store with real database
    eventStore = IntegrationTestUtils.createTestEventStore();
    
    // Initialize analytics service with test dependencies
    analyticsService = new AnalyticsApplicationService(
      eventStore,
      IntegrationTestUtils.getDbPool()
    );

    // Seed test data
    await IntegrationTestUtils.seedTestData();
  });

  describe('Match Analytics Creation', () => {
    it('should create match analytics and persist to database', async () => {
      const matchId = TestDataFactory.createMatchId();
      const homeTeamId = TestDataFactory.createTeamId();
      const awayTeamId = TestDataFactory.createTeamId();

      // Create match analytics
      await analyticsService.createMatchAnalytics({
        matchId,
        homeTeamId,
        awayTeamId,
        matchDuration: 0,
      });

      // Verify database state
      const result = await IntegrationTestUtils.query(
        'SELECT * FROM match_analytics WHERE match_id = $1',
        [matchId]
      );

      expect(result.rows).toHaveLength(1);
      expect(result.rows[0].match_id).toBe(matchId);
      expect(result.rows[0].home_team_xg).toBe('0.00');
      expect(result.rows[0].away_team_xg).toBe('0.00');
    });

    it('should publish domain events to event store', async () => {
      const matchId = TestDataFactory.createMatchId();
      const homeTeamId = TestDataFactory.createTeamId();
      const awayTeamId = TestDataFactory.createTeamId();

      await analyticsService.createMatchAnalytics({
        matchId,
        homeTeamId,
        awayTeamId,
        matchDuration: 0,
      });

      // Verify events were stored
      const events = await eventStore.read(`match-analytics-${matchId}`);
      expect(events).toHaveLength(1);
      expect(events[0].eventType).toBe('MatchAnalyticsCreated');
    });
  });

  describe('xG Calculation Integration', () => {
    it('should process ML pipeline output and update xG', async () => {
      const matchId = TestDataFactory.createMatchId();
      const homeTeamId = TestDataFactory.createTeamId();
      const awayTeamId = TestDataFactory.createTeamId();

      // Create initial analytics
      await analyticsService.createMatchAnalytics({
        matchId,
        homeTeamId,
        awayTeamId,
        matchDuration: 0,
      });

      // Process ML pipeline output with shot data
      const mlOutput = {
        matchId,
        shots: [
          {
            teamId: homeTeamId,
            ...TestDataFactory.createShotData(),
          },
          {
            teamId: awayTeamId,
            ...TestDataFactory.createShotData(),
          },
        ],
        timestamp: new Date(),
      };

      await analyticsService.processMLPipelineOutput(mlOutput);

      // Verify xG was calculated and stored
      const result = await IntegrationTestUtils.query(
        'SELECT home_team_xg, away_team_xg FROM match_analytics WHERE match_id = $1',
        [matchId]
      );

      expect(result.rows).toHaveLength(1);
      expect(parseFloat(result.rows[0].home_team_xg)).toBeGreaterThan(0);
      expect(parseFloat(result.rows[0].away_team_xg)).toBeGreaterThan(0);
    });

    it('should handle batch xG calculations efficiently', async () => {
      const matchId = TestDataFactory.createMatchId();
      const homeTeamId = TestDataFactory.createTeamId();
      const awayTeamId = TestDataFactory.createTeamId();

      await analyticsService.createMatchAnalytics({
        matchId,
        homeTeamId,
        awayTeamId,
        matchDuration: 0,
      });

      // Create large batch of shots
      const shots = Array.from({ length: 100 }, (_, i) => ({
        teamId: i % 2 === 0 ? homeTeamId : awayTeamId,
        ...TestDataFactory.createShotData(),
      }));

      const startTime = Date.now();
      
      await analyticsService.processMLPipelineOutput({
        matchId,
        shots,
        timestamp: new Date(),
      });

      const endTime = Date.now();

      // Should process efficiently
      expect(endTime - startTime).toBeLessThan(5000); // Under 5 seconds

      // Verify results
      const result = await IntegrationTestUtils.query(
        'SELECT home_team_xg, away_team_xg FROM match_analytics WHERE match_id = $1',
        [matchId]
      );

      expect(parseFloat(result.rows[0].home_team_xg)).toBeGreaterThan(0);
      expect(parseFloat(result.rows[0].away_team_xg)).toBeGreaterThan(0);
    });
  });

  describe('Possession Calculation Integration', () => {
    it('should calculate and store possession percentages', async () => {
      const matchId = TestDataFactory.createMatchId();
      const homeTeamId = TestDataFactory.createTeamId();
      const awayTeamId = TestDataFactory.createTeamId();

      await analyticsService.createMatchAnalytics({
        matchId,
        homeTeamId,
        awayTeamId,
        matchDuration: 0,
      });

      // Process possession events
      const possessionEvents = Array.from({ length: 20 }, (_, i) => ({
        timestamp: i * 1000,
        teamId: i % 3 === 0 ? homeTeamId : awayTeamId, // 1/3 home, 2/3 away
        playerId: TestDataFactory.createPlayerId(),
        eventType: 'pass' as const,
        position: TestDataFactory.createPosition(),
        successful: true,
        duration: 5,
      }));

      await analyticsService.updatePossession({
        matchId,
        possessionEvents,
      });

      // Verify possession was calculated and stored
      const result = await IntegrationTestUtils.query(
        'SELECT home_possession, away_possession FROM match_analytics WHERE match_id = $1',
        [matchId]
      );

      expect(result.rows).toHaveLength(1);
      const homePossession = parseFloat(result.rows[0].home_possession);
      const awayPossession = parseFloat(result.rows[0].away_possession);

      expect(homePossession).toBeValidPossession();
      expect(awayPossession).toBeValidPossession();
      expect(homePossession + awayPossession).toBeCloseTo(100, 1);
      
      // Home team should have less possession (1/3 of events)
      expect(homePossession).toBeLessThan(awayPossession);
    });
  });

  describe('Event Sourcing Integration', () => {
    it('should rebuild analytics from events', async () => {
      const matchId = TestDataFactory.createMatchId();
      const homeTeamId = TestDataFactory.createTeamId();
      const awayTeamId = TestDataFactory.createTeamId();

      // Create and modify analytics
      await analyticsService.createMatchAnalytics({
        matchId,
        homeTeamId,
        awayTeamId,
        matchDuration: 0,
      });

      await analyticsService.updateXG({
        matchId,
        teamId: homeTeamId,
        newXG: 1.5,
      });

      await analyticsService.updateXG({
        matchId,
        teamId: awayTeamId,
        newXG: 0.8,
      });

      // Clear database but keep events
      await IntegrationTestUtils.query(
        'DELETE FROM match_analytics WHERE match_id = $1',
        [matchId]
      );

      // Rebuild from events
      await analyticsService.rebuildAnalyticsFromEvents(matchId);

      // Verify rebuilt state
      const result = await IntegrationTestUtils.query(
        'SELECT home_team_xg, away_team_xg FROM match_analytics WHERE match_id = $1',
        [matchId]
      );

      expect(result.rows).toHaveLength(1);
      expect(parseFloat(result.rows[0].home_team_xg)).toBeCloseTo(1.5, 2);
      expect(parseFloat(result.rows[0].away_team_xg)).toBeCloseTo(0.8, 2);
    });

    it('should handle event replay with snapshots', async () => {
      const matchId = TestDataFactory.createMatchId();
      const homeTeamId = TestDataFactory.createTeamId();
      const awayTeamId = TestDataFactory.createTeamId();

      await analyticsService.createMatchAnalytics({
        matchId,
        homeTeamId,
        awayTeamId,
        matchDuration: 0,
      });

      // Generate many events
      for (let i = 0; i < 50; i++) {
        await analyticsService.updateXG({
          matchId,
          teamId: i % 2 === 0 ? homeTeamId : awayTeamId,
          newXG: i * 0.1,
        });
      }

      // Create snapshot
      await analyticsService.createSnapshot(matchId);

      // Add more events after snapshot
      for (let i = 0; i < 10; i++) {
        await analyticsService.updateXG({
          matchId,
          teamId: homeTeamId,
          newXG: 5.0 + i * 0.1,
        });
      }

      // Rebuild should use snapshot + subsequent events
      await IntegrationTestUtils.query(
        'DELETE FROM match_analytics WHERE match_id = $1',
        [matchId]
      );

      const startTime = Date.now();
      await analyticsService.rebuildAnalyticsFromEvents(matchId);
      const endTime = Date.now();

      // Should be faster due to snapshot
      expect(endTime - startTime).toBeLessThan(1000);

      // Verify final state
      const result = await IntegrationTestUtils.query(
        'SELECT home_team_xg FROM match_analytics WHERE match_id = $1',
        [matchId]
      );

      expect(parseFloat(result.rows[0].home_team_xg)).toBeCloseTo(5.9, 1);
    });
  });

  describe('Concurrent Operations', () => {
    it('should handle concurrent xG updates correctly', async () => {
      const matchId = TestDataFactory.createMatchId();
      const homeTeamId = TestDataFactory.createTeamId();
      const awayTeamId = TestDataFactory.createTeamId();

      await analyticsService.createMatchAnalytics({
        matchId,
        homeTeamId,
        awayTeamId,
        matchDuration: 0,
      });

      // Simulate concurrent updates
      const updates = Array.from({ length: 10 }, (_, i) =>
        analyticsService.updateXG({
          matchId,
          teamId: homeTeamId,
          newXG: i * 0.1,
        })
      );

      await Promise.all(updates);

      // Verify final state is consistent
      const events = await eventStore.read(`match-analytics-${matchId}`);
      expect(events.length).toBeGreaterThan(10); // Creation + updates

      const result = await IntegrationTestUtils.query(
        'SELECT home_team_xg FROM match_analytics WHERE match_id = $1',
        [matchId]
      );

      expect(parseFloat(result.rows[0].home_team_xg)).toBeValidXG();
    });
  });

  describe('Error Handling', () => {
    it('should handle database connection failures gracefully', async () => {
      // Simulate database failure
      const badPool = {
        query: jest.fn().mockRejectedValue(new Error('Database connection failed')),
      };

      const badAnalyticsService = new AnalyticsApplicationService(
        eventStore,
        badPool as any
      );

      const matchId = TestDataFactory.createMatchId();

      await expect(
        badAnalyticsService.createMatchAnalytics({
          matchId,
          homeTeamId: TestDataFactory.createTeamId(),
          awayTeamId: TestDataFactory.createTeamId(),
          matchDuration: 0,
        })
      ).rejects.toThrow('Database connection failed');
    });

    it('should handle malformed ML pipeline output', async () => {
      const matchId = TestDataFactory.createMatchId();

      await analyticsService.createMatchAnalytics({
        matchId,
        homeTeamId: TestDataFactory.createTeamId(),
        awayTeamId: TestDataFactory.createTeamId(),
        matchDuration: 0,
      });

      // Send malformed data
      const malformedOutput = {
        matchId,
        shots: [
          {
            // Missing required fields
            teamId: 'invalid',
          },
        ],
        timestamp: new Date(),
      };

      await expect(
        analyticsService.processMLPipelineOutput(malformedOutput as any)
      ).rejects.toThrow();
    });
  });
});
