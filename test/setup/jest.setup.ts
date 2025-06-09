/**
 * Global Jest Setup for FootAnalytics Platform
 * Configures testing environment, mocks, and utilities
 */

import 'reflect-metadata';
import { config } from 'dotenv';
import { faker } from '@faker-js/faker';

// Load test environment variables
config({ path: '.env.test' });

// Configure faker for consistent test data
faker.seed(12345);

// Global test timeout
jest.setTimeout(30000);

// Mock external services by default
jest.mock('aws-sdk');
jest.mock('pulsar-client');
jest.mock('redis');

// Global test utilities
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace jest {
    interface Matchers<R> {
      toBeValidXG(): R;
      toBeValidPossession(): R;
      toBeValidPosition(): R;
      toMatchAnalyticsSnapshot(): R;
      toBeValidUUID(): R;
      toBeValidVideoId(): R;
      toBeValidMatchId(): R;
      toHaveValidDomainEvent(): R;
      toBeImmutable(): R;
      toSatisfyDomainInvariants(): R;
      toBeWithinTimeRange(start: Date, end: Date): R;
      toHavePerformanceWithin(maxMs: number): R;
    }
  }
}

// Custom matchers for domain-specific assertions
expect.extend({
  toBeValidXG(received) {
    const pass = typeof received === 'number' && received >= 0 && received <= 1;
    return {
      message: () => `expected ${received} to be a valid xG value (0-1)`,
      pass,
    };
  },

  toBeValidPossession(received) {
    const pass =
      typeof received === 'number' && received >= 0 && received <= 100;
    return {
      message: () =>
        `expected ${received} to be a valid possession percentage (0-100)`,
      pass,
    };
  },

  toBeValidPosition(received) {
    const pass =
      received &&
      typeof received.x === 'number' &&
      typeof received.y === 'number' &&
      received.x >= 0 &&
      received.x <= 100 &&
      received.y >= 0 &&
      received.y <= 100;
    return {
      message: () => `expected ${received} to be a valid field position`,
      pass,
    };
  },

  toMatchAnalyticsSnapshot(received) {
    const requiredFields = [
      'matchId',
      'homeTeam',
      'awayTeam',
      'lastUpdated',
      'version',
    ];
    const hasAllFields = requiredFields.every(field => field in received);

    return {
      message: () =>
        `expected object to have all required analytics snapshot fields`,
      pass: hasAllFields,
    };
  },

  toBeValidUUID(received: string) {
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    const pass = uuidRegex.test(received);

    return {
      message: () =>
        `expected ${received} ${pass ? 'not ' : ''}to be a valid UUID`,
      pass,
    };
  },

  toBeValidVideoId(received: any) {
    const hasValue = received && typeof received.value === 'string';
    const isValidUUID =
      hasValue &&
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        received.value
      );
    const pass = hasValue && isValidUUID;

    return {
      message: () =>
        `expected ${received} ${pass ? 'not ' : ''}to be a valid VideoId`,
      pass,
    };
  },

  toBeValidMatchId(received: any) {
    const hasValue = received && typeof received.value === 'string';
    const isValidUUID =
      hasValue &&
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        received.value
      );
    const pass = hasValue && isValidUUID;

    return {
      message: () =>
        `expected ${received} ${pass ? 'not ' : ''}to be a valid MatchId`,
      pass,
    };
  },

  toHaveValidDomainEvent(received: any) {
    const hasEventId = received && typeof received.eventId === 'string';
    const hasEventType = received && typeof received.eventType === 'string';
    const hasAggregateId = received && typeof received.aggregateId === 'string';
    const hasOccurredOn = received && received.occurredOn instanceof Date;
    const hasVersion = received && typeof received.version === 'number';

    const pass =
      hasEventId &&
      hasEventType &&
      hasAggregateId &&
      hasOccurredOn &&
      hasVersion;

    return {
      message: () =>
        `expected ${received} ${
          pass ? 'not ' : ''
        }to be a valid domain event with eventId, eventType, aggregateId, occurredOn, and version`,
      pass,
    };
  },

  toBeImmutable(received: any) {
    let pass = true;

    try {
      if (received && typeof received === 'object') {
        for (const key in received) {
          const originalProp = received[key];
          received[key] = 'modified';
          if (received[key] === 'modified') {
            pass = false;
            break;
          }
          received[key] = originalProp;
        }
      }
    } catch (error) {
      pass = true; // If modification throws an error, object is immutable
    }

    return {
      message: () => `expected object ${pass ? 'not ' : ''}to be immutable`,
      pass,
    };
  },

  toSatisfyDomainInvariants(received: any) {
    let pass = true;

    if (received && typeof received.validateInvariants === 'function') {
      try {
        received.validateInvariants();
      } catch (error) {
        pass = false;
      }
    }

    return {
      message: () =>
        `expected object ${pass ? 'not ' : ''}to satisfy domain invariants`,
      pass,
    };
  },

  toBeWithinTimeRange(received: Date, start: Date, end: Date) {
    const pass = received >= start && received <= end;

    return {
      message: () =>
        `expected ${received} ${
          pass ? 'not ' : ''
        }to be within time range ${start} - ${end}`,
      pass,
    };
  },

  toHavePerformanceWithin(received: () => any, maxMs: number) {
    const startTime = performance.now();
    received();
    const endTime = performance.now();
    const duration = endTime - startTime;
    const pass = duration <= maxMs;

    return {
      message: () =>
        `expected function to execute within ${maxMs}ms but took ${duration.toFixed(
          2
        )}ms`,
      pass,
    };
  },
});

// Global error handler for unhandled promises
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

// Clean up after each test
afterEach(() => {
  jest.clearAllMocks();
  jest.clearAllTimers();
});

// Global test data factories
export const TestDataFactory = {
  createMatchId: () => faker.string.uuid(),
  createTeamId: () => faker.string.uuid(),
  createPlayerId: () => faker.string.uuid(),
  createStreamId: () => faker.string.uuid(),
  createCorrelationId: () => faker.string.uuid(),
  createEventId: () => faker.string.uuid(),
  createVideoId: () => faker.string.uuid(),

  createPosition: () => ({
    x: faker.number.float({ min: 0, max: 100, fractionDigits: 2 }),
    y: faker.number.float({ min: 0, max: 100, fractionDigits: 2 }),
  }),

  createShotData: () => ({
    position: TestDataFactory.createPosition(),
    targetPosition: { x: 100, y: 50 },
    distanceToGoal: faker.number.float({ min: 1, max: 50, fractionDigits: 1 }),
    angle: faker.number.float({ min: 0, max: 180, fractionDigits: 1 }),
    bodyPart: faker.helpers.arrayElement(['foot', 'head', 'other']),
    situation: faker.helpers.arrayElement([
      'open_play',
      'corner',
      'free_kick',
      'penalty',
    ]),
    defenderCount: faker.number.int({ min: 0, max: 5 }),
    gameState: {
      minute: faker.number.int({ min: 1, max: 90 }),
      scoreDifference: faker.number.int({ min: -3, max: 3 }),
      isHome: faker.datatype.boolean(),
    },
  }),

  createPossessionEvent: () => ({
    timestamp: faker.number.int({ min: 0, max: 5400000 }),
    teamId: TestDataFactory.createTeamId(),
    playerId: TestDataFactory.createPlayerId(),
    eventType: faker.helpers.arrayElement([
      'pass',
      'dribble',
      'shot',
      'tackle',
      'interception',
      'clearance',
    ]),
    position: TestDataFactory.createPosition(),
    successful: faker.datatype.boolean(),
    duration: faker.number.int({ min: 1, max: 30 }),
  }),

  createVideoFrame: () => ({
    frameNumber: faker.number.int({ min: 1, max: 10000 }),
    timestamp: faker.number.int({ min: 0, max: 5400000 }), // 90 minutes in ms
    width: 1920,
    height: 1080,
    data: Buffer.alloc(1920 * 1080 * 3), // Mock RGB data
  }),

  createPlayer: () => ({
    id: TestDataFactory.createPlayerId(),
    teamId: TestDataFactory.createTeamId(),
    position: TestDataFactory.createPosition(),
    velocity: {
      x: faker.number.float({ min: -10, max: 10, fractionDigits: 2 }),
      y: faker.number.float({ min: -10, max: 10, fractionDigits: 2 }),
    },
    confidence: faker.number.float({ min: 0.5, max: 1, fractionDigits: 3 }),
  }),

  createMatchAnalytics: () => ({
    matchId: TestDataFactory.createMatchId(),
    homeTeam: {
      teamId: TestDataFactory.createTeamId(),
      xG: faker.number.float({ min: 0, max: 5, fractionDigits: 2 }),
      possession: faker.number.float({ min: 0, max: 100, fractionDigits: 1 }),
      passAccuracy: faker.number.float({ min: 60, max: 95, fractionDigits: 1 }),
    },
    awayTeam: {
      teamId: TestDataFactory.createTeamId(),
      xG: faker.number.float({ min: 0, max: 5, fractionDigits: 2 }),
      possession: faker.number.float({ min: 0, max: 100, fractionDigits: 1 }),
      passAccuracy: faker.number.float({ min: 60, max: 95, fractionDigits: 1 }),
    },
    lastUpdated: faker.date.recent(),
    version: faker.number.int({ min: 1, max: 100 }),
  }),
};

// Mock implementations for common services
export const MockServices = {
  eventStore: {
    append: jest.fn().mockResolvedValue(undefined),
    read: jest.fn().mockResolvedValue([]),
    getSnapshot: jest.fn().mockResolvedValue(null),
    saveSnapshot: jest.fn().mockResolvedValue(undefined),
  },

  eventPublisher: {
    publish: jest.fn().mockResolvedValue(undefined),
    publishBatch: jest.fn().mockResolvedValue(undefined),
  },

  storageService: {
    upload: jest
      .fn()
      .mockResolvedValue({ url: 'https://example.com/video.mp4' }),
    download: jest.fn().mockResolvedValue(Buffer.alloc(1024)),
    delete: jest.fn().mockResolvedValue(undefined),
  },

  mlInference: {
    analyze: jest.fn().mockResolvedValue({
      players: [TestDataFactory.createPlayer()],
      ball: { position: TestDataFactory.createPosition(), confidence: 0.95 },
    }),
  },
};

console.log('🧪 Jest global setup completed');
