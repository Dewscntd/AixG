/**
 * Simplified Jest Configuration for FootAnalytics Platform
 */

module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  rootDir: '.',

  testMatch: [
    '<rootDir>/test/**/*.test.ts',
    '<rootDir>/src/**/*.spec.ts',
  ],

  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.spec.ts',
    '!src/**/*.test.ts',
  ],

  coverageDirectory: 'coverage',
  clearMocks: true,
  verbose: true,
};
