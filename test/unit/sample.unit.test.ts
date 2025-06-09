/**
 * Sample Unit Test to verify testing setup
 */

import fc from 'fast-check';
import { faker } from '@faker-js/faker';
import '../setup/jest.setup';

describe('Testing Setup Verification', () => {
  describe('Basic Jest functionality', () => {
    it('should run basic assertions', () => {
      expect(1 + 1).toBe(2);
      expect('hello').toMatch(/hello/);
      expect([1, 2, 3]).toHaveLength(3);
    });

    it('should support async tests', async () => {
      const result = await Promise.resolve('async result');
      expect(result).toBe('async result');
    });
  });

  describe('Property-based testing with fast-check', () => {
    it('should verify addition is commutative', () => {
      fc.assert(
        fc.property(fc.integer(), fc.integer(), (a, b) => {
          expect(a + b).toBe(b + a);
        })
      );
    });

    it('should verify string concatenation properties', () => {
      fc.assert(
        fc.property(fc.string(), fc.string(), (a, b) => {
          const result = a + b;
          expect(result.startsWith(a)).toBe(true);
          expect(result.endsWith(b)).toBe(true);
          expect(result.length).toBe(a.length + b.length);
        })
      );
    });
  });

  describe('Faker.js data generation', () => {
    it('should generate consistent test data', () => {
      faker.seed(123); // Set seed for reproducible tests

      const name1 = faker.person.firstName();
      const email1 = faker.internet.email();

      faker.seed(123); // Reset seed

      const name2 = faker.person.firstName();
      const email2 = faker.internet.email();

      expect(name1).toBe(name2);
      expect(email1).toBe(email2);
    });

    it('should generate football-related test data', () => {
      const position = {
        x: faker.number.float({ min: 0, max: 100, fractionDigits: 2 }),
        y: faker.number.float({ min: 0, max: 100, fractionDigits: 2 }),
      };

      expect(position.x).toBeGreaterThanOrEqual(0);
      expect(position.x).toBeLessThanOrEqual(100);
      expect(position.y).toBeGreaterThanOrEqual(0);
      expect(position.y).toBeLessThanOrEqual(100);
    });
  });

  describe('Custom matchers', () => {
    it('should use custom xG matcher', () => {
      expect(0.5).toBeValidXG();
      expect(0).toBeValidXG();
      expect(1).toBeValidXG();
      expect(-0.1).not.toBeValidXG();
      expect(1.1).not.toBeValidXG();
    });

    it('should use custom possession matcher', () => {
      expect(50).toBeValidPossession();
      expect(0).toBeValidPossession();
      expect(100).toBeValidPossession();
      expect(-1).not.toBeValidPossession();
      expect(101).not.toBeValidPossession();
    });

    it('should use custom position matcher', () => {
      expect({ x: 50, y: 50 }).toBeValidPosition();
      expect({ x: 0, y: 0 }).toBeValidPosition();
      expect({ x: 100, y: 100 }).toBeValidPosition();
      expect({ x: -1, y: 50 }).not.toBeValidPosition();
      expect({ x: 50, y: 101 }).not.toBeValidPosition();
    });
  });

  describe('Mock functionality', () => {
    it('should create and use mocks', () => {
      const mockFunction = jest.fn();
      mockFunction.mockReturnValue('mocked result');

      const result = mockFunction('test input');

      expect(result).toBe('mocked result');
      expect(mockFunction).toHaveBeenCalledWith('test input');
      expect(mockFunction).toHaveBeenCalledTimes(1);
    });

    it('should spy on object methods', () => {
      const testObject = {
        method: (x: number) => x * 2,
      };

      const spy = jest.spyOn(testObject, 'method');

      const result = testObject.method(5);

      expect(result).toBe(10);
      expect(spy).toHaveBeenCalledWith(5);

      spy.mockRestore();
    });
  });

  describe('Error handling', () => {
    it('should handle thrown errors', () => {
      const throwError = () => {
        throw new Error('Test error');
      };

      expect(throwError).toThrow('Test error');
      expect(throwError).toThrow(Error);
    });

    it('should handle async errors', async () => {
      const asyncThrowError = async () => {
        throw new Error('Async test error');
      };

      await expect(asyncThrowError()).rejects.toThrow('Async test error');
    });
  });

  describe('Performance testing basics', () => {
    it('should complete within time limit', () => {
      const start = Date.now();

      // Simulate some work
      let sum = 0;
      for (let i = 0; i < 1000; i++) {
        sum += i;
      }

      const duration = Date.now() - start;

      expect(duration).toBeLessThan(100); // Should complete in under 100ms
      expect(sum).toBe(499500); // Verify calculation is correct
    });
  });
});
