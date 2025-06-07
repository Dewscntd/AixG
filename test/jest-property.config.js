/**
 * Jest Configuration for Property-Based Tests
 * Uses fast-check for property-based testing
 */

const baseConfig = require('../jest.config.js');

module.exports = {
  ...baseConfig,
  displayName: 'Property-Based Tests',
  
  testMatch: [
    '<rootDir>/test/property/**/*.test.ts',
    '<rootDir>/test/unit/**/*.property.test.ts'
  ],

  setupFilesAfterEnv: [
    '<rootDir>/test/setup/jest.setup.ts',
    '<rootDir>/test/setup/property.setup.ts'
  ],

  // Property tests can take longer due to multiple iterations
  testTimeout: 30000,
  
  // Coverage for property tests
  collectCoverageFrom: [
    'src/**/domain/**/*.ts',
    'src/**/services/**/*.ts',
    '!src/**/*.spec.ts',
    '!src/**/*.test.ts',
    '!src/**/*.d.ts'
  ],

  coverageThreshold: {
    global: {
      branches: 90,
      functions: 90,
      lines: 90,
      statements: 90
    }
  }
};
