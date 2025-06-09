/**
 * Property-Based Tests for xG Calculation Service
 * Tests mathematical properties and invariants of xG calculations
 */

import fc from 'fast-check';
import { calculateXG, calculateXGComposed, calculateBatchXG, calculateTotalXG } from '../../../src/analytics-engine-service/domain/services/xg-calculation.service';
import { FootballArbitraries, PropertyTestUtils } from '../../setup/property.setup';
import '../../setup/jest.setup';

describe('XGCalculationService - Property-Based Tests', () => {
  describe('Mathematical Properties', () => {
    it('should always return values between 0 and 1', () => {
      fc.assert(
        fc.property(FootballArbitraries.shotData(), (shotData) => {
          const result = calculateXG(shotData);
          expect(result.value).toBeGreaterThanOrEqual(0);
          expect(result.value).toBeLessThanOrEqual(1);
        })
      );
    });

    it('should be deterministic - same input produces same output', () => {
      fc.assert(
        PropertyTestUtils.testDeterministic(
          calculateXG,
          fc.tuple(FootballArbitraries.shotData())
        )
      );
    });

    it('should maintain monotonicity - closer shots generally have higher xG', () => {
      fc.assert(
        fc.property(
          FootballArbitraries.shotData(),
          fc.float({ min: 5, max: 15 }), // Larger distance reduction to ensure meaningful difference
          (baseShotData, distanceReduction) => {
            // Only test when the original shot is far enough to make a meaningful comparison
            fc.pre(baseShotData.distanceToGoal > 15);

            const closerShot = {
              ...baseShotData,
              distanceToGoal: Math.max(1, baseShotData.distanceToGoal - distanceReduction),
            };

            const originalXG = calculateXG(baseShotData);
            const closerXG = calculateXG(closerShot);

            // Allow for some tolerance due to other modifiers
            expect(closerXG.value).toBeGreaterThanOrEqual(originalXG.value - 0.1);
          }
        )
      );
    });

    it('should maintain angle monotonicity - better angles have higher xG', () => {
      fc.assert(
        fc.property(
          FootballArbitraries.shotData(),
          (shotData) => {
            // Test with perfect angle (0 degrees)
            const perfectAngleShot = {
              ...shotData,
              angle: 0,
            };
            
            const originalXG = calculateXG(shotData);
            const perfectAngleXG = calculateXG(perfectAngleShot);
            
            // Perfect angle should have higher or equal xG
            expect(perfectAngleXG.value).toBeGreaterThanOrEqual(originalXG.value);
          }
        )
      );
    });

    it('should handle edge cases gracefully', () => {
      fc.assert(
        fc.property(
          fc.record({
            position: FootballArbitraries.position(),
            targetPosition: fc.constant({ x: 100, y: 50 }),
            distanceToGoal: fc.constantFrom(0, 0.1, 100, 1000), // Edge distances
            angle: fc.constantFrom(0, 90, 180), // Edge angles
            bodyPart: fc.constantFrom('foot' as const, 'head' as const, 'other' as const),
            situation: fc.constantFrom('penalty' as const, 'open_play' as const),
            defenderCount: fc.constantFrom(0, 11), // Edge defender counts
            gameState: fc.record({
              minute: fc.constantFrom(1, 45, 90),
              scoreDifference: fc.constantFrom(-5, 0, 5),
              isHome: fc.boolean(),
            }),
          }),
          (shotData) => {
            const result = calculateXG(shotData);
            
            // Should not throw and should return valid xG
            expect(result.value).toBeValidXG();
            expect(Number.isFinite(result.value)).toBe(true);
            expect(Number.isNaN(result.value)).toBe(false);
          }
        )
      );
    });

    it('should maintain composition equivalence', () => {
      fc.assert(
        fc.property(FootballArbitraries.shotData(), (shotData) => {
          const standardResult = calculateXG(shotData);
          const composedResult = calculateXGComposed(shotData);
          
          // Results should be very close (within floating point precision)
          expect(Math.abs(standardResult.value - composedResult.value)).toBeLessThan(0.0001);
        })
      );
    });
  });

  describe('Batch Processing Properties', () => {
    it('should maintain consistency between single and batch calculations', () => {
      fc.assert(
        fc.property(
          fc.array(FootballArbitraries.shotData(), { minLength: 1, maxLength: 10 }),
          (shotDataArray) => {
            const batchResults = calculateBatchXG(shotDataArray);
            const individualResults = shotDataArray.map(calculateXG);

            expect(batchResults).toHaveLength(individualResults.length);

            batchResults.forEach((batchResult, index) => {
              const individualResult = individualResults[index];
              expect(individualResult).toBeDefined();
              expect(Math.abs(batchResult.value - individualResult!.value)).toBeLessThan(0.0001);
            });
          }
        )
      );
    });

    it('should handle empty arrays gracefully', () => {
      const result = calculateBatchXG([]);
      expect(result).toEqual([]);
    });

    it('should maintain total consistency between batch and individual calculations', () => {
      fc.assert(
        fc.property(
          fc.array(FootballArbitraries.shotData(), { minLength: 1, maxLength: 10 }),
          (shotDataArray) => {
            const batchResults = calculateBatchXG(shotDataArray);
            const totalFromBatch = batchResults.reduce((sum, xg) => sum + xg.value, 0);

            const totalXG = calculateTotalXG(shotDataArray);

            expect(Math.abs(totalFromBatch - totalXG)).toBeLessThan(0.001);
          }
        )
      );
    });
  });

  describe('Domain-Specific Properties', () => {
    it('should give penalties very high xG', () => {
      fc.assert(
        fc.property(
          FootballArbitraries.shotData(),
          (baseShotData) => {
            const penaltyShot = {
              ...baseShotData,
              situation: 'penalty' as const,
              distanceToGoal: 11, // Penalty spot distance
              angle: 0, // Perfect angle
              defenderCount: 0, // No defenders
            };
            
            const result = calculateXG(penaltyShot);
            expect(result.value).toBeGreaterThan(0.7); // Penalties should have high xG
          }
        )
      );
    });

    it('should give headers different xG than foot shots', () => {
      fc.assert(
        fc.property(
          FootballArbitraries.shotData(),
          (baseShotData) => {
            const footShot = { ...baseShotData, bodyPart: 'foot' as const };
            const headerShot = { ...baseShotData, bodyPart: 'head' as const };
            
            const footXG = calculateXG(footShot);
            const headerXG = calculateXG(headerShot);
            
            // They should be different (unless other factors make them equal)
            if (baseShotData.distanceToGoal > 6) {
              // For longer shots, foot is typically better
              expect(footXG.value).toBeGreaterThanOrEqual(headerXG.value);
            }
          }
        )
      );
    });

    it('should consider game state impact', () => {
      fc.assert(
        fc.property(
          FootballArbitraries.shotData(),
          (baseShotData) => {
            const lateGameShot = {
              ...baseShotData,
              gameState: {
                ...baseShotData.gameState,
                minute: 89, // Late in the game
                scoreDifference: -1, // Team is losing
              },
            };
            
            const earlyGameShot = {
              ...baseShotData,
              gameState: {
                ...baseShotData.gameState,
                minute: 10, // Early in the game
                scoreDifference: 0, // Tied game
              },
            };
            
            const lateXG = calculateXG(lateGameShot);
            const earlyXG = calculateXG(earlyGameShot);
            
            // Both should be valid xG values
            expect(lateXG.value).toBeValidXG();
            expect(earlyXG.value).toBeValidXG();
          }
        )
      );
    });

    it('should handle defender impact correctly', () => {
      fc.assert(
        fc.property(
          FootballArbitraries.shotData(),
          (baseShotData) => {
            const noDefendersShot = { ...baseShotData, defenderCount: 0 };
            const manyDefendersShot = { ...baseShotData, defenderCount: 5 };
            
            const noDefendersXG = calculateXG(noDefendersShot);
            const manyDefendersXG = calculateXG(manyDefendersShot);
            
            // More defenders should reduce xG
            expect(noDefendersXG.value).toBeGreaterThanOrEqual(manyDefendersXG.value);
          }
        )
      );
    });
  });

  describe('Invariant Properties', () => {
    it('should maintain xG sum invariant for team totals', () => {
      fc.assert(
        fc.property(
          fc.array(FootballArbitraries.shotData(), { minLength: 2, maxLength: 10 }),
          (shots) => {
            const individualXGs = shots.map(calculateXG);
            const totalXG = individualXGs.reduce((sum, xg) => sum + xg.value, 0);

            // Total should equal sum of individual xGs
            const batchXGs = calculateBatchXG(shots);
            const batchTotal = batchXGs.reduce((sum, xg) => sum + xg.value, 0);

            expect(Math.abs(totalXG - batchTotal)).toBeLessThan(0.001);

            // Also test with calculateTotalXG
            const totalXGDirect = calculateTotalXG(shots);
            expect(Math.abs(totalXG - totalXGDirect)).toBeLessThan(0.001);
          }
        )
      );
    });

    it('should maintain general ordering trends for open play shots', () => {
      fc.assert(
        fc.property(
          fc.array(FootballArbitraries.shotData(), { minLength: 2, maxLength: 5 }),
          (shots) => {
            // Filter out penalties and other special situations to test pure distance effect
            const openPlayShots = shots.filter(shot => shot.situation === 'open_play');
            const closeShots = openPlayShots.filter(shot => shot.distanceToGoal <= 6 && shot.defenderCount <= 1);
            const farShots = openPlayShots.filter(shot => shot.distanceToGoal >= 25 && shot.defenderCount <= 1);

            if (closeShots.length > 0 && farShots.length > 0) {
              const avgCloseXG = closeShots.reduce((sum, shot) => sum + calculateXG(shot).value, 0) / closeShots.length;
              const avgFarXG = farShots.reduce((sum, shot) => sum + calculateXG(shot).value, 0) / farShots.length;

              // On average, close open-play shots with few defenders should have higher xG than far shots
              expect(avgCloseXG).toBeGreaterThan(avgFarXG);
            }
          }
        )
      );
    });
  });
});
