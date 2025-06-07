/**
 * Jest Configuration for Unit Tests
 * Fast, isolated tests for individual components
 */

const baseConfig = require('../jest.config.js');

module.exports = {
  ...baseConfig,
  displayName: 'Unit Tests',
  
  testMatch: [
    '<rootDir>/test/unit/**/*.test.ts',
    '<rootDir>/src/**/*.spec.ts'
  ],

  setupFilesAfterEnv: [
    '<rootDir>/test/setup/jest.setup.ts',
    '<rootDir>/test/setup/unit.setup.ts'
  ],

  // Unit tests should be fast
  testTimeout: 10000,
  
  // Mock external dependencies
  moduleNameMapping: {
    ...baseConfig.moduleNameMapping,
    '^aws-sdk$': '<rootDir>/test/mocks/aws-sdk.mock.ts',
    '^redis$': '<rootDir>/test/mocks/redis.mock.ts',
    '^pg$': '<rootDir>/test/mocks/pg.mock.ts'
  },

  // Coverage for unit tests
  collectCoverageFrom: [
    'src/**/domain/**/*.ts',
    'src/**/application/**/*.ts',
    '!src/**/*.spec.ts',
    '!src/**/*.test.ts',
    '!src/**/*.d.ts',
    '!src/**/index.ts'
  ],

  coverageThreshold: {
    global: {
      branches: 95,
      functions: 95,
      lines: 95,
      statements: 95
    }
  }
};
