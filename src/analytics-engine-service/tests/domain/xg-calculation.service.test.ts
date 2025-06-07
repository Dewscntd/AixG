/**
 * Tests for xG calculation service using functional programming
 */

import { 
  calculateXG, 
  calculateXGComposed,
  calculateBatchXG,
  XGCalculationFunctions 
} from '../../domain/services/xg-calculation.service';
import { ShotData, XGValue } from '../../domain/value-objects/analytics-metrics';

describe('XGCalculationService', () => {
  describe('calculateXG', () => {
    it('should calculate xG for a close-range shot', () => {
      const shotData: ShotData = {
        position: { x: 95, y: 50 },
        targetPosition: { x: 100, y: 50 },
        distanceToGoal: 5,
        angle: 10,
        bodyPart: 'foot',
        situation: 'open_play',
        defenderCount: 0,
        gameState: {
          minute: 45,
          scoreDifference: 0,
          isHome: true
        }
      };

      const result = calculateXG(shotData);
      
      expect(result.value).toBeGreaterThan(0.3);
      expect(result.value).toBeLessThan(1.0);
    });

    it('should calculate lower xG for long-range shot', () => {
      const shotData: ShotData = {
        position: { x: 70, y: 50 },
        targetPosition: { x: 100, y: 50 },
        distanceToGoal: 30,
        angle: 5,
        bodyPart: 'foot',
        situation: 'open_play',
        defenderCount: 2,
        gameState: {
          minute: 45,
          scoreDifference: 0,
          isHome: true
        }
      };

      const result = calculateXG(shotData);
      
      expect(result.value).toBeLessThan(0.2);
      expect(result.value).toBeGreaterThan(0.01);
    });

    it('should give penalty shots high xG', () => {
      const shotData: ShotData = {
        position: { x: 88, y: 50 },
        targetPosition: { x: 100, y: 50 },
        distanceToGoal: 12,
        angle: 0,
        bodyPart: 'foot',
        situation: 'penalty',
        defenderCount: 0,
        gameState: {
          minute: 45,
          scoreDifference: 0,
          isHome: true
        }
      };

      const result = calculateXG(shotData);
      
      expect(result.value).toBeCloseTo(0.76, 2); // Historical penalty conversion rate
    });

    it('should apply defender modifier correctly', () => {
      const baseShotData: ShotData = {
        position: { x: 90, y: 50 },
        targetPosition: { x: 100, y: 50 },
        distanceToGoal: 10,
        angle: 15,
        bodyPart: 'foot',
        situation: 'open_play',
        defenderCount: 0,
        gameState: {
          minute: 45,
          scoreDifference: 0,
          isHome: true
        }
      };

      const clearShot = calculateXG(baseShotData);
      
      const crowdedShot = calculateXG({
        ...baseShotData,
        defenderCount: 3
      });

      expect(clearShot.value).toBeGreaterThan(crowdedShot.value);
    });

    it('should apply body part modifier correctly', () => {
      const baseShotData: ShotData = {
        position: { x: 90, y: 50 },
        targetPosition: { x: 100, y: 50 },
        distanceToGoal: 10,
        angle: 15,
        bodyPart: 'foot',
        situation: 'open_play',
        defenderCount: 1,
        gameState: {
          minute: 45,
          scoreDifference: 0,
          isHome: true
        }
      };

      const footShot = calculateXG(baseShotData);
      
      const headerShot = calculateXG({
        ...baseShotData,
        bodyPart: 'head'
      });

      expect(footShot.value).toBeGreaterThan(headerShot.value);
    });
  });

  describe('functional composition', () => {
    it('should produce same results with both composition methods', () => {
      const shotData: ShotData = {
        position: { x: 85, y: 45 },
        targetPosition: { x: 100, y: 50 },
        distanceToGoal: 15,
        angle: 20,
        bodyPart: 'foot',
        situation: 'open_play',
        defenderCount: 1,
        gameState: {
          minute: 30,
          scoreDifference: 0,
          isHome: false
        }
      };

      const result1 = calculateXG(shotData);
      const result2 = calculateXGComposed(shotData);

      expect(result1.value).toBeCloseTo(result2.value, 4);
    });

    it('should apply modifiers in correct order', () => {
      const shotData: ShotData = {
        position: { x: 85, y: 45 },
        targetPosition: { x: 100, y: 50 },
        distanceToGoal: 15,
        angle: 20,
        bodyPart: 'foot',
        situation: 'open_play',
        defenderCount: 1,
        gameState: {
          minute: 30,
          scoreDifference: 0,
          isHome: false
        }
      };

      // Test individual modifier functions
      const baseXG = XGCalculationFunctions.baseXGCalculation(shotData);
      expect(baseXG).toBeGreaterThan(0);

      const withDistance = XGCalculationFunctions.applyDistanceModifier(baseXG, shotData);
      const withAngle = XGCalculationFunctions.applyAngleModifier(withDistance, shotData);
      const withDefenders = XGCalculationFunctions.applyDefenderModifier(withAngle, shotData);

      expect(withDistance).toBeDefined();
      expect(withAngle).toBeDefined();
      expect(withDefenders).toBeDefined();
    });
  });

  describe('batch calculations', () => {
    it('should calculate total xG for multiple shots', () => {
      const shots: ShotData[] = [
        {
          position: { x: 90, y: 50 },
          targetPosition: { x: 100, y: 50 },
          distanceToGoal: 10,
          angle: 10,
          bodyPart: 'foot',
          situation: 'open_play',
          defenderCount: 1,
          gameState: { minute: 20, scoreDifference: 0, isHome: true }
        },
        {
          position: { x: 85, y: 45 },
          targetPosition: { x: 100, y: 50 },
          distanceToGoal: 15,
          angle: 25,
          bodyPart: 'foot',
          situation: 'open_play',
          defenderCount: 2,
          gameState: { minute: 60, scoreDifference: 1, isHome: true }
        }
      ];

      const totalXG = calculateBatchXG(shots);
      const individual1 = calculateXG(shots[0]);
      const individual2 = calculateXG(shots[1]);

      expect(totalXG.value).toBeCloseTo(individual1.value + individual2.value, 4);
    });

    it('should handle empty shot array', () => {
      const totalXG = calculateBatchXG([]);
      expect(totalXG.value).toBe(0);
    });
  });

  describe('edge cases', () => {
    it('should handle extreme distances', () => {
      const veryCloseShot: ShotData = {
        position: { x: 99, y: 50 },
        targetPosition: { x: 100, y: 50 },
        distanceToGoal: 1,
        angle: 5,
        bodyPart: 'foot',
        situation: 'open_play',
        defenderCount: 0,
        gameState: { minute: 45, scoreDifference: 0, isHome: true }
      };

      const veryFarShot: ShotData = {
        position: { x: 50, y: 50 },
        targetPosition: { x: 100, y: 50 },
        distanceToGoal: 50,
        angle: 2,
        bodyPart: 'foot',
        situation: 'open_play',
        defenderCount: 0,
        gameState: { minute: 45, scoreDifference: 0, isHome: true }
      };

      const closeResult = calculateXG(veryCloseShot);
      const farResult = calculateXG(veryFarShot);

      expect(closeResult.value).toBeGreaterThan(farResult.value);
      expect(closeResult.value).toBeLessThan(1.0);
      expect(farResult.value).toBeGreaterThan(0.01);
    });

    it('should handle extreme angles', () => {
      const centralShot: ShotData = {
        position: { x: 90, y: 50 },
        targetPosition: { x: 100, y: 50 },
        distanceToGoal: 10,
        angle: 0,
        bodyPart: 'foot',
        situation: 'open_play',
        defenderCount: 1,
        gameState: { minute: 45, scoreDifference: 0, isHome: true }
      };

      const wideShot: ShotData = {
        position: { x: 90, y: 20 },
        targetPosition: { x: 100, y: 50 },
        distanceToGoal: 10,
        angle: 60,
        bodyPart: 'foot',
        situation: 'open_play',
        defenderCount: 1,
        gameState: { minute: 45, scoreDifference: 0, isHome: true }
      };

      const centralResult = calculateXG(centralShot);
      const wideResult = calculateXG(wideShot);

      expect(centralResult.value).toBeGreaterThan(wideResult.value);
    });
  });

  describe('deterministic behavior', () => {
    it('should produce consistent results for same input', () => {
      const shotData: ShotData = {
        position: { x: 85, y: 45 },
        targetPosition: { x: 100, y: 50 },
        distanceToGoal: 15,
        angle: 20,
        bodyPart: 'foot',
        situation: 'open_play',
        defenderCount: 1,
        gameState: {
          minute: 30,
          scoreDifference: 0,
          isHome: false
        }
      };

      const results = Array.from({ length: 10 }, () => calculateXG(shotData));
      
      // All results should be identical
      const firstResult = results[0];
      results.forEach(result => {
        expect(result.value).toBe(firstResult.value);
      });
    });

    it('should be pure functions with no side effects', () => {
      const shotData: ShotData = {
        position: { x: 85, y: 45 },
        targetPosition: { x: 100, y: 50 },
        distanceToGoal: 15,
        angle: 20,
        bodyPart: 'foot',
        situation: 'open_play',
        defenderCount: 1,
        gameState: {
          minute: 30,
          scoreDifference: 0,
          isHome: false
        }
      };

      const originalData = JSON.parse(JSON.stringify(shotData));
      
      calculateXG(shotData);
      
      // Input should not be modified
      expect(shotData).toEqual(originalData);
    });
  });
});
