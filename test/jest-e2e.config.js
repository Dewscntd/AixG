/**
 * Jest Configuration for End-to-End Tests
 * Full system tests with real services
 */

const baseConfig = require('../jest.config.js');

module.exports = {
  ...baseConfig,
  displayName: 'E2E Tests',
  
  testMatch: [
    '<rootDir>/test/e2e/**/*.test.ts'
  ],

  setupFilesAfterEnv: [
    '<rootDir>/test/setup/jest.setup.ts',
    '<rootDir>/test/setup/e2e.setup.ts'
  ],

  // E2E tests need significant time
  testTimeout: 300000, // 5 minutes
  
  // Run tests serially
  maxWorkers: 1,
  
  // Don't collect coverage for E2E tests (too slow)
  collectCoverage: false,
  
  // Use testcontainers for real services
  testEnvironment: 'node',
  
  // Global setup for E2E environment
  globalSetup: '<rootDir>/test/setup/e2e.global-setup.ts',
  globalTeardown: '<rootDir>/test/setup/e2e.global-teardown.ts'
};
