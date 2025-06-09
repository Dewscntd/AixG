/**
 * Unit Test Setup for FootAnalytics Platform
 * Configures isolated unit testing environment
 */

import { MockServices } from './jest.setup';

// Configure unit test environment
beforeEach(() => {
  // Reset all mocks before each unit test
  jest.resetAllMocks();

  // Ensure no real external calls in unit tests
  jest.clearAllTimers();
  jest.useFakeTimers();
});

afterEach(() => {
  // Restore real timers after each test
  jest.useRealTimers();

  // Verify no unexpected calls were made
  expect(MockServices.eventPublisher.publish).not.toHaveBeenCalled();
});

// Unit test utilities
export const UnitTestUtils = {
  /**
   * Creates a mock implementation that tracks calls
   */
  createMockWithHistory: <T extends (...args: any[]) => any>(
    implementation?: T
  ) => {
    const calls: Parameters<T>[] = [];
    const mock = jest.fn((...args: Parameters<T>) => {
      calls.push(args);
      return implementation?.(...args);
    });

    return Object.assign(mock, { getCalls: () => calls });
  },

  /**
   * Asserts that a function is pure (same input = same output)
   */
  assertPureFunction: <T extends (...args: any[]) => any>(
    fn: T,
    inputs: Parameters<T>[],
    iterations: number = 10
  ) => {
    inputs.forEach(input => {
      const results = Array.from({ length: iterations }, () => fn(...input));
      const firstResult = results[0];

      results.forEach((result, _index) => {
        expect(result).toEqual(firstResult);
      });
    });
  },

  /**
   * Asserts that a function has no side effects
   */
  assertNoSideEffects: <T extends (...args: any[]) => any>(
    fn: T,
    input: Parameters<T>
  ) => {
    const originalConsoleLog = console.log;
    const originalConsoleError = console.error;
    const consoleCalls: string[] = [];

    console.log = jest.fn((...args) =>
      consoleCalls.push(`log: ${args.join(' ')}`)
    );
    console.error = jest.fn((...args) =>
      consoleCalls.push(`error: ${args.join(' ')}`)
    );

    try {
      fn(...input);
      expect(consoleCalls).toHaveLength(0);
    } finally {
      console.log = originalConsoleLog;
      console.error = originalConsoleError;
    }
  },
};

console.log('🔬 Unit test setup completed');
