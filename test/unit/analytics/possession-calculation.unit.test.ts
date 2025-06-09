/**
 * Unit Tests for Possession Calculation Service
 * Tests pure functional possession calculation logic
 */

import {
  calculateBothTeamsPossession,
  PossessionSequence
} from '../../../src/analytics-engine-service/domain/services/possession-calculation.service';

describe('PossessionCalculationService - Unit Tests', () => {
  describe('calculateBothTeamsPossession', () => {
    it('should calculate correct possession percentages for simple case', () => {
      const sequences: PossessionSequence[] = [
        {
          teamId: 'team-a',
          startTime: 1000,
          endTime: 6000,
          events: [
            {
              timestamp: 1000,
              teamId: 'team-a',
              playerId: 'player-1',
              eventType: 'pass',
              position: { x: 50, y: 50 },
              successful: true,
              duration: 5,
            }
          ],
          endReason: 'lost_ball'
        },
        {
          teamId: 'team-b',
          startTime: 6000,
          endTime: 16000,
          events: [
            {
              timestamp: 6000,
              teamId: 'team-b',
              playerId: 'player-2',
              eventType: 'pass',
              position: { x: 60, y: 40 },
              successful: true,
              duration: 10,
            }
          ],
          endReason: 'lost_ball'
        },
      ];

      const result = calculateBothTeamsPossession(sequences, 'team-a', 'team-b');

      expect(result.home.value).toBeCloseTo(33.33, 1); // 5 out of 15 seconds
      expect(result.away.value).toBeCloseTo(66.67, 1); // 10 out of 15 seconds
      expect(result.home.value + result.away.value).toBeCloseTo(100, 1);
    });

    it('should handle empty sequences array', () => {
      const result = calculateBothTeamsPossession([], 'team-a', 'team-b');

      expect(result.home.value).toBe(0);
      expect(result.away.value).toBe(0);
    });

    it('should handle single team possession', () => {
      const sequences: PossessionSequence[] = [
        {
          teamId: 'team-a',
          startTime: 1000,
          endTime: 11000,
          events: [
            {
              timestamp: 1000,
              teamId: 'team-a',
              playerId: 'player-1',
              eventType: 'pass',
              position: { x: 50, y: 50 },
              successful: true,
              duration: 10,
            }
          ],
          endReason: 'lost_ball'
        },
      ];

      const result = calculateBothTeamsPossession(sequences, 'team-a', 'team-b');

      expect(result.home.value).toBe(100);
      expect(result.away.value).toBe(0);
    });

    it('should be a pure function', () => {
      const sequences: PossessionSequence[] = [
        {
          teamId: 'team-a',
          startTime: 1000,
          endTime: 6000,
          events: [],
          endReason: 'lost_ball'
        },
        {
          teamId: 'team-b',
          startTime: 6000,
          endTime: 11000,
          events: [],
          endReason: 'lost_ball'
        },
      ];

      // Test that multiple calls with same input produce same output
      const result1 = calculateBothTeamsPossession(sequences, 'team-a', 'team-b');
      const result2 = calculateBothTeamsPossession(sequences, 'team-a', 'team-b');

      expect(result1.home.value).toBe(result2.home.value);
      expect(result1.away.value).toBe(result2.away.value);
    });

    it('should handle sequences without events', () => {
      const sequences: PossessionSequence[] = [
        {
          teamId: 'team-a',
          startTime: 1000,
          endTime: 6000,
          events: [],
          endReason: 'lost_ball'
        },
        {
          teamId: 'team-b',
          startTime: 6000,
          endTime: 11000,
          events: [],
          endReason: 'lost_ball'
        },
      ];

      const result = calculateBothTeamsPossession(sequences, 'team-a', 'team-b');

      // Should handle empty events gracefully
      expect(result.home.value).toBeGreaterThan(0);
      expect(result.away.value).toBeGreaterThan(0);
      expect(result.home.value + result.away.value).toBeCloseTo(100, 1);
    });
  });

  describe('Possession Sequence Validation', () => {
    it('should validate possession sequence structure', () => {
      const sequence: PossessionSequence = {
        teamId: 'team-a',
        startTime: 1000,
        endTime: 5000,
        events: [
          {
            timestamp: 1000,
            teamId: 'team-a',
            playerId: 'player-1',
            eventType: 'pass',
            position: { x: 30, y: 50 },
            successful: true,
          }
        ],
        endReason: 'lost_ball'
      };

      expect(sequence.teamId).toBe('team-a');
      expect(sequence.startTime).toBe(1000);
      expect(sequence.endTime).toBe(5000);
      expect(sequence.events).toHaveLength(1);
      expect(sequence.endReason).toBe('lost_ball');
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle malformed sequences gracefully', () => {
      const sequences: any[] = [
        {
          teamId: 'team-a',
          startTime: 1000,
          endTime: 2000,
          events: [],
          // Missing endReason
        },
      ];

      expect(() => calculateBothTeamsPossession(sequences, 'team-a', 'team-b')).not.toThrow();
    });

    it('should handle negative timestamps', () => {
      const sequences: PossessionSequence[] = [
        {
          teamId: 'team-a',
          startTime: -1000,
          endTime: 4000,
          events: [
            {
              timestamp: -1000,
              teamId: 'team-a',
              playerId: 'player-1',
              eventType: 'pass',
              position: { x: 50, y: 50 },
              successful: true,
              duration: 5,
            }
          ],
          endReason: 'lost_ball'
        },
      ];

      const result = calculateBothTeamsPossession(sequences, 'team-a', 'team-b');
      expect(result.home.value).toBeValidPossession();
      expect(result.away.value).toBeValidPossession();
    });

    it('should handle very large durations', () => {
      const sequences: PossessionSequence[] = [
        {
          teamId: 'team-a',
          startTime: 1000,
          endTime: 1000000, // Very large duration
          events: [
            {
              timestamp: 1000,
              teamId: 'team-a',
              playerId: 'player-1',
              eventType: 'pass',
              position: { x: 50, y: 50 },
              successful: true,
              duration: 999999,
            }
          ],
          endReason: 'lost_ball'
        },
      ];

      const result = calculateBothTeamsPossession(sequences, 'team-a', 'team-b');
      expect(result.home.value).toBeValidPossession();
      expect(result.away.value).toBeValidPossession();
    });
  });

  describe('Performance Tests', () => {
    it('should handle large number of sequences efficiently', () => {
      const sequences: PossessionSequence[] = Array.from({ length: 1000 }, (_, i) => ({
        teamId: i % 2 === 0 ? 'team-a' : 'team-b',
        startTime: i * 1000,
        endTime: (i + 1) * 1000,
        events: [
          {
            timestamp: i * 1000,
            teamId: i % 2 === 0 ? 'team-a' : 'team-b',
            playerId: `player-${i % 22}`,
            eventType: 'pass',
            position: { x: Math.random() * 100, y: Math.random() * 100 },
            successful: Math.random() > 0.2,
            duration: Math.random() * 10,
          }
        ],
        endReason: 'lost_ball'
      }));

      const startTime = Date.now();
      const result = calculateBothTeamsPossession(sequences, 'team-a', 'team-b');
      const endTime = Date.now();

      expect(endTime - startTime).toBeLessThan(1000); // Should complete in under 1 second
      expect(result.home.value).toBeValidPossession();
      expect(result.away.value).toBeValidPossession();
    });
  });
});


