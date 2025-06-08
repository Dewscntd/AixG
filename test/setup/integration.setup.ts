/**
 * Integration Test Setup for FootAnalytics Platform
 * Configures real database and service connections for integration testing
 */

import { GenericContainer, StartedTestContainer } from 'testcontainers';
import { Pool } from 'pg';
import Redis from 'ioredis';

// Test containers for integration tests
let postgresContainer: StartedTestContainer;
let redisContainer: StartedTestContainer;
let testDbPool: Pool;
let testRedisClient: Redis;

// Setup test containers before all integration tests
beforeAll(async () => {
  console.log('🐳 Starting test containers...');
  
  // Start PostgreSQL container
  postgresContainer = await new GenericContainer('postgres:15')
    .withEnvironment({
      POSTGRES_DB: 'footanalytics_test',
      POSTGRES_USER: 'test',
      POSTGRES_PASSWORD: 'test',
    })
    .withExposedPorts(5432)
    .start();
  
  // Start Redis container
  redisContainer = await new GenericContainer('redis:7')
    .withExposedPorts(6379)
    .start();
  
  // Create database connection pool
  testDbPool = new Pool({
    host: postgresContainer.getHost(),
    port: postgresContainer.getMappedPort(5432),
    database: 'footanalytics_test',
    user: 'test',
    password: 'test',
    max: 10,
  });
  
  // Create Redis client
  testRedisClient = new Redis({
    host: redisContainer.getHost(),
    port: redisContainer.getMappedPort(6379),
  });
  
  // Run database migrations
  await runTestMigrations();
  
  console.log('✅ Test containers ready');
}, 120000); // 2 minute timeout for container startup

// Cleanup after all integration tests
afterAll(async () => {
  console.log('🧹 Cleaning up test containers...');
  
  await testDbPool?.end();
  await testRedisClient?.quit();
  await postgresContainer?.stop();
  await redisContainer?.stop();
  
  console.log('✅ Test containers stopped');
}, 30000);

// Clean database state between tests
beforeEach(async () => {
  await cleanDatabase();
  await testRedisClient.flushall();
});

// Database utilities for integration tests
export const IntegrationTestUtils = {
  getDbPool: () => testDbPool,
  getRedisClient: () => testRedisClient,
  
  /**
   * Executes SQL query and returns results
   */
  query: async (sql: string, params?: any[]) => {
    const client = await testDbPool.connect();
    try {
      return await client.query(sql, params);
    } finally {
      client.release();
    }
  },
  
  /**
   * Seeds test data into database
   */
  seedTestData: async () => {
    await IntegrationTestUtils.query(`
      INSERT INTO matches (id, home_team_id, away_team_id, start_time, status)
      VALUES 
        ('match-1', 'team-home', 'team-away', NOW(), 'in_progress'),
        ('match-2', 'team-a', 'team-b', NOW() - INTERVAL '1 day', 'completed')
    `);
    
    await IntegrationTestUtils.query(`
      INSERT INTO match_analytics (match_id, home_team_xg, away_team_xg, home_possession, away_possession)
      VALUES 
        ('match-1', 1.2, 0.8, 65.5, 34.5),
        ('match-2', 2.1, 1.5, 58.2, 41.8)
    `);
  },
  
  /**
   * Waits for async operations to complete
   */
  waitForAsyncOperations: async (timeoutMs: number = 5000) => new Promise(resolve => setTimeout(resolve, timeoutMs)),
  
  /**
   * Asserts database state
   */
  assertDatabaseState: async (tableName: string, expectedCount: number) => {
    const result = await IntegrationTestUtils.query(`SELECT COUNT(*) FROM ${tableName}`);
    expect(parseInt(result.rows[0].count)).toBe(expectedCount);
  },
  
  /**
   * Creates test event store
   */
  createTestEventStore: () => ({
    append: async (streamId: string, events: any[]) => {
      await IntegrationTestUtils.query(
        'INSERT INTO events (stream_id, event_type, event_data, version) VALUES ($1, $2, $3, $4)',
        [streamId, events[0].eventType, JSON.stringify(events[0]), 1]
      );
    },
    
    read: async (streamId: string) => {
      const result = await IntegrationTestUtils.query(
        'SELECT event_data FROM events WHERE stream_id = $1 ORDER BY version',
        [streamId]
      );
      return result.rows.map(row => JSON.parse(row.event_data));
    },
  }),
};

// Helper functions
async function runTestMigrations() {
  const migrations = [
    `CREATE TABLE IF NOT EXISTS matches (
      id VARCHAR(255) PRIMARY KEY,
      home_team_id VARCHAR(255) NOT NULL,
      away_team_id VARCHAR(255) NOT NULL,
      start_time TIMESTAMP NOT NULL,
      status VARCHAR(50) NOT NULL,
      created_at TIMESTAMP DEFAULT NOW()
    )`,
    
    `CREATE TABLE IF NOT EXISTS match_analytics (
      id SERIAL PRIMARY KEY,
      match_id VARCHAR(255) REFERENCES matches(id),
      home_team_xg DECIMAL(4,2) DEFAULT 0,
      away_team_xg DECIMAL(4,2) DEFAULT 0,
      home_possession DECIMAL(5,2) DEFAULT 0,
      away_possession DECIMAL(5,2) DEFAULT 0,
      updated_at TIMESTAMP DEFAULT NOW()
    )`,
    
    `CREATE TABLE IF NOT EXISTS events (
      id SERIAL PRIMARY KEY,
      stream_id VARCHAR(255) NOT NULL,
      event_type VARCHAR(100) NOT NULL,
      event_data JSONB NOT NULL,
      version INTEGER NOT NULL,
      created_at TIMESTAMP DEFAULT NOW()
    )`,
  ];
  
  for (const migration of migrations) {
    await IntegrationTestUtils.query(migration);
  }
}

async function cleanDatabase() {
  const tables = ['events', 'match_analytics', 'matches'];
  
  for (const table of tables) {
    await IntegrationTestUtils.query(`TRUNCATE TABLE ${table} CASCADE`);
  }
}

console.log('🔗 Integration test setup completed');
