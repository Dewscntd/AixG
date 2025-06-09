/**
 * Comprehensive Jest Configuration for FootAnalytics Platform
 * Supports unit, integration, contract, e2e, property-based, and performance testing
 */

const baseConfig = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  rootDir: '.',

  // Setup files
  setupFilesAfterEnv: [
    '<rootDir>/test/setup/jest.setup.ts'
  ],

  // Module resolution
  moduleNameMapper: {
    // Global aliases
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@domain/(.*)$': '<rootDir>/src/domain/$1',
    '^@shared/(.*)$': '<rootDir>/src/shared/$1',

    // Service-specific aliases
    '^@analytics/(.*)$': '<rootDir>/src/analytics-engine-service/$1',
    '^@api-gateway/(.*)$': '<rootDir>/src/api-gateway/$1',
    '^@video-ingestion/(.*)$': '<rootDir>/src/video-ingestion-service/$1',
    '^@real-time/(.*)$': '<rootDir>/src/real-time-analysis-service/$1',
    '^@ml-pipeline/(.*)$': '<rootDir>/src/ml-pipeline-service/$1',
    '^@performance/(.*)$': '<rootDir>/src/performance-optimization/$1',

    // Test utilities
    '^@test-utils/(.*)$': '<rootDir>/test/utils/$1',
    '^@test-setup/(.*)$': '<rootDir>/test/setup/$1',

    // Type definitions
    '^@types/(.*)$': '<rootDir>/src/types/$1'
  },

  // Coverage configuration
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.spec.ts',
    '!src/**/*.test.ts',
    '!src/**/*.d.ts',
    '!src/**/index.ts',
    '!src/**/*.interface.ts',
    '!src/**/*.types.ts'
  ],

  coverageDirectory: 'coverage',
  coverageReporters: [
    'text',
    'text-summary',
    'html',
    'lcov',
    'json',
    'clover'
  ],

  // Coverage thresholds
  coverageThreshold: {
    global: {
      branches: 90,
      functions: 90,
      lines: 90,
      statements: 90
    },
    './src/domain/': {
      branches: 95,
      functions: 95,
      lines: 95,
      statements: 95
    }
  },

  // Test configuration
  clearMocks: true,
  restoreMocks: true,
  verbose: true,
  detectOpenHandles: true,
  forceExit: true,

  // Timeouts
  testTimeout: 30000,

  // Reporters
  reporters: [
    'default',
    'jest-html-reporters',
    'jest-junit'
  ],

  // Transform configuration
  transform: {
    '^.+\\.ts$': ['ts-jest', {
      tsconfig: {
        // Use the same strict settings as main tsconfig
        strict: true,
        exactOptionalPropertyTypes: true,
        noImplicitAny: true,
        strictNullChecks: true,
        // Allow JS for test utilities
        allowJs: true,
        // Faster compilation for tests
        skipLibCheck: true,
        // Enable decorators for NestJS testing
        experimentalDecorators: true,
        emitDecoratorMetadata: true
      }
    }]
  },

  // Test file patterns
  testMatch: [
    '<rootDir>/test/**/*.test.ts',
    '<rootDir>/src/**/*.spec.ts'
  ],

  // Ignore patterns
  testPathIgnorePatterns: [
    '/node_modules/',
    '/dist/',
    '/coverage/',
    '/frontend/',
    '/.next/',
    '/build/'
  ],

  // Watch mode ignore patterns
  watchPathIgnorePatterns: [
    '/node_modules/',
    '/dist/',
    '/coverage/',
    '/frontend/',
    '/.next/'
  ],

  // Global setup and teardown
  globalSetup: '<rootDir>/test/setup/global.setup.ts',
  globalTeardown: '<rootDir>/test/setup/global.teardown.ts',

  // Additional Jest configuration
  maxWorkers: process.env.CI ? 2 : '50%',
  workerIdleMemoryLimit: '512MB'
};

module.exports = baseConfig;
