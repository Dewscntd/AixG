/**
 * Jest Configuration for Integration Tests
 * Tests service interactions with real dependencies
 */

const baseConfig = require('../jest.config.js');

module.exports = {
  ...baseConfig,
  displayName: 'Integration Tests',
  
  testMatch: [
    '<rootDir>/test/integration/**/*.test.ts'
  ],

  setupFilesAfterEnv: [
    '<rootDir>/test/setup/jest.setup.ts',
    '<rootDir>/test/setup/integration.setup.ts'
  ],

  // Integration tests need more time
  testTimeout: 60000,
  
  // Use real database connections for integration tests
  testEnvironment: 'node',
  
  // Don't mock external services for integration tests
  clearMocks: false,
  
  // Run tests serially to avoid database conflicts
  maxWorkers: 1,
  
  // Coverage for integration tests
  collectCoverageFrom: [
    'src/**/infrastructure/**/*.ts',
    'src/**/controllers/**/*.ts',
    'src/**/gateways/**/*.ts',
    '!src/**/*.spec.ts',
    '!src/**/*.test.ts',
    '!src/**/*.d.ts'
  ],

  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80
    }
  }
};
