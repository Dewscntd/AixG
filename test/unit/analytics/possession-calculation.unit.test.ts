/**
 * Unit Tests for Possession Calculation Service
 * Tests pure functional possession calculation logic
 */

import {
  calculateBothTeamsPossession,
  PossessionEvent,
  PossessionSequence
} from '../../../src/analytics-engine-service/domain/services/possession-calculation.service';
import { TestDataFactory } from '../../setup/jest.setup';
import { UnitTestUtils } from '../../setup/unit.setup';
import '../../setup/jest.setup';

describe('PossessionCalculationService - Unit Tests', () => {
  describe('calculateBothTeamsPossession', () => {
    it('should calculate correct possession percentages for simple case', () => {
      const events: PossessionEvent[] = [
        {
          timestamp: 1000,
          teamId: 'team-a',
          playerId: 'player-1',
          eventType: 'pass',
          position: { x: 50, y: 50 },
          successful: true,
          duration: 5,
        },
        {
          timestamp: 6000,
          teamId: 'team-b',
          playerId: 'player-2',
          eventType: 'pass',
          position: { x: 60, y: 40 },
          successful: true,
          duration: 10,
        },
      ];

      const result = calculateBothTeamsPossession(events);

      expect(result.homeTeamPossession.value).toBeCloseTo(33.33, 1); // 5 out of 15 seconds
      expect(result.awayTeamPossession.value).toBeCloseTo(66.67, 1); // 10 out of 15 seconds
      expect(result.homeTeamPossession.value + result.awayTeamPossession.value).toBeCloseTo(100, 1);
    });

    it('should handle empty events array', () => {
      const result = calculateBothTeamsPossession([]);

      expect(result.homeTeamPossession.value).toBe(0);
      expect(result.awayTeamPossession.value).toBe(0);
    });

    it('should handle single team possession', () => {
      const events: PossessionEvent[] = [
        {
          timestamp: 1000,
          teamId: 'team-a',
          playerId: 'player-1',
          eventType: 'pass',
          position: { x: 50, y: 50 },
          successful: true,
          duration: 10,
        },
      ];

      const result = calculateBothTeamsPossession(events);

      expect(result.homeTeamPossession.value).toBe(100);
      expect(result.awayTeamPossession.value).toBe(0);
    });

    it('should be a pure function', () => {
      const events = [
        TestDataFactory.createPossessionEvent(),
        TestDataFactory.createPossessionEvent(),
      ];

      UnitTestUtils.assertPureFunction(
        calculateBothTeamsPossession,
        [events],
        5
      );
    });

    it('should handle events without duration', () => {
      const events: PossessionEvent[] = [
        {
          timestamp: 1000,
          teamId: 'team-a',
          playerId: 'player-1',
          eventType: 'shot',
          position: { x: 90, y: 50 },
          successful: false,
          // No duration - should use default
        },
        {
          timestamp: 2000,
          teamId: 'team-b',
          playerId: 'player-2',
          eventType: 'pass',
          position: { x: 30, y: 30 },
          successful: true,
          duration: 5,
        },
      ];

      const result = calculateBothTeamsPossession(events);

      // Should handle missing duration gracefully
      expect(result.homeTeamPossession.value).toBeGreaterThan(0);
      expect(result.awayTeamPossession.value).toBeGreaterThan(0);
      expect(result.homeTeamPossession.value + result.awayTeamPossession.value).toBeCloseTo(100, 1);
    });
  });

  describe('calculatePossessionSequences', () => {
    it('should identify possession sequences correctly', () => {
      const events: PossessionEvent[] = [
        {
          timestamp: 1000,
          teamId: 'team-a',
          playerId: 'player-1',
          eventType: 'pass',
          position: { x: 30, y: 50 },
          successful: true,
        },
        {
          timestamp: 3000,
          teamId: 'team-a',
          playerId: 'player-2',
          eventType: 'pass',
          position: { x: 40, y: 50 },
          successful: true,
        },
        {
          timestamp: 5000,
          teamId: 'team-b',
          playerId: 'player-3',
          eventType: 'interception',
          position: { x: 45, y: 50 },
          successful: true,
        },
        {
          timestamp: 7000,
          teamId: 'team-b',
          playerId: 'player-4',
          eventType: 'pass',
          position: { x: 50, y: 60 },
          successful: true,
        },
      ];

      const sequences = calculatePossessionSequences(events);

      expect(sequences).toHaveLength(2);
      
      // First sequence - team-a
      expect(sequences[0].teamId).toBe('team-a');
      expect(sequences[0].events).toHaveLength(2);
      expect(sequences[0].startTime).toBe(1000);
      expect(sequences[0].endTime).toBe(5000);
      expect(sequences[0].endReason).toBe('lost_ball');
      
      // Second sequence - team-b
      expect(sequences[1].teamId).toBe('team-b');
      expect(sequences[1].events).toHaveLength(2);
      expect(sequences[1].startTime).toBe(5000);
    });

    it('should handle sequence ending with shot', () => {
      const events: PossessionEvent[] = [
        {
          timestamp: 1000,
          teamId: 'team-a',
          playerId: 'player-1',
          eventType: 'pass',
          position: { x: 30, y: 50 },
          successful: true,
        },
        {
          timestamp: 3000,
          teamId: 'team-a',
          playerId: 'player-2',
          eventType: 'shot',
          position: { x: 95, y: 50 },
          successful: false,
        },
      ];

      const sequences = calculatePossessionSequences(events);

      expect(sequences).toHaveLength(1);
      expect(sequences[0].endReason).toBe('shot');
    });

    it('should be deterministic', () => {
      const events = [
        TestDataFactory.createPossessionEvent(),
        TestDataFactory.createPossessionEvent(),
        TestDataFactory.createPossessionEvent(),
      ].sort((a, b) => a.timestamp - b.timestamp);

      UnitTestUtils.assertPureFunction(
        calculatePossessionSequences,
        [events],
        3
      );
    });

    it('should handle empty events', () => {
      const sequences = calculatePossessionSequences([]);
      expect(sequences).toEqual([]);
    });

    it('should handle single event', () => {
      const events: PossessionEvent[] = [
        {
          timestamp: 1000,
          teamId: 'team-a',
          playerId: 'player-1',
          eventType: 'pass',
          position: { x: 50, y: 50 },
          successful: true,
        },
      ];

      const sequences = calculatePossessionSequences(events);

      expect(sequences).toHaveLength(1);
      expect(sequences[0].events).toHaveLength(1);
      expect(sequences[0].teamId).toBe('team-a');
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle malformed events gracefully', () => {
      const events: any[] = [
        {
          timestamp: 1000,
          teamId: 'team-a',
          // Missing required fields
        },
        {
          // Completely malformed
          invalid: 'data',
        },
      ];

      expect(() => calculateBothTeamsPossession(events)).not.toThrow();
      expect(() => calculatePossessionSequences(events)).not.toThrow();
    });

    it('should handle negative timestamps', () => {
      const events: PossessionEvent[] = [
        {
          timestamp: -1000,
          teamId: 'team-a',
          playerId: 'player-1',
          eventType: 'pass',
          position: { x: 50, y: 50 },
          successful: true,
          duration: 5,
        },
      ];

      const result = calculateBothTeamsPossession(events);
      expect(result.homeTeamPossession.value).toBeValidPossession();
      expect(result.awayTeamPossession.value).toBeValidPossession();
    });

    it('should handle very large durations', () => {
      const events: PossessionEvent[] = [
        {
          timestamp: 1000,
          teamId: 'team-a',
          playerId: 'player-1',
          eventType: 'pass',
          position: { x: 50, y: 50 },
          successful: true,
          duration: 999999, // Very large duration
        },
      ];

      const result = calculateBothTeamsPossession(events);
      expect(result.homeTeamPossession.value).toBeValidPossession();
      expect(result.awayTeamPossession.value).toBeValidPossession();
    });
  });

  describe('Performance Tests', () => {
    it('should handle large number of events efficiently', () => {
      const events: PossessionEvent[] = Array.from({ length: 10000 }, (_, i) => ({
        timestamp: i * 1000,
        teamId: i % 2 === 0 ? 'team-a' : 'team-b',
        playerId: `player-${i % 22}`,
        eventType: 'pass',
        position: { x: Math.random() * 100, y: Math.random() * 100 },
        successful: Math.random() > 0.2,
        duration: Math.random() * 10,
      }));

      const startTime = Date.now();
      const result = calculateBothTeamsPossession(events);
      const endTime = Date.now();

      expect(endTime - startTime).toBeLessThan(1000); // Should complete in under 1 second
      expect(result.homeTeamPossession.value).toBeValidPossession();
      expect(result.awayTeamPossession.value).toBeValidPossession();
    });
  });
});

// Helper function for test data
function createPossessionEvent(overrides: Partial<PossessionEvent> = {}): PossessionEvent {
  return {
    timestamp: Date.now(),
    teamId: 'team-a',
    playerId: 'player-1',
    eventType: 'pass',
    position: { x: 50, y: 50 },
    successful: true,
    ...overrides,
  };
}
