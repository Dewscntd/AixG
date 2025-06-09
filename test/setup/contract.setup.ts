/**
 * Contract Test Setup for FootAnalytics Platform
 * Configures Pact for consumer-driven contract testing
 */

import { Pact } from '@pact-foundation/pact';
import { join } from 'path';

// Global Pact configuration
const pactConfig = {
  consumer: 'footanalytics-consumer',
  provider: 'footanalytics-provider',
  port: 1234,
  log: join(process.cwd(), 'test-results', 'pact.log'),
  dir: join(process.cwd(), 'test-results', 'pacts'),
  logLevel: 'info' as const,
  spec: 2,
};

// Contract test utilities
export const ContractTestUtils = {
  /**
   * Creates a new Pact instance for service contract testing
   */
  createPact: (consumer: string, provider: string, port?: number) =>
    new Pact({
      ...pactConfig,
      consumer,
      provider,
      port: port || pactConfig.port,
    }),

  /**
   * Standard headers for API requests
   */
  getStandardHeaders: () => ({
    'Content-Type': 'application/json',
    Accept: 'application/json',
    Authorization: 'Bearer test-token',
  }),

  /**
   * Creates a mock ML pipeline output for contract testing
   */
  createMockMLOutput: () => ({
    eventType: 'VideoAnalysisCompleted',
    matchId: 'contract-test-match-123',
    timestamp: '2024-01-01T00:00:00.000Z',
    data: {
      shots: [
        {
          teamId: 'team-home',
          playerId: 'player-123',
          position: { x: 85.5, y: 45.2 },
          targetPosition: { x: 100, y: 50 },
          distanceToGoal: 15.3,
          angle: 25.7,
          bodyPart: 'foot',
          situation: 'open_play',
          defenderCount: 2,
          gameState: {
            minute: 45,
            scoreDifference: 0,
            isHome: true,
          },
          confidence: 0.95,
        },
      ],
      possessionEvents: [
        {
          timestamp: 1234567890,
          teamId: 'team-home',
          playerId: 'player-456',
          eventType: 'pass',
          position: { x: 50.0, y: 30.5 },
          successful: true,
          duration: 5,
        },
      ],
      metadata: {
        processingTime: 45.2,
        modelVersions: {
          playerDetection: 'v2.1.0',
          ballTracking: 'v1.8.3',
          eventDetection: 'v3.0.1',
        },
        frameCount: 2700,
        analysisQuality: 'high',
      },
    },
  }),

  /**
   * Creates a mock analytics response for contract testing
   */
  createMockAnalyticsResponse: () => ({
    success: true,
    analyticsId: 'analytics-123',
    processedAt: '2024-01-01T00:00:00.000Z',
    data: {
      homeTeam: {
        xG: 1.25,
        possession: 65.5,
        passAccuracy: 87.3,
      },
      awayTeam: {
        xG: 0.85,
        possession: 34.5,
        passAccuracy: 82.1,
      },
      lastUpdated: '2024-01-01T00:00:00.000Z',
      version: 1,
    },
  }),

  /**
   * Creates a mock error response for contract testing
   */
  createMockErrorResponse: (statusCode: number, message: string) => ({
    success: false,
    error: message,
    statusCode,
    timestamp: '2024-01-01T00:00:00.000Z',
  }),

  /**
   * Validates contract response structure
   */
  validateContractResponse: (response: any, expectedSchema: any) => {
    const validate = (obj: any, schema: any, path = '') => {
      for (const [key, expectedType] of Object.entries(schema)) {
        const fullPath = path ? `${path}.${key}` : key;

        if (!(key in obj)) {
          throw new Error(`Missing required field: ${fullPath}`);
        }

        const actualValue = obj[key];

        if (typeof expectedType === 'string') {
          if (typeof actualValue !== expectedType) {
            throw new Error(
              `Type mismatch at ${fullPath}: expected ${expectedType}, got ${typeof actualValue}`
            );
          }
        } else if (typeof expectedType === 'object' && expectedType !== null) {
          if (Array.isArray(expectedType)) {
            if (!Array.isArray(actualValue)) {
              throw new Error(
                `Type mismatch at ${fullPath}: expected array, got ${typeof actualValue}`
              );
            }
            if (expectedType.length > 0 && actualValue.length > 0) {
              validate(actualValue[0], expectedType[0], `${fullPath}[0]`);
            }
          } else {
            validate(actualValue, expectedType, fullPath);
          }
        }
      }
    };

    validate(response, expectedSchema);
  },

  /**
   * Common contract schemas
   */
  schemas: {
    mlPipelineOutput: {
      eventType: 'string',
      matchId: 'string',
      timestamp: 'string',
      data: {
        shots: [
          {
            teamId: 'string',
            playerId: 'string',
            position: { x: 'number', y: 'number' },
            targetPosition: { x: 'number', y: 'number' },
            distanceToGoal: 'number',
            angle: 'number',
            bodyPart: 'string',
            situation: 'string',
            defenderCount: 'number',
            gameState: {
              minute: 'number',
              scoreDifference: 'number',
              isHome: 'boolean',
            },
            confidence: 'number',
          },
        ],
        possessionEvents: [
          {
            timestamp: 'number',
            teamId: 'string',
            playerId: 'string',
            eventType: 'string',
            position: { x: 'number', y: 'number' },
            successful: 'boolean',
            duration: 'number',
          },
        ],
        metadata: {
          processingTime: 'number',
          modelVersions: {
            playerDetection: 'string',
            ballTracking: 'string',
            eventDetection: 'string',
          },
          frameCount: 'number',
          analysisQuality: 'string',
        },
      },
    },

    analyticsResponse: {
      success: 'boolean',
      analyticsId: 'string',
      processedAt: 'string',
      data: {
        homeTeam: {
          xG: 'number',
          possession: 'number',
          passAccuracy: 'number',
        },
        awayTeam: {
          xG: 'number',
          possession: 'number',
          passAccuracy: 'number',
        },
        lastUpdated: 'string',
        version: 'number',
      },
    },

    errorResponse: {
      success: 'boolean',
      error: 'string',
      statusCode: 'number',
      timestamp: 'string',
    },
  },
};

// Setup contract testing environment
beforeAll(() => {
  // eslint-disable-next-line no-console
  console.log('🤝 Setting up contract testing environment...');

  // Ensure pact directories exist
  const fs = require('fs');
  const pactDir = join(process.cwd(), 'test-results', 'pacts');
  const logDir = join(process.cwd(), 'test-results');

  if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true });
  }

  if (!fs.existsSync(pactDir)) {
    fs.mkdirSync(pactDir, { recursive: true });
  }
});

afterAll(() => {
  // eslint-disable-next-line no-console
  console.log('🤝 Contract testing completed');
});

// Contract test helpers
export const ContractHelpers = {
  /**
   * Waits for Pact mock server to be ready
   */
  waitForPactServer: async (port: number, timeout = 10000) => {
    const start = Date.now();

    while (Date.now() - start < timeout) {
      try {
        const response = await fetch(`http://localhost:${port}/`);
        if (response.status === 404) {
          // Pact server is running (404 is expected for root path)
          return;
        }
      } catch (error) {
        // Server not ready yet
      }

      await new Promise(resolve => setTimeout(resolve, 100));
    }

    throw new Error(`Pact server not ready after ${timeout}ms`);
  },

  /**
   * Cleans up Pact interactions after test
   */
  cleanupPactInteractions: async (pact: Pact) => {
    try {
      await pact.removeInteractions();
    } catch (error) {
      // eslint-disable-next-line no-console
      console.warn('Failed to cleanup Pact interactions:', error);
    }
  },

  /**
   * Publishes Pact contracts to broker
   */
  publishContracts: async (brokerUrl: string, version: string) => {
    const { Publisher } = require('@pact-foundation/pact');

    const publisher = new Publisher({
      pactFilesOrDirs: [join(process.cwd(), 'test-results', 'pacts')],
      pactBroker: brokerUrl,
      consumerVersion: version,
      publishVerificationResult: true,
    });

    try {
      await publisher.publishPacts();
      // eslint-disable-next-line no-console
      console.log('✅ Pact contracts published successfully');
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('❌ Failed to publish Pact contracts:', error);
      throw error;
    }
  },
};

// eslint-disable-next-line no-console
console.log('🤝 Contract test setup completed');
